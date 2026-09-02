import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, ActivityIndicator, Alert,
  TextInput, KeyboardAvoidingView, Platform, FlatList
} from 'react-native';
import {
  ArrowLeft, MapPin, Briefcase, DollarSign, Clock,
  Send, MessageCircle, Building2, CheckCircle2, User
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';
import { useLanguage } from '../context/LanguageContext';

export default function JobDetailsScreen({ navigation, route }: any) {
  const { jobId } = route.params;
  const { colors, normalize, isDark } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      // Simuler fetch - À remplacer par apiService.getJobById(jobId)
      setTimeout(() => {
        setJob({
          id: jobId,
          title: 'Développeur Mobile React Native',
          company: 'Together Tech',
          companyId: 'comp-123',
          employerId: 'user-456',
          location: 'Kinshasa / Remote',
          type: 'Contract',
          salary: '2500$+',
          time: 'Il y a 2h',
          description: 'Nous recherchons un développeur React Native passionné pour rejoindre notre équipe en pleine croissance. Vous participerez au développement de nouvelles fonctionnalités et à l\'amélioration de la performance de l\'application.',
          requirements: [
            '3+ ans d\'expérience avec React Native',
            'Maîtrise de TypeScript',
            'Expérience avec les WebSockets',
            'Bonne connaissance de Redux ou Context API'
          ],
          benefits: [
            'Horaires flexibles',
            'Prime de performance',
            'Équipement de pointe fourni'
          ],
          logo: null
        });
        setComments([
          { id: '1', user: 'Jean Marc', content: 'Est-ce que le poste est ouvert aux juniors ?', time: '1h' },
          { id: '2', user: 'Sarah K.', content: 'Super opportunité !', time: '30m' }
        ]);
        setLoading(false);
      }, 800);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger les détails.');
      navigation.goBack();
    }
  };

  const handleContactEmployer = async () => {
    try {
      // Créer ou obtenir une discussion privée avec l'employeur
      const res = await apiService.createChat([job.employerId]);
      if (res.success) {
        navigation.navigate('Chat', {
          chatId: res.data.id,
          name: job.company,
          peerUserId: job.employerId
        });
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de démarrer la discussion.');
    }
  };

  const handlePostComment = () => {
    if (!comment.trim()) return;
    setSendingComment(true);
    // Simuler envoi de commentaire
    setTimeout(() => {
      const newComment = {
        id: Date.now().toString(),
        user: 'Moi',
        content: comment,
        time: 'À l\'instant'
      };
      setComments([newComment, ...comments]);
      setComment('');
      setSendingComment(false);
    }, 500);
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
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Détails de l'offre</Text>
          <TouchableOpacity onPress={handleContactEmployer}>
            <MessageCircle size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={[styles.mainInfo, { backgroundColor: colors.surface }]}>
            <View style={[styles.logoContainer, { backgroundColor: colors.background }]}>
              {job.logo ? <Image source={{ uri: job.logo }} style={styles.logo} /> : <Building2 size={40} color={colors.primary} />}
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>{job.title}</Text>
            <Text style={[styles.company, { color: colors.primary }]}>{job.company}</Text>

            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: colors.background }]}>
                <MapPin size={14} color={colors.text.secondary} />
                <Text style={[styles.badgeText, { color: colors.text.secondary }]}>{job.location}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.background }]}>
                <Clock size={14} color={colors.text.secondary} />
                <Text style={[styles.badgeText, { color: colors.text.secondary }]}>{job.type}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Description</Text>
            <Text style={[styles.description, { color: colors.text.secondary }]}>{job.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Pré-requis</Text>
            {job.requirements.map((req: string, idx: number) => (
              <View key={idx} style={styles.listItem}>
                <CheckCircle2 size={16} color={colors.primary} />
                <Text style={[styles.listText, { color: colors.text.secondary }]}>{req}</Text>
              </View>
            ))}
          </View>

          <View style={styles.commentSection}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary, marginBottom: 15 }]}>
              Questions et Commentaires ({comments.length})
            </Text>

            <View style={[styles.commentInputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.commentInput, { color: colors.text.primary }]}
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
                  <Text style={[styles.commentUser, { color: colors.text.primary }]}>{item.user}</Text>
                  <Text style={[styles.commentTime, { color: colors.text.disabled }]}>{item.time}</Text>
                </View>
                <Text style={[styles.commentContent, { color: colors.text.secondary }]}>{item.content}</Text>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  mainInfo: { alignItems: 'center', padding: 30, paddingBottom: 20 },
  logoContainer: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  logo: { width: '100%', height: '100%', borderRadius: 20 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  company: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  badgeRow: { flexDirection: 'row', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginHorizontal: 5 },
  badgeText: { fontSize: 12, fontWeight: '600', marginLeft: 5 },
  section: { padding: 20, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 24 },
  listItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  listText: { fontSize: 15, marginLeft: 10 },
  commentSection: { padding: 20 },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 15,
    padding: 10,
    marginBottom: 20
  },
  commentInput: { flex: 1, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  commentCard: { paddingVertical: 15, borderBottomWidth: 0.5 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  avatarSmall: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  commentUser: { fontSize: 14, fontWeight: 'bold', flex: 1 },
  commentTime: { fontSize: 12 },
  commentContent: { fontSize: 14, lineHeight: 20, marginLeft: 32 }
});
