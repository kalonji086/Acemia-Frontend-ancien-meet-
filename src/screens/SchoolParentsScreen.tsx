import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { ArrowLeft, Copy, Plus, Trash2, UserRound } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolParentsScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [parents, setParents] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [parentsResponse, studentsResponse] = await Promise.all([
        apiService.getSchoolParents(),
        apiService.getSchoolStudents(),
      ]);
      if (!parentsResponse.success) {
        Alert.alert('Comptes Parents', parentsResponse.error || 'Impossible de charger les comptes Parents.');
      } else {
        setParents(parentsResponse.data || []);
      }
      if (!studentsResponse.success) {
        Alert.alert('Élèves', studentsResponse.error || 'Impossible de charger la liste des élèves.');
      } else {
        setStudents((studentsResponse.data || []).filter((student: any) => student.is_active !== false));
      }
    } catch (error) {
      console.error('Unable to load school parent accounts', error);
      Alert.alert('Comptes Parents', 'Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createParent = async () => {
    if (!fullName.trim() || !studentId) {
      Alert.alert('Informations requises', 'Saisissez le nom du parent et sélectionnez son enfant.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiService.addSchoolParent({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        studentId,
      });
      if (!response.success) {
        Alert.alert('Création du compte', response.error || 'Impossible de créer le compte Parent.');
        return;
      }
      setFullName('');
      setPhone('');
      setStudentId('');
      setShowForm(false);
      await loadData();
      Alert.alert('Compte Parent créé', `Code d’accès : ${response.data.generated_code}`);
    } catch (error) {
      console.error('Unable to create school parent account', error);
      Alert.alert('Création du compte', 'Impossible de créer le compte Parent.');
    } finally {
      setSubmitting(false);
    }
  };

  const deactivateParent = (parent: any) => {
    Alert.alert('Désactiver ce code ?', `Le compte de ${parent.full_name} ne pourra plus se connecter.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Désactiver',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await apiService.deactivateSchoolParent(parent.id);
            if (!response.success) {
              Alert.alert('Comptes Parents', response.error || 'Impossible de désactiver ce code.');
              return;
            }
            await loadData();
          } catch (error) {
            console.error('Unable to deactivate school parent account', error);
            Alert.alert('Comptes Parents', 'Impossible de désactiver ce code.');
          }
        },
      },
    ]);
  };

  const shareCode = (parent: any) => {
    Share.share({
      message: `Code d’accès Parent de ${parent.full_name} pour suivre ${parent.student_name} : ${parent.generated_code}`,
    });
  };

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.primary, fontSize: normalize(18) }]}>Comptes Parents</Text>
        <TouchableOpacity onPress={() => setShowForm((visible) => !visible)} accessibilityRole="button" accessibilityLabel="Créer un compte Parent">
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {showForm && (
        <ScrollView style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }, isTablet && styles.tabletForm]}>
          <Text style={[styles.formTitle, { color: colors.text.primary, fontSize: normalize(16) }]}>Créer un accès pour un parent</Text>
          <TextInput
            style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
            placeholder="Nom complet du parent"
            placeholderTextColor={colors.text.disabled}
            value={fullName}
            onChangeText={setFullName}
          />
          <TextInput
            style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
            placeholder="Téléphone (facultatif)"
            placeholderTextColor={colors.text.disabled}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <Text style={[styles.label, { color: colors.text.secondary }]}>Associer un seul élève :</Text>
          {students.length === 0 ? (
            <Text style={{ color: colors.text.secondary, marginBottom: 14 }}>Inscrivez d’abord un élève pour créer un accès Parent.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.studentChoices}>
              {students.map((student) => (
                <TouchableOpacity
                  key={student.id}
                  style={[styles.studentChoice, { borderColor: colors.border }, studentId === student.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setStudentId(student.id)}
                >
                  <Text style={{ color: studentId === student.id ? '#fff' : colors.text.primary, fontWeight: '700' }}>
                    {student.full_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }, (!students.length || submitting) && styles.disabledButton]}
            onPress={createParent}
            disabled={!students.length || submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitLabel}>Créer et générer le code</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      <FlatList
        data={parents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={{ color: colors.text.secondary, textAlign: 'center' }}>Aucun compte Parent créé.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <UserRound size={24} color={colors.primary} style={{ marginRight: 12 }} />
            <View style={styles.cardContent}>
              <Text style={[styles.parentName, { color: colors.text.primary }]}>{item.full_name}</Text>
              <Text style={{ color: colors.text.secondary, marginTop: 3 }}>Enfant : {item.student_name} · {item.class_name || 'Classe non définie'}</Text>
              <TouchableOpacity style={styles.codeButton} onPress={() => shareCode(item)}>
                <Copy size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '700' }}> Code : {item.generated_code}</Text>
              </TouchableOpacity>
              {item.phone && <Text style={{ color: colors.text.secondary, marginTop: 4 }}>{item.phone}</Text>}
            </View>
            {item.is_active ? (
              <TouchableOpacity onPress={() => deactivateParent(item)} accessibilityRole="button" accessibilityLabel={`Désactiver le code de ${item.full_name}`}>
                <Trash2 size={20} color={colors.danger} />
              </TouchableOpacity>
            ) : <Text style={{ color: colors.danger, fontWeight: '700' }}>Désactivé</Text>}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontWeight: '800' },
  form: { padding: 18, borderWidth: 1, borderRadius: 14, margin: 16, maxHeight: 360 },
  tabletForm: { width: '100%', maxWidth: 540, alignSelf: 'center' },
  formTitle: { fontWeight: '800', marginBottom: 14 },
  input: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
  label: { fontWeight: '700', marginVertical: 8 },
  studentChoices: { maxHeight: 52, marginBottom: 12 },
  studentChoice: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 40, justifyContent: 'center', marginRight: 8 },
  submitButton: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 8 },
  disabledButton: { opacity: 0.5 },
  submitLabel: { color: '#fff', fontWeight: '800' },
  list: { padding: 16, paddingBottom: 30 },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardContent: { flex: 1, minWidth: 0 },
  parentName: { fontSize: 15, fontWeight: '800' },
  codeButton: { flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-start' },
});
