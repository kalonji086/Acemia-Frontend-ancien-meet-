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
  useWindowDimensions
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
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={prevStep} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: normalize(18) }]}>
            Créer une École ({step}/3)
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Barre de progression des étapes */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${(step / 3) * 100}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, isTablet && styles.tabletContainer]}>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd'
  },
  backButton: { padding: 4 },
  headerTitle: { fontWeight: 'bold' },
  progressContainer: { paddingHorizontal: 20, paddingTop: 10 },
  progressBar: { height: 6, borderRadius: 3, width: '100%', overflow: 'hidden' },
  progressFill: { height: '100%' },
  scrollContent: { padding: 20 },
  tabletContainer: { maxWidth: 600, alignSelf: 'center', width: '100%' },
  stepContainer: { width: '100%' },
  stepTitle: { fontWeight: 'bold', marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontWeight: '600', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 54,
    width: '100%'
  },
  input: { flex: 1, marginLeft: 10, height: '100%' },
  buttonRow: { flexDirection: 'row', marginTop: 30, justifyContent: 'space-between', width: '100%' },
  navButton: {
    flex: 1,
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  navButtonText: { fontWeight: 'bold' },
  actionButton: {
    flex: 2,
    height: 54,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionButtonText: { color: '#fff', fontWeight: 'bold', marginRight: 5 }
});
