import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/theme';
import apiService from '../services/api.service';
import * as Contacts from 'expo-contacts';

export default function AddContactScreen({ navigation }: any) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSaveContact = async () => {
    if (!firstName || !phone) {
      Alert.alert('Erreur', 'Le prénom et le numéro sont obligatoires');
      return;
    }

    setLoading(true);
    try {
      // 1. Enregistrement dans le répertoire réel de la tablette
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const contact = {
          [Contacts.Fields.FirstName]: firstName,
          [Contacts.Fields.LastName]: lastName,
          [Contacts.Fields.PhoneNumbers]: [{ label: 'mobile', number: phone }],
        };
        await Contacts.addContactAsync(contact as any);
      }

      // 2. Vérification sur le serveur Meet Me
      const cleanPhone = phone.replace(/[^0-9+]/g, '');
      const response = await apiService.syncContacts([cleanPhone]);

      if (response.success && response.data.length > 0) {
        const foundUser = response.data[0];
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
                    otherUserId: foundUser.id
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
          [{ text: 'OK', onPress: () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ChatList') }]
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
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau contact</Text>
        <TouchableOpacity
          onPress={handleSaveContact}
          disabled={loading || !firstName || !phone}
          style={styles.saveButton}
        >
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.saveButtonText}>ENREGISTRER</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form}>
        <View style={styles.inputGroup}>
          <Ionicons name="person-outline" size={24} color={colors.primary} style={styles.icon} />
          <View style={styles.inputs}>
            <TextInput
              style={styles.input}
              placeholder="Prénom"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={[styles.input, styles.borderTop]}
              placeholder="Nom"
              value={lastName}
              onChangeText={setLastName}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Ionicons name="call-outline" size={24} color={colors.primary} style={styles.icon} />
          <View style={styles.inputs}>
            <TextInput
              style={styles.input}
              placeholder="Téléphone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <Text style={styles.infoText}>
          Le contact sera enregistré dans votre répertoire Google/Android et synchronisé avec Meet Me.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary, flex: 1, marginLeft: 20 },
  saveButtonText: { color: colors.primary, fontWeight: 'bold', fontSize: 14 },
  form: { padding: 20 },
  inputGroup: { flexDirection: 'row', marginBottom: 30, alignItems: 'flex-start' },
  icon: { marginRight: 20, marginTop: 10 },
  inputs: { flex: 1 },
  input: {
    fontSize: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    color: '#000',
  },
  borderTop: { marginTop: 10 },
  infoText: { color: '#667781', fontSize: 13, textAlign: 'center', marginTop: 20, paddingHorizontal: 30 },
  closeButton: { padding: 5 },
  saveButton: { padding: 5 }
});
