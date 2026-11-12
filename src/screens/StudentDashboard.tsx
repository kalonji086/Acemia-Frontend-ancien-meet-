import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, GraduationCap, Calendar, BookOpen,
  BarChart3, FileText, DollarSign, LogOut, Bell
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function StudentDashboard({ route, navigation }: any) {
  const { user } = route.params;
  const { colors, normalize } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;
  const [loading, setLoading] = useState(true);
  const [portal, setPortal] = useState<any>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const loadPortal = useCallback(async () => {
    setLoading(true);
    const res = await apiService.getSchoolPortalDashboard();
    if (!res.success) {
      Alert.alert('Espace Élève', res.error || 'Impossible de charger vos données scolaires.');
      setLoading(false);
      return;
    }
    setPortal(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPortal().catch((error) => {
      console.error('Unable to load student portal', error);
      setLoading(false);
    });
  }, [loadPortal]);

  const average = useMemo(() => {
    const grades = portal?.grades || [];
    if (!grades.length) return null;
    const percentages = grades
      .map((grade: any) => ({ score: Number(grade.score), max: Number(grade.max_score) }))
      .filter((grade: { score: number; max: number }) => Number.isFinite(grade.score) && Number.isFinite(grade.max) && grade.max > 0)
      .map((grade: { score: number; max: number }) => grade.score / grade.max * 100);
    if (!percentages.length) return null;
    return Math.round(percentages.reduce((sum: number, value: number) => sum + value, 0) / percentages.length);
  }, [portal]);

  const renderModule = (key: string, label: string, icon: any, color: string) => (
    <TouchableOpacity
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected: selectedModule === key }}
      onPress={() => setSelectedModule(selectedModule === key ? null : key)}
      style={[
        styles.moduleCard,
        { backgroundColor: colors.surface, borderColor: selectedModule === key ? colors.primary : colors.border },
        isTablet && { width: '31%' }
      ]}
    >
      <View style={[styles.moduleIcon, { backgroundColor: color + '15' }]}>
        {React.cloneElement(icon, { color, size: normalize(24) })}
      </View>
      <Text style={[styles.moduleLabel, { color: colors.text.primary, fontSize: normalize(14) }]}>{label}</Text>
    </TouchableOpacity>
  );

  const getSelectedItems = () => {
    switch (selectedModule) {
      case 'schedules': return portal?.schedules || [];
      case 'grades': return portal?.grades || [];
      case 'resources': return portal?.resources || [];
      case 'fees': return portal?.fees || [];
      case 'attendance': return portal?.attendance || [];
      default: return [];
    }
  };

  const getItemLabel = (item: any) => {
    if (selectedModule === 'schedules') return `${item.day_of_week} · ${item.start_time}–${item.end_time} · ${item.subject}`;
    if (selectedModule === 'grades') return `${item.subject_name || item.title} · ${item.score}/${item.max_score}`;
    if (selectedModule === 'resources') return `${item.title}${item.description ? ` · ${item.description}` : ''}`;
    if (selectedModule === 'fees') return `Échéance ${item.due_date || 'non définie'} · ${Math.max(0, Number(item.amount_due) - Number(item.amount_paid))} $ restant`;
    return `${item.date} · ${item.status}${item.reason ? ` · ${item.reason}` : ''}`;
  };

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const student = portal?.student || user;
  const isParent = portal?.type === 'parent';
  const recentGrade = portal?.grades?.[0];
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const today = new Date();
  const todayName = dayNames[today.getDay()];
  const nextSchedule = (portal?.schedules || [])
    .map((schedule: any) => {
      const dayIndex = dayNames.findIndex((day) => day.toLowerCase() === String(schedule.day_of_week || '').toLowerCase());
      if (dayIndex < 0) return null;
      const [hours, minutes] = String(schedule.start_time || '').split(':').map(Number);
      const isToday = schedule.day_of_week?.toLowerCase() === todayName.toLowerCase();
      const [endHours, endMinutes] = String(schedule.end_time || '').split(':').map(Number);
      const isUpcomingToday = isToday && (
        hours > today.getHours() ||
        (hours === today.getHours() && minutes > today.getMinutes()) ||
        endHours > today.getHours() ||
        (endHours === today.getHours() && endMinutes > today.getMinutes())
      );
      const daysUntil = (dayIndex - today.getDay() + 7) % 7;
      return { schedule, daysUntil: isToday && !isUpcomingToday ? 7 : daysUntil };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.daysUntil - b.daysUntil || String(a.schedule.start_time).localeCompare(String(b.schedule.start_time)))[0]?.schedule;
  const unpaidFees = (portal?.fees || []).reduce((sum: number, fee: any) => sum + Math.max(0, Number(fee.amount_due) - Number(fee.amount_paid)), 0);
  const logout = async () => {
    await apiService.logoutSchoolSession();
    navigation.replace('SchoolLogin');
  };
  const selectedItems = getSelectedItems();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.schoolName, { color: colors.primary, fontSize: normalize(13) }]}>{student.school_name || user.schoolName}</Text>
          <Text style={[styles.userName, { color: colors.text.primary, fontSize: normalize(18) }]}>
            {isParent ? (portal?.parent?.full_name || user.fullName) : (student.full_name || user.fullName)}
          </Text>
          {isParent && <Text style={{ color: colors.text.secondary, marginTop: 4 }}>Suivi de : {student.full_name}</Text>}
          <View style={[styles.classBadge, { backgroundColor: '#4CAF5015' }]}>
            <Text style={[styles.classText, { color: '#4CAF50' }]}>CLASSE : {student.class_name || user.className || 'Non définie'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} accessibilityRole="button" accessibilityLabel="Se déconnecter de l’espace scolaire" style={styles.logoutBtn}>
          <LogOut size={24} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary, fontSize: normalize(16) }]}>
          {isParent ? 'Suivi de mon enfant' : 'Mon Espace Élève'}
        </Text>
        <View style={styles.moduleGrid}>
          {renderModule('schedules', `${portal?.schedules?.length || 0} cours planifiés`, <Calendar />, '#2196F3')}
          {renderModule('grades', `${portal?.grades?.length || 0} notes publiées`, <BarChart3 />, '#FF9800')}
          {renderModule('resources', `${portal?.resources?.length || 0} ressources`, <BookOpen />, '#3F51B5')}
          {renderModule('fees', `${unpaidFees} $ à payer`, <DollarSign />, '#4CAF50')}
          {renderModule('attendance', `${portal?.attendance?.length || 0} présences récentes`, <FileText />, '#9C27B0')}
        </View>
        {selectedModule && (
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary, fontSize: normalize(15) }]}>Détails</Text>
            {selectedItems.length ? selectedItems.map((item: any, index: number) => (
              <Text key={item.id || `${selectedModule}-${index}`} style={[styles.detailRow, { color: colors.text.secondary }]}>
                {getItemLabel(item)}
              </Text>
            )) : (
              <Text style={{ color: colors.text.secondary }}>Aucune information disponible pour le moment.</Text>
            )}
          </View>
        )}

        <View style={[styles.progressCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.progressTitle}>{isParent ? 'Progression de mon enfant' : 'Progression Académique'}</Text>
          <Text style={styles.progressSubtitle}>{recentGrade ? `${recentGrade.title} : ${recentGrade.score}/${recentGrade.max_score}` : 'Aucune note publiée pour le moment.'}</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${average || 0}%` }]} />
          </View>
          <Text style={styles.progressValue}>{average === null ? 'Moyenne indisponible' : `Moyenne : ${average}%`}</Text>
        </View>
        {nextSchedule && <Text style={[styles.nextCourse, { color: colors.text.secondary }]}>Prochain cours : {nextSchedule.subject} — {nextSchedule.day_of_week} {nextSchedule.start_time}</Text>}
        <TouchableOpacity style={[styles.refreshButton, { borderColor: colors.primary }]} onPress={loadPortal}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{isParent ? 'Actualiser le suivi' : 'Actualiser mes données'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 25, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  schoolName: { fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 },
  userName: { fontWeight: 'black' },
  classBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  classText: { fontSize: 10, fontWeight: '900' },
  logoutBtn: { padding: 10 },
  scrollContent: { padding: 25 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 15 },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  moduleCard: { width: '48%', padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 15, alignItems: 'center', justifyContent: 'center', height: 130 },
  moduleIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  moduleLabel: { fontWeight: '600', textAlign: 'center' },
  progressCard: { marginTop: 15, padding: 25, borderRadius: 25, elevation: 4 },
  progressTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  progressSubtitle: { color: '#fff', opacity: 0.8, fontSize: 12, marginBottom: 20 },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, marginBottom: 10 },
  progressBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  progressValue: { color: '#fff', fontWeight: 'bold', textAlign: 'right' },
  detailCard: { marginTop: 10, padding: 18, borderRadius: 16, borderWidth: 1 },
  detailRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#00000018' },
  nextCourse: { marginTop: 18, textAlign: 'center', fontWeight: '600' },
  refreshButton: { alignSelf: 'center', marginTop: 16, borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }
});
