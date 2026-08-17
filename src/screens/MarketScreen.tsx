import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import apiService from '../services/api.service';

export default function MarketScreen() {
  const { colors, normalize, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await apiService.getMyBusiness();
      if (res.success) {
        setBusiness(res.data);
      }
    } catch (e) {
      console.error('Market check error:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkStatus();
    }, [])
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Si pas de business enregistré, proposer de s'enregistrer
  if (!business) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.promoContainer}>
          <Image
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png' }}
            style={styles.promoImage}
          />
          <Text style={[styles.title, { color: colors.text.primary }]}>Bienvenue sur Meet Market</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Développez votre activité, trouvez des clients et gérez vos ventes directement depuis Meet Me.
          </Text>

          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('BusinessRegistration')}
          >
            <Text style={styles.startBtnText}>CRÉER MON BUSINESS</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Si demande en attente
  if (business.status === 'pending') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 40 }]}>
        <Ionicons name="time-outline" size={80} color={colors.primary} />
        <Text style={[styles.pendingTitle, { color: colors.text.primary }]}>Demande en cours</Text>
        <Text style={[styles.pendingDesc, { color: colors.text.secondary }]}>
          Votre demande pour "{business.business_name}" est en cours d'examen par notre équipe.
          Vous recevrez une notification dès que votre compte Market sera activé.
        </Text>
      </View>
    );
  }

  // Si compte bloqué
  if (business.status === 'blocked') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 40 }]}>
        <Ionicons name="lock-closed" size={80} color={colors.danger} />
        <Text style={[styles.pendingTitle, { color: colors.text.primary, color: colors.danger }]}>Compte Suspendu</Text>
        <Text style={[styles.pendingDesc, { color: colors.text.secondary }]}>
          L'accès au Market pour "{business.business_name}" a été suspendu par l'administration pour non-respect des conditions d'utilisation.
          Veuillez contacter le support pour plus d'informations.
        </Text>
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: colors.text.secondary, marginTop: 30 }]}
          onPress={() => navigation.navigate('Helpdesk')}
        >
          <Text style={styles.startBtnText}>CONTACTER LE SUPPORT</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Le Market réel sera ici dans la phase 2
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Market</Text>
        <TouchableOpacity onPress={() => navigation.navigate('BusinessDashboard')}>
          <Ionicons name="apps-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.centered}>
        <Text style={{ color: colors.text.secondary }}>Espace Market Actif pour {business.business_name}</Text>
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: colors.primary, marginTop: 20 }]}
          onPress={() => navigation.navigate('BusinessDashboard')}
        >
          <Text style={styles.startBtnText}>ACCÉDER AU DASHBOARD</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  promoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  promoImage: { width: 150, height: 150, marginBottom: 30 },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 15 },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  startBtn: { paddingVertical: 18, paddingHorizontal: 40, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  startBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  pendingTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  pendingDesc: { textAlign: 'center', lineHeight: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { fontSize: 28, fontWeight: '900' }
});
