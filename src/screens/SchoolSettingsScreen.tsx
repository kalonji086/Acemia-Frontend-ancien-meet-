import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Save } from 'lucide-react-native';

import apiService from '../services/api.service';
import { useTheme } from '../context/ThemeContext';

type SchoolSettings = {
  schoolName: string;
  schoolEmail: string;
  schoolPhone: string;
  schoolAddress: string;
  schoolType: string;
  description: string;
};

const emptySettings: SchoolSettings = {
  schoolName: '',
  schoolEmail: '',
  schoolPhone: '',
  schoolAddress: '',
  schoolType: '',
  description: '',
};

export default function SchoolSettingsScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const [settings, setSettings] = useState<SchoolSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const res = await apiService.getSchoolSettings();
    if (!res.success) {
      Alert.alert('Paramètres École', res.error || 'Impossible de charger les paramètres de l’école.');
      setLoading(false);
      return;
    }

    const school = res.data || {};
    setSettings({
      schoolName: school.school_name || '',
      schoolEmail: school.school_email || '',
      schoolPhone: school.school_phone || '',
      schoolAddress: school.school_address || '',
      schoolType: school.school_type || '',
      description: school.description || '',
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings().catch((error) => {
      console.error('Unable to load school settings', error);
      Alert.alert('Paramètres École', 'Impossible de charger les paramètres de l’école.');
      setLoading(false);
    });
  }, [loadSettings]);

  const updateField = (field: keyof SchoolSettings, value: string) => {
    setSettings((previous) => ({ ...previous, [field]: value }));
  };

  const saveSettings = async () => {
    if (!settings.schoolName.trim() || !settings.schoolEmail.trim() || !settings.schoolType.trim()) {
      Alert.alert('Informations requises', 'Le nom, l’e-mail et le type de l’école sont requis.');
      return;
    }

    setSaving(true);
    const res = await apiService.updateSchoolSettings(settings);
    setSaving(false);
    if (!res.success) {
      Alert.alert('Paramètres École', res.error || 'Impossible d’enregistrer les paramètres.');
      return;
    }
    Alert.alert('Succès', 'Les paramètres de l’école ont été enregistrés.');
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: normalize(18) }]}>Paramètres École</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.introduction, { color: colors.text.secondary }]}>
          Ces informations sont utilisées dans l’espace Promoteur et pour vos communications scolaires.
        </Text>

        <Text style={[styles.label, { color: colors.text.secondary }]}>Nom de l’école *</Text>
        <TextInput
          value={settings.schoolName}
          onChangeText={(value) => updateField('schoolName', value)}
          style={[styles.input, { color: colors.text.primary, borderColor: colors.border, backgroundColor: colors.surface }]}
          placeholder="Nom de l’école"
          placeholderTextColor={colors.text.disabled}
        />

        <Text style={[styles.label, { color: colors.text.secondary }]}>E-mail de l’école *</Text>
        <TextInput
          value={settings.schoolEmail}
          onChangeText={(value) => updateField('schoolEmail', value)}
          style={[styles.input, { color: colors.text.primary, borderColor: colors.border, backgroundColor: colors.surface }]}
          placeholder="contact@ecole.com"
          placeholderTextColor={colors.text.disabled}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[styles.label, { color: colors.text.secondary }]}>Type d’enseignement *</Text>
        <TextInput
          value={settings.schoolType}
          onChangeText={(value) => updateField('schoolType', value)}
          style={[styles.input, { color: colors.text.primary, borderColor: colors.border, backgroundColor: colors.surface }]}
          placeholder="Primaire, secondaire, technique..."
          placeholderTextColor={colors.text.disabled}
        />

        <Text style={[styles.label, { color: colors.text.secondary }]}>Téléphone</Text>
        <TextInput
          value={settings.schoolPhone}
          onChangeText={(value) => updateField('schoolPhone', value)}
          style={[styles.input, { color: colors.text.primary, borderColor: colors.border, backgroundColor: colors.surface }]}
          placeholder="+243..."
          placeholderTextColor={colors.text.disabled}
          keyboardType="phone-pad"
        />

        <Text style={[styles.label, { color: colors.text.secondary }]}>Adresse</Text>
        <TextInput
          value={settings.schoolAddress}
          onChangeText={(value) => updateField('schoolAddress', value)}
          style={[styles.input, { color: colors.text.primary, borderColor: colors.border, backgroundColor: colors.surface }]}
          placeholder="Ville, commune, quartier..."
          placeholderTextColor={colors.text.disabled}
        />

        <Text style={[styles.label, { color: colors.text.secondary }]}>Description</Text>
        <TextInput
          value={settings.description}
          onChangeText={(value) => updateField('description', value)}
          style={[styles.input, styles.textarea, { color: colors.text.primary, borderColor: colors.border, backgroundColor: colors.surface }]}
          placeholder="Vision et présentation de l’école..."
          placeholderTextColor={colors.text.disabled}
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }, saving && styles.disabledButton]}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Save size={20} color="#fff" />}
          <Text style={styles.saveButtonText}>Enregistrer les paramètres</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  headerTitle: { fontWeight: '700' },
  headerSpacer: { width: 24 },
  content: { padding: 20, paddingBottom: 36 },
  introduction: { lineHeight: 20, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 7 },
  input: { borderWidth: 1, borderRadius: 10, minHeight: 48, paddingHorizontal: 13, marginBottom: 16 },
  textarea: { minHeight: 110, paddingTop: 12 },
  saveButton: { minHeight: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 8 },
  saveButtonText: { color: '#fff', fontWeight: '700', marginLeft: 9 },
  disabledButton: { opacity: 0.65 },
});
