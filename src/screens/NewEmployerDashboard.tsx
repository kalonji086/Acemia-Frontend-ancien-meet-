import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  useWindowDimensions,
  Alert
} from 'react-native';
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
import { SOCKET_URL } from '../utils/constants';
import { Image } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function NewEmployerDashboard({ navigation }: any) {
  const { colors, normalize, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;
  
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
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

  const menuAnimation = useRef(new Animated.Value(-280)).current;

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
    // Si on est déjà sur le dashboard, on rafraîchit simplement ou on scroll vers les charts
    fetchDashboardData();
    Alert.alert('Analytiques', 'Les données ont été rafraîchies avec les dernières statistiques réelles.');
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
      {/* Menu latéral */}
      <Animated.View style={[
        styles.menuOverlay,
        { 
          opacity: menuAnimation.interpolate({
            inputRange: [-280, 0],
            outputRange: [0, 0.5]
          }),
          display: showMenu ? 'flex' : 'none'
        }
      ]}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill}
          onPress={() => setShowMenu(false)}
        />
      </Animated.View>

      <Animated.View style={[
        styles.sideMenu,
        {
          transform: [{ translateX: menuAnimation }],
          backgroundColor: colors.surface
        }
      ]}>
        {/* Contenu du menu latéral */}
        <View style={styles.menuHeader}>
          <View style={styles.menuUserInfo}>
            <View style={[styles.menuAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.menuAvatarText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.menuUserName, { color: colors.text.primary }]}>
                {userName}
              </Text>
              <Text style={[styles.menuCompanyName, { color: colors.text.secondary }]}>
                {companyName || 'Entreprise'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowMenu(false)}>
            <Text style={{ color: colors.primary, fontSize: 24 }}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.menuContent}>
          <TouchableOpacity style={styles.menuItem}>
            <Briefcase size={20} color={colors.text.primary} />
            <Text style={[styles.menuItemText, { color: colors.text.primary }]}>Tableau de bord</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MyJobs')}>
            <Briefcase size={20} color={colors.text.secondary} />
            <Text style={[styles.menuItemText, { color: colors.text.secondary }]}>Mes offres</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('CreateJobPosting')}>
            <Plus size={20} color={colors.text.secondary} />
            <Text style={[styles.menuItemText, { color: colors.text.secondary }]}>Publier une offre</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('TalentSearch')}>
            <Users size={20} color={colors.text.secondary} />
            <Text style={[styles.menuItemText, { color: colors.text.secondary }]}>Recherche talents</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleAnalytics}>
            <TrendingUp size={20} color={colors.text.secondary} />
            <Text style={[styles.menuItemText, { color: colors.text.secondary }]}>Analytiques</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Bell size={20} color={colors.text.secondary} />
            <Text style={[styles.menuItemText, { color: colors.text.secondary }]}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
            <Filter size={20} color={colors.text.secondary} />
            <Text style={[styles.menuItemText, { color: colors.text.secondary }]}>Paramètres</Text>
          </TouchableOpacity>

          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={async () => {
              await apiService.logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }}
          >
            <LogOut size={20} color={colors.danger} />
            <Text style={[styles.menuItemText, { color: colors.danger }]}>Déconnexion</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.reset({
              index: 0,
              routes: [{ name: 'ChatList' }],
            })}
          >
            <Home size={20} color={colors.primary} />
            <Text style={[styles.menuItemText, { color: colors.primary, fontWeight: 'bold' }]}>Retour</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* Contenu principal */}
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuButton}>
            <Menu size={24} color={colors.text.primary} />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
              Dashboard Employeur
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
              {companyName || 'Votre entreprise'}
            </Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.reset({
                index: 0,
                routes: [{ name: 'ChatList' }],
              })}
            >
              <Home size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
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
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: isTablet ? 24 : 16 }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Statistiques en temps réel */}
          <View style={styles.statsGrid}>
            {renderStatCard('Offres actives', stats.activeJobs, <Briefcase />, colors.primary, 2)}
            {renderStatCard('Candidatures', stats.totalApplications, <Users />, '#4CAF50', 5)}
            {renderStatCard('Vues totales', stats.totalViews, <Eye />, '#2196F3', 8)}
            {renderStatCard('Taux conversion', `${stats.conversionRate}%`, <TrendingUp />, '#FF9800', 1)}
          </View>

          {/* Graphiques */}
          <View style={styles.chartsSection}>
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
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 999
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  menuHeader: {
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  menuUserInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  menuAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  menuAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  menuUserName: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  menuCompanyName: {
    fontSize: 12,
    marginTop: 2
  },
  menuContent: {
    flex: 1,
    padding: 20
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8
  },
  menuItemText: {
    fontSize: 15,
    marginLeft: 12
  },
  menuDivider: {
    height: 1,
    marginVertical: 15,
    marginHorizontal: 8
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  menuButton: {
    padding: 8
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold'
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
    padding: 8,
    marginRight: 8
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: {
    paddingVertical: 20
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
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
    fontWeight: 'bold'
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  actionCard: {
    width: '48%',
    height: 100,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16
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
  }
});