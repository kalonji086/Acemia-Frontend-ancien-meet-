import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput
} from 'react-native';
import { ArrowLeft, CreditCard, Plus, X, DollarSign } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolFeesScreen({ navigation, route }: any) {
  const { schoolId, userRole } = route.params || {};
  const { colors, normalize } = useTheme();
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<any[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', reference: '' });

  useEffect(() => {
    fetchFees();
  }, [schoolId]);

  const fetchFees = async () => {
    try {
      // Pour l'instant on utilise le dashboard pour avoir les frais ou une route spécifique
      const res = await apiService.getSchoolDashboard(schoolId);
      if (res.success) setFees(res.data.fees || []);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger les frais scolaires.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentForm.amount || !paymentForm.reference) return Alert.alert('Attention', 'Veuillez remplir toutes les informations.');
    try {
      const res = await apiService.createSchoolPayment({
        schoolId,
        amount: parseFloat(paymentForm.amount),
        reference: paymentForm.reference,
        status: 'pending'
      });
      if (res.success) {
        Alert.alert('Succès', 'Votre preuve de paiement a été soumise pour validation.');
        setShowPayModal(false);
        setPaymentForm({ amount: '', reference: '' });
      }
    } catch (e) {
      Alert.alert('Erreur', 'Échec de la soumission du paiement.');
    }
  };

  const renderFeeItem = ({ item }: any) => (
    <View style={[styles.feeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
        <CreditCard size={24} color={colors.primary} />
      </View>
      <View style={styles.feeInfo}>
        <Text style={[styles.feeName, { color: colors.text.primary }]}>{item.fee_name}</Text>
        <Text style={[styles.feeAmount, { color: colors.primary }]}>{item.amount}$</Text>
      </View>
      {userRole === 'parent' && (
        <TouchableOpacity
          style={[styles.payBtn, { backgroundColor: colors.primary }]}
          onPress={() => { setSelectedFee(item); setPaymentForm({ ...paymentForm, amount: item.amount.toString() }); setShowPayModal(true); }}
        >
          <Text style={styles.payBtnText}>PAYER</Text>
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
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Frais Scolaires</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={fees}
          renderItem={renderFeeItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <CreditCard size={60} color={colors.text.disabled} />
              <Text style={{ marginTop: 20, color: colors.text.secondary }}>Aucun frais configuré pour cet établissement.</Text>
            </View>
          }
        />
      )}

      {/* Modal Paiement */}
      <Modal visible={showPayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Soumettre un paiement</Text>
              <TouchableOpacity onPress={() => setShowPayModal(false)}><X size={24} color={colors.text.secondary} /></TouchableOpacity>
            </View>
            <Text style={{ color: colors.text.secondary, marginBottom: 15 }}>Paiement pour : {selectedFee?.fee_name}</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
               <DollarSign size={18} color={colors.text.disabled} />
               <TextInput placeholder="Montant" style={[styles.input, { color: colors.text.primary }]} value={paymentForm.amount} onChangeText={v => setPaymentForm({...paymentForm, amount: v})} keyboardType="numeric" />
            </View>
            <View style={[styles.inputWrapper, { borderColor: colors.border, marginTop: 10 }]}>
               <TextInput placeholder="Référence Transaction (ex: M-Pesa / Bank ID)" style={[styles.input, { color: colors.text.primary, marginLeft: 0 }]} value={paymentForm.reference} onChangeText={v => setPaymentForm({...paymentForm, reference: v})} />
            </View>
            <TouchableOpacity onPress={handlePayment} style={[styles.confirmBtn, { backgroundColor: colors.primary, marginTop: 20 }]}><Text style={{ color: '#fff', fontWeight: 'bold' }}>VALIDER LE PAIEMENT</Text></TouchableOpacity>
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
  listContent: { padding: 20 },
  feeCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  feeInfo: { flex: 1 },
  feeName: { fontWeight: 'bold', fontSize: 16 },
  feeAmount: { fontWeight: '900', fontSize: 15, marginTop: 2 },
  payBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  payBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 25, borderRadius: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, height: 50 },
  input: { flex: 1, marginLeft: 10 },
  confirmBtn: { padding: 18, borderRadius: 15, alignItems: 'center' }
});
