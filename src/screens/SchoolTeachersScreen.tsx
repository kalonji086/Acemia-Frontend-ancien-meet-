import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput
} from 'react-native';
import { ArrowLeft, Plus, X, User, GraduationCap } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolTeachersScreen({ navigation, route }: any) {
  const { schoolId } = route?.params || {};
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [form, setForm] = useState({ fullName: '', email: '', subject: '', phone: '' });

  useEffect(() => {
    fetchTeachers();
    fetchClasses();
  }, [schoolId]);

  const fetchTeachers = async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    const res = await apiService.getSchoolTeachers(schoolId);
    if (res.success) setTeachers(res.data || []);
    setLoading(false);
  };

  const fetchClasses = async () => {
    if (!schoolId) return;
    const res = await apiService.getSchoolClasses(schoolId);
    if (res.success) setClasses(res.data || []);
  };

  const assignClass = async (classId: string) => {
    const res = await apiService.assignSchoolTeacherToClass({ schoolId, teacherId: selectedTeacher.id, classId });
    if (res.success) {
      Alert.alert('Succès', 'Classe affectée à l enseignant.');
      setShowAssignModal(false);
    } else Alert.alert('Erreur', res.error || 'Affectation impossible.');
  };

  const createTeacher = async () => {
    if (!form.fullName.trim()) {
      Alert.alert('Attention', 'Le nom complet est obligatoire.');
      return;
    }
    const res = await apiService.createSchoolTeacher({ schoolId, ...form });
    if (res.success) {
      setShowModal(false);
      setForm({ fullName: '', email: '', subject: '', phone: '' });
      fetchTeachers();
    } else Alert.alert('Erreur', res.error || 'Impossible d ajouter l enseignant.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color={colors.text.primary} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Corps enseignant</Text>
        <TouchableOpacity onPress={() => setShowModal(true)}><Plus size={24} color={colors.primary} /></TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator size="large" color={colors.primary} style={styles.loader} /> : (
        <FlatList
          data={teachers}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}><User size={22} color={colors.primary} /></View>
              <View style={styles.info}><Text style={[styles.name, { color: colors.text.primary }]}>{item.full_name}</Text><Text style={{ color: colors.text.secondary }}>{item.subject || 'Matière non définie'}</Text><Text style={{ color: colors.text.disabled, fontSize: 12 }}>{item.email || 'Aucun email'}</Text></View>
              <TouchableOpacity onPress={() => { setSelectedTeacher(item); setShowAssignModal(true); }} style={[styles.assignButton, { borderColor: colors.primary }]}><Text style={{ color: colors.primary, fontSize: 11, fontWeight: 'bold' }}>CLASSE</Text></TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.text.secondary }]}>Aucun enseignant enregistré.</Text>}
        />
      )}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.overlay}><View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.text.primary }]}>Ajouter un enseignant</Text><TouchableOpacity onPress={() => setShowModal(false)}><X size={24} color={colors.text.secondary} /></TouchableOpacity></View>
          <TextInput placeholder="Nom complet" value={form.fullName} onChangeText={fullName => setForm({ ...form, fullName })} placeholderTextColor={colors.text.disabled} style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]} />
          <TextInput placeholder="Email" value={form.email} onChangeText={email => setForm({ ...form, email })} keyboardType="email-address" placeholderTextColor={colors.text.disabled} style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]} />
          <TextInput placeholder="Matière" value={form.subject} onChangeText={subject => setForm({ ...form, subject })} placeholderTextColor={colors.text.disabled} style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]} />
          <TextInput placeholder="Téléphone" value={form.phone} onChangeText={phone => setForm({ ...form, phone })} keyboardType="phone-pad" placeholderTextColor={colors.text.disabled} style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]} />
          <TouchableOpacity onPress={createTeacher} style={[styles.submit, { backgroundColor: colors.primary }]}><Text style={styles.submitText}>AJOUTER</Text></TouchableOpacity>
        </View></View>
      </Modal>
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={styles.overlay}><View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.text.primary }]}>Classe de {selectedTeacher?.full_name}</Text><TouchableOpacity onPress={() => setShowAssignModal(false)}><X size={24} color={colors.text.secondary} /></TouchableOpacity></View>
          {classes.map(item => <TouchableOpacity key={item.id} onPress={() => assignClass(item.id)} style={[styles.classOption, { borderColor: colors.border }]}><GraduationCap size={20} color={colors.primary} /><Text style={{ color: colors.text.primary, marginLeft: 10 }}>{item.name}</Text></TouchableOpacity>)}
          {classes.length === 0 && <Text style={{ color: colors.text.secondary }}>Aucune classe disponible.</Text>}
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 0.5 }, headerTitle: { fontSize: 18, fontWeight: 'bold' }, loader: { marginTop: 50 }, list: { padding: 20 }, card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 15, marginBottom: 12 }, avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, info: { flex: 1, marginLeft: 14 }, name: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 }, empty: { textAlign: 'center', marginTop: 50 }, assignButton: { borderWidth: 1, borderRadius: 8, padding: 8 }, classOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }, modal: { borderRadius: 24, padding: 24 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, modalTitle: { fontSize: 20, fontWeight: 'bold' }, input: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 }, submit: { padding: 16, borderRadius: 12, alignItems: 'center' }, submitText: { color: '#fff', fontWeight: 'bold' }
});
