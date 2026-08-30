import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Vibration } from 'react-native';
import { X, Video, Phone } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { useTheme } from '../context/ThemeContext';
import callService from '../services/call.service';
import { SOCKET_URL } from '../utils/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import socketService from '../services/socket.service';

export default function IncomingCallScreen({ route, navigation }: any) {
  const { colors, normalize } = useTheme();
  const insets = useSafeAreaInsets();
  const { peerName, peerAvatar, callId, type, peerId } = route.params;
  const [ringtone, setRingtone] = useState<Audio.Sound | null>(null);

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http')) return url;
    return `${SOCKET_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  useEffect(() => {
    // Logique de sonnerie et vibration sécurisée
    const playRingtone = async () => {
      // 1. Toujours activer la vibration par défaut (sécurité)
      Vibration.vibrate([500, 1000, 500, 1000], true);

      try {
        // Désactivé car le fichier ringtone.mp3 est manquant
        /*
        const ringtoneAsset = require('../assets/ringtone.mp3');
        const { sound } = await Audio.Sound.createAsync(
          ringtoneAsset,
          { shouldPlay: true, isLooping: true }
        );
        setRingtone(sound);
        */
      } catch (e) {
        console.log('App: Ringtone sound disabled (missing file)');
      }
    };

    playRingtone();

    // Signaler au serveur que l'appareil sonne effectivement
    socketService.emit('call:ringing', { callId, toUserId: peerId });

    return () => {
      if (ringtone) ringtone.stopAsync().catch(() => {});
      Vibration.cancel();
    };
  }, []);

  const handleAccept = () => {
    Vibration.cancel();
    if (ringtone) ringtone.stopAsync().catch(() => {});
    callService.acceptCall(route.params);
  };

  const handleReject = () => {
    Vibration.cancel();
    if (ringtone) ringtone.stopAsync().catch(() => {});
    callService.rejectCall(callId);
  };

  return (
    <View style={[styles.container, { backgroundColor: '#1a1a1a', paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.userInfo}>
          <Image
            source={{ uri: getFullUrl(peerAvatar) || `https://ui-avatars.com/api/?name=${peerName}&background=random` }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{peerName}</Text>
          <Text style={styles.type}>{type === 'video' ? 'Appel vidéo entrant...' : 'Appel vocal entrant...'}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.danger }]}
            onPress={handleReject}
          >
            <X size={normalize(35)} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: '#2ecc71' }]}
            onPress={handleAccept}
          >
            {type === 'video' ? <Video size={normalize(35)} color="#fff" /> : <Phone size={normalize(35)} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 100 },
  userInfo: { alignItems: 'center' },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 20, borderWidth: 3, borderColor: '#fff' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  type: { fontSize: 16, color: '#aaa' },
  actions: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', paddingHorizontal: 50 },
  btn: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 5 },
});
