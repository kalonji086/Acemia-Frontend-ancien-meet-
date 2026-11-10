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
import { ArrowLeft, Briefcase, MapPin, DollarSign, FileText, Gift, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function CreateJobPostingScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    jobType: 'CDI',
    salaryRange: '',
    requirements: '',
    benefits: '',
    category: 'tech'
  });

  const CATEGORIES = [
    { id: 'all', name: 'Tous' },
    { id: 'tech', name: 'Tech' },
    { id: 'sales', name: 'Vente' },
    { id: 'health', name: 'Santé' },
    { id: 'manual', name: 'Artisan' },
    { id: 'education', name: 'Éducation' },
    { id: 'finance', name: 'Finance' },
    { id: 'marketing', name: 'Marketing' },
    { id: 'logistics', name: 'Logistique' },
    { id: 'other', name: 'Autre' }
  ];

  const nextStep = () => {
    if (step === 1) {
      if (!formData.title.trim()) {
        return Alert.alert('Attention', 'Le titre du poste est obligatoire.');
      }
      if (!formData.location.trim()) {
        return Alert.alert('Attention', 'La localisation est obligatoire.');
      }
      if (formData.title.length < 5) {
        return Alert.alert('Attention', 'Le titre doit contenir au moins 5 caractères.');
      }
    }
    if (step === 2) {
      if (!formData.description.trim()) {
        return Alert.alert('Attention', 'La description détaillée est obligatoire.');
      }
      if (formData.description.length < 50) {
        return Alert.alert('Attention', 'La description doit contenir au moins 50 caractères.');
      }
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
      // Préparer les données
      const jobData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        jobType: formData.jobType,
        salaryRange: formData.salaryRange.trim() || 'Non spécifié',
        requirements: formData.requirements.split('\n').filter(r => r.trim()),
        benefits: formData.benefits.split('\n').filter(b => b.trim()),
        category: formData.category
      };

      // Validation finale
      if (jobData.title.length < 5) {
        Alert.alert('Erreur', 'Le titre est trop court (minimum 5 caractères)');
        setLoading(false);
        return;
      }

      if (jobData.description.length < 50) {
        Alert.alert('Erreur', 'La description est trop courte (minimum 50 caractères)');
        setLoading(false);
        return;
      }

      const response = await apiService.postJob(jobData);
      console.log('Publication response:', response);

      if (response.success) {
        Alert.alert('Succès', 'Votre offre d\'emploi a été publiée avec succès !', [
          {
            text: 'Voir mes offres',
            onPress: () => navigation.navigate('MyJobs')
          }
        ]);
      } else {
        // Gérer les erreurs renvoyées par le serveur (ex: 403, 400)
        Alert.alert('Échec de la publication', response.error || response.message || 'Une erreur est survenue sur le serveur. Veuillez vérifier vos accès employeur.');
      }
    } catch (error: any) {
      console.error('Erreur publication:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Problème de connexion au serveur.';
      Alert.alert('Erreur', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text.primary }]}>Informations de base</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Titre du poste *</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Briefcase size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  value={formData.title}
                  onChangeText={(v) => setFormData({...formData, title: v})}
                  placeholder="Ex: Développeur Mobile Senior"
                  placeholderTextColor={colors.text.disabled}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Catégorie *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow} keyboardShouldPersistTaps="handled">
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      formData.category === cat.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: formData.category === cat.id }}
                    onPress={() => setFormData({...formData, category: cat.id})}
                  >
                    <Text style={[styles.categoryChipText, { color: formData.category === cat.id ? '#fff' : colors.text.secondary }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Localisation *</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <MapPin size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  value={formData.location}
                  onChangeText={(v) => setFormData({...formData, location: v})}
                  placeholder="Kinshasa, Gombe / Remote"
                  placeholderTextColor={colors.text.disabled}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Type de contrat</Text>
              <View style={styles.typeRow}>
                {['CDI', 'CDD', 'Freelance', 'Stage'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, { borderColor: colors.border, backgroundColor: colors.surface }, formData.jobType === t && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: formData.jobType === t }}
                    onPress={() => setFormData({...formData, jobType: t})}
                  >
                    <Text style={[styles.typeText, { color: formData.jobType === t ? '#fff' : colors.text.secondary }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text.primary }]}>Détails de l'offre</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Salaire / Fourchette</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <DollarSign size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  value={formData.salaryRange}
                  onChangeText={(v) => setFormData({...formData, salaryRange: v})}
                  placeholder="Ex: 1500$ - 2500$ par mois"
                  placeholderTextColor={colors.text.disabled}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Description détaillée *</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface, height: 200, alignItems: 'flex-start', paddingTop: 15 }]}>
                <FileText size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, height: '100%', textAlignVertical: 'top' }]}
                  value={formData.description}
                  onChangeText={(v) => setFormData({...formData, description: v})}
                  placeholder="Quelles seront les missions du candidat ?"
                  placeholderTextColor={colors.text.disabled}
                  multiline
                />
              </View>
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text.primary }]}>Pré-requis & Avantages</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Pré-requis (Un par ligne)</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface, height: 120, alignItems: 'flex-start', paddingTop: 15 }]}>
                <TextInput
                  style={[styles.input, { color: colors.text.primary, height: '100%', textAlignVertical: 'top' }]}
                  value={formData.requirements}
                  onChangeText={(v) => setFormData({...formData, requirements: v})}
                  placeholder="Ex: 3 ans d'expérience en React Native\nMaîtrise de TypeScript\nDiplôme en informatique"
                  placeholderTextColor={colors.text.disabled}
                  multiline
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Avantages (Un par ligne)</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface, height: 120, alignItems: 'flex-start', paddingTop: 15 }]}>
                <Gift size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, height: '100%', textAlignVertical: 'top' }]}
                  value={formData.benefits}
                  onChangeText={(v) => setFormData({...formData, benefits: v})}
                  placeholder="Ex: Assurance santé complète\nTravail hybride\nFormation continue\nTickets restaurant"
                  placeholderTextColor={colors.text.disabled}
                  multiline
                />
              </View>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
               <CheckCircle2 size={24} color={colors.primary} />
               <Text style={[styles.reviewText, { color: colors.text.primary }]}>En publiant cette offre, vous confirmez qu'elle respecte les conditions d'utilisation d'Acemia Emploi.</Text>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={prevStep} style={[styles.backBtn, { backgroundColor: colors.background }]} accessibilityRole="button" accessibilityLabel={step === 1 ? 'Retour' : 'Étape précédente'}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Image source={require('../../assets/AcemiaLogo.png')} style={styles.brandLogo} resizeMode="contain" />
          <View style={styles.progressContainer}>
            <Text style={[styles.brandName, { color: colors.text.primary }]}>Acemia Emploi</Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${(step / 3) * 100}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.stepIndicator, { color: colors.text.secondary }]}>ÉTAPE {step} SUR 3</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isTablet ? 48 : 22 }]} keyboardShouldPersistTaps="handled">
          {renderStep()}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={step === 3 ? handleSubmit : nextStep}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={step === 3 ? 'Publier l’offre d’emploi' : 'Continuer vers l’étape suivante'}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.nextBtnText}>{step === 3 ? 'PUBLIER L\'OFFRE' : 'CONTINUER'}</Text>
                {step < 3 && <ChevronRight size={20} color="#fff" />}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  backBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000008' },
  brandLogo: { width: 42, height: 42 },
  progressContainer: { flex: 1, gap: 5 },
  brandName: { fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
  progressBar: { height: 7, borderRadius: 8, width: '100%', overflow: 'hidden' },
  progressFill: { height: '100%' },
  stepIndicator: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  scrollContent: { width: '100%', maxWidth: 920, alignSelf: 'center', paddingVertical: 24, paddingBottom: 36 },
  stepContainer: { width: '100%' },
  stepTitle: { fontSize: 24, fontWeight: '900', marginBottom: 25, letterSpacing: -0.5 },
  inputGroup: { marginBottom: 22 },
  label: { fontSize: 13, fontWeight: '800', marginBottom: 9, marginLeft: 2 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 58,
    backgroundColor: '#00000004',
  },
  input: { flex: 1, marginLeft: 12, fontSize: 16 },
  categoriesRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingRight: 4 },
  categoryChip: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1, marginRight: 9 },
  categoryChipText: { fontSize: 13, fontWeight: '700' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeBtn: { minHeight: 44, minWidth: 78, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  typeText: { fontWeight: '800', fontSize: 13 },
  footer: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18, borderTopWidth: StyleSheet.hairlineWidth },
  nextBtn: {
    minHeight: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 8 },
  reviewCard: { padding: 20, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 15, alignItems: 'center' },
  reviewText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '500' }
});