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
  Switch,
} from 'react-native';
import {
  ArrowLeft, Camera, User, Info, Phone,
  Calendar, Globe, MapPin, Landmark, Map, Languages,
  ChevronDown, CheckCircle, Check, X, Search
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import { SOCKET_URL, SUPPORTED_LANGUAGES } from '../utils/constants';
import * as ImagePicker from 'expo-image-picker';
import { RDC_PROVINCES, GENDERS } from '../utils/locations';
import { CountryPicker } from 'react-native-country-codes-picker';

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

export default function EditProfileScreen({ navigation, isComponent = false }: any) {
  const { colors, normalize, isDark, fontSizeFactor } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [phone, setPhone] = useState('');
  const [callingCode, setCallingCode] = useState('243');
  const [countryFlag, setCountryFlag] = useState('🇨🇩');
  const [showPhoneCountryPicker, setShowPhoneCountryPicker] = useState(false);

  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [commune, setCommune] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const [preferredLang, setPreferredLang] = useState('fr');
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pseudoError, setPseudoError] = useState('');

  // Modals Visibility
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [provinceModalVisible, setProvinceModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [communeModalVisible, setCommuneModalVisible] = useState(false);
  const [birthDateModalVisible, setBirthDateModalVisible] = useState(false);

  const [imgKey, setImgKey] = useState(Date.now());
  const [searchLoc, setSearchLoc] = useState('');

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

        // Gérer le numéro de téléphone et le code pays
        const rawPhone = userData.phone_number || '';
        if (rawPhone.startsWith('+')) {
           // On tente de détecter le code pays (simplifié)
           if (rawPhone.startsWith('+243')) {
              setCallingCode('243');
              setPhone(rawPhone.replace('+243', ''));
              setCountryFlag('🇨🇩');
           } else {
              // Fallback : on met tout dans le champ phone pour l'instant
              setPhone(rawPhone);
           }
        } else {
           setPhone(rawPhone);
        }

        setGender(userData.gender || '');
        setCountry(userData.country || '');
        setProvince(userData.province || '');
        setCity(userData.city || '');
        setCommune(userData.commune || '');
        setBirthDate(userData.birth_date ? userData.birth_date.split('T')[0] : '');
        setPreferredLang(userData.preferred_language || 'fr');
        setAutoTranslate(userData.auto_translate === true);
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
    if (!url || url === 'null') return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;

    const baseUrl = SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL;
    const path = url.startsWith('/') ? url : `/${url}`;

    return `${baseUrl}${path}`;
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
          const newTimestamp = Date.now();
          setImgKey(newTimestamp);
          setUser({ ...user, avatar: `${uploadRes.data.fileUrl}?t=${newTimestamp}` });
          Alert.alert('Succès', 'Photo de profil mise à jour');
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
      const fullPhone = phone ? (`+${callingCode.replace('+', '')}${phone.replace(/^0+/, '')}`) : null;

      const res = await apiService.updateProfile({
        name,
        status,
        username: pseudo !== user?.username ? pseudo : undefined,
        phone_number: fullPhone,
        gender,
        country,
        province,
        city,
        commune,
        birth_date: birthDate || null,
        preferred_language: preferredLang,
        auto_translate: autoTranslate
      });

      if (res.success) {
        setUser(res.data);
        socketService.updateStatus('online');
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

  const handleStartVerification = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Erreur', 'Permission caméra requise pour la vérification.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
    if (!result.canceled) {
      setSaving(true);
      try {
        const uploadRes = await apiService.uploadFile({
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'verification.jpg'
        }, 'image');

        if (uploadRes.success) {
          await apiService.submitVerification(uploadRes.data.fileUrl);
          Alert.alert('Succès', 'Votre demande de vérification a été envoyée. Un admin l\'examinera prochainement.');
        }
      } catch (e) {
        Alert.alert('Erreur', 'Échec de l\'envoi du document.');
      } finally {
        setSaving(false);
      }
    }
  };

  const dynamicStyles = createStyles(colors, normalize, fontSizeFactor, isDark);

  if (loading) return <View style={dynamicStyles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={dynamicStyles.container}>
      {!isComponent && (
        <>
          <View style={{ height: insets.top, backgroundColor: colors.surface }} />
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
          <View style={dynamicStyles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowLeft size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={dynamicStyles.headerTitle}>Profil</Text>
          </View>
        </>
      )}

      <ScrollView contentContainerStyle={dynamicStyles.scrollContent}>
        <View style={dynamicStyles.imageSection}>
          <TouchableOpacity onPress={handleImageAction} style={dynamicStyles.avatarWrapper}>
            <Image
              key={imgKey}
              source={{ uri: getFullUrl(user?.avatar) || `https://ui-avatars.com/api/?name=${name || 'U'}&background=random` }}
              style={dynamicStyles.avatar}
            />
            <View style={dynamicStyles.cameraIcon}>
              <Camera size={20} color="#fff" />
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
            <User size={22} color={colors.primary} />
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
            <Info size={22} color={colors.primary} />
            <View style={dynamicStyles.inputWrapper}>
              <Text style={dynamicStyles.label}>Actus</Text>
              <View style={dynamicStyles.statusSelect}>
                <Text style={dynamicStyles.input}>{status}</Text>
                <ChevronDown size={18} color={colors.text.disabled} />
              </View>
            </View>
          </TouchableOpacity>

          <View style={dynamicStyles.inputGroup}>
            <Phone size={22} color={colors.primary} />
            <View style={[dynamicStyles.inputWrapper, { borderBottomWidth: 0 }]}>
              <Text style={dynamicStyles.label}>Téléphone</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                <TouchableOpacity
                  style={[dynamicStyles.countryBtn, { borderColor: colors.border, padding: 8, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center' }]}
                  onPress={() => setShowPhoneCountryPicker(true)}
                >
                  <Text style={{ fontSize: 18 }}>{countryFlag}</Text>
                  <Text style={{ color: colors.text.primary, marginLeft: 5, fontWeight: 'bold' }}>+{callingCode.replace('+', '')}</Text>
                </TouchableOpacity>
                <TextInput
                  style={[dynamicStyles.input, { flex: 1, borderBottomWidth: 1, borderBottomColor: colors.divider, marginLeft: 10 }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="812345678"
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.text.disabled}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity style={dynamicStyles.inputGroup} onPress={() => setGenderModalVisible(true)}>
            <User size={22} color={colors.primary} />
            <View style={dynamicStyles.inputWrapper}>
              <Text style={dynamicStyles.label}>Sexe</Text>
              <View style={dynamicStyles.statusSelect}>
                <Text style={dynamicStyles.input}>{gender === 'M' ? 'Homme' : (gender === 'F' ? 'Femme' : 'Sélectionner')}</Text>
                <ChevronDown size={18} color={colors.text.disabled} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={dynamicStyles.inputGroup} onPress={() => setBirthDateModalVisible(true)}>
            <Calendar size={22} color={colors.primary} />
            <View style={dynamicStyles.inputWrapper}>
              <Text style={dynamicStyles.label}>Date de naissance / Âge</Text>
              <View style={dynamicStyles.statusSelect}>
                <Text style={dynamicStyles.input}>
                  {birthDate ? `${birthDate} (${Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))} ans)` : 'Sélectionner'}
                </Text>
                <ChevronDown size={18} color={colors.text.disabled} />
              </View>
            </View>
          </TouchableOpacity>

          <View style={[dynamicStyles.section, { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 20 }]}>
            <Text style={[dynamicStyles.sectionLabel, { color: colors.primary }]}>LOCALISATION</Text>

            <TouchableOpacity style={dynamicStyles.inputGroup} onPress={() => setCountryPickerVisible(true)}>
              <Globe size={22} color={colors.primary} />
              <View style={dynamicStyles.inputWrapper}>
                <Text style={dynamicStyles.label}>Pays</Text>
                <View style={dynamicStyles.statusSelect}>
                  <Text style={dynamicStyles.input}>{country || 'Sélectionner'}</Text>
                  <ChevronDown size={18} color={colors.text.disabled} />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[dynamicStyles.inputGroup, !country && { opacity: 0.5 }]}
              onPress={() => country && setProvinceModalVisible(true)}
              disabled={!country}
            >
              <MapPin size={22} color={colors.primary} />
              <View style={dynamicStyles.inputWrapper}>
                <Text style={dynamicStyles.label}>Province</Text>
                <View style={dynamicStyles.statusSelect}>
                  <Text style={dynamicStyles.input}>{province || 'Sélectionner'}</Text>
                  <ChevronDown size={18} color={colors.text.disabled} />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[dynamicStyles.inputGroup, !province && { opacity: 0.5 }]}
              onPress={() => province && setCityModalVisible(true)}
              disabled={!province}
            >
              <Landmark size={22} color={colors.primary} />
              <View style={dynamicStyles.inputWrapper}>
                <Text style={dynamicStyles.label}>Ville</Text>
                <View style={dynamicStyles.statusSelect}>
                  <Text style={dynamicStyles.input}>{city || 'Sélectionner'}</Text>
                  <ChevronDown size={18} color={colors.text.disabled} />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[dynamicStyles.inputGroup, !city && { opacity: 0.5 }]}
              onPress={() => city && setCommuneModalVisible(true)}
              disabled={!city}
            >
              <Map size={22} color={colors.primary} />
              <View style={dynamicStyles.inputWrapper}>
                <Text style={dynamicStyles.label}>Commune</Text>
                <View style={dynamicStyles.statusSelect}>
                  <Text style={dynamicStyles.input}>{commune || 'Sélectionner'}</Text>
                  <ChevronDown size={18} color={colors.text.disabled} />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* AI TRANSLATION SETTINGS */}
          <View style={[dynamicStyles.section, { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 20 }]}>
            <Text style={[dynamicStyles.sectionLabel, { color: colors.primary }]}>INTELLIGENCE ARTIFICIELLE</Text>

            <TouchableOpacity style={dynamicStyles.inputGroup} onPress={() => setLangModalVisible(true)}>
              <Languages size={22} color={colors.primary} />
              <View style={dynamicStyles.inputWrapper}>
                <Text style={dynamicStyles.label}>Langue de traduction préférée</Text>
                <View style={dynamicStyles.statusSelect}>
                  <Text style={dynamicStyles.input}>
                    {SUPPORTED_LANGUAGES.find(l => l.code === preferredLang)?.name || 'Français'}
                  </Text>
                  <ChevronDown size={18} color={colors.text.disabled} />
                </View>
              </View>
            </TouchableOpacity>

            <View style={dynamicStyles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[dynamicStyles.settingTitle, { color: colors.text.primary }]}>Traduction automatique</Text>
                <Text style={[dynamicStyles.settingDesc, { color: colors.text.secondary }]}>Traduire les messages entrants sans demander</Text>
              </View>
              <Switch
                value={autoTranslate}
                onValueChange={setAutoTranslate}
                trackColor={{ false: colors.divider, true: colors.primaryLight }}
                thumbColor={autoTranslate ? colors.primary : '#f4f3f4'}
              />
            </View>
          </View>

          {/* SECTION VÉRIFICATION */}
          <View style={dynamicStyles.verificationSection}>
            <View style={dynamicStyles.verificationHeader}>
              {user?.is_verified ? <CheckCircle size={24} color={colors.info} /> : <CheckCircle size={24} color={colors.text.disabled} />}
              <Text style={[dynamicStyles.verificationTitle, user?.is_verified && { color: colors.info }]}>
                {user?.is_verified ? "Compte Vérifié" : "Vérifier mon compte"}
              </Text>
            </View>
            <Text style={dynamicStyles.verificationDesc}>
              {user?.is_verified
                ? "Votre identité a été confirmée. Vous possédez le badge bleu officiel."
                : "Obtenez un badge bleu en confirmant votre identité avec une pièce officielle."}
            </Text>
            {!user?.is_verified && (
              <TouchableOpacity style={dynamicStyles.verifyBtn} onPress={handleStartVerification}>
                <Text style={dynamicStyles.verifyBtnText}>DEMANDER LA VÉRIFICATION</Text>
              </TouchableOpacity>
            )}
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
                <X size={24} color={colors.text.primary} />
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
                  {status === item && <Check size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Selection Langue */}
      <Modal visible={langModalVisible} transparent animationType="slide" onRequestClose={() => setLangModalVisible(false)}>
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <View style={dynamicStyles.modalHeader}>
              <Text style={dynamicStyles.modalTitle}>Langue de traduction</Text>
              <TouchableOpacity onPress={() => setLangModalVisible(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={SUPPORTED_LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[dynamicStyles.statusItem, preferredLang === item.code && dynamicStyles.selectedStatusItem]}
                  onPress={() => { setPreferredLang(item.code); setLangModalVisible(false); handleSaveInfo(); }}
                >
                  <Text style={[dynamicStyles.statusText, preferredLang === item.code && { fontWeight: 'bold', color: colors.primary }]}>
                    {item.flag} {item.name}
                  </Text>
                  {preferredLang === item.code && <Check size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Sexe */}
      <Modal visible={genderModalVisible} transparent animationType="fade" onRequestClose={() => setGenderModalVisible(false)}>
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <Text style={dynamicStyles.modalTitle}>Sélectionnez votre sexe</Text>
            {GENDERS.map(g => (
              <TouchableOpacity key={g.value} style={dynamicStyles.statusItem} onPress={() => { setGender(g.value); setGenderModalVisible(false); handleSaveInfo(); }}>
                <Text style={dynamicStyles.statusText}>{g.label}</Text>
                {gender === g.value && <Check size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={dynamicStyles.closeBtn} onPress={() => setGenderModalVisible(false)}><Text style={dynamicStyles.closeBtnText}>Annuler</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Country Picker */}
      <CountryPicker
        show={countryPickerVisible}
        pickerButtonOnPress={(item) => {
          setCountry(item.name[language as keyof typeof item.name] || item.name.en);
          setCountryPickerVisible(false);
          setProvince(''); setCity(''); setCommune('');
          handleSaveInfo();
        }}
        onBackdropPress={() => setCountryPickerVisible(false)}
        style={{
          modal: { height: 500, backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' },
          countryName: { color: colors.text.primary },
          dialCode: { color: colors.text.secondary },
          searchInput: { backgroundColor: isDark ? '#333' : '#F0F2F5', color: colors.text.primary }
        }}
      />

      {/* Modal Province */}
      <Modal visible={provinceModalVisible} transparent animationType="slide" onRequestClose={() => setProvinceModalVisible(false)}>
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <Text style={dynamicStyles.modalTitle}>Sélectionnez la province</Text>
            <FlatList
              data={country === 'République Démocratique du Congo' ? RDC_PROVINCES : []}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity style={dynamicStyles.statusItem} onPress={() => { setProvince(item.name); setProvinceModalVisible(false); setCity(''); setCommune(''); handleSaveInfo(); }}>
                  <Text style={dynamicStyles.statusText}>{item.name}</Text>
                  {province === item.name && <Check size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', padding: 20, color: colors.text.disabled }}>Aucune province répertoriée pour ce pays.</Text>}
            />
            <TouchableOpacity style={dynamicStyles.closeBtn} onPress={() => setProvinceModalVisible(false)}><Text style={dynamicStyles.closeBtnText}>Fermer</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Ville */}
      <Modal visible={cityModalVisible} transparent animationType="slide" onRequestClose={() => setCityModalVisible(false)}>
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <Text style={dynamicStyles.modalTitle}>Sélectionnez la ville</Text>
            <FlatList
              data={RDC_PROVINCES.find(p => p.name === province)?.cities || []}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={dynamicStyles.statusItem} onPress={() => { setCity(item); setCityModalVisible(false); setCommune(''); handleSaveInfo(); }}>
                  <Text style={dynamicStyles.statusText}>{item}</Text>
                  {city === item && <Check size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={dynamicStyles.closeBtn} onPress={() => setCityModalVisible(false)}><Text style={dynamicStyles.closeBtnText}>Fermer</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Commune */}
      <Modal visible={communeModalVisible} transparent animationType="slide" onRequestClose={() => setCommuneModalVisible(false)}>
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <Text style={dynamicStyles.modalTitle}>Sélectionnez la commune</Text>
            <FlatList
              data={RDC_PROVINCES.find(p => p.name === province)?.communes || []}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={dynamicStyles.statusItem} onPress={() => { setCommune(item); setCommuneModalVisible(false); handleSaveInfo(); }}>
                  <Text style={dynamicStyles.statusText}>{item}</Text>
                  {commune === item && <Check size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={dynamicStyles.closeBtn} onPress={() => setCommuneModalVisible(false)}><Text style={dynamicStyles.closeBtnText}>Fermer</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Age / Birth Date Selection */}
      <Modal visible={birthDateModalVisible} transparent animationType="fade" onRequestClose={() => setBirthDateModalVisible(false)}>
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
             <Text style={dynamicStyles.modalTitle}>Sélectionnez l'année de naissance</Text>
             <FlatList
               data={Array.from({ length: 100 }, (_, i) => (new Date().getFullYear() - 10 - i).toString())}
               keyExtractor={(item) => item}
               renderItem={({ item }) => (
                 <TouchableOpacity style={dynamicStyles.statusItem} onPress={() => { setBirthDate(`${item}-01-01`); setBirthDateModalVisible(false); handleSaveInfo(); }}>
                   <Text style={dynamicStyles.statusText}>{item} ({new Date().getFullYear() - parseInt(item)} ans)</Text>
                 </TouchableOpacity>
               )}
             />
             <TouchableOpacity style={dynamicStyles.closeBtn} onPress={() => setBirthDateModalVisible(false)}><Text style={dynamicStyles.closeBtnText}>Fermer</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Phone Country Picker */}
      <CountryPicker
        show={showPhoneCountryPicker}
        pickerButtonOnPress={(item) => {
          setCountryFlag(item.flag);
          setCallingCode(item.dial_code);
          setShowPhoneCountryPicker(false);
        }}
        onBackdropPress={() => setShowPhoneCountryPicker(false)}
        style={{
          modal: { height: 500, backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' },
          countryName: { color: colors.text.primary },
          dialCode: { color: colors.text.secondary },
          searchInput: { backgroundColor: isDark ? '#333' : '#F0F2F5', color: colors.text.primary }
        }}
      />
    </View>
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
  countryBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, height: normalize(45), paddingHorizontal: 10, marginRight: 5 },
  input: { fontSize: normalize(16, factor), fontWeight: '600', paddingVertical: 5, color: colors.text.primary },
  phoneText: { fontSize: normalize(16, factor), fontWeight: '600', paddingVertical: 5, color: colors.text.primary },
  verificationSection: { marginTop: 10, padding: 15, backgroundColor: isDark ? '#222' : '#f8f9fa', borderRadius: 15, marginBottom: 20 },
  verificationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  verificationTitle: { fontSize: normalize(15, factor), fontWeight: 'bold', marginLeft: 10, color: colors.text.secondary },
  verificationDesc: { fontSize: normalize(12, factor), color: colors.text.secondary, lineHeight: 18, marginBottom: 15 },
  verifyBtn: { paddingVertical: 12, borderColor: colors.primary, borderWidth: 1, borderRadius: 10, alignItems: 'center' },
  verifyBtnText: { color: colors.primary, fontWeight: 'bold', fontSize: normalize(12, factor) },
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
  section: { marginVertical: 10 },
  sectionLabel: { fontSize: normalize(12, factor), fontWeight: 'bold', marginBottom: 15 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 },
  settingTitle: { fontSize: normalize(15, factor), fontWeight: '600' },
  settingDesc: { fontSize: normalize(12, factor), marginTop: 2 },
  closeBtn: { display: 'none' }
});
