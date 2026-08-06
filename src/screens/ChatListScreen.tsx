import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import { useFocusEffect } from '@react-navigation/native';
import { SOCKET_URL } from '../utils/constants';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function ChatListScreen({ navigation, route }: any) {
  const { colors: themeColors, isDark, normalize, fontSizeFactor } = useTheme();
  const { t } = useLanguage();
  const isArchivedView = route?.params?.showArchived === true;

  const [chats, setChats] = useState<any[]>([]);
  const [filteredChats, setFormattedChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [archivedCount, setArchivedCount] = useState(0);

  const getFullUrl = (url: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${SOCKET_URL}${url}`;
  };

  useFocusEffect(
    useCallback(() => {
      fetchChats();
      loadCurrentUser();
    }, [isArchivedView])
  );

  const loadCurrentUser = async () => {
    const user = await apiService.getCurrentUser();
    if (user) setCurrentUser(user);
  };

  const fetchChats = async () => {
    try {
      const response = await apiService.getChats(1, 50, isArchivedView);
      if (response.success) {
        const formatted = response.data.map((chat: any) => {
          const isSelf = chat.other_user?.id === currentUser?.id;
          return {
            id: chat.id,
            name: isSelf ? t('profile') : (chat.name || chat.other_user?.full_name || 'Inconnu'),
            avatar: getFullUrl(chat.other_user?.avatar_url) || `https://ui-avatars.com/api/?name=${chat.other_user?.full_name || 'Chat'}&background=random`,
            lastMessage: chat.last_message,
            lastMessageAt: chat.last_message_at,
            otherUserId: chat.other_user?.id,
            type: chat.type,
            isVerified: chat.other_user?.is_verified,
            isSelf
          };
        });
        setChats(formatted);
        setFormattedChats(formatted);

        if (!isArchivedView) {
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

  const handleLongPress = (chat: any) => {
    Alert.alert(
      chat.name,
      "Options",
      [
        {
          text: isArchivedView ? "📦 Désarchiver" : "📦 Archiver",
          onPress: async () => {
            await apiService.toggleArchiveChat(chat.id, !isArchivedView);
            fetchChats();
          }
        },
        {
          text: "🗑️ Supprimer",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Supprimer ?",
              "Cette action est irréversible.",
              [
                { text: t('cancel'), style: "cancel" },
                {
                  text: t('delete'),
                  style: "destructive",
                  onPress: async () => {
                    await apiService.deleteChat(chat.id);
                    fetchChats();
                  }
                }
              ]
            );
          }
        },
        { text: t('cancel'), style: "cancel" }
      ]
    );
  };

  const dynamicStyles = createStyles(themeColors, isDark, normalize, fontSizeFactor);

  const renderChatItem = ({ item }: any) => (
    <TouchableOpacity
      style={dynamicStyles.chatItem}
      onPress={() => navigation.navigate('Chat', {
        chatId: item.id,
        name: item.name,
        avatar: item.avatar,
        otherUserId: item.otherUserId
      })}
      onLongPress={() => handleLongPress(item)}
    >
      <View style={dynamicStyles.avatarContainer}>
        <Image source={{ uri: item.avatar }} style={dynamicStyles.avatar} />
      </View>
      
      <View style={dynamicStyles.chatInfo}>
        <View style={dynamicStyles.chatHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Text style={[dynamicStyles.chatName, item.isSelf && { color: themeColors.primary }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color={themeColors.primary} style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={dynamicStyles.chatTime}>
            {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
        <View style={dynamicStyles.chatFooter}>
          <Text style={dynamicStyles.lastMessage} numberOfLines={1}>
            {item.lastMessage || 'Nouveau message'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const startSelfChat = async () => {
    if (!currentUser) return;
    try {
      const res = await apiService.createChat([currentUser.id]);
      if (res.success) {
        navigation.navigate('Chat', {
          chatId: res.data.id,
          name: t('profile'),
          avatar: getFullUrl(currentUser.avatar),
          otherUserId: currentUser.id
        });
      }
    } catch (e) { console.error(e); }
  };

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />

      {!isSearching ? (
        <View style={dynamicStyles.header}>
          <View style={dynamicStyles.headerLeft}>
             <Ionicons name="chatbubble" size={normalize(24)} color="#fff" />
          </View>

          <View style={dynamicStyles.headerCenter}>
            <Text style={dynamicStyles.headerTitle}>Meet Me</Text>
          </View>

          <View style={dynamicStyles.headerRight}>
            <TouchableOpacity style={dynamicStyles.headerButton} onPress={() => setIsSearching(true)}>
              <Ionicons name="search-outline" size={24} color="#fff" />
            </TouchableOpacity>
            {!isArchivedView && (
              <TouchableOpacity style={dynamicStyles.profileHeaderButton} onPress={() => navigation.navigate('Settings')}>
                {currentUser?.avatar ? (
                  <Image source={{ uri: getFullUrl(currentUser.avatar) || '' }} style={dynamicStyles.smallAvatar} />
                ) : (
                  <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View style={dynamicStyles.searchHeader}>
          <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); fetchChats(); }}>
            <Ionicons name="arrow-back" size={24} color={themeColors.primary} />
          </TouchableOpacity>
          <TextInput
            style={dynamicStyles.searchInput}
            placeholder={t('search')}
            placeholderTextColor={themeColors.text.disabled}
            autoFocus
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              const filtered = chats.filter(c => c.name.toLowerCase().includes(text.toLowerCase()));
              setFormattedChats(filtered);
            }}
          />
        </View>
      )}

      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={dynamicStyles.chatList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchChats(); }} colors={[themeColors.primary]} />}
        ListHeaderComponent={
          <>
            {archivedCount > 0 && !isArchivedView && !isSearching && (
              <TouchableOpacity
                style={dynamicStyles.archivedRow}
                onPress={() => navigation.navigate('ChatList', { showArchived: true })}
              >
                <Ionicons name="archive-outline" size={20} color={themeColors.primary} />
                <Text style={dynamicStyles.archivedText}>Archivées</Text>
                <Text style={dynamicStyles.archivedCount}>{archivedCount}</Text>
              </TouchableOpacity>
            )}
            {currentUser && !isSearching && !isArchivedView && (
              <TouchableOpacity style={dynamicStyles.meChatItem} onPress={startSelfChat}>
                <View style={dynamicStyles.avatarContainer}>
                  <Image source={{ uri: getFullUrl(currentUser.avatar) || `https://ui-avatars.com/api/?name=${currentUser.name}&background=random` }} style={dynamicStyles.avatar} />
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
            <Ionicons name={isArchivedView ? "archive-outline" : "chatbubbles-outline"} size={normalize(80)} color={themeColors.text.disabled} />
            <Text style={dynamicStyles.emptyText}>{isArchivedView ? "Aucune discussion archivée" : "Aucun message trouvé"}</Text>
          </View>
        }
      />

      {!isArchivedView && (
        <TouchableOpacity style={dynamicStyles.fab} onPress={() => navigation.navigate('Contacts')}>
          <Ionicons name="chatbubble-ellipses" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
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
  chatList: { flexGrow: 1 },
  chatItem: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 12 },
  meChatItem: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 15, backgroundColor: isDark ? colors.surface : '#f9f9f9', borderBottomWidth: 1, borderBottomColor: colors.border },
  archivedRow: { flexDirection: 'row', padding: 15, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: colors.divider },
  archivedText: { flex: 1, marginLeft: 20, fontSize: normalize(16, factor), fontWeight: '600', color: colors.text.primary },
  archivedCount: { color: colors.primary, fontWeight: 'bold', fontSize: normalize(14, factor) },
  avatarContainer: { marginRight: 15 },
  avatar: { width: normalize(52), height: normalize(52), borderRadius: normalize(26) },
  chatInfo: { flex: 1, justifyContent: 'center', borderBottomWidth: 0.5, borderBottomColor: colors.divider, paddingBottom: 12 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: normalize(15, factor), fontWeight: 'bold', color: colors.text.primary },
  chatTime: { fontSize: normalize(11, factor), color: colors.text.secondary },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  lastMessage: { fontSize: normalize(13, factor), color: colors.text.secondary, flex: 1 },
  fab: { position: 'absolute', bottom: 30, right: 20, width: normalize(56), height: normalize(56), borderRadius: normalize(28), backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { color: colors.text.secondary, fontSize: normalize(16, factor), marginTop: 10 }
});
