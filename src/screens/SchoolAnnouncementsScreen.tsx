import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput
} from 'react-native';
import { ArrowLeft, Plus, X, Megaphone, Trash2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolAnnouncementsScreen({ navigation, route }: any) {
  const { schoolId, userRole } = route?.params || {};
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });

  useEffect(() => {
    fetchAnnouncements();
  }, [schoolId]);

  const fetchAnnouncements = async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    const res = await apiService.getSchoolProfile(schoolId);
    if (res.success) setAnnouncements(res.data?.announcements || []);
    setLoading(false);
  };

  const createAnnouncement = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('Attention', 'Le titre et le contenu sont obligatoires.');
      return;
    }
    const res = await apiService.createSchoolAnnouncement({ schoolId, ...form });
    if (res.success) {
      setShowModal(false);
      setForm({ title: '', content: '' });
      fetchAnnouncements();
    } else {
      Alert.alert('Erreur', res.error || 'Impossible de publier l annonce.');
    }
  };

  const removeAnnouncement = (id: string) => {
    Alert.alert('Supprimer', 'Voulez-vous supprimer cette annonce ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        const res = await apiService.deleteSchoolAnnouncement(id);
        if (res.success) fetchAnnouncements();
        else Alert.alert('Erreur', res.error || 'Suppression impossible.');
      }}
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Annonces de l ecole</Text>
        {userRole === 'promoter' || userRole === 'director' ? (
          <TouchableOpacity onPress={() => setShowModal(true)} style={styles.iconButton}>
            <Plus size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : <View style={styles.iconButton} />}
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={styles.loader} /> : (
        <FlatList
          data={announcements}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardTop}>
                <Megaphone size={20} color={colors.primary} />
                <Text style={[styles.title, { color: colors.text.primary }]}>{item.title}</Text>
                {userRole === 'promoter' || userRole === 'director' ? (
                  <TouchableOpacity onPress={() => removeAnnouncement(item.id)}>
                    <Trash2 size={18} color="#E53935" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text style={[styles.content, { color: colors.text.secondary }]}>{item.content}</Text>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.text.secondary }]}>Aucune annonce publiee.</Text>}
        />
      )}

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Nouvelle annonce</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><X size={24} color={colors.text.secondary} /></TouchableOpacity>
            </View>
            <TextInput placeholder="Titre" value={form.title} onChangeText={title => setForm({ ...form, title })} placeholderTextColor={colors.text.disabled} style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]} />
            <TextInput placeholder="Contenu de l annonce" value={form.content} onChangeText={content => setForm({ ...form, content })} multiline placeholderTextColor={colors.text.disabled} style={[styles.input, styles.textarea, { color: colors.text.primary, borderColor: colors.border }]} />
            <TouchableOpacity onPress={createAnnouncement} style={[styles.submit, { backgroundColor: colors.primary }]}><Text style={styles.submitText}>PUBLIER</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 0.5 },
  iconButton: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  loader: { marginTop: 50 },
  list: { padding: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontSize: 16, fontWeight: 'bold' },
  content: { marginTop: 12, lineHeight: 20 },
  date: { color: '#888', fontSize: 11, marginTop: 12, textAlign: 'right' },
  empty: { textAlign: 'center', marginTop: 50 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { borderRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 },
  textarea: { height: 130, textAlignVertical: 'top' },
  submit: { padding: 16, borderRadius: 12, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: 'bold' }
});
