import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import {
  ArrowLeft, Clock, AtSign,
  Mail, Lock, EyeOff, Eye, User as UserIcon,
  Globe, ChevronDown, MapPin, Camera, Plus, Square as SquareIcon,
  CheckCircle as CheckCircleIcon, Check, Landmark, Map as MapIcon, Calendar as CalendarIcon
} from 'lucide-react-native';
import apiService from '../services/api.service';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { CountryPicker } from 'react-native-country-codes-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VERSION } from '../utils/constants';
import { RDC_PROVINCES, GENDERS } from '../utils/locations';

const createStyles = (colors: any, normalize: any, isDark: boolean, width: number) => StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, width: '100%', alignItems: 'center', paddingHorizontal: width < 360 ? 14 : 22, paddingVertical: 18 },
  backButton: { width: '100%', maxWidth: 620, marginBottom: 10, alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 2 },
  header: { width: '100%', maxWidth: 620, alignItems: 'center', marginBottom: 18 },
  logoImage: { width: normalize(170), height: normalize(128), marginBottom: 8 },
  title: { fontSize: normalize(23, 1), fontWeight: '800', marginBottom: 5, letterSpacing: -0.3 },
  subtitle: { fontSize: normalize(13), textAlign: 'center' },
  stepIndicatorContainer: { flexDirection: 'row', marginTop: 16 },
  stepDot: { width: 42, height: 5, borderRadius: 3, marginHorizontal: 3 },
  blockedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)' },
  blockedText: { fontSize: normalize(12), fontWeight: 'bold', marginLeft: 8 },
  animateStep: { width: '100%' },
  imageContainer: { alignItems: 'center', marginBottom: 30 },
  imagePicker: { position: 'relative' },
  profileImage: { width: normalize(110), height: normalize(110), borderRadius: normalize(55) },
  placeholderImage: { width: normalize(110), height: normalize(110), borderRadius: normalize(55), justifyContent: 'center', alignItems: 'center' },
  imageNote: { fontSize: normalize(11), textAlign: 'center', marginTop: 10, paddingHorizontal: 20 },
  addIcon: { position: 'absolute', bottom: 5, right: 5, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: isDark ? colors.background : '#fff' },
  formContainer: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: width < 360 ? 16 : 24, backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, shadowColor: '#17152B', shadowOpacity: isDark ? 0 : 0.07, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: isDark ? 0 : 2 },
  wideFormContainer: { padding: 30 },
  formHeading: { fontSize: normalize(19), fontWeight: '800', letterSpacing: -0.3 },
  formDescription: { fontSize: normalize(12), lineHeight: normalize(18), marginTop: 4, marginBottom: 20 },
  backgroundOrb: { position: 'absolute', borderRadius: 999 },
  backgroundOrbTop: { width: 250, height: 250, top: -145, right: -90 },
  backgroundOrbBottom: { width: 300, height: 300, bottom: -180, left: -150 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderRadius: 13, marginBottom: 13, height: normalize(50), borderWidth: 1 },
  input: { flex: 1, height: '100%', fontSize: normalize(14), marginLeft: 10 },
  strengthBarContainer: { height: 4, backgroundColor: '#E5E5EA', borderRadius: 2, marginBottom: 15, marginHorizontal: 15, overflow: 'hidden' },
  strengthBar: { height: '100%', borderRadius: 2 },
  hintText: { fontSize: 10, marginTop: -12, marginBottom: 15, marginLeft: 15 },
  inputText: { flex: 1, fontSize: normalize(14), marginLeft: 10, textAlignVertical: 'center' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  countryPickerBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 13, height: normalize(50), paddingHorizontal: 10, marginRight: 8 },
  errorText: { color: colors.danger, fontSize: 12, marginTop: -10, marginBottom: 10, marginLeft: 5 },
  privacyContainer: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, paddingHorizontal: 2, marginBottom: 10 },
  checkbox: { marginRight: 10 },
  privacyTextContainer: { flexDirection: 'row', flexWrap: 'wrap', flex: 1 },
  privacyText: { fontSize: normalize(13) },
  privacyLink: { fontSize: normalize(13), fontWeight: 'bold', textDecorationLine: 'underline' },
  signupButton: { borderRadius: 14, height: normalize(52), justifyContent: 'center', alignItems: 'center', marginTop: 18, elevation: 2 },
  disabledButton: { opacity: 0.5 },
  signupButtonText: { color: '#fff', fontSize: normalize(14), fontWeight: 'bold', letterSpacing: 1 },
  loginLink: { marginTop: 22, alignItems: 'center', paddingBottom: 4 },
  loginLinkText: { fontSize: normalize(14) },
  labelSmall: { fontSize: normalize(11), fontWeight: '700', marginBottom: 5, marginLeft: 5, textTransform: 'uppercase' },
  genderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  genderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: normalize(45), borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginHorizontal: 5, backgroundColor: isDark ? '#333' : '#f9f9f9' },
  genderText: { marginLeft: 8, fontSize: normalize(14), fontWeight: '600', color: colors.text.secondary },
  provincesList: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  provinceChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#333' : '#f0f0f0', margin: 4, borderWidth: 1, borderColor: colors.border },
  provinceChipText: { fontSize: normalize(12), fontWeight: '500' },
  locationRow: { flexDirection: width < 360 ? 'column' : 'row', justifyContent: 'space-between' },
  birthDateContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  birthInput: { flex: 1, height: normalize(50), borderWidth: 1, borderRadius: 12, marginHorizontal: 5, textAlign: 'center', fontSize: normalize(16), fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
  modalTitle: { fontSize: normalize(18), fontWeight: 'bold', color: colors.text.primary, marginBottom: 20, textAlign: 'center' },
  statusItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  statusText: { fontSize: normalize(16) },
  closeBtn: { marginTop: 15, padding: 15, alignItems: 'center' },
  closeBtnText: { fontSize: normalize(16), color: colors.primary, fontWeight: 'bold' }
});

