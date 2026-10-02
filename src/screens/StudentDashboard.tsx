import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, useWindowDimensions, ActivityIndicator, Alert } from 'react-native';
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
    const percentages = grades.map((grade: any) => Number(grade.score) / Number(grade.max_score || 20) * 100);
    return Math.round(percentages.reduce((sum: number, value: number) => sum + value, 0) / percentages.length);
  }, [portal]);

  const renderModule = (label: string, icon: any, color: string) => (
    <TouchableOpacity style={[styles.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border }, isTablet && { width: '31%' }]}>
      <View style={[styles.moduleIcon, { backgroundColor: color + '15' }]}>
        {React.cloneElement(icon, { color, size: normalize(24) })}
      </View>
      <Text style={[styles.moduleLabel, { color: colors.text.primary, fontSize: normalize(14) }]}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const student = portal?.student || user;
  const recentGrade = portal?.grades?.[0];
  const nextSchedule = portal?.schedules?.[0];
  const unpaidFees = (portal?.fees || []).reduce((sum: number, fee: any) => sum + Math.max(0, Number(fee.amount_due) - Number(fee.amount_paid)), 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.schoolName, { color: colors.primary, fontSize: normalize(13) }]}>{student.school_name || user.schoolName}</Text>
          <Text style={[styles.userName, { color: colors.text.primary, fontSize: normalize(18) }]}>{student.full_name || user.fullName}</Text>
          <View style={[styles.classBadge, { backgroundColor: '#4CAF5015' }]}>
            <Text style={[styles.classText, { color: '#4CAF50' }]}>CLASSE : {student.class_name || user.className || 'Non définie'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('ChatList')} style={styles.logoutBtn}>
          <LogOut size={24} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary, fontSize: normalize(16) }]}>Mon Espace Élève</Text>
        <View style={styles.moduleGrid}>
          {renderModule(`${portal?.schedules?.length || 0} cours planifiés`, <Calendar />, '#2196F3')}
          {renderModule(`${portal?.grades?.length || 0} notes publiées`, <BarChart3 />, '#FF9800')}
          {renderModule(`${portal?.resources?.length || 0} ressources`, <BookOpen />, '#3F51B5')}
          {renderModule(`${unpaidFees} $ à payer`, <DollarSign />, '#4CAF50')}
        </View>

        <View style={[styles.progressCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.progressTitle}>Progression Académique</Text>
          <Text style={styles.progressSubtitle}>{recentGrade ? `${recentGrade.title} : ${recentGrade.score}/${recentGrade.max_score}` : 'Aucune note publiée pour le moment.'}</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${average || 0}%` }]} />
          </View>
          <Text style={styles.progressValue}>{average === null ? 'Moyenne indisponible' : `Moyenne : ${average}%`}</Text>
        </View>
        {nextSchedule && <Text style={[styles.nextCourse, { color: colors.text.secondary }]}>Prochain cours : {nextSchedule.subject} — {nextSchedule.day_of_week} {nextSchedule.start_time}</Text>}
        <TouchableOpacity style={[styles.refreshButton, { borderColor: colors.primary }]} onPress={loadPortal}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Actualiser mes données</Text>
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
  progressValue: { color: '#fff', fontWeight: 'bold', textAlign: 'right' }
  ,nextCourse: { marginTop: 18, textAlign: 'center', fontWeight: '600' },
  refreshButton: { alignSelf: 'center', marginTop: 16, borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }
});
