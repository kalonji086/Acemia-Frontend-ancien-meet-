import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, useWindowDimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, DollarSign } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolFeesScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;

  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [amountDue, setAmountDue] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const feesRes = await apiService.getSchoolFees();
      const studRes = await apiService.getSchoolStudents();
      if (feesRes.success) setFees(feesRes.data || []);
      else Alert.alert('Frais scolaires', feesRes.error || 'Impossible de charger les frais.');
      if (studRes.success) setStudents(studRes.data || []);
      else Alert.alert('Élèves', studRes.error || 'Impossible de charger les élèves.');
    } catch (e) {
      console.error('Unable to load school fees', e);
      Alert.alert('Frais scolaires', 'Impossible de charger les données de l’école.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddInvoice = async () => {
    if (!studentId || !amountDue) {
      return Alert.alert('Erreur', 'Veuillez sélectionner un élève et un montant requis');
    }
    const due = Number(amountDue);
    const paid = Number(amountPaid || '0');
    if (!Number.isFinite(due) || due <= 0 || !Number.isFinite(paid) || paid < 0 || paid > due) {
      return Alert.alert('Erreur', 'Saisissez des montants valides. Le montant payé ne peut pas dépasser le montant dû.');
    }
    try {
      const res = await apiService.addSchoolFeeInvoice({
        studentId,
        amountDue: due,
        amountPaid: paid,
        dueDate,
        status: paid >= due ? 'paye' : (paid > 0 ? 'partiel' : 'non_paye')
      });
      if (res.success) {
        Alert.alert('Succès', 'Facturation scolaire enregistrée !');
        setAmountDue('');
        setAmountPaid('');
        setShowAddForm(false);
        fetchData();
      } else {
        Alert.alert('Erreur', res.error || 'Impossible d’enregistrer les frais.');
      }
    } catch (e) {
      console.error('Unable to add school fee', e);
      Alert.alert('Erreur', 'Impossible d\'enregistrer les frais');
    }
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
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: normalize(18) }]}>
          Frais Scolaires
        </Text>
        <TouchableOpacity onPress={() => setShowAddForm(!showAddForm)}>
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {showAddForm && (
        <ScrollView style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }, isTablet && styles.tabletForm]}>
          <Text style={[styles.formTitle, { color: colors.text.primary, fontSize: normalize(16) }]}>Enregistrer un Paiement / Frais</Text>

          <Text style={[styles.label, { color: colors.text.secondary }]}>Élève *</Text>
          {students.length === 0 ? (
            <Text style={[styles.emptySelection, { color: colors.text.secondary }]}>Inscrivez d’abord un élève avant d’enregistrer des frais.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectionScroll}>
              {students.map((student) => (
                <TouchableOpacity
                  key={student.id}
                  style={[styles.selectionChip, { borderColor: colors.border }, studentId === student.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setStudentId(student.id)}
                >
                  <Text style={{ color: studentId === student.id ? '#fff' : colors.text.primary, fontWeight: '700' }}>{student.full_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TextInput
            style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
            placeholder="Montant total dû ($)"
            placeholderTextColor={colors.text.disabled}
            keyboardType="numeric"
            value={amountDue}
            onChangeText={setAmountDue}
          />
          <TextInput
            style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
            placeholder="Montant payé ($)"
            placeholderTextColor={colors.text.disabled}
            keyboardType="numeric"
            value={amountPaid}
            onChangeText={setAmountPaid}
          />
          <TextInput
            style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
            placeholder="Date limite (Ex: 2026-12-01)"
            placeholderTextColor={colors.text.disabled}
            value={dueDate}
            onChangeText={setDueDate}
          />

          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleAddInvoice}>
            <Text style={styles.submitBtnText}>Enregistrer le frais</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <FlatList
        data={fees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.text.secondary }}>Aucun historique de paiement disponible.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.feeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DollarSign size={24} color={colors.primary} style={{ marginRight: 15 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.studentName, { color: colors.text.primary, fontSize: normalize(15) }]}>{item.student_name}</Text>
              <Text style={{ color: colors.text.secondary, fontSize: normalize(12) }}>
                Payé : {item.amount_paid} $ / Dû : {item.amount_due} $
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'paye' ? '#4CAF50' : '#FF9800' }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  headerTitle: { fontWeight: 'bold' },
  form: { padding: 20, borderBottomWidth: 1, marginHorizontal: 20, marginTop: 15, borderRadius: 12, borderWidth: 1, maxHeight: 350 },
  tabletForm: { maxWidth: 500, alignSelf: 'center', width: '100%' },
  formTitle: { fontWeight: 'bold', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 7 },
  selectionScroll: { marginBottom: 14 },
  selectionChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  emptySelection: { marginBottom: 14, lineHeight: 18 },
  input: { height: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  submitBtn: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 20 },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  feeCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  studentName: { fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }
});
