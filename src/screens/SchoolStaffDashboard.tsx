import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import {
  ArrowLeft, GraduationCap, Users, ShieldAlert, BarChart3,
  Calendar, BookOpen, UserCheck, MessageSquare, Bell, LogOut,
  FileText, TrendingUp, DollarSign, ListChecks
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export default function SchoolStaffDashboard({ route, navigation }: any) {
  const { user, role } = route.params;
  const { colors, normalize } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;

  const renderModule = (label: string, icon: any, color: string) => (
    <TouchableOpacity style={[styles.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border }, isTablet && { width: '31%' }]}>
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
            {renderModule('Discipline & Sanctions', <ShieldAlert />, '#F44336')}
            {renderModule('Rapports de Conduite', <FileText />, '#FF9800')}
            {renderModule('Suivi des Bulletins', <BarChart3 />, '#2196F3')}
            {renderModule('Absences Générales', <Users />, '#9C27B0')}
          </>
        );
      case 'directeur':
        return (
          <>
            {renderModule('État Financier Global', <DollarSign />, '#4CAF50')}
            {renderModule('Gestion du Personnel', <UserCheck />, '#673AB7')}
            {renderModule('Notes Circulaires', <Bell />, '#FF5722')}
            {renderModule('Statistiques École', <TrendingUp />, '#3F51B5')}
          </>
        );
      case 'enseignant':
        return (
          <>
            {renderModule('Appel de Classe', <ListChecks />, '#00BCD4')}
            {renderModule('Journal de Classe', <BookOpen />, '#795548')}
            {renderModule('Suivi Élèves', <Users />, '#E91E63')}
            {renderModule('Mes Horaires', <Calendar />, '#4CAF50')}
          </>
        );
      case 'professeur':
        return (
          <>
            {renderModule('Gestion des Cours', <BookOpen />, '#3F51B5')}
            {renderModule('Saisie des Notes', <BarChart3 />, '#FF9800')}
            {renderModule('Devoirs & Travaux', <FileText />, '#009688')}
            {renderModule('Messagerie Parents', <MessageSquare />, '#2196F3')}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.schoolName, { color: colors.primary, fontSize: normalize(13) }]}>{user.schoolName}</Text>
          <Text style={[styles.userName, { color: colors.text.primary, fontSize: normalize(18) }]}>{user.fullName}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.roleText, { color: colors.primary }]}>{role.toUpperCase()}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('ChatList')} style={styles.logoutBtn}>
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
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>Année Scolaire 2026-2027</Text>
          </View>
          <View style={styles.infoRow}>
            <GraduationCap size={18} color={colors.text.secondary} />
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>Trimestre 1 en cours</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  infoText: { marginLeft: 10, fontWeight: '500' }
});
