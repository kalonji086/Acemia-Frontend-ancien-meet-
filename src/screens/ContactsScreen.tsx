import React, { useState, useEffect, useRef } from 'react';
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
  Share,
} from 'react-native';
import {
  ArrowLeft, Search, Users, UserPlus
} from 'lucide-react-native';
import apiService from '../services/api.service';
import { SOCKET_URL } from '../utils/constants';
import * as Contacts from 'expo-contacts';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ContactsScreen({ navigation }: any) {
  const { colors: themeColors, normalize, isDark } = useTheme();
  const { t } = useLanguage();

  const [meetMeContacts, setMeetMeContacts] = useState<any[]>([]);
  const [phoneContacts, setPhoneContacts] = useState<any[]>([]);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRequestId = useRef(0);

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;

    const baseUrl = SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL;
    const path = url.startsWith('/') ? url : `/${url}`;

    return `${baseUrl}${path}`;
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
    const query = text.trim();
    const requestId = ++searchRequestId.current;
    if (query.length > 2) {
      setSearching(true);
      setGlobalSearchResults([]);
      setSearchError('');
      try {
        const response = await apiService.searchUsers(query);
        if (requestId === searchRequestId.current) {
          if (response.success) setGlobalSearchResults(response.data);
          else setSearchError(response.error || 'La recherche est momentanément indisponible.');
        }
      } catch (e) {
        if (requestId === searchRequestId.current) {
          console.error(e);
          setSearchError('La recherche est momentanément indisponible.');
        }
      } finally {
        if (requestId === searchRequestId.current) setSearching(false);
      }
    } else {
      setGlobalSearchResults([]);
      setSearchError('');
      setSearching(false);
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
          peerUserId: user.id
        });
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const onInvite = async (name: string) => {
    try {
      await Share.share({
        message: `Salut ${name}, rejoins-moi sur Acemia ! C'est une application de messagerie géniale. Télécharge-la ici : https://meet-me.app`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
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

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={{ height: insets.top, backgroundColor: themeColors.primary }} />
      <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />

      <View style={[styles.header, { backgroundColor: themeColors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Nouvelle discussion</Text>
          <Text style={styles.headerSubtitle}>Recherchez par nom, pseudo, tel ou email</Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: isDark ? '#333' : '#F0F2F5' }]}>
        <Search size={20} color={themeColors.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: themeColors.text.primary }]}
          placeholder="Pseudo, nom, tel, email..."
          placeholderTextColor={themeColors.text.disabled}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searching && <ActivityIndicator size="small" color={themeColors.primary} />}
      </View>

      <FlatList
        data={[
          ...(searchQuery.trim().length > 0
            ? globalSearchResults.map(i => ({ ...i, section: 'global' }))
            : [
                ...meetMeContacts.map(i => ({ ...i, section: 'meetme' })),
                ...phoneContacts.map(i => ({ ...i, section: 'phone' })),
              ])
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
                <TouchableOpacity style={[styles.inviteButton, { borderColor: themeColors.secondary }]} onPress={() => onInvite(item.name)}>
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
                <Users size={24} color="#fff" />
              </View>
              <Text style={[styles.actionText, { color: themeColors.text.primary }]}>Nouveau groupe</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('AddContact')}>
              <View style={[styles.actionIcon, { backgroundColor: themeColors.secondary }]}>
                <UserPlus size={24} color="#fff" />
              </View>
              <Text style={[styles.actionText, { color: themeColors.text.primary }]}>Ajouter aux contacts téléphone</Text>
            </TouchableOpacity>

            {searchQuery.trim().length > 0 && globalSearchResults.length > 0 && <Text style={[styles.sectionTitle, { color: themeColors.text.secondary, backgroundColor: isDark ? '#222' : '#F8F9FA' }]}>Résultats correspondants sur Acemia</Text>}
            {searchQuery.trim().length === 0 && meetMeContacts.length > 0 && <Text style={[styles.sectionTitle, { color: themeColors.text.secondary, backgroundColor: isDark ? '#222' : '#F8F9FA' }]}>Contacts utilisant Acemia</Text>}
          </>
        }
        ListEmptyComponent={
          !loading && !searching && searchQuery.trim().length > 0 && searchQuery.trim().length <= 2 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>Saisissez au moins 3 caractères pour rechercher un compte.</Text>
            </View>
          ) : !loading && !searching && searchQuery.trim().length > 2 && globalSearchResults.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>{searchError || `Aucun compte Acemia ne correspond à « ${searchQuery.trim()} ».`}</Text>
              {!searchError && <Text style={[styles.emptyText, { color: themeColors.text.secondary, marginTop: 8 }]}>Vérifiez le pseudo, le numéro ou l’adresse email et réessayez.</Text>}
            </View>
          ) : null
        }
      />
    </View>
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
