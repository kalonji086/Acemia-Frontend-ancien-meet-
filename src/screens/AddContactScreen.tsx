import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Linking,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import apiService from '../services/api.service';
import * as Contacts from 'expo-contacts';
import { CountryPicker } from 'react-native-country-codes-picker';
import { CheckCircle, Share2 } from 'lucide-react-native';

export default function AddContactScreen({ navigation }: any) {
  const { colors, normalize, isDark } = useTheme();
  const { language } = useLanguage();
  const { width, height } = useWindowDimensions();
  const styles = createStyles(normalize, width);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // Real-time phone check
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [lookupError, setLookupError] = useState(false);

  const [callingCode, setCallingCode] = useState('243');
  const [countryFlag, setCountryFlag] = useState('🇨🇩');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const lookupRequestId = useRef(0);
  const nationalDigits = phone.replace(/\D/g, '');
  const normalizedNationalNumber = nationalDigits.replace(/^0+/, '');
  const fullPhone = `+${callingCode.replace(/\D/g, '')}${normalizedNationalNumber}`;
  const fullPhoneDigits = fullPhone.replace(/\D/g, '');
  const isPhoneValid = fullPhoneDigits.length >= 7 && fullPhoneDigits.length <= 15;

  useEffect(() => {
    const requestId = ++lookupRequestId.current;
    setFoundUser(null);
    setShowInvite(false);
    setLookupError(false);

    if (!isPhoneValid) {
      setCheckingPhone(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingPhone(true);
      try {
        const res = await apiService.checkUserByPhone(fullPhone);
        if (requestId !== lookupRequestId.current) return;
        if (res.success && res.data?.found) {
          setFoundUser(res.data.user);
        } else {
          setShowInvite(true);
        }
      } catch (error) {
        if (requestId === lookupRequestId.current) {
          console.error('Phone check error:', error);
          setLookupError(true);
        }
      } finally {
        if (requestId === lookupRequestId.current) setCheckingPhone(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [fullPhone, isPhoneValid]);

  const handleInvite = () => {
    const invitePhone = fullPhone;
    const message = `Salut ! Rejoins-moi sur Acemia, l'application de messagerie avec traduction instantanée. Télécharge-la ici : https://play.google.com/store/apps/details?id=com.deve.meetapp`;

    Alert.alert(
      "Inviter un ami",
      "Comment souhaitez-vous inviter cette personne ?",
      [
        { text: "SMS", onPress: () => Linking.openURL(`sms:${invitePhone}?body=${encodeURIComponent(message)}`) },
        { text: "WhatsApp", onPress: () => Linking.openURL(`whatsapp://send?phone=${invitePhone}&text=${encodeURIComponent(message)}`) },
        { text: "Annuler", style: "cancel" }
      ]
    );
  };

  const handleSaveContact = async () => {
    if (!firstName.trim() || !isPhoneValid) {
      Alert.alert('Erreur', 'Saisissez un prénom et un numéro valide avec son indicatif.');
      return;
    }

    setLoading(true);
    try {
      const phoneCheck = await apiService.checkUserByPhone(fullPhone);
      if (!phoneCheck.success) throw new Error('Impossible de vérifier ce numéro.');
      const contactUser = phoneCheck.data?.found ? phoneCheck.data.user : null;
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Autorisation requise', 'Autorisez l’accès aux contacts pour enregistrer ce numéro dans votre répertoire.');
        return;
      }

      await Contacts.addContactAsync({
        [Contacts.Fields.FirstName]: firstName.trim(),
        [Contacts.Fields.LastName]: lastName.trim(),
        [Contacts.Fields.PhoneNumbers]: [{ label: 'mobile', number: fullPhone }],
      } as any);

      if (contactUser) {
        await apiService.addContact(contactUser.id);

        Alert.alert(
          'Contact ajouté',
          `${firstName.trim()} utilise Acemia ! Voulez-vous démarrer une discussion ?`,
          [
            { text: 'Plus tard', onPress: () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ChatList') },
            {
              text: 'Discuter',
              onPress: async () => {
                const chatRes = await apiService.createChat([contactUser.id]);
                if (chatRes.success) {
                  navigation.navigate('Chat', {
                    chatId: chatRes.data.id,
                    name: contactUser.full_name,
                    avatar: contactUser.avatar_url,
                    peerUserId: contactUser.id
                  });
                }
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Enregistré',
          'Le contact a été ajouté à votre téléphone, mais il n’a pas encore de compte Acemia.',
          [
            { text: "Inviter", onPress: handleInvite },
            { text: 'OK', onPress: () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ChatList') }
          ]
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible d’enregistrer le contact.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar backgroundColor={colors.surface} barStyle={isDark ? "light-content" : "dark-content"} />

      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Retour"
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ChatList')}
            style={styles.closeButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>Nouveau contact</Text>
          <TouchableOpacity
            onPress={handleSaveContact}
            disabled={loading || !firstName.trim() || !isPhoneValid}
            style={styles.saveButton}
          >
            {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.saveButtonText, { color: colors.primary }]} numberOfLines={1}>ENREGISTRER</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.form}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View style={styles.inputGroup}>
            <Ionicons name="person-outline" size={24} color={colors.primary} style={styles.icon} />
            <View style={styles.inputs}>
              <TextInput
                style={[styles.input, { borderBottomColor: colors.primary, color: colors.text.primary }]}
                placeholder="Prénom"
                placeholderTextColor={colors.text.disabled}
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={[styles.input, { borderBottomColor: colors.primary, color: colors.text.primary, marginTop: 10 }]}
                placeholder="Nom"
                placeholderTextColor={colors.text.disabled}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Ionicons name="call-outline" size={24} color={colors.primary} style={styles.icon} />
            <View style={styles.inputs}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.countryBtn, { borderColor: colors.border }]}
                  onPress={() => setShowCountryPicker(true)}
                >
                  <Text style={{ fontSize: 18 }}>{countryFlag}</Text>
                  <Text style={{ color: colors.text.primary, marginLeft: 5, fontWeight: 'bold' }}>+{callingCode}</Text>
                </TouchableOpacity>

                <TextInput
                  style={[styles.input, { flex: 1, borderBottomColor: colors.primary, color: colors.text.primary }]}
                  placeholder="Téléphone"
                  placeholderTextColor={colors.text.disabled}
                  value={phone}
                  onChangeText={(value) => setPhone(value.replace(/[^\d]/g, ''))}
                  keyboardType="phone-pad"
                  maxLength={15}
                />

                {checkingPhone && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 10 }} />}
                {foundUser && <CheckCircle size={20} color="#2ecc71" style={{ marginLeft: 10 }} />}
              </View>

              {!!phone && !isPhoneValid && (
                <Text style={{ color: '#d93025', fontSize: normalize(12), marginTop: 8 }}>
                  Entrez un numéro international valide (7 à 15 chiffres avec l’indicatif).
                </Text>
              )}

              {foundUser && (
                <View style={[styles.foundBox, { backgroundColor: '#2ecc7115', borderColor: '#2ecc71' }]}>
                  <Text style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: 12 }}>Utilisateur Acemia trouvé !</Text>
                  <Text style={{ color: colors.text.primary, fontSize: 11 }}>{foundUser.full_name} (@{foundUser.username})</Text>
                </View>
              )}

              {lookupError && !checkingPhone && (
                <Text style={{ color: '#d93025', fontSize: normalize(12), marginTop: 10 }}>
                  Vérification impossible pour le moment. Vous pouvez réessayer dans un instant.
                </Text>
              )}

              {showInvite && !foundUser && !checkingPhone && (
                <Text style={{ color: colors.text.secondary, fontSize: normalize(12), marginTop: 10 }}>
                  Aucun compte Acemia n’utilise ce numéro.
                </Text>
              )}

              {showInvite && !foundUser && !checkingPhone && (
                <TouchableOpacity onPress={handleInvite} style={[styles.inviteBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                  <Share2 size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: 'bold', marginLeft: 10, fontSize: 13 }}>Inviter sur Acemia</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            Le numéro sera ajouté au répertoire de votre téléphone. Si cette personne utilise Acemia, elle sera aussi ajoutée à vos contacts dans l’application.
          </Text>
        </ScrollView>

        <CountryPicker
          show={showCountryPicker}
          lang={language}
          pickerButtonOnPress={(item) => {
            setCountryFlag(item.flag);
            setCallingCode(item.dial_code.replace('+', ''));
            setShowCountryPicker(false);
          }}
          onBackdropPress={() => setShowCountryPicker(false)}
          style={{
            modal: { height: Math.min(500, height * 0.75), backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' },
            countryName: { color: colors.text.primary },
            dialCode: { color: colors.text.secondary },
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (normalize: (size: number) => number, width: number) => StyleSheet.create({
  safeArea: { flex: 1, width: '100%' },
  container: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' as const },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: normalize(width < 360 ? 10 : 15),
    paddingVertical: normalize(12),
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: normalize(18), fontWeight: 'bold', flex: 1, minWidth: 0, marginLeft: normalize(width < 360 ? 8 : 20) },
  saveButtonText: { fontWeight: 'bold', fontSize: normalize(14) },
  form: { flex: 1, width: '100%' },
  formContent: { width: '100%', maxWidth: 640, alignSelf: 'center' as const, padding: normalize(width < 360 ? 14 : 20), paddingBottom: normalize(36) },
  inputGroup: { flexDirection: 'row', marginBottom: normalize(26), alignItems: 'flex-start' },
  icon: { marginRight: normalize(width < 360 ? 10 : 20), marginTop: normalize(10) },
  inputs: { flex: 1 },
  input: {
    fontSize: normalize(16),
    paddingVertical: normalize(12),
    borderBottomWidth: 1,
    minWidth: 0,
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: normalize(8),
    minHeight: normalize(45),
    marginRight: normalize(8),
    marginTop: normalize(5)
  },
  foundBox: {
    marginTop: normalize(10),
    padding: normalize(10),
    borderRadius: normalize(10),
    borderWidth: 1,
    borderStyle: 'dashed'
  },
  inviteBtn: {
    marginTop: normalize(15),
    padding: normalize(12),
    borderRadius: normalize(10),
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  infoText: { fontSize: normalize(12), textAlign: 'center', marginTop: normalize(20), paddingHorizontal: normalize(width < 360 ? 10 : 30), lineHeight: normalize(18) },
  closeButton: { padding: normalize(5) },
  saveButton: { padding: normalize(5), flexShrink: 0 }
});
