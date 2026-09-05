import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput
} from 'react-native';
import { ArrowLeft, BookOpen, Plus, X, Send, Clock, FileText } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolAssignmentsScreen({ navigation, route }: any) {
  const { schoolId, userRole } = route.params || {};
  const { colors, normalize } = useTheme();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', classId: '' });
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    fetchAssignments();
    if (userRole === 'teacher' || userRole === 'director' || userRole === 'promoter') {
      fetchClasses();
    }
  }, [schoolId]);

  const fetchAssignments = async () => {
    try {
      const res = await apiService.getSchoolDashboard(schoolId);
      if (res.success) setAssignments(res.data.assignments || []);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger les devoirs.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    const res = await apiService.getSchoolClasses(schoolId);
    if (res.success) setClasses(res.data);
  };

  const handleAddAssignment = async () => {
    if (!form.title || !form.classId) return Alert.alert('Attention', 'Le titre et la classe sont obligatoires.');
    try {
      const res = await apiService.createSchoolAssignment({
        schoolId,
        classId: form.classId,
        title: form.title,
        description: form.description,
        dueDate: form.dueDate || new Date(Date.now() + 86400000).toISOString() // Demain par défaut
      });
      if (res.success) {
        Alert.alert('Succès', 'Devoir publié à la classe.');
        setShowAddModal(false);
        setForm({ title: '', description: '', dueDate: '', classId: '' });
        fetchAssignments();
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de publier le devoir.');
    }
  };

  const renderAssignmentItem = ({ item }: any) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
        <FileText size={24} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text.primary }]}>{item.title}</Text>
        <Text style={[styles.desc, { color: colors.text.secondary }]} numberOfLines={2}>{item.description}</Text>
        <View style={styles.footerRow}>
           <Clock size={12} color={colors.text.disabled} />
           <Text style={[styles.date, { color: colors.text.disabled }]}>À rendre pour le: {new Date(item.due_date).toLocaleDateString()}</Text>
        </View>
      </View>
      {(userRole === 'student' || userRole === 'parent') && (
        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.smallBtnText}>OUVRIR</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Devoirs & Travaux</Text>
        {(userRole === 'teacher' || userRole === 'director' || userRole === 'promoter') ? (
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
            <Plus size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={assignments}
          renderItem={renderAssignmentItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <BookOpen size={60} color={colors.text.disabled} />
              <Text style={{ marginTop: 20, color: colors.text.secondary }}>Aucun devoir en cours.</Text>
            </View>
          }
        />
      )}

      {/* Modal Ajout Devoir */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Nouveau Devoir</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}><X size={24} color={colors.text.secondary} /></TouchableOpacity>
            </View>

            <TextInput placeholder="Titre du devoir" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} value={form.title} onChangeText={v => setForm({...form, title: v})} placeholderTextColor={colors.text.disabled} />

            <View style={styles.pickerContainer}>
              <Text style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 5 }}>Assigner à la classe :</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {classes.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setForm({...form, classId: c.id})}
                    style={[styles.classChip, { borderColor: colors.border }, form.classId === c.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  >
                    <Text style={{ color: form.classId === c.id ? '#fff' : colors.text.secondary, fontWeight: 'bold' }}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TextInput placeholder="Instructions détaillées..." multiline style={[styles.input, { borderColor: colors.border, color: colors.text.primary, height: 100, textAlignVertical: 'top' }]} value={form.description} onChangeText={v => setForm({...form, description: v})} placeholderTextColor={colors.text.disabled} />

            <TextInput placeholder="Date d'échéance (AAAA-MM-JJ)" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} value={form.dueDate} onChangeText={v => setForm({...form, dueDate: v})} placeholderTextColor={colors.text.disabled} />

            <TouchableOpacity onPress={handleAddAssignment} style={[styles.confirmBtn, { backgroundColor: colors.primary, marginTop: 10 }]}><Text style={{ color: '#fff', fontWeight: 'bold' }}>PUBLIER LE DEVOIR</Text></TouchableOpacity>
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
  card: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  info: { flex: 1 },
  title: { fontWeight: 'bold', fontSize: 16 },
  desc: { fontSize: 12, marginTop: 2 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  date: { fontSize: 10 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  smallBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 25, borderRadius: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  input: { padding: 15, borderRadius: 15, borderWidth: 1, marginBottom: 15 },
  confirmBtn: { padding: 18, borderRadius: 15, alignItems: 'center' },
  pickerContainer: { marginBottom: 15 },
  classChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginRight: 8 }
});
