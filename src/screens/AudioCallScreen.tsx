import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { MicOff, Mic, Volume2, Volume1, Phone } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { useTheme } from '../context/ThemeContext';
import callService from '../services/call.service';
import socketService from '../services/socket.service';
import { SOCKET_URL } from '../utils/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Note: Importer le SDK Agora après installation
import { createAgoraRtcEngine, ChannelProfileType, ClientRoleType, RtcConnection, IRtcEngineEventHandler } from 'react-native-agora';

export default function AudioCallScreen({ route, navigation }: any) {
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

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState(isOutgoing ? 'Appel en cours...' : 'Connecté');
  const timerRef = useRef<any>(null);
  const waitingSound = useRef<Audio.Sound | null>(null);

  // Agora Engine Ref
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
      console.error('AudioCall: Missing required Agora parameters', { appId, token: !!token, channelName });
      Alert.alert('Erreur', 'Paramètres d\'appel invalides.');
      navigation.goBack();
      return;
    }

    // 1. Initialiser le timer si connecté
    if (!isOutgoing) {
      startTimer();
    } else {
      playWaitingSound();
    }

    const onRinging = (data: any) => {
      if (data.callId === callId && isMounted.current) {
        setCallStatus('Sonne...');
      }
    };

    // 2. Initialiser Agora avec sécurité
    const init = async () => {
      try {
        console.log('AudioCall: Initializing Agora engine...');

        if (typeof createAgoraRtcEngine !== 'function') {
           console.error('AudioCall: createAgoraRtcEngine is not a function');
           throw new Error('SDK Agora non chargé');
        }

        engine.current = createAgoraRtcEngine();
        if (!engine.current) {
           throw new Error('Impossible de créer le moteur Agora');
        }

        const initRes = engine.current.initialize({ appId });
        if (initRes < 0) {
          throw new Error(`Agora initialization failed with code ${initRes}`);
        }

        engine.current.registerEventHandler({
            onJoinChannelSuccess: (connection: RtcConnection, elapsed: number) => {
                console.log('AudioCall: Local user joined successfully');
            },
            onUserJoined: (connection: RtcConnection, remoteUid: number) => {
                console.log('AudioCall: Remote user joined:', remoteUid);
                if (isMounted.current) {
                  setCallStatus('Connecté');
                  stopWaitingSound();
                  startTimer();
                }
            },
            onUserOffline: (connection: RtcConnection, remoteUid: number, reason: number) => {
                console.log('AudioCall: Remote user offline, reason:', reason);
                handleHangup();
            },
            onError: (err: number, msg: string) => {
                console.error('AudioCall: Agora Error:', err, msg);
                if (err === 110) { // Token expired
                   if (isMounted.current) {
                     Alert.alert('Erreur', 'Session d\'appel expirée');
                     handleHangup();
                   }
                }
            }
        });

        engine.current.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
        engine.current.enableAudio();

        const joinRes = engine.current.joinChannel(token, channelName, 0, {
            clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        });

        if (joinRes < 0) {
          throw new Error(`Agora join channel failed with code ${joinRes}`);
        }

        // Écouter le signal que le téléphone distant sonne
        socketService.on('call:ringing', onRinging);

      } catch (e: any) {
        console.error('AudioCall: Critical Init Error', e);
        if (isMounted.current) {
          Alert.alert('Erreur d\'appel', 'Impossible de démarrer le moteur d\'appel. Vérifiez votre connexion.');
          navigation.goBack();
        }
      }
    };

    init();

    return () => {
      isMounted.current = false;
      stopTimer();
      stopWaitingSound();
      socketService.off('call:ringing', onRinging);

      if (engine.current) {
        try {
          const currentEngine = engine.current;
          engine.current = null;
          currentEngine.leaveChannel();
          // Un délai sécurisé avant release
          setTimeout(() => {
            try { currentEngine.release(); } catch(e) { console.log('Agora release error ignored'); }
          }, 1000);
        } catch (e) {
          console.log('Agora cleanup error ignored');
        }
      }
    };
  }, []);

  const playWaitingSound = async () => {
    try {
      // Sécuriser le chargement pour éviter le crash si le fichier est manquant
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/Logo.png'), // Fallback sur un fichier existant pour le bundler
        { shouldPlay: false }
      ).catch(() => ({ sound: null }));

      // Note: Normalement on chargerait waiting_beep.mp3 ici
      // On désactive pour l'instant car le fichier est manquant
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

  const startTimer = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      if (isMounted.current) setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    const nextValue = !isMuted;
    setIsMuted(nextValue);
    engine.current?.muteLocalAudioStream(nextValue);
  };

  const toggleSpeaker = () => {
    const nextValue = !isSpeaker;
    setIsSpeaker(nextValue);
    engine.current?.setEnableSpeakerphone(nextValue);
  };

  const handleHangup = () => {
    stopWaitingSound();
    callService.hangup(callId, peerId, channelName);
  };

  return (
    <View style={[styles.container, { backgroundColor: '#1a1a1a', paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.status}>{callStatus}</Text>
        <Text style={styles.timer}>{formatTime(callDuration)}</Text>
      </View>

      <View style={styles.content}>
        <Image
          source={{ uri: getFullUrl(peerAvatar) || `https://ui-avatars.com/api/?name=${peerName}&background=random` }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{peerName}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, isMuted && styles.activeAction]} onPress={toggleMute}>
            {isMuted ? <MicOff size={28} color="#fff" /> : <Mic size={28} color="#fff" />}
            <Text style={styles.actionLabel}>Muet</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, isSpeaker && styles.activeAction]} onPress={toggleSpeaker}>
            {isSpeaker ? <Volume2 size={28} color="#fff" /> : <Volume1 size={28} color="#fff" />}
            <Text style={styles.actionLabel}>Haut-parleur</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.danger }]} onPress={handleHangup}>
            <Phone size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            <Text style={styles.actionLabel}>Quitter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', marginTop: 50 },
  status: { color: '#aaa', fontSize: 16, marginBottom: 10 },
  timer: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 150, height: 150, borderRadius: 75, marginBottom: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  name: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  footer: { paddingBottom: 50 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  actionBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  activeAction: { backgroundColor: 'rgba(255,255,255,0.3)' },
  actionLabel: { color: '#fff', fontSize: 12, marginTop: 5, position: 'absolute', bottom: -20 },
});
