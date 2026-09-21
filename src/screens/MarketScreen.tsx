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
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import apiService from '../services/api.service';

export default function MarketScreen() {
  const { colors, normalize, isDark } = useTheme();
  const { width } = useWindowDimensions();
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
        <View style={[styles.promoContainer, isWide && { paddingHorizontal: '20%' }]}>
          <Image
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png' }}
            style={[styles.promoImage, isWide && { width: 250, height: 250 }]}
          />
          <Text style={[styles.title, { color: colors.text.primary }, isWide && { fontSize: 40 }]}>Bienvenue sur Meet Market</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }, isWide && { fontSize: 20 }]}>
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
        <Text style={[styles.pendingTitle, { color: colors.danger }]}>Compte Suspendu</Text>
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
      <View style={[styles.header, isWide && { paddingHorizontal: '10%', paddingTop: 40 }]}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Market</Text>
        <TouchableOpacity onPress={() => navigation.navigate('BusinessDashboard')}>
          <Ionicons name="apps-outline" size={32} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={[styles.centered, isWide && { paddingHorizontal: '20%' }]}>
        <View style={isWide ? { flexDirection: 'row', alignItems: 'center', gap: 40 } : { alignItems: 'center' }}>
          <Image
            source={{ uri: business.logo_url ? getFullUrl(business.logo_url) : 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png' }}
            style={isWide ? { width: 300, height: 300, borderRadius: 150 } : { width: 150, height: 150, borderRadius: 75, marginBottom: 20 }}
          />
          <View style={isWide ? { flex: 1 } : { alignItems: 'center' }}>
            <Text style={[styles.title, { color: colors.text.primary, textAlign: isWide ? 'left' : 'center' }]}>Espace Market Actif</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary, textAlign: isWide ? 'left' : 'center' }]}>Bienvenue sur le tableau de bord de {business.business_name}. Gérez vos produits et vos ventes en toute simplicité.</Text>
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: colors.primary, marginTop: 20 }]}
              onPress={() => navigation.navigate('BusinessDashboard')}
            >
              <Text style={styles.startBtnText}>ACCÉDER AU DASHBOARD PRO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const getFullUrl = (url: string) => {
  if (!url || url === 'null') return null;
  if (url.startsWith('http')) return url;
  return `https://meet-me-backend-sg5c.onrender.com/${url.startsWith('/') ? url.slice(1) : url}`;
};

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
