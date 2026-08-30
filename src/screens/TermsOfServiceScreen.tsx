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

export default function TermsOfServiceScreen({ navigation, isComponent = false }: any) {
  const { colors: themeColors, isDark, normalize } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = React.useState(true);
  const [tosDoc, setTosDoc] = React.useState<any>(null);

  React.useEffect(() => {
    fetchTOS();
  }, []);

  const fetchTOS = async () => {
    try {
      const res = await apiService.getLegalDocs();
      if (res.success) {
        const doc = res.data.find((d: any) => d.type === 'tos');
        setTosDoc(doc);
      }
    } catch (e) {
      console.error('Error fetching TOS:', e);
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
            <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>Conditions d'Utilisation</Text>
          </View>
        </>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.h1, { color: themeColors.text.primary }]}>Conditions Générales d'Utilisation</Text>

        {tosDoc ? (
          <>
            <Text style={[styles.p, { color: themeColors.text.secondary }]}>Version {tosDoc.version}</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>{tosDoc.content}</Text>
          </>
        ) : (
          <>
            <Text style={[styles.p, { color: themeColors.text.secondary }]}>Dernière mise à jour : 29 Août 2026</Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>1. Acceptation des Conditions</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              En créant un compte sur Meet Me, vous acceptez d'être lié par les présentes conditions. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser nos services.
            </Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>2. Admissibilité</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              Vous devez avoir au moins 13 ans pour créer un compte. En utilisant Meet Me, vous garantissez que vous avez la pleine capacité juridique de conclure ce contrat.
            </Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>3. Utilisation du Service</Text>
            <Text style={[styles.bullet, { color: themeColors.text.primary }]}>• Contenu : Vous êtes seul responsable du contenu que vous partagez.</Text>
            <Text style={[styles.bullet, { color: themeColors.text.primary }]}>• Conduite : Le harcèlement et les contenus illégaux sont strictement interdits.</Text>
            <Text style={[styles.bullet, { color: themeColors.text.primary }]}>• Sécurité : Vous devez protéger votre mot de passe.</Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>4. Limitation de Responsabilité</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              Meet Me est fourni "en l'état". Nous ne serons pas responsables des dommages indirects découlant de votre utilisation du service.
            </Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>5. Résiliation</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              Nous nous réservons le droit de suspendre votre compte à tout moment en cas de violation de ces conditions.
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
});
