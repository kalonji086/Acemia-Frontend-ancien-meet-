import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import ChatListScreen from './ChatListScreen';
import StatusScreen from './StatusScreen';
import CallsScreen from './CallsScreen';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function MainScreen({ navigation, route }: any) {
  const { colors, isDark, normalize } = useTheme();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('chats');
  const [badges, setBadges] = useState({ messages: 0, calls: 0, status: 0 });
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 10000);

    // Activation du Socket pour le suivi en temps réel (Statut "En ligne")
    const startSocket = async () => {
      await socketService.initialize();
      await socketService.connect();
      await socketService.authenticate();
    };
    startSocket();

    return () => clearInterval(interval);
  }, []);

  const fetchBadges = async () => {
    try {
      const res = await apiService.getBadges();
      if (res.success) {
        setBadges(res.data);
      }
    } catch (e) { console.error(e); }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'chats': return <ChatListScreen navigation={navigation} route={route} />;
      case 'status': return <StatusScreen />;
      case 'calls': return <CallsScreen />;
      default: return <ChatListScreen navigation={navigation} route={route} />;
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
          badge={badges.messages}
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
          badge={badges.status}
          styles={styles}
          normalize={normalize}
        />
        <TabItem
          active={activeTab === 'calls'}
          icon="call"
          label={t('calls')}
          onPress={() => setActiveTab('calls')}
          activeColor={colors.primary}
          inactiveColor={colors.text.secondary}
          activeBg={isDark ? colors.primary + '20' : '#F3E5F5'}
          badge={badges.calls}
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
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1 },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
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
