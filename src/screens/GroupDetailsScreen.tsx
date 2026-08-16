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
  Switch,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { SOCKET_URL } from '../utils/constants';

export default function GroupDetailsScreen({ navigation, route }: any) {
  const { participants } = route.params;
  const { colors, isDark, normalize } = useTheme();

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Paramètres avancés (Style WhatsApp)
  const [disappearingMessages, setDisappearingMessages] = useState(false);
  const [onlyAdminsCanEdit, setOnlyAdminsCanEdit] = useState(false);

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

      // On peut passer les paramètres avancés dans la description ou des métadonnées si le backend le supporte
      // Pour l'instant on reste sur les champs standard
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="timer-outline" size={22} color={colors.text.secondary} />
              <Text style={[styles.settingText, { color: colors.text.primary }]}>Messages éphémères</Text>
            </View>
            <Switch
              value={disappearingMessages}
              onValueChange={setDisappearingMessages}
              trackColor={{ false: colors.divider, true: colors.primaryLight }}
              thumbColor={disappearingMessages ? colors.primary : '#f4f3f4'}
            />
          </View>

          <View style={[styles.settingRow, { borderTopWidth: 0.5, borderTopColor: colors.divider }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="settings-outline" size={22} color={colors.text.secondary} />
              <Text style={[styles.settingText, { color: colors.text.primary }]}>Seuls les admins modifient l'info</Text>
            </View>
            <Switch
              value={onlyAdminsCanEdit}
              onValueChange={setOnlyAdminsCanEdit}
              trackColor={{ false: colors.divider, true: colors.primaryLight }}
              thumbColor={onlyAdminsCanEdit ? colors.primary : '#f4f3f4'}
            />
          </View>
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
        style={[styles.fab, { backgroundColor: colors.primary }, (loading || !groupName.trim()) && { opacity: 0.6 }]}
        onPress={handleCreateGroup}
        disabled={loading || !groupName.trim()}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark" size={32} color="#fff" />}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, height: 65 },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#fff', opacity: 0.9 },
  scrollContent: { paddingBottom: 100 },
  imageSection: { padding: 25, alignItems: 'center', marginBottom: 10 },
  imagePicker: { position: 'relative', marginBottom: 25 },
  groupAvatar: { width: 140, height: 140, borderRadius: 70 },
  placeholderAvatar: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center' },
  editIcon: { position: 'absolute', bottom: 5, right: 5, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  inputWrapper: { width: '100%', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#008069' },
  input: { flex: 1, fontSize: 18, paddingVertical: 10 },
  inputExtras: { flexDirection: 'row', alignItems: 'center' },
  charCount: { marginLeft: 10, color: '#999', fontSize: 12 },
  section: { padding: 20, marginBottom: 10 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  descriptionInput: { fontSize: 16, minHeight: 60, textAlignVertical: 'top' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  settingInfo: { flexDirection: 'row', alignItems: 'center' },
  settingText: { marginLeft: 15, fontSize: 15 },
  participantItem: { alignItems: 'center', marginRight: 15, width: 60 },
  participantAvatar: { width: 45, height: 45, borderRadius: 22.5 },
  participantName: { fontSize: 11, marginTop: 5, textAlign: 'center' },
  fab: { position: 'absolute', bottom: 30, right: 25, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 5 }
});
