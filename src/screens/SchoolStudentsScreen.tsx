import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  ScrollView,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Users, Trash2, Edit, Search, Check, Copy, UserPlus, Filter } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolStudentsScreen({ navigation, route }: any) {
  const { colors, normalize } = useTheme();
  const isSchoolStaff = Boolean(route?.params?.schoolRole);
  const canManageStudents = !isSchoolStaff || route.params.schoolRole === 'directeur';
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState('');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('M');
  const [birthDate, setBirthDate] = useState('');
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
      const error = studRes.error || clsRes.error;
      if (error) Alert.alert('Inscriptions', error);
    } catch (e) {
      console.error('Unable to load school students', e);
      Alert.alert('Inscriptions', 'Impossible de charger les données de l’école.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!fullName.trim()) return Alert.alert('Attention', 'Veuillez saisir le nom complet de l\'élève.');

    setSubmitting(true);
    try {
      const res = await apiService.addSchoolStudent({
        id: selectedStudent?.id,
        fullName: fullName.trim(),
        gender,
        birthDate: birthDate.trim() || null,
        classId: classId || null
      });

      if (res.success) {
        Alert.alert(
          'Succès',
          selectedStudent ? 'Fiche élève mise à jour !' : `Inscription réussie !\nCode d'accès : ${res.data?.access_code || ''}`
        );
        resetForm();
        setShowAddForm(false);
        fetchData();
      } else {
        Alert.alert('Erreur', res.error || 'Impossible d\'inscrire l\'élève.');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = (id: string, name: string) => {
    Alert.alert('Confirmer la suppression', `Voulez-vous vraiment supprimer l'élève ${name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            const res = await apiService.deleteSchoolStudent(id);
            if (res.success) {
              fetchData();
            } else {
              Alert.alert('Erreur', res.error || 'Impossible de supprimer l\'élève.');
            }
          } catch (e: any) {
            Alert.alert('Erreur', e.message || 'Erreur lors de la suppression.');
          }
        }
      }
    ]);
  };

  const handleEditStudent = (student: any) => {
    setSelectedStudent(student);
    setFullName(student.full_name || '');
    setGender(student.gender || 'M');
    setBirthDate(student.birth_date || '');
    setClassId(student.class_id || '');
    setShowAddForm(true);
  };

  const handleShareCode = (student: any) => {
    Share.share({
      message: `Code d'accès élève (${student.full_name}) : ${student.access_code}`
    });
  };

  const resetForm = () => {
    setSelectedStudent(null);
    setFullName('');
    setGender('M');
    setBirthDate('');
    setClassId('');
  };

  // Filtered list
  const filteredStudents = students.filter(s => {
    const matchesSearch = !searchQuery || s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.access_code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = !filterClassId || s.class_id === filterClassId;
    return matchesSearch && matchesClass;
  });

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: normalize(18) }]}>
          Inscriptions & Élèves ({filteredStudents.length})
        </Text>
        {canManageStudents && (
          <TouchableOpacity
            style={[styles.addHeaderBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={() => {
              if (showAddForm) {
                resetForm();
                setShowAddForm(false);
              } else {
                resetForm();
                setShowAddForm(true);
              }
            }}
          >
            <Plus size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Barre de Recherche et Filtres */}
      <View style={{ paddingHorizontal: 20, paddingTop: 15 }}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.text.secondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Rechercher par nom ou code..."
            placeholderTextColor={colors.text.disabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filtres par Classe */}
        {classes.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, marginBottom: 5 }}>
            <TouchableOpacity
              style={[styles.filterChip, !filterClassId && { backgroundColor: colors.primary }]}
              onPress={() => setFilterClassId('')}
            >
              <Text style={{ color: !filterClassId ? '#fff' : colors.text.primary, fontSize: 12, fontWeight: 'bold' }}>Toutes ({students.length})</Text>
            </TouchableOpacity>
            {classes.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.filterChip, filterClassId === c.id && { backgroundColor: colors.primary }]}
                onPress={() => setFilterClassId(filterClassId === c.id ? '' : c.id)}
              >
                <Text style={{ color: filterClassId === c.id ? '#fff' : colors.text.primary, fontSize: 12, fontWeight: 'bold' }}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Formulaire Nouvelle Inscription / Edition */}
      {showAddForm && (
        <ScrollView style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }, isTablet && styles.tabletForm]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
            <Text style={[styles.formTitle, { color: colors.text.primary, fontSize: normalize(16) }]}>
              {selectedStudent ? 'Modifier la Fiche Élève' : 'Nouvelle Inscription Élève'}
            </Text>
            <TouchableOpacity onPress={() => { resetForm(); setShowAddForm(false); }}>
              <Text style={{ color: colors.danger, fontWeight: 'bold', fontSize: 13 }}>Fermer</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.text.secondary }]}>Nom complet de l'élève * :</Text>
          <TextInput
            style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
            placeholder="Ex: MUKENDI Jean-Paul"
            placeholderTextColor={colors.text.disabled}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>Genre :</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity style={[styles.genderBtn, gender === 'M' && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setGender('M')}>
              <Text style={{ color: gender === 'M' ? '#fff' : colors.text.primary, fontWeight: 'bold' }}>Masculin (M)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.genderBtn, gender === 'F' && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setGender('F')}>
              <Text style={{ color: gender === 'F' ? '#fff' : colors.text.primary, fontWeight: 'bold' }}>Féminin (F)</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.text.secondary }]}>Date de naissance (Optionnel) :</Text>
          <TextInput
            style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
            placeholder="Ex: 2012-05-15"
            placeholderTextColor={colors.text.disabled}
            value={birthDate}
            onChangeText={setBirthDate}
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>Assigner à une classe :</Text>
          <ScrollView style={{ maxHeight: 130, marginBottom: 15, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }} nestedScrollEnabled={true}>
            <TouchableOpacity
              style={[styles.classSelectItem, !classId && { backgroundColor: colors.primary + '20' }]}
              onPress={() => setClassId('')}
            >
              <Text style={{ color: colors.text.primary, fontWeight: !classId ? 'bold' : 'normal' }}>Non assigné (Attente)</Text>
              {!classId && <Check size={16} color={colors.primary} />}
            </TouchableOpacity>
            {classes.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.classSelectItem, classId === c.id && { backgroundColor: colors.primary + '20' }]}
                onPress={() => setClassId(c.id)}
              >
                <Text style={{ color: colors.text.primary, fontWeight: classId === c.id ? 'bold' : 'normal' }}>{c.name} ({c.level})</Text>
                {classId === c.id && <Check size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => { resetForm(); setShowAddForm(false); }}>
              <Text style={{ color: colors.text.primary, fontWeight: 'bold' }}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, flex: 2 }]}
              onPress={handleEnroll}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {selectedStudent ? 'Mettre à jour' : 'Inscrire l\'Élève'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Liste des Élèves */}
      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Users size={48} color={colors.text.disabled} style={{ marginBottom: 10 }} />
            <Text style={{ textAlign: 'center', color: colors.text.secondary, fontSize: 14 }}>
              {searchQuery || filterClassId ? 'Aucun élève ne correspond à votre recherche.' : 'Aucun élève inscrit pour le moment.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.studentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.avatarBox, { backgroundColor: colors.primary + '15' }]}>
              <Users size={22} color={colors.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.studentName, { color: colors.text.primary, fontSize: normalize(15) }]}>{item.full_name}</Text>
              <Text style={{ color: colors.text.secondary, fontSize: normalize(12), marginTop: 2 }}>
                {!isSchoolStaff && `Genre : ${item.gender || 'M'} • `}Classe : <Text style={{ fontWeight: 'bold', color: colors.text.primary }}>{item.class_name || 'Non assigné'}</Text>
              </Text>

              {canManageStudents && (
                <TouchableOpacity style={styles.codeBadge} onPress={() => handleShareCode(item)}>
                  <Copy size={12} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={{ color: colors.primary, fontSize: normalize(11), fontWeight: 'bold' }}>
                    Code : {item.access_code}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {canManageStudents && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => handleEditStudent(item)} style={styles.actionIcon}>
                  <Edit size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteStudent(item.id, item.full_name)} style={styles.actionIcon}>
                  <Trash2 size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}
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
  addHeaderBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, height: 44 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, borderWidth: 0.5, borderColor: '#ccc' },
  form: { padding: 20, borderBottomWidth: 1, marginHorizontal: 20, marginTop: 15, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  tabletForm: { maxWidth: 520, alignSelf: 'center', width: '100%' },
  formTitle: { fontWeight: 'bold' },
  input: { height: 46, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: 'bold', marginBottom: 5 },
  genderRow: { flexDirection: 'row', marginBottom: 12 },
  genderBtn: { flex: 1, height: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginRight: 6 },
  classSelectItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderColor: '#eee' },
  cancelBtn: { flex: 1, height: 46, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  submitBtn: { height: 46, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  studentCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  avatarBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  studentName: { fontWeight: 'bold' },
  codeBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 5, alignSelf: 'flex-start' },
  actionIcon: { padding: 8, marginLeft: 2 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40 }
});
