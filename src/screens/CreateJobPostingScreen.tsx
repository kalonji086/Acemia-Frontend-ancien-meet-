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
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
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
              <View style={styles.categoriesRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      { borderColor: colors.border },
                      formData.category === cat.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setFormData({...formData, category: cat.id})}
                  >
                    <Text style={[styles.categoryChipText, { color: formData.category === cat.id ? '#fff' : colors.text.secondary }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Localisation *</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
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
                    style={[styles.typeBtn, { borderColor: colors.border }, formData.jobType === t && { backgroundColor: colors.primary, borderColor: colors.primary }]}
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
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
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
              <View style={[styles.inputWrapper, { borderColor: colors.border, height: 200, alignItems: 'flex-start', paddingTop: 15 }]}>
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
              <View style={[styles.inputWrapper, { borderColor: colors.border, height: 120, alignItems: 'flex-start', paddingTop: 15 }]}>
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
              <View style={[styles.inputWrapper, { borderColor: colors.border, height: 120, alignItems: 'flex-start', paddingTop: 15 }]}>
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
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={prevStep} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${(step / 3) * 100}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.stepIndicator, { color: colors.text.secondary }]}>Étape {step}/3</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isTablet ? '20%' : 25 }]}>
          {renderStep()}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={step === 3 ? handleSubmit : nextStep}
            disabled={loading}
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  backBtn: { padding: 5 },
  progressContainer: { flex: 1, marginLeft: 20 },
  progressBar: { height: 6, borderRadius: 3, width: '100%', marginBottom: 5, overflow: 'hidden' },
  progressFill: { height: '100%' },
  stepIndicator: { fontSize: 12, fontWeight: '600' },
  scrollContent: { paddingVertical: 25 },
  stepContainer: { width: '100%' },
  stepTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 25 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 2 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55
  },
  input: { flex: 1, marginLeft: 12, fontSize: 16 },
  categoriesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  categoryChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 10, marginBottom: 10 },
  categoryChipText: { fontSize: 13, fontWeight: '600' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  typeText: { fontWeight: 'bold', fontSize: 13 },
  footer: { padding: 20, borderTopWidth: 0.5 },
  nextBtn: {
    height: 55,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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