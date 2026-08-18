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
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';
import { SOCKET_URL } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import SocketService from '../services/socket.service';

export default function StatusScreen() {
  const { colors: themeColors, isDark, normalize } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const [userStatuses, setUserStatuses] = useState<any[]>([]);
  const [myStatuses, setMyStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [marketFeed, setMarketFeed] = useState<any[]>([]);

  // Image Viewer State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const styles = createStyles(themeColors, normalize, isDark);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription.remove();
  }, []);

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
            const { status } = await Camera.requestCameraPermissionsAsync();
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
      const res = await apiService.getMarketFeed();
      if (res && res.success) {
        const uniqueBusinesses = [];
        const seen = new Set();
        for (const item of (res.data || [])) {
          if (!seen.has(item.business_id)) {
            seen.add(item.business_id);
            uniqueBusinesses.push(item);
          }
        }
        setMarketFeed(uniqueBusinesses);
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

  const renderStatusCard = (item: any, isMine = false) => {
    if (!item) return null;
    const lastStatus = item.statuses && item.statuses.length > 0 ? item.statuses[item.statuses.length - 1] : null;
    const hasUnread = !isMine && item.statuses?.some((s: any) => !s.is_viewed);
    const cardWidth = screenWidth > 600 ? (screenWidth - 60) / 4 : normalize(110);
    const cardHeight = screenWidth > 600 ? cardWidth * 1.5 : normalize(170);

    return (
      <TouchableOpacity
        key={item.user_id || 'mine'}
        style={[styles.squareCard, { width: cardWidth, height: cardHeight }]}
        onPress={() => isMine && (!item.statuses || item.statuses.length === 0) ? navigation.navigate('CreateStatus') : navigation.navigate('ViewStatus', { userStatus: item })}
      >
        <View style={[styles.cardBg, { backgroundColor: isDark ? '#333' : '#e1e1e1', borderRadius: 12, overflow: 'hidden' }]}>
          {lastStatus?.type === 'image' ? (
            <Image source={{ uri: getFullUrl(lastStatus.media_url) || '' }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : lastStatus?.type === 'text' ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: lastStatus.background_color || themeColors.primary, justifyContent: 'center', alignItems: 'center', padding: 10 }]}>
              <Text style={styles.previewText} numberOfLines={4}>{lastStatus.content}</Text>
            </View>
          ) : (
            <Image source={{ uri: getFullUrl(item.avatar_url) || `https://ui-avatars.com/api/?name=${item.full_name || 'User'}&background=random` }} style={[StyleSheet.absoluteFill, { opacity: 0.5 }]} resizeMode="cover" />
          )}

          <View style={styles.cardOverlay}>
            <View style={[styles.cardAvatarContainer, { borderColor: hasUnread ? themeColors.primary : 'rgba(255,255,255,0.5)', borderWidth: item.statuses?.length > 0 ? 2.5 : 0 }]}>
              <Image source={{ uri: getFullUrl(item.avatar_url) || `https://ui-avatars.com/api/?name=${item.full_name || 'Me'}&background=random` }} style={styles.cardAvatar} />
              {isMine && (!item.statuses || item.statuses.length === 0) && (
                <View style={[styles.addIconSmall, { backgroundColor: themeColors.primary }]}><Ionicons name="add" size={12} color="#fff" /></View>
              )}
            </View>
            <Text style={styles.cardUserName} numberOfLines={1}>{isMine ? 'Mon statut' : (item.full_name || 'Utilisateur')}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMarketCircle = (item: any) => {
    if (!item) return null;
    return (
      <TouchableOpacity
        key={item.business_id}
        style={styles.marketCircleContainer}
        onPress={() => navigation.navigate('BusinessPublicProfile', { businessId: item.business_id })}
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
        <View style={styles.marketCommentRow}>
          <Ionicons name="chatbubble-outline" size={10} color={themeColors.text.secondary} />
          <Text style={[styles.marketCommentText, { color: themeColors.text.secondary }]}>{item.comments_count || 0}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const insets = useSafeAreaInsets();

  if (loading && !refreshing) return <View style={styles.centered}><ActivityIndicator size="large" color={themeColors.primary} /></View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={{ height: insets.top, backgroundColor: themeColors.primary }} />
      <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[themeColors.primary]} />}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.statusSection}>
            <Text style={[styles.sectionTitleMain, { color: themeColors.text.primary }]}>Statuts</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {renderStatusCard({ user_id: currentUser?.id, full_name: 'Moi', statuses: myStatuses, avatar_url: currentUser?.avatar }, true)}
              {userStatuses.map((item) => renderStatusCard(item))}
              {userStatuses.length === 0 && !loading && (
                <View style={styles.emptyCardPlaceholder}><Text style={styles.emptyCardText}>Aucun autre statut</Text></View>
              )}
            </ScrollView>
          </View>

          <View style={[styles.sectionHeader, { backgroundColor: isDark ? '#333' : '#F0F2F5', marginTop: 30 }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>Découvertes Market</Text>
          </View>

          <View style={styles.marketGrid}>
            {marketFeed.length > 0 ? (
               marketFeed.map((item) => renderMarketCircle(item))
            ) : (
              <View style={styles.emptyContainer}><Text style={{ color: themeColors.text.disabled }}>Aucun pro actif.</Text></View>
            )}
          </View>
        </View>

        <View style={styles.darkFooter}>
          <View style={styles.socialRow}>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.facebook.com/people/TOGETHE-Tech/61589824992529/')}><Ionicons name="logo-facebook" size={24} color="#fff" /></TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://wa.me/243975186643')}><Ionicons name="logo-whatsapp" size={24} color="#fff" /></TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.linkedin.com/company/together-tech-solutions')}><Ionicons name="logo-linkedin" size={24} color="#fff" /></TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}><Text style={styles.footerLinkText}>Politique de confidentialité</Text></TouchableOpacity>
          <Text style={styles.copyrightText}>© 2026 Meet Me - TOGETHE Tech Solutions</Text>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fabEdit} onPress={() => navigation.navigate('CreateStatus')}><Ionicons name="pencil" size={normalize(20)} color="#455A64" /></TouchableOpacity>
      <TouchableOpacity style={[styles.fabCamera, { backgroundColor: themeColors.primary }]} onPress={handlePickStatusImage}>
        <Ionicons name="camera" size={normalize(24)} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, normalize: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusSection: { paddingVertical: 15 },
  sectionTitleMain: { fontSize: normalize(20), fontWeight: 'bold', marginLeft: 15, marginBottom: 15 },
  horizontalScroll: { paddingLeft: 15, paddingRight: 15 },
  squareCard: { width: normalize(110), height: normalize(170), marginRight: 10, borderRadius: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardBg: { flex: 1 },
  cardOverlay: { ...StyleSheet.absoluteFillObject, padding: 10, justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.15)' },
  cardAvatarContainer: { width: normalize(34), height: normalize(34), borderRadius: normalize(17), padding: 2, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  cardAvatar: { width: '100%', height: '100%', borderRadius: normalize(15) },
  cardUserName: { color: '#fff', fontSize: normalize(12), fontWeight: 'bold', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 5 },
  addIconSmall: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fff' },
  previewText: { color: '#fff', fontSize: normalize(10), textAlign: 'center', fontWeight: '500' },
  emptyCardPlaceholder: { width: normalize(110), height: normalize(170), borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.text.disabled, justifyContent: 'center', alignItems: 'center', padding: 10, marginBottom: 10 },
  emptyCardText: { color: colors.text.disabled, fontSize: normalize(10), textAlign: 'center' },
  sectionHeader: { paddingHorizontal: 15, paddingVertical: 10 },
  sectionTitle: { fontSize: normalize(14), fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 20 },
  fabCamera: { position: 'absolute', bottom: normalize(25), right: normalize(20), width: normalize(56), height: normalize(56), borderRadius: normalize(28), justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  fabEdit: { position: 'absolute', bottom: normalize(100), right: normalize(25), width: normalize(46), height: normalize(46), borderRadius: normalize(23), backgroundColor: isDark ? '#444' : '#e9edef', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41 },
  marketGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 15, justifyContent: 'flex-start' },
  marketCircleContainer: { alignItems: 'center', width: '25%', marginBottom: 20 },
  marketCircleRing: { width: normalize(64), height: normalize(64), borderRadius: normalize(32), borderWidth: 2, padding: 2, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  marketCircleLogo: { width: '100%', height: '100%', borderRadius: normalize(30) },
  marketCircleName: { fontSize: normalize(10), fontWeight: 'bold', marginTop: 5, textAlign: 'center', width: '90%' },
  marketStatBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ff3b30', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
  marketStatBadgeText: { color: '#fff', fontSize: 8, fontWeight: 'black' },
  marketCommentRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  marketCommentText: { fontSize: 8, marginLeft: 3, fontWeight: 'bold' },
  darkFooter: { backgroundColor: '#111', padding: 30, alignItems: 'center', marginTop: 'auto' },
  socialRow: { flexDirection: 'row', gap: 25, marginBottom: 20 },
  footerLinkText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textDecorationLine: 'underline', marginBottom: 15 },
  copyrightText: { color: '#555', fontSize: 10 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  modalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
  fullImage: { width: '100%', height: '80%' }
});
