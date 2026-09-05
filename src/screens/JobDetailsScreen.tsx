import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, ActivityIndicator, Alert,
  TextInput, KeyboardAvoidingView, Platform, FlatList,
  useWindowDimensions
} from 'react-native';
import {
  ArrowLeft, MapPin, Briefcase, DollarSign, Clock,
  Send, MessageCircle, Building2, CheckCircle2, User
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import { useLanguage } from '../context/LanguageContext';

export default function JobDetailsScreen({ navigation, route }: any) {
  const { jobId } = route.params;
  const { colors, normalize, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    fetchJobDetails();

    const onNewComment = (newComment: any) => {
      setComments(prev => {
        if (prev.some(c => c.id === newComment.id)) return prev;
        return [newComment, ...prev];
      });
    };

    socketService.on(`job:new_comment:${jobId}`, onNewComment);

    return () => {
      socketService.off(`job:new_comment:${jobId}`, onNewComment);
    };
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const response = await apiService.getJobById(jobId);
      if (response.success) {
        setJob(response.data);

        // Fetch comments
        const commentsRes = await apiService.getJobComments(jobId);
        if (commentsRes.success) setComments(commentsRes.data);
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger les détails.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http')) return url;
    return `https://meet-me-backend-sg5c.onrender.com${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleContactEmployer = async () => {
    try {
      // Créer ou obtenir une discussion privée avec l'employeur
      const employerUserId = job.employer_user_id || job.employerId || null;
      if (!employerUserId) {
        Alert.alert('Information', 'Impossible de contacter cet employeur pour le moment.');
        return;
      }
      
      // Sauvegarder l'état actuel pour pouvoir revenir
      const currentJobId = jobId;
      const currentJobTitle = job.title;
      
      const res = await apiService.createChat([employerUserId]);
      if (res.success) {
        // Naviguer vers le chat avec possibilité de revenir
        navigation.navigate('Chat', {
          chatId: res.data.id,
          name: job.company_name || job.company || 'Employeur',
          peerUserId: employerUserId,
          // Ajouter des métadonnées pour le retour
          returnTo: 'JobDetails',
          returnParams: { jobId: currentJobId },
          returnTitle: `Retour à: ${currentJobTitle}`
        });
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de démarrer la discussion.');
    }
  };

  const handlePostComment = async () => {
    if (!comment.trim()) return;
    setSendingComment(true);
    try {
      const response = await apiService.addJobComment(jobId, comment);
      if (response.success) {
        setComments([response.data, ...comments]);
        setComment('');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de publier le commentaire.');
    } finally {
      setSendingComment(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={[styles.header, { backgroundColor: colors.surface, paddingHorizontal: isTablet ? '5%' : 15 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: normalize(18) }]}>Détails de l'offre</Text>
          <TouchableOpacity onPress={handleContactEmployer}>
            <MessageCircle size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={isTablet && { paddingHorizontal: '15%' }}>
          <View style={[styles.mainInfo, { backgroundColor: colors.surface }]}>
            <View style={[styles.logoContainer, { backgroundColor: colors.background, width: normalize(80), height: normalize(80) }]}>
              {job.company_logo ? <Image source={{ uri: getFullUrl(job.company_logo)! }} style={styles.logo} /> : <Building2 size={normalize(40)} color={colors.primary} />}
            </View>
            <Text style={[styles.title, { color: colors.text.primary, fontSize: normalize(22) }]}>{job.title}</Text>
            <Text style={[styles.company, { color: colors.primary, fontSize: normalize(16) }]}>{job.company_name || job.company || 'Entreprise'}</Text>

            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: colors.background }]}>
                <MapPin size={14} color={colors.text.secondary} />
                <Text style={[styles.badgeText, { color: colors.text.secondary, fontSize: normalize(12) }]}>{job.location}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.background }]}>
                <Clock size={14} color={colors.text.secondary} />
                <Text style={[styles.badgeText, { color: colors.text.secondary, fontSize: normalize(12) }]}>{job.job_type || job.type || 'Type non spécifié'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary, fontSize: normalize(18) }]}>Description</Text>
            <Text style={[styles.description, { color: colors.text.secondary, fontSize: normalize(15) }]}>{job.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary, fontSize: normalize(18) }]}>Pré-requis</Text>
            {(Array.isArray(job.requirements) ? job.requirements : []).map((req: string, idx: number) => (
              <View key={idx} style={styles.listItem}>
                <CheckCircle2 size={16} color={colors.primary} />
                <Text style={[styles.listText, { color: colors.text.secondary, fontSize: normalize(15) }]}>{req}</Text>
              </View>
            ))}
          </View>

          <View style={styles.commentSection}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary, marginBottom: 15, fontSize: normalize(18) }]}>
              Questions et Commentaires ({comments.length})
            </Text>

            <View style={[styles.commentInputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.commentInput, { color: colors.text.primary, fontSize: normalize(15) }]}
                placeholder="Posez une question à l'employeur..."
                placeholderTextColor={colors.text.disabled}
                value={comment}
                onChangeText={setComment}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: colors.primary }]}
                onPress={handlePostComment}
                disabled={sendingComment}
              >
                {sendingComment ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="#fff" />}
              </TouchableOpacity>
            </View>

            {comments.map((item) => (
              <View key={item.id} style={[styles.commentCard, { borderBottomColor: colors.border }]}>
                <View style={styles.commentHeader}>
                  <View style={[styles.avatarSmall, { backgroundColor: colors.background }]}>
                    <User size={14} color={colors.text.disabled} />
                  </View>
                  <Text style={[styles.commentUser, { color: colors.text.primary, fontSize: normalize(14) }]}>{item.user || 'Utilisateur'}</Text>
                  <Text style={[styles.commentTime, { color: colors.text.disabled, fontSize: normalize(12) }]}>{item.created_at || item.time || 'Récemment'}</Text>
                </View>
                <Text style={[styles.commentContent, { color: colors.text.secondary, fontSize: normalize(14) }]}>{item.content}</Text>
              </View>
            ))}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd'
  },
  backBtn: { padding: 5 },
  headerTitle: { fontWeight: 'bold' },
  mainInfo: { alignItems: 'center', padding: 30, paddingBottom: 20 },
  logoContainer: { borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  logo: { width: '100%', height: '100%', borderRadius: 20 },
  title: { fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  company: { fontWeight: '600', marginBottom: 15 },
  badgeRow: { flexDirection: 'row', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginHorizontal: 5 },
  badgeText: { fontWeight: '600', marginLeft: 5 },
  section: { padding: 20, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  sectionTitle: { fontWeight: 'bold', marginBottom: 12 },
  description: { lineHeight: 24 },
  listItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  listText: { marginLeft: 10 },
  commentSection: { padding: 20 },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 15,
    padding: 10,
    marginBottom: 20
  },
  commentInput: { flex: 1, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  commentCard: { paddingVertical: 15, borderBottomWidth: 0.5 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  avatarSmall: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  commentUser: { fontWeight: 'bold', flex: 1 },
  commentTime: { fontSize: 12 },
  commentContent: { lineHeight: 20, marginLeft: 32 }
});
