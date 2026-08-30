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
  const styles = createStyles(themeColors, normalize, isDark);
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
            <Text style={[styles.p, { color: themeColors.text.secondary }]}>Dernière mise à jour : 30 Août 2026</Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>1. Objet</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              Les présentes Conditions Générales d’Utilisation (ci-après « CGU ») régissent l’accès et l’utilisation de l’application de messagerie (ci-après « l’Application ») par tout utilisateur, quel que soit son pays de résidence.
            </Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>2. Acceptation des CGU</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              En téléchargeant, installant ou utilisant l’Application, l’utilisateur accepte sans réserve les présentes CGU. Si l’utilisateur refuse, il doit cesser immédiatement d’utiliser l’Application.
            </Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>3. Accès et inscription</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              L’accès à l’Application nécessite la création d’un compte utilisateur.
            </Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              L’utilisateur s’engage à fournir des informations exactes et à les maintenir à jour.
            </Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              L’accès peut être restreint ou suspendu en cas de non-respect des CGU.
            </Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>4. Utilisation de l’Application</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              L’utilisateur s’engage à :
            </Text>
            <Text style={[styles.bullet, { color: themeColors.text.primary }]}>• Ne pas utiliser l’Application à des fins illégales, frauduleuses ou nuisibles.</Text>
            <Text style={[styles.bullet, { color: themeColors.text.primary }]}>• Respecter les lois locales et internationales en vigueur.</Text>
            <Text style={[styles.bullet, { color: themeColors.text.primary }]}>• Ne pas diffuser de contenus violents, discriminatoires, haineux ou portant atteinte aux droits d’autrui.</Text>
            <Text style={[styles.bullet, { color: themeColors.text.primary }]}>• Ne pas perturber le bon fonctionnement de l’Application (spam, virus, piratage, etc.).</Text>

            <Text style={[styles.h3, { color: themeColors.text.primary, marginTop: 15 }]}>Conditions spécifiques de sécurité et de respect</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              <Text style={{ fontWeight: 'bold' }}>Tentative de piratage :</Text> tout utilisateur qui tente de hacker l’Application ou envoie des informations volontairement fausses verra son compte automatiquement banni et ne pourra plus utiliser la plateforme.
            </Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              <Text style={{ fontWeight: 'bold' }}>Contenus interdits :</Text> le partage d’images obscènes, de vidéos à caractère pornographique ou de tout contenu inapproprié est strictement interdit.
            </Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>5. Données personnelles et confidentialité</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              L’Application collecte et traite certaines données personnelles conformément à la Politique de Confidentialité.
            </Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              L’utilisateur dispose de droits d’accès, de rectification et de suppression de ses données, conformément aux législations applicables (RGPD, CCPA, etc.).
            </Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              Les communications sont protégées par des protocoles de sécurité, mais l’utilisateur reconnaît que la transmission de données sur Internet comporte des risques.
            </Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>6. Propriété intellectuelle</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              L’Application, son contenu et ses fonctionnalités sont protégés par des droits de propriété intellectuelle.
            </Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              L’utilisateur ne peut reproduire, modifier ou distribuer ces éléments sans autorisation préalable.
            </Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>7. Responsabilités</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              L’éditeur de l’Application ne saurait être tenu responsable des dommages directs ou indirects liés à l’utilisation de l’Application.
            </Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              L’utilisateur est seul responsable des contenus qu’il partage via l’Application.
            </Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>8. Suspension et résiliation</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              L’éditeur se réserve le droit de suspendre ou de supprimer le compte d’un utilisateur en cas de violation des CGU.
            </Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              L’utilisateur peut résilier son compte à tout moment.
            </Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>9. Droit applicable et juridiction</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              Les présentes CGU sont régies par le droit international et, le cas échéant, par les lois locales applicables.
            </Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              Tout litige sera soumis aux juridictions compétentes du pays de résidence de l’éditeur, sauf dispositions impératives contraires.
            </Text>

            <Text style={[styles.h2, { color: themeColors.text.primary }]}>10. Modifications des CGU</Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              L’éditeur peut modifier les présentes CGU à tout moment.
            </Text>
            <Text style={[styles.p, { color: themeColors.text.primary }]}>
              Les utilisateurs seront informés des changements et devront accepter les nouvelles conditions pour continuer à utiliser l’Application.
            </Text>

            <View style={[styles.contactBox, { backgroundColor: isDark ? '#333' : '#f0f0f0', borderColor: themeColors.border }]}>
              <Text style={[styles.p, { color: themeColors.text.primary, marginBottom: 0 }]}>
                Pour d'autres questions, veuillez contacter notre équipe :
              </Text>
              <Text style={{ color: themeColors.primary, fontWeight: 'bold', marginTop: 5 }}>Wecanconcept@gmail.com</Text>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, normalize: any, isDark: boolean) => StyleSheet.create({
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
  h3: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  p: { fontSize: 14, lineHeight: 22, marginBottom: 10 },
  bullet: { fontSize: 14, marginLeft: 15, marginBottom: 5 },
  contactBox: { marginTop: 30, padding: 15, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
