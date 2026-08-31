import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // Real-time phone check
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  const [showInvite, setShowInvite] = useState(false);

  const [callingCode, setCallingCode] = useState('243');
  const [countryFlag, setCountryFlag] = useState('🇨🇩');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  useEffect(() => {
    if (phone.length > 5) {
      const timer = setTimeout(async () => {
        checkPhoneNumber();
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setFoundUser(null);
      setShowInvite(false);
    }
  }, [phone, callingCode]);

  const checkPhoneNumber = async () => {
    setCheckingPhone(true);
    try {
      const fullPhone = `+${callingCode.replace('+', '')}${phone.replace(/^0+/, '')}`;
      const res = await apiService.checkUserByPhone(fullPhone);

      if (res.success && res.data?.found) {
        setFoundUser(res.data.user);
        setShowInvite(false);
      } else {
        setFoundUser(null);
        if (phone.length >= 7) setShowInvite(true);
      }
    } catch (e) {
      console.log('Phone check error', e);
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleInvite = () => {
    const fullPhone = `+${callingCode.replace('+', '')}${phone.replace(/^0+/, '')}`;
    const message = `Salut ! Rejoins-moi sur Meet Me, l'application de messagerie avec traduction instantanée. Télécharge-la ici : https://play.google.com/store/apps/details?id=com.deve.meetapp`;

    Alert.alert(
      "Inviter un ami",
      "Comment souhaitez-vous inviter cette personne ?",
      [
        { text: "SMS", onPress: () => Linking.openURL(`sms:${fullPhone}?body=${encodeURIComponent(message)}`) },
        { text: "WhatsApp", onPress: () => Linking.openURL(`whatsapp://send?phone=${fullPhone}&text=${encodeURIComponent(message)}`) },
        { text: "Annuler", style: "cancel" }
      ]
    );
  };

  const handleSaveContact = async () => {
    if (!firstName || !phone) {
      Alert.alert('Erreur', 'Le prénom et le numéro sont obligatoires');
      return;
    }

    setLoading(true);
    try {
      // 1. Enregistrement dans le répertoire réel du téléphone
      const { status } = await Contacts.requestPermissionsAsync();
      const fullPhone = `+${callingCode.replace('+', '')}${phone.replace(/^0+/, '')}`;

      if (status === 'granted') {
        const contact = {
          [Contacts.Fields.FirstName]: firstName,
          [Contacts.Fields.LastName]: lastName,
          [Contacts.Fields.PhoneNumbers]: [{ label: 'mobile', number: fullPhone }],
        };
        await Contacts.addContactAsync(contact as any);
      }

      // 2. Si l'utilisateur a déjà été trouvé lors du check temps réel
      if (foundUser) {
        // Ajouter à la liste des contacts internes
        await apiService.addContact(foundUser.id);

        Alert.alert(
          'Contact ajouté',
          `${firstName} utilise Meet Me ! Voulez-vous démarrer une discussion ?`,
          [
            { text: 'Plus tard', onPress: () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ChatList') },
            {
              text: 'Discuter',
              onPress: async () => {
                const chatRes = await apiService.createChat([foundUser.id]);
                if (chatRes.success) {
                  navigation.navigate('Chat', {
                    chatId: chatRes.data.id,
                    name: foundUser.full_name,
                    avatar: foundUser.avatar_url,
                    peerUserId: foundUser.id
                  });
                }
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Enregistré',
          'Le contact a été ajouté à votre téléphone, mais il n\'a pas encore de compte Meet Me.',
          [
            { text: "Inviter", onPress: handleInvite },
            { text: 'OK', onPress: () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ChatList') }
          ]
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le contact.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar backgroundColor={colors.surface} barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Nouveau contact</Text>
        <TouchableOpacity
          onPress={handleSaveContact}
          disabled={loading || !firstName || !phone}
          style={styles.saveButton}
        >
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.saveButtonText, { color: colors.primary }]}>ENREGISTRER</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
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
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                />

                {checkingPhone && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 10 }} />}
                {foundUser && <CheckCircle size={20} color="#2ecc71" style={{ marginLeft: 10 }} />}
            </View>

            {foundUser && (
                <View style={[styles.foundBox, { backgroundColor: '#2ecc7115', borderColor: '#2ecc71' }]}>
                    <Text style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: 12 }}>Utilisateur Meet Me trouvé !</Text>
                    <Text style={{ color: colors.text.primary, fontSize: 11 }}>{foundUser.full_name} (@{foundUser.username})</Text>
                </View>
            )}

            {showInvite && !foundUser && !checkingPhone && (
                <TouchableOpacity onPress={handleInvite} style={[styles.inviteBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                    <Share2 size={16} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontWeight: 'bold', marginLeft: 10, fontSize: 13 }}>Inviter sur Meet Me</Text>
                </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={[styles.infoText, { color: colors.text.secondary }]}>
          Le contact sera enregistré dans votre répertoire téléphonique et synchronisé avec Meet Me.
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
          modal: { height: 500, backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' },
          countryName: { color: colors.text.primary },
          dialCode: { color: colors.text.secondary },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, marginLeft: 20 },
  saveButtonText: { fontWeight: 'bold', fontSize: 14 },
  form: { padding: 20 },
  inputGroup: { flexDirection: 'row', marginBottom: 30, alignItems: 'flex-start' },
  icon: { marginRight: 20, marginTop: 10 },
  inputs: { flex: 1 },
  input: {
    fontSize: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 45,
    marginRight: 10,
    marginTop: 5
  },
  foundBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed'
  },
  inviteBtn: {
    marginTop: 15,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  infoText: { fontSize: 12, textAlign: 'center', marginTop: 20, paddingHorizontal: 30, lineHeight: 18 },
  closeButton: { padding: 5 },
  saveButton: { padding: 5 }
});
