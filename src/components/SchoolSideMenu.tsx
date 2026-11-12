import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Home,
  Users,
  GraduationCap,
  BookOpen,
  DollarSign,
  Settings,
  Bell,
  LogOut,
  HelpCircle,
  Menu,
  UserCheck,
  BarChart3,
  ClipboardCheck,
  FileBarChart,
  Search
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface SchoolSideMenuProps {
  navigation: any;
  onClose: () => void;
  schoolName?: string;
}

export default function SchoolSideMenu({ navigation, onClose, schoolName }: SchoolSideMenuProps) {
  const { colors, normalize } = useTheme();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: <Home size={normalize(20)} />,
      action: () => navigation.navigate('SchoolDashboard')
    },
    {
      id: 'students',
      label: 'Inscriptions & Élèves',
      icon: <Users size={normalize(20)} />,
      action: () => navigation.navigate('SchoolStudents')
    },
    {
      id: 'directory',
      label: 'Répertoire mondial',
      icon: <Search size={normalize(20)} />,
      action: () => navigation.navigate('SchoolDirectory')
    },
    {
      id: 'classes_mgmt',
      label: 'Gestion des Classes',
      icon: <GraduationCap size={normalize(20)} />,
      action: () => navigation.navigate('SchoolClasses')
    },
    {
      id: 'classes',
      label: 'Horaires & Cours',
      icon: <BookOpen size={normalize(20)} />,
      action: () => navigation.navigate('SchoolSchedule')
    },
    {
      id: 'finance',
      label: 'Frais Scolaires',
      icon: <DollarSign size={normalize(20)} />,
      action: () => navigation.navigate('SchoolFees')
    },
    {
      id: 'accounts',
      label: 'Demande de Comptes',
      icon: <UserCheck size={normalize(20)} />,
      action: () => navigation.navigate('SchoolAccounts')
    },
    {
      id: 'grades',
      label: 'Évaluations & Notes',
      icon: <BarChart3 size={normalize(20)} />,
      action: () => navigation.navigate('SchoolGrades')
    },
    {
      id: 'attendance',
      label: 'Présences',
      icon: <ClipboardCheck size={normalize(20)} />,
      action: () => navigation.navigate('SchoolAttendance')
    },
    {
      id: 'reports',
      label: 'Rapports scolaires',
      icon: <FileBarChart size={normalize(20)} />,
      action: () => navigation.navigate('SchoolReports')
    },
    {
      id: 'settings',
      label: 'Paramètres École',
      icon: <Settings size={normalize(20)} />,
      action: () => navigation.navigate('SchoolSettings')
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Image source={require('../../assets/AcemiaLogo.png')} style={styles.logo} resizeMode="contain" />
        <View style={{ marginLeft: 11, flex: 1, minWidth: 0 }}>
          <Text style={[styles.brandName, { color: colors.primary }]}>Acemia École</Text>
          <Text style={[styles.schoolName, { color: colors.text.primary, fontSize: normalize(14) }]} numberOfLines={1}>
            {schoolName || 'Mon École'}
          </Text>
          <Text style={{ color: colors.text.secondary, fontSize: normalize(10) }}>Espace de gestion</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuItem, { borderRadius: 14, backgroundColor: colors.background }]}
            onPress={() => {
              item.action();
              onClose();
            }}
          >
            <View style={styles.iconContainer}>
              {item.icon}
            </View>
            <Text style={[styles.menuLabel, { color: colors.text.primary, fontSize: normalize(14) }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.footer, { borderTopWidth: 0.5, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            onClose();
            navigation.navigate('ChatList', { screen: 'chats' });
          }}
        >
          <LogOut size={20} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger, fontSize: normalize(14) }]}>
            Quitter l'Espace
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, height: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  logo: { width: 42, height: 42 },
  brandName: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 2 },
  schoolName: { fontWeight: '800' },
  scrollContent: { paddingVertical: 15, paddingHorizontal: 10 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 7
  },
  iconContainer: { marginRight: 15 },
  menuLabel: { fontWeight: '500' },
  footer: { padding: 20 },
  logoutButton: { flexDirection: 'row', alignItems: 'center' },
  logoutText: { fontWeight: 'bold', marginLeft: 12 }
});
