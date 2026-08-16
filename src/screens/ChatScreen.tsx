import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ImageBackground,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { colors as baseColors } from '../styles/theme';
import { supabase } from '../services/supabase.service';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import { SOCKET_URL } from '../utils/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

export default function ChatScreen({ navigation, route }: any) {
  const { isDark, colors: themeColors, normalize, fontSizeFactor } = useTheme();
  const { t, language, autoTranslate } = useLanguage();
  const { chatId, name = 'Inconnu', avatar, isVerified: initialIsVerified, peerUserId, type } = route.params || {};
  const isGroup = type === 'group' || !peerUserId;

  // Sécurité: Si chatId est absent, on retourne à l'écran précédent
  useEffect(() => {
    if (!chatId) {
      console.error('ChatScreen: chatId is missing');
      navigation.goBack();
    }
  }, [chatId]);

  const [messages, setMessages] = useState<any[]>([]);
  const [isVerified, setIsVerified] = useState(initialIsVerified);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isContact, setIsContact] = useState<boolean>(true);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playedMessages, setPlayedMessages] = useState<Set<string>>(new Set());
  const [playbackStatus, setPlaybackStatus] = useState<any>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const typingTimeoutRef = useRef<any>(null);

  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const timerRef = useRef<any>(null);

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;

    // S'assurer qu'il y a un slash entre l'URL de base et le chemin
    const baseUrl = SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL;
    const path = url.startsWith('/') ? url : `/${url}`;

    return `${baseUrl}${path}`;
  };

  useEffect(() => {
    const setup = async () => {
      try {
        const user = await apiService.getCurrentUser();
        setCurrentUser(user);
        await fetchMessages();

        if (chatId) {
          await apiService.markMessagesAsRead(chatId);
          if (isGroup) {
            const res = await apiService.getChat(chatId);
            if (res.success) setGroupDetails(res.data);
          }
        }
        await Audio.requestPermissionsAsync();

        if (peerUserId && !isGroup) {
          const res = await apiService.isContact(peerUserId);
          if (res.success) setIsContact((res as any).isContact);
        }
      } catch (error) {
        console.error('Setup error:', error);
      }
    };
    setup();

    const subscription = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      (payload: any) => {
        if (payload.event === 'INSERT') {
          const newMessage = payload.new;
          setMessages(current => {
            if (current.some(m => m.id === newMessage.id || (m.tempId && m.tempId === newMessage.id))) return current;
            if (newMessage.sender_id !== currentUser?.id) {
              apiService.markMessagesAsRead(chatId);
              // Traduction auto
              if (autoTranslate && newMessage.type === 'text') {
                handleAutoTranslate(newMessage.id);
              }
            }
            return [...current, newMessage];
          });
        } else if (payload.event === 'UPDATE') {
          const updatedMsg = payload.new;
          // Si le message est marqué comme supprimé pour MOI, on le retire de la liste
          if (updatedMsg.deleted_for_users && updatedMsg.deleted_for_users.includes(currentUser?.id)) {
            setMessages(current => current.filter(m => m.id !== updatedMsg.id));
          } else {
            setMessages(current => current.map(m => m.id === updatedMsg.id ? updatedMsg : m));
          }
        } else if (payload.event === 'DELETE') {
          const deletedId = payload.old.id;
          if (deletedId) {
            setMessages(current => current.filter(m => m.id !== deletedId));
          }
        }
      })
      .subscribe();

    // Socket indicators
    const onUserTyping = (data: any) => {
      if (data.chatId === chatId && data.userId !== currentUser?.id) {
        // Récupérer les infos de l'utilisateur qui écrit
        let user = groupDetails?.participants?.find((p: any) => p.id === data.userId);

        // Si pas trouvé dans les détails du groupe (ou discussion privée), on essaie de charger l'info
        if (!user && !isGroup) {
          user = { id: data.userId, full_name: name, avatar_url: avatar };
        }

        if (user) {
          setTypingUsers(prev => {
            if (prev.some(u => u.id === user.id)) return prev;
            return [...prev, user];
          });
        }
      }
    };

    const onUserStoppedTyping = (data: any) => {
      if (data.chatId === chatId) {
        setTypingUsers(prev => prev.filter(u => u.id !== data.userId));
      }
    };

    socketService.on('user_typing', onUserTyping);
    socketService.on('user_stopped_typing', onUserStoppedTyping);
    socketService.joinChat(chatId);

    return () => {
      supabase.removeChannel(subscription);
      socketService.off('user_typing', onUserTyping);
      socketService.off('user_stopped_typing', onUserStoppedTyping);
      socketService.leaveChat(chatId);
      if (timerRef.current) clearInterval(timerRef.current);
      if (sound) sound.unloadAsync();
    };
  }, [chatId, currentUser?.id, groupDetails]);

  const fetchMessages = async () => {
    try {
      const response = await apiService.getMessages(chatId);
      if (response.success && Array.isArray(response.data)) {
        const msgs = response.data;
        setMessages(msgs);

        // Traduction auto si activée
        if (autoTranslate) {
          msgs.forEach((m: any) => {
            if (m.sender_id !== currentUser?.id && m.type === 'text') {
              handleAutoTranslate(m.id);
            }
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoTranslate = async (messageId: string) => {
    try {
      if (!language) return;
      const res = await apiService.translateMessage(messageId, language);
      if (res.success) {
        const translatedText = res.data.translatedText;
        setMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, translatedText } : m
        ));
      }
    } catch (e) {
      console.error('Auto-translate error:', e);
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);

    if (chatId) {
      socketService.startTyping(chatId);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        socketService.stopTyping(chatId);
      }, 3000);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentUser) return;
    const content = inputText;
    const tempId = 'temp_' + Date.now();
    const optimisticMessage = {
      id: tempId, tempId, chat_id: chatId, sender_id: currentUser.id, content, type: 'text',
      created_at: new Date().toISOString(), status: 'sending'
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setInputText('');
    try {
      const response = await apiService.sendMessage(chatId, content);
      if (response.success) {
        setMessages(prev => prev.map(m => m.id === tempId ? response.data : m));
        // Notification locale de succès désactivée
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!t) return;

    Alert.alert(
      t('deleteMessage') || "Supprimer le message",
      t('deleteChoice') || "Voulez-vous supprimer ce message ?",
      [
        { text: t('cancel') || "Annuler", style: "cancel" },
        {
          text: t('deleteForMe') || "Supprimer pour moi",
          onPress: async () => {
            try {
              const response = await apiService.deleteMessage(messageId, 'me');
              if (response.success) {
                // Pour "Supprimer pour moi", on retire immédiatement de la liste locale
                setMessages(prev => prev.filter(m => m.id !== messageId));
              }
            } catch (e) { console.error(e); }
          }
        },
        {
          text: t('deleteForEveryone') || "Supprimer pour tous",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await apiService.deleteMessage(messageId, 'everyone');
              if (!response.success) {
                Alert.alert("Erreur", "Délai de suppression dépassé ou erreur serveur.");
              }
            } catch (error) { console.error(error); }
          }
        }
      ]
    );
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch (err) { console.error(err); }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    clearInterval(timerRef.current);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri && currentUser) {
        const tempId = 'temp_' + Date.now();
        const optimisticAudio = {
          id: tempId, tempId, chat_id: chatId, sender_id: currentUser.id, content: t?.('audio') || 'Message vocal',
          type: 'audio', file_url: uri, created_at: new Date().toISOString(), status: 'sending'
        };
        setMessages(prev => [...prev, optimisticAudio]);

        const uploadRes = await apiService.uploadFile(
          { uri, type: 'audio/m4a', name: 'voice.m4a' },
          'audio',
          (progress) => setUploadProgress(prev => ({ ...prev, [tempId]: progress }))
        );

        if (uploadRes.success) {
          const response = await apiService.sendMessage(
            chatId,
            t?.('audio') || 'Message vocal',
            'audio',
            uploadRes.data.fileUrl,
            { fileSize: uploadRes.data.fileSize, mimeType: uploadRes.data.mimeType }
          );
          if (response.success) {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...response.data, localUri: uri } : m));
          }
        }
        setUploadProgress(prev => {
          const newState = { ...prev };
          delete newState[tempId];
          return newState;
        });
      }
    } catch (err) { console.error(err); }
  };

  const handlePickImage = async () => {
    try {
      if (!t) {
        Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour accéder à la galerie ou à la caméra.');
        return;
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted' || cameraStatus.status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder à la galerie ou à la caméra.');
        return;
      }

      Alert.alert(
        t('sendImage'),
        t('pickSource'),
        [
          {
            text: t('takePhoto'),
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
              });
              if (!result.canceled) sendImage(result.assets[0].uri);
            }
          },
          {
            text: t('gallery'),
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
              });
              if (!result.canceled) sendImage(result.assets[0].uri);
            }
          },
          { text: t('cancel'), style: "cancel" }
        ]
      );
    } catch (error) {
      console.error(error);
    }
  };

  const sendImage = async (uri: string) => {
    if (!currentUser) return;
    const tempId = 'temp_' + Date.now();
    const optimisticImage = {
      id: tempId, tempId, chat_id: chatId, sender_id: currentUser.id, content: t?.('image') || 'Image',
      type: 'image', file_url: uri, created_at: new Date().toISOString(), status: 'sending'
    };
    setMessages(prev => [...prev, optimisticImage]);

    try {
      const uploadRes = await apiService.uploadFile(
        { uri, type: 'image/jpeg', name: 'photo.jpg' },
        'image',
        (progress) => setUploadProgress(prev => ({ ...prev, [tempId]: progress }))
      );

      if (uploadRes.success) {
        const response = await apiService.sendMessage(
          chatId,
          t?.('image') || 'Image',
          'image',
          uploadRes.data.fileUrl,
          { fileSize: uploadRes.data.fileSize, mimeType: uploadRes.data.mimeType }
        );
        if (response.success) {
          setMessages(prev => prev.map(m => m.id === tempId ? { ...response.data, localUri: uri } : m));
        }
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setUploadProgress(prev => {
        const newState = { ...prev };
        delete newState[tempId];
        return newState;
      });
    }
  };

  const playAudio = async (message: any) => {
    const { id, file_url, fileUrl, localUri } = message;
    const actualFileUrl = file_url || fileUrl;

    try {
      // Si on clique sur le même audio qui est déjà en cours
      if (playingId === id && sound) {
        const status: any = await sound.getStatusAsync();
        if (status.isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
        }
        return;
      }

      // Arrêter l'audio précédent
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setPlayingId(null);
      }

      const audioSource = localUri || getFullUrl(actualFileUrl);
      if (!audioSource) {
        Alert.alert('Info', 'Le fichier audio n\'est pas encore prêt ou l\'URL est invalide.');
        return;
      }

      // Configurer le mode audio pour la lecture
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioSource },
        { shouldPlay: true },
        (status) => {
          setPlaybackStatus((prev: any) => ({ ...prev, [id]: status }));
          if ((status as any).didJustFinish) {
            setPlayingId(null);
          }
        }
      );

      setSound(newSound);
      setPlayingId(id);
      setPlayedMessages(prev => new Set(prev).add(id));

    } catch (error) {
      console.error('Playback Error:', error);
      Alert.alert('Erreur', 'Impossible de lire cet audio. Vérifiez votre connexion.');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        const doc = result.assets[0];

        Alert.alert(t?.('sendDocument') || "Envoi de document", `${t?.('confirmSend') || "Voulez-vous envoyer"} ${doc.name} ?`, [
          { text: t?.('cancel') || "Annuler", style: "cancel" },
          {
            text: t?.('send') || "Envoyer",
            onPress: async () => {
              const tempId = 'temp_' + Date.now();
              const optimisticDoc = {
                id: tempId, tempId, chat_id: chatId, sender_id: currentUser.id, content: doc.name,
                type: 'file', created_at: new Date().toISOString(), status: 'sending'
              };
              setMessages(prev => [...prev, optimisticDoc]);

              try {
                // S'assurer que l'URI est au bon format pour Android/iOS
                const cleanUri = Platform.OS === 'android' && !doc.uri.startsWith('file://') && !doc.uri.startsWith('content://')
                  ? `file://${doc.uri}`
                  : doc.uri;

                const uploadRes = await apiService.uploadFile(
                  {
                    uri: cleanUri,
                    type: doc.mimeType || 'application/octet-stream',
                    name: doc.name
                  },
                  'document', // Changé de 'file' à 'document' pour correspondre au backend
                  (progress) => setUploadProgress(prev => ({ ...prev, [tempId]: progress }))
                );

                if (uploadRes.success) {
                  const response = await apiService.sendMessage(
                    chatId,
                    doc.name,
                    'file',
                    uploadRes.data.fileUrl,
                    { fileSize: uploadRes.data.fileSize, mimeType: uploadRes.data.mimeType }
                  );
                  if (response.success) {
                    setMessages(prev => prev.map(m => m.id === tempId ? response.data : m));
                  }
                } else {
                  throw new Error(uploadRes.error || 'Upload failed');
                }
              } catch (error: any) {
                console.error('Document upload error:', error);
                setMessages(prev => prev.filter(m => m.id !== tempId));
                Alert.alert('Erreur', `Impossible d'envoyer le document : ${error.message || 'Erreur serveur'}`);
              } finally {
                setUploadProgress(prev => {
                  const newState = { ...prev };
                  delete newState[tempId];
                  return newState;
                });
              }
            }
          }
        ]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const downloadFile = async (message: any) => {
    const { id: messageId, content: fileName, file_url, fileUrl } = message;
    const actualFileUrl = file_url || fileUrl;

    try {
      const fullUrl = getFullUrl(actualFileUrl);
      if (!fullUrl) {
        Alert.alert('Info', 'Le document n\'est pas encore prêt ou l\'URL est invalide.');
        return;
      }

      // Forcer une extension si absente pour le téléchargement
      let finalFileName = fileName || 'document';
      if (!fileName.includes('.')) {
        const extension = fullUrl.split('.').pop()?.split('?')[0];
        if (extension && extension.length < 5) {
          finalFileName = `${fileName}.${extension}`;
        }
      }

      const fileUri = (FileSystem.documentDirectory || '') + finalFileName;

      const downloadResumable = FileSystem.createDownloadResumable(
        fullUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress((prev) => ({ ...prev, [messageId]: progress }));
        }
      );

      const downloadResult = await downloadResumable.downloadAsync();

      if (downloadResult && downloadResult.status === 200) {
        setDownloadProgress((prev) => {
          const newState = { ...prev };
          delete newState[messageId];
          return newState;
        });

        // Utiliser Storage Access Framework ou Sharing pour ouvrir le fichier
        if (Platform.OS === 'android') {
          try {
            // Tenter de partager pour ouvrir
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType: downloadResult.headers['content-type'] || 'application/octet-stream',
              dialogTitle: finalFileName,
            });
          } catch (shareError) {
            // Fallback: Message de succès simple si le partage échoue
            Alert.alert('Succès', `Fichier téléchargé : ${finalFileName}`);
          }
        } else {
          await Sharing.shareAsync(downloadResult.uri);
        }
      } else {
        Alert.alert('Erreur', 'Échec du téléchargement du fichier.');
        setDownloadProgress((prev) => {
          const newState = { ...prev };
          delete newState[messageId];
          return newState;
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Erreur', 'Un problème est survenu lors du téléchargement.');
      setDownloadProgress((prev) => {
        const newState = { ...prev };
        delete newState[messageId];
        return newState;
      });
    }
  };

  const handleBlockUser = async () => {
    if (!peerUserId) return;
    Alert.alert("Bloquer", "Voulez-vous bloquer cet utilisateur ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Bloquer",
        style: "destructive",
        onPress: async () => {
          const res = await apiService.blockUser(peerUserId);
          if (res.success) {
            Alert.alert("Succès", "Utilisateur bloqué.");
            navigation.goBack();
          }
        }
      }
    ]);
  };

  const handleAddContact = async () => {
    if (!peerUserId) return;
    const res = await apiService.addContact(peerUserId);
    if (res.success) {
      setIsContact(true);
      Alert.alert("Succès", "Contact ajouté.");
    }
  };

  const styles = createStyles(themeColors, normalize, fontSizeFactor, isDark);

  const handleMessageLongPress = (item: any) => {
    const isMe = item.sender_id === currentUser?.id;
    const isDeleted = item.content && item.content.includes('Ce message a été supprimé');

    if (isDeleted) return;

    const options = [
      { text: t?.('cancel') || 'Annuler', style: 'cancel' }
    ];

    // Option de traduction (IA)
    if (item.type === 'text' || item.type === 'audio') {
      options.push({
        text: item.type === 'audio' ? 'Transcrire & Traduire (IA)' : 'Traduire avec l\'IA',
        onPress: () => handleTranslateMessageIA(item)
      });
    }

    if (isMe) {
      options.push({
        text: t?.('delete') || 'Supprimer',
        style: 'destructive',
        onPress: () => handleDeleteMessage(item.id)
      });
    }

    Alert.alert(
      item.type === 'audio' ? 'Message vocal' : 'Message',
      'Choisissez une action',
      options as any
    );
  };

  const handleTranslateMessageIA = async (message: any) => {
    // Demander la langue cible si pas définie
    const targetLang = currentUser?.preferred_language || 'fr';

    try {
      setLoading(true);
      let res;
      if (message.type === 'audio') {
        res = await apiService.translateVoiceMessage(message.id, targetLang);
      } else {
        res = await apiService.translateMessage(message.id, targetLang);
      }

      if (res.success) {
        // Mettre à jour le message localement
        setMessages(prev => prev.map(m =>
          m.id === message.id
            ? {
                ...m,
                translatedText: res.data.translatedText || res.data.translated_text,
                transcription: res.data.transcription
              }
            : m
        ));
      } else {
        Alert.alert('Erreur', 'Échec de la traduction IA.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Un problème est survenu lors de la traduction.');
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: any) => {
    if (!item || !item.id) return null;
    const isMe = item.sender_id === currentUser?.id;
    const isDeleted = item.content && item.content.includes('Ce message a été supprimé');

    // Récupérer les infos de l'expéditeur si c'est un groupe
    const sender = isGroup ? groupDetails?.participants?.find((p: any) => p.id === item.sender_id) : null;

    return (
      <View style={[styles.messageRow, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
        {!isMe && isGroup && sender && (
          <Image
            source={{ uri: getFullUrl(sender.avatar_url) || `https://ui-avatars.com/api/?name=${sender.full_name}` }}
            style={styles.msgAvatar}
          />
        )}
        <View style={{ maxWidth: '80%' }}>
          {!isMe && isGroup && sender && (
            <Text style={[styles.senderName, { color: themeColors.primary }]}>{sender.full_name}</Text>
          )}
          <TouchableOpacity
            activeOpacity={0.8}
            onLongPress={() => handleMessageLongPress(item)}
            disabled={isDeleted}
            style={[
              styles.bubble,
              isMe
                ? { backgroundColor: themeColors.primary, borderBottomRightRadius: 4 }
                : { backgroundColor: themeColors.surface, borderBottomLeftRadius: 4 },
              isDeleted && { backgroundColor: isDark ? '#222' : '#f0f0f0', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' }
            ]}
          >
            {item.type === 'audio' ? (
            <View>
              <TouchableOpacity style={styles.audioMsg} onPress={() => playAudio(item)} onLongPress={() => handleMessageLongPress(item)}>
                <Ionicons
                  name={playingId === item.id && playbackStatus[item.id]?.isPlaying ? "pause" : "play"}
                  size={normalize(28)}
                  color={isMe ? '#fff' : themeColors.primary}
                />
                <View style={[
                  styles.audioBar,
                  { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : themeColors.primary + '20' }
                ]}>
                  {playingId === item.id ? (
                    playbackStatus[item.id]?.isLoaded ? (
                      <View style={[
                        styles.audioProgress,
                        {
                          width: `${(playbackStatus[item.id]?.positionMillis / playbackStatus[item.id]?.durationMillis) * 100 || 0}%`,
                          backgroundColor: isMe ? '#fff' : themeColors.primary
                        }
                      ]} />
                    ) : (
                      <ActivityIndicator size="small" color={isMe ? "#fff" : themeColors.primary} />
                    )
                  ) : null}
                </View>
                <Ionicons
                  name="mic"
                  size={normalize(18)}
                  color={item.status === 'read' ? '#34B7F1' : (isMe ? '#fff' : '#999')}
                />
              </TouchableOpacity>

              {/* Affichage Transcription & Traduction IA pour Audio */}
              {(item.transcription || item.translatedText) && (
                <View style={[styles.translationContainer, { borderTopColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)', marginTop: 8 }]}>
                  {item.transcription && (
                    <Text style={[styles.translatedText, { color: isMe ? 'rgba(255,255,255,0.9)' : isDark ? '#aaa' : '#555', fontStyle: 'italic', marginBottom: 4 }]}>
                      "{item.transcription}"
                    </Text>
                  )}
                  {item.translatedText && (
                    <Text style={[styles.translatedText, { color: isMe ? '#fff' : themeColors.primary, fontWeight: 'bold' }]}>
                      {item.translatedText}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Ionicons name="sparkles" size={10} color={isMe ? 'rgba(255,255,255,0.6)' : themeColors.primary} />
                    <Text style={[styles.translationLabel, { marginLeft: 4 }]}>IA Meet Me</Text>
                  </View>
                </View>
              )}
            </View>
          ) : item.type === 'image' ? (
            <Image
              source={{ uri: item.localUri || getFullUrl(item.file_url || item.fileUrl) || '' }}
              style={styles.imageMsg}
              resizeMode="cover"
            />
          ) : item.type === 'file' ? (
            <TouchableOpacity
              style={styles.fileMsg}
              onPress={() => downloadFile(item)}
              disabled={downloadProgress[item.id] !== undefined}
            >
              <View style={[
                styles.fileIcon,
                { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : themeColors.primary + '20' }
              ]}>
                {downloadProgress[item.id] !== undefined || uploadProgress[item.tempId || item.id] !== undefined ? (
                  <ActivityIndicator size="small" color={isMe ? '#fff' : themeColors.primary} />
                ) : (
                  <Ionicons
                    name="document-attach"
                    size={24}
                    color={isMe ? '#fff' : themeColors.primary}
                  />
                )}
              </View>
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: isMe ? '#fff' : themeColors.text.primary }]} numberOfLines={1}>
                  {item.content}
                </Text>
                {uploadProgress[item.tempId || item.id] !== undefined ? (
                  <View style={styles.downloadProgressContainer}>
                    <View style={[
                      styles.audioBar,
                      { marginHorizontal: 0, marginTop: 5, backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : themeColors.primary + '20' }
                    ]}>
                      <View style={[
                        styles.audioProgress,
                        {
                          width: `${uploadProgress[item.tempId || item.id] * 100}%`,
                          backgroundColor: isMe ? '#fff' : themeColors.primary
                        }
                      ]} />
                    </View>
                  </View>
                ) : downloadProgress[item.id] !== undefined ? (
                  <View style={styles.downloadProgressContainer}>
                    <View style={[
                      styles.audioBar,
                      { marginHorizontal: 0, marginTop: 5, backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : themeColors.primary + '20' }
                    ]}>
                      <View style={[
                        styles.audioProgress,
                        {
                          width: `${downloadProgress[item.id] * 100}%`,
                          backgroundColor: isMe ? '#fff' : themeColors.primary
                        }
                      ]} />
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.fileSize, { color: isMe ? 'rgba(255,255,255,0.7)' : '#999' }]}>
                    {item.file_size ? `${(item.file_size / 1024).toFixed(1)} KB • ` : ''}
                    {item.status === 'sending' ? 'Envoi...' : 'Appuyer pour télécharger'}
                  </Text>
                )}
              </View>
              {downloadProgress[item.id] === undefined && uploadProgress[item.tempId || item.id] === undefined && (
                <Ionicons
                  name={item.status === 'sending' ? "cloud-upload-outline" : "download-outline"}
                  size={20}
                  color={isMe ? '#fff' : themeColors.primary}
                />
              )}
            </TouchableOpacity>
          ) : (
            <View>
              <Text style={[
                styles.msgText,
                { color: isMe ? '#fff' : isDark ? '#fff' : '#000' },
                isDeleted && { fontStyle: 'italic', color: '#999' }
              ]}>
                {isDeleted ? `🚫 ${t?.('messageRemoved') || 'Ce message a été supprimé'}` : item.content}
              </Text>
              {item.translatedText && item.translatedText !== item.content && (
                <View style={[styles.translationContainer, { borderTopColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)' }]}>
                  <Text style={[styles.translatedText, { color: isMe ? 'rgba(255,255,255,0.9)' : isDark ? '#aaa' : '#555' }]}>
                    {item.translatedText}
                  </Text>
                  <Text style={styles.translationLabel}>{t?.('translatedFrom') || 'Traduit depuis'} {item.source_language || ''}</Text>
                </View>
              )}
            </View>
          )}
          <View style={styles.msgFooter}>
            <Text style={[styles.timeText, { color: isMe ? 'rgba(255,255,255,0.7)' : '#999' }]}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && (
              <Ionicons
                name={item.status === 'read' ? "checkmark-done" : "checkmark"}
                size={14}
                color={item.status === 'read' ? '#34B7F1' : 'rgba(255,255,255,0.5)'}
                style={{marginLeft: 5}}
              />
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
    );
  };

  if (!chatId) {
    return (
      <View style={{ flex: 1, backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  const isTablet = Dimensions.get('window').width > 768;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={{ height: insets.top, backgroundColor: themeColors.primary }} />
      <StatusBar barStyle="light-content" backgroundColor={themeColors.primary} />
      <View style={[styles.header, { backgroundColor: themeColors.primary }]}>
        {!isTablet && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.headerUserInfo}
          onPress={() => {
            if (!isGroup && peerUserId) {
              navigation.navigate('UserProfile', { userId: peerUserId, name, avatar });
            } else {
              navigation.navigate('GroupInfo', { chatId });
            }
          }}
        >
          <Image
            source={{ uri: getFullUrl(avatar) || `https://ui-avatars.com/api/?name=${name}` }}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
              {isVerified && (
                <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={styles.headerStatus} numberOfLines={1}>
              {isGroup
                ? (groupDetails?.participants?.map((p: any) => p.id === currentUser?.id ? 'Vous' : p.full_name.split(' ')[0]).join(', ') || '...')
                : (t?.('online') || 'En ligne')}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => {
              Alert.alert(
                t?.('settings') || 'Paramètres',
                null,
                [
                  { text: t?.('settings') || 'Paramètres', onPress: () => navigation.navigate('Settings') },
                  { text: t?.('profile') || 'Profil', onPress: () => navigation.navigate('EditProfile') },
                  { text: t?.('cancel') || 'Annuler', style: "cancel" }
                ]
              );
            }}
          >
            <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Indicateur de frappe */}
      {typingUsers.length > 0 && (
        <View style={{ position: 'absolute', top: normalize(60, fontSizeFactor) + insets.top, left: 0, right: 0, zIndex: 10, backgroundColor: themeColors.surface + 'EE', paddingHorizontal: 15, paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: themeColors.divider }}>
          <Text style={{ fontSize: normalize(12), color: themeColors.primary, fontStyle: 'italic' }}>
            {typingUsers.length === 1
              ? `${typingUsers[0].full_name} est en train d'écrire...`
              : `${typingUsers.length} personnes écrivent...`}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}
        style={{ flex: 1 }}
      >
        <ImageBackground source={{ uri: 'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png' }} style={styles.chatBg}>
          {loading ? <ActivityIndicator size="large" color={themeColors.primary} style={{marginTop: 20}} /> : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              contentContainerStyle={styles.list}
              ListHeaderComponent={<EncryptionNotice colors={themeColors} navigation={navigation} styles={styles} />}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          )}
        </ImageBackground>

        {!isContact && !loading && (
          <View style={[styles.unknownContactBar, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <Text style={[styles.unknownText, { color: themeColors.text.secondary }]}>
              Ce numéro n'est pas dans vos contacts.
            </Text>
            <View style={styles.unknownActions}>
              <TouchableOpacity
                style={[styles.unknownBtn, { borderColor: themeColors.danger }]}
                onPress={handleBlockUser}
              >
                <Text style={{ color: themeColors.danger, fontWeight: 'bold' }}>BLOQUER</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unknownBtn, { backgroundColor: themeColors.primary, borderWidth: 0 }]}
                onPress={handleAddContact}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>AJOUTER</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={[styles.inputContainer, { backgroundColor: themeColors.surface, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={[styles.inputBox, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
            {isRecording ? (
              <View style={styles.recordingIndicator}>
                <Ionicons name="mic" size={20} color={baseColors.danger} />
                <Text style={styles.recordingText}>{Math.floor(recordingDuration/60)}:{(recordingDuration%60).toString().padStart(2,'0')}</Text>
              </View>
            ) : (
              <TextInput
                style={[styles.textInput, { color: isDark ? '#fff' : '#000', fontSize: normalize(15) }]}
                placeholder={t?.('typeMessage') || 'Message'}
                placeholderTextColor={isDark ? '#999' : '#666'}
                value={inputText}
                onChangeText={handleInputChange}
                multiline
              />
            )}
            <TouchableOpacity style={styles.iconButton} onPress={handlePickDocument}>
              <Ionicons name="attach" size={24} color={isDark ? '#999' : '#666'} />
            </TouchableOpacity>
            {!inputText.trim() && !isRecording && (
              <TouchableOpacity style={styles.iconButton} onPress={handlePickImage}>
                <Ionicons name="camera" size={24} color={isDark ? '#999' : '#666'} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: themeColors.primary }, isRecording && { backgroundColor: themeColors.danger }]}
            onPress={inputText.trim() ? handleSendMessage : undefined}
            onLongPress={!inputText.trim() ? startRecording : undefined}
            onPressOut={() => isRecording && stopRecording()}
          >
            <Ionicons name={inputText.trim() ? "send" : (isRecording ? "stop" : "mic")} size={normalize(22)} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const EncryptionNotice = ({ colors, navigation, styles }: any) => (
  <View style={styles.encryptionBox}>
    <TouchableOpacity
      style={styles.encryptionInner}
      onPress={() => navigation.navigate('PrivacyPolicy')}
    >
      <Ionicons name="lock-closed" size={12} color="#888" style={{ marginRight: 5 }} />
      <Text style={styles.encryptionText}>
        Les messages sont chiffrés de bout en bout. Personne en dehors de cette discussion, pas même Meet Me, ne peut les lire. Appuyez pour en savoir plus.
      </Text>
    </TouchableOpacity>
  </View>
);

const createStyles = (colors: any, normalize: any, factor: number, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    height: normalize(60, factor),
  },
  backButton: { padding: 5 },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 5
  },
  avatar: { width: normalize(38, factor), height: normalize(38, factor), borderRadius: normalize(19, factor), marginRight: 10 },
  headerName: { color: '#fff', fontSize: normalize(16, factor), fontWeight: 'bold', maxWidth: width * 0.4 },
  headerStatus: { color: 'rgba(255,255,255,0.7)', fontSize: normalize(11, factor) },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { padding: 8, marginLeft: 2 },
  chatBg: { flex: 1, backgroundColor: '#E5DDD5' },
  list: { padding: 10 },
  messageRow: { flexDirection: 'row', marginVertical: 4 },
  bubble: { maxWidth: '85%', padding: 10, borderRadius: 18, elevation: 1 },
  msgText: { fontSize: normalize(15, factor) },
  imageMsg: { width: width * 0.7, height: width * 0.7, borderRadius: 10, marginBottom: 5 },
  msgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 },
  timeText: { fontSize: normalize(9, factor) },
  audioMsg: { flexDirection: 'row', alignItems: 'center', minWidth: 160, paddingVertical: 5 },
  audioBar: { flex: 1, height: 3, backgroundColor: 'rgba(0,0,0,0.1)', marginHorizontal: 10, borderRadius: 2, justifyContent: 'center', overflow: 'hidden' },
  audioProgress: { height: '100%' },
  fileMsg: { flexDirection: 'row', alignItems: 'center', padding: 10, minWidth: 200 },
  fileIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: normalize(14), fontWeight: 'bold' },
  fileSize: { fontSize: normalize(10), marginTop: 2 },
  downloadProgressContainer: { width: '100%', marginTop: 5 },
  translationContainer: { marginTop: 5, paddingTop: 5, borderTopWidth: 1 },
  translatedText: { fontSize: normalize(15, factor), fontStyle: 'italic' },
  translationLabel: { fontSize: normalize(10, factor), color: '#999', marginTop: 2, textAlign: 'right' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 8 },
  inputBox: { flex: 1, flexDirection: 'row', borderRadius: 25, paddingHorizontal: 15, minHeight: normalize(45, factor), marginRight: 8, alignItems: 'center' },
  textInput: { flex: 1, paddingVertical: 10 },
  recordingIndicator: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  recordingText: { marginLeft: 10, color: baseColors.danger, fontWeight: 'bold' },
  iconButton: { padding: 5 },
  sendBtn: { width: normalize(48, factor), height: normalize(48, factor), borderRadius: normalize(24, factor), justifyContent: 'center', alignItems: 'center' },
  msgAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8, alignSelf: 'flex-end', marginBottom: 4 },
  senderName: { fontSize: 11, fontWeight: 'bold', marginBottom: 2, marginLeft: 4 },
  encryptionBox: { padding: 15, alignItems: 'center' },
  encryptionInner: { backgroundColor: 'rgba(255,255,200,0.6)', padding: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', maxWidth: '90%' },
  encryptionText: { fontSize: normalize(11, factor), color: '#555', textAlign: 'center', flex: 1 },
  unknownContactBar: { padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', alignItems: 'center' },
  unknownText: { fontSize: normalize(13, factor), marginBottom: 10, textAlign: 'center' },
  unknownActions: { flexDirection: 'row', justifyContent: 'center' },
  unknownBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginHorizontal: 5 },
});
