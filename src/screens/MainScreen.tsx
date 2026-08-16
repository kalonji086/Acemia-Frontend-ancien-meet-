import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChatListScreen from './ChatListScreen';
import StatusScreen from './StatusScreen';
import MarketScreen from './MarketScreen';
import ChatScreen from './ChatScreen';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MainScreen({ navigation, route }: any) {
  const { colors, isDark, normalize } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [screenWidth, setScreenWidth] = useState(SCREEN_WIDTH);

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

        // Vérification immédiate des mises à jour légales après connexion/re-connexion
        checkLegalUpdates();
      } catch (err) {
        console.error('MainScreen: Socket start error', err);
      }
    };

    startSocket();
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
          // Double vérification : on ne montre pas si c'est du contenu placeholder par défaut
          // Un placeholder contient généralement le mot "Version" suivi du numéro de version par défaut
          const isPlaceholder = docs.every((d: any) =>
            d.content === `Conditions Générales d'Utilisation - Version ${d.version}` ||
            d.content === `Politique de Confidentialité - Version ${d.version}` ||
            d.content.includes('Version 5.0.0') ||
            d.content.includes('Version 32.0.0')
          );

          if (isPlaceholder && !docs.some((d: any) => d.force_acceptance === true)) return;

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
                    <ChatScreen
                      navigation={navigation}
                      route={{ params: {
                        chatId: selectedChat.id,
                        name: selectedChat.name,
                        avatar: selectedChat.avatar,
                        peerUserId: selectedChat.otherUserId
                      } }}
                    />
                  ) : (
                    <View style={styles.emptyDetail}>
                      <Ionicons name="chatbubbles-outline" size={80} color={colors.text.disabled} />
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
        case 'market': return <MarketScreen />;
        default: return <ChatListScreen navigation={navigation} route={route} />;
      }
    } catch (err) {
      console.error('MainScreen render content error:', err);
      return (
        <View style={styles.emptyDetail}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.danger} />
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
          icon="chatbubbles"
          label={t('chats')}
          onPress={() => setActiveTab('chats')}
          activeColor={colors.primary}
          inactiveColor={colors.text.secondary}
          activeBg={isDark ? colors.primary + '20' : '#F3E5F5'}
          badge={0}
          styles={styles}
          normalize={normalize}
        />
        <TabItem
          active={activeTab === 'status'}
          icon="aperture"
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
          active={activeTab === 'market'}
          icon="cart"
          label="Market"
          onPress={() => setActiveTab('market')}
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
  <TouchableOpacity style={styles.tabItem} onPress={onPress}>
    <View style={[styles.iconContainer, active && { backgroundColor: activeBg }]}>
      <Ionicons name={active ? icon : `${icon}-outline`} size={normalize(22)} color={active ? activeColor : inactiveColor} />
      {badge > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{badge > 99 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
    <Text style={[styles.tabLabel, { color: active ? activeColor : inactiveColor }, active && styles.activeLabel]}>{label}</Text>
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
    paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconContainer: {
    width: normalize(50),
    height: normalize(30),
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  tabLabel: { fontSize: normalize(11), fontWeight: '500' },
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
