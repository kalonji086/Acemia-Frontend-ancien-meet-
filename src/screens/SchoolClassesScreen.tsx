import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput
} from 'react-native';
import { ArrowLeft, Plus, GraduationCap, Users, X, Send, Pencil, Trash2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolClassesScreen({ navigation, route }: any) {
  const { schoolId } = route.params || {};
  const { colors, normalize } = useTheme();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: '', level: '', capacity: '30' });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses();
  }, [schoolId]);

  const fetchClasses = async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiService.getSchoolClasses(schoolId);
      if (res.success) setClasses(res.data);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger les classes.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async () => {
    if (!form.name) return Alert.alert('Attention', 'Le nom de la classe est requis.');
    try {
      const payload = {
        schoolId,
        name: form.name,
        level: form.level,
        capacity: parseInt(form.capacity) || 30
      };
      const res = editingId ? await apiService.updateSchoolClass(editingId, payload) : await apiService.createSchoolClass(payload);
      if (res.success) {
        Alert.alert('Succès', editingId ? 'Classe modifiée avec succès.' : 'Classe créée avec succès.');
        setShowAddModal(false);
        setEditingId(null);
        setForm({ name: '', level: '', capacity: '30' });
        fetchClasses();
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de créer la classe.');
    }
  };

  const removeClass = async (id: string) => {
    Alert.alert('Supprimer', 'Supprimer cette classe ?', [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: async () => { const res = await apiService.deleteSchoolClass(id); if (res.success) fetchClasses(); else Alert.alert('Erreur', res.error || 'Suppression impossible.'); } }]);
  };

  const renderClassItem = ({ item }: any) => (
    <View style={[styles.classCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
        <GraduationCap size={24} color={colors.primary} />
      </View>
      <View style={styles.classInfo}>
        <Text style={[styles.className, { color: colors.text.primary }]}>{item.name}</Text>
        <Text style={[styles.classLevel, { color: colors.text.secondary }]}>Niveau: {item.level || 'N/A'}</Text>
      </View>
      <View style={styles.capacityBadge}>
        <Users size={14} color={colors.text.disabled} />
        <Text style={[styles.capacityText, { color: colors.text.secondary }]}>{item.capacity}</Text>
      </View>
      <TouchableOpacity onPress={() => { setEditingId(item.id); setForm({ name: item.name, level: item.level || '', capacity: String(item.capacity || 30) }); setShowAddModal(true); }} style={styles.actionIcon}><Pencil size={17} color={colors.primary} /></TouchableOpacity>
      <TouchableOpacity onPress={() => removeClass(item.id)} style={styles.actionIcon}><Trash2 size={17} color="#E53935" /></TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Gestion des Classes</Text>
        <TouchableOpacity onPress={() => { setEditingId(null); setForm({ name: '', level: '', capacity: '30' }); setShowAddModal(true); }} style={styles.addBtn}>
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={classes}
          renderItem={renderClassItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <GraduationCap size={60} color={colors.text.disabled} />
              <Text style={{ marginTop: 20, color: colors.text.secondary }}>Aucune classe configurée.</Text>
            </View>
          }
        />
      )}

      {/* Modal Ajout Classe */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Nouvelle Classe</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}><X size={24} color={colors.text.secondary} /></TouchableOpacity>
            </View>
            <TextInput placeholder="Nom de la classe (ex: 3ème A)" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} value={form.name} onChangeText={v => setForm({...form, name: v})} placeholderTextColor={colors.text.disabled} />
            <TextInput placeholder="Niveau / Option" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} value={form.level} onChangeText={v => setForm({...form, level: v})} placeholderTextColor={colors.text.disabled} />
            <TextInput placeholder="Capacité (ex: 35)" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} value={form.capacity} onChangeText={v => setForm({...form, capacity: v})} placeholderTextColor={colors.text.disabled} keyboardType="numeric" />
            <TouchableOpacity onPress={handleAddClass} style={[styles.confirmBtn, { backgroundColor: colors.primary }]}><Text style={{ color: '#fff', fontWeight: 'bold' }}>CRÉER LA CLASSE</Text></TouchableOpacity>
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
  classCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  classInfo: { flex: 1 },
  className: { fontWeight: 'bold', fontSize: 16 },
  classLevel: { fontSize: 12, marginTop: 2 },
  capacityBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f5f5f5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  capacityText: { fontWeight: 'bold', fontSize: 12 },
  actionIcon: { padding: 6, marginLeft: 4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 25, borderRadius: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  input: { padding: 15, borderRadius: 15, borderWidth: 1, marginBottom: 15 },
  confirmBtn: { padding: 18, borderRadius: 15, alignItems: 'center' }
});
