import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  useWindowDimensions,
  FlatList,
  TextInput,
  Alert,
  Modal,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import { SOCKET_URL } from '../utils/constants';

export default function BusinessPublicProfileScreen({ navigation, route }: any) {
  const { businessId } = route.params;
  const { colors, normalize, isDark, fontSizeFactor } = useTheme();
  const { height } = useWindowDimensions();
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

  const styles = createStyles(colors, normalize, fontSizeFactor, isDark, height);

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

  const openMarketConversation = async () => {
    const response = await apiService.createMarketConversation(businessId);
    if (!response.success) {
      Alert.alert('Discussion Market', response.error || 'Impossible de démarrer la discussion.');
      return;
    }
    navigation.navigate('MarketChat', {
      conversationId: response.data.id,
      name: business.business_name,
      avatarUrl: business.logo_url
    });
  };

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;
    return `${SOCKET_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>;
  if (!business) return <View style={styles.centered}><Text>Business non trouvé</Text></View>;

  const renderPost = ({ item }: any) => (
    <View style={[styles.postCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.postAuthorRow}>
        <Image source={{ uri: getFullUrl(business.logo_url) || `https://ui-avatars.com/api/?name=${business.business_name}` }} style={styles.postAuthorAvatar} />
        <View style={styles.postAuthorInfo}>
          <Text style={[styles.postAuthorName, { color: colors.text.primary }]} numberOfLines={1}>{business.business_name}</Text>
          <Text style={[styles.postDate, { color: colors.text.disabled }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.text.secondary} />
      </View>
      <Text style={[styles.postTitle, { color: colors.text.primary }]}>{item.title}</Text>
      <Text style={[styles.postContent, { color: colors.text.primary }]}>{item.content}</Text>

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
        <TouchableOpacity style={styles.actionItem} onPress={() => handleLikePost(item.id)} accessibilityRole="button" accessibilityLabel={`J’aime, ${item.likes_count || 0} réactions`}>
          <Ionicons name={item.is_liked ? "heart" : "heart-outline"} size={22} color={item.is_liked ? "#ff3b30" : colors.text.secondary} />
        <Text style={[styles.actionText, { color: colors.text.secondary }]}>J’aime · {item.likes_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={() => openComments(item.id)} accessibilityRole="button" accessibilityLabel={`Commenter, ${item.comments_count || 0} commentaires`}>
        <Ionicons name="chatbubble-outline" size={20} color={colors.text.secondary} />
        <Text style={[styles.actionText, { color: colors.text.secondary }]}>Commenter · {item.comments_count || 0}</Text>
        </TouchableOpacity>
      </View>
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
          <View style={styles.profileActions}>
            <TouchableOpacity style={[styles.subscribeBtn, { backgroundColor: isSubscribed ? colors.surface : colors.primary, borderColor: colors.primary, borderWidth: 1 }]} onPress={handleToggleSubscription} accessibilityRole="button">
              <Ionicons name={isSubscribed ? 'checkmark' : 'person-add-outline'} size={18} color={isSubscribed ? colors.primary : '#fff'} />
              <Text style={[styles.subscribeBtnText, { color: isSubscribed ? colors.primary : "#fff" }]}>{isSubscribed ? "ABONNÉ" : "S'ABONNER"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.profileMessageBtn, { backgroundColor: colors.primary + '14' }]} onPress={openMarketConversation} accessibilityRole="button">
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
              <Text style={[styles.profileMessageText, { color: colors.primary }]}>Message</Text>
            </TouchableOpacity>
          </View>
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

        <View style={[styles.brandFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.socialRow}>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.facebook.com/people/TOGETHE-Tech/61589824992529/')} accessibilityLabel="Facebook"><Ionicons name="logo-facebook" size={22} color={colors.text.secondary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://wa.me/243975186643')} accessibilityLabel="WhatsApp"><Ionicons name="logo-whatsapp" size={22} color={colors.text.secondary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.linkedin.com/company/together-tech-solutions')} accessibilityLabel="LinkedIn"><Ionicons name="logo-linkedin" size={22} color={colors.text.secondary} /></TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}><Text style={[styles.footerLinkText, { color: colors.text.secondary }]}>Politique de confidentialité</Text></TouchableOpacity>
          <Text style={[styles.copyrightText, { color: colors.text.disabled }]}>© 2026 Acemia</Text>
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Comments Modal */}
      <Modal visible={showCommentsModal} transparent animationType="slide" onRequestClose={() => setShowCommentsModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.commentContent, { backgroundColor: colors.surface, height: height * 0.78 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Commentaires</Text>
                <Text style={[styles.modalSubtitle, { color: colors.text.secondary }]}>{comments.length} commentaire{comments.length === 1 ? '' : 's'}</Text>
              </View>
              <TouchableOpacity style={[styles.modalCloseButton, { backgroundColor: colors.background }]} onPress={() => setShowCommentsModal(false)} accessibilityLabel="Fermer les commentaires"><Ionicons name="close" size={22} color={colors.text.primary} /></TouchableOpacity>
            </View>

            {loadingComments ? <ActivityIndicator style={{ flex: 1 }} color={colors.primary} /> : (
              <FlatList
                data={comments}
                keyExtractor={item => item.id}
                renderItem={({item}) => (
                  <View style={styles.commentItem}>
                    <Image source={{ uri: getFullUrl(item.avatar_url) || `https://ui-avatars.com/api/?name=${item.full_name}` }} style={styles.commentAvatar} />
                    <View style={[styles.commentTextContainer, { backgroundColor: isDark ? '#252b36' : '#f0f2f5' }]}>
                      <Text style={[styles.commentName, { color: colors.text.primary }]}>{item.full_name}</Text>
                      <Text style={[styles.commentBody, { color: colors.text.primary }]}>{item.content}</Text>
                    </View>
                  </View>
                )}
                contentContainerStyle={comments.length === 0 ? styles.commentEmptyContent : styles.commentList}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={<Text style={[styles.emptyMsg, { color: colors.text.secondary }]}>Pas encore de commentaire. Lancez la conversation !</Text>}
              />
            )}

            <View style={[styles.commentInputRow, { borderTopColor: colors.border }]}>
              <TextInput style={[styles.commentInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text.primary }]} placeholder="Écrire un commentaire…" placeholderTextColor={colors.text.disabled} value={newComment} onChangeText={setNewComment} multiline />
              <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: newComment.trim() ? 1 : 0.55 }]} onPress={handleAddComment} disabled={!newComment.trim()} accessibilityLabel="Envoyer le commentaire">
                <Ionicons name="send" size={18} color="#fff" />
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

