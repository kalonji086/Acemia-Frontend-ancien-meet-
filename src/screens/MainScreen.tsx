import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, ActivityIndicator } from 'react-native';
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
import SchoolScreen from './SchoolScreen';
import ChatScreen from './ChatScreen';
import EmploiMainScreen from './EmploiMainScreen';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MainScreen({ navigation, route }: any) {
  const { colors, isDark, normalize } = useTheme();
  const { user: currentUser, setUser, loading: userLoading } = useUser();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [screenWidth, setScreenWidth] = useState(SCREEN_WIDTH);
  const [unreadTotal, setUnreadTotal] = useState(0);

  // Attendre que l'utilisateur soit chargé
  if (userLoading || !currentUser || !colors) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#1a1a1a' : '#fff' }}>
        <ActivityIndicator size="large" color={colors?.primary || '#673AB7'} />
      </View>
    );
  }

  const fetchUnreadCount = async () => {
    try {
      const res = await apiService.getChats(1, 100);
      if (res.success) {
        const total = res.data.reduce((acc: number, chat: any) => acc + parseInt(chat.unread_count || 0), 0);
        setUnreadTotal(total);
      }
    } catch (e) {}
  };

  React.useEffect(() => {
    fetchUnreadCount();

    // Refresh unread count on socket events
    const handleNewMessage = () => fetchUnreadCount();
    socketService.on('new_message', handleNewMessage);
    socketService.on('message_read', handleNewMessage);

    return () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('message_read', handleNewMessage);
    };
  }, []);

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription.remove();
  }, []);

  const isTablet = screenWidth > 768;

  React.useEffect(() => {
    if (route.params?.screen) {
      setActiveTab(route.params.screen);
    }
  }, [route.params?.screen]);

  React.useEffect(() => {
    // Activation du Socket pour le suivi en temps réel (Statut "En ligne")
    const startSocket = async () => {
      try {
        await socketService.initialize();
        await socketService.connect();
        await socketService.authenticate();

        // Écouter les mises à jour de profil (badge, etc.) en temps réel
        socketService.on('profile_updated', async () => {
          const res = await apiService.getMe();
          if (res.success) {
            setUser(res.data);
          }
        });

        // Écouter si un autre utilisateur est vérifié pour mettre à jour les icônes badge
        socketService.on('admin:user_verified', () => {
          // On peut émettre un événement local ou simplement laisser le polling/refresh faire
          // Mais pour le temps réel pur, on pourrait déclencher un refresh global
        });

        // Vérification immédiate des mises à jour légales après connexion/re-connexion
        checkLegalUpdates();

        // Écouter les mises à jour légales en temps réel
        socketService.on('legal_update', (data) => {
          console.log('MainScreen: Received real-time legal_update', data);
          if (data.force_acceptance === true || data.force_acceptance === 'true') {
             navigation.reset({
                index: 0,
                routes: [{
                  name: 'LegalAcceptance',
                  params: {
                    documents: [{
                      type: data.type,
                      content: data.content,
                      version: data.version,
                      force_acceptance: true
                    }],
                    isRealTime: true
                  }
                }]
             });
          }
        });
      } catch (err) {
        console.error('MainScreen: Socket start error', err);
      }
    };

    startSocket();

    return () => {
      socketService.off('profile_updated');
      socketService.off('admin:user_verified');
      socketService.off('legal_update');
    };
  }, []);

  const checkLegalUpdates = async () => {
    try {
      const legalRes = await apiService.getLegalDocs();
      if (legalRes && legalRes.success) {
        const docs = legalRes.data || [];

        // On récupère les données de l'utilisateur les plus fraîches du SERVEUR
        // pour être sûr que le profil n'est pas déjà à jour
        const userRes = await apiService.getMe();
        if (!userRes.success) return;
        const user = userRes.data;

        // On met aussi à jour le cache local pour éviter les répétitions au prochain démarrage
        await AsyncStorage.setItem('user', JSON.stringify(user));

        const mustAccept = docs.some((doc: any) => {
          if (!doc.force_acceptance) return false;

          // On ne déclenche QUE si le contenu est différent des versions acceptées
          if (doc.type === 'tos') return doc.version !== user?.accepted_tos_version;
          if (doc.type === 'privacy') return doc.version !== user?.accepted_privacy_version;
          return doc.version !== user?.accepted_legal_version;
        });

        if (mustAccept) {
          console.log('MainScreen: Mandatory legal acceptance required.');
          navigation.reset({
            index: 0,
            routes: [{ name: 'LegalAcceptance', params: { documents: docs } }]
          });
        }
      }
    } catch (e) {
      console.log('MainScreen: Periodic legal check failed', e);
    }
  };

  /*
  const fetchBadges = async () => {
    try {
      const res = await apiService.getBadges();
      if (res.success) {
        setBadges(res.data);
      }
    } catch (e) { console.error(e); }
  };
  */

  const renderContent = () => {
    if (!colors) return <ActivityIndicator color="#673AB7" style={{ marginTop: 50 }} />;

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
                    <View style={{ flex: 1, overflow: 'visible' }}>
                      <ChatScreen
                        navigation={navigation}
                        route={{ params: {
                          chatId: selectedChat.id,
                          name: selectedChat.name,
                          avatar: selectedChat.avatar,
                          peerUserId: selectedChat.otherUserId
                        } }}
                      />
                    </View>
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
        case 'school': return <SchoolScreen navigation={navigation} />;
        default: return <ChatListScreen navigation={navigation} route={route} />;
      }
    } catch (err) {
      console.error('MainScreen render content error:', err);
      return (
        <View style={styles.emptyDetail}>
          <AlertCircle size={60} color={colors.danger} />
          <Text style={{ marginTop: 10, color: colors.text.primary }}>Une erreur d'affichage est survenue.</Text>
          <TouchableOpacity onPress={() => setActiveTab('chats')} style={{ marginTop: 20, padding: 10, backgroundColor: colors.primary, borderRadius: 10 }}>
            <Text style={{ color: '#fff' }}>Retour aux discussions</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  const styles = createStyles(colors, normalize, isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {renderContent()}
      </View>

      <View style={[
        styles.bottomBar,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          height: normalize(70) + insets.bottom,
          backgroundColor: colors.surface,
          borderTopColor: colors.border
        }
      ]}>
        <TabItem
          active={activeTab === 'chats'}
          icon={<MessagesSquare size={22} />}
          label={t('chats')}
          onPress={() => setActiveTab('chats')}
          activeColor={colors.primary}
          inactiveColor={colors.text.secondary}
          activeBg={isDark ? colors.primary + '20' : '#F3E5F5'}
          badge={unreadTotal}
          styles={styles}
          normalize={normalize}
        />
        <TabItem
          active={activeTab === 'status'}
          icon={<Aperture size={22} />}
          label={t('status')}
          onPress={() => setActiveTab('status')}
          activeColor={colors.primary}
          inactiveColor={colors.text.secondary}
          activeBg={isDark ? colors.primary + '20' : '#F3E5F5'}
          badge={0}
          styles={styles}
          normalize={normalize}
        />
        <TabItem
          active={activeTab === 'emploi'}
          icon={<Briefcase size={22} />}
          label={t('emploi') || 'Emploi'}
          onPress={() => setActiveTab('emploi')}
          activeColor={colors.primary}
          inactiveColor={colors.text.secondary}
          activeBg={isDark ? colors.primary + '20' : '#F3E5F5'}
          badge={0}
          styles={styles}
          normalize={normalize}
        />
        <TabItem
          active={activeTab === 'market'}
          icon={<ShoppingCart size={22} />}
          label={t('market')}
          onPress={() => setActiveTab('market')}
          activeColor={colors.primary}
          inactiveColor={colors.text.secondary}
          activeBg={isDark ? colors.primary + '20' : '#F3E5F5'}
          badge={0}
          styles={styles}
          normalize={normalize}
        />
        <TabItem
          active={activeTab === 'school'}
          icon={<GraduationCap size={22} />}
          label={t('school') || 'School'}
          onPress={() => setActiveTab('school')}
          activeColor={colors.primary}
          inactiveColor={colors.text.secondary}
          activeBg={isDark ? colors.primary + '20' : '#F3E5F5'}
          badge={0}
          styles={styles}
          normalize={normalize}
        />
      </View>
    </View>
  );
}

