import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  TextInput,
  Switch,
  ActivityIndicator,
  Modal,
  FlatList,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { normalize } from '../styles/theme';
import apiService from '../services/api.service';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function SecurityPrivacyScreen({ navigation, isComponent = false }: any) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Privacy Settings state
  const [settings, setSettings] = useState({
    last_seen: 'everyone',
    profile_photo: 'everyone',
    read_receipts: true,
  });

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [activeSetting, setActiveSetting] = useState<any>(null);

  // Delete account modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiService.verifyToken();
      if (res.success && res.data.user.privacy_settings) {
        setSettings(res.data.user.privacy_settings);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    const previousSettings = settings;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      const response = await apiService.updatePrivacySettings(newSettings);
      if (!response.success) {
        throw new Error(response.error || 'Impossible de mettre à jour les paramètres');
      }
      if (response.data) setSettings(response.data);
    } catch (error) {
      setSettings(previousSettings);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de mettre à jour les paramètres');
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiService.changePassword(currentPassword, newPassword);
      if (res.success) {
        Alert.alert('Succès', 'Mot de passe mis à jour');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Erreur', res.error || 'Échec de la mise à jour');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Erreur', 'Entrez votre mot de passe pour confirmer');
      return;
    }

    Keyboard.dismiss();
    setActionLoading(true);

    try {
      const res = await apiService.deleteAccount(deletePassword);
      if (res.success) {
        // Fermer d'abord le modal pour éviter les glitches visuels
        setDeleteModalVisible(false);

        // Petit délai pour laisser le temps au modal et au clavier de se retirer
        setTimeout(async () => {
          await apiService.logout();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }, 300);
      } else {
        Alert.alert('Erreur', res.error || 'Mot de passe incorrect');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de supprimer le compte');
    } finally {
      setActionLoading(false);
    }
  };

  const privacyOptions = [
    { id: 'everyone', label: 'Tout le monde' },
    { id: 'contacts', label: 'Mes contacts' },
    { id: 'nobody', label: 'Personne' },
  ];

  const dynamicStyles = createStyles(colors, isDark);

  if (loading) {
    return (
      <View style={dynamicStyles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      {!isComponent && (
        <>
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
          <View style={dynamicStyles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={dynamicStyles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={dynamicStyles.headerTitle}>Sécurité & Confidentialité</Text>
          </View>
        </>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Section Sécurité */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Changer le mot de passe</Text>
          <View style={dynamicStyles.inputGroup}>
            <PasswordInput
              placeholder="Mot de passe actuel"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              visible={showCurrentPassword}
              toggleVisible={() => setShowCurrentPassword(!showCurrentPassword)}
              colors={colors}
              isDark={isDark}
            />
            <PasswordInput
              placeholder="Nouveau mot de passe"
              value={newPassword}
              onChangeText={setNewPassword}
              visible={showNewPassword}
              toggleVisible={() => setShowNewPassword(!showNewPassword)}
              colors={colors}
              isDark={isDark}
            />
            <PasswordInput
              placeholder="Confirmer le nouveau mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              visible={showConfirmPassword}
              toggleVisible={() => setShowConfirmPassword(!showConfirmPassword)}
              colors={colors}
              isDark={isDark}
            />

            <TouchableOpacity
              style={[dynamicStyles.actionButton, actionLoading && { opacity: 0.7 }]}
              onPress={handleUpdatePassword}
              disabled={actionLoading}
            >
              {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={dynamicStyles.actionButtonText}>METTRE À JOUR</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={dynamicStyles.forgotLink}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={dynamicStyles.forgotLinkText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Confidentialité */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Visibilité</Text>

          <PrivacyItem
            label="Dernière présence"
            value={privacyOptions.find(o => o.id === settings.last_seen)?.label || 'Tout le monde'}
            onPress={() => { setActiveSetting('last_seen'); setModalVisible(true); }}
            colors={colors}
            isDark={isDark}
          />

          <PrivacyItem
            label="Photo de profil"
            value={privacyOptions.find(o => o.id === settings.profile_photo)?.label || 'Tout le monde'}
            onPress={() => { setActiveSetting('profile_photo'); setModalVisible(true); }}
            colors={colors}
            isDark={isDark}
          />

          <View style={dynamicStyles.rowItem}>
            <View style={{ flex: 1 }}>
              <Text style={dynamicStyles.itemLabel}>Confirmations de lecture</Text>
              <Text style={dynamicStyles.itemSubLabel}>Si vous désactivez les confirmations, vous ne pourrez pas voir celles des autres.</Text>
            </View>
            <Switch
              value={settings.read_receipts}
              onValueChange={(val) => updateSetting('read_receipts', val)}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={settings.read_receipts ? colors.primary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Zone de Danger */}
        <View style={[dynamicStyles.section, { borderTopWidth: 0 }]}>
          <Text style={[dynamicStyles.sectionTitle, { color: colors.danger }]}>Zone de danger</Text>
          <TouchableOpacity style={dynamicStyles.dangerButton} onPress={() => setDeleteModalVisible(true)}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <Text style={dynamicStyles.dangerButtonText}>Supprimer mon compte</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Modal Options Privacy */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={dynamicStyles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={dynamicStyles.modalContent}>
            <Text style={dynamicStyles.modalTitle}>Qui peut voir ?</Text>
            {privacyOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                style={dynamicStyles.optionItem}
                onPress={() => { updateSetting(activeSetting, option.id); setModalVisible(false); }}
              >
                <Text style={[dynamicStyles.optionText, settings[activeSetting as keyof typeof settings] === option.id && dynamicStyles.selectedOption]}>{option.label}</Text>
                {settings[activeSetting as keyof typeof settings] === option.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Suppression Compte */}
      <Modal visible={deleteModalVisible} transparent animationType="slide">
        <View style={dynamicStyles.modalOverlay}>
          <View style={[dynamicStyles.modalContent, { padding: 0, overflow: 'hidden' }]}>
            <View style={{ backgroundColor: colors.danger, padding: 20, alignItems: 'center' }}>
              <Ionicons name="warning" size={40} color="#fff" />
              <Text style={[dynamicStyles.modalTitle, { color: '#fff', marginBottom: 0, marginTop: 10 }]}>Suppression définitive</Text>
            </View>

            <View style={{ padding: 25 }}>
              <View style={dynamicStyles.warningCard}>
                <Ionicons name="alert-circle" size={24} color={colors.danger} style={{ marginRight: 10 }} />
                <Text style={dynamicStyles.warningText}>
                  Cette action supprimera définitivement votre profil, vos messages, vos médias et vos contacts.
                </Text>
              </View>

              <Text style={dynamicStyles.inputLabel}>Confirmez avec votre mot de passe :</Text>
              <View style={[dynamicStyles.inputWrapper, { marginTop: 8, backgroundColor: isDark ? colors.background : '#f9f9f9' }]}>
                <TextInput
                  style={dynamicStyles.input}
                  placeholder="Votre mot de passe"
                  placeholderTextColor={colors.text.disabled}
                  secureTextEntry={!showCurrentPassword}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                />
                <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={dynamicStyles.eyeIcon}>
                  <Ionicons name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              <View style={dynamicStyles.modalActions}>
                <TouchableOpacity
                  style={dynamicStyles.cancelBtn}
                  onPress={() => { setDeleteModalVisible(false); setDeletePassword(''); }}
                >
                  <Text style={dynamicStyles.cancelText}>ANNULER</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[dynamicStyles.deleteBtn, actionLoading && { opacity: 0.7 }]}
                  onPress={handleDeleteAccount}
                  disabled={actionLoading}
                >
                  {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={dynamicStyles.deleteText}>SUPPRIMER MON COMPTE</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const PasswordInput = ({ placeholder, value, onChangeText, visible, toggleVisible, colors, isDark }: any) => (
  <View style={createStyles(colors, isDark).inputWrapper}>
    <TextInput
      style={createStyles(colors, isDark).input}
      placeholder={placeholder}
      placeholderTextColor={colors.text.disabled}
      secureTextEntry={!visible}
      value={value}
      onChangeText={onChangeText}
    />
    <TouchableOpacity onPress={toggleVisible} style={createStyles(colors, isDark).eyeIcon}>
      <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.text.secondary} />
    </TouchableOpacity>
  </View>
);

const PrivacyItem = ({ label, value, onPress, colors, isDark }: any) => (
  <TouchableOpacity style={createStyles(colors, isDark).rowItem} onPress={onPress}>
    <View style={{ flex: 1 }}>
      <Text style={createStyles(colors, isDark).itemLabel}>{label}</Text>
      <Text style={createStyles(colors, isDark).itemSubLabel}>{value}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.text.disabled} />
  </TouchableOpacity>
);

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { marginRight: 20 },
  headerTitle: { fontSize: normalize(18), fontWeight: 'bold', color: colors.text.primary },
  section: { marginTop: 20, backgroundColor: colors.surface, paddingHorizontal: 20, paddingBottom: 15, elevation: 1 },
  sectionTitle: { fontSize: normalize(13), fontWeight: 'bold', color: colors.primary, marginTop: 15, marginBottom: 15, textTransform: 'uppercase' },
  inputGroup: { marginTop: 5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 12, color: colors.text.primary },
  eyeIcon: { padding: 5 },
  actionButton: { backgroundColor: colors.primary, borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 5 },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: normalize(14) },
  forgotLink: { marginTop: 15, alignItems: 'center' },
  forgotLinkText: { color: colors.primary, fontSize: normalize(13), fontWeight: '600' },
  rowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.divider },
  itemLabel: { fontSize: normalize(15), color: colors.text.primary, fontWeight: '500' },
  itemSubLabel: { fontSize: normalize(12), color: colors.text.secondary, marginTop: 2 },
  dangerButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, marginTop: 5 },
  dangerButtonText: { color: colors.danger, marginLeft: 10, fontWeight: '600', fontSize: normalize(15) },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: 15, width: '100%', padding: 20 },
  modalTitle: { fontSize: normalize(18), fontWeight: 'bold', marginBottom: 20, color: colors.text.primary },
  optionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.divider },
  optionText: { fontSize: normalize(16), color: colors.text.primary },
  selectedOption: { color: colors.primary, fontWeight: 'bold' },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: isDark ? colors.danger + '20' : '#FFF5F5',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger + '40',
    marginBottom: 20
  },
  warningText: { fontSize: normalize(13), color: colors.danger, lineHeight: 20, flex: 1, fontWeight: '500' },
  inputLabel: { fontSize: normalize(12), color: colors.text.secondary, fontWeight: 'bold', marginLeft: 5 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, alignItems: 'center' },
  cancelBtn: { padding: 10 },
  cancelText: { color: colors.text.secondary, fontWeight: 'bold' },
  deleteBtn: { backgroundColor: colors.danger, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 10, elevation: 2 },
  deleteText: { color: '#fff', fontWeight: 'bold', fontSize: normalize(13) },
});
