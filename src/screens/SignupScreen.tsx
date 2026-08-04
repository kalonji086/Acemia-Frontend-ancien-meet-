import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { CountryPicker } from 'react-native-country-codes-picker';
import * as Device from 'expo-device';

const { width } = Dimensions.get('window');

export default function SignupScreen({ navigation }: any) {
  const { colors, normalize, isDark } = useTheme();
  const { t } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');

  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countryFlag, setCountryFlag] = useState('🇨🇩');
  const [callingCode, setCallingCode] = useState('243');

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [pseudoError, setPseudoError] = useState('');

  const insets = useSafeAreaInsets();

  // Vérifier la disponibilité en temps réel
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (email.includes('@')) {
        const res = await apiService.checkAvailability({ email });
        setEmailError(res.available ? '' : 'Cette adresse email est déjà utilisée');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [email]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (phone.length > 5) {
        const fullPhone = `${callingCode}${phone}`.startsWith('+') ? `${callingCode}${phone}` : `+${callingCode}${phone}`;
        const res = await apiService.checkAvailability({ phone_number: fullPhone });
        setPhoneError(res.available ? '' : 'Ce numéro est déjà utilisé');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [phone, callingCode]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (pseudo.length > 2) {
        // Validation format pseudo (lettres, chiffres, underscores, points)
        if (!/^[a-z0-9_.]+$/.test(pseudo.toLowerCase())) {
          setPseudoError('Pseudo invalide (lettres, chiffres, . _ uniquement)');
          return;
        }
        const res = await apiService.checkAvailability({ username: pseudo });
        setPseudoError(res.available ? '' : 'Identifiant non disponible. Veuillez en choisir un autre.');
      } else {
        setPseudoError('');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [pseudo]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Accès aux photos refusé.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
      setLoading(true);
      try {
        const response = await apiService.uploadFile({
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'profile.jpg'
        }, 'image');
        if (response.success) setUploadedImageUrl(response.data.fileUrl);
      } catch (e) {
        Alert.alert('Erreur', 'Téléchargement échoué');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !fullName || !phone) {
      Alert.alert('Erreur', 'Remplissez les champs obligatoires');
      return;
    }
    if (emailError || phoneError || pseudoError) {
      Alert.alert('Erreur', 'Veuillez corriger les erreurs avant de continuer');
      return;
    }
    if (!acceptedPrivacy) {
      Alert.alert('Erreur', t('privacyError'));
      return;
    }

    setLoading(true);
    const fullPhone = `${callingCode}${phone}`.startsWith('+') ? `${callingCode}${phone}` : `+${callingCode}${phone}`;

    const deviceInfo = {
      brand: Device.brand,
      model: Device.modelName,
      os: Device.osName,
      version: Device.osVersion
    };

    try {
      const response = await apiService.register({
        name: fullName,
        email,
        password,
        phone_number: fullPhone,
        username: pseudo || undefined,
        device_info: deviceInfo
      });
      if (!response.success) throw new Error(response.error);
      if (uploadedImageUrl) await apiService.updateProfile({ avatar_url: uploadedImageUrl });
      Alert.alert('Succès', 'Compte créé !', [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'ChatList' }] }) }]);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors, normalize, isDark);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.logoStack, { backgroundColor: colors.primary }]}>
              <Ionicons name="chatbubble" size={normalize(35)} color="#fff" />
              <Ionicons name="heart" size={normalize(15)} color={colors.secondary} style={styles.heartIcon} />
            </View>
            <Text style={[styles.title, { color: colors.primary }]}>Créer un compte</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Rejoignez Meet Me aujourd'hui</Text>
          </View>

          <View style={styles.imageContainer}>
            <TouchableOpacity onPress={handlePickImage} style={styles.imagePicker}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={[styles.placeholderImage, { backgroundColor: isDark ? '#333' : '#DFE5E7' }]}><Ionicons name="camera" size={normalize(40)} color={isDark ? '#666' : '#fff'} /></View>
              )}
              <View style={[styles.addIcon, { backgroundColor: colors.secondary }]}><Ionicons name="add" size={20} color="#fff" /></View>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={20} color={colors.text.secondary} />
              <TextInput style={[styles.input, { color: colors.text.primary }]} placeholder="Nom complet" placeholderTextColor={colors.text.disabled} value={fullName} onChangeText={setFullName} />
            </View>

            <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border }]}>
              <Ionicons name="at-outline" size={20} color={colors.text.secondary} />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                placeholder="Pseudo (Optionnel - ex: jean.dupont)"
                placeholderTextColor={colors.text.disabled}
                value={pseudo}
                onChangeText={setPseudo}
                autoCapitalize="none"
              />
            </View>
            {pseudoError ? <Text style={styles.errorText}>{pseudoError}</Text> : null}

            <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={20} color={colors.text.secondary} />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                placeholder="Email"
                placeholderTextColor={colors.text.disabled}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            <View style={[styles.phoneRow]}>
              <TouchableOpacity
                style={[styles.countryPickerBtn, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border }]}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={{ fontSize: 20 }}>{countryFlag}</Text>
                <Text style={{ color: colors.text.primary, marginLeft: 5, fontWeight: '600' }}>{callingCode.startsWith('+') ? callingCode : `+${callingCode}`}</Text>
              </TouchableOpacity>

              <View style={[styles.inputWrapper, { flex: 1, backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border, marginBottom: 0 }]}>
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  placeholder="Téléphone"
                  placeholderTextColor={colors.text.disabled}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

            <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border, marginTop: 15 }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.text.secondary} />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                placeholder="Mot de passe"
                placeholderTextColor={colors.text.disabled}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.privacyContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setAcceptedPrivacy(!acceptedPrivacy)}
              >
                <Ionicons
                  name={acceptedPrivacy ? "checkbox" : "square-outline"}
                  size={24}
                  color={acceptedPrivacy ? colors.primary : colors.text.secondary}
                />
              </TouchableOpacity>
              <View style={styles.privacyTextContainer}>
                <Text style={[styles.privacyText, { color: colors.text.secondary }]}>{t('acceptPrivacy').replace(t('privacyPolicy'), '')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                  <Text style={[styles.privacyLink, { color: colors.primary }]}>{t('privacyPolicy')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={[styles.signupButton, { backgroundColor: colors.primary }, loading && styles.disabledButton]} onPress={handleSignup} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signupButtonText}>CRÉER MON COMPTE</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CountryPicker
        show={showCountryPicker}
        pickerButtonOnPress={(item) => {
          setCountryFlag(item.flag);
          setCallingCode(item.dial_code);
          setShowCountryPicker(false);
        }}
        onBackdropPress={() => setShowCountryPicker(false)}
        style={{
          modal: {
            height: 500,
            backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF'
          },
          countryName: {
            color: colors.text.primary
          },
          dialCode: {
            color: colors.text.secondary
          },
          searchInput: {
            backgroundColor: isDark ? '#333' : '#F0F2F5',
            color: colors.text.primary
          }
        }}
      />
    </View>
  );
}

