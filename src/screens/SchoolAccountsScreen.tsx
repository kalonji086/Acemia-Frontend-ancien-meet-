import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, useWindowDimensions, ScrollView } from 'react-native';
import { ArrowLeft, Plus, UserCheck, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolAccountsScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('enseignant'); // prefet, directeur, enseignant, professeur
  const [phone, setPhone] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiService.getSchoolAccountRequests();
      if (res.success) setRequests(res.data || []);
      else Alert.alert('Comptes du personnel', res.error || 'Impossible de charger les demandes.');
    } catch (e) {
      console.error('Unable to load school account requests', e);
      Alert.alert('Comptes du personnel', 'Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!fullName || !email || !role) {
      return Alert.alert('Attention', 'Veuillez remplir tous les champs obligatoires.');
    }
    try {
      const res = await apiService.addSchoolAccountRequest({ fullName, email, role, phone });
      if (res.success) {
        Alert.alert('Demande Envoyée', 'La demande de création de compte pour le personnel a été soumise avec succès.');
        setFullName('');
        setEmail('');
        setPhone('');
        setShowForm(false);
        fetchData();
      } else {
        Alert.alert('Erreur', res.error || 'Impossible de soumettre la demande.');
      }
    } catch (e) {
      console.error('Unable to create school account request', e);
      Alert.alert('Erreur', 'Impossible de soumettre la demande.');
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
          Demandes de Compte
        </Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)}>
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {showForm && (
        <ScrollView style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }, isTablet && styles.tabletForm]}>
          <Text style={[styles.formTitle, { color: colors.text.primary, fontSize: normalize(16) }]}>Demander un compte Personnel</Text>
          <TextInput
            style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
            placeholder="Nom complet"
            placeholderTextColor={colors.text.disabled}
            value={fullName}
            onChangeText={setFullName}
          />
          <TextInput
            style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
            placeholder="Adresse Email"
            placeholderTextColor={colors.text.disabled}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
            placeholder="Téléphone"
            placeholderTextColor={colors.text.disabled}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <View style={styles.roleRow}>
            {['prefet', 'directeur', 'enseignant', 'professeur'].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleBtn, role === r && { backgroundColor: colors.primary }]}
                onPress={() => setRole(r)}
              >
                <Text style={{ color: role === r ? '#fff' : colors.text.primary, fontSize: 11, fontWeight: 'bold' }}>{r.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>Envoyer la Demande</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.text.secondary }}>Aucune demande de compte effectuée.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <UserCheck size={24} color={colors.primary} style={{ marginRight: 15 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text.primary, fontSize: normalize(15) }]}>{item.full_name}</Text>
              <Text style={{ color: colors.text.secondary, fontSize: normalize(12) }}>
                Rôle : {item.role.toUpperCase()} • Code : {item.status === 'approuve' ? item.generated_code : 'En attente d’approbation'}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: item.status === 'approuve' ? '#4CAF50' : '#FF9800' }]}>
              <Text style={styles.badgeText}>{item.status}</Text>
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
  form: { padding: 20, borderBottomWidth: 1, marginHorizontal: 20, marginTop: 15, borderRadius: 12, borderWidth: 1, maxHeight: 380 },
  tabletForm: { maxWidth: 500, alignSelf: 'center', width: '100%' },
  formTitle: { fontWeight: 'bold', marginBottom: 12 },
  input: { height: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15, justifyContent: 'space-between' },
  roleBtn: { paddingHorizontal: 10, height: 36, justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: '#ccc', borderRadius: 8, marginBottom: 5 },
  submitBtn: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  name: { fontWeight: 'bold' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' }
});
