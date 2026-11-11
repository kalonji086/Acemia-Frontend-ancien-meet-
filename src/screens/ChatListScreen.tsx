import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Archive, Star, Pin, Users, Search, Plus, MoreHorizontal, CheckCheck,
  ArrowLeft, MoreVertical, MessageSquare, BadgeCheck
} from 'lucide-react-native';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import { supabase } from '../services/supabase.service';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SOCKET_URL } from '../utils/constants';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

type ChatFilter = 'all' | 'unread' | 'read' | 'favorites' | 'priority' | 'archived';

export default function ChatListScreen({ navigation, route, onChatSelect, selectedChatId }: any) {
  const { colors: themeColors, isDark, normalize, fontSizeFactor } = useTheme();
  const { t } = useLanguage();
  const isArchivedView = route?.params?.showArchived === true;

  const [chats, setChats] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<ChatFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [archivedCount, setArchivedCount] = useState(0);

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;
    const baseUrl = SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${path}`;
  };

  useFocusEffect(
    useCallback(() => {
      // Déterminer si on doit charger les archives
      const isViewingArchived = isArchivedView || (activeFilter as string) === 'archived';
      fetchChats(isViewingArchived);
      loadCurrentUser();

      const onRefreshEvent = () => fetchChats(isViewingArchived);
      socketService.on('profile_updated', onRefreshEvent);
      socketService.on('admin_user_profile_updated', onRefreshEvent);
      socketService.on('admin:user_verified', onRefreshEvent);

      const subscription = apiService.getCurrentUser().then(user => {
        if (!user) return;
        return supabase
          .channel('public:messages')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
            fetchChats();
          })
          .subscribe();
      });

      return () => {
        socketService.off('profile_updated', onRefreshEvent);
        socketService.off('admin_user_profile_updated', onRefreshEvent);
        socketService.off('admin:user_verified', onRefreshEvent);
        subscription.then(sub => { if (sub) supabase.removeChannel(sub); });
      };
    }, [isArchivedView, activeFilter])
  );

  const loadCurrentUser = async () => {
    const user = await apiService.getCurrentUser();
    if (user) setCurrentUser(user);
  };

  const fetchChats = async (forceArchived?: boolean) => {
    try {
      let user = currentUser;
      if (!user) {
        user = await apiService.getCurrentUser();
        if (user) setCurrentUser(user);
      }

      const viewingArchived = forceArchived !== undefined ? forceArchived : (isArchivedView || (activeFilter as string) === 'archived');
      const response = await apiService.getChats(1, 100, viewingArchived);
      if (response.success) {
        const formatted = response.data.map((chat: any) => {
          const isGroup = chat.type === 'group';
          const isSelf = chat.type === 'private' && (!chat.other_user || chat.other_user.id === user?.id);

          let name = chat.name || 'Discussion';
          let avatar = chat.avatar_url;

          if (!isGroup) {
            if (isSelf && user) {
              name = `${user.full_name || user.name} (${t('profile')})`;
              avatar = user.avatar_url || user.avatar;
            } else {
              name = chat.other_user?.full_name || 'Inconnu';
              avatar = chat.other_user?.avatar_url;
            }
          }

          return {
            id: chat.id,
            name,
            avatar: getFullUrl(avatar) || `https://ui-avatars.com/api/?name=${name}&background=random`,
            lastMessage: chat.last_message,
            lastMessageAt: chat.last_message_at,
            otherUserId: isSelf ? user?.id : chat.other_user?.id,
            otherUserStatus: isSelf ? user?.status : chat.other_user?.status,
            otherUserLastSeen: isSelf ? user?.last_seen : chat.other_user?.last_seen,
            type: chat.type,
            isVerified: !isGroup && (isSelf ? user?.is_verified : chat.other_user?.is_verified),
            unreadCount: parseInt(chat.unread_count || 0),
            isFavorite: chat.is_favorite || false,
            isPriority: chat.is_priority || false,
            isSelf
          };
        });
        setChats(formatted);

        if (!viewingArchived) {
          const archRes = await apiService.getChats(1, 100, true);
          if (archRes.success) setArchivedCount(archRes.data.length);
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredChats = useMemo(() => {
    let result = chats;

    // Search
    if (searchQuery) {
      result = result.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Filter
    switch (activeFilter) {
      case 'unread': result = result.filter(c => c.unreadCount > 0); break;
      case 'read': result = result.filter(c => c.unreadCount === 0); break;
      case 'favorites': result = result.filter(c => c.isFavorite); break;
      case 'priority': result = result.filter(c => c.isPriority); break;
      case 'archived':
        // Si on filtre par "archived", on ne fait rien car fetchChats s'en charge déjà avec isArchivedView
        break;
    }

    return result;
  }, [chats, activeFilter, searchQuery]);

  const handleLongPress = (chat: any) => {
    // Si on est dans le filtre "archived", on considère qu'on est en vue archives
    const effectiveArchivedView = isArchivedView || (activeFilter as string) === 'archived';

    Alert.alert(
      chat.name,
      "Options",
      [
        {
          text: chat.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris",
          onPress: async () => {
            const res = await apiService.toggleFavoriteChat(chat.id, !chat.isFavorite);
            if (res.success) fetchChats();
          }
        },
        {
          text: chat.isPriority ? "Détacher" : "Épingler en priorité",
          onPress: async () => {
            const res = await apiService.togglePriorityChat(chat.id, !chat.isPriority);
            if (res.success) fetchChats();
          }
        },
        {
          text: effectiveArchivedView ? "Désarchiver" : "Archiver",
          onPress: async () => {
            const res = await apiService.toggleArchiveChat(chat.id, !effectiveArchivedView);
            if (res.success) {
              if (isArchivedView) navigation.setParams({ showArchived: false });
              fetchChats();
            }
          }
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Supprimer ?",
              "Cette action est irréversible.",
              [
                { text: t('cancel'), style: "cancel" },
                { text: t('delete'), style: "destructive", onPress: async () => { await apiService.deleteChat(chat.id); fetchChats(); } }
              ]
            );
          }
        },
        { text: t('cancel'), style: "cancel" }
      ]
    );
  };

  const dynamicStyles = createStyles(themeColors, isDark, normalize, fontSizeFactor);

  const openChat = (chat: any) => {
    if (onChatSelect) {
      onChatSelect(chat);
      return;
    }

    navigation.navigate('Chat', {
      chatId: chat.id,
      name: chat.name,
      avatar: chat.avatar,
      peerUserId: chat.otherUserId,
      peerStatus: chat.otherUserStatus,
      peerLastSeen: chat.otherUserLastSeen,
    });
  };

  const renderChatItem = ({ item }: any) => {
    if (!item || !item.id) return null;
    return (
      <TouchableOpacity
        style={[
          dynamicStyles.chatItem,
          selectedChatId === item.id && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
        ]}
        onPress={() => openChat(item)}
        onLongPress={() => handleLongPress(item)}
      >
        <View style={dynamicStyles.avatarContainer}>
          <Image source={{ uri: item.avatar }} style={dynamicStyles.avatar} />
          {item.isFavorite && (
            <View style={dynamicStyles.favoriteBadge}>
              <Star size={8} fill="#FFD700" color="#FFD700" />
            </View>
          )}
        </View>

        <View style={dynamicStyles.chatInfo}>
          <View style={dynamicStyles.chatHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {item.isPriority && (
                <Pin size={12} color={themeColors.primary} style={{ marginRight: 4 }} />
              )}
              {item.type === 'group' && (
                <Users size={14} color={themeColors.primary} style={{ marginRight: 6 }} />
              )}
              <Text style={[dynamicStyles.chatName, item.isSelf && { color: themeColors.primary }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.isVerified && (
                <BadgeCheck size={14} color={themeColors.info} style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={[dynamicStyles.chatTime, item.unreadCount > 0 && { color: themeColors.primary, fontWeight: 'bold' }]}>
              {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </View>
          <View style={dynamicStyles.chatFooter}>
            <Text style={dynamicStyles.lastMessage} numberOfLines={1}>
              {item.lastMessage || 'Nouveau message'}
            </Text>
            {item.unreadCount > 0 && (
              <View style={dynamicStyles.unreadBadge}>
                <Text style={dynamicStyles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const startSelfChat = async () => {
    if (!currentUser) return;
    try {
      const res = await apiService.createChat([currentUser.id]);
      if (res.success) {
        openChat({
          id: res.data.id,
          name: t('profile'),
          avatar: getFullUrl(currentUser.avatar_url || currentUser.avatar),
          otherUserId: currentUser.id,
        });
      }
    } catch (e) { console.error(e); }
  };

  const FilterButton = ({ type, label, icon }: { type: ChatFilter, label: string, icon: any }) => {
    // Calculer le nombre réel pour chaque filtre en temps réel
    const count = useMemo(() => {
      switch (type) {
        case 'unread': return chats.filter(c => (c.unreadCount || c.unread_count) > 0).length;
        case 'favorites': return chats.filter(c => c.isFavorite || c.is_favorite).length;
        case 'priority': return chats.filter(c => c.isPriority || c.is_priority).length;
        case 'archived' as any: return archivedCount;
        default: return 0;
      }
    }, [chats, type, archivedCount]);

    return (
      <TouchableOpacity
        style={[
          dynamicStyles.filterBtn,
          activeFilter === type && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
        ]}
        onPress={() => setActiveFilter(type as ChatFilter)}
      >
        {React.cloneElement(icon, { color: activeFilter === type ? '#fff' : themeColors.text.secondary })}
        <Text style={[dynamicStyles.filterLabel, activeFilter === type && { color: '#fff' }]}>{label}</Text>
        {count > 0 && (
          <View style={[dynamicStyles.filterBadge, activeFilter === type && { backgroundColor: '#fff' }]}>
            <Text style={[dynamicStyles.filterBadgeText, activeFilter === type && { color: themeColors.primary }]}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const insets = useSafeAreaInsets();
  const favoriteChats = useMemo(() => chats.filter(c => c.isFavorite), [chats]);

  return (
    <View style={dynamicStyles.container}>
      <View style={{ height: insets.top, backgroundColor: themeColors.primary }} />
      <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />

      {!isSearching ? (
        <View style={dynamicStyles.header}>
          <View style={dynamicStyles.headerLeft}>
            {isArchivedView && (
              <TouchableOpacity onPress={() => navigation.setParams({ showArchived: false })} style={dynamicStyles.headerButton}>
                <ArrowLeft size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          <View style={dynamicStyles.headerCenter}>
            <Text style={dynamicStyles.headerTitle}>{isArchivedView ? "Archivées" : "Acemia"}</Text>
          </View>
          <View style={dynamicStyles.headerRight}>
            {!isArchivedView && (
              <TouchableOpacity style={dynamicStyles.headerButton} onPress={() => setIsSearching(true)}>
                <Search size={22} color="#fff" />
              </TouchableOpacity>
            )}
            {!isArchivedView && (
              <TouchableOpacity style={dynamicStyles.profileHeaderButton} onPress={() => navigation.navigate('Settings')}>
                {currentUser?.avatar_url || currentUser?.avatar ? (
                  <Image source={{ uri: getFullUrl(currentUser.avatar_url || currentUser.avatar) || '' }} style={dynamicStyles.smallAvatar} />
                ) : (
                  <MoreVertical size={24} color="#fff" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View style={dynamicStyles.searchHeader}>
          <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); fetchChats(); }}>
            <ArrowLeft size={24} color={themeColors.primary} />
          </TouchableOpacity>
          <TextInput
            style={dynamicStyles.searchInput}
            placeholder={t('search')}
            placeholderTextColor={themeColors.text.disabled}
            autoFocus
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {!isArchivedView && !isSearching && favoriteChats.length > 0 && (
        <View style={dynamicStyles.favoritesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dynamicStyles.favoritesScroll}>
            {favoriteChats.map(chat => (
              <TouchableOpacity
                key={`fav-${chat.id}`}
                style={dynamicStyles.favoriteItem}
                onPress={() => openChat(chat)}
              >
                <View style={dynamicStyles.favAvatarContainer}>
                  <Image source={{ uri: chat.avatar }} style={dynamicStyles.favAvatar} />
                  <View style={[dynamicStyles.favOnlineBadge, { backgroundColor: '#4CAF50' }]} />
                </View>
                <Text style={dynamicStyles.favName} numberOfLines={1}>{chat.name.split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {!isArchivedView && !isSearching && (
        <View style={dynamicStyles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dynamicStyles.filterScroll}>
            <FilterButton type="all" label="Tous" icon={<Search size={16} />} />
            <FilterButton type="unread" label="Non lus" icon={<MoreHorizontal size={16} />} />
            <FilterButton type="favorites" label="Favoris" icon={<Star size={16} />} />
            <FilterButton type="priority" label="Priorité" icon={<Pin size={16} />} />
            <FilterButton type="archived" label="Archives" icon={<Archive size={16} />} />
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={dynamicStyles.chatList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchChats(isArchivedView || (activeFilter as string) === 'archived'); }} colors={[themeColors.primary]} />}
        ListHeaderComponent={
          <>
            {archivedCount > 0 && !isArchivedView && !isSearching && activeFilter === 'all' && (
              <TouchableOpacity
                style={dynamicStyles.archivedRow}
                onPress={() => setActiveFilter('archived')}
              >
                <Archive size={18} color={themeColors.primary} />
                <Text style={dynamicStyles.archivedText}>Archivées</Text>
                <Text style={dynamicStyles.archivedCount}>{archivedCount}</Text>
              </TouchableOpacity>
            )}
            {currentUser && !isSearching && !isArchivedView && activeFilter === 'all' && (
              <TouchableOpacity style={dynamicStyles.meChatItem} onPress={startSelfChat}>
                <View style={dynamicStyles.avatarContainer}>
                  <Image source={{ uri: getFullUrl(currentUser.avatar_url || currentUser.avatar) || `https://ui-avatars.com/api/?name=${currentUser.full_name || currentUser.name}&background=random` }} style={dynamicStyles.avatar} />
                </View>
                <View style={dynamicStyles.chatInfo}>
                  <Text style={dynamicStyles.chatName}>Vous (Envoyez-vous un message)</Text>
                  <Text style={dynamicStyles.lastMessage}>Message personnel, brouillons...</Text>
                </View>
              </TouchableOpacity>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={dynamicStyles.emptyContainer}>
            <MessageSquare size={80} color={themeColors.text.disabled} />
            <Text style={dynamicStyles.emptyText}>
              {isArchivedView ? "Aucune discussion archivée" :
               activeFilter === 'unread' ? "Aucun message non lu" :
               activeFilter === 'favorites' ? "Aucun favori" : "Aucune discussion trouvée"}
            </Text>
          </View>
        }
      />

      {!isArchivedView && (
        <TouchableOpacity style={dynamicStyles.fab} onPress={() => navigation.navigate('Contacts')}>
          <Plus size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean, normalize: any, factor: number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12, backgroundColor: colors.primary, height: normalize(60) },
  headerLeft: { width: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', width: 80, justifyContent: 'flex-end' },
  headerTitle: { fontSize: normalize(20, factor), fontWeight: 'bold', color: '#fff' },
  headerButton: { padding: 5 },
  profileHeaderButton: { marginLeft: 10 },
  smallAvatar: { width: normalize(32), height: normalize(32), borderRadius: normalize(16), borderWidth: 1.5, borderColor: '#fff' },
  searchHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: colors.surface, elevation: 3 },
  searchInput: { flex: 1, fontSize: normalize(16, factor), marginLeft: 15, color: colors.text.primary },
  favoritesContainer: { backgroundColor: colors.surface, borderBottomWidth: 0.5, borderBottomColor: colors.divider, paddingVertical: 10 },
  favoritesScroll: { paddingHorizontal: 15 },
  favoriteItem: { alignItems: 'center', marginRight: 20, width: normalize(60) },
  favAvatarContainer: { position: 'relative', marginBottom: 5 },
  favAvatar: { width: normalize(52), height: normalize(52), borderRadius: normalize(26), borderWidth: 2, borderColor: colors.primary },
  favOnlineBadge: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  favName: { fontSize: normalize(10, factor), color: colors.text.primary, fontWeight: '600', textAlign: 'center' },
  filterContainer: { backgroundColor: colors.surface, borderBottomWidth: 0.5, borderBottomColor: colors.divider, minHeight: normalize(55) },
  filterScroll: { paddingHorizontal: 15, paddingVertical: 10, alignItems: 'center' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 25, backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  filterLabel: { marginLeft: 6, fontSize: normalize(12, factor), fontWeight: 'bold', color: colors.text.secondary },
  filterBadge: { marginLeft: 6, backgroundColor: colors.primary, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  chatList: { flexGrow: 1 },
  chatItem: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 12 },
  meChatItem: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 15, backgroundColor: isDark ? colors.surface : '#f9f9f9', borderBottomWidth: 1, borderBottomColor: colors.border },
  archivedRow: { flexDirection: 'row', padding: 15, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: colors.divider },
  archivedText: { flex: 1, marginLeft: 20, fontSize: normalize(16, factor), fontWeight: '600', color: colors.text.primary },
  archivedCount: { color: colors.primary, fontWeight: 'bold', fontSize: normalize(14, factor) },
  avatarContainer: { marginRight: 15, position: 'relative' },
  avatar: { width: normalize(52), height: normalize(52), borderRadius: normalize(26) },
  favoriteBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#fff', borderRadius: 8, width: 16, height: 16, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1 },
  chatInfo: { flex: 1, justifyContent: 'center', borderBottomWidth: 0.5, borderBottomColor: colors.divider, paddingBottom: 12 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: normalize(15, factor), fontWeight: 'bold', color: colors.text.primary },
  chatTime: { fontSize: normalize(11, factor), color: colors.text.secondary },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: normalize(13, factor), color: colors.text.secondary, flex: 1, marginRight: 10 },
  unreadBadge: { backgroundColor: colors.primary, borderRadius: normalize(10), minWidth: normalize(20), height: normalize(20), justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  unreadText: { color: '#fff', fontSize: normalize(11, factor), fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: normalize(25), right: normalize(20), width: normalize(56), height: normalize(56), borderRadius: normalize(28), backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { color: colors.text.secondary, fontSize: normalize(16, factor), marginTop: 10 }
});
