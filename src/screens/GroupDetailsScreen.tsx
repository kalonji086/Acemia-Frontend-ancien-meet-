import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { SOCKET_URL } from '../utils/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GroupDetailsScreen({ navigation, route }: any) {
  const { participants } = route.params;
  const { colors, isDark, normalize } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = createStyles(normalize, width);

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http')) return url;
    return `${SOCKET_URL}${url}`;
  };

  const handlePickImage = async () => {
    Alert.alert(
      "Photo du groupe",
      "Choisir une source",
      [
        { text: "Appareil photo", onPress: () => takePhoto() },
        { text: "Galerie", onPress: () => pickImage() },
        groupImage ? { text: "Supprimer la photo", onPress: () => { setGroupImage(null); setUploadedImageUrl(null); }, style: 'destructive' } : null,
        { text: "Annuler", style: "cancel" }
      ].filter(Boolean) as any
    );
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) processImage(result.assets[0].uri);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) processImage(result.assets[0].uri);
  };

  const processImage = async (uri: string) => {
    setGroupImage(uri);
    setLoading(true);
    try {
      const res = await apiService.uploadFile({ uri, type: 'image/jpeg', name: 'group.jpg' }, 'image');
      if (res.success) setUploadedImageUrl(res.data.fileUrl);
    } catch (e) {
      Alert.alert('Erreur', 'Échec de l\'upload de l\'image');
    } finally { setLoading(false); }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Erreur', 'Veuillez donner un nom au groupe');
      return;
    }
    setLoading(true);
    try {
      const participantIds = participants.map((p: any) => p.id);

      const res = await apiService.createChat(
        participantIds,
        'group',
        groupName,
        uploadedImageUrl || undefined,
        description
      );

      if (res.success) {
        Alert.alert('Succès', 'Groupe créé avec succès');
        // Utiliser replace pour une transition plus fluide vers le chat
        navigation.replace('Chat', {
          chatId: res.data.id,
          name: groupName,
          avatar: uploadedImageUrl,
          type: 'group'
        });
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de créer le groupe');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ marginLeft: 20 }}>
          <Text style={styles.headerTitle}>Nouveau groupe</Text>
          <Text style={styles.headerSubtitle}>Ajouter un sujet</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.imageSection, { backgroundColor: colors.surface }]}>
          <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
            {groupImage ? (
              <Image source={{ uri: groupImage }} style={styles.groupAvatar} />
            ) : (
              <View style={[styles.placeholderAvatar, { backgroundColor: isDark ? '#333' : '#DFE5E7' }]}>
                <Ionicons name="camera" size={45} color={isDark ? '#666' : '#919191'} />
              </View>
            )}
            <View style={[styles.editIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={18} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { color: colors.text.primary, borderBottomColor: colors.primary }]}
              placeholder="Sujet du groupe..."
              placeholderTextColor={colors.text.disabled}
              value={groupName}
              onChangeText={setGroupName}
              maxLength={25}
            />
            <View style={styles.inputExtras}>
              <Ionicons name="happy-outline" size={24} color={colors.text.secondary} />
              <Text style={styles.charCount}>{25 - groupName.length}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>DESCRIPTION</Text>
          <TextInput
            style={[styles.descriptionInput, { color: colors.text.primary }]}
            placeholder="Ajouter une description au groupe"
            placeholderTextColor={colors.text.disabled}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, paddingBottom: 15 }]}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>PARTICIPANTS : {participants.length}</Text>
          <FlatList
            horizontal
            data={participants}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.participantItem}>
                <Image
                  source={{ uri: getFullUrl(item.avatar_url) || `https://ui-avatars.com/api/?name=${item.full_name}` }}
                  style={styles.participantAvatar}
                />
                <Text style={[styles.participantName, { color: colors.text.secondary }]} numberOfLines={1}>
                  {item.full_name.split(' ')[0]}
                </Text>
              </View>
            )}
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 10 }}
          />
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: Math.max(normalize(20), insets.bottom + normalize(12)) }, (loading || !groupName.trim()) && { opacity: 0.6 }]}
        onPress={handleCreateGroup}
        disabled={loading || !groupName.trim()}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark" size={32} color="#fff" />}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const createStyles = (normalize: (size: number) => number, width: number) => StyleSheet.create({
  container: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' as const },
  header: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: normalize(15), paddingVertical: normalize(12), minHeight: normalize(65) },
  backButton: { padding: normalize(5) },
  headerTitle: { fontSize: normalize(18), fontWeight: 'bold' as const, color: '#fff' },
  headerSubtitle: { fontSize: normalize(13), color: '#fff', opacity: 0.9 },
  scrollContent: { paddingBottom: normalize(100) },
  imageSection: { padding: normalize(width < 360 ? 16 : 25), alignItems: 'center' as const, marginBottom: normalize(10) },
  imagePicker: { position: 'relative' as const, marginBottom: normalize(25) },
  groupAvatar: { width: normalize(width < 360 ? 112 : 140), height: normalize(width < 360 ? 112 : 140), borderRadius: normalize(width < 360 ? 56 : 70) },
  placeholderAvatar: { width: normalize(width < 360 ? 112 : 140), height: normalize(width < 360 ? 112 : 140), borderRadius: normalize(width < 360 ? 56 : 70), justifyContent: 'center' as const, alignItems: 'center' as const },
  editIcon: { position: 'absolute' as const, bottom: normalize(5), right: normalize(5), width: normalize(36), height: normalize(36), borderRadius: normalize(18), justifyContent: 'center' as const, alignItems: 'center' as const, borderWidth: 3, borderColor: '#fff' },
  inputWrapper: { width: '100%', flexDirection: 'row' as const, alignItems: 'center' as const, borderBottomWidth: 2, borderBottomColor: '#008069' },
  input: { flex: 1, minWidth: 0, fontSize: normalize(width < 360 ? 16 : 18), paddingVertical: normalize(10) },
  inputExtras: { flexDirection: 'row' as const, alignItems: 'center' as const },
  charCount: { marginLeft: normalize(10), color: '#999', fontSize: normalize(12) },
  section: { padding: normalize(width < 360 ? 14 : 20), marginBottom: normalize(10) },
  sectionLabel: { fontSize: normalize(12), fontWeight: 'bold' as const, marginBottom: normalize(10) },
  descriptionInput: { fontSize: normalize(16), minHeight: normalize(60), textAlignVertical: 'top' as const },
  participantItem: { alignItems: 'center' as const, marginRight: normalize(15), width: normalize(60) },
  participantAvatar: { width: normalize(45), height: normalize(45), borderRadius: normalize(22.5) },
  participantName: { fontSize: normalize(11), marginTop: normalize(5), textAlign: 'center' as const },
  fab: { position: 'absolute' as const, bottom: normalize(30), right: normalize(25), width: normalize(64), height: normalize(64), borderRadius: normalize(32), justifyContent: 'center' as const, alignItems: 'center' as const, elevation: 5 }
});
