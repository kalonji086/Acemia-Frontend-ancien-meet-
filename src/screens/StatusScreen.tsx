import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
  useWindowDimensions,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { Pencil, Camera as CameraIcon, Image as GalleryIcon, Eye, CirclePlus, X } from 'lucide-react-native';
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
  const [statusError, setStatusError] = useState(false);
  const [marketError, setMarketError] = useState(false);
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);

  const styles = createStyles(themeColors, normalize, isDark);

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;
    const baseUrl = SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${path}`;
  };

  const handlePickStatusImage = async (source: 'camera' | 'gallery') => {
    setSourcePickerVisible(false);
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission requise',
          source === 'camera'
            ? 'Autorisez l’accès à la caméra pour prendre une photo.'
            : 'Autorisez l’accès aux photos pour choisir une image.',
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Ouvrir les réglages',
              onPress: () => {
                Linking.openSettings().catch(error => {
                  console.error('Unable to open app settings:', error);
                  Alert.alert('Erreur', 'Impossible d’ouvrir les réglages de l’application.');
                });
              },
            },
          ]
        );
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      const asset = result.assets?.[0];
      if (result.canceled || !asset?.uri) return;

      navigation.navigate('CreateStatus', {
        imageUri: asset.uri,
        imageMimeType: asset.mimeType || undefined,
        imageFileName: asset.fileName || undefined,
      });
    } catch (error) {
      console.error(`Unable to create status image from ${source}:`, error);
      Alert.alert('Erreur', source === 'camera'
        ? 'Impossible d’ouvrir la caméra. Réessayez.'
        : 'Impossible d’ouvrir la galerie. Réessayez.');
    }
  };

  const fetchData = async () => {
    try {
      const user = await apiService.getCurrentUser();
      if (!user?.id) throw new Error('Impossible de récupérer le compte connecté.');
      setCurrentUser(user);

      const response = await apiService.getStatuses();
      if (!response?.success || !Array.isArray(response.data)) {
        throw new Error(response?.error || 'Réponse de statuts invalide.');
      }

      const filtered = response.data.map((item: any) => ({
        ...item,
        statuses: Array.isArray(item.statuses) ? item.statuses : [],
      })).filter((item: any) => item.statuses.length > 0);

      setUserStatuses(filtered.filter((item: any) => String(item.user_id) !== String(user.id)));
      const mine = filtered.find((item: any) => String(item.user_id) === String(user.id));
      setMyStatuses(mine ? mine.statuses : []);
      setStatusError(false);
    } catch (error) {
      console.error('Unable to load statuses:', error);
      setStatusError(true);
    }
    finally { setLoading(false); setRefreshing(false); }
  };

  const fetchMarketFeed = async () => {
    try {
      const res = await apiService.getMarketDiscovery();
      if (!res?.success || !Array.isArray(res.data)) {
        throw new Error(res?.error || 'Réponse du Market invalide.');
      }
      setMarketFeed(res.data);
      setMarketError(false);
    } catch (error) {
      console.error('Unable to load Market discovery:', error);
      setMarketError(true);
    }
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

  const onRefresh = () => { setRefreshing(true); void fetchData(); void fetchMarketFeed(); };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (!Number.isFinite(diff) || diff < 0 || diff < 60) return 'À l’instant';
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
    return 'Hier';
  };

  const renderStatusCard = (item: any, isMine = false) => {
    if (!item) return null;
    const statuses = item.statuses || [];
    const lastStatus = statuses.length > 0 ? statuses[statuses.length - 1] : null;
    const hasUnread = !isMine && statuses.some((status: any) =>
      status.is_viewed !== true && status.is_viewed !== 'true' && status.is_viewed !== 1 && status.is_viewed !== '1'
    );
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
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
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
                onPress={() => setSourcePickerVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Choisir la caméra ou la galerie pour créer un statut photo"
              >
                <CameraIcon size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {statusError && (
            <View style={[styles.loadError, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
              <Text style={{ color: themeColors.text.secondary, flex: 1 }}>Impossible de charger les statuts.</Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => { setLoading(true); void fetchData(); }}
                style={[styles.retryButton, { backgroundColor: themeColors.primary }]}
              >
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          )}

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

          {userStatuses.length === 0 && !statusError && (
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
              <Text style={{ color: themeColors.text.disabled, padding: 20 }}>
                {marketError ? 'Impossible de charger les découvertes.' : 'Aucun pro actif.'}
              </Text>
            )}
          </ScrollView>
          {marketError && (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void fetchMarketFeed()}
              style={[styles.marketRetryButton, { borderColor: themeColors.primary }]}
            >
              <Text style={{ color: themeColors.primary, fontWeight: '700' }}>Réessayer</Text>
            </TouchableOpacity>
          )}

          <View style={styles.footerSpacing} />
        </View>
      </ScrollView>

      <Modal
        visible={sourcePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSourcePickerVisible(false)}
      >
        <View style={styles.sourceModalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer le choix de source"
            style={styles.sourceModalBackdrop}
            onPress={() => setSourcePickerVisible(false)}
          />
          <View style={[styles.sourceSheet, { backgroundColor: themeColors.surface, paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sourceSheetHandle} />
            <View style={styles.sourceSheetHeader}>
              <View style={styles.sourceSheetHeading}>
                <Text style={[styles.sourceSheetTitle, { color: themeColors.text.primary }]}>Ajouter une photo</Text>
                <Text style={[styles.sourceSheetSubtitle, { color: themeColors.text.secondary }]}>Choisissez comment créer votre statut</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                onPress={() => setSourcePickerVisible(false)}
                style={[styles.sourceSheetClose, { backgroundColor: themeColors.background }]}
              >
                <X size={20} color={themeColors.text.secondary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void handlePickStatusImage('camera')}
              style={[styles.sourceOption, { borderColor: themeColors.border }]}
            >
              <View style={[styles.sourceOptionIcon, { backgroundColor: `${themeColors.primary}18` }]}>
                <CameraIcon size={22} color={themeColors.primary} />
              </View>
              <View style={styles.sourceOptionText}>
                <Text style={[styles.sourceOptionTitle, { color: themeColors.text.primary }]}>Prendre une photo</Text>
                <Text style={[styles.sourceOptionDescription, { color: themeColors.text.secondary }]}>Ouvrir la caméra</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void handlePickStatusImage('gallery')}
              style={[styles.sourceOption, { borderColor: themeColors.border }]}
            >
              <View style={[styles.sourceOptionIcon, { backgroundColor: `${themeColors.primary}18` }]}>
                <GalleryIcon size={22} color={themeColors.primary} />
              </View>
              <View style={styles.sourceOptionText}>
                <Text style={[styles.sourceOptionTitle, { color: themeColors.text.primary }]}>Choisir dans la galerie</Text>
                <Text style={[styles.sourceOptionDescription, { color: themeColors.text.secondary }]}>Sélectionner une image</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  loadError: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, marginBottom: 8, padding: 12, borderWidth: 1, borderRadius: 12 },
  retryButton: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18 },
  retryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  marketScroll: { paddingHorizontal: 10, paddingVertical: 15 },
  marketRetryButton: { alignSelf: 'flex-start', marginLeft: 20, marginTop: 2, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderRadius: 18 },
  marketCircleContainer: { alignItems: 'center', width: 90, marginRight: 5 },
  marketCircleRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, padding: 2, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  marketCircleLogo: { width: '100%', height: '100%', borderRadius: 30 },
  marketCircleName: { fontSize: 10, fontWeight: 'bold', marginTop: 5, textAlign: 'center', width: '100%' },
  marketStatBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ff3b30', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
  marketStatBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  footerSpacing: { height: 24 },
  sourceModalRoot: { flex: 1, justifyContent: 'flex-end' },
  sourceModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sourceSheet: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 10, borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 18 },
  sourceSheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#98A2B3', alignSelf: 'center', marginBottom: 18 },
  sourceSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  sourceSheetHeading: { flex: 1, paddingRight: 12 },
  sourceSheetTitle: { fontSize: 18, fontWeight: '800' },
  sourceSheetSubtitle: { fontSize: 13, marginTop: 4 },
  sourceSheetClose: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  sourceOption: { minHeight: 72, flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 16, marginBottom: 10 },
  sourceOptionIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  sourceOptionText: { flex: 1 },
  sourceOptionTitle: { fontSize: 15, fontWeight: '700' },
  sourceOptionDescription: { fontSize: 12, marginTop: 3 }
});
