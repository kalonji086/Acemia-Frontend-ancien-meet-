import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import {
  ArrowLeft, GraduationCap, Calendar, BookOpen,
  BarChart3, FileText, DollarSign, LogOut, Bell
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export default function StudentDashboard({ route, navigation }: any) {
  const { user } = route.params;
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.schoolName, { color: colors.primary, fontSize: normalize(13) }]}>{user.schoolName}</Text>
          <Text style={[styles.userName, { color: colors.text.primary, fontSize: normalize(18) }]}>{user.fullName}</Text>
          <View style={[styles.classBadge, { backgroundColor: '#4CAF5015' }]}>
            <Text style={[styles.classText, { color: '#4CAF50' }]}>CLASSE : {user.className || 'Non définie'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('ChatList')} style={styles.logoutBtn}>
          <LogOut size={24} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary, fontSize: normalize(16) }]}>Mon Espace Élève</Text>
        <View style={styles.moduleGrid}>
          {renderModule('Mon Horaire', <Calendar />, '#2196F3')}
          {renderModule('Mes Notes', <BarChart3 />, '#FF9800')}
          {renderModule('Devoirs à Faire', <FileText />, '#9C27B0')}
          {renderModule('Frais Scolaires', <DollarSign />, '#4CAF50')}
          {renderModule('Mes Cours', <BookOpen />, '#3F51B5')}
          {renderModule('Annonces', <Bell />, '#F44336')}
        </View>

        <View style={[styles.progressCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.progressTitle}>Progression Académique</Text>
          <Text style={styles.progressSubtitle}>Continue tes efforts, tu es sur la bonne voie !</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '75%' }]} />
          </View>
          <Text style={styles.progressValue}>Moyenne : 75%</Text>
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
});
