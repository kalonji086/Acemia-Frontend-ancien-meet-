import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
  ImageBackground,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import apiService from '../services/api.service';
import { SOCKET_URL } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

export default function GroupInfoScreen({ route }: any) {
  const { chatId } = route.params;
  const navigation = useNavigation<any>();
  const { colors: themeColors, isDark, normalize, fontSizeFactor } = useTheme();
  const { t } = useLanguage();

  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const styles = createStyles(themeColors, normalize, fontSizeFactor, isDark);

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;

    const baseUrl = SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL;
    const path = url.startsWith('/') ? url : `/${url}`;

    return `${baseUrl}${path}`;
  };

  useEffect(() => {
    fetchDetails();
  }, [chatId]);

  const fetchDetails = async () => {
    try {
      const user = await apiService.getCurrentUser();
      setCurrentUser(user);
      const res = await apiService.getChat(chatId);
      if (res.success) {
        setGroup(res.data);
        setNewName(res.data.name);
        setNewDesc(res.data.description || '');
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const isAdmin = group?.my_role === 'admin';

  const handleUpdateInfo = async () => {
    if (!newName.trim()) return;
    try {
      const res = await apiService.updateChat(chatId, { name: newName, description: newDesc });
      if (res.success) {
        setGroup({ ...group, name: newName, description: newDesc });
        setEditing(false);
      }
    } catch (e) { Alert.alert('Erreur', 'Impossible de mettre à jour'); }
  };

  const handlePickImage = async () => {
    if (!isAdmin) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      try {
        const uploadRes = await apiService.uploadFile({ uri: result.assets[0].uri, type: 'image/jpeg', name: 'group.jpg' }, 'image');
        if (uploadRes.success) {
          await apiService.updateChat(chatId, { avatarUrl: uploadRes.data.fileUrl });
          setGroup({ ...group, avatar_url: uploadRes.data.fileUrl });
        }
      } catch (e) { Alert.alert('Erreur', 'Échec de l\'upload'); }
    }
  };

  const handleMemberAction = (member: any) => {
    if (!isAdmin || member.id === currentUser?.id) return;

    Alert.alert(
      member.full_name,
      "Gérer le membre",
      [
        {
          text: member.role === 'admin' ? "Retirer des admins" : "Nommer admin",
          onPress: async () => {
            const newRole = member.role === 'admin' ? 'member' : 'admin';
            await apiService.changeMemberRole(chatId, member.id, newRole);
            fetchDetails();
          }
        },
        {
          text: "Retirer du groupe",
          style: "destructive",
          onPress: async () => {
            await apiService.removeGroupMember(chatId, member.id);
            fetchDetails();
          }
        },
        { text: "Annuler", style: "cancel" }
      ]
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      "Quitter le groupe",
      "Voulez-vous vraiment quitter ce groupe ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Quitter",
          style: "destructive",
          onPress: async () => {
            const res = await apiService.removeGroupMember(chatId, currentUser.id);
            if (res.success) navigation.navigate('ChatList');
          }
        }
      ]
    );
  };

  if (loading || !group) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={themeColors.primary} />
      </View>
    );
  }

  const insets = useSafeAreaInsets();

  const handleAddMember = () => {
    if (!isAdmin) return;
    navigation.navigate('AddParticipantsToGroup', {
      chatId,
      existingParticipants: group.participants.map((p: any) => p.id)
    });
  };

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <ImageBackground
          source={{ uri: getFullUrl(group.avatar_url) || `https://ui-avatars.com/api/?name=${group.name}&size=512` }}
          style={styles.headerBg}
        >
          <View style={[styles.headerTop, { paddingTop: insets.top }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            {isAdmin && (
              <TouchableOpacity onPress={() => setEditing(!editing)} style={styles.iconBtn} activeOpacity={0.7}>
                <Ionicons name={editing ? "checkmark" : "pencil"} size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={handlePickImage} disabled={!isAdmin} style={styles.imageOverlay}>
            {isAdmin && <Ionicons name="camera" size={30} color="rgba(255,255,255,0.7)" />}
          </TouchableOpacity>
        </ImageBackground>
      </View>

      <View style={[styles.infoSection, { backgroundColor: themeColors.surface }]}>
        {editing ? (
          <View style={styles.editForm}>
            <TextInput
              style={[styles.input, { color: themeColors.text.primary, borderBottomColor: themeColors.primary }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nom du groupe"
              placeholderTextColor={themeColors.text.disabled}
            />
            <TextInput
              style={[styles.input, { color: themeColors.text.primary, borderBottomColor: themeColors.primary }]}
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Description du groupe"
              placeholderTextColor={themeColors.text.disabled}
              multiline
            />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: themeColors.primary }]} onPress={handleUpdateInfo}>
              <Text style={styles.saveBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.groupName, { color: themeColors.text.primary }]}>{group.name}</Text>
            <Text style={[styles.groupMeta, { color: themeColors.text.secondary }]}>Groupe · {group.participants.length} participants</Text>
            {group.description && (
              <Text style={[styles.description, { color: themeColors.text.primary }]}>{group.description}</Text>
            )}
          </>
        )}
      </View>

      <View style={[styles.sectionHeaderContainer, { backgroundColor: themeColors.surface }]}>
        <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>{group.participants.length} participants</Text>
        {isAdmin && (
          <TouchableOpacity onPress={handleAddMember} style={styles.addMemberBtn}>
            <Ionicons name="person-add" size={20} color={themeColors.primary} />
            <Text style={[styles.addMemberText, { color: themeColors.primary }]}>Ajouter</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderFooter = () => (
    <TouchableOpacity style={[styles.leaveBtn, { backgroundColor: themeColors.surface }]} onPress={handleLeaveGroup}>
      <Ionicons name="log-out-outline" size={24} color={themeColors.danger} />
      <Text style={[styles.leaveText, { color: themeColors.danger }]}>Quitter le groupe</Text>
    </TouchableOpacity>
  );

  const renderMember = ({ item: member }: any) => (
    <TouchableOpacity
      style={[styles.memberItem, { backgroundColor: themeColors.surface }]}
      onPress={() => handleMemberAction(member)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: getFullUrl(member.avatar_url) || `https://ui-avatars.com/api/?name=${member.full_name}` }} style={styles.memberAvatar} />
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: themeColors.text.primary }]}>
          {member.id === currentUser?.id ? "Vous" : member.full_name}
        </Text>
        <Text style={[styles.memberStatus, { color: themeColors.text.secondary }]} numberOfLines={1}>{member.status || 'Disponible'}</Text>
      </View>
      {member.role === 'admin' && (
        <View style={[styles.adminBadge, { borderColor: themeColors.primary }]}><Text style={[styles.adminText, { color: themeColors.primary }]}>Admin</Text></View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <FlatList
        data={group.participants}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const createStyles = (colors: any, normalize: any, factor: number, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { height: normalize(280) },
  headerBg: { width: '100%', height: '100%', justifyContent: 'space-between' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, paddingTop: 20 },
  iconBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 25 },
  imageOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
  infoSection: { padding: 20, marginBottom: 10, elevation: 1 },
  groupName: { fontSize: normalize(24, factor), fontWeight: 'bold' },
  groupMeta: { fontSize: normalize(14, factor), marginTop: 5 },
  description: { fontSize: normalize(16, factor), marginTop: 15, lineHeight: 22 },
  editForm: { width: '100%' },
  input: { borderBottomWidth: 1, paddingVertical: 10, fontSize: normalize(16, factor), marginBottom: 15 },
  saveBtn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  sectionHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20 },
  sectionTitle: { fontSize: normalize(14, factor), fontWeight: 'bold', textTransform: 'uppercase' },
  addMemberBtn: { flexDirection: 'row', alignItems: 'center' },
  addMemberText: { marginLeft: 8, fontWeight: 'bold', fontSize: normalize(14, factor) },
  memberItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20 },
  memberAvatar: { width: normalize(45), height: normalize(45), borderRadius: normalize(22.5), marginRight: 15 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: normalize(16, factor), fontWeight: '600' },
  memberStatus: { fontSize: normalize(13, factor), marginTop: 2 },
  adminBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  adminText: { fontSize: normalize(10, factor), fontWeight: 'bold' },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', padding: 20, marginTop: 10, elevation: 1, marginBottom: 40 },
  leaveText: { fontSize: normalize(16, factor), fontWeight: 'bold', marginLeft: 15 }
});
