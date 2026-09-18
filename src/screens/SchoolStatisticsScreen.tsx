import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, useWindowDimensions
} from 'react-native';
import { ArrowLeft, Users, GraduationCap, CreditCard, BarChart3, TrendingUp, TrendingDown, BookOpen } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolStatisticsScreen({ navigation, route }: any) {
  const { schoolId } = route.params || {};
  const { colors, normalize } = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, [schoolId]);

  const fetchStats = async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiService.getSchoolStats(schoolId);
      if (res.success) {
        setStats(res.data);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  };

  const renderStatCard = (title: string, value: string | number, icon: any, color: string, subtitle?: string) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
        {React.cloneElement(icon, { color, size: 24 })}
      </View>
      <View style={styles.statInfo}>
        <Text style={[styles.statValue, { color: colors.text.primary }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: colors.text.secondary }]}>{title}</Text>
        {subtitle && <Text style={[styles.statSub, { color: colors.text.disabled }]}>{subtitle}</Text>}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.text.secondary }}>Statistiques indisponibles.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary, fontWeight: 'bold' }}>RETOUR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Statistiques École</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>
          {renderStatCard('Élèves inscrits', stats.totalStudents, <Users />, '#2196F3')}
          {renderStatCard('Corps enseignant', stats.totalTeachers, <GraduationCap />, '#9C27B0')}
          {renderStatCard('Classes actives', stats.totalClasses, <BookOpen />, '#FF9800')}
          {renderStatCard('Revenus Totaux', stats.revenue + '$', <CreditCard />, '#4CAF50', `${stats.payments.paid} paiements reçus`)}
        </View>

        <View style={[styles.financeSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>État des paiements</Text>
          <View style={styles.progressRow}>
             <View style={{ flex: 1 }}>
                <View style={styles.labelRow}>
                   <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Paiements confirmés</Text>
                   <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>{stats.payments.paid}</Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                   <View style={[styles.progressFill, { width: (stats.payments.paid + stats.payments.pending > 0 ? `${(stats.payments.paid / (stats.payments.paid + stats.payments.pending)) * 100}%` : '0%') as `${number}%`, backgroundColor: '#4CAF50' }]} />
                </View>
             </View>
          </View>
          <View style={[styles.progressRow, { marginTop: 15 }]}>
             <View style={{ flex: 1 }}>
                <View style={styles.labelRow}>
                   <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Paiements en attente</Text>
                   <Text style={{ color: '#FF9800', fontWeight: 'bold' }}>{stats.payments.pending}</Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                   <View style={[styles.progressFill, { width: (stats.payments.paid + stats.payments.pending > 0 ? `${(stats.payments.pending / (stats.payments.paid + stats.payments.pending)) * 100}%` : '0%') as `${number}%`, backgroundColor: '#FF9800' }]} />
                </View>
             </View>
          </View>
        </View>

        <View style={[styles.chartSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
           <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Inscriptions des six derniers mois</Text>
           {(stats.monthlyEnrollments || []).length === 0 ? (
             <Text style={{ color: colors.text.secondary }}>Aucune inscription sur cette période.</Text>
           ) : (
             <View style={styles.chartRow}>
               {stats.monthlyEnrollments.map((item: any) => {
                 const max = Math.max(...stats.monthlyEnrollments.map((entry: any) => entry.total), 1);
                 return <View key={item.month} style={styles.barItem}><Text style={{ color: colors.text.secondary, fontSize: 11 }}>{item.total}</Text><View style={[styles.bar, { height: Math.max(8, (item.total / max) * 120), backgroundColor: colors.primary }]} /><Text style={{ color: colors.text.disabled, fontSize: 10 }}>{item.month.slice(5)}</Text></View>;
               })}
             </View>
           )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48%', padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 15 },
  iconCircle: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  statInfo: {},
  statValue: { fontSize: 24, fontWeight: 'bold', marginBottom: 2 },
  statTitle: { fontSize: 13, fontWeight: '600' },
  statSub: { fontSize: 10, marginTop: 4 },
  financeSection: { padding: 20, borderRadius: 24, borderWidth: 1, marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 20 },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%' },
  chartSection: { padding: 20, borderRadius: 24, borderWidth: 1, marginTop: 15 },
  chartRow: { height: 160, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  barItem: { alignItems: 'center', justifyContent: 'flex-end', height: 150, minWidth: 34 },
  bar: { width: 22, borderRadius: 5, marginVertical: 5 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
