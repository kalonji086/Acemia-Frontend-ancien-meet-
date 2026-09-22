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
import { ArrowLeft, Building2, Mail, Phone, MapPin, GraduationCap, FileText } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolRequestScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async () => {
    if (!formData.schoolName || !formData.schoolEmail || !formData.schoolType) {
      return Alert.alert('Attention', 'Veuillez remplir les champs obligatoires (Nom, Email, Type).');
    }

    setLoading(true);
    try {
      const response = await apiService.getInstance().submitSchoolRequest(formData);
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: normalize(18) }]}>
            Créer une École
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, isTablet && styles.tabletContainer]}>
          <Text style={[styles.subtitle, { color: colors.text.secondary, fontSize: normalize(14) }]}>
            Devenez promoteur d'école en remplissant les informations requises ci-dessous.
          </Text>

          {/* School Name */}
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

          {/* School Email */}
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

          {/* School Phone */}
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

          {/* School Address */}
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

          {/* School Type */}
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

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Description / Vision</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, alignItems: 'flex-start', paddingTop: 12 }]}>
              <FileText size={20} color={colors.text.disabled} style={{ marginTop: 2 }} />
              <TextInput
                style={[styles.input, { color: colors.text.primary, fontSize: normalize(16), height: 100, textAlignVertical: 'top' }]}
                value={formData.description}
                onChangeText={(v) => updateForm('description', v)}
                placeholder="Décrivez brièvement la vision de votre école..."
                placeholderTextColor={colors.text.disabled}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.submitButtonText, { fontSize: normalize(16) }]}>Soumettre la demande</Text>
            )}
          </TouchableOpacity>
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
  scrollContent: { padding: 20 },
  tabletContainer: { maxWidth: 600, alignSelf: 'center', width: '100%' },
  subtitle: { marginBottom: 25, textAlign: 'center', lineHeight: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontWeight: '600', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 54
  },
  input: { flex: 1, marginLeft: 10, height: '100%' },
  submitButton: {
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  submitButtonText: { color: '#fff', fontWeight: 'bold' }
});