const TabItem = ({ active, icon, label, onPress, activeColor, inactiveColor, activeBg, badge, styles, normalize }: any) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.iconContainer, active && { backgroundColor: activeBg }]}>
      {React.cloneElement(icon, { color: active ? activeColor : inactiveColor })}
      {badge > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText} numberOfLines={1}>{badge > 99 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
    <Text
      style={[styles.tabLabel, { color: active ? activeColor : inactiveColor }, active && styles.activeLabel]}
      numberOfLines={1}
      ellipsizeMode="tail"
      adjustsFontSizeToFit
      minimumFontScale={0.8}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const createStyles = (colors: any, normalize: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  splitView: { flex: 1, flexDirection: 'row' },
  masterPane: { width: 350, borderRightWidth: 1, borderRightColor: colors.border },
  detailPane: { flex: 1, backgroundColor: colors.background },
  emptyDetail: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyDetailText: { marginTop: 20, fontSize: normalize(16), textAlign: 'center' },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    paddingTop: 8,
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: normalize(10),
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconContainer: {
    width: normalize(48),
    height: normalize(28),
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  tabLabel: { fontSize: normalize(10), fontWeight: '500', textAlign: 'center' },
  activeLabel: { fontWeight: 'bold' },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: isDark ? colors.surface : '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
