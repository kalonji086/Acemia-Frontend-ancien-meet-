import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, FlatList,
  useWindowDimensions
} from 'react-native';
import {
  Plus, Users, Briefcase, TrendingUp, ChevronRight,
  Settings, Bell, Search, Filter
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function EmployerDashboardScreen({ navigation }: any) {
  const { colors, normalize, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalApplications: 0,
    views: 0
  });

  useEffect(() => {
    // Simuler le chargement des stats
    setTimeout(() => {
      setStats({ activeJobs: 3, totalApplications: 124, views: 1540 });
      setLoading(false);
    }, 1000);
  }, []);

  const renderStatCard = (title: string, value: string | number, icon: any, color: string) => (
    <View style={[
      styles.statCard,
      { backgroundColor: colors.surface, borderColor: colors.border },
      isTablet && { width: '31%' }
    ]}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        {React.cloneElement(icon, { color, size: normalize(24) })}
      </View>
      <View>
        <Text style={[styles.statValue, { color: colors.text.primary, fontSize: normalize(18) }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: colors.text.secondary, fontSize: normalize(12) }]}>{title}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, paddingHorizontal: isTablet ? '5%' : 20 }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.text.secondary, fontSize: normalize(13) }]}>Dashboard Employeur</Text>
          <Text style={[styles.companyName, { color: colors.text.primary, fontSize: normalize(20) }]}>Together Tech</Text>
        </View>
        <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.background }]}>
          <Bell size={normalize(22)} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isTablet ? '5%' : 20 }]}>
        <View style={styles.statsGrid}>
          {renderStatCard('Offres actives', stats.activeJobs, <Briefcase />, colors.primary)}
          {renderStatCard('Candidats', stats.totalApplications, <Users />, '#4CAF50')}
          {renderStatCard('Vues', stats.views, <TrendingUp />, '#2196F3')}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary, fontSize: normalize(18) }]}>Actions rapides</Text>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('CreateJobPosting')}
          >
            <Plus size={normalize(28)} color="#fff" />
            <Text style={[styles.actionText, { fontSize: normalize(14) }]}>Publier une offre</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={normalize(28)} color={colors.text.primary} />
            <Text style={[styles.actionText, { color: colors.text.primary, fontSize: normalize(14) }]}>Chercher talents</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary, fontSize: normalize(18) }]}>Offres récentes</Text>
          <TouchableOpacity>
            <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: normalize(14) }}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {/* Liste factice d'offres */}
        <View style={isTablet ? styles.row : styles.column}>
          {[1, 2].map((i) => (
            <TouchableOpacity key={i} style={[
              styles.jobCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              isTablet && { flex: 1, marginHorizontal: 5 }
            ]}>
              <View style={styles.jobInfo}>
                <Text style={[styles.jobTitle, { color: colors.text.primary, fontSize: normalize(16) }]}>Développeur Fullstack Senior</Text>
                <Text style={[styles.jobMeta, { color: colors.text.secondary, fontSize: normalize(12) }]}>CDI • Kinshasa • Il y a 2 jours</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.appBadge, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.appBadgeText, { color: colors.primary, fontSize: normalize(11) }]}>45 candidatures</Text>
                  </View>
                </View>
              </View>
              <ChevronRight size={normalize(20)} color={colors.text.disabled} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd'
  },
  greeting: { fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  companyName: { fontWeight: 'bold', marginTop: 2 },
  iconButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingVertical: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
  statCard: {
    width: '48%',
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statValue: { fontWeight: 'bold' },
  statTitle: { },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontWeight: 'bold' },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  actionCard: {
    width: '48%',
    height: 120,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  actionText: { fontWeight: 'bold', marginTop: 10, textAlign: 'center' },
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1
  },
  jobInfo: { flex: 1 },
  jobTitle: { fontWeight: 'bold', marginBottom: 4 },
  jobMeta: { marginBottom: 10 },
  badgeRow: { flexDirection: 'row' },
  appBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  appBadgeText: { fontWeight: '700' },
  row: { flexDirection: 'row' },
  column: { flexDirection: 'column' }
});
