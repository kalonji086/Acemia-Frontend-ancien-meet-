import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, useWindowDimensions, ActivityIndicator, Alert } from 'react-native';
import {
  GraduationCap, Users, ShieldAlert, BarChart3,
  Calendar, BookOpen, UserCheck, UserRound, LogOut,
  FileText, DollarSign, ListChecks
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolStaffDashboard({ route, navigation }: any) {
  const { user, role } = route.params;
  const { colors, normalize } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;
  const [loading, setLoading] = useState(true);
  const [portal, setPortal] = useState<any>(null);

  const loadPortal = useCallback(async () => {
    setLoading(true);
    const response = await apiService.getSchoolPortalDashboard();
    if (response.success) {
      setPortal(response.data);
    } else {
      Alert.alert('Espace Personnel', response.error || 'Impossible de charger les données scolaires.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPortal().catch((error) => {
      console.error('Unable to load staff portal', error);
      setLoading(false);
    });
  }, [loadPortal]);

  const renderModule = (label: string, icon: any, color: string, screen: string, extraParams: Record<string, unknown> = {}) => (
    <TouchableOpacity
      key={label}
      style={[styles.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border }, isTablet && { width: '31%' }]}
      accessibilityRole="button"
      onPress={() => navigation.navigate(screen, { schoolRole: role, ...extraParams })}
    >
      <View style={[styles.moduleIcon, { backgroundColor: color + '15' }]}>
        {React.cloneElement(icon, { color, size: normalize(24) })}
      </View>
      <Text style={[styles.moduleLabel, { color: colors.text.primary, fontSize: normalize(14) }]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderRoleSpecificModules = () => {
    switch (role) {
      case 'prefet':
        return (
          <>
            {renderModule('Présences & Absences', <ShieldAlert />, '#F44336', 'SchoolAttendance')}
            {renderModule('Rapports scolaires', <FileText />, '#FF9800', 'SchoolReports')}
            {renderModule('Élèves & Classes', <Users />, '#2196F3', 'SchoolStudents')}
            {renderModule('Horaires scolaires', <Calendar />, '#9C27B0', 'SchoolSchedule')}
          </>
        );
      case 'directeur':
        return (
          <>
            {renderModule('État Financier Global', <DollarSign />, '#4CAF50', 'SchoolReports')}
            {renderModule('Gestion du Personnel', <UserCheck />, '#673AB7', 'SchoolAccounts')}
            {renderModule('Gestion des Classes', <BookOpen />, '#FF5722', 'SchoolClasses')}
            {renderModule('Évaluations & Notes', <BarChart3 />, '#3F51B5', 'SchoolGrades')}
            {renderModule('Élèves & Inscriptions', <Users />, '#E91E63', 'SchoolStudents')}
            {renderModule('Horaires & Cours', <Calendar />, '#2196F3', 'SchoolSchedule')}
            {renderModule('Frais Scolaires', <DollarSign />, '#FF9800', 'SchoolFees')}
            {renderModule('Présences', <ListChecks />, '#00BCD4', 'SchoolAttendance')}
            {renderModule('Comptes Parents', <UserRound />, '#795548', 'SchoolParents')}
            {renderModule('Demandes d’admission', <GraduationCap />, '#009688', 'SchoolAdmissions', { mode: 'inbox' })}
          </>
        );
      case 'enseignant':
        return (
          <>
            {renderModule('Appel de Classe', <ListChecks />, '#00BCD4', 'SchoolAttendance')}
            {renderModule('Élèves de mes classes', <BookOpen />, '#795548', 'SchoolStudents')}
            {renderModule('Mes Horaires', <Calendar />, '#4CAF50', 'SchoolSchedule')}
          </>
        );
      case 'professeur':
        return (
          <>
            {renderModule('Gestion des Cours', <BookOpen />, '#3F51B5', 'SchoolSchedule')}
            {renderModule('Saisie des Notes', <BarChart3 />, '#FF9800', 'SchoolGrades')}
            {renderModule('Mes Élèves', <Users />, '#2196F3', 'SchoolStudents')}
          </>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const staff = portal?.staff || user;
  const stats = portal?.stats || {};
  const logout = async () => {
    await apiService.logoutSchoolSession();
    navigation.replace('SchoolLogin');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.schoolName, { color: colors.primary, fontSize: normalize(13) }]}>{staff.school_name || user.schoolName}</Text>
          <Text style={[styles.userName, { color: colors.text.primary, fontSize: normalize(18) }]}>{staff.full_name || user.fullName}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.roleText, { color: colors.primary }]}>{role.toUpperCase()}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} accessibilityRole="button" accessibilityLabel="Se déconnecter de l’espace scolaire" style={styles.logoutBtn}>
          <LogOut size={24} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary, fontSize: normalize(16) }]}>Modules de Gestion</Text>
        <View style={styles.moduleGrid}>
          {renderRoleSpecificModules()}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text.primary, fontSize: normalize(16), marginTop: 25 }]}>Informations Rapides</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Calendar size={18} color={colors.text.secondary} />
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>{stats.totalStudents || 0} élèves actifs</Text>
          </View>
          <View style={styles.infoRow}>
            <GraduationCap size={18} color={colors.text.secondary} />
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>{portal?.schedules?.length || 0} cours planifiés</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.refreshButton, { borderColor: colors.primary }]} onPress={loadPortal}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Actualiser</Text>
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
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  roleText: { fontSize: 10, fontWeight: '900' },
  logoutBtn: { padding: 10 },
  scrollContent: { padding: 25 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 15 },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  moduleCard: { width: '48%', padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 15, alignItems: 'center', justifyContent: 'center', height: 130 },
  moduleIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  moduleLabel: { fontWeight: '600', textAlign: 'center' },
  infoCard: { padding: 20, borderRadius: 20, borderWidth: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { marginLeft: 10, fontWeight: '500' },
  refreshButton: { alignSelf: 'center', marginTop: 18, borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }
});
