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
import { ArrowLeft, Briefcase, MapPin, DollarSign, FileText, Gift, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function CreateJobPostingScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;
  const [loading, setLoading] = useState(false);

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
    { id: 'tech', name: 'Tech' },
    { id: 'sales', name: 'Vente' },
    { id: 'health', name: 'Santé' },
    { id: 'manual', name: 'Artisan' },
  ];

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
        <View style={[styles.header, { backgroundColor: colors.surface, paddingHorizontal: isTablet ? '10%' : 15 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: normalize(18) }]}>Nouvelle offre</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isTablet ? '20%' : 20 }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Titre du poste *</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
              <Briefcase size={20} color={colors.text.disabled} />
              <TextInput
                style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                value={formData.title}
                onChangeText={(v) => setFormData({...formData, title: v})}
                placeholder="Ex: Comptable, Développeur..."
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Catégorie *</Text>
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
            <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Localisation</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
              <MapPin size={20} color={colors.text.disabled} />
              <TextInput
                style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                value={formData.location}
                onChangeText={(v) => setFormData({...formData, location: v})}
                placeholder="Kinshasa, Gombe / Remote"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Salaire / Fourchette</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
              <DollarSign size={20} color={colors.text.disabled} />
              <TextInput
                style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                value={formData.salaryRange}
                onChangeText={(v) => setFormData({...formData, salaryRange: v})}
                placeholder="Ex: 800$ - 1200$"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Description détaillée *</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, height: 150, alignItems: 'flex-start', paddingTop: 12 }]}>
              <FileText size={20} color={colors.text.disabled} style={{ marginTop: 2 }} />
              <TextInput
                style={[styles.input, { color: colors.text.primary, height: '100%', fontSize: normalize(16) }]}
                value={formData.description}
                onChangeText={(v) => setFormData({...formData, description: v})}
                placeholder="Décrivez les missions du poste..."
                multiline
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Pré-requis (Un par ligne)</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
              <TextInput
                style={[styles.input, { color: colors.text.primary, height: '100%', fontSize: normalize(16) }]}
                value={formData.requirements}
                onChangeText={(v) => setFormData({...formData, requirements: v})}
                placeholder="Ex: Master en Gestion&#10;3 ans d'expérience"
                multiline
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.secondary, fontSize: normalize(14) }]}>Avantages (Un par ligne)</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
              <Gift size={20} color={colors.text.disabled} style={{ marginTop: 2 }} />
              <TextInput
                style={[styles.input, { color: colors.text.primary, height: '100%', fontSize: normalize(16) }]}
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
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.submitBtnText, { fontSize: normalize(16) }]}>PUBLIER L'OFFRE</Text>}
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
  headerTitle: { fontWeight: 'bold' },
  scrollContent: { paddingVertical: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontWeight: '600', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 15, height: 55 },
  input: { flex: 1, marginLeft: 12 },
  categoriesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  categoryChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 10, marginBottom: 10 },
  categoryChipText: { fontSize: 13, fontWeight: '600' },
  submitBtn: { height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 40, elevation: 3 },
  submitBtnText: { color: '#fff', fontWeight: 'bold' }
});
