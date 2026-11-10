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
import {
  ArrowLeft, Building2, Globe, Mail, Phone, MapPin,
  Users, ClipboardCheck, ChevronRight, CheckCircle2
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function EmployerRequestScreen({ navigation }: any) {
  const { colors, normalize, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    companyWebsite: '',
    industry: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    companySize: '',
    hiringNeeds: ''
  });

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (step === 1 && (!formData.companyName || !formData.industry)) {
      return Alert.alert('Attention', 'Veuillez remplir les champs obligatoires.');
    }
    if (step === 2 && !formData.companyEmail) {
      return Alert.alert('Attention', 'L\'email professionnel est requis.');
    }
    if (step < 5) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await apiService.submitEmployerRequest(formData);
      if (response.success) {
        Alert.alert(
          'Demande envoyée !',
          'Votre demande est en cours d\'examen par nos administrateurs. Vous recevrez un email dès qu\'elle sera approuvée.',
          [{ text: 'OK', onPress: () => navigation.navigate('ChatList') }]
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
            <Text style={[styles.stepTitle, { color: colors.text.primary, fontSize: normalize(22) }]}>Identité de l'entreprise</Text>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Nom de l'entreprise *</Text>
                  <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Building2 size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                  value={formData.companyName}
                  onChangeText={(v) => updateForm('companyName', v)}
                  placeholder="Ex: Mon entreprise"
                  placeholderTextColor={colors.text.disabled}
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Secteur d'activité *</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <ClipboardCheck size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                  value={formData.industry}
                  onChangeText={(v) => updateForm('industry', v)}
                  placeholder="Ex: Informatique, Santé, etc."
                  placeholderTextColor={colors.text.disabled}
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Site Web (Optionnel)</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Globe size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                  value={formData.companyWebsite}
                  onChangeText={(v) => updateForm('companyWebsite', v)}
                  placeholder="https://..."
                  placeholderTextColor={colors.text.disabled}
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text.primary, fontSize: normalize(22) }]}>Contact professionnel</Text>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Email de contact *</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Mail size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                  value={formData.companyEmail}
                  onChangeText={(v) => updateForm('companyEmail', v)}
                  placeholder="rh@entreprise.com"
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
                  value={formData.companyPhone}
                  onChangeText={(v) => updateForm('companyPhone', v)}
                  placeholder="+243..."
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text.primary, fontSize: normalize(22) }]}>Localisation</Text>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Adresse du siège social</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                <MapPin size={20} color={colors.text.disabled} style={{ marginTop: 2 }} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, height: '100%', fontSize: normalize(16) }]}
                  value={formData.companyAddress}
                  onChangeText={(v) => updateForm('companyAddress', v)}
                  placeholder="N°, Rue, Commune, Ville..."
                  multiline
                />
              </View>
            </View>
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text.primary, fontSize: normalize(22) }]}>Besoins en recrutement</Text>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Taille de l'entreprise</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Users size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                  value={formData.companySize}
                  onChangeText={(v) => updateForm('companySize', v)}
                  placeholder="Ex: 1-10, 11-50, +100 employés"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Description des besoins</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, height: 120, alignItems: 'flex-start', paddingTop: 12 }]}>
                <ClipboardCheck size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, height: '100%', fontSize: normalize(16) }]}
                  value={formData.hiringNeeds}
                  onChangeText={(v) => updateForm('hiringNeeds', v)}
                  placeholder="Quels types de profils recherchez-vous ?"
                  multiline
                />
              </View>
            </View>
          </View>
        );
      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text.primary, fontSize: normalize(22) }]}>Confirmation</Text>
            <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.reviewLabel, { color: colors.text.secondary, fontSize: normalize(12) }]}>Entreprise</Text>
              <Text style={[styles.reviewValue, { color: colors.text.primary, fontSize: normalize(18) }]}>{formData.companyName}</Text>

              <Text style={[styles.reviewLabel, { color: colors.text.secondary, marginTop: 15, fontSize: normalize(12) }]}>Email RH</Text>
              <Text style={[styles.reviewValue, { color: colors.text.primary, fontSize: normalize(18) }]}>{formData.companyEmail}</Text>

              <Text style={[styles.reviewLabel, { color: colors.text.secondary, marginTop: 15, fontSize: normalize(12) }]}>Secteur</Text>
              <Text style={[styles.reviewValue, { color: colors.text.primary, fontSize: normalize(18) }]}>{formData.industry}</Text>
            </View>
            <Text style={[styles.note, { color: colors.text.secondary, fontSize: normalize(13) }]}>
              En soumettant cette demande, vous acceptez que l'administration d’Acemia vérifie vos informations professionnelles.
            </Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingHorizontal: isTablet ? '10%' : 15 }]}>
          <TouchableOpacity onPress={prevStep} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Image source={require('../../assets/AcemiaLogo.png')} style={styles.brandLogo} resizeMode="contain" />
          <View style={styles.progressContainer}>
            <Text style={[styles.brandName, { color: colors.text.primary }]}>Acemia Emploi</Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${(step / 5) * 100}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.stepIndicator, { color: colors.text.secondary }]}>ÉTAPE {step} SUR 5</Text>
          </View>
          <Text style={[styles.stepBadge, { color: colors.primary, backgroundColor: colors.primary + '15' }]}>{step}/5</Text>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isTablet ? '20%' : 25 }]} keyboardShouldPersistTaps="handled">
          {renderStep()}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border, paddingHorizontal: isTablet ? '20%' : 20 }]}>
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={step === 5 ? handleSubmit : nextStep}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={[styles.nextBtnText, { fontSize: normalize(16) }]}>{step === 5 ? 'SOUMETTRE LA DEMANDE' : 'CONTINUER'}</Text>
                {step < 5 && <ChevronRight size={20} color="#fff" />}
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  backBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000008' },
  brandLogo: { width: 42, height: 42 },
  progressContainer: { flex: 1, gap: 5 },
  brandName: { fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
  progressBar: { height: 7, borderRadius: 8, width: '100%', overflow: 'hidden' },
  progressFill: { height: '100%' },
  stepIndicator: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  stepBadge: { overflow: 'hidden', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8, fontSize: 12, fontWeight: '900' },
  scrollContent: { paddingVertical: 24, paddingBottom: 36 },
  stepContainer: { width: '100%' },
  stepTitle: { fontSize: 24, fontWeight: '900', marginBottom: 25, letterSpacing: -0.5 },
  inputGroup: { marginBottom: 22 },
  label: { fontWeight: '800', marginBottom: 9, marginLeft: 2 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 58,
    backgroundColor: '#00000004',
  },
  input: { flex: 1, marginLeft: 12 },
  footer: { paddingVertical: 18, borderTopWidth: StyleSheet.hairlineWidth },
  nextBtn: {
    height: 58,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5
  },
  nextBtnText: { color: '#fff', fontWeight: 'bold', marginRight: 8 },
  reviewCard: { padding: 20, borderRadius: 20, borderWidth: 1 },
  reviewLabel: { textTransform: 'uppercase', letterSpacing: 1 },
  reviewValue: { fontWeight: 'bold', marginTop: 5 },
  note: { marginTop: 25, textAlign: 'center', fontStyle: 'italic', lineHeight: 20 }
});
