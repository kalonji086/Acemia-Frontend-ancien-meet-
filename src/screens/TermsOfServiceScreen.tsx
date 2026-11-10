import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import apiService from '../services/api.service';

export default function TermsOfServiceScreen({ navigation, isComponent = false }: any) {
  const { colors, isDark, normalize } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [tosDoc, setTosDoc] = useState<any>(null);

  useEffect(() => {
    fetchTOS();
  }, []);

  const fetchTOS = async () => {
    try {
      console.log('Fetching TOS...');
      const res = await apiService.getLegalDocs();
      if (res.success && Array.isArray(res.data)) {
        const doc = res.data.find((d: any) => d.type === 'tos');
        if (doc) {
           console.log('TOS found, version:', doc.version);
           setTosDoc(doc);
        } else {
           console.log('No TOS doc found in array');
        }
      } else {
        console.log('TOS fetch failed or data not array:', res);
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
        <Text style={{ marginTop: 10, color: colors.text.secondary }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {!isComponent && (
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Conditions d'Utilisation</Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <Text style={[styles.h1, { color: colors.text.primary }]}>Conditions Générales d'Utilisation</Text>

        {tosDoc ? (
          <View style={styles.contentBlock}>
            <Text style={[styles.version, { color: colors.text.secondary }]}>Version {tosDoc.version}</Text>
            <Text style={[styles.p, { color: colors.text.primary }]}>{tosDoc.content}</Text>
          </View>
        ) : (
          <View style={styles.contentBlock}>
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
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backButton: { marginRight: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  contentBlock: { width: '100%' },
  h1: { fontSize: 24, fontWeight: '800', marginBottom: 15 },
  h2: { fontSize: 18, fontWeight: '700', marginTop: 25, marginBottom: 10 },
  h3: { fontSize: 16, fontWeight: '700', marginTop: 15, marginBottom: 5 },
  version: { fontSize: 12, marginBottom: 20, fontStyle: 'italic' },
  p: { fontSize: 15, lineHeight: 22, marginBottom: 15 },
  bullet: { fontSize: 15, marginLeft: 15, marginBottom: 8 },
});
