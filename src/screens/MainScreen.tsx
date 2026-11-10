import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Image, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MessageSquare, Aperture, Phone, ShoppingCart, AlertCircle,
  MessagesSquare, Briefcase, GraduationCap
} from 'lucide-react-native';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChatListScreen from './ChatListScreen';
import StatusScreen from './StatusScreen';
import MarketScreen from './MarketScreen';
import SchoolDashboardScreen from './SchoolDashboardScreen';
import ChatScreen from './ChatScreen';
import EmploiMainScreen from './EmploiMainScreen';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';

export default function MainScreen({ navigation, route }: any) {
  // --- 1. HOOKS (MUST ALWAYS RUN IN THE SAME ORDER) ---
  const { colors, isDark, normalize } = useTheme();
  const { user: currentUser, setUser, loading: userLoading } = useUser();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState('chats');
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await apiService.getChats(1, 100);
        if (res.success) {
          const total = res.data.reduce((acc: number, chat: any) => acc + parseInt(chat.unread_count || 0), 0);
          setUnreadTotal(total);
        }
      } catch (e) {}
    };

    fetchUnreadCount();
    const handleMsg = () => fetchUnreadCount();
    socketService.on('new_message', handleMsg);
    socketService.on('message_read', handleMsg);

    return () => {
      socketService.off('new_message', handleMsg);
      socketService.off('message_read', handleMsg);
    };
  }, []);

  useEffect(() => {
    if (route.params?.screen && route.params.screen !== activeTab) {
      setActiveTab(route.params.screen);
    }
  }, [route.params?.screen, activeTab]);

  useEffect(() => {
    const startSocket = async () => {
      try {
        await socketService.initialize();
        await socketService.connect();
        await socketService.authenticate();

        socketService.on('profile_updated', async () => {
          const res = await apiService.getMe();
          if (res.success) setUser(res.data);
        });

        // Legal updates check
        const legalRes = await apiService.getLegalDocs();
        if (legalRes?.success) {
          const docs = legalRes.data || [];
          const userRes = await apiService.getMe();
          if (userRes.success) {
            const user = userRes.data;
            await AsyncStorage.setItem('user', JSON.stringify(user));
            const mustAccept = docs.some((doc: any) => {
              if (!doc.force_acceptance) return false;
              if (doc.type === 'tos') return doc.version !== user?.accepted_tos_version;
              if (doc.type === 'privacy') return doc.version !== user?.accepted_privacy_version;
              return doc.version !== user?.accepted_legal_version;
            });
            if (mustAccept) {
              navigation.reset({ index: 0, routes: [{ name: 'LegalAcceptance', params: { documents: docs } }] });
            }
          }
        }

        socketService.on('legal_update', (data) => {
          if (data.force_acceptance === true || data.force_acceptance === 'true') {
             navigation.reset({
                index: 0,
                routes: [{
                  name: 'LegalAcceptance',
                  params: { documents: [{ ...data, force_acceptance: true }], isRealTime: true }
                }]
             });
          }
        });
      } catch (err) {}
    };

    startSocket();
    return () => {
      socketService.off('profile_updated');
      socketService.off('legal_update');
    };
  }, [navigation, setUser]);

  // --- 2. EARLY RETURN (AFTER ALL HOOKS) ---
  if (userLoading || !currentUser || !colors) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#1a1a1a' : '#fff' }}>
        <ActivityIndicator size="large" color={colors?.primary || '#673AB7'} />
      </View>
    );
  }

  // --- 3. LOGIC & RENDER ---
  const isTablet = screenWidth >= 800;
  const isWeb = Platform.OS === 'web';
  const showSidebar = isWeb && screenWidth > 1024;
  const styles = createStyles(colors, normalize, isDark, screenWidth);

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    if (isWeb) {
      navigation.setParams({ screen: tab });
    }
  };

  const renderContent = () => {
    try {
      switch (activeTab) {
        case 'chats':
          if (isTablet) {
            return (
              <View style={styles.splitView}>
                <View style={styles.masterPane}>
                  <ChatListScreen
                    navigation={navigation}
                    route={route}
                    onChatSelect={setSelectedChat}
                    selectedChatId={selectedChat?.id}
                  />
                </View>
                <View style={styles.detailPane}>
                  {selectedChat ? (
                    <ChatScreen
                      navigation={navigation}
                      route={{ params: {
                        chatId: selectedChat.id,
                        name: selectedChat.name,
                        avatar: selectedChat.avatar,
                        peerUserId: selectedChat.otherUserId,
                        isSplitView: true
                      } }}
                    />
                  ) : (
                    <View style={styles.emptyDetail}>
                      <MessagesSquare size={80} color={colors.text.disabled} />
                      <Text style={[styles.emptyDetailText, { color: colors.text.secondary }]}>
                        Sélectionnez une discussion pour commencer à discuter
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }
          return <ChatListScreen navigation={navigation} route={route} />;
        case 'status': return <StatusScreen />;
        case 'emploi': return <EmploiMainScreen navigation={navigation} />;
        case 'market': return <MarketScreen />;
        case 'school': return <SchoolDashboardScreen navigation={navigation} />;
        default: return <ChatListScreen navigation={navigation} route={route} />;
      }
    } catch (err) {
      return (
        <View style={styles.emptyDetail}>
          <AlertCircle size={60} color={colors.danger} />
          <Text style={{ marginTop: 10, color: colors.text.primary }}>Erreur.</Text>
        </View>
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, flexDirection: showSidebar ? 'row' : 'column' }]}>
      {showSidebar && (
        <View style={[styles.sidebar, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
          <View style={styles.sidebarHeader}>
            <View style={[styles.sidebarLogo, { backgroundColor: colors.primary }]}>
              <MessageSquare size={24} color="#fff" />
            </View>
            <Text style={[styles.sidebarTitle, { color: colors.text.primary }]}>Acemia</Text>
          </View>

          <View style={styles.sidebarMenu}>
            <SidebarItem active={activeTab === 'chats'} icon={<MessagesSquare size={24} />} label={t('chats')} onPress={() => handleTabPress('chats')} colors={colors} badge={unreadTotal} styles={styles} />
            <SidebarItem active={activeTab === 'status'} icon={<Aperture size={24} />} label={t('status')} onPress={() => handleTabPress('status')} colors={colors} styles={styles} />
            <SidebarItem active={activeTab === 'emploi'} icon={<Briefcase size={24} />} label="Emploi" onPress={() => handleTabPress('emploi')} colors={colors} styles={styles} />
            <SidebarItem active={activeTab === 'market'} icon={<ShoppingCart size={24} />} label={t('market')} onPress={() => handleTabPress('market')} colors={colors} styles={styles} />
            <SidebarItem active={activeTab === 'school'} icon={<GraduationCap size={24} />} label="École" onPress={() => handleTabPress('school')} colors={colors} styles={styles} />
          </View>

          <View style={styles.sidebarFooter}>
            <TouchableOpacity style={styles.sidebarProfile} onPress={() => navigation.navigate('Settings')}>
              <Image source={{ uri: currentUser.avatar_url || `https://ui-avatars.com/api/?name=${currentUser.full_name}` }} style={styles.sidebarAvatar} />
              <View style={styles.sidebarProfileInfo}>
                <Text style={[styles.sidebarName, { color: colors.text.primary }]} numberOfLines={1}>{currentUser.full_name}</Text>
                <Text style={[styles.sidebarStatus, { color: colors.text.secondary }]}>En ligne</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.content}>{renderContent()}</View>

      {!showSidebar && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10), height: normalize(70) + insets.bottom, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TabItem active={activeTab === 'chats'} icon={<MessagesSquare size={22} />} label={t('chats')} onPress={() => handleTabPress('chats')} activeColor={colors.primary} inactiveColor={colors.text.secondary} activeBg={isDark ? colors.primary + '20' : '#F3E5F5'} badge={unreadTotal} normalize={normalize} styles={styles} />
          <TabItem active={activeTab === 'status'} icon={<Aperture size={22} />} label={t('status')} onPress={() => handleTabPress('status')} activeColor={colors.primary} inactiveColor={colors.text.secondary} activeBg={isDark ? colors.primary + '20' : '#F3E5F5'} normalize={normalize} styles={styles} />
          <TabItem active={activeTab === 'emploi'} icon={<Briefcase size={22} />} label={t('emploi') || 'Emploi'} onPress={() => handleTabPress('emploi')} activeColor={colors.primary} inactiveColor={colors.text.secondary} activeBg={isDark ? colors.primary + '20' : '#F3E5F5'} normalize={normalize} styles={styles} />
          <TabItem active={activeTab === 'market'} icon={<ShoppingCart size={22} />} label={t('market')} onPress={() => handleTabPress('market')} activeColor={colors.primary} inactiveColor={colors.text.secondary} activeBg={isDark ? colors.primary + '20' : '#F3E5F5'} normalize={normalize} styles={styles} />
          <TabItem active={activeTab === 'school'} icon={<GraduationCap size={22} />} label="École" onPress={() => handleTabPress('school')} activeColor={colors.primary} inactiveColor={colors.text.secondary} activeBg={isDark ? colors.primary + '20' : '#F3E5F5'} normalize={normalize} styles={styles} />
        </View>
      )}
    </View>
  );
}

const SidebarItem = ({ active, icon, label, onPress, colors, badge, styles }: any) => (
  <TouchableOpacity style={[styles.sidebarItem, active && { backgroundColor: colors.primary + '15', borderColor: colors.primary }]} onPress={onPress}>
    <View style={styles.sidebarIconContainer}>
      {React.cloneElement(icon, { color: active ? colors.primary : colors.text.secondary })}
      {badge > 0 && <View style={[styles.sidebarBadge, { backgroundColor: colors.danger }]}><Text style={styles.sidebarBadgeText}>{badge > 99 ? '9+' : badge}</Text></View>}
    </View>
    <Text style={[styles.sidebarLabel, { color: active ? colors.primary : colors.text.primary, fontWeight: active ? 'bold' : '500' }]}>{label}</Text>
  </TouchableOpacity>
);

const TabItem = ({ active, icon, label, onPress, activeColor, inactiveColor, activeBg, badge, normalize, styles }: any) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.iconContainer, active && { backgroundColor: activeBg }]}>
      {React.cloneElement(icon, { color: active ? activeColor : inactiveColor })}
      {badge > 0 && <View style={styles.badgeContainer}><Text style={styles.badgeText} numberOfLines={1}>{badge > 99 ? '9+' : badge}</Text></View>}
    </View>
    <Text style={[styles.tabLabel, { color: active ? activeColor : inactiveColor }, active && styles.activeLabel]} numberOfLines={1}>{label}</Text>
  </TouchableOpacity>
);

