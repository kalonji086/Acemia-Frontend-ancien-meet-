import React, { useState, useEffect, useMemo } from 'react';
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
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import { SOCKET_URL } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AddParticipantsToGroupScreen({ navigation, route }: any) {
  const { chatId, existingParticipants = [] } = route.params;
  const { colors, isDark, normalize } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;
    const baseUrl = SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${path}`;
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async (query = '') => {
    try {
      const response = await apiService.searchUsers(query, 50, true); // true = onlyContacts
      if (response.success) {
        // Filtrer les contacts déjà présents dans le groupe
        const filtered = response.data.filter((c: any) => !existingParticipants.includes(c.id));
        setContacts(filtered);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleParticipant = (user: any) => {
    const isSelected = selectedParticipants.some(p => p.id === user.id);
    if (isSelected) {
      setSelectedParticipants(selectedParticipants.filter(p => p.id !== user.id));
    } else {
      setSelectedParticipants([...selectedParticipants, user]);
    }
  };

  const handleAdd = async () => {
    if (selectedParticipants.length === 0) return;

    setSaving(true);
    try {
      const userIds = selectedParticipants.map(p => p.id);
      const res = await apiService.addGroupMembers(chatId, userIds);

      if (res.success) {
        Alert.alert('Succès', 'Membres ajoutés au groupe');
        navigation.goBack();
      } else {
        throw new Error(res.error || 'Erreur inconnue');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible d\'ajouter les membres');
    } finally {
      setSaving(false);
    }
  };

  const memoizedSections = useMemo(() => {
    const filtered = contacts.filter(c =>
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: { [key: string]: any[] } = {};
    filtered.forEach(contact => {
      const firstLetter = contact.full_name.charAt(0).toUpperCase();
      if (!groups[firstLetter]) groups[firstLetter] = [];
      groups[firstLetter].push(contact);
    });

    return Object.keys(groups)
      .sort()
      .map(letter => ({
        title: letter,
        data: groups[letter].sort((a, b) => a.full_name.localeCompare(b.full_name))
      }));
  }, [contacts, searchQuery]);

  const renderContact = ({ item }: any) => {
    const isSelected = selectedParticipants.some(p => p.id === item.id);
    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => toggleParticipant(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: getFullUrl(item.avatar_url) || `https://ui-avatars.com/api/?name=${item.full_name}&background=random` }}
            style={styles.avatar}
          />
          {isSelected && (
            <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text.primary }]}>{item.full_name}</Text>
          <Text style={[styles.userStatus, { color: colors.text.secondary }]} numberOfLines={1}>
            {item.status || 'Disponible'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ height: insets.top, backgroundColor: colors.primary }} />
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Ajouter des membres</Text>
          <Text style={styles.headerSubtitle}>
            {selectedParticipants.length > 0
              ? `${selectedParticipants.length} sélectionnés`
              : 'Choisissez des membres'}
          </Text>
        </View>
      </View>

      <View style={[styles.searchBox, { borderBottomColor: colors.divider }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.text.primary }]}
          placeholder="Rechercher un contact..."
          placeholderTextColor={colors.text.disabled}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {selectedParticipants.length > 0 && (
        <View style={[styles.selectedListContainer, { borderBottomColor: colors.divider }]}>
          <FlatList
            horizontal
            data={selectedParticipants}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.selectedItem} onPress={() => toggleParticipant(item)}>
                <View style={styles.selectedAvatarWrapper}>
                  <Image
                    source={{ uri: getFullUrl(item.avatar_url) || `https://ui-avatars.com/api/?name=${item.full_name}` }}
                    style={styles.selectedAvatar}
                  />
                  <View style={styles.removeChip}>
                    <Ionicons name="close" size={12} color="#fff" />
                  </View>
                </View>
                <Text style={[styles.selectedName, { color: colors.text.primary }]} numberOfLines={1}>
                  {item.full_name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 15 }}
          />
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={memoizedSections}
          keyExtractor={(item) => item.id}
          renderItem={renderContact}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
              <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{title}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={true}
        />
      )}

      {selectedParticipants.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={handleAdd}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark" size={28} color="#fff" />}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, height: 65 },
  backButton: { padding: 5 },
  headerTitleContainer: { flex: 1, marginLeft: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#fff', opacity: 0.9 },
  searchBox: { paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1 },
  searchInput: { fontSize: 16, height: 40 },
  selectedListContainer: { paddingVertical: 12, borderBottomWidth: 1 },
  selectedItem: { width: 70, alignItems: 'center', marginRight: 10 },
  selectedAvatarWrapper: { position: 'relative' },
  selectedAvatar: { width: 50, height: 50, borderRadius: 25 },
  removeChip: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#666', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  selectedName: { fontSize: 11, marginTop: 5, textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 100 },
  sectionHeader: { paddingHorizontal: 20, paddingVertical: 5 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold' },
  userItem: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  checkIcon: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  userInfo: { flex: 1, marginLeft: 15, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)', paddingBottom: 10 },
  userName: { fontSize: 16, fontWeight: '600' },
  userStatus: { fontSize: 14, marginTop: 2 },
  fab: { position: 'absolute', bottom: 30, right: 25, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
});