import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { ArrowLeft, Plus, UserPlus, Users, Tag } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolStudentsScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('M');
  const [classId, setClassId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const studRes = await apiService.getSchoolStudents();
      const clsRes = await apiService.getSchoolClasses();
      if (studRes.success) setStudents(studRes.data || []);
      if (clsRes.success) setClasses(clsRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!fullName) return Alert.alert('Erreur', 'Veuillez saisir le nom complet de l\'élève');
    try {
      const res = await apiService.addSchoolStudent({ fullName, gender, classId: classId || null });
      if (res.success) {
        Alert.alert('Succès', 'Élève inscrit avec succès !');
        setFullName('');
        setShowAddForm(false);
        fetchData();
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'inscrire l\'élève');
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
          Inscriptions & Élèves
        </Text>
        <TouchableOpacity onPress={() => setShowAddForm(!showAddForm)}>
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {showAddForm && (
        <View style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }, isTablet && styles.tabletForm]}>
          <Text style={[styles.formTitle, { color: colors.text.primary, fontSize: normalize(16) }]}>Nouvelle Inscription</Text>
          <TextInput
            style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
            placeholder="Nom complet de l'élève"
            placeholderTextColor={colors.text.disabled}
            value={fullName}
            onChangeText={setFullName}
          />
          <View style={styles.genderRow}>
            <TouchableOpacity style={[styles.genderBtn, gender === 'M' && { backgroundColor: colors.primary }]} onPress={() => setGender('M')}>
              <Text style={{ color: gender === 'M' ? '#fff' : colors.text.primary }}>Masculin</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.genderBtn, gender === 'F' && { backgroundColor: colors.primary }]} onPress={() => setGender('F')}>
              <Text style={{ color: gender === 'F' ? '#fff' : colors.text.primary }}>Féminin</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleEnroll}>
            <Text style={styles.submitBtnText}>Inscrire l'Élève</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.text.secondary }}>Aucun élève inscrit pour le moment.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.studentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Users size={24} color={colors.primary} style={{ marginRight: 15 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.studentName, { color: colors.text.primary, fontSize: normalize(15) }]}>{item.full_name}</Text>
              <Text style={{ color: colors.text.secondary, fontSize: normalize(12) }}>Genre : {item.gender} • Classe : {item.class_name || 'Non assigné'}</Text>
              <Text style={{ color: colors.primary, fontSize: normalize(11), fontWeight: 'bold' }}>Code : {item.access_code}</Text>
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
  form: { padding: 20, borderBottomWidth: 1, marginHorizontal: 20, marginTop: 15, borderRadius: 12, borderWidth: 1 },
  tabletForm: { maxWidth: 500, alignSelf: 'center', width: '100%' },
  formTitle: { fontWeight: 'bold', marginBottom: 12 },
  input: { height: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  genderRow: { flexDirection: 'row', marginBottom: 15 },
  genderBtn: { flex: 1, height: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: '#ccc', borderRadius: 8, marginRight: 5 },
  submitBtn: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  studentCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  studentName: { fontWeight: 'bold' }
});
