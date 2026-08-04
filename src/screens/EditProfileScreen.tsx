import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import { SOCKET_URL } from '../utils/constants';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';

const STATUS_OPTIONS = [
  "Disponible",
  "Occupé",
  "À l'école",
  "Au cinéma",
  "Au travail",
  "Batterie faible",
  "Seulement des messages",
  "En réunion",
  "Au sport",
  "Dort",
  "Appels d'urgence uniquement"
];

export default function EditProfileScreen({ navigation }: any) {
  const { colors, normalize, isDark, fontSizeFactor } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pseudoError, setPseudoError] = useState('');
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [imgKey, setImgKey] = useState(Date.now());

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiService.getMe();
      if (response.success) {
        const userData = response.data;
        setUser(userData);
        setName(userData.name || '');
        setStatus(userData.status || 'Disponible');
        setPseudo(userData.username || '');
        setPhone(userData.phone_number || '');
      } else {
        if (response.error?.includes('expiré')) {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        } else {
          Alert.alert('Erreur', 'Impossible de charger votre profil.');
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getFullUrl = (url: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return `${url}?t=${imgKey}`;
    return `${SOCKET_URL}${url}?t=${imgKey}`;
  };

  const handleImageAction = () => {
    Alert.alert(
      "Photo de profil",
      "Que voulez-vous faire ?",
      [
        { text: "Prendre une photo", onPress: () => pickImage('camera') },
        { text: "Choisir dans la galerie", onPress: () => pickImage('library') },
        { text: "Supprimer la photo", onPress: deleteImage, style: 'destructive' },
        { text: "Annuler", style: "cancel" }
      ]
    );
  };

  const pickImage = async (source: 'camera' | 'library') => {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert('Erreur', 'Permission refusée');
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setSaving(true);
    try {
      const uploadRes = await apiService.uploadFile({
        uri,
        type: 'image/jpeg',
        name: 'avatar.jpg'
      }, 'image');

      if (uploadRes.success) {
        const updateRes = await apiService.updateProfile({ avatar_url: uploadRes.data.fileUrl });
        if (updateRes.success) {
          setImgKey(Date.now());
          setUser({ ...user, avatar: uploadRes.data.fileUrl });
          await Notifications.scheduleNotificationAsync({
            content: { title: "Meet Me", body: "Photo de profil mise à jour !", sound: true },
            trigger: null,
          });
        }
      }
    } catch (e) {
      Alert.alert('Erreur', 'Échec de l\'upload');
    } finally {
      setSaving(false);
    }
  };

  const deleteImage = async () => {
    setSaving(true);
    try {
      const res = await apiService.updateProfile({ avatar_url: null });
      if (res.success) {
        setUser({ ...user, avatar: null });
        Alert.alert('Succès', 'Photo supprimée');
      }
    } finally { setSaving(false); }
  };

  const handleSaveInfo = async () => {
    if (!name.trim()) return;

    setSaving(true);
    setPseudoError('');

    try {
      const res = await apiService.updateProfile({
        name,
        status,
        username: pseudo !== user?.username ? pseudo : undefined
      });

      if (res.success) {
        setUser(res.data);
        socketService.updateStatus('online');
        await Notifications.scheduleNotificationAsync({
          content: { title: "Meet Me", body: "Profil mis à jour avec succès !", sound: true },
          trigger: null,
        });
        Alert.alert('Succès', 'Informations enregistrées');
      } else {
        if (res.error && res.error.includes('pseudo')) {
          setPseudoError('Identifiant non disponible. Veuillez en choisir un autre.');
        } else {
          Alert.alert('Erreur', res.error || 'Mise à jour échouée');
        }
      }
    } catch (e) {
      Alert.alert('Erreur', 'Mise à jour échouée');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const dynamicStyles = createStyles(colors, normalize, fontSizeFactor, isDark);

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Profil</Text>
      </View>

      <ScrollView contentContainerStyle={dynamicStyles.scrollContent}>
        <View style={dynamicStyles.imageSection}>
          <TouchableOpacity onPress={handleImageAction} style={dynamicStyles.avatarWrapper}>
            <Image
              key={imgKey}
              source={{ uri: getFullUrl(user?.avatar) || `https://ui-avatars.com/api/?name=${name || 'U'}&background=random` }}
              style={dynamicStyles.avatar}
            />
            <View style={dynamicStyles.cameraIcon}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={dynamicStyles.form}>
          {/* PSEUDO CENTERED */}
          <View style={dynamicStyles.pseudoSection}>
            <Text style={dynamicStyles.pseudoLabel}>@</Text>
            <TextInput
              style={dynamicStyles.pseudoInput}
              value={pseudo}
              onChangeText={(t) => setPseudo(t.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
              autoCapitalize="none"
              placeholder="votre.pseudo"
              placeholderTextColor={colors.text.disabled}
            />
          </View>
          {pseudoError ? <Text style={dynamicStyles.errorText}>{pseudoError}</Text> : null}

          <View style={dynamicStyles.inputGroup}>
            <Ionicons name="person-outline" size={22} color={colors.primary} />
            <View style={dynamicStyles.inputWrapper}>
              <Text style={dynamicStyles.label}>Nom</Text>
              <TextInput
                style={dynamicStyles.input}
                value={name}
                onChangeText={setName}
                placeholder="Votre nom"
                placeholderTextColor={colors.text.disabled}
              />
            </View>
          </View>

          <TouchableOpacity style={dynamicStyles.inputGroup} onPress={() => setStatusModalVisible(true)}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
            <View style={dynamicStyles.inputWrapper}>
              <Text style={dynamicStyles.label}>Actus</Text>
              <View style={dynamicStyles.statusSelect}>
                <Text style={dynamicStyles.input}>{status}</Text>
                <Ionicons name="chevron-down" size={18} color={colors.text.disabled} />
              </View>
            </View>
          </TouchableOpacity>

          <View style={dynamicStyles.inputGroup}>
            <Ionicons name="call-outline" size={22} color={colors.text.disabled} />
            <View style={[dynamicStyles.inputWrapper, { borderBottomColor: 'transparent' }]}>
              <Text style={dynamicStyles.label}>Téléphone</Text>
              <Text style={dynamicStyles.phoneText}>{phone || 'Non renseigné'}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[dynamicStyles.saveButton, saving && { opacity: 0.7 }]}
            onPress={handleSaveInfo}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={dynamicStyles.saveButtonText}>ENREGISTRER</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Selection Actus */}
      <Modal visible={statusModalVisible} transparent animationType="slide" onRequestClose={() => setStatusModalVisible(false)}>
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <View style={dynamicStyles.modalHeader}>
              <Text style={dynamicStyles.modalTitle}>Sélectionnez votre actu</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={STATUS_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[dynamicStyles.statusItem, status === item && dynamicStyles.selectedStatusItem]}
                  onPress={() => { setStatus(item); setStatusModalVisible(false); }}
                >
                  <Text style={[dynamicStyles.statusText, status === item && { fontWeight: 'bold', color: colors.primary }]}>{item}</Text>
                  {status === item && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, normalize: any, factor: number, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  headerTitle: { fontSize: normalize(18, factor), fontWeight: 'bold', marginLeft: 20, color: colors.text.primary },
  scrollContent: { paddingBottom: 40 },
  imageSection: { alignItems: 'center', marginVertical: 30 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: normalize(140), height: normalize(140), borderRadius: normalize(70) },
  cameraIcon: { position: 'absolute', bottom: 5, right: 5, backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.surface },
  form: { paddingHorizontal: 25, paddingVertical: 20, marginHorizontal: 15, borderRadius: 20, elevation: 2, backgroundColor: colors.surface },
  pseudoSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
  pseudoLabel: { fontSize: normalize(22, factor), fontWeight: 'bold', color: colors.primary, marginRight: 5 },
  pseudoInput: { fontSize: normalize(22, factor), fontWeight: 'bold', color: colors.text.primary, borderBottomWidth: 2, borderBottomColor: colors.primary, minWidth: 150, textAlign: 'center', paddingBottom: 5 },
  inputGroup: { flexDirection: 'row', marginBottom: 25, alignItems: 'center' },
  inputWrapper: { flex: 1, marginLeft: 20, borderBottomWidth: 1, borderBottomColor: colors.divider, paddingBottom: 10 },
  statusSelect: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: normalize(12, factor), color: colors.text.secondary, marginBottom: 5 },
  input: { fontSize: normalize(16, factor), fontWeight: '600', paddingVertical: 5, color: colors.text.primary },
  phoneText: { fontSize: normalize(16, factor), fontWeight: '600', paddingVertical: 5, color: colors.text.primary },
  errorText: { color: colors.danger, fontSize: normalize(12, factor), marginTop: -20, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  saveButton: { backgroundColor: colors.primary, borderRadius: 25, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 15, elevation: 3 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: normalize(16, factor), letterSpacing: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: normalize(18, factor), fontWeight: 'bold', color: colors.text.primary },
  statusItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 0.5, borderBottomColor: colors.divider },
  selectedStatusItem: { backgroundColor: isDark ? '#333' : '#F9F9F9' },
  statusText: { fontSize: normalize(16, factor), color: colors.text.primary },
  closeBtn: { display: 'none' }
});

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
