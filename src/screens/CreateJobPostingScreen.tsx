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
  Platform
} from 'react-native';
import { ArrowLeft, Briefcase, MapPin, DollarSign, FileText, Gift, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function CreateJobPostingScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    jobType: 'CDI',
    salaryRange: '',
    requirements: '',
    benefits: ''
  });

  const handleSubmit = async () => {
    if (!formData.title || !formData.description) {
      return Alert.alert('Erreur', 'Le titre et la description sont obligatoires.');
    }

    setLoading(true);
    try {
      const response = await apiService.postJob({
        ...formData,
        requirements: formData.requirements.split('\n').filter(r => r.trim()),
        benefits: formData.benefits.split('\n').filter(b => b.trim())
      });

      if (response.success) {
        Alert.alert('Succès', 'Votre offre d\'emploi a été publiée !', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de publier l\'offre');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Nouvelle offre</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Titre du poste *</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
              <Briefcase size={20} color={colors.text.disabled} />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                value={formData.title}
                onChangeText={(v) => setFormData({...formData, title: v})}
                placeholder="Ex: Comptable, Développeur..."
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Localisation</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
              <MapPin size={20} color={colors.text.disabled} />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                value={formData.location}
                onChangeText={(v) => setFormData({...formData, location: v})}
                placeholder="Kinshasa, Gombe / Remote"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Salaire / Fourchette</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
              <DollarSign size={20} color={colors.text.disabled} />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                value={formData.salaryRange}
                onChangeText={(v) => setFormData({...formData, salaryRange: v})}
                placeholder="Ex: 800$ - 1200$"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Description détaillée *</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, height: 150, alignItems: 'flex-start', paddingTop: 12 }]}>
              <FileText size={20} color={colors.text.disabled} style={{ marginTop: 2 }} />
              <TextInput
                style={[styles.input, { color: colors.text.primary, height: '100%' }]}
                value={formData.description}
                onChangeText={(v) => setFormData({...formData, description: v})}
                placeholder="Décrivez les missions du poste..."
                multiline
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Pré-requis (Un par ligne)</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
              <TextInput
                style={[styles.input, { color: colors.text.primary, height: '100%' }]}
                value={formData.requirements}
                onChangeText={(v) => setFormData({...formData, requirements: v})}
                placeholder="Ex: Master en Gestion&#10;3 ans d'expérience"
                multiline
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Avantages (Un par ligne)</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
              <Gift size={20} color={colors.text.disabled} style={{ marginTop: 2 }} />
              <TextInput
                style={[styles.input, { color: colors.text.primary, height: '100%' }]}
                value={formData.benefits}
                onChangeText={(v) => setFormData({...formData, benefits: v})}
                placeholder="Ex: Assurance santé&#10;Transport gratuit"
                multiline
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>PUBLIER L'OFFRE</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 15, height: 55 },
  input: { flex: 1, marginLeft: 12, fontSize: 16 },
  submitBtn: { height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 40, elevation: 3 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