function createStyles(colors: any, normalize: any, factor: number, isDark: boolean, height: number) {
  return StyleSheet.create({
  container: { flex: 1 }, centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bannerContainer: { height: normalize(200), width: '100%', position: 'relative' }, banner: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 50, left: 20, width: normalize(40), height: normalize(40), borderRadius: normalize(20), backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  profileSection: { alignItems: 'center', paddingHorizontal: normalize(20), paddingTop: normalize(8), paddingBottom: normalize(20), borderBottomLeftRadius: normalize(24), borderBottomRightRadius: normalize(24), marginTop: normalize(-24), elevation: 5 },
  logoContainer: { width: normalize(86), height: normalize(86), borderRadius: normalize(24), borderWidth: 4, borderColor: colors.surface, overflow: 'hidden', marginTop: normalize(-58), backgroundColor: colors.background }, logo: { width: '100%', height: '100%' },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: normalize(10) }, businessName: { fontSize: normalize(22, factor), fontWeight: '900' }, category: { fontSize: normalize(12, factor), fontWeight: '800', marginTop: 4, letterSpacing: 0.8 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, width: '100%', maxWidth: 320, justifyContent: 'center' }, statInfo: { alignItems: 'center', flex: 1 }, statValue: { fontSize: 18, fontWeight: '800' }, statLabel: { fontSize: 11 }, statDivider: { width: 1, height: 30, backgroundColor: colors.border, marginHorizontal: 20 },
  profileActions: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 18 },
  subscribeBtn: { minHeight: 46, flex: 1, maxWidth: 210, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, borderRadius: 14 },
  subscribeBtnText: { fontWeight: '800', fontSize: 13 },
  profileMessageBtn: { minHeight: 46, flex: 1, maxWidth: 150, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, borderRadius: 14 },
  profileMessageText: { fontWeight: '800', fontSize: 13 },
  shortDesc: { textAlign: 'center', marginTop: 20, lineHeight: 20, paddingHorizontal: 20, fontSize: normalize(14, factor) },
  contentSection: { padding: normalize(16), width: '100%', maxWidth: 760, alignSelf: 'center' }, sectionTitle: { fontSize: normalize(18, factor), fontWeight: '800', marginBottom: 15 }, fullDesc: { lineHeight: 22, fontSize: normalize(15, factor) },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 }, contactText: { marginLeft: 10, fontSize: normalize(14, factor) },
  postCard: { width: '100%', padding: normalize(16), borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, marginBottom: 14, elevation: 1 }, postAuthorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 }, postAuthorAvatar: { width: 42, height: 42, borderRadius: 21, marginRight: 10, backgroundColor: colors.background }, postAuthorInfo: { flex: 1 }, postAuthorName: { fontSize: 13, fontWeight: '800' }, postTitle: { fontSize: normalize(16, factor), fontWeight: '800', marginBottom: 7 }, postContent: { fontSize: normalize(14, factor), lineHeight: 21, marginBottom: 10 }, postImage: { width: normalize(280), height: normalize(180), borderRadius: 12, marginRight: 10 },
  postActions: { flexDirection: 'row', marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 12, justifyContent: 'space-around' }, actionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 42, flex: 1, gap: 7, borderRadius: 10 }, actionText: { fontSize: 12, fontWeight: '700' },
  postDate: { fontSize: normalize(10, factor), marginTop: 3 },
  brandFooter: { borderTopWidth: StyleSheet.hairlineWidth, padding: 22, alignItems: 'center', marginTop: 12 }, socialRow: { flexDirection: 'row', gap: 25, marginBottom: 14 }, footerLinkText: { fontSize: 12, fontWeight: '700', textDecorationLine: 'underline', marginBottom: 10 }, copyrightText: { fontSize: 10 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }, modalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }, fullImage: { width: '100%', height: '80%' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  commentContent: { maxHeight: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 24 : 14, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalSubtitle: { fontSize: 11, marginTop: 3 },
  modalCloseButton: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  commentList: { paddingVertical: 8 },
  commentEmptyContent: { flexGrow: 1, justifyContent: 'center' },
  commentItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, paddingHorizontal: 2 },
  commentAvatar: { width: 38, height: 38, borderRadius: 19, marginRight: 9, backgroundColor: colors.background },
  commentTextContainer: { flex: 1, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 18, borderTopLeftRadius: 6 },
  commentName: { fontWeight: '800', fontSize: 12, marginBottom: 4 },
  commentBody: { fontSize: 14, lineHeight: 20 },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 9 },
  commentInput: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100, fontSize: 14 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  emptyMsg: { textAlign: 'center', marginTop: 30, fontSize: 14, lineHeight: 21, paddingHorizontal: 24 },
});
}
