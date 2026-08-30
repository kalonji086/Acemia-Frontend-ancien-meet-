import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Share,
  Modal,
} from 'react-native';
import {
  Send, Mic, Camera, Paperclip, Download, Share as ShareIcon,
  Trash2, Undo, Heart, Languages, Sparkles, MessageSquare,
  Video, Phone, MoreVertical, ArrowLeft
} from 'lucide-react-native';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import callService from '../services/call.service';
import { PRESET_WALLPAPERS } from '../utils/wallpapers';

const { width, height } = Dimensions.get('window');

// Composant interne optimisé pour chaque message
const MessageItem = React.memo(({
  item, isMe, isGroup, sender, currentUser, themeColors, isDark, normalize,
  getFullUrl, handleMessageLongPress, playAudio, playingId, playbackStatus,
  downloadFile, downloadProgress, uploadProgress, t, onTranslate, onLike, chatColor, styles
}: any) => {
  const [isTranslatingLocal, setIsTranslatingLocal] = useState(false);
  const isDeleted = item.content && item.content.includes('Ce message a été supprimé');
  const isLiked = item.likes && item.likes.includes(currentUser?.id);

  const onTranslatePress = async () => {
    setIsTranslatingLocal(true);
    await onTranslate(item);
    setIsTranslatingLocal(false);
  };

  const lastTap = useRef<number>(0);
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      onLike(item.id);
    }
    lastTap.current = now;
  };

  const bubbleStyle = useMemo(() => [
    styles.bubble,
    isMe
      ? { backgroundColor: chatColor || themeColors.primary, borderBottomRightRadius: 4 }
      : { backgroundColor: themeColors.surface, borderBottomLeftRadius: 4 },
    isDeleted && { backgroundColor: isDark ? '#222' : '#f0f0f0', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' }
  ], [isMe, chatColor, themeColors.primary, themeColors.surface, isDeleted, isDark]);

  return (
    <View style={[styles.messageRow, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
      {!isMe && isGroup && sender && (
        <Image
          source={{ uri: (getFullUrl(sender.avatar_url) || `https://ui-avatars.com/api/?name=${sender.full_name}`) || undefined }}
          style={styles.msgAvatar}
          resizeMode="cover"
        />
      )}
      <View style={{ maxWidth: '85%' }}>
        {!isMe && isGroup && sender && (
          <Text style={[styles.senderName, { color: themeColors.primary }]}>{sender.full_name}</Text>
        )}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleDoubleTap}
          onLongPress={() => handleMessageLongPress(item)}
          disabled={isDeleted}
          style={bubbleStyle}
        >
          {item.isForwarded && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
              <Undo size={10} color={isMe ? 'rgba(255,255,255,0.7)' : '#999'} style={{ transform: [{ rotate: '180deg' }] }} />
              <Text style={{ fontSize: 10, fontStyle: 'italic', marginLeft: 4, color: isMe ? 'rgba(255,255,255,0.7)' : '#999' }}>Transféré</Text>
            </View>
          )}

          {item.type === 'audio' ? (
            <View style={styles.audioContainer}>
              <TouchableOpacity style={styles.audioMsg} onPress={() => playAudio(item)}>
                {playingId === item.id && playbackStatus[item.id]?.isPlaying
                  ? <Undo size={22} color={isMe ? '#fff' : themeColors.primary} /> // Simulation pause
                  : <Mic size={22} color={isMe ? '#fff' : themeColors.primary} />
                }
                <View style={styles.audioMainContent}>
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
                </View>
              </TouchableOpacity>
            </View>
          ) : item.type === 'image' ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: (item.localUri || getFullUrl(item.file_url || item.fileUrl)) || undefined }}
                style={styles.imageMsg}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.downloadOverlay}
                onPress={() => downloadFile(item)}
              >
                <Download size={20} color="#fff" />
              </TouchableOpacity>
            </View>
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
                {downloadProgress[item.id] !== undefined ? (
                  <ActivityIndicator size="small" color={isMe ? '#fff' : themeColors.primary} />
                ) : (
                  <Paperclip size={20} color={isMe ? '#fff' : themeColors.primary} />
                )}
              </View>
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: isMe ? '#fff' : themeColors.text.primary }]} numberOfLines={1}>
                  {item.content}
                </Text>
                <Text style={[styles.fileSize, { color: isMe ? 'rgba(255,255,255,0.7)' : '#999' }]}>
                   Appuyer pour télécharger
                </Text>
              </View>
              <Download size={16} color={isMe ? 'rgba(255,255,255,0.7)' : '#999'} style={{ marginLeft: 5 }} />
            </TouchableOpacity>
          ) : item.type === 'call' ? (
            <View style={styles.callLogContainer}>
               <View style={[styles.callLogIcon, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : themeColors.primary + '15' }]}>
                  {item.metadata?.callType === 'video' ? <Video size={16} color={isMe ? '#fff' : themeColors.primary} /> : <Phone size={16} color={isMe ? '#fff' : themeColors.primary} />}
               </View>
               <View style={styles.callLogInfo}>
                  <Text style={[styles.callLogText, { color: isMe ? '#fff' : themeColors.text.primary }]}>
                    {item.content}
                  </Text>
               </View>
            </View>
          ) : (
            <View>
              <Text style={[
                styles.msgText,
                { color: isMe ? '#fff' : isDark ? '#fff' : '#000' },
                isDeleted && { fontStyle: 'italic', color: '#999' }
              ]}>
                {isDeleted ? `🚫 ${t?.('messageRemoved') || 'Ce message a été supprimé'}` : (item.translatedText || item.content)}
              </Text>
            </View>
          )}

          <View style={styles.msgFooter}>
            <Text style={[styles.timeText, { color: isMe ? 'rgba(255,255,255,0.7)' : '#999' }]}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && (
               <Text style={{ fontSize: 10, color: item.status === 'read' ? '#34B7F1' : 'rgba(255,255,255,0.5)', marginLeft: 4 }}>
                 {item.status === 'read' ? '✓✓' : '✓'}
               </Text>
            )}
          </View>

          {item.likes && item.likes.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                const count = item.likes.length;
                Alert.alert('Likes', `${count} personne${count > 1 ? 's ont' : ' a'} liké ce message.`);
              }}
              style={[styles.likeContainer, { backgroundColor: isMe ? 'rgba(255,255,255,0.9)' : themeColors.surface }]}
            >
              <Heart size={10} fill="#e91e63" color="#e91e63" />
              {item.likes.length > 1 && <Text style={styles.likeCount}>{item.likes.length}</Text>}
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function ChatScreen({ navigation, route }: any) {
  const { isDark, colors: themeColors, normalize, fontSizeFactor } = useTheme();
  const { t, language, autoTranslate } = useLanguage();
  const { chatId, name = 'Inconnu', avatar, isVerified: initialIsVerified, peerUserId, type } = route.params || {};
  const isGroup = type === 'group' || !peerUserId;

  const [messages, setMessages] = useState<any[]>([]);
  const [isVerified, setIsVerified] = useState(initialIsVerified);
  const [peerStatus, setPeerStatus] = useState<string>(initialIsVerified ? 'online' : 'offline');
  const [peerLastSeen, setPeerLastSeen] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string>(name);
  const [peerAvatar, setPeerAvatar] = useState<string | null>(avatar);
  const [chatBg, setChatBg] = useState<any>(null);
  const [chatColor, setChatColor] = useState<string | null>(null);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [messageToForward, setMessageToForward] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
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
  const [playbackStatus, setPlaybackStatus] = useState<any>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [typingUsers, setTypingUsers] = useState<any[]>([]);

  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const timerRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);

  const getFullUrl = useCallback((url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;
    const baseUrl = SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${path}`;
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;
    try {
      const response = await apiService.getMessages(chatId);
      if (response.success && Array.isArray(response.data)) {
        setMessages(response.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    if (!chatId) {
      navigation.goBack();
      return;
    }

    const setup = async () => {
      try {
        const user = await apiService.getCurrentUser();
        setCurrentUser(user);
        await fetchMessages();

        const bg = await AsyncStorage.getItem(`chat_bg_${chatId}`);
        const color = await AsyncStorage.getItem(`chat_color_${chatId}`);
        if (bg) {
          // Vérifier si c'est un preset ou une URI d'image
          const preset = PRESET_WALLPAPERS.find(p => p.id === bg);
          if (preset) setChatBg(preset.image);
          else setChatBg({ uri: bg });
        } else {
          setChatBg(PRESET_WALLPAPERS[0].image); // Défaut
        }
        if (color) setChatColor(color);

        await apiService.markMessagesAsRead(chatId);
        if (isGroup) {
          const res = await apiService.getChat(chatId);
          if (res.success) setGroupDetails(res.data);
        } else if (peerUserId) {
          const res = await apiService.getUserById(peerUserId);
          if (res.success) {
            setPeerStatus(res.data.status);
            setPeerLastSeen(res.data.last_seen);
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
          setMessages(current => {
            // Éviter les doublons si on a déjà fait la mise à jour optimiste
            if (current.some(m => m.id === payload.new.id)) return current;

            // Si on a un message temporaire pour cet utilisateur avec le même contenu, on le remplace
            const existingTemp = current.find(m => m.status === 'sending' && m.sender_id === payload.new.sender_id && m.content === payload.new.content);
            if (existingTemp) {
              return current.map(m => m.id === existingTemp.id ? payload.new : m);
            }

            return [...current, payload.new];
          });
        } else if (payload.event === 'UPDATE') {
          setMessages(current => current.map(m => m.id === payload.new.id ? payload.new : m));
        } else if (payload.event === 'DELETE') {
          setMessages(current => current.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe((status) => {
        console.log(`Supabase Realtime status for chat ${chatId}:`, status);
      });

    const onUserTyping = (data: any) => {
      if (data.chatId === chatId && data.userId !== currentUser?.id) {
        const user = isGroup
          ? groupDetails?.participants?.find((p: any) => p.id === data.userId)
          : { id: data.userId, full_name: peerName, avatar_url: peerAvatar };
        if (user) setTypingUsers(prev => prev.some(u => u.id === user.id) ? prev : [...prev, user]);
      }
    };

    const onUserStoppedTyping = (data: any) => {
      if (data.chatId === chatId) setTypingUsers(prev => prev.filter(u => u.id !== data.userId));
    };

    const onUserStatusChanged = (data: any) => {
      if (data.userId === peerUserId) {
        setPeerStatus(data.status);
        if (data.status !== 'online') setPeerLastSeen(new Date().toISOString());
      }
    };

    const onProfileUpdated = (data: any) => {
      if (data.userId === peerUserId) {
        if (data.full_name) setPeerName(data.full_name);
        if (data.avatar_url) setPeerAvatar(data.avatar_url);
      }
    };

    const onMessageReaction = (data: any) => {
      setMessages(current => current.map(m =>
        m.id === data.messageId ? { ...m, likes: data.likes } : m
      ));
    };

    socketService.on('user_typing', onUserTyping);
    socketService.on('user_stopped_typing', onUserStoppedTyping);
    socketService.on('user_status_changed', onUserStatusChanged);
    socketService.on('admin_user_profile_updated', onProfileUpdated);
    socketService.on('message_reaction', onMessageReaction);
    socketService.joinChat(chatId);

    return () => {
      supabase.removeChannel(subscription);
      socketService.off('user_typing', onUserTyping);
      socketService.off('user_stopped_typing', onUserStoppedTyping);
      socketService.off('user_status_changed', onUserStatusChanged);
      socketService.off('admin_user_profile_updated', onProfileUpdated);
      socketService.off('message_reaction', onMessageReaction);
      socketService.leaveChat(chatId);
      if (timerRef.current) clearInterval(timerRef.current);
      if (sound) sound.unloadAsync();
    };
  }, [chatId, currentUser?.id, groupDetails, peerUserId, peerName, peerAvatar, fetchMessages]);

  const handleTranslateMessageIA = useCallback(async (message: any) => {
    const targetLang = currentUser?.preferred_language || 'fr';
    try {
      let res;
      if (message.type === 'audio') res = await apiService.translateVoiceMessage(message.id, targetLang);
      else res = await apiService.translateMessage(message.id, targetLang);

      if (res.success) {
        setMessages(prev => prev.map(m => m.id === message.id ? { ...m, translatedText: res.data.translatedText || res.data.translated_text, transcription: res.data.transcription } : m));
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || !currentUser) return;
    const content = inputText;
    setInputText('');

    // Optimistic Update: Add message locally immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      chat_id: chatId,
      sender_id: currentUser.id,
      content: content,
      type: 'text',
      status: 'sending',
      created_at: new Date().toISOString(),
      tempId: tempId
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const response = await apiService.sendMessage(chatId, content);
      if (!response.success) {
        Alert.alert('Erreur', 'Impossible d\'envoyer le message');
        // Optionnel: marquer le message comme échoué
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
      } else {
        // Le message sera mis à jour via l'événement INSERT de Supabase ou Socket
        // On peut aussi le mettre à jour ici pour plus de réactivité
        setMessages(prev => prev.map(m => m.id === tempId ? { ...response.data, status: 'sent' } : m));
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
    }
  }, [chatId, inputText, currentUser]);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Vous devez autoriser l\'accès au micro pour envoyer des messages vocaux.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement vocal. Vérifiez vos paramètres.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    clearInterval(timerRef.current);
    const duration = recordingDuration;
    try {
      await recording.stopAndUnloadAsync();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      setRecording(null);
      if (uri && currentUser) {
        const uploadRes = await apiService.uploadFile({ uri, type: 'audio/m4a', name: 'voice.m4a' }, 'audio');
        if (uploadRes.success) {
          await apiService.sendMessage(chatId, t?.('audio') || 'Message vocal', 'audio', uploadRes.data.fileUrl, { duration });
        }
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      setRecording(null);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled && result.assets && result.assets[0]) {
        const doc = result.assets[0];
        const uploadRes = await apiService.uploadFile({ uri: doc.uri, type: doc.mimeType, name: doc.name }, 'document');
        if (uploadRes.success) {
          await apiService.sendMessage(chatId, doc.name, 'file', uploadRes.data.fileUrl);
        }
      }
    } catch (error) { console.error(error); }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      if (!result.canceled && result.assets && result.assets[0]) {
        const img = result.assets[0];
        const uploadRes = await apiService.uploadFile({ uri: img.uri, type: 'image/jpeg', name: 'photo.jpg' }, 'image');
        if (uploadRes.success) {
          await apiService.sendMessage(chatId, 'Image', 'image', uploadRes.data.fileUrl);
        }
      }
    } catch (error) { console.error(error); }
  };

  const playAudio = useCallback(async (message: any) => {
    const audioSource = message.localUri || getFullUrl(message.file_url || message.fileUrl);
    if (!audioSource) return;
    try {
      if (playingId === message.id && sound) {
        const status: any = await sound.getStatusAsync();
        if (status.isPlaying) await sound.pauseAsync();
        else await sound.playAsync();
        return;
      }
      if (sound) await sound.unloadAsync();
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioSource },
        { shouldPlay: true },
        (status) => {
          setPlaybackStatus((prev: any) => ({ ...prev, [message.id]: status }));
          if ((status as any).didJustFinish) setPlayingId(null);
        }
      );
      setSound(newSound);
      setPlayingId(message.id);
    } catch (error) {
      console.error(error);
    }
  }, [playingId, sound, getFullUrl]);

  const downloadFile = useCallback(async (message: any) => {
    const url = getFullUrl(message.file_url || message.fileUrl);
    if (!url) return;
    try {
      // Déterminer un nom de fichier unique basé sur l'ID du message
      const extension = url.split('.').pop()?.split('?')[0] || 'file';
      const fileName = `chat_${message.id}.${extension}`;
      const fileUri = (FileSystem.documentDirectory || '') + fileName;

      // Vérifier si le fichier existe déjà
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await Sharing.shareAsync(fileUri);
        return;
      }

      setDownloadProgress(prev => ({ ...prev, [message.id]: 0.1 }));
      const downloadResumable = FileSystem.createDownloadResumable(url, fileUri, {}, (p) => {
        setDownloadProgress(prev => ({ ...prev, [message.id]: p.totalBytesWritten / p.totalBytesExpectedToWrite }));
      });
      const res = await downloadResumable.downloadAsync();
      if (res) {
        setDownloadProgress(prev => { const n = {...prev}; delete n[message.id]; return n; });
        await Sharing.shareAsync(res.uri);
      }
    } catch (e) {
      console.error(e);
      setDownloadProgress(prev => { const n = {...prev}; delete n[message.id]; return n; });
    }
  }, [getFullUrl]);

  // Système de téléchargement automatique
  useEffect(() => {
    const autoDownload = async () => {
      const messagesToDownload = messages.filter(m =>
        (m.type === 'audio' || m.type === 'file') &&
        m.status !== 'sending' &&
        !m.localUri
      );

      for (const msg of messagesToDownload) {
        const url = getFullUrl(msg.file_url || msg.fileUrl);
        if (!url) continue;

        const extension = url.split('.').pop()?.split('?')[0] || (msg.type === 'audio' ? 'm4a' : 'file');
        const fileName = `auto_${msg.id}.${extension}`;
        const fileUri = (FileSystem.documentDirectory || '') + fileName;

        try {
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          if (!fileInfo.exists) {
            console.log(`Auto-downloading: ${fileName}`);
            const res = await FileSystem.downloadAsync(url, fileUri);
            if (res.status === 200) {
              setMessages(current => current.map(m =>
                m.id === msg.id ? { ...m, localUri: res.uri } : m
              ));
            }
          } else {
            // Déjà téléchargé, mettre à jour le localUri si nécessaire
            if (msg.localUri !== fileInfo.uri) {
              setMessages(current => current.map(m =>
                m.id === msg.id ? { ...m, localUri: fileInfo.uri } : m
              ));
            }
          }
        } catch (err) {
          console.warn('Auto-download failed for:', fileName, err);
        }
      }
    };

    if (messages.length > 0) {
      autoDownload();
    }
  }, [messages.length, getFullUrl]);

  const handleLikeMessage = useCallback(async (messageId: string) => {
    try {
      const res = await apiService.reactToMessage(messageId);
      if (res.success) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, likes: res.data.likes } : m));
      }
    } catch (e) { console.error(e); }
  }, []);

  const handleMessageLongPress = useCallback((item: any) => {
    const isMe = item.sender_id === currentUser?.id;
    if (item.content?.includes('Ce message a été supprimé')) return;
    const options = [
      { text: t?.('cancel') || 'Annuler', style: 'cancel' },
      { text: (item.likes && item.likes.includes(currentUser?.id)) ? 'Retirer Like' : 'Liker', onPress: () => handleLikeMessage(item.id) },
      { text: 'Transférer', onPress: () => { setMessageToForward(item); setIsForwarding(true); apiService.searchUsers('').then(res => res.success && setContacts(res.data)); } },
      { text: 'Partager', onPress: () => Share.share({ message: item.content }) }
    ];
    if (isMe) options.push({ text: t?.('delete') || 'Supprimer', style: 'destructive', onPress: () => handleDeleteMessage(item.id) });
    Alert.alert('Options', null, options as any);
  }, [currentUser?.id, t, handleLikeMessage]);

  const handleDeleteMessage = async (messageId: string) => {
    Alert.alert(
      "Supprimer le message",
      "Voulez-vous supprimer ce message pour tout le monde ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer pour moi",
          onPress: async () => {
            const res = await apiService.deleteMessage(messageId, 'me');
            if (res.success) setMessages(prev => prev.filter(m => m.id !== messageId));
          }
        },
        {
          text: "Supprimer pour tous",
          style: "destructive",
          onPress: async () => {
            const res = await apiService.deleteMessage(messageId, 'everyone');
            if (res.success) {
               // Le message sera mis à jour via Socket/Supabase, mais on peut forcer localement
               setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: '🚫 Ce message a été supprimé', type: 'text', file_url: null } : m));
            }
          }
        }
      ]
    );
  };

  const styles = useMemo(() => createStyles(themeColors, normalize, fontSizeFactor, isDark), [themeColors, normalize, fontSizeFactor, isDark]);

  const renderMessage = useCallback(({ item }: any) => {
    const isMe = item.sender_id === currentUser?.id;
    const sender = isGroup ? groupDetails?.participants?.find((p: any) => p.id === item.sender_id) : null;
    return (
      <MessageItem
        item={item} isMe={isMe} isGroup={isGroup} sender={sender} currentUser={currentUser}
        themeColors={themeColors} isDark={isDark} normalize={normalize} getFullUrl={getFullUrl}
        handleMessageLongPress={handleMessageLongPress} playAudio={playAudio} playingId={playingId}
        playbackStatus={playbackStatus} downloadFile={downloadFile} downloadProgress={downloadProgress}
        uploadProgress={uploadProgress} t={t} onTranslate={handleTranslateMessageIA}
        onLike={handleLikeMessage}
        chatColor={chatColor} styles={styles}
      />
    );
  }, [currentUser, isGroup, groupDetails, themeColors, isDark, normalize, getFullUrl, handleMessageLongPress, playAudio, playingId, playbackStatus, downloadFile, downloadProgress, uploadProgress, t, handleTranslateMessageIA, handleLikeMessage, chatColor, styles]);

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < oneDay && now.getDate() === date.getDate()) return `Vu aujourd'hui à ${time}`;
    if (diff < 2 * oneDay && now.getDate() - date.getDate() === 1) return `Vu hier à ${time}`;
    return `Vu le ${date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })} à ${time}`;
  };

  const onProfileRetouch = (uri: string) => {
    // Simuler une "retouche" ou un filtrage léger pour améliorer l'affichage
    // En React Native, on peut appliquer des transformations ou utiliser des bibliothèques de filtres
    // Ici, on s'assure simplement que l'URI est valide et formatée
    return uri;
  };

  const handlePickChatBg = async () => {
    Alert.alert(
      "Fond d'écran",
      "Choisissez une option",
      [
        { text: "Galerie", onPress: () => handlePickFromGallery() },
        { text: "Fonds prédéfinis", onPress: () => setShowWallpaperModal(true) },
        { text: "Défaut", onPress: () => handleSelectPreset('default') },
        { text: "Annuler", style: "cancel" }
      ]
    );
  };

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setChatBg({ uri });
      await AsyncStorage.setItem(`chat_bg_${chatId}`, uri);
    }
  };

  const handleSelectPreset = async (id: string) => {
    const preset = PRESET_WALLPAPERS.find(p => p.id === id);
    if (preset) {
      setChatBg(preset.image);
      await AsyncStorage.setItem(`chat_bg_${chatId}`, id);
      setShowWallpaperModal(false);
    }
  };

  const handleChangeChatColor = () => {
    const colorChoices = [
      { name: 'Meet Me', value: baseColors.primary },
      { name: 'Océan', value: '#007AFF' },
      { name: 'Émeraude', value: '#2ecc71' },
      { name: 'Soleil', value: '#f1c40f' },
      { name: 'Rose', value: '#e91e63' },
      { name: 'Violet', value: '#9b59b6' },
      { name: 'Orange', value: '#e67e22' },
      { name: 'Gris', value: '#607d8b' },
      { name: 'Noir', value: '#000000' }
    ];

    Alert.alert(
      "Couleur du chat",
      "Choisissez une couleur",
      colorChoices.map(c => ({
        text: c.name,
        onPress: async () => {
          setChatColor(c.value);
          await AsyncStorage.setItem(`chat_color_${chatId}`, c.value);
        }
      })).concat([{ text: "Annuler", style: "cancel" }]) as any
    );
  };

  const handleArchiveChat = async () => {
    try {
      const res = await apiService.archiveChat(chatId);
      if (res.success) {
        Alert.alert('Succès', 'Discussion archivée');
        navigation.goBack();
      }
    } catch (e) { console.error(e); }
  };

  const initiateAudioCall = () => {
    if (!peerUserId || !currentUser) return;
    callService.startCall(peerUserId, peerName, peerAvatar || '', 'audio');
  };

  const initiateVideoCall = () => {
    if (!peerUserId || !currentUser) return;
    callService.startCall(peerUserId, peerName, peerAvatar || '', 'video');
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={{ height: insets.top, backgroundColor: themeColors.primary }} />
      <StatusBar barStyle="light-content" backgroundColor={themeColors.primary} translucent />
      <View style={[styles.header, { backgroundColor: themeColors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><ArrowLeft size={24} color="#fff" /></TouchableOpacity>
        <TouchableOpacity style={styles.headerUserInfo} onPress={() => isGroup ? navigation.navigate('GroupInfo', { chatId }) : navigation.navigate('UserProfile', { userId: peerUserId, name: peerName, avatar: peerAvatar })}>
          <Image
            source={{ uri: onProfileRetouch((getFullUrl(peerAvatar || '') || `https://ui-avatars.com/api/?name=${peerName}`)) || undefined }}
            style={styles.avatar}
            resizeMode="cover"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>{peerName}</Text>
            <Text style={styles.headerStatus} numberOfLines={1}>{peerStatus === 'online' ? 'En ligne' : (peerStatus || 'Hors ligne')}</Text>
          </View>
        </TouchableOpacity>

        {/* Call Buttons - MASQUÉS TEMPORAIREMENT
        {!isGroup && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={initiateVideoCall} style={styles.headerIcon}><Video size={22} color="#fff" /></TouchableOpacity>
            <TouchableOpacity onPress={initiateAudioCall} style={styles.headerIcon}><Phone size={20} color="#fff" /></TouchableOpacity>
          </View>
        )}
        */}

        <TouchableOpacity onPress={() => Alert.alert('Options', null, [{ text: 'Fond d\'écran', onPress: handlePickChatBg }, { text: 'Couleur', onPress: handleChangeChatColor }, { text: 'Archiver', onPress: () => handleArchiveChat() }, { text: 'Annuler', style: 'cancel' }])} style={styles.headerIcon}><MoreVertical size={22} color="#fff" /></TouchableOpacity>
      </View>

      {/* Indicateur de frappe */}
      {typingUsers.length > 0 && (
        <View style={{ backgroundColor: themeColors.surface + 'EE', paddingHorizontal: 15, paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: themeColors.divider }}>
          <Text style={{ fontSize: normalize(12), color: themeColors.primary, fontStyle: 'italic' }}>
            {typingUsers.length === 1 ? `${typingUsers[0].full_name} est en train d'écrire...` : `${typingUsers.length} personnes écrivent...`}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ImageBackground source={chatBg} style={[styles.chatBg, { backgroundColor: themeColors.background }]}>
          {loading ? <ActivityIndicator size="large" color={themeColors.primary} style={{marginTop: 20}} /> : (
            <FlatList
              ref={flatListRef} data={messages} renderItem={renderMessage}
              keyExtractor={(item) => item.id?.toString()} contentContainerStyle={styles.list}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />
          )}
        </ImageBackground>

        <View style={[styles.inputContainer, { backgroundColor: themeColors.surface, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={[styles.inputBox, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
            {isRecording ? (
              <View style={styles.recordingIndicator}>
                <Mic size={20} color={baseColors.danger} />
                <Text style={styles.recordingText}>{Math.floor(recordingDuration/60)}:{(recordingDuration%60).toString().padStart(2,'0')}</Text>
              </View>
            ) : (
              <TextInput
                style={[styles.textInput, { color: isDark ? '#fff' : '#000', fontSize: normalize(15) }]}
                placeholder={t?.('typeMessage') || 'Message'}
                placeholderTextColor={isDark ? '#999' : '#666'}
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
            )}
            <TouchableOpacity style={styles.iconButton} onPress={handlePickDocument}>
              <Paperclip size={24} color={isDark ? '#999' : '#666'} />
            </TouchableOpacity>
            {!inputText.trim() && !isRecording && (
              <TouchableOpacity style={styles.iconButton} onPress={handlePickImage}>
                <Camera size={24} color={isDark ? '#999' : '#666'} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: themeColors.primary }, isRecording && { backgroundColor: themeColors.danger }]}
            onPress={inputText.trim() ? handleSendMessage : () => !isRecording && Alert.alert('Aide', 'Maintenez le bouton micro enfoncé pour enregistrer un message vocal.')}
            onLongPress={!inputText.trim() ? startRecording : undefined}
            delayLongPress={150}
            onPressOut={() => isRecording && stopRecording()}
          >
            {inputText.trim() ? <Send size={22} color="#fff" /> : (isRecording ? <Undo size={22} color="#fff" /> : <Mic size={22} color="#fff" />)}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {isForwarding && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, justifyContent: 'flex-end' }]}>
          <View style={[styles.forwardContainer, { backgroundColor: themeColors.surface }]}>
            <Text style={styles.forwardTitle}>Transférer à...</Text>
            <FlatList data={contacts} keyExtractor={(item) => item.id} renderItem={({ item }) => (
              <TouchableOpacity style={styles.forwardUserItem} onPress={async () => { const r = await apiService.createChat([item.id]); if (r.success) { await apiService.sendMessage(r.data.id, messageToForward.content, messageToForward.type); setIsForwarding(false); Alert.alert('Succès', 'Transféré'); } }}>
                <Text style={{ color: themeColors.text.primary }}>{item.full_name}</Text>
              </TouchableOpacity>
            )} />
            <TouchableOpacity onPress={() => setIsForwarding(false)} style={styles.closeBtn}><Text style={{ color: themeColors.primary }}>Annuler</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal de sélection de fond d'écran */}
      <Modal visible={showWallpaperModal} transparent animationType="slide" onRequestClose={() => setShowWallpaperModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Fonds d'écran</Text>
            <FlatList
              data={PRESET_WALLPAPERS}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleSelectPreset(item.id)} style={styles.wallpaperOption}>
                  <Image source={item.image} style={styles.wallpaperThumb} />
                  <Text style={styles.wallpaperName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setShowWallpaperModal(false)} style={styles.closeBtn}><Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>Fermer</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any, normalize: any, factor: number, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: width > 768 ? normalize(80, factor) : normalize(65, factor)
  },
  backButton: { padding: 5 },
  headerUserInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 5 },
  avatar: {
    width: width > 768 ? 48 : normalize(38, factor),
    height: width > 768 ? 48 : normalize(38, factor),
    borderRadius: width > 768 ? 24 : normalize(19, factor),
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden'
  },
  headerName: { color: '#fff', fontSize: width > 768 ? normalize(18, factor) : normalize(15, factor), fontWeight: 'bold' },
  headerStatus: { color: 'rgba(255,255,255,0.85)', fontSize: width > 768 ? normalize(12, factor) : normalize(10, factor) },
  headerIcon: { padding: 6 },
  chatBg: { flex: 1 },
  list: { padding: 10 },
  messageRow: { flexDirection: 'row', marginVertical: 2 },
  bubble: { maxWidth: '85%', padding: 10, borderRadius: 15 },
  msgText: { fontSize: normalize(15, factor) },
  imageContainer: { width: width * 0.7, height: width * 0.7, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  imageMsg: { width: '100%', height: '100%' },
  downloadOverlay: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  msgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 },
  timeText: { fontSize: normalize(8, factor) },
  audioMsg: { flexDirection: 'row', alignItems: 'center', minWidth: 200, paddingVertical: 5 },
  audioContainer: { flex: 1 },
  audioMainContent: { flex: 1, marginHorizontal: 10 },
  audioBar: { height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, marginBottom: 4 },
  audioProgress: { height: '100%', borderRadius: 2 },
  audioDetails: { flexDirection: 'row', justifyContent: 'flex-start' },
  audioDuration: { fontSize: 10, fontWeight: '500' },
  audioIconWrapper: { paddingLeft: 5 },
  fileMsg: { flexDirection: 'row', alignItems: 'center', padding: 5 },
  fileIcon: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: normalize(12, factor), fontWeight: 'bold' },
  fileSize: { fontSize: normalize(9, factor) },
  translationContainer: { borderTopWidth: 0.5, paddingTop: 5 },
  translatedText: { fontSize: normalize(14, factor) },
  translationLabel: { fontSize: normalize(9, factor), color: '#999' },
  inlineTranslateBtn: { flexDirection: 'row', alignItems: 'center' },
  inlineTranslateText: { fontSize: 9, fontWeight: 'bold', marginLeft: 5 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 8 },
  inputBox: { flex: 1, flexDirection: 'row', borderRadius: 25, paddingHorizontal: 15, minHeight: normalize(45, factor), marginRight: 8, alignItems: 'center' },
  textInput: { flex: 1, paddingVertical: 10 },
  recordingIndicator: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  recordingText: { marginLeft: 10, color: baseColors.danger, fontWeight: 'bold' },
  iconButton: { padding: 5 },
  sendBtn: { width: normalize(48, factor), height: normalize(48, factor), borderRadius: normalize(24, factor), justifyContent: 'center', alignItems: 'center' },
  msgAvatar: {
    width: normalize(32, factor),
    height: normalize(32, factor),
    borderRadius: normalize(16, factor),
    marginRight: 8,
    alignSelf: 'flex-end',
    backgroundColor: '#eee'
  },
  senderName: { fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  forwardContainer: { height: height * 0.5, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  forwardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  forwardUserItem: { paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  closeBtn: { marginTop: 15, alignItems: 'center' },
  likeContainer: { position: 'absolute', bottom: -10, right: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1 },
  likeCount: { fontSize: 9, fontWeight: 'bold', marginLeft: 3, color: '#e91e63' },
  callLogContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 2 },
  callLogIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  callLogInfo: { flex: 1 },
  callLogText: { fontSize: normalize(13, factor), fontWeight: '600' },
  callLogTime: { fontSize: normalize(9, factor), marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  wallpaperOption: { marginRight: 15, alignItems: 'center' },
  wallpaperThumb: { width: 100, height: 180, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  wallpaperName: { marginTop: 8, fontSize: 12, fontWeight: '500' }
});
