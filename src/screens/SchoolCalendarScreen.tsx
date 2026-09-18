import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, useWindowDimensions, Modal, TextInput
} from 'react-native';
import { ArrowLeft, Calendar, Clock, MapPin, ChevronRight, User, Plus, X, Trash2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function SchoolCalendarScreen({ navigation, route }: any) {
  const { schoolId, classId, userRole } = route.params || {};
  const { colors, normalize } = useTheme();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ classId: classId || '', subject: '', teacherName: '', dayOfWeek: '1', startTime: '08:00', endTime: '09:00' });
  const [activeDay, setActiveCategory] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);

  useEffect(() => {
    fetchSchedules();
    if (['promoter', 'director', 'teacher'].includes(userRole)) fetchClasses();
  }, [schoolId, classId, userRole]);

  const fetchClasses = async () => {
    if (!schoolId) return;
    const res = await apiService.getSchoolClasses(schoolId);
    if (res.success) setClasses(res.data || []);
  };

  const fetchSchedules = async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiService.getSchoolSchedules(schoolId, classId);
      if (res.success) {
        setSchedules(res.data);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de charger l\'emploi du temps.');
    } finally {
      setLoading(false);
    }
  };

  const createSchedule = async () => {
    if (!form.classId || !form.subject || !form.startTime || !form.endTime) {
      Alert.alert('Attention', 'Classe, matière et horaires sont obligatoires.');
      return;
    }
    const res = await apiService.createSchoolSchedule({ schoolId, ...form, dayOfWeek: parseInt(form.dayOfWeek, 10) });
    if (res.success) {
      setShowModal(false);
      setForm({ ...form, subject: '' });
      fetchSchedules();
    } else Alert.alert('Erreur', res.error || 'Impossible de créer le cours.');
  };

  const removeSchedule = async (id: string) => {
    const res = await apiService.deleteSchoolSchedule(id);
    if (res.success) fetchSchedules();
    else Alert.alert('Erreur', res.error || 'Impossible de supprimer le cours.');
  };

  const daySchedules = schedules.filter(s => s.day_of_week === (activeDay + 1));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Emploi du temps</Text>
        {['promoter', 'director', 'teacher'].includes(userRole) ? (
          <TouchableOpacity onPress={() => setShowModal(true)} style={styles.backBtn}><Plus size={24} color={colors.primary} /></TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      <View style={styles.daysContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
          {DAYS.map((day, index) => (
            <TouchableOpacity
              key={day}
              onPress={() => setActiveCategory(index)}
              style={[
                styles.dayBtn,
                { borderColor: colors.border },
                activeDay === index && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
            >
              <Text style={[styles.dayText, { color: activeDay === index ? '#fff' : colors.text.secondary }]}>{day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {daySchedules.length === 0 ? (
            <View style={styles.emptyState}>
              <Clock size={60} color={colors.text.disabled} />
              <Text style={{ marginTop: 20, color: colors.text.secondary, textAlign: 'center' }}>Aucun cours prévu pour ce jour.</Text>
            </View>
          ) : (
            daySchedules.map((item, index) => (
              <View key={item.id || index} style={[styles.scheduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.timeBox, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.startTime, { color: colors.primary }]}>{item.start_time.slice(0, 5)}</Text>
                  <Text style={[styles.endTime, { color: colors.text.secondary }]}>{item.end_time.slice(0, 5)}</Text>
                </View>
                <View style={styles.subjectInfo}>
                  <Text style={[styles.subjectName, { color: colors.text.primary }]}>{item.subject}</Text>
                  <View style={styles.metaRow}>
                    <User size={12} color={colors.text.disabled} />
                    <Text style={[styles.metaText, { color: colors.text.secondary }]}>{item.teacher_name || 'Prof. non assigné'}</Text>
                  </View>
                </View>
                {['promoter', 'director', 'teacher'].includes(userRole) && item.id && (
                  <TouchableOpacity onPress={() => removeSchedule(item.id)}><Trash2 size={18} color="#E53935" /></TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Nouveau cours</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><X size={24} color={colors.text.secondary} /></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={{ color: colors.text.secondary, marginBottom: 8 }}>Classe</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {classes.map(item => <TouchableOpacity key={item.id} onPress={() => setForm({ ...form, classId: item.id })} style={[styles.classChip, { borderColor: colors.border }, form.classId === item.id && { backgroundColor: colors.primary }]}><Text style={{ color: form.classId === item.id ? '#fff' : colors.text.secondary }}>{item.name}</Text></TouchableOpacity>)}
              </ScrollView>
              <TextInput placeholder="Matière" value={form.subject} onChangeText={subject => setForm({ ...form, subject })} placeholderTextColor={colors.text.disabled} style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]} />
              <TextInput placeholder="Nom de l enseignant" value={form.teacherName} onChangeText={teacherName => setForm({ ...form, teacherName })} placeholderTextColor={colors.text.disabled} style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]} />
              <TextInput placeholder="Jour (1 lundi - 7 dimanche)" value={form.dayOfWeek} onChangeText={dayOfWeek => setForm({ ...form, dayOfWeek })} keyboardType="numeric" placeholderTextColor={colors.text.disabled} style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]} />
              <TextInput placeholder="Début (HH:MM)" value={form.startTime} onChangeText={startTime => setForm({ ...form, startTime })} placeholderTextColor={colors.text.disabled} style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]} />
              <TextInput placeholder="Fin (HH:MM)" value={form.endTime} onChangeText={endTime => setForm({ ...form, endTime })} placeholderTextColor={colors.text.disabled} style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]} />
              <TouchableOpacity onPress={createSchedule} style={[styles.confirmBtn, { backgroundColor: colors.primary }]}><Text style={{ color: '#fff', fontWeight: 'bold' }}>AJOUTER LE COURS</Text></TouchableOpacity>
            </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  daysContainer: { paddingVertical: 15, backgroundColor: '#fff' },
  daysScroll: { paddingHorizontal: 15 },
  dayBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginRight: 10 },
  dayText: { fontWeight: 'bold', fontSize: 14 },
  listContent: { padding: 20 },
  scheduleCard: { flexDirection: 'row', padding: 15, borderRadius: 20, borderWidth: 1, marginBottom: 15, alignItems: 'center' },
  timeBox: { padding: 10, borderRadius: 12, alignItems: 'center', minWidth: 70 },
  startTime: { fontWeight: 'bold', fontSize: 16 },
  endTime: { fontSize: 12 },
  subjectInfo: { flex: 1, marginLeft: 15 },
  subjectName: { fontWeight: 'bold', fontSize: 17, marginBottom: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 24, borderRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  classChip: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderRadius: 10, marginRight: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  confirmBtn: { padding: 16, borderRadius: 12, alignItems: 'center' },
});
