import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import apiService from '../services/api.service';

export default function PrivacyPolicyScreen({ navigation, isComponent = false }: any) {
  const { colors: themeColors, isDark, normalize } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = React.useState(true);
  const [privacyDoc, setPrivacyDoc] = React.useState<any>(null);

  React.useEffect(() => {
    fetchPrivacyPolicy();
  }, []);

  const fetchPrivacyPolicy = async () => {
    try {
      const res = await apiService.getLegalDocs();
      if (res.success) {
        const doc = res.data.find((d: any) => d.type === 'privacy');
        setPrivacyDoc(doc);
      }
    } catch (e) {
      console.error('Error fetching privacy policy:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {!isComponent && (
        <>
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={themeColors.surface} />
          <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={24} color={themeColors.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>Politique de Confidentialité</Text>
          </View>
        </>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.h1, { color: themeColors.text.primary }]}>Politique de Confidentialité</Text>

        {privacyDoc ? (
          <>
            <Text style={[styles.p, { color: themeColors.text.secondary }]}>Version {privacyDoc.version}</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>{privacyDoc.content}</Text>
          </>
        ) : (
          <>
            <Text style={[styles.p, { color: themeColors.text.secondary }]}>Dernière mise à jour : 29 Août 2026</Text>

            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              Cette Politique de confidentialité décrit nos règles et procédures sur la collecte, l'utilisation et la divulgation de vos informations lorsque vous utilisez le Service.
            </Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>1. Collecte des Données</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              Nous collectons les informations suivantes pour assurer le bon fonctionnement de Meet Me :
            </Text>
            <Text style={[styles.bullet, { color: themeColors.text.primary }]}>• Adresse Email et Identifiants</Text>
            <Text style={[styles.bullet, { color: themeColors.text.primary }]}>• Numéro de téléphone</Text>
            <Text style={[styles.bullet, { color: themeColors.text.primary }]}>• Informations de profil (Nom, Sexe, Age, Localisation)</Text>
            <Text style={[styles.bullet, { color: themeColors.text.primary }]}>• Données de l'appareil (Marque, Modèle, OS)</Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>2. Utilisation de vos Données</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              Vos données sont utilisées uniquement pour fournir, maintenir et améliorer le Service Meet Me, ainsi que pour assurer la sécurité de votre compte et prévenir la fraude.
            </Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>3. Protection de la Vie Privée</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              Meet Me utilise le chiffrement pour protéger vos communications privées. Nous ne vendons jamais vos données personnelles à des tiers.
            </Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>4. Contact</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              Pour toute question, contactez-nous : wecanconcept@gmail.com
            </Text>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  backButton: { marginRight: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  h1: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  h2: { fontSize: 20, fontWeight: 'bold', marginTop: 25, marginBottom: 10 },
  p: { fontSize: 14, lineHeight: 22, marginBottom: 10 },
  bullet: { fontSize: 14, marginLeft: 15, marginBottom: 5 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bold: { fontWeight: 'bold' },
  bulletContainer: { flexDirection: 'row', marginBottom: 8 },
  bulletPoint: { fontSize: 18, marginRight: 5 },
});
