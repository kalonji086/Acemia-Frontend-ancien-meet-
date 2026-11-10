import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
  SectionList,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import { SOCKET_URL } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AddParticipantsToGroupScreen({ navigation, route }: any) {
  const { chatId, existingParticipants = [] } = route.params;
  const { colors, isDark, normalize } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const styles = createStyles(normalize, width);

  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const searchRequestId = useRef(0);

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;
    const baseUrl = SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${path}`;
  };

  const fetchContacts = async (query = '') => {
    const requestId = ++searchRequestId.current;
    setLoading(true);
    setSearchError('');
    try {
      const response = await apiService.searchUsers(query, 50, true); // true = onlyContacts
      if (requestId !== searchRequestId.current) return;
      if (response.success) {
        // Filtrer les contacts déjà présents dans le groupe
        const filtered = response.data.filter((c: any) => !existingParticipants.includes(c.id));
        setContacts(filtered);
      } else {
        setContacts([]);
        setSearchError(response.error || 'Impossible de charger les contacts.');
      }
    } catch (error) {
      if (requestId === searchRequestId.current) {
        console.error(error);
        setContacts([]);
        setSearchError('Impossible de charger les contacts.');
      }
    } finally {
      if (requestId === searchRequestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    searchRequestId.current += 1;
    setLoading(true);
    setContacts([]);
    setSearchError('');
    const timer = setTimeout(() => {
      fetchContacts(searchQuery);
    }, 300);
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
    const groups: { [key: string]: any[] } = {};
    contacts.forEach(contact => {
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
  }, [contacts]);

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
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              {searchError || (searchQuery.trim() ? 'Aucun contact correspondant.' : 'Aucun contact disponible à ajouter.')}
            </Text>
          }
        />
      )}

      {selectedParticipants.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, bottom: Math.max(normalize(20), insets.bottom + normalize(12)) }]}
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

const createStyles = (normalize: (size: number) => number, width: number) => StyleSheet.create({
  container: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' as const },
  header: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: normalize(15), paddingVertical: normalize(12), minHeight: normalize(65) },
  backButton: { padding: normalize(5) },
  headerTitleContainer: { flex: 1, marginLeft: normalize(20) },
  headerTitle: { fontSize: normalize(18), fontWeight: 'bold' as const, color: '#fff' },
  headerSubtitle: { fontSize: normalize(13), color: '#fff', opacity: 0.9 },
  searchBox: { paddingHorizontal: normalize(width < 360 ? 12 : 20), paddingVertical: normalize(10), borderBottomWidth: 1 },
  searchInput: { fontSize: normalize(16), minHeight: normalize(40) },
  selectedListContainer: { paddingVertical: normalize(12), borderBottomWidth: 1 },
  selectedItem: { width: normalize(70), alignItems: 'center' as const, marginRight: normalize(10) },
  selectedAvatarWrapper: { position: 'relative' as const },
  selectedAvatar: { width: normalize(50), height: normalize(50), borderRadius: normalize(25) },
  removeChip: { position: 'absolute' as const, bottom: 0, right: 0, backgroundColor: '#666', width: normalize(20), height: normalize(20), borderRadius: normalize(10), justifyContent: 'center' as const, alignItems: 'center' as const, borderWidth: 2, borderColor: '#fff' },
  selectedName: { fontSize: normalize(11), marginTop: normalize(5), textAlign: 'center' as const },
  loadingContainer: { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const },
  listContent: { paddingBottom: normalize(100) },
  sectionHeader: { paddingHorizontal: normalize(20), paddingVertical: normalize(5) },
  sectionTitle: { fontSize: normalize(13), fontWeight: 'bold' as const },
  userItem: { flexDirection: 'row' as const, paddingHorizontal: normalize(width < 360 ? 12 : 20), paddingVertical: normalize(12), alignItems: 'center' as const },
  avatarContainer: { position: 'relative' as const },
  avatar: { width: normalize(50), height: normalize(50), borderRadius: normalize(25) },
  checkIcon: { position: 'absolute' as const, bottom: 0, right: 0, width: normalize(20), height: normalize(20), borderRadius: normalize(10), justifyContent: 'center' as const, alignItems: 'center' as const, borderWidth: 2, borderColor: '#fff' },
  userInfo: { flex: 1, marginLeft: normalize(15), borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)', paddingBottom: normalize(10) },
  userName: { fontSize: normalize(16), fontWeight: '600' as const },
  userStatus: { fontSize: normalize(14), marginTop: normalize(2) },
  emptyText: { padding: normalize(28), textAlign: 'center' as const, fontSize: normalize(14) },
  fab: { position: 'absolute' as const, bottom: normalize(25), right: normalize(20), width: normalize(60), height: normalize(60), borderRadius: normalize(30), justifyContent: 'center' as const, alignItems: 'center' as const, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
});