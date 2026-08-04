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

  useEffect(() => {
    if (!createAgoraRtcEngine) {
      setLoading(false);
      return;
    }
    initAgora();
    const timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    return () => {
      clearInterval(timer);
      leaveChannel();
    };
  }, []);

  const initAgora = async () => {
    try {
      // 1. Demander le Token au backend
      const response = await apiService.generateAgoraToken(chatId || 'test-channel');
      if (!response.success) throw new Error(response.error);

      const { token, appId, channelName } = response.data;

      // 2. Initialiser le moteur
      engine.current = createAgoraRtcEngine();
      engine.current.initialize({ appId });

      // 3. Configurer les événements
      engine.current.registerEventHandler({
        onJoinChannelSuccess: (connection: any) => {
          console.log('Joined successfully');
          setJoined(true);
          setLoading(false);
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
          onPress={() => navigation.goBack()}
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
