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
import { colors, normalize } from '../styles/theme';
import apiService from '../services/api.service';
import { SOCKET_URL } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function CreateGroupScreen({ navigation }: any) {
  const { colors: themeColors, isDark } = useTheme();
  const { t } = useLanguage();

  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${SOCKET_URL}${url}`;
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await apiService.searchUsers('');
      if (response.success) {
        setContacts(response.data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleParticipant = (user: any) => {
    const isSelected = selectedParticipants.some(p => p.id === user.id);
    if (isSelected) {
      setSelectedParticipants(selectedParticipants.filter(p => p.id !== user.id));
    } else {
      setSelectedParticipants([...selectedParticipants, user]);
    }
  };

  const handleNext = () => {
    if (selectedParticipants.length === 0) {
      Alert.alert('Info', 'Veuillez sélectionner au moins un participant');
      return;
    }
    navigation.navigate('GroupDetails', { participants: selectedParticipants });
  };

  const renderParticipant = ({ item }: any) => {
    const isSelected = selectedParticipants.some(p => p.id === item.id);
    return (
      <TouchableOpacity style={styles.userItem} onPress={() => toggleParticipant(item)}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: getFullUrl(item.avatar_url) || `https://ui-avatars.com/api/?name=${item.full_name}&background=random` }}
            style={styles.avatar}
          />
          {isSelected && (
            <View style={styles.checkIcon}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: themeColors.text.primary }]}>{item.full_name}</Text>
          <Text style={[styles.userStatus, { color: themeColors.text.secondary }]}>{item.status || 'Disponible'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />

      <View style={[styles.header, { backgroundColor: themeColors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Nouveau groupe</Text>
          <Text style={styles.headerSubtitle}>{selectedParticipants.length} participants sélectionnés</Text>
        </View>
        {selectedParticipants.length > 0 && (
          <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.searchContainer, { backgroundColor: isDark ? '#333' : '#F0F2F5' }]}>
        <TextInput
          style={[styles.searchInput, { color: themeColors.text.primary }]}
          placeholder="Rechercher un contact..."
          placeholderTextColor={themeColors.text.disabled}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {selectedParticipants.length > 0 && (
        <View style={styles.selectedList}>
          <FlatList
            horizontal
            data={selectedParticipants}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.selectedItem} onPress={() => toggleParticipant(item)}>
                <View style={styles.selectedAvatarContainer}>
                  <Image source={{ uri: getFullUrl(item.avatar_url) || `https://ui-avatars.com/api/?name=${item.full_name}` }} style={styles.selectedAvatar} />
                  <View style={styles.removeIcon}><Ionicons name="close" size={12} color="#fff" /></View>
                </View>
                <Text style={[styles.selectedName, { color: themeColors.text.primary }]} numberOfLines={1}>{item.full_name.split(' ')[0]}</Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {loading ? <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} /> : (
        <FlatList
          data={contacts.filter(c => c.full_name.toLowerCase().includes(searchQuery.toLowerCase()))}
          renderItem={renderParticipant}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  backButton: { padding: 5 },
  headerTitleContainer: { flex: 1, marginLeft: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: '#fff', opacity: 0.8 },
  nextButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  searchContainer: { margin: 10, paddingHorizontal: 15, borderRadius: 10, height: 40, justifyContent: 'center' },
  searchInput: { fontSize: 16 },
  list: { paddingBottom: 20 },
  userItem: { flexDirection: 'row', padding: 15, alignItems: 'center' },
  avatarContainer: { position: 'relative', marginRight: 15 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  checkIcon: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#fff', borderRadius: 10 },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600' },
  userStatus: { fontSize: 14, marginTop: 2 },
  selectedList: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  selectedItem: { width: 70, alignItems: 'center', marginRight: 10 },
  selectedAvatarContainer: { position: 'relative' },
  selectedAvatar: { width: 45, height: 45, borderRadius: 22.5 },
  removeIcon: { position: 'absolute', top: 0, right: 0, backgroundColor: '#999', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  selectedName: { fontSize: 12, marginTop: 5, textAlign: 'center' }
});
