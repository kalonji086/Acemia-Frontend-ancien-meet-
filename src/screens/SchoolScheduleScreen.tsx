import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { ArrowLeft, Plus, Clock, BookOpen } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolScheduleScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
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
      if (clsRes.success) setClasses(clsRes.data || []);
    } catch (e) {
      console.error(e);
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
      }
    } catch (e) {
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
        <TouchableOpacity onPress={() => setShowAddForm(!showAddForm)}>
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {showAddForm && (
        <ScrollView style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }, isTablet && styles.tabletForm]}>
          <Text style={[styles.formTitle, { color: colors.text.primary, fontSize: normalize(16) }]}>Planifier un Cours</Text>

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
  input: { height: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  submitBtn: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 20 },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  scheduleCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  subjectName: { fontWeight: 'bold' }
});
