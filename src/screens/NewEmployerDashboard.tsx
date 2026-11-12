import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Menu,
  Bell,
  Search,
  Plus,
  Users,
  Briefcase,
  TrendingUp,
  Eye,
  Calendar,
  ChevronRight,
  RefreshCw,
  Download,
  Filter,
  Home,
  LogOut
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import SimpleChart from '../components/SimpleChart';
import PieChart from '../components/PieChart';
import SideMenu from '../components/SideMenu';
import { SOCKET_URL } from '../utils/constants';
import { Image } from 'react-native';

export default function NewEmployerDashboard({ navigation }: any) {
  const { colors, normalize, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;
  
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [analyticsOffset, setAnalyticsOffset] = useState(0);
  const dashboardScrollRef = useRef<ScrollView>(null);
  const [companyName, setCompanyName] = useState('');
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalApplications: 0,
    totalViews: 0,
    conversionRate: 0
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [chartData, setChartData] = useState({
    views: [0, 0, 0, 0, 0, 0, 0],
    applications: [0, 0, 0, 0, 0, 0, 0],
    categories: [
      { label: 'Aucune donnée', value: 1, color: '#ccc' }
    ]
  });

  useEffect(() => {
    fetchDashboardData();

    // Sockets pour temps réel
    socketService.on('employer:new_application', (data: any) => {
      fetchDashboardData(); // Recharger stats et listes
      Alert.alert('Nouveauté !', `Nouvelle candidature pour: ${data.jobTitle}`);
    });

    socketService.on('new_message', (data: any) => {
       // Si le message vient d'une conversation avec un candidat, rafraîchir la liste des chats
       fetchRecentChats();
    });

    return () => {
      socketService.off('employer:new_application');
      socketService.off('new_message');
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. Récupérer les données utilisateur
      const user = await apiService.getCurrentUser();
      setUserName(user?.full_name || '');
      
      // 2. Récupérer le statut employeur
      const statusRes = await apiService.getEmployerStatus();
      if (statusRes.success && statusRes.data?.profile?.company_name) {
        setCompanyName(statusRes.data.profile.company_name);
      }

      // 3. Récupérer les offres réelles
      const jobsRes = await apiService.getMyJobs();
      if (jobsRes.success) {
        setRecentJobs(jobsRes.data.slice(0, 4));
        setStats(prev => ({
          ...prev,
          activeJobs: jobsRes.data.length
        }));
      }

      // 4. Récupérer les candidatures
      const appRes = await apiService.getApplications();
      if (appRes.success && Array.isArray(appRes.data)) {
        setApplications(appRes.data.slice(0, 5));
      } else {
        setApplications([]);
      }

      // 5. Récupérer les discussions récentes
      fetchRecentChats();

      // 6. Récupérer les analytiques réelles
      const analyticsRes = await apiService.getEmployerAnalytics();
      if (analyticsRes.success) {
        const d = analyticsRes.data;
        setStats(prev => ({
          ...prev,
          totalApplications: d.totalApplications,
          totalViews: d.totalViews,
          conversionRate: d.totalViews > 0 ? Math.round((d.totalApplications / d.totalViews) * 100) : 0
        }));

        setChartData({
          views: d.dailyViews,
          applications: d.dailyApplications,
          categories: d.categories.length > 0 ? d.categories : [
            { label: 'Aucune donnée', value: 1, color: colors.border }
          ]
        });
      }
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentChats = async () => {
    try {
      const res = await apiService.getEmployerRecentChats();
      if (res.success && Array.isArray(res.data)) {
        setRecentChats(res.data);
      } else {
        setRecentChats([]);
      }
    } catch (e) {
      console.error("Error fetching chats", e);
      setRecentChats([]);
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      const res = await apiService.exportEmployerData();
      if (res.success) {
        Alert.alert('Succès', 'Vos données ont été exportées. Format: ' + res.message);
        console.log('Export data:', res.data);
      }
    } catch (e) {
      Alert.alert('Erreur', 'Échec de l\'exportation');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanning = () => {
    console.log("Planning button pressed");
    try {
      navigation.navigate('EmployerPlanning');
    } catch (e) {
      console.error("Navigation to Planning failed", e);
      Alert.alert('Erreur', 'Impossible d\'ouvrir le module de planification.');
    }
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleAnalytics = () => {
    dashboardScrollRef.current?.scrollTo({ y: analyticsOffset, animated: true });
    void fetchDashboardData();
  };

  const renderStatCard = (title: string, value: string | number, icon: any, color: string, change?: number) => (
    <View style={[
      styles.statCard,
      { backgroundColor: colors.surface, borderColor: colors.border },
      isTablet && { width: '48%' }
    ]}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          {React.cloneElement(icon, { color, size: normalize(20) })}
        </View>
        {change !== undefined && (
          <View style={[
            styles.changeBadge,
            { backgroundColor: change >= 0 ? '#4CAF50' + '20' : '#FF3B30' + '20' }
          ]}>
            <Text style={[
              styles.changeText,
              { color: change >= 0 ? '#4CAF50' : '#FF3B30' }
            ]}>
              {change >= 0 ? '+' : ''}{change}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.statValue, { color: colors.text.primary }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.text.secondary }]}>{title}</Text>
    </View>
  );

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http')) return url;
    return `${SOCKET_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.text.secondary }}>Chargement du dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Menu latéral via Modal */}
      <Modal visible={showMenu} transparent animationType="slide">
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
            onPress={() => setShowMenu(false)}
            activeOpacity={1}
          />
          <View style={{ width: 280 }}>
            <SideMenu
              navigation={navigation}
              activeRoute="EmployerDashboard"
              userName={userName}
              companyName={companyName}
              onAnalytics={handleAnalytics}
              onClose={() => setShowMenu(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Contenu principal */}
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuButton}>
            <Menu size={24} color={colors.text.primary} />
          </TouchableOpacity>
          
          <Image source={require('../../assets/AcemiaLogo.png')} style={[styles.brandLogo, { backgroundColor: `${colors.primary}12` }]} resizeMode="contain" />
          <View style={styles.headerCenter}>
            <Text style={[styles.headerBrand, { color: colors.text.primary }]}>Acemia Emploi</Text>
            <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]} numberOfLines={1}>
              {companyName || 'Votre entreprise'}
            </Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.reset({
                index: 0,
                routes: [{ name: 'ChatList', params: { screen: 'chats' } }],
              })}
            >
              <Home size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Paramètres des notifications"
              onPress={handleSettings}
            >
              <Bell size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.refreshButton, { backgroundColor: colors.primary }]}
              onPress={fetchDashboardData}
            >
              <RefreshCw size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={dashboardScrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: isTablet ? 24 : 16 }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.dashboardHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.heroEyebrow, { color: colors.primary }]}>ESPACE EMPLOYEUR</Text>
              <Text style={[styles.heroTitle, { color: colors.text.primary }]} numberOfLines={2}>
                Bonjour{userName ? `, ${userName}` : ''}
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.text.secondary }]} numberOfLines={2}>
                {companyName || 'Pilotez vos recrutements depuis votre espace Acemia.'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.heroAction, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('CreateJobPosting')}
            >
              <Plus size={19} color="#fff" />
              <Text style={styles.heroActionText}>Publier</Text>
            </TouchableOpacity>
          </View>

          {/* Statistiques en temps réel */}
          <View style={styles.statsGrid}>
            {renderStatCard('Offres actives', stats.activeJobs, <Briefcase />, colors.primary, 2)}
            {renderStatCard('Candidatures', stats.totalApplications, <Users />, '#4CAF50', 5)}
            {renderStatCard('Vues totales', stats.totalViews, <Eye />, '#2196F3', 8)}
            {renderStatCard('Taux conversion', `${stats.conversionRate}%`, <TrendingUp />, '#FF9800', 1)}
          </View>

          {/* Graphiques */}
          <View
            style={styles.chartsSection}
            onLayout={(event) => setAnalyticsOffset(event.nativeEvent.layout.y)}
          >
            <SimpleChart
              title="Vues par jour (7 derniers jours)"
              data={chartData.views}
              labels={['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']}
              color="#2196F3"
              height={180}
            />
            
            <SimpleChart
              title="Candidatures par jour"
              data={chartData.applications}
              labels={['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']}
              color="#4CAF50"
              height={180}
            />
            
            <PieChart
              title="Répartition par catégorie"
              data={chartData.categories}
              size={140}
            />
          </View>

          {/* Candidatures Récentes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Candidatures Récentes
              </Text>
            </View>

            {applications.length === 0 ? (
              <Text style={{ color: colors.text.disabled, fontStyle: 'italic' }}>Aucune candidature pour le moment.</Text>
            ) : (
              <View style={styles.jobsList}>
                {applications.map((app) => {
                  if (!app) return null;
                  return (
                    <View key={app.id} style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.jobInfo}>
                        <Text style={[styles.jobTitle, { color: colors.text.primary }]}>{app.applicant_name || "Candidat"}</Text>
                        <Text style={[styles.jobMeta, { color: colors.text.secondary }]}>Postulant pour: {app.job_title || "Offre"}</Text>
                      </View>
                      <View style={[styles.changeBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold' }}>{(app.status || 'pending').toUpperCase()}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Messages des Candidats */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Messages des Candidats
              </Text>
            </View>

            {recentChats.length === 0 ? (
              <Text style={{ color: colors.text.disabled, fontStyle: 'italic' }}>Aucune discussion active.</Text>
            ) : (
              <View style={styles.jobsList}>
                {recentChats.map((chat) => {
                  if (!chat) return null;
                  return (
                    <TouchableOpacity
                      key={chat.id}
                      style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => navigation.navigate('Chat', {
                        chatId: chat.id,
                        name: chat.peer_name || "Discussion",
                        peerUserId: chat.peer_id
                      })}
                    >
                      <View style={[styles.menuAvatar, { backgroundColor: colors.primary, width: 36, height: 36, borderRadius: 18, marginRight: 12 }]}>
                        {chat.peer_avatar ? <Image source={{ uri: getFullUrl(chat.peer_avatar)! }} style={{ width: '100%', height: '100%', borderRadius: 18 }} /> : <Text style={{ color: '#fff', fontSize: 14 }}>{(chat.peer_name || "?")[0]}</Text>}
                      </View>
                      <View style={styles.jobInfo}>
                        <Text style={[styles.jobTitle, { color: colors.text.primary }]}>{chat.peer_name || "Utilisateur"}</Text>
                        <Text style={[styles.jobMeta, { color: colors.text.secondary }]} numberOfLines={1}>{chat.last_message || "Démarrer la discussion"}</Text>
                      </View>
                      <Text style={{ color: colors.text.disabled, fontSize: 10 }}>{chat.last_message_at ? new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Actions rapides */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Actions rapides
              </Text>
            </View>
            
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('CreateJobPosting')}
              >
                <Plus size={28} color="#fff" />
                <Text style={styles.actionText}>Publier offre</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate('TalentSearch')}
              >
                <Search size={28} color={colors.text.primary} />
                <Text style={[styles.actionText, { color: colors.text.primary }]}>
                  Chercher talents
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleExportData}
              >
                <Download size={28} color={colors.text.primary} />
                <Text style={[styles.actionText, { color: colors.text.primary }]}>
                  Exporter données
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handlePlanning}
              >
                <Calendar size={28} color={colors.text.primary} />
                <Text style={[styles.actionText, { color: colors.text.primary }]}>
                  Planifier
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Offres récentes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Offres récentes
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyJobs')}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            
            {recentJobs.length === 0 ? (
              <View style={styles.emptyState}>
                <Briefcase size={48} color={colors.text.disabled} />
                <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                  Aucune offre publiée
                </Text>
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate('CreateJobPosting')}
                >
                  <Text style={styles.emptyButtonText}>Publier ma première offre</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.jobsList}>
                {recentJobs.map((job) => (
                  <TouchableOpacity
                    key={job.id}
                    style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
                  >
                    <View style={styles.jobInfo}>
                      <Text style={[styles.jobTitle, { color: colors.text.primary }]} numberOfLines={1}>
                        {job.title}
                      </Text>
                      <Text style={[styles.jobMeta, { color: colors.text.secondary }]}>
                        {job.job_type} • {job.location}
                      </Text>
                      <Text style={[styles.jobDate, { color: colors.text.disabled }]}>
                        {new Date(job.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <ChevronRight size={20} color={colors.text.disabled} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 6,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 46,
    height: 46,
    borderRadius: 14,
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
    marginLeft: 3,
  },
  headerBrand: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerButton: {
    padding: 6,
    marginRight: 3,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: {
    paddingVertical: 20,
    width: '100%',
    maxWidth: 1320,
    alignSelf: 'center',
  },
  dashboardHero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 20, gap: 12 },
  heroEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
  heroTitle: { fontSize: 21, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  heroSubtitle: { fontSize: 12, lineHeight: 18 },
  heroAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 14, gap: 4 },
  heroActionText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  changeText: {
    fontSize: 10,
    fontWeight: '600'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4
  },
  statTitle: {
    fontSize: 12
  },
  chartsSection: {
    marginBottom: 24
  },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800'
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  actionCard: {
    width: '48%',
    minHeight: 96,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 12
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center'
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed'
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
    marginBottom: 20
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  jobsList: {
    borderRadius: 16,
    overflow: 'hidden'
  },
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderTopWidth: 0
  },
  jobInfo: {
    flex: 1
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4
  },
  jobMeta: {
    fontSize: 12,
    marginBottom: 2
  },
  jobDate: {
    fontSize: 11
  },
  menuAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  }
});
