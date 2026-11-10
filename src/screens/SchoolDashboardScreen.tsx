import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Modal
} from 'react-native';
import { ArrowLeft, Users, GraduationCap, BookOpen, DollarSign, Clock, RefreshCw, Menu, X, School } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';
import SchoolSideMenu from '../components/SchoolSideMenu';

export default function SchoolDashboardScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= 1200;

  const [loading, setLoading] = useState(true);
  const [hasRequest, setHasRequest] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const normalizeSchoolStatus = (status: string | null | undefined) => {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'approuve' || value === 'approuvé') return 'approuve';
    if (value === 'rejete' || value === 'rejeté') return 'rejete';
    if (value === 'en attente' || value === 'en_attente') return 'en_attente';
    return value;
  };

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res: any = await apiService.getSchoolStatus();
      if (res.success && res.hasRequest) {
        const status = normalizeSchoolStatus(res.data?.status);
        setHasRequest(true);
        setRequestStatus(status);

        if (status === 'approuve') {
          const dashRes = await apiService.getSchoolDashboard();
          if (dashRes.success) {
            setDashboardData(dashRes);
          } else {
            Alert.alert('Tableau de bord', dashRes.error || 'Impossible de charger les données de l’école.');
          }
        }
      } else {
        setHasRequest(false);
        setRequestStatus(null);
        if (!res.success) {
          Alert.alert('École', res.error || 'Impossible de vérifier le statut de l’école.');
        }
      }
    } catch (e) {
      console.error('Unable to load school dashboard', e);
      Alert.alert('Tableau de bord', 'Impossible de charger les données de l’école.');
    } finally {
      setLoading(false);
    }
  };

  const renderStatCard = (title: string, value: string | number, icon: any, color: string) => (
    <View style={[
      styles.statCard,
      { backgroundColor: colors.surface, borderColor: colors.border },
      isWide && { width: '23%', marginBottom: 0 }
    ]}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        {React.cloneElement(icon, { color, size: normalize(24) })}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.statValue, { color: colors.text.primary, fontSize: normalize(18) }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: colors.text.secondary, fontSize: normalize(12) }]} numberOfLines={1}>{title}</Text>
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

  if (!hasRequest) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: normalize(18) }]}>Gestion École</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SchoolLogin')}>
            <School size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centeredContent}>
          <GraduationCap size={80} color={colors.primary} style={{ marginBottom: 20 }} />
          <Text style={[styles.mainText, { color: colors.text.primary, fontSize: normalize(20) }]}>Vous n'avez pas d'école</Text>
          <Text style={[styles.subText, { color: colors.text.secondary, fontSize: normalize(14) }]}>
            Créez votre profil de promoteur et enregistrez votre école pour accéder à votre tableau de bord.
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('SchoolRequest')}
          >
            <Text style={styles.actionButtonText}>Créer une École</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (requestStatus === 'en_attente') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: normalize(18) }]}>Demande en attente</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centeredContent}>
          <Clock size={80} color="#FF9800" style={{ marginBottom: 20 }} />
          <Text style={[styles.mainText, { color: colors.text.primary, fontSize: normalize(20) }]}>Demande En Attente</Text>
          <Text style={[styles.subText, { color: colors.text.secondary, fontSize: normalize(14) }]}>
            Votre demande est en cours d'examen par notre équipe administrative. Dès qu'elle sera approuvée, votre tableau de bord complet s'activera ici automatiquement.
          </Text>
          <TouchableOpacity
            style={[styles.refreshButton, { borderColor: colors.primary }]}
            onPress={checkStatus}
          >
            <RefreshCw size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.refreshButtonText, { color: colors.primary }]}>Actualiser le statut</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (requestStatus === 'rejete') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: normalize(18) }]}>Demande Refusée</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centeredContent}>
          <Text style={[styles.mainText, { color: colors.text.primary, fontSize: normalize(20) }]}>Demande Non Approuvée</Text>
          <Text style={[styles.subText, { color: colors.text.secondary, fontSize: normalize(14) }]}>
            Malheureusement, votre demande de création d'école n'a pas pu être validée par les administrateurs. Veuillez contacter le support pour plus d'informations.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const school = dashboardData?.school || {};
  const stats = dashboardData?.stats || {};

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Menu size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center', flex: 1, paddingHorizontal: 10 }}>
          <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: normalize(16) }]} numberOfLines={1}>
            {school.school_name || 'Dashboard École'}
          </Text>
          <Text style={{ color: '#4CAF50', fontSize: normalize(11), fontWeight: 'bold' }}>PROMOTEUR AGRÉÉ</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('ChatList')}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Menu Latéral Custom via Modal pour compatibilité Mobile & Tablettes complète */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.menuDrawerContainer, { width: windowWidth * 0.75, maxWidth: 320 }]}>
            <SchoolSideMenu
              navigation={navigation}
              schoolName={school.school_name}
              onClose={() => setMenuVisible(false)}
            />
            <TouchableOpacity style={styles.closeDrawerButton} onPress={() => setMenuVisible(false)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.statsGrid, isWide && styles.tabletRow]}>
          {renderStatCard('Élèves', stats.totalStudents || 0, <Users />, colors.primary)}
          {renderStatCard('Enseignants', stats.totalTeachers || 0, <GraduationCap />, '#4CAF50')}
          {renderStatCard('Classes', stats.totalClasses || 0, <BookOpen />, '#2196F3')}
          {renderStatCard('Revenus', stats.monthlyRevenue || '0 $', <DollarSign />, '#FF9800')}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text.primary, fontSize: normalize(16) }]}>
          Outils de gestion disponibles
        </Text>
        <View style={[styles.menuGrid, isWide && styles.tabletRow]}>
          <TouchableOpacity style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }, isWide && { flex: 1, marginRight: 10 }]} onPress={() => navigation.navigate('SchoolStudents')}>
            <Users size={28} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text.primary }]}>Inscriptions & Élèves</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }, isWide && { flex: 1, marginRight: 10 }]} onPress={() => navigation.navigate('SchoolClasses')}>
            <GraduationCap size={28} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text.primary }]}>Gestion des Classes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }, isWide && { flex: 1, marginRight: 10 }]} onPress={() => navigation.navigate('SchoolSchedule')}>
            <BookOpen size={28} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text.primary }]}>Horaires & Cours</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }, isWide && { flex: 1 }]} onPress={() => navigation.navigate('SchoolFees')}>
            <DollarSign size={28} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text.primary }]}>Frais Scolaires</Text>
          </TouchableOpacity>
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
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd'
  },
  headerTitle: { fontWeight: 'bold' },
  centeredContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  mainText: { fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subText: { textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  actionButton: { paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12 },
  actionButtonText: { color: '#fff', fontWeight: 'bold' },
  refreshButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  refreshButtonText: { fontWeight: 'bold' },
  scrollContent: { padding: 20, width: '100%', maxWidth: 1280, alignSelf: 'center' },
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
  statTitle: {},
  sectionTitle: { fontWeight: 'bold', marginBottom: 15 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  menuCard: { width: '48%', padding: 20, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', height: 120, marginBottom: 15 },
  menuText: { fontWeight: '600', marginTop: 12, textAlign: 'center', fontSize: 13 },
  tabletRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'nowrap', width: '100%', marginBottom: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
  menuDrawerContainer: { height: '100%', backgroundColor: '#fff', position: 'relative' },
  closeDrawerButton: { position: 'absolute', top: 20, right: -45, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20, padding: 8 }
});
