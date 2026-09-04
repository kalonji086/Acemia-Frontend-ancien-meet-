import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, useWindowDimensions, Image
} from 'react-native';
import {
  ArrowLeft, Building2, MapPin, Mail, Phone,
  ChevronRight, CheckCircle2, GraduationCap, Globe,
  FileText, Users, Camera
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

import * as ImagePicker from 'expo-image-picker';

export default function SchoolRegistrationScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);

  const [form, setForm] = useState({
    name: '',
    schoolType: 'private',
    country: '',
    city: '',
    address: '',
    contactEmail: '',
    phone: '',
    description: '',
    logoUrl: ''
  });

  const handlePickLogo = async () => {
    try {
      setPickingImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        const uploadRes = await apiService.uploadFile(file, 'image');
        if (uploadRes.success) {
          setForm({ ...form, logoUrl: uploadRes.data.fileUrl });
        } else {
          Alert.alert('Erreur', 'Impossible de télécharger le logo.');
        }
      }
    } catch (e) {
      Alert.alert('Erreur', 'Erreur lors de la sélection du logo.');
    } finally {
      setPickingImage(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !form.name) return Alert.alert('Attention', 'Le nom de l\'école est obligatoire.');
    if (step === 2 && (!form.country || !form.city)) return Alert.alert('Attention', 'Le pays et la ville sont obligatoires.');
    if (step === 3 && !form.contactEmail) return Alert.alert('Attention', 'L\'email de contact est obligatoire.');

    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await apiService.createSchool(form);
      if (res.success) {
        Alert.alert(
          'Félicitations !',
          'Votre demande de création d’établissement a été soumise. Notre équipe va l’examiner sous 24/48h.',
          [{ text: 'OK', onPress: () => navigation.navigate('School', { refresh: true }) }]
        );
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de soumettre la demande.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text.primary, fontSize: normalize(22) }]}>Identité de l'école</Text>

            <TouchableOpacity
              onPress={handlePickLogo}
              disabled={pickingImage}
              style={[styles.logoPicker, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
               {pickingImage ? (
                 <ActivityIndicator color={colors.primary} />
               ) : form.logoUrl ? (
                 <Image source={{ uri: form.logoUrl }} style={styles.pickedLogo} />
               ) : (
                 <>
                   <Camera size={24} color={colors.primary} />
                   <Text style={[styles.logoText, { color: colors.text.secondary }]}>Ajouter le logo</Text>
                 </>
               )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Nom de l'établissement *</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Building2 size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                  value={form.name}
                  onChangeText={(v) => setForm({...form, name: v})}
                  placeholder="Ex: Complexe Scolaire Lumière"
                  placeholderTextColor={colors.text.disabled}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Type d'enseignement</Text>
              <View style={styles.typeRow}>
                {['private', 'public'].map(type => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setForm({...form, schoolType: type})}
                    style={[styles.typeBtn, { borderColor: colors.border }, form.schoolType === type && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  >
                    <Text style={[styles.typeText, { color: form.schoolType === type ? '#fff' : colors.text.secondary }]}>
                      {type === 'private' ? 'Privé' : 'Public'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text.primary, fontSize: normalize(22) }]}>Localisation</Text>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Pays *</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Globe size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                  value={form.country}
                  onChangeText={(v) => setForm({...form, country: v})}
                  placeholder="Ex: République Démocratique du Congo"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Ville *</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <MapPin size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                  value={form.city}
                  onChangeText={(v) => setForm({...form, city: v})}
                  placeholder="Ex: Kinshasa"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Adresse physique</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
                <TextInput
                  style={[styles.input, { color: colors.text.primary, height: '100%' }]}
                  value={form.address}
                  onChangeText={(v) => setForm({...form, address: v})}
                  placeholder="N°, Rue, Quartier, Commune..."
                  multiline
                />
              </View>
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text.primary, fontSize: normalize(22) }]}>Contact & Légal</Text>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Email professionnel *</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Mail size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                  value={form.contactEmail}
                  onChangeText={(v) => setForm({...form, contactEmail: v})}
                  placeholder="direction@ecole.com"
                  keyboardType="email-address"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Téléphone</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Phone size={20} color={colors.text.disabled} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
                  value={form.phone}
                  onChangeText={(v) => setForm({...form, phone: v})}
                  placeholder="+243..."
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text.primary, fontSize: normalize(22) }]}>Vision & Description</Text>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Présentez votre établissement</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, height: 150, alignItems: 'flex-start', paddingTop: 12 }]}>
                <FileText size={20} color={colors.text.disabled} style={{ marginTop: 2 }} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary, height: '100%' }]}
                  value={form.description}
                  onChangeText={(v) => setForm({...form, description: v})}
                  placeholder="Décrivez les atouts de votre école, sa devise, ses options..."
                  multiline
                />
              </View>
            </View>
            <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
               <CheckCircle2 size={24} color={colors.primary} />
               <Text style={[styles.reviewText, { color: colors.text.primary }]}>En soumettant ce formulaire, vous certifiez être le représentant légal ou le promoteur de cet établissement.</Text>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={prevStep} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${(step / 4) * 100}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.stepIndicator, { color: colors.text.secondary }]}>Étape {step}/4</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isTablet ? '20%' : 25 }]}>
          {renderStep()}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border, paddingHorizontal: isTablet ? '20%' : 20 }]}>
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={step === 4 ? handleSubmit : nextStep}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.nextBtnText}>{step === 4 ? 'SOUMETTRE L\'ÉCOLE' : 'CONTINUER'}</Text>
                {step < 4 && <ChevronRight size={20} color="#fff" />}
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
  stepIndicator: { fontSize: 11, fontWeight: 'bold' },
  scrollContent: { paddingVertical: 25 },
  stepContainer: { width: '100%' },
  stepTitle: { fontWeight: 'bold', marginBottom: 25 },
  logoPicker: { width: 100, height: 100, borderRadius: 25, borderWidth: 1.5, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 30, overflow: 'hidden' },
  pickedLogo: { width: '100%', height: '100%' },
  logoText: { fontSize: 10, fontWeight: 'bold', marginTop: 5 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 15, paddingHorizontal: 15, height: 55 },
  input: { flex: 1, marginLeft: 12 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  typeText: { fontWeight: 'bold', fontSize: 14 },
  footer: { padding: 20, borderTopWidth: 0.5 },
  nextBtn: { height: 55, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginRight: 8 },
  reviewCard: { padding: 20, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 15, alignItems: 'center' },
  reviewText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '500' }
});