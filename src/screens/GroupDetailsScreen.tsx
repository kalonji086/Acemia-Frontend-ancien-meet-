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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, normalize } from '../styles/theme';
import apiService from '../services/api.service';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';

export default function GroupDetailsScreen({ navigation, route }: any) {
  const { participants } = route.params;
  const { colors: themeColors, isDark } = useTheme();

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setGroupImage(result.assets[0].uri);
      setLoading(true);
      try {
        const res = await apiService.uploadFile({ uri: result.assets[0].uri, type: 'image/jpeg', name: 'group.jpg' }, 'image');
        if (res.success) setUploadedImageUrl(res.data.fileUrl);
      } finally { setLoading(false); }
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Erreur', 'Veuillez donner un nom au groupe');
      return;
    }
    setLoading(true);
    try {
      const participantIds = participants.map((p: any) => p.id);
      const res = await apiService.createChat(participantIds, 'group', groupName, uploadedImageUrl || undefined, description);
      if (res.success) {
        Alert.alert('Succès', 'Groupe créé avec succès');
        navigation.reset({ index: 0, routes: [{ name: 'ChatList' }] });
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de créer le groupe');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />

      <View style={[styles.header, { backgroundColor: themeColors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau groupe</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
          {groupImage ? (
            <Image source={{ uri: groupImage }} style={styles.groupAvatar} />
          ) : (
            <View style={[styles.placeholderAvatar, { backgroundColor: isDark ? '#333' : '#DFE5E7' }]}>
              <Ionicons name="camera" size={40} color={isDark ? '#666' : '#919191'} />
            </View>
          )}
          <View style={styles.editIcon}><Ionicons name="pencil" size={16} color="#fff" /></View>
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.input, { color: themeColors.text.primary, borderBottomColor: themeColors.primary }]}
            placeholder="Nom du groupe"
            placeholderTextColor={themeColors.text.disabled}
            value={groupName}
            onChangeText={setGroupName}
            maxLength={25}
          />
          <Text style={styles.charCount}>{groupName.length}/25</Text>
        </View>

        <View style={[styles.inputWrapper, { marginTop: 20 }]}>
          <TextInput
            style={[styles.input, { color: themeColors.text.primary, borderBottomColor: themeColors.primary }]}
            placeholder="Description (Optionnel)"
            placeholderTextColor={themeColors.text.disabled}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <Text style={[styles.participantCount, { color: themeColors.text.secondary }]}>
          Participants : {participants.length}
        </Text>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: themeColors.primary }, loading && { opacity: 0.7 }]}
        onPress={handleCreateGroup}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark" size={30} color="#fff" />}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 15 },
  content: { padding: 25, alignItems: 'center' },
  imagePicker: { position: 'relative', marginBottom: 30 },
  groupAvatar: { width: 120, height: 120, borderRadius: 60 },
  placeholderAvatar: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  editIcon: { position: 'absolute', bottom: 5, right: 5, backgroundColor: colors.primary, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  inputWrapper: { width: '100%', flexDirection: 'row', alignItems: 'flex-end' },
  input: { flex: 1, fontSize: 18, paddingVertical: 10, borderBottomWidth: 2 },
  charCount: { marginLeft: 10, color: '#999' },
  participantCount: { marginTop: 40, alignSelf: 'flex-start', fontSize: 16, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 5 }
});
