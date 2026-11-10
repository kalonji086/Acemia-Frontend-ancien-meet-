import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Image,
} from 'react-native';
import { ArrowLeft, Building2, Mail, Phone, MapPin, GraduationCap, FileText, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolRequestScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isTablet = windowWidth > 768;
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolEmail: '',
    schoolPhone: '',
    schoolAddress: '',
    schoolType: '',
    description: ''
  });

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (step === 1 && (!formData.schoolName || !formData.schoolType)) {
      return Alert.alert('Attention', 'Veuillez remplir les champs obligatoires (Nom et Type).');
    }
    if (step === 2 && !formData.schoolEmail) {
      return Alert.alert('Attention', 'L\'email de l\'école est requis.');
    }
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await apiService.submitSchoolRequest(formData);
      if (response.success) {
        Alert.alert(
          'Demande envoyée !',
          'Votre demande de création d\'école a été soumise avec succès et est en attente d\'approbation.',
          [{ text: 'OK', onPress: () => navigation.navigate('SchoolDashboard') }]
        );
      } else {
        throw new Error(response.error || 'Erreur lors de l\'envoi');
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text.primary, fontSize: normalize(20) }]}>
              Étape 1 : Identité de l'école
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Nom de l'école *</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Building2 size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                  value={formData.schoolName}
                  onChangeText={(v) => updateForm('schoolName', v)}
                  placeholder="Ex: Complexe Scolaire Le Flambeau"
                  placeholderTextColor={colors.text.disabled}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Type d'enseignement *</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <GraduationCap size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                  value={formData.schoolType}
                  onChangeText={(v) => updateForm('schoolType', v)}
                  placeholder="Ex: Maternelle, Primaire, Secondaire"
                  placeholderTextColor={colors.text.disabled}
                />
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text.primary, fontSize: normalize(20) }]}>
              Étape 2 : Contacts & Localisation
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Email de l'école *</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Mail size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                  value={formData.schoolEmail}
                  onChangeText={(v) => updateForm('schoolEmail', v)}
                  placeholder="contact@ecole.com"
                  placeholderTextColor={colors.text.disabled}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Téléphone</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Phone size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                  value={formData.schoolPhone}
                  onChangeText={(v) => updateForm('schoolPhone', v)}
                  placeholder="+243..."
                  placeholderTextColor={colors.text.disabled}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Adresse Physique</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <MapPin size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                  value={formData.schoolAddress}
                  onChangeText={(v) => updateForm('schoolAddress', v)}
                  placeholder="Ex: Gombe, Kinshasa"
                  placeholderTextColor={colors.text.disabled}
                />
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text.primary, fontSize: normalize(20) }]}>
              Étape 3 : Vision & Description
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Description / Vision</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, alignItems: 'flex-start', paddingTop: 12, height: 120 }]}>
                <FileText size={20} color={colors.text.disabled} style={{ marginTop: 2 }} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, fontSize: normalize(16), height: '100%', textAlignVertical: 'top' }]}
                  value={formData.description}
                  onChangeText={(v) => updateForm('description', v)}
                  placeholder="Décrivez brièvement la vision de votre école..."
                  placeholderTextColor={colors.text.disabled}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={prevStep} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.brandBlock}>
            <Image source={require('../../assets/AcemiaLogo.png')} style={styles.brandLogo} resizeMode="contain" />
            <View style={styles.brandCopy}>
              <Text style={[styles.brandName, { color: colors.text.primary }]}>Acemia</Text>
              <Text style={[styles.headerTitle, { color: colors.text.secondary, fontSize: normalize(12) }]}>CRÉATION D'ÉCOLE</Text>
            </View>
          </View>
          <Text style={[styles.stepBadge, { color: colors.primary, backgroundColor: colors.primary + '15' }]}>
            {step}/3
          </Text>
        </View>

        {/* Barre de progression des étapes */}
        <View style={styles.progressContainer}>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressLabel, { color: colors.text.secondary }]}>Votre demande</Text>
            <Text style={[styles.progressPercent, { color: colors.primary }]}>{Math.round((step / 3) * 100)}%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${(step / 3) * 100}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, isTablet && styles.tabletContainer]} keyboardShouldPersistTaps="handled">
          {renderStep()}

          <View style={styles.buttonRow}>
            {step > 1 && (
              <TouchableOpacity
                style={[styles.navButton, { borderColor: colors.primary, borderWidth: 1, marginRight: 10 }]}
                onPress={prevStep}
              >
                <Text style={[styles.navButtonText, { color: colors.primary }]}>Retour</Text>
              </TouchableOpacity>
            )}

            {step < 3 ? (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={nextStep}
              >
                <Text style={styles.actionButtonText}>Suivant</Text>
                <ChevronRight size={18} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionButtonText}>Soumettre la demande</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000008' },
  brandBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo: { width: 42, height: 42 },
  brandCopy: { gap: 2 },
  brandName: { fontSize: 17, fontWeight: '900', letterSpacing: -0.4 },
  headerTitle: { fontWeight: '800', letterSpacing: 1 },
  stepBadge: { overflow: 'hidden', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontWeight: '900', fontSize: 13 },
  progressContainer: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 8 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  progressLabel: { fontSize: 12, fontWeight: '700' },
  progressPercent: { fontSize: 12, fontWeight: '900' },
  progressBar: { height: 7, borderRadius: 8, width: '100%', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 8 },
  scrollContent: { padding: 22, paddingBottom: 32 },
  tabletContainer: { maxWidth: 680, alignSelf: 'center', width: '100%' },
  stepContainer: { width: '100%' },
  stepTitle: { fontWeight: 'bold', marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontWeight: '600', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 58,
    backgroundColor: '#00000004',
    width: '100%'
  },
  input: { flex: 1, marginLeft: 10, height: '100%' },
  buttonRow: { flexDirection: 'row', marginTop: 30, justifyContent: 'space-between', width: '100%', gap: 12 },
  navButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  navButtonText: { fontWeight: 'bold' },
  actionButton: {
    flex: 2,
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionButtonText: { color: '#fff', fontWeight: 'bold', marginRight: 5 }
});