const createStyles = (colors: any, normalize: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: normalize(20) },
  backButton: { marginBottom: 10 },
  header: { alignItems: 'center', marginBottom: 20 },
  logoStack: { width: normalize(60), height: normalize(60), borderRadius: normalize(30), justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 3 },
  heartIcon: { position: 'absolute', bottom: normalize(15) },
  title: { fontSize: normalize(22, 1), fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: normalize(13), textAlign: 'center' },
  imageContainer: { alignItems: 'center', marginBottom: 30 },
  imagePicker: { position: 'relative' },
  profileImage: { width: normalize(110), height: normalize(110), borderRadius: normalize(55) },
  placeholderImage: { width: normalize(110), height: normalize(110), borderRadius: normalize(55), justifyContent: 'center', alignItems: 'center' },
  addIcon: { position: 'absolute', bottom: 5, right: 5, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: isDark ? colors.background : '#fff' },
  formContainer: { width: '100%', paddingHorizontal: width > 600 ? '15%' : 0 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRadius: 12, marginBottom: 15, height: normalize(50), borderWidth: 1 },
  input: { flex: 1, height: '100%', fontSize: normalize(14), marginLeft: 10 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  countryPickerBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, height: normalize(50), paddingHorizontal: 12, marginRight: 10 },
  errorText: { color: colors.danger, fontSize: 12, marginTop: -10, marginBottom: 10, marginLeft: 5 },
  privacyContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingHorizontal: 5 },
  checkbox: { marginRight: 10 },
  privacyTextContainer: { flexDirection: 'row', flexWrap: 'wrap', flex: 1 },
  privacyText: { fontSize: normalize(13) },
  privacyLink: { fontSize: normalize(13), fontWeight: 'bold', textDecorationLine: 'underline' },
  signupButton: { borderRadius: 25, height: normalize(50), justifyContent: 'center', alignItems: 'center', marginTop: 20, elevation: 2 },
  disabledButton: { opacity: 0.5 },
  signupButtonText: { color: '#fff', fontSize: normalize(14), fontWeight: 'bold', letterSpacing: 1 },
});
