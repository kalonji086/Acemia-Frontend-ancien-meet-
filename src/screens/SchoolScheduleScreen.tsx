import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, useWindowDimensions, ScrollView } from 'react-native';
import { ArrowLeft, Plus, Clock, BookOpen } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolScheduleScreen({ navigation, route }: any) {
  const { colors, normalize } = useTheme();
  const canManageSchedules = !route?.params?.schoolRole || route.params.schoolRole === 'directeur';
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;

  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [classId, setClassId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('Lundi');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [subject, setSubject] = useState('');
  const [teacherName, setTeacherName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const schRes = await apiService.getSchoolSchedules();
      const clsRes = await apiService.getSchoolClasses();
      if (schRes.success) setSchedules(schRes.data || []);
      else Alert.alert('Horaires', schRes.error || 'Impossible de charger les horaires.');
      if (clsRes.success) setClasses(clsRes.data || []);
      else Alert.alert('Classes', clsRes.error || 'Impossible de charger les classes.');
    } catch (e) {
      console.error('Unable to load school schedules', e);
      Alert.alert('Horaires', 'Impossible de charger les données de l’école.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!classId || !subject || !startTime || !endTime) {
      return Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
    }
    try {
      const res = await apiService.addSchoolSchedule({ classId, dayOfWeek, startTime, endTime, subject, teacherName });
      if (res.success) {
        Alert.alert('Succès', 'Cours ajouté à l\'horaire !');
        setSubject('');
        setTeacherName('');
        setShowAddForm(false);
        fetchData();
      } else {
        Alert.alert('Erreur', res.error || 'Impossible d’ajouter le cours.');
      }
    } catch (e) {
      console.error('Unable to add school schedule', e);
      Alert.alert('Erreur', 'Impossible d\'ajouter le cours');
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
          Horaires & Cours
        </Text>
        {canManageSchedules && (
          <TouchableOpacity onPress={() => setShowAddForm(!showAddForm)}>
            <Plus size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {canManageSchedules && showAddForm && (
        <ScrollView style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }, isTablet && styles.tabletForm]}>
          <Text style={[styles.formTitle, { color: colors.text.primary, fontSize: normalize(16) }]}>Planifier un Cours</Text>

          <Text style={[styles.label, { color: colors.text.secondary }]}>Classe *</Text>
          {classes.length === 0 ? (
            <Text style={[styles.emptySelection, { color: colors.text.secondary }]}>Créez d’abord une classe avant de planifier un cours.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectionScroll}>
              {classes.map((schoolClass) => (
                <TouchableOpacity
                  key={schoolClass.id}
                  style={[styles.selectionChip, { borderColor: colors.border }, classId === schoolClass.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setClassId(schoolClass.id)}
                >
                  <Text style={{ color: classId === schoolClass.id ? '#fff' : colors.text.primary, fontWeight: '700' }}>{schoolClass.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Text style={[styles.label, { color: colors.text.secondary }]}>Jour</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectionScroll}>
            {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map((day) => (
              <TouchableOpacity
                key={day}
                style={[styles.selectionChip, { borderColor: colors.border }, dayOfWeek === day && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setDayOfWeek(day)}
              >
                <Text style={{ color: dayOfWeek === day ? '#fff' : colors.text.primary, fontWeight: '700' }}>{day}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
            placeholder="Matière (Ex: Mathématiques)"
            placeholderTextColor={colors.text.disabled}
            value={subject}
            onChangeText={setSubject}
          />
          <TextInput
            style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
            placeholder="Nom de l'enseignant"
            placeholderTextColor={colors.text.disabled}
            value={teacherName}
            onChangeText={setTeacherName}
          />
          <TextInput
            style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
            placeholder="Heure début (Ex: 08:00)"
            placeholderTextColor={colors.text.disabled}
            value={startTime}
            onChangeText={setStartTime}
          />
          <TextInput
            style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
            placeholder="Heure fin (Ex: 10:00)"
            placeholderTextColor={colors.text.disabled}
            value={endTime}
            onChangeText={setEndTime}
          />

          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleAddSchedule}>
            <Text style={styles.submitBtnText}>Ajouter le cours</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <FlatList
        data={schedules}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.text.secondary }}>Aucun cours planifié.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.scheduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Clock size={24} color={colors.primary} style={{ marginRight: 15 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.subjectName, { color: colors.text.primary, fontSize: normalize(15) }]}>{item.subject}</Text>
              <Text style={{ color: colors.text.secondary, fontSize: normalize(12) }}>
                {item.day_of_week} • {item.start_time} - {item.end_time} • Classe : {item.class_name}
              </Text>
              {item.teacher_name && <Text style={{ color: colors.text.secondary, fontSize: normalize(11) }}>Prof : {item.teacher_name}</Text>}
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
  scheduleCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  subjectName: { fontWeight: 'bold' }
});
