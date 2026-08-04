import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

const { width, height } = Dimensions.get('window');

// Import Agora conditionnel
let createAgoraRtcEngine: any;
let ChannelProfileType: any;
let ClientRoleType: any;
let RtcSurfaceView: any;
let VideoViewSetupMode: any;

try {
  const Agora = require('react-native-agora');
  createAgoraRtcEngine = Agora.createAgoraRtcEngine;
  ChannelProfileType = Agora.ChannelProfileType;
  ClientRoleType = Agora.ClientRoleType;
  RtcSurfaceView = Agora.RtcSurfaceView;
} catch (e) {
  console.warn("Agora module not found or incompatible.");
}

export default function VideoCallScreen({ navigation, route }: any) {
  const { colors, normalize } = useTheme();
  const { name = 'Utilisateur', chatId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const engine = useRef<any>(null);

  useEffect(() => {
    if (!createAgoraRtcEngine) {
      setLoading(false);
      return;
    }
    initAgora();
    return () => leaveChannel();
  }, []);

  const initAgora = async () => {
    try {
      const response = await apiService.generateAgoraToken(chatId || 'video-test');
      if (!response.success) throw new Error(response.error);

      const { token, appId, channelName } = response.data;

      engine.current = createAgoraRtcEngine();
      engine.current.initialize({ appId });

      engine.current.registerEventHandler({
        onJoinChannelSuccess: () => {
          setJoined(true);
          setLoading(false);
        },
        onUserJoined: (connection: any, uid: number) => {
          setRemoteUid(uid);
        },
        onUserOffline: () => {
          navigation.goBack();
        },
      });

      engine.current.enableVideo();
      engine.current.startPreview();

      engine.current.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
      engine.current.joinChannel(token, channelName, 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster
      });

    } catch (e) {
      Alert.alert('Erreur', "Impossible de démarrer la vidéo.");
      navigation.goBack();
    }
  };

  const leaveChannel = () => {
    if (engine.current) {
      engine.current.leaveChannel();
      engine.current.release();
    }
    setJoined(false);
  };

  const toggleVideo = () => {
    if (!engine.current) return;
    engine.current.muteLocalVideoStream(!isVideoOff);
    setIsVideoOff(!isVideoOff);
  };

  const toggleMute = () => {
    if (!engine.current) return;
    engine.current.muteLocalAudioStream(!isMuted);
    setIsMuted(!isMuted);
  };

  const switchCamera = () => {
    if (!engine.current) return;
    engine.current.switchCamera();
  };

  if (!createAgoraRtcEngine) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="videocam-off" size={60} color="#ff3b30" />
        <Text style={styles.errorText}>L'appel vidéo nécessite une version installée de l'app (APK) et n'est pas disponible dans Expo Go.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>RETOUR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Vue distante (Plein écran) */}
      <View style={styles.fullScreen}>
        {remoteUid ? (
          <RtcSurfaceView
            canvas={{ uid: remoteUid }}
            style={styles.fullScreen}
          />
        ) : (
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.waitingText}>Appel en cours avec {name}...</Text>
          </View>
        )}
      </View>

      {/* Vue locale (Petite fenêtre) */}
      {!isVideoOff && (
        <View style={styles.localView}>
          <RtcSurfaceView
            canvas={{ uid: 0 }}
            style={styles.localView}
          />
        </View>
      )}

      {/* Contrôles */}
      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roundBtn}>
            <Ionicons name="chevron-down" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={switchCamera} style={styles.roundBtn}>
            <Ionicons name="camera-reverse" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={[styles.controlBtn, isMuted && styles.activeControl]}
            onPress={toggleMute}
          >
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.endCallButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, isVideoOff && styles.activeControl]}
            onPress={toggleVideo}
          >
            <Ionicons name={isVideoOff ? "videocam-off" : "videocam"} size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  fullScreen: { flex: 1 },
  localView: { width: 120, height: 180, position: 'absolute', top: 100, right: 20, borderRadius: 15, overflow: 'hidden', borderWidth: 2, borderColor: '#fff' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  roundBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  waitingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#232f3e' },
  waitingText: { color: '#fff', marginTop: 20, fontSize: 16, fontWeight: 'bold' },
  bottomControls: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', marginBottom: 40 },
  controlBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  activeControl: { backgroundColor: '#ff3b30' },
  endCallButton: { width: 75, height: 75, borderRadius: 37.5, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', elevation: 10 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#1a1a1a' },
  errorText: { textAlign: 'center', color: '#ccc', marginTop: 20, marginBottom: 30, fontSize: 16 },
  backBtn: { backgroundColor: '#ff3b30', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  backBtnText: { color: '#fff', fontWeight: 'bold' }
});
