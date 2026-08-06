import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { colors, normalize } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import apiService from '../services/api.service';

const LegalAcceptanceScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { documents } = route.params as any;
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      // On prend la version la plus récente de CGU pour marquer l'acceptation
      const latestVersion = documents.find((d: any) => d.type === 'tos')?.version || '1.0.0';
      await apiService.updateProfile({ accepted_legal_version: latestVersion });

      navigation.dispatch(CommonActions.reset({
        index: 0,
        routes: [{ name: 'ChatList' }]
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={normalize(40)} color={colors.primary} />
        <Text style={styles.title}>Mise à jour légale</Text>
        <Text style={styles.subtitle}>Nous avons mis à jour nos conditions pour mieux vous protéger.</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {documents.map((doc: any, index: number) => (
          <View key={index} style={styles.docSection}>
            <Text style={styles.docTitle}>{doc.type === 'privacy' ? 'Politique de Confidentialité' : 'Conditions Générales'}</Text>
            <Text style={styles.docVersion}>Version {doc.version}</Text>
            <View style={styles.docBody}>
              <Text style={styles.docText}>{doc.content}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>En cliquant sur "Accepter", vous confirmez avoir lu et accepté les nouvelles conditions.</Text>
        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleAccept}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ACCEPTER ET CONTINUER</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', padding: 30, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: normalize(22), fontWeight: '900', color: '#111827', marginTop: 15 },
  subtitle: { fontSize: normalize(14), color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  content: { flex: 1, padding: 20 },
  docSection: { marginBottom: 30 },
  docTitle: { fontSize: normalize(16), fontWeight: 'bold', color: colors.primary, textTransform: 'uppercase' },
  docVersion: { fontSize: normalize(11), color: '#9CA3AF', marginBottom: 10 },
  docBody: { backgroundColor: '#F9FAFB', borderRadius: 15, padding: 15, borderWidth: 1, borderBottomColor: '#E5E7EB' },
  docText: { fontSize: normalize(13), color: '#374151', lineHeight: 20 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  footerText: { fontSize: normalize(11), color: '#9CA3AF', textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 18, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: normalize(14), fontWeight: '900', letterSpacing: 1 },
});

export default LegalAcceptanceScreen;
