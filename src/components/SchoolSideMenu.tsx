import React from 'react';
import { StyleSheet } from 'react-native';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { 
  GraduationCap, Home, Building2, Users, BookOpen, 
  CreditCard, Settings, HelpCircle, LogOut, ChevronRight,
  Bell, MessageSquare, FileText, Calendar, BarChart3
} from 'lucide-react-native';

export default function SchoolSideMenu({ 
  navigation, 
  currentScreen, 
  schoolName, 
  userRole,
  onClose 
}: any) {
  const { colors, normalize } = useTheme();

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard', screen: 'School', params: { tab: 'Mon Dashboard' } },
    { id: 'directory', icon: Building2, label: 'Répertoire', screen: 'School', params: { tab: 'Répertoire' } },
    { id: 'enrollment', icon: Users, label: 'Inscriptions', screen: 'SchoolEnrollmentRequests', roles: ['promoter', 'director'] },
    { id: 'classes', icon: BookOpen, label: 'Gestion Classes', roles: ['promoter', 'director', 'teacher'] },
    { id: 'fees', icon: CreditCard, label: 'Frais Scolaires', roles: ['promoter', 'director', 'parent'] },
    { id: 'assignments', icon: FileText, label: 'Devoirs', roles: ['teacher', 'student', 'parent'] },
    { id: 'calendar', icon: Calendar, label: 'Calendrier', roles: ['teacher', 'student', 'parent', 'promoter', 'director'] },
    { id: 'statistics', icon: BarChart3, label: 'Statistiques', roles: ['promoter', 'director'] },
  ];

  const bottomItems = [
    { id: 'settings', icon: Settings, label: 'Paramètres', screen: 'Settings' },
    { id: 'help', icon: HelpCircle, label: 'Aide & Support', screen: 'Helpdesk' },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', style: 'destructive', onPress: () => {
          onClose?.();
          navigation.navigate('Login');
        }}
      ]
    );
  };

  const isVisible = (item: any) => {
    if (!item.roles) return true;
    return userRole && item.roles.includes(userRole);
  };

  const handleItemPress = (item: any) => {
    onClose?.();
    if (item.screen) {
      navigation.navigate(item.screen, item.params);
    } else {
      Alert.alert(
        'Module à venir',
        `Le module "${item.label}" est en cours de développement et sera disponible prochainement.`
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerTop}>
          <View style={[styles.logoContainer, { backgroundColor: '#fff' }]}>
            <GraduationCap size={28} color={colors.primary} />
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <ChevronRight size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Meet School</Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>
          {schoolName || 'Mon École'}
        </Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{userRole === 'promoter' ? 'Promoteur' : userRole === 'director' ? 'Directeur' : userRole === 'teacher' ? 'Enseignant' : userRole === 'parent' ? 'Parent' : 'Membre'}</Text>
        </View>
      </View>

      <ScrollView style={styles.menuContent} showsVerticalScrollIndicator={false}>
        <View style={styles.menuSection}>
          {menuItems.filter(isVisible).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                currentScreen === item.screen && { backgroundColor: colors.primary + '15' }
              ]}
              onPress={() => handleItemPress(item)}
            >
              <item.icon 
                size={22} 
                color={currentScreen === item.screen ? colors.primary : colors.text.secondary} 
              />
              <Text style={[
                styles.menuLabel, 
                { color: currentScreen === item.screen ? colors.primary : colors.text.primary }
              ]}>
                {item.label}
              </Text>
              <ChevronRight size={18} color={colors.text.disabled} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.menuSection}>
          {bottomItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleItemPress(item)}
            >
              <item.icon size={22} color={colors.text.secondary} />
              <Text style={[styles.menuLabel, { color: colors.text.primary }]}>{item.label}</Text>
              <ChevronRight size={18} color={colors.text.disabled} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={[styles.logoutBtn, { borderTopColor: colors.border }]} onPress={handleLogout}>
        <LogOut size={20} color="#E53935" />
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 50 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoContainer: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  closeBtn: { padding: 5 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 15 },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 5 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 10 },
  roleText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  menuContent: { flex: 1, paddingTop: 10 },
  menuSection: { paddingHorizontal: 15 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 5 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', marginLeft: 12 },
  divider: { height: 1, marginVertical: 15, marginHorizontal: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', padding: 20, borderTopWidth: 1, gap: 10 },
  logoutText: { color: '#E53935', fontSize: 15, fontWeight: '600' }
});

