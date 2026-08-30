import { Platform, Alert } from 'react-native';
import socketService from './socket.service';
import apiService from './api.service';
import { CommonActions } from '@react-navigation/native';
import * as ExpoCamera from 'expo-camera';
import { Audio } from 'expo-av';

// Note: On utilisera react-native-agora ou agora-rn-sdk
// Pour l'instant, on prépare la logique de signaling qui est indépendante du SDK
// Le SDK sera injecté ou importé ici une fois installé.

class CallService {
  private static instance: CallService;
  private navigationRef: any = null;
  private currentCall: any = null;

  private constructor() {}

  static getInstance(): CallService {
    if (!CallService.instance) {
      CallService.instance = new CallService();
    }
    return CallService.instance;
  }

  setNavigation(nav: any) {
    this.navigationRef = nav;
  }

  /**
   * Initialiser les écouteurs de socket pour les appels globaux
   */
  setupCallListeners() {
    socketService.on('call:ring', (data) => {
      console.log('Incoming call received:', data);
      this.handleIncomingCall(data);
    });

    socketService.on('call:accepted', (data) => {
       console.log('Call accepted by peer:', data);
    });

    socketService.on('call:rejected', (data) => {
       console.log('Call rejected by peer:', data);
       this.handleCallEnd('Appel refusé');
    });

    socketService.on('call:timeout', (data) => {
       console.log('Call timeout:', data);
       this.handleCallEnd('Pas de réponse');
    });

    socketService.on('call:hangup', (data) => {
       console.log('Call hangup by peer:', data);
       this.handleCallEnd('Appel terminé');
    });

    socketService.on('call:busy', (data) => {
       console.log('Peer is busy:', data);
       this.handleCallEnd('Correspondant occupé');
    });

    socketService.on('call:callee_unavailable', (data) => {
       console.log('Peer is offline:', data);
       this.handleCallEnd('Correspondant non disponible');
    });

    socketService.on('call:calling', (data) => {
       console.log('Server is trying to reach peer:', data);
    });
  }

  /**
   * Lancer un appel sortant
   */
  async startCall(toUserId: string, toUserName: string, toUserAvatar: string, type: 'audio' | 'video') {
    try {
      console.log(`CallService: Starting ${type} call to ${toUserName} (${toUserId})`);

      // 1. Vérifier les permissions
      const audioPerm = await Audio.requestPermissionsAsync().catch(() => ({ status: 'denied' }));
      if (audioPerm.status !== 'granted') {
        Alert.alert('Permission requise', 'L\'accès au micro est nécessaire pour passer des appels.');
        return;
      }

      if (type === 'video') {
        const { status: videoStatus } = await ExpoCamera.Camera.requestCameraPermissionsAsync().catch((err) => {
          console.error('CallService: Camera permission error', err);
          return { status: 'denied' };
        });
        if (videoStatus !== 'granted') {
          Alert.alert('Permission requise', 'L\'accès à la caméra est nécessaire pour les appels vidéo. Veuillez l\'autoriser dans les paramètres de votre téléphone.');
          return;
        }
      }

      const channelName = `call_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // 2. Obtenir un token Agora du backend
      const res = await apiService.generateCallToken(channelName);
      if (!res.success) {
        Alert.alert('Erreur', res.error || 'Impossible d\'initialiser l\'appel. Vérifiez la configuration Agora sur le serveur.');
        return;
      }

      const { token, appId } = res.data;
      const callId = `${Date.now()}`;
      const currentUser = await apiService.getCurrentUser();

      this.currentCall = {
        callId,
        peerId: toUserId,
        peerName: toUserName,
        peerAvatar: toUserAvatar,
        type,
        channelName,
        token,
        appId,
        isOutgoing: true
      };

      // 3. Envoyer l'offre via Socket
      socketService.emit('call:offer', {
        toUserId,
        channelName,
        callType: type,
        callId,
        fromUserName: currentUser?.full_name || 'Utilisateur',
        fromUserAvatar: currentUser?.avatar_url || currentUser?.avatar
      });

      // 4. Naviguer vers l'écran d'appel
      const screenName = type === 'audio' ? 'AudioCall' : 'VideoCall';

      if (!this.navigationRef) {
         console.error('CallService: Navigation not ready');
         throw new Error('Navigation non prête');
      }

      this.navigationRef.navigate(screenName, {
        ...this.currentCall,
        status: 'calling'
      });

    } catch (error: any) {
      console.error('CallService: Start call error:', error);
      Alert.alert('Erreur', `Impossible de lancer l'appel: ${error?.message || 'Erreur inconnue'}`);
    }
  }

  /**
   * Gérer un appel entrant
   */
  private handleIncomingCall(data: any) {
    const { fromUserId, channelName, callType, callId, fromUserName, fromUserAvatar } = data;

    this.currentCall = {
      callId,
      peerId: fromUserId,
      peerName: fromUserName || 'Utilisateur',
      peerAvatar: fromUserAvatar,
      type: callType,
      channelName,
      isOutgoing: false
    };

    // Naviguer vers l'écran d'appel entrant
    this.navigationRef?.navigate('IncomingCall', {
      ...this.currentCall
    });
  }

  /**
   * Accepter un appel
   */
  async acceptCall(callData: any) {
    try {
      // 1. Obtenir un token pour le canal
      const res = await apiService.generateCallToken(callData.channelName);
      if (!res.success) {
         this.rejectCall(callData.callId);
         return;
      }

      // 2. Signaler l'acceptation
      socketService.emit('call:accept', { callId: callData.callId });

      // 3. Naviguer vers l'écran d'appel actif
      const screenName = callData.type === 'audio' ? 'AudioCall' : 'VideoCall';
      this.navigationRef?.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            { name: 'ChatList' }, // Garder le fond
            {
              name: screenName,
              params: {
                ...callData,
                token: res.data.token,
                appId: res.data.appId,
                status: 'connected'
              }
            }
          ],
        })
      );
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Refuser un appel
   */
  rejectCall(callId: string) {
    socketService.emit('call:reject', { callId });
    this.currentCall = null;
    this.navigationRef?.goBack();
  }

  /**
   * Raccrocher
   */
  hangup(callId: string, peerId: string, channelName?: string) {
    socketService.emit('call:hangup', { callId, toUserId: peerId, channelName });
    this.currentCall = null;
    this.navigationRef?.navigate('ChatList');
  }

  private handleCallEnd(reason: string) {
    this.currentCall = null;
    // On peut afficher un toast ou une alerte
    console.log('Call ended:', reason);
    this.navigationRef?.navigate('ChatList');
  }
}

export default CallService.getInstance();
