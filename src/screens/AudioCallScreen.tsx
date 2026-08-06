import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';
import { PermissionsAndroid } from 'react-native';
import SocketService from '../services/socket.service';
import { Audio } from 'expo-av';

// Import Agora conditionnel pour éviter les crashs sur Expo Go
let createAgoraRtcEngine: any;
let ChannelProfileType: any;
let ClientRoleType: any;
let RtcConnection: any;
let IRtcEngine: any;

try {
  const Agora = require('react-native-agora');
  createAgoraRtcEngine = Agora.createAgoraRtcEngine;
  ChannelProfileType = Agora.ChannelProfileType;
  ClientRoleType = Agora.ClientRoleType;
} catch (e) {
  console.warn("Agora module not found or incompatible with this environment.");
}

export default function AudioCallScreen({ navigation, route }: any) {
  const { colors, normalize, fontSizeFactor } = useTheme();
  const { name = 'Utilisateur', avatar, chatId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const engine = useRef<any>(null);
  const ringSound = useRef<any>(null);
  const callTimeout = useRef<any>(null);
  const currentCallId = useRef<string | null>(null);
  const isOutgoing = route.params?.outgoing === true;
  const toUserId = route.params?.toUserId;
  const peerUserId = route.params?.peerUserId;

  useEffect(() => {
    if (!createAgoraRtcEngine) {
      setLoading(false);
      return;
    }
    initAgora();
    // Socket listeners
    SocketService.on('call:accepted', handleCallAccepted);
    SocketService.on('call:rejected', handleCallRejected);
    SocketService.on('call:hangup', handleCallHangup);
    SocketService.on('call:timeout', handleCallTimeout);
    SocketService.on('call:callee_unavailable', handleCalleeUnavailable);

    const timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    return () => {
      clearInterval(timer);
      // send hangup if needed
      const callIdParam = route.params?.callId || currentCallId.current;
      const target = peerUserId || toUserId;
      try { if (callIdParam && target) SocketService.hangupCall(callIdParam, target); } catch (err) {}
      leaveChannel();
      cleanupRing();
      // remove listeners
      SocketService.off('call:accepted', handleCallAccepted);
      SocketService.off('call:rejected', handleCallRejected);
      SocketService.off('call:hangup', handleCallHangup);
      SocketService.off('call:timeout', handleCallTimeout);
      SocketService.off('call:callee_unavailable', handleCalleeUnavailable);
    };
  }, []);

  const playRing = async () => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: 'https://actions.google.com/sounds/v1/alarms/phone_alerts_and_rings.ogg' });
      ringSound.current = sound;
      await sound.setIsLoopingAsync(true);
      await sound.playAsync();
    } catch (err) {
      console.warn('Ring play error', err);
    }
  };

  const cleanupRing = async () => {
    try {
      if (ringSound.current) {
        await ringSound.current.stopAsync();
        await ringSound.current.unloadAsync();
        ringSound.current = null;
      }
    } catch (err) {
      // ignore
    }
  };

  const startCallTimeout = () => {
    clearCallTimeout();
    callTimeout.current = setTimeout(() => {
      cleanupRing();
      leaveChannel();
      Alert.alert('Pas de réponse', 'L\'appel n\'a pas été répondu.');
      navigation.goBack();
    }, 30000);
  };

  const clearCallTimeout = () => {
    if (callTimeout.current) {
      clearTimeout(callTimeout.current);
      callTimeout.current = null;
    }
  };

  const handleCallAccepted = (data: any) => {
    if (!data || !data.callId) return;
    if (currentCallId.current && data.callId !== currentCallId.current) return;
    cleanupRing();
    clearCallTimeout();
  };

  const handleCallRejected = (data: any) => {
    if (!data || !data.callId) return;
    if (currentCallId.current && data.callId !== currentCallId.current) return;
    cleanupRing();
    clearCallTimeout();
    Alert.alert('Appel rejeté', 'Le correspondant a rejeté l\'appel.');
    navigation.goBack();
  };

  const handleCallHangup = (data: any) => {
    cleanupRing();
    clearCallTimeout();
    Alert.alert('Appel terminé', 'Le correspondant a raccroché.');
    navigation.goBack();
  };

  const handleCallTimeout = (data: any) => {
    cleanupRing();
    clearCallTimeout();
    Alert.alert('Temps écoulé', 'L\'appel a expiré.');
    navigation.goBack();
  };

  const handleCalleeUnavailable = (data: any) => {
    cleanupRing();
    clearCallTimeout();
    Alert.alert('Hors ligne', 'Le destinataire est hors ligne.');
    navigation.goBack();
  };

  const initAgora = async () => {
    try {
      // Permissions (Android)
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Permission microphone',
            message: 'L\'application a besoin d\'accéder au microphone pour les appels audio',
            buttonNeutral: 'Demander plus tard',
            buttonNegative: 'Annuler',
            buttonPositive: 'OK',
          }
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission refusée', 'Le microphone est requis pour passer des appels.');
          navigation.goBack();
          return;
        }
      }
      // 1. Demander le Token au backend
      const response = await apiService.generateAgoraToken(chatId || 'test-channel');
      if (!response.success) throw new Error(response.error);

      const { token, appId, channelName } = response.data;

      // If outgoing, notify callee via socket signaling
      if (isOutgoing && toUserId) {
        currentCallId.current = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        SocketService.sendCallOffer(toUserId, channelName, 'audio', currentCallId.current);
        playRing();
        startCallTimeout();
      }

      // 2. Initialiser le moteur
      engine.current = createAgoraRtcEngine();
      engine.current.initialize({ appId });
      try { engine.current.enableAudio && engine.current.enableAudio(); } catch (err) { console.warn('enableAudio failed', err); }

      // 3. Configurer les événements
      engine.current.registerEventHandler({
        onJoinChannelSuccess: (connection: any) => {
          console.log('Joined successfully');
          setJoined(true);
          setLoading(false);
        },
        onUserJoined: (connection: any, uid: number) => {
          console.log('Remote user joined', uid);
        },
        onRemoteAudioStateChanged: (connection: any, remoteUid: number, state: number, reason: number, elapsed: number) => {
          console.log('Remote audio state', remoteUid, state, reason, elapsed);
        },
        onUserOffline: (connection: any, remoteUid: number) => {
          Alert.alert('Appel terminé', 'Le correspondant a raccroché.');
          navigation.goBack();
        },
        onError: (err: any) => console.error('Agora Error:', err)
      });

      // 4. Rejoindre
      engine.current.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
      engine.current.joinChannel(token, channelName, 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster
      });

    } catch (e: any) {
      console.error(e);
      Alert.alert('Erreur', "Impossible d'établir la connexion audio.");
      navigation.goBack();
    }
  };

  const toggleMute = () => {
    if (!engine.current) return;
    engine.current.muteLocalAudioStream(!isMuted);
    setIsMuted(!isMuted);
  };

  const toggleSpeaker = () => {
    if (!engine.current) return;
    engine.current.setEnableSpeakerphone(!isSpeaker);
    setIsSpeaker(!isSpeaker);
  };

  const leaveChannel = () => {
    if (engine.current) {
      engine.current.leaveChannel();
      engine.current.release();
    }
    setJoined(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!createAgoraRtcEngine) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning" size={50} color="#ff3b30" />
        <Text style={styles.errorText}>Le module d'appel n'est pas disponible dans cette version de test (Expo Go).</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>RETOUR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.6)" />
        <Text style={styles.encryptionText}>Chiffré de bout en bout</Text>
      </View>

      <View style={styles.profileSection}>
        <Image
          source={{ uri: avatar || `https://ui-avatars.com/api/?name=${name}&background=random` }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.status}>
          {loading ? "Connexion en cours..." : formatTime(callDuration)}
        </Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.controlBtn, isSpeaker && styles.activeControl]}
            onPress={toggleSpeaker}
          >
            <Ionicons name={isSpeaker ? "volume-high" : "volume-medium-outline"} size={28} color="#fff" />
            <Text style={styles.controlLabel}>Haut-parleur</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, isMuted && styles.activeControl]}
            onPress={toggleMute}
          >
            <Ionicons name={isMuted ? "mic-off" : "mic-outline"} size={28} color="#fff" />
            <Text style={styles.controlLabel}>Muet</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.endCallButton}
          onPress={() => {
            const callIdParam = route.params?.callId || currentCallId.current;
            const target = peerUserId || toUserId;
            try { if (callIdParam) SocketService.hangupCall(callIdParam, target); } catch (err) {}
            cleanupRing();
            leaveChannel();
            navigation.goBack();
          }}
        >
          <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 50 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  encryptionText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginLeft: 5 },
  profileSection: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  avatar: { width: 160, height: 160, borderRadius: 80, marginBottom: 20, borderWidth: 4, borderColor: 'rgba(255,255,255,0.1)' },
  name: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  status: { color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: '500' },
  controls: { width: '100%', alignItems: 'center', paddingBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-evenly', width: '100%', marginBottom: 40 },
  controlBtn: { alignItems: 'center', width: 100 },
  activeControl: { opacity: 0.5 },
  controlLabel: { color: '#fff', fontSize: 12, marginTop: 8, fontWeight: '500' },
  endCallButton: { width: 75, height: 75, borderRadius: 37.5, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 5 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#f9f9f9' },
  errorText: { textAlign: 'center', color: '#666', marginTop: 20, marginBottom: 30, fontSize: 16, lineHeight: 24 },
  backBtn: { backgroundColor: '#673AB7', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  backBtnText: { color: '#fff', fontWeight: 'bold' }
});
