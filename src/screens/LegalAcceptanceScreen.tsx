import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { colors, normalize } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import apiService from '../services/api.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LegalAcceptanceScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { documents } = route.params as any;
  const [loading, setLoading] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
    if (isCloseToBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
    if (!hasScrolledToBottom) return;
    setLoading(true);
    try {
      // On récupère toutes les versions des documents acceptés
      const updates: any = {};
      const latestDoc = documents[documents.length - 1];
      const latestVersion = latestDoc?.version || '1.0.0';

      documents.forEach((d: any) => {
        if (d.type === 'tos') updates.accepted_tos_version = d.version;
        if (d.type === 'privacy') updates.accepted_privacy_version = d.version;
      });

      const { isGuest } = route.params as any;
      if (isGuest) {
        await AsyncStorage.setItem('guest_accepted_legal_version', latestVersion);
        navigation.dispatch(CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }]
        }));
      } else {
        const res = await apiService.updateProfile({
          accepted_legal_version: latestVersion,
          ...updates
        });

        if (res.success) {
          // Mise à jour de l'objet utilisateur local immédiatement
          const userString = await AsyncStorage.getItem('user');
          if (userString) {
            const user = JSON.parse(userString);
            const updatedUser = {
              ...user,
              accepted_legal_version: latestVersion,
              ...updates
            };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          }

          navigation.dispatch(CommonActions.reset({
            index: 0,
            routes: [{ name: 'ChatList' }]
          }));
        } else {
          Alert.alert('Erreur', 'Impossible de valider votre acceptation.');
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la validation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={normalize(40)} color={colors.primary} />
        <Text style={styles.title}>Mise à jour légale</Text>
        <Text style={styles.subtitle}>Veuillez lire et faire défiler jusqu'en bas pour accepter les nouvelles conditions.</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {documents.map((doc: any, index: number) => (
          <View key={index} style={styles.docSection}>
            <Text style={styles.docTitle}>{doc.type === 'privacy' ? 'Politique de Confidentialité' : 'Conditions Générales'}</Text>
            <Text style={styles.docVersion}>Version {doc.version}</Text>
            <View style={styles.docBody}>
              <Text style={styles.docText}>{doc.content}</Text>
            </View>
          </View>
        ))}
        <View style={{ height: 50 }} />
      </ScrollView>

      <View style={styles.footer}>
        {!hasScrolledToBottom && (
          <Text style={[styles.footerText, { color: colors.danger, fontWeight: 'bold' }]}>
            Défilez jusqu'en bas pour activer le bouton.
          </Text>
        )}
        <Text style={styles.footerText}>En cliquant sur "Accepter", vous confirmez avoir lu et accepté les nouvelles conditions.</Text>
        <TouchableOpacity
          style={[
            styles.button,
            (loading || !hasScrolledToBottom) && { backgroundColor: '#E5E7EB', opacity: 0.8 }
          ]}
          onPress={handleAccept}
          disabled={loading || !hasScrolledToBottom}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.buttonText, !hasScrolledToBottom && { color: '#9CA3AF' }]}>
              ACCEPTER ET CONTINUER
            </Text>
          )}
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
