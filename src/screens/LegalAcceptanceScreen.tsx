import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions, Alert, StatusBar } from 'react-native';
import { colors, normalize } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import apiService from '../services/api.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const LegalAcceptanceScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { documents } = route.params as any;
  const [loading, setLoading] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [acceptedChecked, setAcceptedChecked] = useState(false);

  // SÉCURITÉ VERSION 40 : Si l'utilisateur est déjà en v40, on bypass
  useEffect(() => {
    const checkV40 = async () => {
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        if (user.accepted_tos_version === '40.0.0' || user.accepted_tos_version === '40') {
           navigation.dispatch(CommonActions.reset({
              index: 0,
              routes: [{ name: 'ChatList' }]
           }));
        }
      }
    };
    checkV40();
  }, []);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    if (isCloseToBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
    if (!acceptedChecked) {
      Alert.alert('Action requise', 'Veuillez cocher la case d\'acceptation après avoir lu le document.');
      return;
    }
    setLoading(true);
    try {
      const updates: any = {};
      const latestVersion = '40.0.0'; // Version cible forcée

      documents.forEach((d: any) => {
        if (d.type === 'tos') updates.accepted_tos_version = d.version;
        if (d.type === 'privacy') updates.accepted_privacy_version = d.version;
      });

      const { isGuest } = route.params as any;
      if (isGuest) {
        await AsyncStorage.setItem('guest_accepted_legal_version', latestVersion);
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
      } else {
        const res = await apiService.updateProfile({
          accepted_legal_version: latestVersion,
          accepted_tos_version: latestVersion,
          accepted_privacy_version: latestVersion
        });

        if (res.success) {
          const userString = await AsyncStorage.getItem('user');
          if (userString) {
            const user = JSON.parse(userString);
            await AsyncStorage.setItem('user', JSON.stringify({
              ...user,
              accepted_legal_version: latestVersion,
              accepted_tos_version: latestVersion,
              accepted_privacy_version: latestVersion
            }));
          }
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'ChatList' }] }));
        } else {
          Alert.alert('Erreur', 'Validation impossible.');
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="document-text" size={normalize(32)} color="#fff" />
        </View>
        <Text style={styles.title}>Mise à jour des Conditions</Text>
        <Text style={styles.subtitle}>Nous avons mis à jour nos conditions d'utilisation pour mieux protéger vos données.</Text>
      </Animated.View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {documents.map((doc: any, index: number) => (
          <Animated.View entering={FadeInDown.delay(200 * index)} key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{doc.type === 'privacy' ? 'Confidentialité' : 'Conditions Générales'}</Text>
              <View style={styles.versionBadge}><Text style={styles.versionText}>v{doc.version}</Text></View>
            </View>
            <Text style={styles.docText}>{doc.content}</Text>
          </Animated.View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Animated.View entering={FadeInDown.duration(600)} style={styles.footer}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setAcceptedChecked(!acceptedChecked)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, acceptedChecked && styles.checkboxActive]}>
            {acceptedChecked && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={styles.checkboxLabel}>J'ai lu et j'accepte les conditions ci-dessus.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            (!acceptedChecked || loading) && styles.buttonDisabled
          ]}
          onPress={handleAccept}
          disabled={!acceptedChecked || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>CONTINUER</Text>}
        </TouchableOpacity>

        {!hasScrolledToBottom && (
          <Text style={styles.scrollTip}>Veuillez lire jusqu'en bas pour continuer</Text>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', paddingHorizontal: 30, paddingTop: 40, paddingBottom: 20 },
  iconCircle: { width: normalize(64), height: normalize(64), borderRadius: 32, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  title: { fontSize: normalize(24), fontWeight: '900', color: '#1F2937', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: normalize(14), color: '#6B7280', textAlign: 'center', marginTop: 10, lineHeight: 22, paddingHorizontal: 10 },
  content: { flex: 1, paddingHorizontal: 20 },
  card: { backgroundColor: '#F9FAFB', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#F3F4F6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: normalize(16), fontWeight: '800', color: '#374151' },
  versionBadge: { backgroundColor: '#EDE9FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  versionText: { fontSize: normalize(10), fontWeight: 'bold', color: colors.primary },
  docText: { fontSize: normalize(13), color: '#4B5563', lineHeight: 22 },
  footer: { padding: 30, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: '#D1D5DB', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { fontSize: normalize(13), color: '#4B5563', fontWeight: '600' },
  button: { backgroundColor: colors.primary, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  buttonDisabled: { backgroundColor: '#E5E7EB', shadowOpacity: 0, elevation: 0 },
  buttonText: { color: '#fff', fontSize: normalize(15), fontWeight: '900', letterSpacing: 1 },
  scrollTip: { textAlign: 'center', fontSize: normalize(10), color: colors.danger, fontWeight: 'bold', marginTop: 10, textTransform: 'uppercase' }
});

export default LegalAcceptanceScreen;
