import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import apiService from '../services/api.service';

export default function PrivacyPolicyScreen({ navigation, isComponent = false }: any) {
  const { colors, isDark, normalize } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [privacyDoc, setPrivacyDoc] = useState<any>(null);

  useEffect(() => {
    fetchPrivacyPolicy();
  }, []);

  const fetchPrivacyPolicy = async () => {
    try {
      const res = await apiService.getLegalDocs();
      if (res.success && Array.isArray(res.data)) {
        const doc = res.data.find((d: any) => d.type === 'privacy');
        if (doc) setPrivacyDoc(doc);
      }
    } catch (e) {
      console.error('Error fetching privacy policy:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {!isComponent && (
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Politique de Confidentialité</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        <Text style={[styles.h1, { color: colors.text.primary }]}>Politique de Confidentialité</Text>

        {privacyDoc ? (
          <View>
            <Text style={[styles.version, { color: colors.text.secondary }]}>Version {privacyDoc.version}</Text>
            <Text style={[styles.p, { color: colors.text.primary }]}>{privacyDoc.content}</Text>
          </View>
        ) : (
          <View>
            <Text style={[styles.version, { color: colors.text.secondary }]}>Dernière mise à jour : 11 novembre 2026</Text>

            <Text style={[styles.p, { color: colors.text.primary }]}>
              Cette Politique de confidentialité décrit nos règles sur la collecte et l'utilisation de vos informations.
            </Text>

            <Text style={[styles.h2, { color: colors.text.primary }]}>1. Collecte des Données</Text>
            <Text style={[styles.bullet, { color: colors.text.primary }]}>• Adresse Email et Identifiants</Text>
            <Text style={[styles.bullet, { color: colors.text.primary }]}>• Numéro de téléphone</Text>
            <Text style={[styles.bullet, { color: colors.text.primary }]}>• Données de profil</Text>

            <Text style={[styles.h2, { color: colors.text.primary }]}>2. Sécurité</Text>
            <Text style={[styles.p, { color: colors.text.primary }]}>
              Vos communications sont protégées par chiffrement. Nous ne partageons pas vos données privées.
            </Text>

            <Text style={[styles.h2, { color: colors.text.primary }]}>3. Contact</Text>
            <Text style={[styles.p, { color: colors.text.primary }]}>
              Email : <Text style={{ fontWeight: 'bold', color: colors.primary }}>wecanconcept@gmail.com</Text>
            </Text>
          </View>
        )}
        <Text style={[styles.h2, { color: colors.text.primary }]}>Position et sécurité des connexions</Text>
        <Text style={[styles.p, { color: colors.text.primary }]}>
          L’adresse IP réseau est collectée lors des connexions, indépendamment du partage GPS. Elle est accessible à l’administrateur principal pour la sécurité du compte. L’IP brute est conservée au maximum 30 jours, puis anonymisée en ne gardant qu’un préfixe réseau.
        </Text>
        <Text style={[styles.p, { color: colors.text.primary }]}>
          Le GPS précis est désactivé par défaut. Il n’est transmis qu’après activation du partage dans les paramètres et autorisation « pendant l’utilisation » du système. La position n’est suivie que lorsque l’application est au premier plan et est accessible à l’administrateur principal. Vous pouvez retirer votre accord à tout moment; la position est effacée à la désactivation, à la déconnexion ou à la révocation de la session. Aucune localisation en arrière-plan n’est collectée.
        </Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    paddingTop: 40
  },
  backButton: { marginRight: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 25 },
  h1: { fontSize: 24, fontWeight: 'black', marginBottom: 20 },
  h2: { fontSize: 20, fontWeight: 'bold', marginTop: 30, marginBottom: 10 },
  version: { fontSize: 12, marginBottom: 20, fontStyle: 'italic' },
  p: { fontSize: 15, lineHeight: 24, marginBottom: 15 },
  bullet: { fontSize: 15, marginLeft: 15, marginBottom: 10 },
});
