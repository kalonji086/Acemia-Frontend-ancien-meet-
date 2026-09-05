import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, ActivityIndicator, Alert,
  TextInput, Modal, useWindowDimensions
} from 'react-native';
import {
  ArrowLeft, MapPin, Mail, Phone, Info,
  ChevronRight, CheckCircle2, GraduationCap,
  MessageSquare, Bell, UserPlus
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';
import { SOCKET_URL } from '../utils/constants';

export default function SchoolProfileScreen({ navigation, route }: any) {
  const { schoolId } = route.params;
  const { colors, normalize } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ firstName: '', lastName: '', age: '', level: '' });

  useEffect(() => {
    fetchProfile();
  }, [schoolId]);

  const fetchProfile = async () => {
    try {
      const res = await apiService.getSchoolProfile(schoolId);
      if (res.success) setData(res.data);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger le profil de l\'école.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollSubmit = async () => {
    if (!enrollForm.firstName || !enrollForm.lastName) return Alert.alert('Erreur', 'Prénom et Nom requis.');
    try {
      const res = await apiService.enrollInSchool({
        schoolId,
        firstName: enrollForm.firstName,
        lastName: enrollForm.lastName,
        age: parseInt(enrollForm.age) || 0,
        level: enrollForm.level
      });
      if (res.success) {
        Alert.alert('Succès', 'Votre demande d\'inscription a été envoyée au promoteur.');
        setShowEnrollModal(false);
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'envoyer la demande.');
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http')) return url;
    return `${SOCKET_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const { school, announcements } = data;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Détails de l'école</Text>
        <TouchableOpacity><Info size={24} color={colors.primary} /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Image source={{ uri: getFullUrl(school.logo_url) || 'https://placehold.co/600x300?text=School' }} style={styles.banner} />

        <View style={[styles.mainInfo, { backgroundColor: colors.surface }]}>
          <Text style={[styles.schoolName, { color: colors.text.primary }]}>{school.name}</Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.text.secondary} />
            <Text style={[styles.locationText, { color: colors.text.secondary }]}>{school.address}, {school.city}, {school.country}</Text>
          </View>

          <TouchableOpacity
            style={[styles.enrollBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowEnrollModal(true)}
          >
            <UserPlus size={20} color="#fff" />
            <Text style={styles.enrollBtnText}>S'INSCRIRE À CETTE ÉCOLE</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>À propos</Text>
          <Text style={[styles.description, { color: colors.text.secondary }]}>{school.description || "Aucune description fournie."}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Annonces & Actualités</Text>
          {announcements.length === 0 ? (
             <Text style={{ color: colors.text.disabled, fontSize: 12 }}>Aucune annonce pour le moment.</Text>
          ) : (
            announcements.map((a: any) => (
              <View key={a.id} style={[styles.announcementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                 <Text style={[styles.announcementTitle, { color: colors.text.primary }]}>{a.title}</Text>
                 <Text style={[styles.announcementContent, { color: colors.text.secondary }]}>{a.content}</Text>
                 <Text style={styles.announcementDate}>{new Date(a.created_at).toLocaleDateString()}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal Inscription */}
      <Modal visible={showEnrollModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Formulaire d'inscription</Text>
            <TextInput placeholder="Prénom de l'enfant" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} onChangeText={v => setEnrollForm({...enrollForm, firstName: v})} placeholderTextColor={colors.text.disabled} />
            <TextInput placeholder="Nom de l'enfant" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} onChangeText={v => setEnrollForm({...enrollForm, lastName: v})} placeholderTextColor={colors.text.disabled} />
            <TextInput placeholder="Âge" keyboardType="numeric" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} onChangeText={v => setEnrollForm({...enrollForm, age: v})} placeholderTextColor={colors.text.disabled} />
            <TextInput placeholder="Classe souhaitée" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} onChangeText={v => setEnrollForm({...enrollForm, level: v})} placeholderTextColor={colors.text.disabled} />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowEnrollModal(false)} style={styles.cancelBtn}><Text style={{ color: colors.text.secondary }}>ANNULER</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleEnrollSubmit} style={[styles.confirmBtn, { backgroundColor: colors.primary }]}><Text style={{ color: '#fff', fontWeight: 'bold' }}>ENVOYER</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 0.5 },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  banner: { width: '100%', height: 200, backgroundColor: '#eee' },
  mainInfo: { padding: 20, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  schoolName: { fontSize: 24, fontWeight: '900', marginBottom: 5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { fontSize: 12 },
  enrollBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18, borderRadius: 15, marginTop: 20 },
  enrollBtnText: { color: '#fff', fontWeight: 'bold', letterSpacing: 1 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  description: { lineHeight: 22, fontSize: 14 },
  announcementCard: { padding: 15, borderRadius: 15, borderWidth: 1, marginBottom: 10 },
  announcementTitle: { fontWeight: 'bold', marginBottom: 5 },
  announcementContent: { fontSize: 13 },
  announcementDate: { fontSize: 10, color: '#999', marginTop: 10, textAlign: 'right' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 25, borderRadius: 30 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 15, padding: 15, marginBottom: 15 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, padding: 15, alignItems: 'center' },
  confirmBtn: { flex: 1, padding: 15, borderRadius: 15, alignItems: 'center' }
});