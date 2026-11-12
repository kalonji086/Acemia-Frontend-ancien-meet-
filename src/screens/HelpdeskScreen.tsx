import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiService from '../services/api.service';

const HELP_CATEGORIES = [
  { id: 'connection', label: 'Problème de connexion', icon: 'wifi-outline' },
  { id: 'bug', label: 'Signaler un bug', icon: 'bug-outline' },
  { id: 'account', label: 'Gestion du compte', icon: 'person-circle-outline' },
  { id: 'translation', label: 'Traduction intelligente', icon: 'language-outline' },
  { id: 'other', label: 'Autre question', icon: 'help-circle-outline' },
];

export default function HelpdeskScreen({ navigation, isComponent = false }: any) {
  const { colors, normalize, isDark, fontSizeFactor } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const u = await apiService.getCurrentUser();
    if (u) {
      setUser(u);
      setEmail(u.email);
    }
  };

  const handleSubmit = async () => {
    if (!category) return Alert.alert('Attention', 'Veuillez sélectionner une catégorie.');
    if (!reason.trim()) return Alert.alert('Attention', 'Veuillez décrire votre problème.');
    if (!email.trim() || !email.includes('@')) return Alert.alert('Attention', 'Veuillez fournir un email valide.');

    setLoading(true);
    try {
      const res = await apiService.submitHelpdesk({ category, reason, email });
      if (res.success) {
        Alert.alert('Succès', 'Votre demande a été envoyée. Notre équipe vous répondra par e-mail.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Erreur', res.error || 'Impossible d\'envoyer la demande.');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Un problème réseau est survenu.');
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors, normalize, fontSizeFactor, isDark, width, height, insets, isComponent);

  return (
    <View style={styles.container}>
      {!isComponent && (
        <>
          <ImageBackground
            source={require('../../assets/AcemiaBackground.png')}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backgroundOverlay]} />
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        </>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentWrapper}>
            {!isComponent && (
              <View style={styles.hero}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Retour">
                  <Ionicons name="arrow-back" size={22} color={colors.primary} />
                </TouchableOpacity>
                <Image source={require('../../assets/AcemiaLogo.png')} style={styles.brandLogo} resizeMode="contain" accessibilityLabel="Acemia" />
                <Text style={styles.heroTitle}>Centre d’aide</Text>
                <Text style={styles.heroSubtitle}>Une question ? Notre équipe est là pour vous.</Text>
              </View>
            )}

            <View style={styles.formCard}>
              <View style={styles.cardHeading}>
                <View style={styles.headingIcon}>
                  <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
                </View>
                <View style={styles.headingCopy}>
                  <Text style={styles.cardTitle}>Comment pouvons-nous vous aider ?</Text>
                  <Text style={styles.cardSubtitle}>Décrivez votre demande et nous vous répondrons par e-mail.</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Votre problème</Text>
              <View style={styles.searchBarWrapper}>
                <Ionicons name="search-outline" size={19} color={colors.text.secondary} />
                <TextInput
                  style={styles.searchInputField}
                  placeholder="Résumez votre problème..."
                  placeholderTextColor={colors.text.disabled}
                  value={reason}
                  onChangeText={setReason}
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                />
                {reason.length > 0 && (
                  <TouchableOpacity onPress={() => setReason('')} accessibilityRole="button" accessibilityLabel="Effacer le texte">
                    <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.sectionTitle}>Catégorie</Text>
              <View style={styles.categoriesGrid}>
                {HELP_CATEGORIES.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: category === item.id }}
                    style={[styles.categoryItem, category === item.id && styles.categoryItemSelected]}
                    onPress={() => setCategory(item.id)}
                  >
                    <Ionicons name={item.icon as any} size={22} color={category === item.id ? colors.primary : colors.text.secondary} />
                    <Text style={[styles.categoryLabel, category === item.id && styles.categoryLabelSelected]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Adresse e-mail</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={19} color={colors.text.secondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Votre adresse e-mail de contact"
                  placeholderTextColor={colors.text.disabled}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!user}
                />
              </View>

              <Text style={styles.sectionTitle}>Description détaillée</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Ajoutez les détails qui nous aideront à comprendre votre demande..."
                placeholderTextColor={colors.text.disabled}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                accessibilityRole="button"
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>ENVOYER MA DEMANDE</Text>}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Vous pouvez aussi nous écrire directement</Text>
                <Text style={styles.supportEmail}>support@meetme.app</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: any, normalize: any, factor: number, isDark: boolean, width: number, height: number, insets: { top: number; bottom: number }, isComponent: boolean) => {
  const compact = width < 360 || height < 700;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backgroundOverlay: { backgroundColor: isDark ? 'rgba(18,18,18,0.82)' : 'rgba(255,255,255,0.56)' },
  scrollContent: { flexGrow: 1, paddingTop: isComponent ? 18 : Math.max(insets.top, compact ? 12 : 20), paddingBottom: isComponent ? 16 : Math.max(insets.bottom, compact ? 12 : 20), paddingHorizontal: width < 360 ? 16 : 26, justifyContent: 'center' },
  contentWrapper: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  hero: { alignItems: 'center', marginBottom: compact ? 12 : 18, paddingTop: 4 },
  backButton: { position: 'absolute', top: 8, left: 0, width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  brandLogo: { width: normalize(compact ? 108 : 124, factor), height: normalize(compact ? 70 : 86, factor), marginBottom: 2 },
  heroTitle: { fontSize: normalize(25, factor), fontWeight: '800', letterSpacing: -0.5, color: colors.text.primary, textAlign: 'center' },
  heroSubtitle: { fontSize: normalize(13, factor), color: colors.text.secondary, textAlign: 'center', marginTop: 5 },
  formCard: { width: '100%', padding: width < 360 ? 16 : 24, backgroundColor: colors.surface, borderRadius: 26, borderWidth: 1, borderColor: colors.border, shadowColor: '#17152B', shadowOpacity: isDark ? 0 : 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: isDark ? 0 : 3 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: compact ? 14 : 22 },
  headingIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primary + '12', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headingCopy: { flex: 1 },
  cardTitle: { fontSize: normalize(16, factor), fontWeight: '800', color: colors.text.primary },
  cardSubtitle: { fontSize: normalize(12, factor), lineHeight: normalize(17, factor), color: colors.text.secondary, marginTop: 4 },
  sectionTitle: { fontSize: normalize(12, factor), fontWeight: '700', color: colors.text.primary, marginBottom: 8, marginTop: 8 },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#252525' : '#F9F9FB', borderRadius: 14, paddingHorizontal: 14, height: normalize(52, factor), marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  searchInputField: { flex: 1, marginLeft: 10, fontSize: normalize(14, factor), color: colors.text.primary },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 4 },
  categoryItem: { width: '48%', minHeight: compact ? 68 : 78, flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: compact ? 8 : 12, paddingVertical: 10, alignItems: 'center', marginBottom: 10 },
  categoryItemSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  categoryLabel: { flex: 1, fontSize: normalize(11, factor), marginLeft: 8, color: colors.text.secondary, lineHeight: normalize(15, factor) },
  categoryLabelSelected: { color: colors.primary, fontWeight: '700' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#252525' : '#F9F9FB', borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, height: normalize(52, factor), marginBottom: 8 },
  input: { flex: 1, marginLeft: 10, fontSize: normalize(14, factor), color: colors.text.primary },
  textArea: { backgroundColor: isDark ? '#252525' : '#F9F9FB', borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, fontSize: normalize(14, factor), color: colors.text.primary, minHeight: 110, marginBottom: 18 },
  submitButton: { backgroundColor: colors.primary, height: normalize(54, factor), borderRadius: 15, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 3 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontWeight: '800', fontSize: normalize(14, factor), letterSpacing: 0.4 },
  footer: { marginTop: 22, alignItems: 'center', paddingBottom: isComponent ? 4 : 12 },
  footerText: { fontSize: normalize(12, factor), color: colors.text.secondary, textAlign: 'center' },
  supportEmail: { fontSize: normalize(14, factor), fontWeight: '700', color: colors.primary, marginTop: 5 },
  });
};
