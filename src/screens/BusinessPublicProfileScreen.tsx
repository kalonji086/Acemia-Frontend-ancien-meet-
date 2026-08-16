import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';
import { SOCKET_URL } from '../utils/constants';

const { width } = Dimensions.get('window');

export default function BusinessPublicProfileScreen({ navigation, route }: any) {
  const { businessId } = route.params;
  const { colors, normalize, isDark, fontSizeFactor } = useTheme();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);

  const styles = createStyles(colors, normalize, fontSizeFactor, isDark);

  useEffect(() => {
    fetchBusinessDetails();
  }, [businessId]);

  const fetchBusinessDetails = async () => {
    try {
      const res = await apiService.getBusinessById(businessId);
      if (res.success) {
        setBusiness(res.data);
        // Charger les annonces du business
        const feedRes = await apiService.getMarketFeed();
        if (feedRes.success) {
          const businessPosts = feedRes.data.filter((p: any) => p.business_id === businessId);
          setPosts(businessPosts);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http')) return url;
    return `${SOCKET_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>;
  if (!business) return <View style={styles.centered}><Text>Business non trouvé</Text></View>;

  const renderPost = ({ item }: any) => (
    <View style={[styles.postCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.postTitle, { color: colors.text.primary }]}>{item.title}</Text>
      <Text style={[styles.postContent, { color: colors.text.secondary }]}>{item.content}</Text>
      {item.images?.[0] && (
        <Image source={{ uri: getFullUrl(item.images[0]) }} style={styles.postImage} />
      )}
      <Text style={styles.postDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: getFullUrl(business.banner_url) || 'https://images.unsplash.com/photo-1557821552-17105176677c' }}
            style={styles.banner}
          />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={[styles.profileSection, { backgroundColor: colors.surface }]}>
          <View style={styles.logoContainer}>
            <Image source={{ uri: getFullUrl(business.logo_url) || `https://ui-avatars.com/api/?name=${business.business_name}` }} style={styles.logo} />
          </View>

          <View style={styles.titleRow}>
            <Text style={[styles.businessName, { color: colors.text.primary }]}>{business.business_name}</Text>
            <Ionicons name="checkmark-circle" size={normalize(22)} color={colors.primary} style={{ marginLeft: 8 }} />
          </View>
          <Text style={[styles.category, { color: colors.primary }]}>{business.category}</Text>

          <View style={styles.badgeRow}>
            <View style={[styles.trustBadge, { backgroundColor: colors.primary + '10' }]}>
              <Text style={[styles.trustText, { color: colors.primary }]}>ID NAT: {business.national_id_number || 'Vérifié'}</Text>
            </View>
          </View>

          <Text style={[styles.shortDesc, { color: colors.text.secondary }]}>{business.short_description}</Text>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>À propos</Text>
          <Text style={[styles.fullDesc, { color: colors.text.secondary }]}>{business.full_description}</Text>

          <Text style={[styles.sectionTitle, { color: colors.text.primary, marginTop: 30 }]}>Annonces & Exploits</Text>
          {posts.length > 0 ? (
            posts.map(post => (
              <React.Fragment key={post.id}>
                {renderPost({ item: post })}
              </React.Fragment>
            ))
          ) : (
            <Text style={{ color: colors.text.disabled, fontStyle: 'italic' }}>Aucune annonce publiée pour le moment.</Text>
          )}

          <Text style={[styles.sectionTitle, { color: colors.text.primary, marginTop: 30 }]}>Contact & Localisation</Text>
          <View style={styles.contactRow}>
            <Ionicons name="location-outline" size={20} color={colors.text.secondary} />
            <Text style={[styles.contactText, { color: colors.text.secondary }]}>
              {business.address_quarter}, {business.address_commune}, {business.address_city}
            </Text>
          </View>
          {business.contact_info && (
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={20} color={colors.text.secondary} />
              <Text style={[styles.contactText, { color: colors.text.secondary }]}>{business.contact_info}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.contactBtn, { backgroundColor: colors.primary }]}
          onPress={() => apiService.createChat([business.user_id]).then(res => res.success && navigation.navigate('Chat', { chatId: res.data.id, name: business.business_name }))}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
          <Text style={styles.contactBtnText}>CONTACTER LE BUSINESS</Text>
        </TouchableOpacity>

        {/* Meet Me Privacy Policy Link */}
        <TouchableOpacity style={styles.privacyBox} onPress={() => navigation.navigate('PrivacyPolicy')}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.text.disabled} />
          <Text style={[styles.privacyText, { color: colors.text.disabled }]}>
            Ce business respecte la Politique de Confidentialité de Meet Me. Cliquez pour en savoir plus sur la protection de vos données.
          </Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: any, normalize: any, factor: number, isDark: boolean) {
  return StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bannerContainer: { height: normalize(200), width: '100%', position: 'relative' },
  banner: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 50, left: 20, width: normalize(40), height: normalize(40), borderRadius: normalize(20), backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  profileSection: { alignItems: 'center', padding: normalize(20), borderBottomLeftRadius: normalize(30), borderBottomRightRadius: normalize(30), marginTop: normalize(-30), elevation: 10 },
  logoContainer: { width: normalize(80), height: normalize(80), borderRadius: normalize(20), borderWidth: 4, borderColor: '#fff', overflow: 'hidden', marginTop: normalize(-60), backgroundColor: '#eee' },
  logo: { width: '100%', height: '100%' },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: normalize(10) },
  businessName: { fontSize: normalize(22, factor), fontWeight: '900' },
  category: { fontSize: normalize(12, factor), fontWeight: 'bold', marginTop: 4, letterSpacing: 1 },
  badgeRow: { marginTop: 12 },
  trustBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  trustText: { fontSize: normalize(10, factor), fontWeight: 'bold' },
  shortDesc: { textAlign: 'center', marginTop: 15, lineHeight: 20, paddingHorizontal: 20, fontSize: normalize(14, factor) },
  contentSection: { padding: normalize(25) },
  sectionTitle: { fontSize: normalize(18, factor), fontWeight: 'bold', marginBottom: 15 },
  fullDesc: { lineHeight: 22, fontSize: normalize(15, factor) },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  contactText: { marginLeft: 10, fontSize: normalize(14, factor) },
  contactBtn: { margin: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: normalize(18), borderRadius: 20, elevation: 5 },
  contactBtnText: { color: '#fff', fontWeight: '900', marginLeft: 12, fontSize: normalize(15, factor) },
  postCard: { width: '100%', padding: normalize(20), borderRadius: 20, marginBottom: 15, elevation: 1 },
  postTitle: { fontSize: normalize(16, factor), fontWeight: 'bold', marginBottom: 8 },
  postContent: { fontSize: normalize(14, factor), lineHeight: 20, marginBottom: 12 },
  postImage: { width: '100%', height: normalize(150), borderRadius: 12, marginBottom: 12 },
  postDate: { fontSize: normalize(10, factor), color: '#999', textAlign: 'right' },
  privacyBox: { padding: normalize(30), alignItems: 'center', flexDirection: 'row' },
  privacyText: { flex: 1, marginLeft: 10, fontSize: normalize(11, factor), textAlign: 'center' }
});
}
