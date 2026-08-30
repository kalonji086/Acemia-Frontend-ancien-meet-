import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import apiService from '../services/api.service';

const { width } = Dimensions.get('window');

export default function TermsOfServiceScreen({ navigation, isComponent = false }: any) {
  const { colors, isDark, normalize, fontSizeFactor } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [tosDoc, setTosDoc] = useState<any>(null);

  useEffect(() => {
    fetchTOS();
  }, []);

  const fetchTOS = async () => {
    try {
      const res = await apiService.getLegalDocs();
      if (res.success && Array.isArray(res.data)) {
        const doc = res.data.find((d: any) => d.type === 'tos');
        if (doc) setTosDoc(doc);
      }
    } catch (e) {
      console.error('Error fetching TOS:', e);
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
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Conditions d'Utilisation</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        <Text style={[styles.h1, { color: colors.text.primary }]}>Conditions Générales d'Utilisation</Text>

        {tosDoc ? (
          <View>
            <Text style={[styles.version, { color: colors.text.secondary }]}>Version {tosDoc.version}</Text>
            <Text style={[styles.p, { color: colors.text.primary }]}>{tosDoc.content}</Text>
          </View>
        ) : (
          <View>
            <Text style={[styles.version, { color: colors.text.secondary }]}>Dernière mise à jour : 30 Août 2026</Text>

            <Text style={[styles.h2, { color: colors.text.primary }]}>1. Objet</Text>
            <Text style={[styles.p, { color: colors.text.primary }]}>
              Les présentes Conditions Générales d’Utilisation (ci-après « CGU ») régissent l’accès et l’utilisation de l’application de messagerie (ci-après « l’Application ») par tout utilisateur, quel que soit son pays de résidence.
            </Text>

            <Text style={[styles.h2, { color: colors.text.primary }]}>2. Acceptation des CGU</Text>
            <Text style={[styles.p, { color: colors.text.primary }]}>
              En téléchargeant, installant ou utilisant l’Application, l’utilisateur accepte sans réserve les présentes CGU. Si l’utilisateur refuse, il doit cesser immédiatement d’utiliser l’Application.
            </Text>

            <Text style={[styles.h2, { color: colors.text.primary }]}>3. Accès et inscription</Text>
            <Text style={[styles.p, { color: colors.text.primary }]}>
              L’accès à l’Application nécessite la création d’un compte utilisateur. L’utilisateur s’engage à fournir des informations exactes et à les maintenir à jour.
            </Text>

            <Text style={[styles.h2, { color: colors.text.primary }]}>4. Utilisation de l’Application</Text>
            <Text style={[styles.bullet, { color: colors.text.primary }]}>• Ne pas utiliser l’Application à des fins illégales ou frauduleuses.</Text>
            <Text style={[styles.bullet, { color: colors.text.primary }]}>• Respecter les lois locales et internationales en vigueur.</Text>
            <Text style={[styles.bullet, { color: colors.text.primary }]}>• Ne pas diffuser de contenus violents ou haineux.</Text>

            <Text style={[styles.h3, { color: colors.text.primary }]}>Sécurité et respect</Text>
            <Text style={[styles.p, { color: colors.text.primary }]}>
              Tout utilisateur tentant de hacker l’Application ou partageant des contenus interdits (pornographie, etc.) verra son compte immédiatement banni.
            </Text>

            <Text style={[styles.h2, { color: colors.text.primary }]}>5. Données personnelles</Text>
            <Text style={[styles.p, { color: colors.text.primary }]}>
              L’Application traite vos données conformément à la Politique de Confidentialité.
            </Text>

            <Text style={[styles.h2, { color: colors.text.primary }]}>10. Contact</Text>
            <Text style={[styles.p, { color: colors.text.primary }]}>
              Pour toute question : <Text style={{ fontWeight: 'bold', color: colors.primary }}>Wecanconcept@gmail.com</Text>
            </Text>
          </View>
        )}
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
  h3: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 5 },
  version: { fontSize: 12, marginBottom: 20, fontStyle: 'italic' },
  p: { fontSize: 15, lineHeight: 24, marginBottom: 15 },
  bullet: { fontSize: 15, marginLeft: 15, marginBottom: 10 },
});