export default function SignupScreen({ navigation }: any) {
  const { colors, normalize, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const { t, language } = useLanguage();
  const { setUser } = useUser();

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('République Démocratique du Congo');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [commune, setCommune] = useState('');
  const [birthDate, setBirthDate] = useState({ day: '', month: '', year: '' });

  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [provinceModalVisible, setProvinceModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [communeModalVisible, setCommuneModalVisible] = useState(false);
  const [birthDateModalVisible, setBirthDateModalVisible] = useState(false);

  const [countryFlag, setCountryFlag] = useState('🇨🇩');
  const [callingCode, setCallingCode] = useState('243');
  const [countryCode, setCountryCode] = useState('CD');

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [pseudoError, setPseudoError] = useState('');
  const [nameError, setNameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0); // 0 to 3
  const [emailTaken, setEmailTaken] = useState(false);
  const [phoneTaken, setPhoneTaken] = useState(false);
  const [pseudoTaken, setPseudoTaken] = useState(false);

  const [failCount, setFailCount] = useState(0);
  const [blockUntil, setBlockUntil] = useState<number | null>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    const checkBlock = async () => {
      try {
        const blocked = await AsyncStorage.getItem('signup_blocked_until');
        if (blocked) {
          const time = Number.parseInt(blocked, 10);
          if (Number.isFinite(time) && time > Date.now()) {
            setBlockUntil(time);
          } else {
            await AsyncStorage.removeItem('signup_blocked_until');
          }
        }
      } catch (error) {
        console.warn('Signup: Unable to restore registration lock', error);
      }
    };
    void checkBlock();
  }, []);

  // Vérifier la disponibilité en temps réel
  useEffect(() => {
    let active = true;
    const value = email.trim().toLowerCase();
    setEmailTaken(false);
    if (!value) {
      setEmailError('');
      return () => { active = false; };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Adresse email invalide');
      return () => { active = false; };
    }
    setEmailError('');
    const timer = setTimeout(async () => {
      try {
        const res = await apiService.checkAvailability({ email: value });
        if (!active) return;
        if (!res.success) {
          setEmailError('Vérification indisponible. Le serveur contrôlera cette adresse à la création.');
          return;
        }
        if (typeof res.available !== 'boolean') {
          setEmailError('Réponse de vérification invalide. Le serveur contrôlera cette adresse à la création.');
          return;
        }
        const taken = res.available === false;
        setEmailTaken(taken);
        setEmailError(taken ? 'Cette adresse email est déjà utilisée' : '');
      } catch (error) {
        if (active) {
          console.warn('Signup: Email availability check failed', error);
          setEmailError('Vérification indisponible. Le serveur contrôlera cette adresse à la création.');
        }
      }
    }, 800);
    return () => { active = false; clearTimeout(timer); };
  }, [email]);

  useEffect(() => {
    let active = true;
    const cleanPhone = phone.replace(/\D/g, '');
    setPhoneTaken(false);
    if (cleanPhone !== phone) {
      setPhone(cleanPhone);
      return () => { active = false; };
    }
    if (!cleanPhone) {
      setPhoneError('');
      return () => { active = false; };
    }
    const dialDigits = callingCode.replace(/\D/g, '');
    if (cleanPhone.length + dialDigits.length > 15) {
      setPhoneError('Le numéro dépasse la longueur maximale autorisée.');
      return () => { active = false; };
    }
    if (countryCode === 'CD' && cleanPhone.length >= 6 &&
      (cleanPhone.length !== 9 || !/^[89]/.test(cleanPhone))) {
      setPhoneError('Un numéro mobile RDC doit contenir 9 chiffres et commencer par 8 ou 9.');
      return () => { active = false; };
    }
    setPhoneError('');
    const timer = setTimeout(async () => {
      try {
        const fullPhone = `+${dialDigits}${cleanPhone}`;
        const res = await apiService.checkAvailability({ phone_number: fullPhone });
        if (!active) return;
        if (!res.success) {
          setPhoneError('Vérification indisponible. Le serveur contrôlera ce numéro à la création.');
          return;
        }
        if (typeof res.available !== 'boolean') {
          setPhoneError('Réponse de vérification invalide. Le serveur contrôlera ce numéro à la création.');
          return;
        }
        const taken = res.available === false;
        setPhoneTaken(taken);
        setPhoneError(taken ? 'Ce numéro est déjà utilisé' : '');
      } catch (error) {
        if (active) {
          console.warn('Signup: Phone availability check failed', error);
          setPhoneError('Vérification indisponible. Le serveur contrôlera ce numéro à la création.');
        }
      }
    }, 800);
    return () => { active = false; clearTimeout(timer); };
  }, [phone, callingCode, countryCode]);

  useEffect(() => {
    let active = true;
    const value = pseudo.trim().toLowerCase();
    setPseudoTaken(false);
    if (!value) {
      setPseudoError('');
      return () => { active = false; };
    }
    if (value.length < 3 || !/^[a-z0-9_.]+$/.test(value)) {
      setPseudoError('Pseudo invalide (3 caractères minimum : lettres, chiffres, . _ uniquement)');
      return () => { active = false; };
    }
    setPseudoError('');
    const timer = setTimeout(async () => {
      try {
        const res = await apiService.checkAvailability({ username: value });
        if (!active) return;
        if (!res.success) {
          setPseudoError('Vérification indisponible. Le serveur contrôlera ce pseudo à la création.');
          return;
        }
        if (typeof res.available !== 'boolean') {
          setPseudoError('Réponse de vérification invalide. Le serveur contrôlera ce pseudo à la création.');
          return;
        }
        const taken = res.available === false;
        setPseudoTaken(taken);
        setPseudoError(taken ? 'Identifiant non disponible. Veuillez en choisir un autre.' : '');
      } catch (error) {
        if (active) {
          console.warn('Signup: Username availability check failed', error);
          setPseudoError('Vérification indisponible. Le serveur contrôlera ce pseudo à la création.');
        }
      }
    }, 800);
    return () => { active = false; clearTimeout(timer); };
  }, [pseudo]);

  const handlePickImage = async () => {
    try {
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
      }
    } catch (error: any) {
      console.error('Signup: Unable to choose profile image', error);
      Alert.alert('Photo de profil', error?.message || 'Impossible d’accéder à la galerie.');
    }
  };

  const handleNextStep = async () => {
    if (blockUntil && Date.now() < blockUntil) {
      const remaining = Math.ceil((blockUntil - Date.now()) / 60000);
      Alert.alert('Formulaire bloqué', `Trop de tentatives avec des informations déjà utilisées. Veuillez réessayer dans ${remaining} minute(s).`);
      return;
    }

    let hasError = false;
    if (step === 1) {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPseudo = pseudo.trim();
      if (!normalizedPseudo) { Alert.alert('Erreur', 'L\'identifiant est requis'); return; }
      if (!email.trim()) { Alert.alert('Erreur', 'L\'adresse email est requise'); return; }
      if (!password) { Alert.alert('Erreur', 'Le mot de passe est requis'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        Alert.alert('Erreur', 'Veuillez saisir une adresse email valide.');
        return;
      }
      if (normalizedPseudo.length < 3 || !/^[a-z0-9_.]+$/i.test(normalizedPseudo)) {
        Alert.alert('Erreur', 'Le pseudo doit contenir au moins 3 caractères : lettres, chiffres, point ou soulignement.');
        return;
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(password) || password.length < 8) {
        Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.');
        return;
      }
      if (emailTaken || pseudoTaken) hasError = true;
    } else if (step === 2) {
      if (!fullName.trim()) { Alert.alert('Erreur', 'Le nom complet est requis'); return; }
      if (fullName.trim().length < 2) { Alert.alert('Erreur', 'Le nom complet doit contenir au moins 2 caractères.'); return; }
      const phoneDigits = phone.replace(/\D/g, '');
      const dialDigits = callingCode.replace(/\D/g, '');
      if (phoneDigits.length < 6) { Alert.alert('Erreur', 'Veuillez saisir un numéro de téléphone valide.'); return; }
      if (phoneDigits.length + dialDigits.length > 15) { Alert.alert('Erreur', 'Le numéro dépasse la longueur maximale autorisée.'); return; }
      if (countryCode === 'CD' && (phoneDigits.length !== 9 || !/^[89]/.test(phoneDigits))) {
        Alert.alert('Erreur', 'Un numéro mobile RDC doit contenir 9 chiffres et commencer par 8 ou 9.');
        return;
      }
      if (!gender) { Alert.alert('Erreur', 'Veuillez sélectionner votre sexe'); return; }
      if (phoneTaken || nameError) hasError = true;
    }

    if (hasError) {
      const newFailCount = failCount + 1;
      setFailCount(newFailCount);

      if (newFailCount >= 3) {
        // Bloquer : 1h pour 3 échecs, 2h pour les suivants
        const blockDuration = newFailCount === 3 ? 3600000 : 7200000;
        const until = Date.now() + blockDuration;
        setBlockUntil(until);
        try {
          await AsyncStorage.setItem('signup_blocked_until', until.toString());
        } catch (storageError) {
          console.warn('Signup: Unable to persist registration lock', storageError);
        }
        Alert.alert('Sécurité', `Trop d'erreurs détectées. Le formulaire est bloqué pour ${blockDuration / 3600000} heure(s).`);
      } else {
        Alert.alert('Attention', `Ces informations sont déjà utilisées ou invalides. Tentatives avant blocage : ${3 - newFailCount}`);
      }
      return;
    }

    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (!countryCode || !country || !province || !city || !birthDate.day || !birthDate.month || !birthDate.year) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs de localisation et votre date de naissance');
        return;
      }
      const d = Number.parseInt(birthDate.day, 10);
      const m = Number.parseInt(birthDate.month, 10);
      const y = Number.parseInt(birthDate.year, 10);
      const date = new Date(Date.UTC(y, m - 1, d));
      const today = new Date();
      let age = today.getFullYear() - y;
      if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
      if (!Number.isFinite(date.getTime()) || date.getUTCDate() !== d || date.getUTCMonth() + 1 !== m ||
        y < 1920 || age < 10) {
        Alert.alert('Erreur', 'Date de naissance invalide');
        return;
      }
      setStep(4);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  const handleSignup = async () => {
    if (!acceptedPrivacy) {
      Alert.alert('Erreur', t('privacyError'));
      return;
    }

    setLoading(true);

    try {
      const fullPhone = `+${callingCode.replace(/\D/g, '')}${phone.replace(/\D/g, '')}`;

      const formattedBirthDate = (birthDate.day && birthDate.month && birthDate.year)
        ? `${birthDate.year}-${birthDate.month.padStart(2, '0')}-${birthDate.day.padStart(2, '0')}`
        : null;

      const [deviceInfo, legalResponse] = await Promise.all([
        apiService.getDeviceInfo(),
        apiService.getLegalDocs(),
      ]);
      const legalDocs = Array.isArray(legalResponse.data) ? legalResponse.data : [];
      const tosVersion = legalDocs.find((doc: any) => doc.type === 'tos')?.version;
      const privacyVersion = legalDocs.find((doc: any) => doc.type === 'privacy')?.version;
      if (!legalResponse.success || !tosVersion || !privacyVersion) {
        throw new Error('Impossible de vérifier les versions des conditions et de la politique de confidentialité.');
      }

      console.log('Signup: Attempting registration...');

      const response = await apiService.register({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone_number: fullPhone,
        username: pseudo.trim() || undefined,
        gender,
        country,
        province,
        city,
        commune,
        birth_date: formattedBirthDate,
        device_info: deviceInfo,
        appVersion: APP_VERSION,
        accepted_legal_version: tosVersion,
        accepted_tos_version: tosVersion,
        accepted_privacy_version: privacyVersion,
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Échec de la création du compte');
      }

      console.log('Signup: Registration success, setting user context...');

      let registeredUser = response.data?.user;
      if (!registeredUser) {
        const profileResponse = await apiService.getMe();
        if (!profileResponse.success || !profileResponse.data) {
          throw new Error('Compte créé, mais le profil n’a pas pu être chargé. Connectez-vous pour continuer.');
        }
        registeredUser = profileResponse.data;
      }
      await setUser(registeredUser);

      if (profileImage) {
        try {
          const uploadRes = await apiService.uploadFile({
            uri: profileImage,
            type: 'image/jpeg',
            name: 'profile.jpg'
          }, 'image');
          if (uploadRes.success && uploadRes.data?.fileUrl) {
            const profileRes = await apiService.updateProfile({ avatar_url: uploadRes.data.fileUrl });
            if (profileRes.success && profileRes.data) await setUser(profileRes.data);
          } else {
            console.error('Signup: Avatar upload failed', uploadRes.error);
          }
        } catch (updateErr) {
          console.error('Signup: Avatar update failed but account created', updateErr);
        }
      }

      const refreshedProfile = await apiService.getMe();
      if (refreshedProfile.success && refreshedProfile.data) {
        await setUser(refreshedProfile.data);
      }

      // Enregistrer le premier temps d'ouverture pour la logique des 2 jours
      try {
        await AsyncStorage.setItem('last_app_open', Date.now().toString());
      } catch (storageErr) {
        console.warn('Signup: Storage last_app_open failed', storageErr);
      }

      if (Platform.OS === 'web') {
        window.alert('Succès: Votre compte a été créé avec succès !');
        setTimeout(() => {
          if (navigation && navigation.reset) {
            navigation.reset({ index: 0, routes: [{ name: 'ChatList' }] });
          } else {
            navigation.navigate('ChatList');
          }
        }, 500);
      } else {
        Alert.alert('Succès', 'Votre compte a été créé avec succès !', [{
          text: 'DÉMARRER',
          onPress: () => {
            setTimeout(() => {
              if (navigation?.reset) navigation.reset({ index: 0, routes: [{ name: 'ChatList' }] });
              else navigation.navigate('ChatList');
            }, 200);
          }
        }]);
      }
    } catch (error: any) {
      console.error('Signup: handleSignup error', error);
      const errorMsg = error.message || 'Une erreur inattendue est survenue';
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + errorMsg);
      } else {
        Alert.alert('Erreur', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors, normalize, isDark, width);

  const renderStepIndicators = () => (
    <View style={styles.stepIndicatorContainer}>
      {[1, 2, 3, 4].map((s) => (
        <View
          key={s}
          style={[
            styles.stepDot,
            { backgroundColor: step === s ? colors.primary : (step > s ? colors.primary + '50' : colors.border) }
          ]}
        />
      ))}
    </View>
  );

  const isWide = width > 1024;
  const stepTitles = ['Compte', 'Profil', 'Localisation', 'Finalisation'];

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.backgroundOrb, styles.backgroundOrbTop, { backgroundColor: colors.primary + '12' }]} />
        <View style={[styles.backgroundOrb, styles.backgroundOrbBottom, { backgroundColor: colors.secondary + '10' }]} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={handlePrevStep} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Image
              source={require('../../assets/AcemiaLogo.png')}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="Acemia"
            />
            <Text style={[styles.title, { color: colors.primary }]}>Inscription</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Étape {step} sur 4 · {stepTitles[step - 1]}</Text>

            {blockUntil && Date.now() < blockUntil && (
              <View style={[styles.blockedBanner, { backgroundColor: colors.danger + '15' }]}>
                <Clock size={16} color={colors.danger} />
                <Text style={[styles.blockedText, { color: colors.danger }]}>
                  Formulaire bloqué temporairement
                </Text>
              </View>
            )}

            {renderStepIndicators()}
          </View>

          <View style={[styles.formContainer, isWide && styles.wideFormContainer]}>
            <Text style={[styles.formHeading, { color: colors.text.primary }]}>
              {['Vos identifiants', 'Votre profil', 'Où vous trouver ?', 'Presque terminé'][step - 1]}
            </Text>
            <Text style={[styles.formDescription, { color: colors.text.secondary }]}>
              {['Créez un identifiant et protégez votre compte.', 'Ajoutez vos informations pour personnaliser votre profil.', 'Indiquez votre localisation et votre année de naissance.', 'Ajoutez une photo et acceptez les conditions pour terminer.'][step - 1]}
            </Text>
            {step === 1 && (
              <View style={styles.animateStep}>
                <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border }]}>
                  <AtSign size={20} color={colors.text.secondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text.primary }]}
                    placeholder="Identifiant (Pseudo)"
                    placeholderTextColor={colors.text.disabled}
                    value={pseudo}
                    onChangeText={setPseudo}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                    returnKeyType="next"
                    onSubmitEditing={() => emailInputRef.current?.focus()}
                    accessibilityLabel="Identifiant"
                  />
                </View>
                {pseudoError ? <Text style={styles.errorText}>{pseudoError}</Text> : null}

                <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border }]}>
                  <Mail size={20} color={colors.text.secondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text.primary }]}
                    placeholder="Adresse Email"
                    placeholderTextColor={colors.text.disabled}
                    ref={emailInputRef}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    accessibilityLabel="Adresse email"
                  />
                </View>
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

                <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: passwordError ? colors.danger : colors.border }]}>
                  <Lock size={20} color={colors.text.secondary} />
                  <TextInput
                  ref={passwordInputRef}
                  style={[styles.input, { color: colors.text.primary }]}
                    placeholder="Mot de passe"
                    placeholderTextColor={colors.text.disabled}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      let strength = 0;
                      if (text.length >= 8) strength++;
                      if (/[A-Z]/.test(text)) strength++;
                      if (/[0-9]/.test(text)) strength++;
                      setPasswordStrength(strength);

                      if (text.length > 0 && text.length < 8) {
                        setPasswordError('Minimum 8 caractères requis');
                      } else if (text.length >= 8 && !/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(text)) {
                        setPasswordError('Inclure Majuscule, minuscule et chiffre');
                      } else {
                        setPasswordError('');
                      }
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="done"
                    accessibilityLabel="Mot de passe"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} color={colors.text.secondary} /> : <Eye size={20} color={colors.text.secondary} />}
                  </TouchableOpacity>
                </View>

                {/* Barre de force du mot de passe */}
                {password.length > 0 && (
                  <View style={styles.strengthBarContainer}>
                    <View style={[
                      styles.strengthBar,
                      {
                        width: `${(passwordStrength / 3) * 100}%`,
                        backgroundColor: passwordStrength === 1 ? '#FF3B30' : (passwordStrength === 2 ? '#FF9500' : (passwordStrength === 3 ? '#4CD964' : colors.danger))
                      }
                    ]} />
                  </View>
                )}

                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : (
                   <Text style={[styles.hintText, { color: colors.text.secondary }]}>Min. 8 caractères, 1 Majuscule et 1 chiffre</Text>
                )}

                <TouchableOpacity style={[styles.signupButton, { backgroundColor: colors.primary }]} onPress={handleNextStep}>
                  <Text style={styles.signupButtonText}>CONTINUER</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 2 && (
              <View style={styles.animateStep}>
                <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: nameError ? colors.danger : colors.border }]}>
                  <UserIcon size={20} color={colors.text.secondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text.primary }]}
                    placeholder="Nom complet"
                    placeholderTextColor={colors.text.disabled}
                    value={fullName}
                    onChangeText={(text) => {
                      setFullName(text);
                      if (text.trim() && !/^[a-zA-ZÀ-ÿ\s'-]+$/.test(text)) {
                        setNameError('Le nom ne doit contenir que des lettres');
                      } else {
                        setNameError('');
                      }
                    }}
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                  />
                </View>
                {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

                <View style={[styles.phoneRow]}>
                  <TouchableOpacity
                    style={[styles.countryPickerBtn, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12 }]}
                    onPress={() => setShowCountryPicker(true)}
                  >
                    <Text style={{ fontSize: 20 }}>{countryFlag}</Text>
                    <Text style={{ color: colors.text.primary, marginLeft: 5, fontWeight: 'bold' }}>+{callingCode.replace('+', '')}</Text>
                    <ChevronDown size={14} color={colors.text.secondary} style={{ marginLeft: 5 }} />
                  </TouchableOpacity>

                  <View style={[styles.inputWrapper, { flex: 1, backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border, marginBottom: 0 }]}>
                    <TextInput
                      style={[styles.input, { color: colors.text.primary, fontWeight: 'bold' }]}
                      placeholder="812345678"
                      placeholderTextColor={colors.text.disabled}
                      value={phone}
                      onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, Math.max(0, 15 - callingCode.replace(/\D/g, '').length)))}
                      keyboardType="phone-pad"
                      maxLength={Math.max(1, 15 - callingCode.replace(/\D/g, '').length)}
                      autoComplete="tel-national"
                      textContentType="telephoneNumber"
                      returnKeyType="done"
                      accessibilityLabel="Numéro de téléphone"
                    />
                  </View>
                </View>
                {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

                <Text style={[styles.labelSmall, { color: colors.text.secondary }]}>Sexe</Text>
                <View style={styles.genderRow}>
                   <TouchableOpacity
                    style={[styles.genderBtn, gender === 'M' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setGender('M')}
                   >
                     <UserIcon size={18} color={gender === 'M' ? '#fff' : colors.text.secondary} />
                     <Text style={[styles.genderText, gender === 'M' && { color: '#fff' }]}>Homme</Text>
                   </TouchableOpacity>
                   <TouchableOpacity
                    style={[styles.genderBtn, gender === 'F' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setGender('F')}
                   >
                     <UserIcon size={18} color={gender === 'F' ? '#fff' : colors.text.secondary} />
                     <Text style={[styles.genderText, gender === 'F' && { color: '#fff' }]}>Femme</Text>
                   </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.signupButton, { backgroundColor: colors.primary }]} onPress={handleNextStep}>
                  <Text style={styles.signupButtonText}>CONTINUER</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 3 && (
              <View style={styles.animateStep}>
                <Text style={[styles.labelSmall, { color: colors.text.secondary }]}>Localisation</Text>

                <TouchableOpacity style={[styles.inputWrapper, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border }]} onPress={() => setShowCountryPicker(true)}>
                  <Globe size={20} color={colors.text.secondary} />
                  <Text style={[styles.inputText, { color: colors.text.primary }]}>
                    {country || 'Sélectionner le Pays'}
                  </Text>
                  <ChevronDown size={20} color={colors.text.secondary} />
                </TouchableOpacity>

                <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border }, !country && { opacity: 0.5 }]}>
                  <MapPin size={20} color={colors.text.secondary} />
                  {countryCode === 'CD' ? (
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => setProvinceModalVisible(true)}
                    >
                      <Text style={[styles.inputText, { color: colors.text.primary }]}>
                        {province || 'Sélectionner la Province'}
                      </Text>
                      <ChevronDown size={20} color={colors.text.secondary} />
                    </TouchableOpacity>
                  ) : (
                    <TextInput
                      style={[styles.input, { color: colors.text.primary }]}
                      placeholder="Province"
                      placeholderTextColor={colors.text.disabled}
                      value={province}
                      onChangeText={setProvince}
                      editable={!!country}
                    />
                  )}
                </View>

                <View style={styles.locationRow}>
                  <View style={[styles.inputWrapper, { flex: 1, backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border, marginRight: width < 360 ? 0 : 5 }, !province && { opacity: 0.5 }]}>
                    <Landmark size={20} color={colors.text.secondary} />
                    {countryCode === 'CD' ? (
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                        onPress={() => province && setCityModalVisible(true)}
                        disabled={!province}
                      >
                        <Text style={[styles.inputText, { color: colors.text.primary, marginLeft: 5 }]} numberOfLines={1}>
                          {city || 'Ville'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TextInput
                        style={[styles.input, { color: colors.text.primary, marginLeft: 5 }]}
                        placeholder="Ville"
                        placeholderTextColor={colors.text.disabled}
                        value={city}
                        onChangeText={setCity}
                        editable={!!province}
                      />
                    )}
                  </View>

                  <View style={[styles.inputWrapper, { flex: 1, backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border, marginLeft: width < 360 ? 0 : 5 }, !city && { opacity: 0.5 }]}>
                    <MapIcon size={20} color={colors.text.secondary} />
                    {countryCode === 'CD' ? (
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                        onPress={() => city && setCommuneModalVisible(true)}
                        disabled={!city}
                      >
                        <Text style={[styles.inputText, { color: colors.text.primary, marginLeft: 5 }]} numberOfLines={1}>
                          {commune || 'Commune'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TextInput
                        style={[styles.input, { color: colors.text.primary, marginLeft: 5 }]}
                        placeholder="Commune"
                        placeholderTextColor={colors.text.disabled}
                        value={commune}
                        onChangeText={setCommune}
                        editable={!!city}
                      />
                    )}
                  </View>
                </View>

                <Text style={[styles.labelSmall, { color: colors.text.secondary, marginTop: 10 }]}>Date de naissance / Âge</Text>
                <TouchableOpacity
                  style={[styles.inputWrapper, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border }]}
                  onPress={() => setBirthDateModalVisible(true)}
                >
                   <CalendarIcon size={20} color={colors.text.secondary} />
                   <Text style={[styles.inputText, { color: colors.text.primary }]}>
                     {birthDate.year ? `${birthDate.day}/${birthDate.month}/${birthDate.year} (${new Date().getFullYear() - parseInt(birthDate.year)} ans)` : 'Sélectionner l\'âge'}
                   </Text>
                   <ChevronDown size={20} color={colors.text.secondary} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.signupButton, { backgroundColor: colors.primary }]} onPress={handleNextStep}>
                  <Text style={styles.signupButtonText}>CONTINUER</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 4 && (
              <View style={styles.animateStep}>
                <View style={styles.imageContainer}>
                  <TouchableOpacity onPress={handlePickImage} style={styles.imagePicker}>
                    {profileImage ? (
                      <Image source={{ uri: profileImage }} style={styles.profileImage} />
                    ) : (
                      <View style={[styles.placeholderImage, { backgroundColor: isDark ? '#333' : '#DFE5E7' }]}><Camera size={normalize(40)} color={isDark ? '#666' : '#fff'} /></View>
                    )}
                    <View style={[styles.addIcon, { backgroundColor: colors.secondary }]}><Plus size={20} color="#fff" /></View>
                  </TouchableOpacity>
                  <Text style={[styles.imageNote, { color: colors.text.secondary }]}>Ajoutez une photo pour que vos amis vous reconnaissent</Text>
                </View>

                <View style={styles.privacyContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setAcceptedPrivacy(!acceptedPrivacy)}
                  >
                    {acceptedPrivacy ? <CheckCircleIcon size={24} color={colors.primary} /> : <SquareIcon size={24} color={colors.text.secondary} />}
                  </TouchableOpacity>
                  <View style={styles.privacyTextContainer}>
                    <Text style={[styles.privacyText, { color: colors.text.secondary }]}>J'accepte les </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
                      <Text style={[styles.privacyLink, { color: colors.primary }]}>Conditions d'Utilisation</Text>
                    </TouchableOpacity>
                    <Text style={[styles.privacyText, { color: colors.text.secondary }]}> et la </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                      <Text style={[styles.privacyLink, { color: colors.primary }]}>Politique de Confidentialité</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={[styles.signupButton, { backgroundColor: colors.primary }, loading && styles.disabledButton]} onPress={handleSignup} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signupButtonText}>CRÉER MON COMPTE</Text>}
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={[styles.loginLinkText, { color: colors.text.secondary }]}>
                Déjà un compte ? <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Se connecter</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CountryPicker
        show={showCountryPicker}
        lang={language}
        pickerButtonOnPress={(item) => {
          setCountry(item.name[language as keyof typeof item.name] || item.name.en);
          setCountryFlag(item.flag);
          setCountryCode(item.code);
          setCallingCode(item.dial_code);
          setShowCountryPicker(false);
          setProvince(''); setCity(''); setCommune('');
        }}
        onBackdropPress={() => setShowCountryPicker(false)}
        style={{
          modal: { height: 500, backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' },
          countryName: { color: colors.text.primary },
          dialCode: { color: colors.text.secondary },
        }}
      />

      {/* Modal Province */}
      <Modal visible={provinceModalVisible} transparent animationType="slide" onRequestClose={() => setProvinceModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sélectionnez la province</Text>
            <FlatList
              data={countryCode === 'CD' ? RDC_PROVINCES : []}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.statusItem} onPress={() => { setProvince(item.name); setProvinceModalVisible(false); setCity(''); setCommune(''); }}>
                  <Text style={[styles.statusText, { color: colors.text.primary }]}>{item.name}</Text>
                  {province === item.name && <Check size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', padding: 20, color: colors.text.disabled }}>Veuillez sélectionner la RDC pour avoir la liste des provinces.</Text>}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setProvinceModalVisible(false)}><Text style={styles.closeBtnText}>Fermer</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Ville */}
      <Modal visible={cityModalVisible} transparent animationType="slide" onRequestClose={() => setCityModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sélectionnez la ville</Text>
            <FlatList
              data={RDC_PROVINCES.find(p => p.name === province)?.cities || []}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.statusItem} onPress={() => { setCity(item); setCityModalVisible(false); setCommune(''); }}>
                  <Text style={[styles.statusText, { color: colors.text.primary }]}>{item}</Text>
                  {city === item && <Check size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setCityModalVisible(false)}><Text style={styles.closeBtnText}>Fermer</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Commune */}
      <Modal visible={communeModalVisible} transparent animationType="slide" onRequestClose={() => setCommuneModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sélectionnez la commune</Text>
            <FlatList
              data={RDC_PROVINCES.find(p => p.name === province)?.communes || []}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.statusItem} onPress={() => { setCommune(item); setCommuneModalVisible(false); }}>
                  <Text style={[styles.statusText, { color: colors.text.primary }]}>{item}</Text>
                  {commune === item && <Check size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setCommuneModalVisible(false)}><Text style={styles.closeBtnText}>Fermer</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Age / Birth Date Selection */}
      <Modal visible={birthDateModalVisible} transparent animationType="fade" onRequestClose={() => setBirthDateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <Text style={styles.modalTitle}>Sélectionnez l'année de naissance</Text>
             <FlatList
               data={Array.from({ length: 100 }, (_, i) => (new Date().getFullYear() - 10 - i).toString())}
               keyExtractor={(item) => item}
               renderItem={({ item }) => (
                 <TouchableOpacity style={styles.statusItem} onPress={() => { setBirthDate({ day: '01', month: '01', year: item }); setBirthDateModalVisible(false); }}>
                   <Text style={[styles.statusText, { color: colors.text.primary }]}>{item} ({new Date().getFullYear() - parseInt(item)} ans)</Text>
                 </TouchableOpacity>
               )}
             />
             <TouchableOpacity style={styles.closeBtn} onPress={() => setBirthDateModalVisible(false)}><Text style={styles.closeBtnText}>Fermer</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
