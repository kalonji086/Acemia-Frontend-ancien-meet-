import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Dimensions, Alert, Image } from 'react-native';
import {
  Video, VideoOff, Mic, MicOff, Camera, Phone, CameraReverse
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import { useTheme } from '../context/ThemeContext';
import callService from '../services/call.service';
import { SOCKET_URL } from '../utils/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createAgoraRtcEngine,
  ChannelProfileType, ClientRoleType, RtcConnection, IRtcEngineEventHandler,
  RtcSurfaceView, RenderModeType
} from 'react-native-agora';

const { width, height } = Dimensions.get('window');

export default function VideoCallScreen({ route, navigation }: any) {
  const { colors, normalize } = useTheme();
  const insets = useSafeAreaInsets();

  // Sécuriser les paramètres de route
  const params = route.params || {};
  const {
    callId = '',
    token = '',
    appId = '',
    channelName = '',
    peerName = 'Utilisateur',
    peerAvatar = '',
    isOutgoing = false,
    peerId = ''
  } = params;

  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const waitingSound = useRef<Audio.Sound | null>(null);

  const engine = useRef<any>(null);
  const isMounted = useRef(true);

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http')) return url;
    return `${SOCKET_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  useEffect(() => {
    isMounted.current = true;

    // Validation minimale
    if (!appId || !token || !channelName) {
      console.error('VideoCall: Missing required Agora parameters', { appId, token: !!token, channelName });
      Alert.alert('Erreur', 'Paramètres d\'appel vidéo invalides.');
      navigation.goBack();
      return;
    }

    if (isOutgoing) {
      playWaitingSound();
    }

    const init = async () => {
      try {
        console.log('VideoCall: Initializing Agora engine...');

        if (typeof createAgoraRtcEngine !== 'function') {
           throw new Error('SDK Agora non chargé (createAgoraRtcEngine undefined)');
        }

        engine.current = createAgoraRtcEngine();

        const initRes = engine.current.initialize({ appId });
        if (initRes < 0) {
          throw new Error(`Agora initialization failed with code ${initRes}`);
        }

        engine.current.registerEventHandler({
            onJoinChannelSuccess: (connection: RtcConnection, elapsed: number) => {
                console.log('VideoCall: Local user joined successfully');
            },
            onUserJoined: (connection: RtcConnection, uid: number) => {
                console.log('VideoCall: Remote user joined:', uid);
                if (isMounted.current) {
                  setRemoteUid(uid);
                  stopWaitingSound();
                }
            },
            onUserOffline: (connection: RtcConnection, uid: number, reason: number) => {
                console.log('VideoCall: Remote user offline, reason:', reason);
                handleHangup();
            },
            onError: (err: number, msg: string) => {
                console.error('VideoCall: Agora Error:', err, msg);
            }
        });

        engine.current.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
        engine.current.enableVideo();
        engine.current.startPreview();

        const joinRes = engine.current.joinChannel(token, channelName, 0, {
            clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        });

        if (joinRes < 0) {
          throw new Error(`Agora join channel failed with code ${joinRes}`);
        }

        // Écouter le signal que le téléphone distant sonne
        socketService.on('call:ringing', (data) => {
          if (data.callId === callId && isMounted.current) {
            // Optionnel : on peut mettre à jour un état de texte si on en ajoute un
            console.log('VideoCall: Remote phone is ringing');
          }
        });

      } catch (e: any) {
        console.error('VideoCall: Critical Init Error', e);
        Alert.alert('Erreur vidéo', 'Impossible de démarrer la caméra.');
        navigation.goBack();
      }
    };
    init();

    return () => {
      isMounted.current = false;
      stopWaitingSound();

      if (engine.current) {
        try {
          engine.current.leaveChannel();
          setTimeout(() => {
            try { engine.current?.release(); } catch(e) {}
          }, 500);
        } catch (e) {}
      }
    };
  }, []);

  const playWaitingSound = async () => {
    try {
      // Désactivé car le fichier waiting_beep.mp3 est manquant
      /*
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/waiting_beep.mp3'),
        { shouldPlay: true, isLooping: true }
      );
      waitingSound.current = sound;
      */
    } catch (e) {
      console.log('Waiting sound error skipped');
    }
  };

  const stopWaitingSound = async () => {
    if (waitingSound.current) {
      try {
        await waitingSound.current.stopAsync();
        await waitingSound.current.unloadAsync();
        waitingSound.current = null;
      } catch (e) {}
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    engine.current?.muteLocalAudioStream(next);
  };

  const toggleCamera = () => {
    const next = !cameraOff;
    setCameraOff(next);
    engine.current?.enableLocalVideo(!next);
  };

  const switchCamera = () => {
    setIsFrontCamera(!isFrontCamera);
    engine.current?.switchCamera();
  };

  const handleHangup = () => {
    stopWaitingSound();
    callService.hangup(callId, peerId, channelName);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar hidden />

      {/* Remote Video */}
      <View style={styles.remoteVideo}>
        {remoteUid ? (
          <RtcSurfaceView
               canvas={{ uid: remoteUid }}
               style={styles.fullVideo}
          />
        ) : (
          <View style={styles.waitingContainer}>
            <Image
              source={{ uri: getFullUrl(params.peerAvatar) || `https://ui-avatars.com/api/?name=${peerName}&background=random` }}
              style={styles.waitingAvatar}
            />
            <Text style={styles.waitingText}>{isOutgoing ? 'Appel en cours...' : 'Connexion...'}</Text>
          </View>
        )}
      </View>

      {/* Local Preview */}
      <View style={[styles.localPreview, { top: insets.top + 20 }]}>
        {!cameraOff ? (
          <RtcSurfaceView
               canvas={{ uid: 0 }}
               style={styles.previewView}
          />
        ) : (
          <View style={[styles.previewView, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
            <VideoOff size={20} color="#fff" />
          </View>
        )}
      </View>

      {/* Controls Overlay */}
      <SafeAreaView style={styles.controls}>
        <View style={styles.topControls}>
           <Text style={styles.peerName}>{peerName}</Text>
        </View>

        <View style={styles.bottomControls}>
          <TouchableOpacity style={styles.controlBtn} onPress={toggleMute}>
            {isMuted ? <MicOff size={26} color="#fff" /> : <Mic size={26} color="#fff" />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlBtn} onPress={toggleCamera}>
            {cameraOff ? <VideoOff size={26} color="#fff" /> : <Video size={26} color="#fff" />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlBtn} onPress={switchCamera}>
            <CameraReverse size={26} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.danger }]} onPress={handleHangup}>
            <Phone size={26} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  remoteVideo: { flex: 1 },
  fullVideo: { width: '100%', height: '100%' },
  waitingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
  waitingAvatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  waitingText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  localPreview: { position: 'absolute', right: 20, width: 100, height: 150, borderRadius: 15, overflow: 'hidden', borderWidth: 2, borderColor: '#fff', elevation: 5 },
  previewView: { width: '100%', height: '100%' },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, justifyContent: 'space-between', padding: 20 },
  topControls: { paddingTop: 20, alignItems: 'center' },
  peerName: { color: '#fff', fontSize: 20, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 5 },
  bottomControls: { flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 30, alignItems: 'center' },
  controlBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
});
