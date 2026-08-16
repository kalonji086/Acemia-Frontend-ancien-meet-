import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
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

  const styles = createStyles(colors, normalize, fontSizeFactor, isDark);

  return (
    <View style={styles.container}>
      {!isComponent && (
        <>
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Centre d'aide</Text>
          </View>
        </>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {!isComponent && <View style={{ height: 1 }} />}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={40} color={colors.primary} />
            <Text style={styles.infoText}>Dites-nous ce qui ne va pas. Utilisez la barre de recherche ci-dessous pour décrire votre problème et nous l'envoyer directement.</Text>
          </View>

          <Text style={styles.sectionTitle}>Que cherchez-vous ?</Text>
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search-outline" size={20} color="#999" />
            <TextInput
              style={styles.searchInputField}
              placeholder="Décrivez votre problème ici..."
              placeholderTextColor="#999"
              value={reason}
              onChangeText={setReason}
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
            />
            {reason.length > 0 && (
              <TouchableOpacity onPress={() => setReason('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.sectionTitle}>Catégorie (optionnel)</Text>
          <View style={styles.categoriesGrid}>
            {HELP_CATEGORIES.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.categoryItem, category === item.id && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                onPress={() => setCategory(item.id)}
              >
                <Ionicons name={item.icon as any} size={24} color={category === item.id ? colors.primary : '#666'} />
                <Text style={[styles.categoryLabel, category === item.id && { color: colors.primary, fontWeight: 'bold' }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Vos informations</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#999" />
            <TextInput
              style={styles.input}
              placeholder="Votre adresse email de contact"
              placeholderTextColor="#999"
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
            placeholder="Décrivez votre problème ici avec le plus de détails possible..."
            placeholderTextColor="#999"
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>ENVOYER MA DEMANDE</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Vous pouvez aussi nous contacter directement à</Text>
            <Text style={styles.supportEmail}>support@meetme.app</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: any, normalize: any, factor: number, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { marginRight: 20 },
  headerTitle: { fontSize: normalize(18, factor), fontWeight: 'bold', color: colors.text.primary },
  scrollContent: { padding: 20 },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#333' : '#F0F2F5', padding: 20, borderRadius: 20, marginBottom: 25 },
  infoText: { flex: 1, marginLeft: 15, fontSize: normalize(13, factor), color: colors.text.secondary, lineHeight: 20 },
  sectionTitle: { fontSize: normalize(14, factor), fontWeight: 'bold', color: colors.text.primary, marginBottom: 15, marginTop: 10 },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#333' : '#F0F2F5', borderRadius: 15, paddingHorizontal: 15, height: 60, marginBottom: 25, borderWidth: 1, borderColor: colors.border },
  searchInputField: { flex: 1, marginLeft: 10, fontSize: normalize(15, factor), color: colors.text.primary },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  categoryItem: { width: '48%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 15, alignItems: 'center', marginBottom: 12, elevation: 1 },
  categoryLabel: { fontSize: normalize(11, factor), marginTop: 8, textAlign: 'center', color: colors.text.secondary },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingHorizontal: 15, height: 55, marginBottom: 10 },
  input: { flex: 1, marginLeft: 10, fontSize: normalize(14, factor), color: colors.text.primary },
  textArea: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 15, fontSize: normalize(14, factor), color: colors.text.primary, minHeight: 120, marginBottom: 25 },
  submitButton: { backgroundColor: colors.primary, height: 55, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: normalize(16, factor), letterSpacing: 1 },
  footer: { marginTop: 40, alignItems: 'center', paddingBottom: 20 },
  footerText: { fontSize: normalize(12, factor), color: '#999' },
  supportEmail: { fontSize: normalize(14, factor), fontWeight: 'bold', color: colors.primary, marginTop: 5 }
});
