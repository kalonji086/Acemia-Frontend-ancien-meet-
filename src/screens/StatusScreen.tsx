import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Plus, Pencil, Camera as CameraIcon } from 'lucide-react-native';
import apiService from '../services/api.service';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ExpoCamera from 'expo-camera';
import { SOCKET_URL } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import SocketService from '../services/socket.service';

const { width } = Dimensions.get('window');

export default function StatusScreen() {
  const { colors: themeColors, isDark, normalize } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const [userStatuses, setUserStatuses] = useState<any[]>([]);
  const [myStatuses, setMyStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [marketFeed, setMarketFeed] = useState<any[]>([]);

  const styles = createStyles(themeColors, normalize, isDark);

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;
    const baseUrl = SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${path}`;
  };

  const handlePickStatusImage = async () => {
    try {
      Alert.alert('Ajouter un statut', 'Choisissez une source', [
        {
          text: 'Prendre une photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') return Alert.alert('Permission requise', 'Accès caméra refusé.');
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [9, 16], quality: 0.8 });
            if (!result.canceled) navigation.navigate('CreateStatus', { imageUri: result.assets[0].uri });
          }
        },
        {
          text: 'Galerie',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') return Alert.alert('Permission requise', 'Accès photos refusé.');
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [9, 16], quality: 0.8 });
            if (!result.canceled) navigation.navigate('CreateStatus', { imageUri: result.assets[0].uri });
          }
        },
        { text: 'Annuler', style: 'cancel' }
      ]);
    } catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    try {
      const user = await apiService.getCurrentUser();
      if (user) setCurrentUser(user);

      const response = await apiService.getStatuses();
      if (response && response.success) {
        const allStatuses = response.data || [];
        const now = new Date();
        const filtered = allStatuses.map((u: any) => ({
          ...u,
          statuses: (u.statuses || []).filter((s: any) => (now.getTime() - new Date(s.created_at).getTime()) <= 86400000)
        })).filter((u: any) => u.statuses.length > 0);
        
        setUserStatuses(filtered.filter((s: any) => s.user_id !== user?.id));
        const mine = filtered.find((s: any) => s.user_id === user?.id);
        setMyStatuses(mine ? mine.statuses : []);
      }
    } catch (error) { console.error(error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const fetchMarketFeed = async () => {
    try {
      const res = await apiService.getMarketDiscovery();
      if (res && res.success) {
        setMarketFeed(res.data || []);
      }
    } catch (e) { console.error(e); }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      fetchMarketFeed();
      const handleStatusUpdate = () => fetchData();
      const handleMarketUpdate = () => fetchMarketFeed();
      SocketService.on('status:updated', handleStatusUpdate);
      SocketService.on('market:post_update', handleMarketUpdate);
      return () => {
        SocketService.off('status:updated', handleStatusUpdate);
        SocketService.off('market:post_update', handleMarketUpdate);
      };
    }, [])
  );

  const onRefresh = () => { setRefreshing(true); fetchData(); fetchMarketFeed(); };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
    return 'Hier';
  };

  const renderStatusItem = (item: any, isMine = false) => {
    if (!item) return null;
    const statuses = item.statuses || [];
    const lastStatus = statuses.length > 0 ? statuses[statuses.length - 1] : null;
    const hasUnread = !isMine && statuses.some((s: any) => !s.is_viewed);

    return (
      <TouchableOpacity
        key={item.user_id || 'mine'}
        style={styles.statusItem}
        onPress={() => isMine && statuses.length === 0 ? navigation.navigate('CreateStatus') : navigation.navigate('ViewStatus', { userStatus: item })}
      >
        <View style={styles.avatarWrapper}>
          <View style={[
            styles.avatarCircle,
            { borderColor: statuses.length > 0 ? (hasUnread ? '#25D366' : '#ccc') : 'transparent' }
          ]}>
            <Image
              source={{ uri: getFullUrl(item.avatar_url) || `https://ui-avatars.com/api/?name=${item.full_name || 'User'}&background=random` }}
              style={styles.statusAvatar}
            />
          </View>
          {isMine && statuses.length === 0 && (
            <View style={[styles.addIcon, { backgroundColor: '#25D366' }]}><Plus size={14} color="#fff" /></View>
          )}
        </View>
        <View style={styles.statusInfo}>
          <Text style={[styles.statusName, { color: themeColors.text.primary }]}>{isMine ? 'Mon statut' : (item.full_name || 'Utilisateur')}</Text>
          <Text style={[styles.statusTime, { color: themeColors.text.secondary }]}>
            {statuses.length > 0 ? formatTime(lastStatus.created_at) : 'Appuyez pour ajouter un statut'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMarketCircle = (item: any) => {
    if (!item) return null;
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.marketCircleContainer}
        onPress={() => navigation.navigate('BusinessPublicProfile', { businessId: item.id })}
      >
        <View style={[styles.marketCircleRing, { borderColor: themeColors.primary }]}>
          <Image
            source={{ uri: getFullUrl(item.logo_url) || `https://ui-avatars.com/api/?name=${item.business_name}` }}
            style={styles.marketCircleLogo}
          />
          <View style={styles.marketStatBadge}>
            <Text style={styles.marketStatBadgeText}>{item.followers_count || 0}</Text>
          </View>
        </View>
        <Text style={[styles.marketCircleName, { color: themeColors.text.primary }]} numberOfLines={1}>
          {item.business_name}
        </Text>
      </TouchableOpacity>
    );
  };

  const insets = useSafeAreaInsets();

  if (loading && !refreshing) return <View style={styles.centered}><ActivityIndicator size="large" color={themeColors.primary} /></View>;

  const isWide = width > 1024;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={{ height: insets.top, backgroundColor: themeColors.primary }} />
      <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[themeColors.primary]} />}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={[styles.content, isWide && { paddingHorizontal: '10%', paddingTop: 30 }]}>
          {/* Section Statuts Style WhatsApp - Grid on Desktop */}
          <View style={isWide ? { flexDirection: 'row', flexWrap: 'wrap', gap: 20 } : {}}>
            {renderStatusItem({ user_id: currentUser?.id, full_name: 'Moi', statuses: myStatuses, avatar_url: currentUser?.avatar_url || currentUser?.avatar }, true)}

            {isWide && userStatuses.map((item) => (
              <View key={item.user_id} style={{ width: '30%', minWidth: 250 }}>
                {renderStatusItem(item)}
              </View>
            ))}
          </View>

          {!isWide && (
            <>
              <View style={[styles.listHeader, { backgroundColor: isDark ? '#222' : '#f0f2f5' }]}>
                <Text style={[styles.listHeaderText, { color: themeColors.text.secondary }]}>Mises à jour récentes</Text>
              </View>

              {userStatuses.length > 0 ? (
                userStatuses.map((item) => renderStatusItem(item))
              ) : (
                <View style={styles.emptyRecent}>
                  <Text style={{ color: themeColors.text.disabled, fontSize: 13 }}>Aucune mise à jour récente à afficher.</Text>
                </View>
              )}
            </>
          )}

          {/* Section Market Feed */}
          <View style={[styles.listHeader, { backgroundColor: isDark ? '#222' : '#f0f2f5', marginTop: 20 }]}>
            <Text style={[styles.listHeaderText, { color: themeColors.text.secondary }]}>Découvertes Market</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.marketScroll, isWide && { paddingVertical: 30 }]}>
            {marketFeed.length > 0 ? (
               marketFeed.map((item) => renderMarketCircle(item))
            ) : (
              <Text style={{ color: themeColors.text.disabled, padding: 20 }}>Aucun pro actif.</Text>
            )}
          </ScrollView>

          <View style={styles.footerSpacing} />
        </View>
      </ScrollView>

      <TouchableOpacity style={[styles.fabEdit, isWide && { bottom: 100, right: 100 }]} onPress={() => navigation.navigate('CreateStatus')}><Pencil size={20} color="#455A64" /></TouchableOpacity>
      <TouchableOpacity style={[styles.fabCamera, { backgroundColor: themeColors.primary }, isWide && { bottom: 30, right: 100 }]} onPress={handlePickStatusImage}>
        <CameraIcon size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, normalize: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  statusItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: isDark ? '#333' : '#eee' },
  avatarWrapper: { position: 'relative' },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 2.5, padding: 2, justifyContent: 'center', alignItems: 'center' },
  statusAvatar: { width: '100%', height: '100%', borderRadius: 25 },
  addIcon: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  statusInfo: { flex: 1, marginLeft: 15 },
  statusName: { fontSize: 16, fontWeight: 'bold' },
  statusTime: { fontSize: 13, marginTop: 2 },
  listHeader: { paddingHorizontal: 15, paddingVertical: 8 },
  listHeaderText: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyRecent: { padding: 30, alignItems: 'center' },
  marketScroll: { paddingHorizontal: 10, paddingVertical: 15 },
  marketCircleContainer: { alignItems: 'center', width: 90, marginRight: 5 },
  marketCircleRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, padding: 2, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  marketCircleLogo: { width: '100%', height: '100%', borderRadius: 30 },
  marketCircleName: { fontSize: 10, fontWeight: 'bold', marginTop: 5, textAlign: 'center', width: '100%' },
  marketStatBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ff3b30', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
  marketStatBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  fabCamera: { position: 'absolute', bottom: normalize(25), right: normalize(20), width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  fabEdit: { position: 'absolute', bottom: normalize(100), right: normalize(25), width: 46, height: 46, borderRadius: 23, backgroundColor: isDark ? '#444' : '#e9edef', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41 },
  footerSpacing: { height: 100 }
});
