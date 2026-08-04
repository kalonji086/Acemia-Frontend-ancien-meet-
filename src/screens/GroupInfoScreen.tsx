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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, normalize } from '../styles/theme';
import apiService from '../services/api.service';
import { SOCKET_URL } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import * as ImagePicker from 'expo-image-picker';

export default function GroupInfoScreen({ navigation, route }: any) {
  const { chatId } = route.params;
  const { colors: themeColors, isDark } = useTheme();
  const { t } = useLanguage();

  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${SOCKET_URL}${url}`;
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
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ImageBackground
            source={{ uri: getFullUrl(group.avatar_url) || `https://ui-avatars.com/api/?name=${group.name}&size=512` }}
            style={styles.headerBg}
          >
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              {isAdmin && (
                <TouchableOpacity onPress={() => setEditing(!editing)} style={styles.iconBtn}>
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
                style={[styles.input, { color: themeColors.text.primary }]}
                value={newName}
                onChangeText={setNewName}
                placeholder="Nom du groupe"
              />
              <TextInput
                style={[styles.input, { color: themeColors.text.primary }]}
                value={newDesc}
                onChangeText={setNewDesc}
                placeholder="Description du groupe"
                multiline
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateInfo}>
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

        <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{group.participants.length} participants</Text>
            {isAdmin && (
              <TouchableOpacity onPress={() => Alert.alert("Ajouter", "Ouvrir sélection contacts...")}>
                <Ionicons name="person-add" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {group.participants.map((member: any) => (
            <TouchableOpacity
              key={member.id}
              style={styles.memberItem}
              onLongPress={() => handleMemberAction(member)}
            >
              <Image source={{ uri: getFullUrl(member.avatar_url) || `https://ui-avatars.com/api/?name=${member.full_name}` }} style={styles.memberAvatar} />
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: themeColors.text.primary }]}>
                  {member.id === currentUser?.id ? "Vous" : member.full_name}
                </Text>
                <Text style={[styles.memberStatus, { color: themeColors.text.secondary }]} numberOfLines={1}>{member.status || 'Disponible'}</Text>
              </View>
              {member.role === 'admin' && (
                <View style={styles.adminBadge}><Text style={styles.adminText}>Admin</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.leaveBtn, { backgroundColor: themeColors.surface }]} onPress={handleLeaveGroup}>
          <Ionicons name="log-out-outline" size={24} color={colors.danger} />
          <Text style={styles.leaveText}>Quitter le groupe</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { height: 300 },
  headerBg: { width: '100%', height: '100%', justifyContent: 'space-between' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, paddingTop: 20 },
  iconBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 25 },
  imageOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
  infoSection: { padding: 20, marginBottom: 10, elevation: 1 },
  groupName: { fontSize: 24, fontWeight: 'bold' },
  groupMeta: { fontSize: 14, marginTop: 5 },
  description: { fontSize: 16, marginTop: 15, lineHeight: 22 },
  editForm: { width: '100%' },
  input: { borderBottomWidth: 1, borderBottomColor: colors.primary, paddingVertical: 10, fontSize: 16, marginBottom: 15 },
  saveBtn: { backgroundColor: colors.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  section: { paddingHorizontal: 20, paddingBottom: 10, elevation: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: colors.primary, textTransform: 'uppercase' },
  memberItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  memberAvatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600' },
  memberStatus: { fontSize: 13, marginTop: 2 },
  adminBadge: { borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  adminText: { color: colors.primary, fontSize: 10, fontWeight: 'bold' },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', padding: 20, marginTop: 10, elevation: 1 },
  leaveText: { color: colors.danger, fontSize: 16, fontWeight: 'bold', marginLeft: 15 }
});
