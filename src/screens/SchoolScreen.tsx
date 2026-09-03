import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, FlatList, Alert, Dimensions } from 'react-native';
import { GraduationCap, Users, BookOpen, CreditCard, MessageSquare, Plus, ChevronRight, CheckCircle, Clock, Star, ShieldCheck, Building2, ArrowRight } from 'lucide-react-native';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const tabs = ['Répertoire', 'Mon Dashboard'];

export default function SchoolScreen({ navigation }: any) {
  const { colors, normalize, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('Répertoire');
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiService.getSchoolOverview();
      if (res.success) {
        setOverview(res.data);
        setSchools(res.data.worldSchools || []);

        if (res.data.mySchool) {
          fetchDashboard(res.data.mySchool.id);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchDashboard = async (schoolId: string) => {
    try {
      const res = await apiService.getSchoolDashboard(schoolId);
      if (res.success) setDashboard(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    loadData();

    socketService.on('school:new_grade', (data: any) => {
      Alert.alert('Nouvelle Note !', `Vous avez reçu une note en ${data.subject}: ${data.score}/20`);
      if (overview?.mySchool) fetchDashboard(overview.mySchool.id);
    });

    socketService.on('school:approved', (data: any) => {
      Alert.alert('Établissement Approuvé !', `Votre école ${data.schoolName} a été validée par l'administration.`);
      loadData();
    });

    return () => {
      socketService.off('school:new_grade');
      socketService.off('school:approved');
    };
  }, []);

  const handleRoleSelection = (role: 'promoter' | 'parent' | 'student') => {
    if (role === 'promoter') {
      if (overview?.mySchool) {
        setActiveTab('Mon Dashboard');
      } else {
        navigation.navigate('SchoolRegistration');
      }
    } else {
      setActiveTab('Mon Dashboard');
    }
  };

  const renderSchoolCard = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.schoolCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => navigation.navigate('SchoolProfile', { schoolId: item.id })}
    >
      <Image source={{ uri: item.logo_url || 'https://placehold.co/100x100?text=School' }} style={styles.schoolLogo} />
      <View style={styles.schoolInfo}>
        <Text style={[styles.schoolName, { color: colors.text.primary }]}>{item.name}</Text>
        <Text style={[styles.schoolMeta, { color: colors.text.secondary }]}>{item.city}, {item.country}</Text>
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.tagText, { color: colors.primary }]}>{item.school_type}</Text>
          </View>
          {item.status === 'approved' && <ShieldCheck size={14} color="#4CAF50" />}
        </View>
      </View>
      <ChevronRight size={20} color={colors.text.disabled} />
    </TouchableOpacity>
  );

  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
        <View style={styles.welcomeHeader}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primary + '15', width: normalize(80), height: normalize(80), borderRadius: normalize(40) }]}>
            <GraduationCap size={normalize(40)} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text.primary, fontSize: normalize(28) }]}>Meet School</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary, fontSize: normalize(16) }]}>
            Le portail éducatif mondial pour parents, élèves et établissements.
          </Text>
        </View>

        <View style={styles.questionContainer}>
          <Text style={[styles.questionText, { color: colors.text.primary, fontSize: normalize(18) }]}>Votre profil scolaire</Text>

          <View style={styles.roleGrid}>
            <RoleCard
              title="Parent / Élève"
              desc="Suivi académique et paiements"
              icon={<Users size={24} color="#4CAF50" />}
              onPress={() => handleRoleSelection('parent')}
              colors={colors}
              normalize={normalize}
            />
            <RoleCard
              title="Promoteur"
              desc="Gérer votre établissement"
              icon={<Building2 size={24} color={colors.primary} />}
              onPress={() => handleRoleSelection('promoter')}
              colors={colors}
              normalize={normalize}
            />
          </View>
        </View>

        <Text style={[styles.sectionHeader, { color: colors.text.primary, marginTop: 30, marginBottom: 15 }]}>Découvrir des écoles</Text>
    </View>
  );

  const renderStudentDashboard = () => (
    <View style={styles.dashContainer}>
      <View style={styles.dashHeaderRow}>
        <Text style={[styles.dashTitle, { color: colors.text.primary }]}>Mon Espace Élève</Text>
        <TouchableOpacity onPress={() => setActiveTab('Répertoire')}><Text style={{color: colors.primary, fontWeight:'bold'}}>RETOUR</Text></TouchableOpacity>
      </View>

      <View style={styles.grid}>
        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Star size={24} color="#FFD700" />
          <Text style={[styles.statVal, { color: colors.text.primary }]}>{dashboard?.grades?.length || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Notes</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <BookOpen size={24} color={colors.primary} />
          <Text style={[styles.statVal, { color: colors.text.primary }]}>{dashboard?.assignments?.length || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Devoirs</Text>
        </View>
      </View>

      <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>Dernières Notes</Text>
      {dashboard?.grades?.map((g: any, i: number) => (
        <View key={i} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.itemTitle, { color: colors.text.primary }]}>{g.subject}</Text>
            <Text style={[styles.itemSub, { color: colors.text.secondary }]}>{new Date(g.created_at).toLocaleDateString()}</Text>
          </View>
          <Text style={[styles.scoreText, { color: colors.primary }]}>{g.score}/{g.max_score || 20}</Text>
        </View>
      ))}
    </View>
  );

  const renderParentDashboard = () => (
    <View style={styles.dashContainer}>
      <View style={styles.dashHeaderRow}>
        <Text style={[styles.dashTitle, { color: colors.text.primary }]}>Espace Parent</Text>
        <TouchableOpacity onPress={() => setActiveTab('Répertoire')}><Text style={{color: colors.primary, fontWeight:'bold'}}>RETOUR</Text></TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
        <Plus size={20} color="#fff" />
        <Text style={styles.actionBtnText}>Inscrire un enfant</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>Mes Enfants</Text>
      {dashboard?.children?.map((c: any, i: number) => (
        <TouchableOpacity key={i} style={[styles.childCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Users size={24} color={colors.text.secondary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.childName, { color: colors.text.primary }]}>{c.first_name} {c.last_name}</Text>
            <Text style={[styles.childClass, { color: colors.text.secondary }]}>{c.grade_level}</Text>
          </View>
          <ChevronRight size={20} color={colors.text.disabled} />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAdminDashboards = () => (
    <ScrollView style={styles.dashContainer}>
       <View style={styles.dashHeaderRow}>
         <Text style={[styles.dashTitle, { color: colors.text.primary }]}>
           Dashboard {overview?.role === 'promoter' ? 'Promoteur' : 'Directeur'}
         </Text>
         <TouchableOpacity onPress={() => setActiveTab('Répertoire')}><Text style={{color: colors.primary, fontWeight:'bold'}}>RETOUR</Text></TouchableOpacity>
       </View>

       <View style={styles.grid}>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Users size={24} color="#2196F3" />
            <Text style={[styles.statVal, { color: colors.text.primary }]}>{dashboard?.stats?.totalStudents || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Élèves</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <CreditCard size={24} color="#4CAF50" />
            <Text style={[styles.statVal, { color: colors.text.primary }]}>{dashboard?.stats?.revenue || 0}$</Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Revenus</Text>
          </View>
       </View>

       <View style={styles.adminActions}>
          <AdminActionItem icon={<Users />} label="Demander compte Staff" onPress={() => Alert.alert('Staff', 'Formulaire de demande staff à venir.')} colors={colors} />
          <AdminActionItem icon={<GraduationCap />} label="Gérer Classes" colors={colors} />
          <AdminActionItem icon={<MessageSquare />} label="Annonces École" colors={colors} />
       </View>
    </ScrollView>
  );

  const renderCurrentTab = () => {
    if (activeTab === 'Répertoire') {
      return (
        <FlatList
          data={schools}
          renderItem={renderSchoolCard}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={renderWelcome}
          ListEmptyComponent={<ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}
        />
      );
    }

    if (activeTab === 'Mon Dashboard') {
      if (!overview?.mySchool) return (
        <View style={styles.centered}>
           <GraduationCap size={60} color={colors.text.disabled} />
           <Text style={{ color: colors.text.secondary, marginTop: 20, textAlign: 'center' }}>Vous n'êtes membre d'aucune école.</Text>
           <TouchableOpacity onPress={() => setActiveTab('Répertoire')} style={{ marginTop: 20 }}><Text style={{ color: colors.primary, fontWeight: 'bold' }}>RETOUR</Text></TouchableOpacity>
        </View>
      );

      switch (overview.role) {
        case 'student': return renderStudentDashboard();
        case 'parent': return renderParentDashboard();
        case 'teacher': return <View style={styles.centered}><Text style={{ color: colors.text.primary }}>Dashboard Enseignant (À venir)</Text></View>;
        case 'director':
        case 'promoter': return renderAdminDashboards();
        default: return <View style={styles.centered}><Text style={{ color: colors.text.primary }}>Accès limité.</Text></View>;
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderCurrentTab()}
    </View>
  );
}

const RoleCard = ({ title, desc, icon, onPress, colors, normalize }: any) => (
  <TouchableOpacity
    style={[styles.roleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    onPress={onPress}
  >
    <View style={styles.roleIcon}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.roleTitle, { color: colors.text.primary }]}>{title}</Text>
      <Text style={[styles.roleDesc, { color: colors.text.secondary }]}>{desc}</Text>
    </View>
    <ArrowRight size={18} color={colors.text.disabled} />
  </TouchableOpacity>
);

const AdminActionItem = ({ icon, label, onPress, colors }: any) => (
  <TouchableOpacity onPress={onPress} style={[styles.adminAction, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    {React.cloneElement(icon, { color: colors.primary, size: 24 })}
    <Text style={[styles.adminActionLabel, { color: colors.text.primary }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  welcomeContainer: { padding: 20, paddingTop: 60 },
  welcomeHeader: { alignItems: 'center', marginBottom: 40 },
  iconBadge: { justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
  questionContainer: { width: '100%' },
  questionText: { fontWeight: '700', marginBottom: 20 },
  roleGrid: { gap: 12 },
  roleCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, borderWidth: 1 },
  roleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  roleTitle: { fontWeight: 'bold', fontSize: 16 },
  roleDesc: { fontSize: 12, marginTop: 2 },
  schoolCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, marginBottom: 15, borderWidth: 1, marginHorizontal: 20 },
  schoolLogo: { width: 60, height: 60, borderRadius: 15 },
  schoolInfo: { flex: 1, marginLeft: 15 },
  schoolName: { fontWeight: 'bold', fontSize: 16 },
  schoolMeta: { fontSize: 12, marginTop: 2 },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
  tagText: { fontSize: 10, fontWeight: 'bold' },
  dashContainer: { padding: 20, paddingTop: 60 },
  dashHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  dashTitle: { fontSize: 22, fontWeight: '900' },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statBox: { width: '48%', padding: 20, borderRadius: 24, borderWidth: 1, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '900', marginTop: 10 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5 },
  itemTitle: { fontWeight: 'bold' },
  itemSub: { fontSize: 11, marginTop: 2 },
  scoreText: { fontSize: 18, fontWeight: '900' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, justifyContent: 'center', marginBottom: 25 },
  actionBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 10 },
  childCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  childName: { fontWeight: 'bold' },
  childClass: { fontSize: 12 },
  adminActions: { gap: 12 },
  adminAction: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, borderWidth: 1 },
  adminActionLabel: { fontWeight: 'bold', marginLeft: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  input: { padding: 18, borderRadius: 18, borderWidth: 1, marginBottom: 15, fontSize: 16 },
  submitBtn: { padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});