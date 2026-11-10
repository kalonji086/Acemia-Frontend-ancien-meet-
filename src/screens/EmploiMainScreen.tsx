import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, SafeAreaView, ActivityIndicator, Alert,
  useWindowDimensions
} from 'react-native';
import { Briefcase, Building2, Search, ArrowRight, CheckCircle2, Clock, ShieldCheck, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';

export default function EmploiMainScreen({ navigation }: any) {
  const { colors, normalize, isDark } = useTheme();
  const { t } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    checkStatus();

    socketService.on('employer:request_approved', (data: any) => {
      Alert.alert('Félicitations !', `Votre compte employeur pour ${data.companyName} a été activé.`);
      checkStatus();
    });

    return () => {
      socketService.off('employer:request_approved');
    };
  }, []);

  const checkStatus = async () => {
    try {
      const res = await apiService.getEmployerStatus();
      if (res.success) {
        // On ne redirige plus automatiquement sans laisser le choix
        // setStatus(res.data);
        setStatus(res.data);
        if (res.data.profile) {
           // On peut optionnellement ajouter une redirection automatique ici
           // mais il est préférable de laisser l'utilisateur choisir s'il veut aller au dashboard
           // ou voir les offres (JobDiscovery)
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelection = (role: 'employer' | 'seeker') => {
    if (role === 'employer') {
      if (status?.profile) {
        navigation.navigate('EmployerDashboard');
      } else if (status?.request?.status === 'pending') {
        Alert.alert('Demande en cours', 'Votre demande employeur est en cours d\'examen.');
      } else {
        navigation.navigate('EmployerRequest');
      }
    } else {
      navigation.navigate('JobDiscovery');
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Si demande en attente
  if (status?.request?.status === 'pending') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <Clock size={normalize(80)} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text.primary, marginTop: 20, fontSize: normalize(28) }]}>Demande en cours</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary, fontSize: normalize(16) }]}>
            Votre demande pour "{status.request.company_name}" est en cours d'examen par notre équipe.
            Vous recevrez une notification dès que votre accès sera activé.
          </Text>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('ChatList')}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: normalize(14) }}>RETOUR AUX DISCUSSIONS</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.mainHeader, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.navigate('ChatList')} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Acemia Emploi</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isTablet ? '10%' : 25 }]}>
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primary + '15', width: normalize(80), height: normalize(80), borderRadius: normalize(40) }]}>
            <Briefcase size={normalize(40)} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text.primary, fontSize: normalize(28) }]}>Espace Emploi</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary, fontSize: normalize(16) }]}>
            La plateforme de recrutement nouvelle génération connectée à votre communauté.
          </Text>
        </View>

        <View style={styles.questionContainer}>
          <Text style={[styles.questionText, { color: colors.text.primary, fontSize: normalize(18) }]}>Qui êtes-vous ?</Text>

          <View style={isTablet ? styles.row : styles.column}>
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, flex: isTablet ? 1 : 0, marginRight: isTablet ? 10 : 0 }]}
              onPress={() => handleRoleSelection('seeker')}
            >
              <View style={[styles.cardIcon, { backgroundColor: '#4CAF5015' }]}>
                <Search size={normalize(28)} color="#4CAF50" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: colors.text.primary, fontSize: normalize(17) }]}>Je cherche un emploi</Text>
                <Text style={[styles.cardDesc, { color: colors.text.secondary, fontSize: normalize(13) }]}>
                  Découvrez des opportunités locales et postulez en un clic avec votre profil.
                </Text>
              </View>
              {!isTablet && <ArrowRight size={20} color={colors.text.disabled} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, flex: isTablet ? 1 : 0, marginLeft: isTablet ? 10 : 0 }]}
              onPress={() => handleRoleSelection('employer')}
            >
              <View style={[styles.cardIcon, { backgroundColor: colors.primary + '15' }]}>
                <Building2 size={normalize(28)} color={colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: colors.text.primary, fontSize: normalize(17) }]}>
                  {status?.profile ? "Mon Dashboard Employeur" : "Je suis un employeur"}
                </Text>
                <Text style={[styles.cardDesc, { color: colors.text.secondary, fontSize: normalize(13) }]}>
                  {status?.profile ? "Gérez vos offres, vos candidats et vos recrutements." : "Recrutez les meilleurs talents et gérez vos offres sur un dashboard pro."}
                </Text>
              </View>
              {!isTablet && <ArrowRight size={20} color={colors.text.disabled} />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footerInfo}>
          <View style={styles.infoRow}>
            <CheckCircle2 size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text.secondary, fontSize: normalize(13) }]}>Profils vérifiés par l'administration</Text>
          </View>
          <View style={styles.infoRow}>
            <CheckCircle2 size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text.secondary, fontSize: normalize(13) }]}>Publication d'offres style Amazon</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  scrollContent: { paddingVertical: 25, flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  iconBadge: { justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
  questionContainer: { width: '100%' },
  questionText: { fontWeight: '700', marginBottom: 20, marginLeft: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  column: { flexDirection: 'column' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  cardIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardInfo: { flex: 1 },
  cardTitle: { fontWeight: 'bold', marginBottom: 4 },
  cardDesc: { lineHeight: 18 },
  footerInfo: { marginTop: 30, alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { marginLeft: 8 },
  backBtn: { paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30, marginTop: 40 }
});
