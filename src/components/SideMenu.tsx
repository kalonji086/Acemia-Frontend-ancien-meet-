import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  useWindowDimensions,
  Image,
} from 'react-native';
import {
  Home,
  Briefcase,
  Users,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  ChevronRight,
  User,
  MessageSquare,
  Building2,
  FileText,
  TrendingUp,
  HelpCircle
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import apiService from '../services/api.service';

interface SideMenuProps {
  navigation: any;
  activeRoute: string;
  onClose: () => void;
  userName?: string;
  companyName?: string;
}

export default function SideMenu({ navigation, activeRoute, onClose, userName, companyName }: SideMenuProps) {
  const { colors, normalize, isDark } = useTheme();
  const { setUser } = useUser();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: <Home size={normalize(20)} />,
      route: 'EmployerDashboard'
    },
    {
      id: 'jobs',
      label: 'Mes offres',
      icon: <Briefcase size={normalize(20)} />,
      route: 'MyJobs'
    },
    {
      id: 'createJob',
      label: 'Publier une offre',
      icon: <FileText size={normalize(20)} />,
      route: 'CreateJobPosting'
    },
    {
      id: 'talents',
      label: 'Recherche talents',
      icon: <Users size={normalize(20)} />,
      route: 'TalentSearch'
    },
    {
      id: 'analytics',
      label: 'Analytiques',
      icon: <BarChart3 size={normalize(20)} />,
      route: 'Analytics'
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: <MessageSquare size={normalize(20)} />,
      route: 'ChatList'
    },
    {
      id: 'company',
      label: 'Mon entreprise',
      icon: <Building2 size={normalize(20)} />,
      route: 'CompanyProfile'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell size={normalize(20)} />,
      route: 'Notifications'
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: <Settings size={normalize(20)} />,
      route: 'Settings'
    },
    {
      id: 'help',
      label: 'Aide & Support',
      icon: <HelpCircle size={normalize(20)} />,
      route: 'Helpdesk'
    }
  ];

  const handleNavigation = (route: string) => {
    navigation.navigate(route);
    onClose();
  };

  const handleLogout = async () => {
    await apiService.logout();
    await setUser(null);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }]
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={require('../../assets/AcemiaLogo.png')} style={styles.brandLogo} resizeMode="contain" />
          <Text style={[styles.brandName, { color: colors.text.primary }]}>Acemia Emploi</Text>
        </View>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <User size={normalize(24)} color="#fff" />
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.text.primary }]} numberOfLines={1}>
              {userName || 'Utilisateur'}
            </Text>
            <Text style={[styles.companyName, { color: colors.text.secondary }]} numberOfLines={1}>
              {companyName || 'Entreprise'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>PRINCIPAL</Text>
          {menuItems.slice(0, 5).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                activeRoute === item.route && { backgroundColor: colors.primary + '20' }
              ]}
              onPress={() => handleNavigation(item.route)}
            >
              <View style={styles.menuItemLeft}>
                {React.cloneElement(item.icon, { 
                  color: activeRoute === item.route ? colors.primary : colors.text.secondary 
                })}
                <Text style={[
                  styles.menuItemText,
                  { 
                    color: activeRoute === item.route ? colors.primary : colors.text.primary,
                    marginLeft: 12
                  }
                ]}>
                  {item.label}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.text.disabled} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>COMMUNICATION</Text>
          {menuItems.slice(5, 7).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                activeRoute === item.route && { backgroundColor: colors.primary + '20' }
              ]}
              onPress={() => handleNavigation(item.route)}
            >
              <View style={styles.menuItemLeft}>
                {React.cloneElement(item.icon, { 
                  color: activeRoute === item.route ? colors.primary : colors.text.secondary 
                })}
                <Text style={[
                  styles.menuItemText,
                  { 
                    color: activeRoute === item.route ? colors.primary : colors.text.primary,
                    marginLeft: 12
                  }
                ]}>
                  {item.label}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.text.disabled} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>PARAMÈTRES</Text>
          {menuItems.slice(7, 10).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                activeRoute === item.route && { backgroundColor: colors.primary + '20' }
              ]}
              onPress={() => handleNavigation(item.route)}
            >
              <View style={styles.menuItemLeft}>
                {React.cloneElement(item.icon, { 
                  color: activeRoute === item.route ? colors.primary : colors.text.secondary 
                })}
                <Text style={[
                  styles.menuItemText,
                  { 
                    color: activeRoute === item.route ? colors.primary : colors.text.primary,
                    marginLeft: 12
                  }
                ]}>
                  {item.label}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.text.disabled} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={normalize(20)} color={colors.danger || '#FF3B30'} />
          <Text style={[styles.logoutText, { color: colors.danger || '#FF3B30', marginLeft: 12 }]}>
            Déconnexion
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: 280,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  header: {
    padding: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 9 },
  brandLogo: { width: 34, height: 34 },
  brandName: { fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  userDetails: {
    flex: 1,
    marginLeft: 12
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2
  },
  companyName: {
    fontSize: 12,
    opacity: 0.8
  },
  menuScroll: {
    flex: 1,
    paddingHorizontal: 15
  },
  menuSection: {
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 13,
    marginBottom: 5
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1
  },
  footer: {
    padding: 20,
    borderTopWidth: 1
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500'
  }
});