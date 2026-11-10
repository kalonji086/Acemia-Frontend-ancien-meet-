import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Pencil, Camera as CameraIcon, Eye, CirclePlus } from 'lucide-react-native';
import apiService from '../services/api.service';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { SOCKET_URL } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import SocketService from '../services/socket.service';

export default function StatusScreen() {
  const { colors: themeColors, isDark, normalize } = useTheme();
  const { width } = useWindowDimensions();
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
        
        setUserStatuses(filtered.filter((s: any) => String(s.user_id) !== String(user?.id)));
        const mine = filtered.find((s: any) => String(s.user_id) === String(user?.id));
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

  const renderStatusCard = (item: any, isMine = false) => {
    if (!item) return null;
    const statuses = item.statuses || [];
    const lastStatus = statuses.length > 0 ? statuses[statuses.length - 1] : null;
    const hasUnread = !isMine && statuses.some((s: any) => s.is_viewed !== true && s.is_viewed !== 'true');
    const statusImage = lastStatus?.media_url || lastStatus?.mediaUrl || lastStatus?.image_url;
    const statusColor = lastStatus?.background_color || themeColors.primary;

    return (
      <TouchableOpacity
        key={item.user_id || 'mine'}
        style={[
          styles.statusCard,
          { width: statusCardSize, height: statusCardSize, backgroundColor: statusColor },
          hasUnread && styles.unreadStatusCard,
          statuses.length > 0 && !hasUnread && !isMine && styles.readStatusCard,
        ]}
        onPress={() => isMine && statuses.length === 0 ? navigation.navigate('CreateStatus') : navigation.navigate('ViewStatus', { userStatus: item })}
        accessibilityRole="button"
        accessibilityLabel={isMine ? (statuses.length > 0 ? 'Voir mon statut' : 'Ajouter un statut') : `Voir le statut de ${item.full_name || 'Utilisateur'}${hasUnread ? ', non lu' : ', lu'}`}
      >
        {lastStatus?.type === 'image' && statusImage ? (
          <Image source={{ uri: getFullUrl(statusImage) || undefined }} style={styles.statusCardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.statusCardColor, { backgroundColor: statusColor }]} />
        )}
        <View style={styles.statusCardScrim} />
        <View style={styles.statusCardTop}>
          <View style={[styles.statusCardAvatarRing, hasUnread && styles.unreadAvatarRing, statuses.length > 0 && !hasUnread && !isMine && styles.readAvatarRing]}>
            <Image
              source={{ uri: getFullUrl(item.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.full_name || 'User')}&background=random` }}
              style={styles.statusCardAvatar}
            />
          </View>
          {isMine && (
            <View style={styles.statusCardAdd}>
              <CirclePlus size={24} color="#fff" fill="#00A884" />
            </View>
          )}
          {!isMine && statuses.length > 0 && (
            <View style={[styles.statusReadBadge, hasUnread ? styles.unreadBadge : styles.readBadge]}>
              <Eye size={11} color="#fff" />
              <Text style={styles.statusReadText}>{hasUnread ? 'Nouveau' : 'Lu'}</Text>
            </View>
          )}
        </View>
        <View style={styles.statusCardBottom}>
          {statusCardSize >= 125 && lastStatus?.type === 'text' && lastStatus?.content ? (
            <Text style={styles.statusPreview} numberOfLines={2}>{lastStatus.content}</Text>
          ) : null}
          <Text style={styles.statusCardName} numberOfLines={1}>{isMine ? 'Mon statut' : (item.full_name || 'Utilisateur')}</Text>
          <Text style={styles.statusCardTime} numberOfLines={1}>
            {statuses.length > 0 ? formatTime(lastStatus.created_at) : 'Ajouter un statut'}
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
  const statusCardSize = Math.max(108, Math.min(isWide ? 156 : 136, (width - 48) / 2.45));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={{ height: insets.top, backgroundColor: themeColors.surface }} />
      <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[themeColors.primary]} />}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={[styles.content, isWide && styles.wideContent]}>
          <View style={styles.statusHeader}>
            <View style={styles.statusHeaderCopy}>
              <Text style={[styles.screenTitle, { color: themeColors.text.primary }]}>Statuts</Text>
              <Text style={[styles.screenSubtitle, { color: themeColors.text.secondary }]}>Partagez un moment avec vos contacts</Text>
            </View>
            <View style={styles.statusHeaderActions}>
              <TouchableOpacity
                style={[styles.headerAction, { backgroundColor: themeColors.surface }]}
                onPress={() => navigation.navigate('CreateStatus')}
                accessibilityRole="button"
                accessibilityLabel="Créer un statut texte"
              >
                <Pencil size={20} color={themeColors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerAction, { backgroundColor: themeColors.primary }]}
                onPress={handlePickStatusImage}
                accessibilityRole="button"
                accessibilityLabel="Créer un statut photo"
              >
                <CameraIcon size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <View>
              <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>Mises à jour récentes</Text>
              <Text style={[styles.sectionSubtitle, { color: themeColors.text.secondary }]}>Les statuts disparaissent après 24 h</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusCarousel}
            accessibilityLabel="Carrousel des statuts récents"
          >
            {renderStatusCard({
              user_id: currentUser?.id,
              full_name: 'Moi',
              statuses: myStatuses,
              avatar_url: currentUser?.avatar_url || currentUser?.avatar,
            }, true)}
            {userStatuses.map((item) => renderStatusCard(item))}
          </ScrollView>

          {userStatuses.length === 0 && (
            <View style={styles.emptyRecent}>
              <Text style={{ color: themeColors.text.disabled, fontSize: 13 }}>Aucun statut récent pour le moment.</Text>
            </View>
          )}

          {/* Section Market Feed */}
          <View style={styles.sectionHeading}>
            <View>
              <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>Découvertes Market</Text>
              <Text style={[styles.sectionSubtitle, { color: themeColors.text.secondary }]}>Les entreprises à découvrir</Text>
            </View>
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

    </SafeAreaView>
  );
}

const createStyles = (colors: any, normalize: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingBottom: 24 },
  wideContent: { width: '100%', maxWidth: 1100, alignSelf: 'center', paddingHorizontal: 28 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18 },
  statusHeaderCopy: { flex: 1, paddingRight: 12 },
  screenTitle: { fontSize: normalize(24), fontWeight: '800', letterSpacing: -0.5 },
  screenSubtitle: { fontSize: normalize(13), marginTop: 4 },
  statusHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAction: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  sectionTitle: { fontSize: normalize(16), fontWeight: '700' },
  sectionSubtitle: { fontSize: normalize(12), marginTop: 3 },
  statusCarousel: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, gap: 10 },
  statusCard: { borderRadius: 18, overflow: 'hidden', justifyContent: 'space-between', borderWidth: 1.5, borderColor: 'transparent' },
  unreadStatusCard: { borderColor: '#00A884' },
  readStatusCard: { borderColor: isDark ? '#667085' : '#d0d5dd' },
  statusCardImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  statusCardColor: { ...StyleSheet.absoluteFillObject },
  statusCardScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  statusCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 8 },
  statusCardAvatarRing: { width: 42, height: 42, borderRadius: 21, padding: 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.72)' },
  unreadAvatarRing: { borderColor: '#00A884', borderWidth: 3 },
  readAvatarRing: { borderColor: 'rgba(255,255,255,0.55)' },
  statusCardAvatar: { width: '100%', height: '100%', borderRadius: 17 },
  statusCardAdd: { position: 'absolute', top: 35, left: 34, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#00A884', borderWidth: 2, borderColor: '#fff' },
  statusReadBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 12, gap: 3 },
  unreadBadge: { backgroundColor: '#008f6f' },
  readBadge: { backgroundColor: 'rgba(0,0,0,0.5)' },
  statusReadText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  statusCardBottom: { paddingHorizontal: 9, paddingBottom: 10, paddingTop: 20 },
  statusPreview: { color: '#fff', fontSize: normalize(12), lineHeight: normalize(16), marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 4 },
  statusCardName: { color: '#fff', fontSize: normalize(12), fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 4 },
  statusCardTime: { color: 'rgba(255,255,255,0.82)', fontSize: normalize(10), marginTop: 3 },
  emptyRecent: { padding: 30, alignItems: 'center' },
  marketScroll: { paddingHorizontal: 10, paddingVertical: 15 },
  marketCircleContainer: { alignItems: 'center', width: 90, marginRight: 5 },
  marketCircleRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, padding: 2, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  marketCircleLogo: { width: '100%', height: '100%', borderRadius: 30 },
  marketCircleName: { fontSize: 10, fontWeight: 'bold', marginTop: 5, textAlign: 'center', width: '100%' },
  marketStatBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ff3b30', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
  marketStatBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  footerSpacing: { height: 100 }
});
