import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  useWindowDimensions
} from 'react-native';
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
  UserCheck
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
      id: 'settings',
      label: 'Paramètres École',
      icon: <Settings size={normalize(20)} />,
      action: () => {}
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <GraduationCap size={normalize(28)} color={colors.primary} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={[styles.schoolName, { color: colors.text.primary, fontSize: normalize(15) }]} numberOfLines={1}>
            {schoolName || 'Mon École'}
          </Text>
          <Text style={{ color: colors.text.secondary, fontSize: normalize(11) }}>Espace Promoteur</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuItem, { borderRadius: 10 }]}
            onPress={() => {
              item.action();
              onClose();
            }}
          >
            <View style={[styles.iconContainer, { color: colors.text.secondary }]}>
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
            navigation.navigate('ChatList');
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd'
  },
  schoolName: { fontWeight: 'bold' },
  scrollContent: { paddingVertical: 15, paddingHorizontal: 10 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 15,
    marginBottom: 5
  },
  iconContainer: { marginRight: 15 },
  menuLabel: { fontWeight: '500' },
  footer: { padding: 20 },
  logoutButton: { flexDirection: 'row', alignItems: 'center' },
  logoutText: { fontWeight: 'bold', marginLeft: 12 }
});