const createStyles = (colors: any, normalize: any, isDark: boolean, screenWidth: number) => StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  splitView: { flex: 1, flexDirection: 'row' },
  masterPane: { width: Math.min(Math.max(screenWidth * 0.34, 280), 400), borderRightWidth: 1, borderRightColor: colors?.border || '#eee' },
  detailPane: { flex: 1 },
  emptyDetail: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyDetailText: { marginTop: 20, fontSize: normalize(16), textAlign: 'center' },
  sidebar: { width: 280, borderRightWidth: 1, padding: 20, display: 'flex', flexDirection: 'column', backgroundColor: isDark ? 'rgba(26,26,26,0.8)' : 'rgba(255,255,255,0.8)' },
  sidebarHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 40, marginTop: 10 },
  sidebarLogo: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  sidebarTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  sidebarMenu: { flex: 1 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 10, borderLeftWidth: 4, borderColor: 'transparent' },
  sidebarIconContainer: { marginRight: 15, position: 'relative' },
  sidebarLabel: { fontSize: 16, letterSpacing: 0.5 },
  sidebarBadge: { position: 'absolute', top: -8, right: -8, minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: colors?.surface || '#fff' },
  sidebarBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  sidebarFooter: { marginTop: 'auto', borderTopWidth: 1, borderTopColor: colors?.border || '#eee', paddingTop: 20 },
  sidebarProfile: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
  sidebarAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors?.border || '#eee' },
  sidebarProfileInfo: { flex: 1, marginLeft: 10 },
  sidebarName: { fontSize: 15, fontWeight: '800' },
  sidebarStatus: { fontSize: 12, fontWeight: '500', opacity: 0.7 },
  bottomBar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8, width: '100%', justifyContent: 'space-between' },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconContainer: { width: normalize(48), height: normalize(28), borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  tabLabel: { fontSize: normalize(10), fontWeight: '500', textAlign: 'center' },
  activeLabel: { fontWeight: 'bold' },
  badgeContainer: { position: 'absolute', top: -5, right: -5, backgroundColor: colors?.danger || '#F44336', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: isDark ? (colors?.surface || '#000') : '#fff' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});
