import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import { SOCKET_URL } from '../utils/constants';
import * as Contacts from 'expo-contacts';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function ContactsScreen({ navigation }: any) {
  const { colors: themeColors, normalize, isDark } = useTheme();
  const { t } = useLanguage();

  const [meetMeContacts, setMeetMeContacts] = useState<any[]>([]);
  const [phoneContacts, setPhoneContacts] = useState<any[]>([]);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${SOCKET_URL}${url}`;
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        const response = await apiService.searchUsers('');
        if (response.success) setMeetMeContacts(response.data);
        setLoading(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Image],
      });

      if (data.length > 0) {
        const allPhoneNumbers: string[] = [];
        const formattedPhoneContacts: any[] = [];

        data.forEach(contact => {
          if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
            const phoneNumber = contact.phoneNumbers[0].number?.replace(/[^0-9+]/g, '');
            if (phoneNumber) {
              allPhoneNumbers.push(phoneNumber);
              formattedPhoneContacts.push({
                id: contact.id,
                name: contact.name,
                phoneNumber: phoneNumber,
                image: contact.imageAvailable ? contact.image?.uri : null
              });
            }
          }
        });

        const response = await apiService.syncContacts(allPhoneNumbers);
        if (response.success) {
          const registeredUsers = response.data;
          const registeredPhones = new Set(registeredUsers.map((u: any) => u.phone_number));
          setMeetMeContacts(registeredUsers);
          const notOnMeetMe = formattedPhoneContacts.filter(c => !registeredPhones.has(c.phoneNumber));
          setPhoneContacts(notOnMeetMe.sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 2) {
      setSearching(true);
      try {
        const response = await apiService.searchUsers(text);
        if (response.success) {
          const existingIds = new Set(meetMeContacts.map(c => c.id));
          const results = response.data.filter((u: any) => !existingIds.has(u.id));
          setGlobalSearchResults(results);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    } else {
      setGlobalSearchResults([]);
    }
  };

  const startChat = async (user: any) => {
    try {
      const response = await apiService.createChat([user.id]);
      if (response.success) {
        navigation.navigate('Chat', {
          chatId: response.data.id,
          name: user.full_name,
          avatar: getFullUrl(user.avatar_url),
          otherUserId: user.id
        });
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const styles = createStyles(themeColors, normalize, isDark);

  const renderMeetMeItem = ({ item }: any) => (
    <TouchableOpacity style={styles.userItem} onPress={() => startChat(item)}>
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: getFullUrl(item.avatar_url) || `https://ui-avatars.com/api/?name=${item.full_name}&background=random` }}
          style={styles.avatar}
        />
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: themeColors.text.primary }]}>{item.full_name}</Text>
        <Text style={[styles.userStatus, { color: themeColors.text.secondary }]}>{item.status || 'Disponible'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />

      <View style={[styles.header, { backgroundColor: themeColors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Nouvelle discussion</Text>
          <Text style={styles.headerSubtitle}>Recherchez par nom ou email</Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: isDark ? '#333' : '#F0F2F5' }]}>
        <Ionicons name="search" size={20} color={themeColors.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: themeColors.text.primary }]}
          placeholder="Rechercher sur Meet Me..."
          placeholderTextColor={themeColors.text.disabled}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searching && <ActivityIndicator size="small" color={themeColors.primary} />}
      </View>

      <FlatList
        data={[
          ...globalSearchResults.map(i => ({...i, section: 'global'})),
          ...meetMeContacts.map(i => ({...i, section: 'meetme'})),
          ...phoneContacts.map(i => ({...i, section: 'phone'}))
        ]}
        renderItem={({item}) => {
          if (item.section === 'phone') {
            return (
              <View style={styles.userItem}>
                <View style={styles.avatarContainer}>
                  <View style={[styles.avatar, styles.placeholderAvatar]}>
                    <Text style={styles.avatarInitial}>{item.name?.charAt(0)}</Text>
                  </View>
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: themeColors.text.primary }]}>{item.name}</Text>
                  <Text style={[styles.userStatus, { color: themeColors.text.secondary }]}>{item.phoneNumber}</Text>
                </View>
                <TouchableOpacity style={[styles.inviteButton, { borderColor: themeColors.secondary }]} onPress={() => {}}>
                  <Text style={[styles.inviteButtonText, { color: themeColors.secondary }]}>INVITER</Text>
                </TouchableOpacity>
              </View>
            );
          }
          return renderMeetMeItem({item});
        }}
        keyExtractor={(item, index) => item.id || index.toString()}
        ListHeaderComponent={
          <>
            <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('CreateGroup')}>
              <View style={[styles.actionIcon, { backgroundColor: themeColors.primary }]}>
                <Ionicons name="people" size={24} color="#fff" />
              </View>
              <Text style={[styles.actionText, { color: themeColors.text.primary }]}>Nouveau groupe</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('AddContact')}>
              <View style={[styles.actionIcon, { backgroundColor: themeColors.secondary }]}>
                <Ionicons name="person-add" size={24} color="#fff" />
              </View>
              <Text style={[styles.actionText, { color: themeColors.text.primary }]}>Ajouter aux contacts téléphone</Text>
            </TouchableOpacity>

            {globalSearchResults.length > 0 && <Text style={[styles.sectionTitle, { color: themeColors.text.secondary, backgroundColor: isDark ? '#222' : '#F8F9FA' }]}>Résultats de recherche globale</Text>}
            {meetMeContacts.length > 0 && globalSearchResults.length === 0 && <Text style={[styles.sectionTitle, { color: themeColors.text.secondary, backgroundColor: isDark ? '#222' : '#F8F9FA' }]}>Contacts utilisant Meet Me</Text>}
          </>
        }
        ListEmptyComponent={
          !loading && searchQuery.length > 0 && globalSearchResults.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>Aucun utilisateur trouvé sur Meet Me.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any, normalize: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10 },
  backButton: { padding: 5 },
  headerTitleContainer: { flex: 1, marginLeft: 15 },
  headerTitle: { fontSize: normalize(18), fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: normalize(12), color: '#fff', opacity: 0.8 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 10, paddingHorizontal: 15, borderRadius: 10, height: normalize(45) },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: normalize(16) },
  userItem: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 10, alignItems: 'center' },
  avatarContainer: { marginRight: 15 },
  avatar: { width: normalize(45), height: normalize(45), borderRadius: normalize(22.5) },
  placeholderAvatar: { backgroundColor: isDark ? '#444' : '#ddd', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#fff', fontWeight: 'bold', fontSize: normalize(18) },
  userInfo: { flex: 1, justifyContent: 'center' },
  userName: { fontSize: normalize(16), fontWeight: '600' },
  userStatus: { fontSize: normalize(14), marginTop: 2 },
  actionItem: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 12, alignItems: 'center' },
  actionIcon: { width: normalize(40), height: normalize(40), borderRadius: normalize(20), justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionText: { fontSize: normalize(16), fontWeight: '600' },
  sectionTitle: { fontSize: normalize(13), fontWeight: '600', paddingHorizontal: 15, paddingVertical: 15, textTransform: 'uppercase' },
  inviteButton: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  inviteButtonText: { fontWeight: 'bold', fontSize: normalize(12) },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: normalize(15), textAlign: 'center' }
});
