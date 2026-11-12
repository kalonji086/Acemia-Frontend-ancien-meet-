import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, useWindowDimensions, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Users, UserCog, Trash2, ShieldAlert, ShieldCheck, ChevronRight, GraduationCap } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolClassesScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Modals
  const [classModalVisible, setClassModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);

  // Form states
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [className, setClassName] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');

  // Transfer states
  const [studentToTransfer, setStudentToTransfer] = useState<any>(null);
  const [targetClassId, setTargetClassId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const clsRes = await apiService.getSchoolClasses();
      const staffRes = await apiService.getSchoolAccountRequests();
      const studRes = await apiService.getSchoolStudents();

      if (clsRes.success) setClasses(clsRes.data || []);
      if (staffRes.success) setStaffList(staffRes.data || []);
      if (studRes.success) setStudents(studRes.data || []);
      const error = clsRes.error || staffRes.error || studRes.error;
      if (error) Alert.alert('Gestion des classes', error);
    } catch (e) {
      console.error('Unable to load school classes', e);
      Alert.alert('Gestion des classes', 'Impossible de charger les données de l’école.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClass = async () => {
    if (!className.trim() || !classLevel.trim()) return Alert.alert('Attention', 'Nom et Niveau requis.');
    try {
      const res = await apiService.addSchoolClass({
        id: selectedClass?.id,
        name: className.trim(),
        level: classLevel.trim(),
        staffId: assignedStaffId || null,
        isActive: selectedClass ? selectedClass.is_active : true
      });
      if (res.success) {
        toast("Classe enregistrée !", "success");
        setClassModalVisible(false);
        resetClassForm();
        fetchData();
      } else {
        Alert.alert('Erreur', res.error || 'Impossible de sauvegarder la classe.');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de sauvegarder la classe.');
    }
  };

  const handleDeleteClass = async (id: string) => {
    Alert.alert('Confirmer', 'Voulez-vous vraiment supprimer cette classe ? Les élèves seront désassignés.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          const res = await apiService.deleteSchoolClass(id);
          if (res.success) {
            fetchData();
          } else {
            Alert.alert('Erreur', res.error || 'Impossible de supprimer la classe.');
          }
        } catch (e) { Alert.alert('Erreur'); }
      }}
    ]);
  };

  const handleToggleClassStatus = async (item: any) => {
    try {
      await apiService.addSchoolClass({
        id: item.id,
        name: item.name,
        level: item.level,
        staffId: item.staff_id || null,
        isActive: !item.is_active
      });
      fetchData();
    } catch (e) { Alert.alert('Erreur'); }
  };

  const handleTransferStudent = async () => {
    if (!targetClassId) return Alert.alert('Erreur', 'Sélectionnez une classe de destination.');
    try {
      const res = await apiService.addSchoolStudent({
        id: studentToTransfer?.id,
        fullName: studentToTransfer?.full_name,
        gender: studentToTransfer?.gender,
        birthDate: studentToTransfer?.birth_date,
        classId: targetClassId,
        isActive: studentToTransfer?.is_active
      });
      if (res.success) {
        Alert.alert('Succès', 'Élève transféré avec succès !');
        setTransferModalVisible(false);
        fetchData();
      } else {
        Alert.alert('Erreur', res.error || 'Impossible de transférer l\'élève.');
      }
    } catch (e: any) { Alert.alert('Erreur', e.message || 'Erreur lors du transfert.'); }
  };

  const resetClassForm = () => {
    setSelectedClass(null);
    setClassName('');
    setClassLevel('');
    setAssignedStaffId('');
  };

  const toast = (m: string, type: string) => Alert.alert(type.toUpperCase(), m);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color={colors.text.primary} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: normalize(18) }]}>Gestion des Classes</Text>
        <TouchableOpacity onPress={() => { resetClassForm(); setClassModalVisible(true); }}>
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.text.secondary }}>Aucune classe créée.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.classCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: item.is_active ? 1 : 0.6 }]}>
            <View style={styles.classInfo}>
              <View style={styles.row}>
                <GraduationCap size={20} color={colors.primary} />
                <Text style={[styles.className, { color: colors.text.primary, fontSize: normalize(16) }]}> {item.name}</Text>
              </View>
              <Text style={{ color: colors.text.secondary, fontSize: normalize(12) }}>Niveau : {item.level} • {item.student_count} Élèves</Text>
              <View style={[styles.staffBadge, { backgroundColor: colors.primary + '10' }]}>
                <UserCog size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 11, fontWeight: 'bold', marginLeft: 5 }}>
                  {item.staff_name ? `${item.staff_name} (${item.staff_role})` : 'Aucun responsable assigné'}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleToggleClassStatus(item)} style={styles.actionIcon}>
                {item.is_active ? <ShieldCheck size={20} color="#4CAF50" /> : <ShieldAlert size={20} color="#F44336" />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                setSelectedClass(item);
                setClassName(item.name);
                setClassLevel(item.level);
                setAssignedStaffId(item.staff_id || '');
                setClassModalVisible(true);
              }} style={styles.actionIcon}>
                <UserCog size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteClass(item.id)} style={styles.actionIcon}>
                <Trash2 size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Modal Création/Edition Classe */}
      <Modal visible={classModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{selectedClass ? 'Modifier la Classe' : 'Nouvelle Classe'}</Text>

            <TextInput
              style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
              placeholder="Nom (Ex: 6ème Primaire A)"
              value={className}
              onChangeText={setClassName}
            />
            <TextInput
              style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
              placeholder="Niveau (Ex: Primaire)"
              value={classLevel}
              onChangeText={setClassLevel}
            />

            <Text style={[styles.label, { color: colors.text.secondary }]}>Attribuer à (Directeur/Préfet/Enseignant) :</Text>
            <ScrollView style={{ maxHeight: 150, marginBottom: 15 }}>
              <TouchableOpacity
                style={[styles.staffItem, !assignedStaffId && { backgroundColor: colors.primary + '20' }]}
                onPress={() => setAssignedStaffId('')}
              >
                <Text style={{ color: colors.text.primary }}>Aucun (Géré par Promoteur)</Text>
              </TouchableOpacity>
              {staffList.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.staffItem, assignedStaffId === s.id && { backgroundColor: colors.primary + '20' }]}
                  onPress={() => setAssignedStaffId(s.id)}
                >
                  <Text style={{ color: colors.text.primary }}>{s.full_name} ({s.role})</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.row}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#ccc' }]} onPress={() => setClassModalVisible(false)}><Text>Annuler</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleSaveClass}><Text style={{ color: '#fff' }}>Enregistrer</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Liste des Élèves pour Transfert Rapide */}
      <View style={{ height: 250, borderTopWidth: 1, borderColor: colors.border }}>
        <Text style={[styles.sectionTitle, { padding: 15, color: colors.text.primary }]}>Mouvements d'Élèves</Text>
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.studentTransferRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text.primary, fontWeight: 'bold' }}>{item.full_name}</Text>
                <Text style={{ color: colors.text.secondary, fontSize: 11 }}>Classe actuelle : {item.class_name || 'Non assigné'}</Text>
              </View>
              <TouchableOpacity onPress={() => { setStudentToTransfer(item); setTargetClassId(item.class_id || ''); setTransferModalVisible(true); }} style={[styles.transferBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff', fontSize: 10 }}>Transférer</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>

      {/* Modal Transfert Élève */}
      <Modal visible={transferModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Transférer {studentToTransfer?.full_name}</Text>
            <Text style={{ marginBottom: 10, color: colors.text.secondary }}>Sélectionnez la nouvelle classe :</Text>
            <ScrollView style={{ maxHeight: 200, marginBottom: 15 }}>
              {classes.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.staffItem, targetClassId === c.id && { backgroundColor: colors.primary + '20' }]}
                  onPress={() => setTargetClassId(c.id)}
                >
                  <Text style={{ color: colors.text.primary }}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#ccc' }]} onPress={() => setTransferModalVisible(false)}><Text>Annuler</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleTransferStudent}><Text style={{ color: '#fff' }}>Confirmer</Text></TouchableOpacity>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  headerTitle: { fontWeight: 'bold' },
  classCard: { padding: 18, borderRadius: 15, borderWidth: 1, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  classInfo: { flex: 1 },
  className: { fontWeight: 'bold' },
  staffBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginTop: 8, alignSelf: 'flex-start' },
  actions: { flexDirection: 'row' },
  actionIcon: { padding: 8, marginLeft: 5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 25, padding: 25 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  input: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, marginBottom: 15 },
  label: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, marginTop: 5 },
  staffItem: { padding: 12, borderBottomWidth: 0.5, borderColor: '#eee' },
  btn: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
  sectionTitle: { fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#eee' },
  studentTransferRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderColor: '#eee' },
  transferBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }
});
