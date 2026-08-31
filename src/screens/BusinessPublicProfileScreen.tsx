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
  TextInput,
  Alert,
  Modal,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import { SOCKET_URL } from '../utils/constants';

const { width, height } = Dimensions.get('window');

export default function BusinessPublicProfileScreen({ navigation, route }: any) {
  const { businessId } = route.params;
  const { colors, normalize, isDark, fontSizeFactor } = useTheme();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  // Modals & Viewer States
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const styles = createStyles(colors, normalize, fontSizeFactor, isDark);

  useEffect(() => {
    fetchBusinessDetails();

    const handlePostUpdate = (data: any) => {
       setPosts(current => current.map(p => {
         if (p.id === data.postId) {
           return { ...p, likes_count: (p.likes_count || 0) + (data.likesCount || 0) };
         }
         return p;
       }));
    };

    socketService.on('market:post_update', handlePostUpdate);
    return () => { socketService.off('market:post_update', handlePostUpdate); };
  }, [businessId]);

  const fetchBusinessDetails = async () => {
    try {
      const res = await apiService.getBusinessById(businessId);
      if (res.success) {
        setBusiness(res.data);
        setIsSubscribed(res.data.is_subscribed);
        setFollowersCount(parseInt(res.data.followers_count || 0));

        const feedRes = await apiService.getMarketFeed();
        if (feedRes.success) {
          const businessPosts = feedRes.data.filter((p: any) => p.business_id === businessId);
          setPosts(businessPosts);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleToggleSubscription = async () => {
    try {
      const res: any = await apiService.toggleMarketSubscription(businessId);
      if (res.success) {
        setIsSubscribed(res.subscribed);
        setFollowersCount((prev: number) => res.subscribed ? prev + 1 : prev - 1);
      }
    } catch (e) { Alert.alert('Erreur', 'Impossible de s\'abonner'); }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const res: any = await apiService.toggleMarketLike(postId);
      if (res.success) {
        setPosts(current => current.map(p => {
          if (p.id === postId) {
            const currentLikes = parseInt(p.likes_count || 0);
            return {
              ...p,
              is_liked: res.liked,
              likes_count: res.liked ? currentLikes + 1 : Math.max(0, currentLikes - 1)
            };
          }
          return p;
        }));
      }
    } catch (e) { console.error(e); }
  };

  const openComments = async (postId: string) => {
    setSelectedPostId(postId);
    setShowCommentsModal(true);
    setLoadingComments(true);
    try {
      const res = await apiService.getMarketComments(postId);
      if (res.success) setComments(res.data);
    } catch (e) { console.error(e); }
    finally { setLoadingComments(false); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPostId) return;
    try {
      const res = await apiService.addMarketComment(selectedPostId, newComment);
      if (res.success) {
        setComments(prev => [...prev, { ...res.data, full_name: 'Moi' }]); // Optimiste
        setNewComment('');
        // Mettre à jour le compteur dans la liste principale
        setPosts(current => current.map(p => {
          if (p.id === selectedPostId) return { ...p, comments_count: parseInt(p.comments_count || 0) + 1 };
          return p;
        }));
      }
    } catch (e) { Alert.alert('Erreur', 'Impossible de commenter'); }
  };

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;
    return `${SOCKET_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>;
  if (!business) return <View style={styles.centered}><Text>Business non trouvé</Text></View>;

  const renderPost = ({ item }: any) => (
    <View style={[styles.postCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.postTitle, { color: colors.text.primary }]}>{item.title}</Text>
      <Text style={[styles.postContent, { color: colors.text.secondary }]}>{item.content}</Text>

      {item.images && item.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {item.images.map((img: string, idx: number) => (
            <TouchableOpacity key={idx} onPress={() => setSelectedImage(getFullUrl(img))}>
              <Image source={{ uri: getFullUrl(img) || '' }} style={styles.postImage} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionItem} onPress={() => handleLikePost(item.id)}>
          <Ionicons name={item.is_liked ? "heart" : "heart-outline"} size={22} color={item.is_liked ? "#ff3b30" : colors.text.secondary} />
          <Text style={[styles.actionText, { color: colors.text.secondary }]}>{item.likes_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={() => openComments(item.id)}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.text.secondary} />
          <Text style={[styles.actionText, { color: colors.text.secondary }]}>{item.comments_count || 0}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.postDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.bannerContainer}>
          <Image source={{ uri: getFullUrl(business.banner_url) || 'https://images.unsplash.com/photo-1557821552-17105176677c' }} style={styles.banner} />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        </View>

        <View style={[styles.profileSection, { backgroundColor: colors.surface }]}>
          <View style={styles.logoContainer}><Image source={{ uri: getFullUrl(business.logo_url) || `https://ui-avatars.com/api/?name=${business.business_name}` }} style={styles.logo} /></View>
          <View style={styles.titleRow}>
            <Text style={[styles.businessName, { color: colors.text.primary }]}>{business.business_name}</Text>
            <Ionicons name="checkmark-circle" size={normalize(22)} color={colors.primary} style={{ marginLeft: 8 }} />
          </View>
          <Text style={[styles.category, { color: colors.primary }]}>{business.category}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statInfo}><Text style={[styles.statValue, { color: colors.text.primary }]}>{followersCount}</Text><Text style={[styles.statLabel, { color: colors.text.secondary }]}>Abonnés</Text></View>
            <View style={styles.statDivider} /><View style={styles.statInfo}><Text style={[styles.statValue, { color: colors.text.primary }]}>{posts.length}</Text><Text style={[styles.statLabel, { color: colors.text.secondary }]}>Annonces</Text></View>
          </View>
          <TouchableOpacity style={[styles.subscribeBtn, { backgroundColor: isSubscribed ? colors.surface : colors.primary, borderColor: colors.primary, borderWidth: 1 }]} onPress={handleToggleSubscription}>
            <Text style={[styles.subscribeBtnText, { color: isSubscribed ? colors.primary : "#fff" }]}>{isSubscribed ? "ABONNÉ" : "S'ABONNER"}</Text>
          </TouchableOpacity>
          <Text style={[styles.shortDesc, { color: colors.text.secondary }]}>{business.short_description}</Text>
        </View>

        <View style={styles.contentSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>À propos</Text>
          <Text style={[styles.fullDesc, { color: colors.text.secondary }]}>{business.full_description}</Text>
          <Text style={[styles.sectionTitle, { color: colors.text.primary, marginTop: 30 }]}>Annonces & Exploits</Text>
          {posts.length > 0 ? posts.map(post => (<React.Fragment key={post.id}>{renderPost({ item: post })}</React.Fragment>)) : (<Text style={{ color: colors.text.disabled, fontStyle: 'italic', textAlign: 'center', marginTop: 20 }}>Aucune annonce publiée.</Text>)}
          <Text style={[styles.sectionTitle, { color: colors.text.primary, marginTop: 30 }]}>Contact & Localisation</Text>
          <View style={styles.contactRow}><Ionicons name="location-outline" size={20} color={colors.text.secondary} /><Text style={[styles.contactText, { color: colors.text.secondary }]}>{business.address_quarter}, {business.address_commune}, {business.address_city}</Text></View>
        </View>

        <TouchableOpacity style={[styles.contactBtn, { backgroundColor: colors.primary }]} onPress={() => apiService.createChat([business.user_id]).then(res => res.success && navigation.navigate('Chat', { chatId: res.data.id, name: business.business_name }))}>
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" /><Text style={styles.contactBtnText}>CONTACTER LE BUSINESS</Text>
        </TouchableOpacity>

        <View style={styles.darkFooter}>
          <View style={styles.socialRow}>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.facebook.com/people/TOGETHE-Tech/61589824992529/')}><Ionicons name="logo-facebook" size={24} color="#fff" /></TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://wa.me/243975186643')}><Ionicons name="logo-whatsapp" size={24} color="#fff" /></TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.linkedin.com/company/together-tech-solutions')}><Ionicons name="logo-linkedin" size={24} color="#fff" /></TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}><Text style={styles.footerLinkText}>Politique de confidentialité</Text></TouchableOpacity>
          <Text style={styles.copyrightText}>© 2026 Meet Me - TOGETHE Tech Solutions</Text>
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Comments Modal */}
      <Modal visible={showCommentsModal} transparent animationType="slide" onRequestClose={() => setShowCommentsModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.commentContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Commentaires</Text>
              <TouchableOpacity onPress={() => setShowCommentsModal(false)}><Ionicons name="close" size={24} color="#000" /></TouchableOpacity>
            </View>

            {loadingComments ? <ActivityIndicator style={{ flex: 1 }} color={colors.primary} /> : (
              <FlatList
                data={comments}
                keyExtractor={item => item.id}
                renderItem={({item}) => (
                  <View style={styles.commentItem}>
                    <Image source={{ uri: getFullUrl(item.avatar_url) || `https://ui-avatars.com/api/?name=${item.full_name}` }} style={styles.commentAvatar} />
                    <View style={styles.commentTextContainer}>
                      <Text style={styles.commentName}>{item.full_name}</Text>
                      <Text style={styles.commentBody}>{item.content}</Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyMsg}>Soyez le premier à commenter !</Text>}
              />
            )}

            <View style={styles.commentInputRow}>
              <TextInput style={styles.commentInput} placeholder="Votre commentaire..." value={newComment} onChangeText={setNewComment} multiline />
              <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={handleAddComment}>
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedImage(null)}><Ionicons name="close" size={30} color="#fff" /></TouchableOpacity>
          {selectedImage && <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: any, normalize: any, factor: number, isDark: boolean) {
  return StyleSheet.create({
  container: { flex: 1 }, centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bannerContainer: { height: normalize(200), width: '100%', position: 'relative' }, banner: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 50, left: 20, width: normalize(40), height: normalize(40), borderRadius: normalize(20), backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  profileSection: { alignItems: 'center', padding: normalize(20), borderBottomLeftRadius: normalize(30), borderBottomRightRadius: normalize(30), marginTop: normalize(-30), elevation: 10 },
  logoContainer: { width: normalize(80), height: normalize(80), borderRadius: normalize(20), borderWidth: 4, borderColor: '#fff', overflow: 'hidden', marginTop: normalize(-60), backgroundColor: '#eee' }, logo: { width: '100%', height: '100%' },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: normalize(10) }, businessName: { fontSize: normalize(22, factor), fontWeight: '900' }, category: { fontSize: normalize(12, factor), fontWeight: 'bold', marginTop: 4, letterSpacing: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, width: '80%', justifyContent: 'center' }, statInfo: { alignItems: 'center', flex: 1 }, statValue: { fontSize: 18, fontWeight: 'bold' }, statLabel: { fontSize: 11 }, statDivider: { width: 1, height: 30, backgroundColor: '#ddd', marginHorizontal: 20 },
  subscribeBtn: { marginTop: 25, paddingHorizontal: 40, paddingVertical: 12, borderRadius: 30, elevation: 2 }, subscribeBtnText: { fontWeight: 'bold', fontSize: 13 },
  shortDesc: { textAlign: 'center', marginTop: 20, lineHeight: 20, paddingHorizontal: 20, fontSize: normalize(14, factor) },
  contentSection: { padding: normalize(25) }, sectionTitle: { fontSize: normalize(18, factor), fontWeight: 'bold', marginBottom: 15 }, fullDesc: { lineHeight: 22, fontSize: normalize(15, factor) },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 }, contactText: { marginLeft: 10, fontSize: normalize(14, factor) },
  contactBtn: { margin: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: normalize(18), borderRadius: 20, elevation: 5 }, contactBtnText: { color: '#fff', fontWeight: '900', marginLeft: 12, fontSize: normalize(15, factor) },
  postCard: { width: '100%', padding: normalize(20), borderRadius: 20, marginBottom: 15, elevation: 1 }, postTitle: { fontSize: normalize(16, factor), fontWeight: 'bold', marginBottom: 8 }, postContent: { fontSize: normalize(14, factor), lineHeight: 20, marginBottom: 12 }, postImage: { width: normalize(280), height: normalize(160), borderRadius: 12, marginRight: 10 },
  postActions: { flexDirection: 'row', marginTop: 15, borderTopWidth: 0.5, borderTopColor: '#eee', paddingTop: 12 }, actionItem: { flexDirection: 'row', alignItems: 'center', marginRight: 25 }, actionText: { marginLeft: 8, fontSize: 12, fontWeight: '600' },
  postDate: { fontSize: normalize(10, factor), color: '#999', textAlign: 'right', marginTop: 10 },
  darkFooter: { backgroundColor: '#111', padding: 30, alignItems: 'center', marginTop: 20 }, socialRow: { flexDirection: 'row', gap: 25, marginBottom: 20 }, footerLinkText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textDecorationLine: 'underline', marginBottom: 15 }, copyrightText: { color: '#555', fontSize: 10 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }, modalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }, fullImage: { width: '100%', height: '80%' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  commentContent: { height: height * 0.7, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  commentItem: { flexDirection: 'row', marginBottom: 15 },
  commentAvatar: { width: 35, height: 35, borderRadius: 17.5, marginRight: 12 },
  commentTextContainer: { flex: 1, backgroundColor: '#f0f2f5', padding: 12, borderRadius: 15 },
  commentName: { fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
  commentBody: { fontSize: 14, color: '#333' },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
  commentInput: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  emptyMsg: { textAlign: 'center', color: '#999', marginTop: 30 },
});
}
