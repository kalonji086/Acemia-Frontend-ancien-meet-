import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, useWindowDimensions
} from 'react-native';
import { ArrowLeft, Calendar, Clock, MapPin, ChevronRight, User } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function SchoolCalendarScreen({ navigation, route }: any) {
  const { schoolId, classId } = route.params || {};
  const { colors, normalize } = useTheme();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [activeDay, setActiveCategory] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);

  useEffect(() => {
    fetchSchedules();
  }, [schoolId, classId]);

  const fetchSchedules = async () => {
    try {
      const res = await apiService.getSchoolSchedules(schoolId, classId);
      if (res.success) {
        setSchedules(res.data);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de charger l\'emploi du temps.');
    } finally {
      setLoading(false);
    }
  };

  const daySchedules = schedules.filter(s => s.day_of_week === (activeDay + 1));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Emploi du temps</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.daysContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
          {DAYS.map((day, index) => (
            <TouchableOpacity
              key={day}
              onPress={() => setActiveCategory(index)}
              style={[
                styles.dayBtn,
                { borderColor: colors.border },
                activeDay === index && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
            >
              <Text style={[styles.dayText, { color: activeDay === index ? '#fff' : colors.text.secondary }]}>{day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {daySchedules.length === 0 ? (
            <View style={styles.emptyState}>
              <Clock size={60} color={colors.text.disabled} />
              <Text style={{ marginTop: 20, color: colors.text.secondary, textAlign: 'center' }}>Aucun cours prévu pour ce jour.</Text>
            </View>
          ) : (
            daySchedules.map((item, index) => (
              <View key={index} style={[styles.scheduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.timeBox, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.startTime, { color: colors.primary }]}>{item.start_time.slice(0, 5)}</Text>
                  <Text style={[styles.endTime, { color: colors.text.secondary }]}>{item.end_time.slice(0, 5)}</Text>
                </View>
                <View style={styles.subjectInfo}>
                  <Text style={[styles.subjectName, { color: colors.text.primary }]}>{item.subject}</Text>
                  <View style={styles.metaRow}>
                    <User size={12} color={colors.text.disabled} />
                    <Text style={[styles.metaText, { color: colors.text.secondary }]}>{item.teacher_name || 'Prof. non assigné'}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  daysContainer: { paddingVertical: 15, backgroundColor: '#fff' },
  daysScroll: { paddingHorizontal: 15 },
  dayBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginRight: 10 },
  dayText: { fontWeight: 'bold', fontSize: 14 },
  listContent: { padding: 20 },
  scheduleCard: { flexDirection: 'row', padding: 15, borderRadius: 20, borderWidth: 1, marginBottom: 15, alignItems: 'center' },
  timeBox: { padding: 10, borderRadius: 12, alignItems: 'center', minWidth: 70 },
  startTime: { fontWeight: 'bold', fontSize: 16 },
  endTime: { fontSize: 12 },
  subjectInfo: { flex: 1, marginLeft: 15 },
  subjectName: { fontWeight: 'bold', fontSize: 17, marginBottom: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', marginTop: 100 },
});
