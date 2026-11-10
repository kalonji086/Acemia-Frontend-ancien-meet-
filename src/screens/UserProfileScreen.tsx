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
  ImageBackground,
} from 'react-native';
import {
  ArrowLeft, BadgeCheck, AtSign, Info, Phone, MapPin,
  Ban, AlertCircle
} from 'lucide-react-native';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import { SOCKET_URL } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function UserProfileScreen({ navigation, route }: any) {
  const { userId, name: initialName, avatar: initialAvatar } = route.params;
  const { colors, normalize, isDark, fontSizeFactor } = useTheme();
  const { t } = useLanguage();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;

    const baseUrl = SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL;
    const path = url.startsWith('/') ? url : `/${url}`;

    return `${baseUrl}${path}`;
  };

  useEffect(() => {
    fetchUserDetails();

    const onVerifiedUpdate = (data: any) => {
      if (data.userId === userId) {
        fetchUserDetails();
      }
    };

    socketService.on('admin:user_verified', onVerifiedUpdate);
    return () => {
      socketService.off('admin:user_verified', onVerifiedUpdate);
    };
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      const res = await apiService.getUserById(userId);
      if (res.success) {
        setUser(res.data);
      } else {
        Alert.alert('Erreur', 'Impossible de charger le profil.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = () => {
    Alert.alert(
      "Bloquer l'utilisateur",
      `Voulez-vous vraiment bloquer ${user?.full_name || initialName} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Bloquer",
          style: "destructive",
          onPress: async () => {
            const res = await apiService.blockUser(userId);
            if (res.success) {
              Alert.alert("Succès", "Utilisateur bloqué.");
              navigation.navigate('ChatList');
            }
          }
        }
      ]
    );
  };

  const handleReportUser = () => {
    const reportReasons = [
      "Comportement inapproprié",
      "Spam ou arnaque",
      "Harcèlement",
      "Faux profil",
      "Autre"
    ];

    Alert.alert(
      "Signaler l'utilisateur",
      "Pourquoi souhaitez-vous signaler cet utilisateur ?",
      [
        { text: "Annuler", style: "cancel" },
        ...reportReasons.map(reason => ({
          text: reason,
          onPress: async () => {
            const res = await apiService.reportUser(userId, reason);
            if (res.success) {
              Alert.alert("Merci", "Votre signalement a été envoyé à l'administration.");
            }
          }
        }))
      ]
    );
  };

  if (loading && !user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const displayName = user?.full_name || initialName || 'Utilisateur';
  const displayAvatar = getFullUrl(user?.avatar_url) || initialAvatar || `https://ui-avatars.com/api/?name=${displayName}&size=512`;
  const displayStatus = user?.status || 'Disponible';
  const displayPhone = user?.phone_number || '';
  const displayPseudo = user?.username ? `@${user.username}` : '';

  let age = 'N/A';
  if (user?.birth_date) {
    const birth = new Date(user.birth_date);
    const diff = Date.now() - birth.getTime();
    age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + ' ans';
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ImageBackground source={{ uri: displayAvatar }} style={styles.headerBg}>
            <View style={styles.headerOverlay}>
              <View style={[styles.headerTop, { paddingTop: useSafeAreaInsets().top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                  <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.nameSection}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{displayName}</Text>
                  <Text style={styles.userSubInfo}>{user?.gender === 'M' ? 'Homme' : (user?.gender === 'F' ? 'Femme' : '')}{age !== 'N/A' ? ` • ${age}` : ''}</Text>
                </View>
                {user?.is_verified && (
                  <BadgeCheck size={26} color={colors.info} style={{ marginLeft: 8 }} />
                )}
              </View>
            </View>
          </ImageBackground>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <AtSign size={22} color={colors.primary} style={{ marginRight: 15 }} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.primary }]}>Identifiant</Text>
              <Text style={[styles.infoText, { color: colors.text.primary }]}>{displayPseudo || 'Non renseigné'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Info size={22} color={colors.primary} style={{ marginRight: 15 }} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.primary }]}>Actus</Text>
              <Text style={[styles.infoText, { color: colors.text.primary }]}>{displayStatus}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Phone size={22} color={colors.primary} style={{ marginRight: 15 }} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.primary }]}>Téléphone</Text>
              <Text style={[styles.infoText, { color: colors.text.primary }]}>{displayPhone || 'Non renseigné'}</Text>
            </View>
            <TouchableOpacity style={styles.actionBtn}>
              <Phone size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={22} color={colors.primary} style={{ marginRight: 15 }} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.primary }]}>Localisation</Text>
              <Text style={[styles.infoText, { color: colors.text.primary }]}>
                {user?.city || 'Ville'}, {user?.commune || 'Commune'}
              </Text>
              <Text style={[styles.infoSubText, { color: colors.text.secondary }]}>
                {user?.province || 'Province'} • {user?.country || 'Pays'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, marginTop: 15 }]}>
          <TouchableOpacity style={styles.menuItem} onPress={handleBlockUser}>
            <Ban size={24} color={colors.danger} />
            <Text style={[styles.menuText, { color: colors.danger }]}>Bloquer l'utilisateur</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleReportUser}
          >
            <AlertCircle size={24} color={colors.danger} />
            <Text style={[styles.menuText, { color: colors.danger }]}>Signaler l'utilisateur</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { height: 400 },
  headerBg: { width: '100%', height: '100%' },
  headerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'space-between' },
  headerTop: { padding: 20, paddingTop: 20 },
  iconBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 25, width: 45, height: 45, justifyContent: 'center', alignItems: 'center' },
  nameSection: { padding: 20, paddingBottom: 30, flexDirection: 'row', alignItems: 'center' },
  userName: { fontSize: 28, fontWeight: 'bold', color: '#fff', textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 10 },
  userSubInfo: { fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 2 },
  section: { paddingHorizontal: 20, elevation: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 13, fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase' },
  infoText: { fontSize: 16, fontWeight: '500' },
  infoSubText: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  actionBtn: { padding: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)' },
  menuText: { fontSize: 16, fontWeight: '600', marginLeft: 20 },
});
