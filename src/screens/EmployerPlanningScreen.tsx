import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput,
  FlatList
} from 'react-native';
import { ArrowLeft, Calendar, Plus, Clock, MapPin, X, User, Trash2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

const EVENT_TYPES = [
  { id: 'interview', label: 'Entretien', color: '#2196F3' },
  { id: 'meeting', label: 'Réunion', color: '#9C27B0' },
  { id: 'onboarding', label: 'Intégration', color: '#4CAF50' },
  { id: 'other', label: 'Autre', color: '#FF9800' },
];

export default function EmployerPlanningScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCandidatePicker, setShowCandidatePicker] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startAt: '',
    endAt: '',
    type: 'interview',
    candidateName: '',
    candidateId: '',
    location: ''
  });

  useEffect(() => {
    fetchSchedules();
    fetchApplications();
  }, []);

  const fetchSchedules = async () => {
    try {
      const res = await apiService.getEmployerSchedules();
      if (res.success) {
        setSchedules(res.data);
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger le planning.');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await apiService.getApplications(undefined);
      if (res.success && Array.isArray(res.data)) {
        setApplications(res.data);
      } else {
        setApplications([]);
      }
    } catch (e) {
      console.error("Error fetching apps", e);
      setApplications([]);
    }
  };

  const handleAddSchedule = async () => {
    if (!form.title || !form.startAt || !form.endAt) {
      return Alert.alert('Attention', 'Veuillez remplir le titre et les horaires.');
    }
    // Simple validation for date format
    if (isNaN(Date.parse(form.startAt)) || isNaN(Date.parse(form.endAt))) {
      return Alert.alert('Format invalide', 'Utilisez le format AAAA-MM-JJ HH:MM');
    }

    try {
      setLoading(true);
      const res = await apiService.createEmployerSchedule(form);
      if (res.success) {
        Alert.alert('Succès', 'Événement planifié.');
        setShowAddModal(false);
        setForm({ title: '', description: '', startAt: '', endAt: '', type: 'interview', candidateName: '', candidateId: '', location: '' });
        fetchSchedules();
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.error || 'Échec de la création.');
    } finally {
      setLoading(false);
    }
  };

  const selectCandidate = (app: any) => {
    if (!app) return;
    setForm({ ...form, candidateName: app.applicant_name, candidateId: app.applicant_id });
    setShowCandidatePicker(false);
  };

  const handleDeleteSchedule = (id: string) => {
    Alert.alert('Supprimer', 'Voulez-vous supprimer cet événement ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          const res = await apiService.deleteEmployerSchedule(id);
          if (res.success) fetchSchedules();
        } catch (e) { Alert.alert('Erreur', 'Échec de suppression'); }
      }}
    ]);
  };

  const renderScheduleItem = ({ item }: any) => {
    if (!item) return null;
    const typeInfo = EVENT_TYPES.find(t => t.id === item.type) || EVENT_TYPES[0];

    // Safely format dates
    const startDate = item.start_at ? new Date(item.start_at) : null;
    const endDate = item.end_at ? new Date(item.end_at) : null;
    const dateStr = startDate && !isNaN(startDate.getTime()) ? startDate.toLocaleString() : "Date inconnue";
    const timeStr = endDate && !isNaN(endDate.getTime()) ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '20' }]}>
          <Text style={[styles.typeText, { color: typeInfo.color }]}>{typeInfo.label.toUpperCase()}</Text>
        </View>

        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text.primary }]}>{item.title || "Sans titre"}</Text>
          <TouchableOpacity onPress={() => handleDeleteSchedule(item.id)}>
            <Trash2 size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoRow}>
          <Clock size={14} color={colors.text.secondary} />
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            {dateStr} {timeStr ? `- ${timeStr}` : ""}
          </Text>
        </View>

        {item.candidate_name && (
          <View style={styles.infoRow}>
            <User size={14} color={colors.text.secondary} />
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>{item.candidate_name}</Text>
          </View>
        )}

        {item.location && (
          <View style={styles.infoRow}>
            <MapPin size={14} color={colors.text.secondary} />
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>{item.location}</Text>
          </View>
        )}

        {item.description && (
          <Text style={[styles.description, { color: colors.text.disabled }]}>{item.description}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Planning Pro</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading && schedules.length === 0 ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={schedules}
          renderItem={renderScheduleItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={fetchSchedules}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Calendar size={60} color={colors.text.disabled} />
              <Text style={{ marginTop: 20, color: colors.text.secondary }}>Aucun événement planifié.</Text>
              <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={() => setShowAddModal(true)}>
                <Text style={styles.createBtnText}>Planifier un entretien</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modal Ajout Événement */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Nouveau Planning</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}><X size={24} color={colors.text.secondary} /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Type d'événement</Text>
              <View style={styles.typeRow}>
                {EVENT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setForm({...form, type: t.id})}
                    style={[styles.typeBtn, { borderColor: colors.border }, form.type === t.id && { backgroundColor: t.color, borderColor: t.color }]}
                  >
                    <Text style={[styles.typeBtnText, { color: form.type === t.id ? '#fff' : colors.text.secondary }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Titre / Objet</Text>
              <TextInput placeholder="Ex: Entretien Développeur Junior" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} value={form.title} onChangeText={v => setForm({...form, title: v})} />

              <Text style={styles.label}>Candidat (Sélectionner)</Text>
              <TouchableOpacity
                onPress={() => setShowCandidatePicker(true)}
                style={[styles.input, { borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
              >
                <Text style={{ color: form.candidateName ? colors.text.primary : colors.text.disabled }}>
                  {form.candidateName || "Choisir parmi les postulants..."}
                </Text>
                <ChevronRight size={18} color={colors.text.disabled} />
              </TouchableOpacity>

              <Text style={styles.label}>Localisation / Lien</Text>
              <TextInput placeholder="Ex: Bureau Gombe ou Google Meet" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} value={form.location} onChangeText={v => setForm({...form, location: v})} />

              <View style={{ flexDirection: 'row', gap: 15 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Début (AAAA-MM-JJ HH:MM)</Text>
                  <TextInput placeholder="2024-03-25 14:00" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} value={form.startAt} onChangeText={v => setForm({...form, startAt: v})} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Fin (AAAA-MM-JJ HH:MM)</Text>
                  <TextInput placeholder="2024-03-25 15:00" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} value={form.endAt} onChangeText={v => setForm({...form, endAt: v})} />
                </View>
              </View>

              <Text style={styles.label}>Description / Notes</Text>
              <TextInput placeholder="Instructions..." multiline style={[styles.input, { borderColor: colors.border, color: colors.text.primary, height: 80, textAlignVertical: 'top' }]} value={form.description} onChangeText={v => setForm({...form, description: v})} />

              <TouchableOpacity onPress={handleAddSchedule} style={[styles.confirmBtn, { backgroundColor: colors.primary, marginTop: 10 }]}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>PLANIFIER</Text>
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Sélection Candidat */}
      <Modal visible={showCandidatePicker} transparent animationType="fade">
        <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderRadius: 30, maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Postulants</Text>
              <TouchableOpacity onPress={() => setShowCandidatePicker(false)}><X size={24} color={colors.text.secondary} /></TouchableOpacity>
            </View>
            <FlatList
              data={applications}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => selectCandidate(item)}
                  style={{ padding: 15, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center' }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <User size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={{ fontWeight: 'bold', color: colors.text.primary }}>{item.applicant_name}</Text>
                    <Text style={{ fontSize: 12, color: colors.text.secondary }}>{item.job_title}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', padding: 30, color: colors.text.disabled }}>Aucune candidature reçue.</Text>}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  backBtn: { padding: 5 },
  addBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  listContent: { padding: 20 },
  card: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 17, fontWeight: 'bold' },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  typeText: { fontSize: 10, fontWeight: '900' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  infoText: { fontSize: 13, fontWeight: '500' },
  description: { fontSize: 12, marginTop: 10, fontStyle: 'italic' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  createBtn: { marginTop: 25, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  createBtnText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { padding: 25, borderTopLeftRadius: 35, borderTopRightRadius: 35, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 15, textTransform: 'uppercase', color: '#999' },
  input: { padding: 15, borderRadius: 15, borderWidth: 1, marginBottom: 5 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  typeBtnText: { fontWeight: 'bold', fontSize: 12 },
  confirmBtn: { padding: 18, borderRadius: 15, alignItems: 'center' }
});
