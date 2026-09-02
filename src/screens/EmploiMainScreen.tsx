import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Briefcase, Building2, Search, ArrowRight, CheckCircle2, Clock, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import apiService from '../services/api.service';

export default function EmploiMainScreen({ navigation }: any) {
  const { colors, normalize, isDark } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await apiService.getEmployerStatus();
      if (res.success) {
        setStatus(res.data);
        // Si déjà approuvé, on redirige vers le dashboard
        if (res.data.profile) {
          navigation.replace('EmployerDashboard');
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
      if (status?.request?.status === 'pending') {
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
          <Clock size={80} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text.primary, marginTop: 20 }]}>Demande en cours</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Votre demande pour "{status.request.company_name}" est en cours d'examen par notre équipe.
            Vous recevrez une notification dès que votre accès sera activé.
          </Text>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('ChatList')}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>RETOUR AUX DISCUSSIONS</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primary + '15' }]}>
            <Briefcase size={normalize(40)} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text.primary }]}>Espace Emploi</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            La plateforme de recrutement nouvelle génération connectée à votre communauté.
          </Text>
        </View>

        <View style={styles.questionContainer}>
          <Text style={[styles.questionText, { color: colors.text.primary }]}>Qui êtes-vous ?</Text>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleRoleSelection('seeker')}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#4CAF5015' }]}>
              <Search size={28} color="#4CAF50" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Je cherche un emploi</Text>
              <Text style={[styles.cardDesc, { color: colors.text.secondary }]}>
                Découvrez des opportunités locales et postulez en un clic avec votre profil.
              </Text>
            </View>
            <ArrowRight size={20} color={colors.text.disabled} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleRoleSelection('employer')}
          >
            <View style={[styles.cardIcon, { backgroundColor: colors.primary + '15' }]}>
              <Building2 size={28} color={colors.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Je suis un employeur</Text>
              <Text style={[styles.cardDesc, { color: colors.text.secondary }]}>
                Recrutez les meilleurs talents et gérez vos offres sur un dashboard pro.
              </Text>
            </View>
            <ArrowRight size={20} color={colors.text.disabled} />
          </TouchableOpacity>
        </View>

        <View style={styles.footerInfo}>
          <View style={styles.infoRow}>
            <CheckCircle2 size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>Profils vérifiés par l'administration</Text>
          </View>
          <View style={styles.infoRow}>
            <CheckCircle2 size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>Publication d'offres style Amazon</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  scrollContent: { padding: 25, flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  iconBadge: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
  questionContainer: { width: '100%' },
  questionText: { fontSize: 18, fontWeight: '700', marginBottom: 20, marginLeft: 5 },
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
  cardTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  footerInfo: { marginTop: 30, alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { fontSize: 13, marginLeft: 8 },
  backBtn: { paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30, marginTop: 40 }
});
