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
import { SOCKET_URL } from '../utils/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import * as Notifications from 'expo-notifications';

const { width } = Dimensions.get('window');

export default function ChatScreen({ navigation, route }: any) {
  const { isDark, colors: themeColors, normalize, fontSizeFactor } = useTheme();
  const { t } = useLanguage();
  const { chatId, name = 'Inconnu', avatar, isVerified: initialIsVerified } = route.params || {};
  const [messages, setMessages] = useState<any[]>([]);
  const [isVerified, setIsVerified] = useState(initialIsVerified);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playedMessages, setPlayedMessages] = useState<Set<string>>(new Set());

  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const timerRef = useRef<any>(null);

  const getFullUrl = (url: string) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;
    return `${SOCKET_URL}${url}`;
  };

  useEffect(() => {
    const setup = async () => {
      const user = await apiService.getCurrentUser();
      setCurrentUser(user);
      await fetchMessages();
      await apiService.markMessagesAsRead(chatId);
      Notifications.setBadgeCountAsync(0);
      await Audio.requestPermissionsAsync();
    };
    setup();

    const subscription = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      (payload) => {
        if (payload.event === 'INSERT') {
          setMessages(current => {
            if (current.some(m => m.id === payload.new.id || (m.tempId && m.tempId === payload.new.id))) return current;
            if (payload.new.sender_id !== currentUser?.id) {
              apiService.markMessagesAsRead(chatId);
            }
            return [...current, payload.new];
          });
        } else if (payload.event === 'UPDATE') {
          setMessages(current => current.map(m => m.id === payload.new.id ? payload.new : m));
        } else if (payload.event === 'DELETE') {
          setMessages(current => current.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      if (timerRef.current) clearInterval(timerRef.current);
      if (sound) sound.unloadAsync();
    };
  }, [chatId, currentUser?.id]);

  const fetchMessages = async () => {
    try {
      const response = await apiService.getMessages(chatId);
      if (response.success) {
        setMessages(response.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
        // Notification locale de succès
        await Notifications.scheduleNotificationAsync({
          content: { title: "Meet Me", body: "Message envoyé avec succès !", sound: true },
          trigger: null,
        });
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    Alert.alert(
      t('deleteMessage'),
      t('deleteForEveryone'),
      [
        { text: t('cancel'), style: "cancel" },
        {
          text: t('delete'),
          style: "destructive",
          onPress: async () => {
            try {
              const response = await apiService.deleteMessage(messageId);
              if (!response.success) {
                Alert.alert("Erreur", "Impossible de supprimer le message.");
              }
            } catch (error) {
              console.error(error);
            }
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
          id: tempId, tempId, chat_id: chatId, sender_id: currentUser.id, content: t('audio'),
          type: 'audio', file_url: uri, created_at: new Date().toISOString(), status: 'sending'
        };
        setMessages(prev => [...prev, optimisticAudio]);

        const uploadRes = await apiService.uploadFile({ uri, type: 'audio/m4a', name: 'voice.m4a' }, 'audio');
        if (uploadRes.success) {
          const response = await apiService.sendMessage(chatId, t('audio'), 'audio', uploadRes.data.fileUrl);
          if (response.success) {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...response.data, localUri: uri } : m));
          }
        }
      }
    } catch (err) { console.error(err); }
  };

  const handlePickImage = async () => {
    try {
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
      id: tempId, tempId, chat_id: chatId, sender_id: currentUser.id, content: t('image'),
      type: 'image', file_url: uri, created_at: new Date().toISOString(), status: 'sending'
    };
    setMessages(prev => [...prev, optimisticImage]);

    try {
      const uploadRes = await apiService.uploadFile({ uri, type: 'image/jpeg', name: 'photo.jpg' }, 'image');
      if (uploadRes.success) {
        const response = await apiService.sendMessage(chatId, t('image'), 'image', uploadRes.data.fileUrl);
        if (response.success) {
          setMessages(prev => prev.map(m => m.id === tempId ? { ...response.data, localUri: uri } : m));
        }
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const playAudio = async (message: any) => {
    const { id, file_url, localUri } = message;
    try {
      if (playingId === id) {
        if (sound) {
          await sound.pauseAsync();
          setPlayingId(null);
        }
        return;
      }

      if (sound) await sound.unloadAsync();

      const audioSource = localUri || getFullUrl(file_url);
      if (!audioSource) {
        Alert.alert('Info', 'Le fichier audio n\'est pas encore prêt.');
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioSource },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPlayingId(id);
      setPlayedMessages(prev => new Set(prev).add(id));

      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setPlayingId(null);
          newSound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Playback Error:', error);
      Alert.alert('Erreur', 'Impossible de lire cet audio.');
    }
  };

  const styles = createStyles(themeColors, normalize, fontSizeFactor, isDark);

  const renderMessage = ({ item }: any) => {
    const isMe = item.sender_id === currentUser?.id;
    const isPlaying = playingId === item.id;
    const isReadOrPlayed = item.status === 'read' || playedMessages.has(item.id);

    return (
      <View style={[styles.messageRow, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={() => isMe && handleDeleteMessage(item.id)}
          style={[
            styles.bubble,
            isMe
              ? { backgroundColor: themeColors.primary, borderBottomRightRadius: 4 }
              : { backgroundColor: themeColors.surface, borderBottomLeftRadius: 4 }
          ]}
        >
          {item.type === 'audio' ? (
            <TouchableOpacity style={styles.audioMsg} onPress={() => playAudio(item)} onLongPress={() => isMe && handleDeleteMessage(item.id)}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={normalize(28, fontSizeFactor)} color={isMe ? '#fff' : themeColors.primary} />
              <View style={styles.audioBar}>
                {isPlaying && <ActivityIndicator size="small" color={isMe ? "#fff" : themeColors.primary} />}
              </View>
              {/* WhatsApp style blue mic when read/played */}
              <Ionicons
                name="mic"
                size={normalize(18, fontSizeFactor)}
                color={isReadOrPlayed ? '#34B7F1' : (isMe ? '#fff' : '#999')}
              />
            </TouchableOpacity>
          ) : item.type === 'image' ? (
            <Image
              source={{ uri: item.localUri || getFullUrl(item.file_url) || '' }}
              style={styles.imageMsg}
              resizeMode="cover"
            />
          ) : (
            <Text style={[
              styles.msgText,
              { color: isMe ? '#fff' : isDark ? '#fff' : '#000' },
              item.content.includes(t('messageRemoved')) && { fontStyle: 'italic', color: isMe ? 'rgba(255,255,255,0.7)' : '#999' }
            ]}>
              {item.content}
            </Text>
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
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={themeColors.primary} />
      <View style={[styles.header, { backgroundColor: themeColors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerUserInfo}
          onPress={() => {
            navigation.navigate('GroupInfo', { chatId });
          }}
        >
          <Image
            source={{ uri: getFullUrl(avatar) || `https://ui-avatars.com/api/?name=${name}` }}
            style={styles.avatar}
          />
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
              {isVerified && (
                <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={styles.headerStatus}>{t('online')}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.navigate('VideoCall', { chatId, name, avatar })}
          >
            <Ionicons name="videocam" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.navigate('AudioCall', { chatId, name, avatar })}
          >
            <Ionicons name="call" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => {
              Alert.alert(
                t('settings'),
                null,
                [
                  { text: t('settings'), onPress: () => navigation.navigate('Settings') },
                  { text: t('profile'), onPress: () => navigation.navigate('EditProfile') },
                  { text: t('cancel'), style: "cancel" }
                ]
              );
            }}
          >
            <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

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
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.list}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          )}
        </ImageBackground>

        <View style={[styles.inputContainer, { backgroundColor: themeColors.surface, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={[styles.inputBox, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
            {isRecording ? (
              <View style={styles.recordingIndicator}>
                <Ionicons name="mic" size={20} color={baseColors.danger} />
                <Text style={styles.recordingText}>{Math.floor(recordingDuration/60)}:{(recordingDuration%60).toString().padStart(2,'0')}</Text>
              </View>
            ) : (
              <TextInput
                style={[styles.textInput, { color: isDark ? '#fff' : '#000', fontSize: normalize(15, fontSizeFactor) }]}
                placeholder={t('typeMessage')}
                placeholderTextColor={isDark ? '#999' : '#666'}
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
            )}
            <TouchableOpacity style={styles.iconButton}><Ionicons name="attach" size={24} color={isDark ? '#999' : '#666'} /></TouchableOpacity>
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
            <Ionicons name={inputText.trim() ? "send" : (isRecording ? "stop" : "mic")} size={normalize(22, fontSizeFactor)} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

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
  audioBar: { flex: 1, height: 3, backgroundColor: 'rgba(0,0,0,0.1)', marginHorizontal: 10, borderRadius: 2, justifyContent: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 8 },
  inputBox: { flex: 1, flexDirection: 'row', borderRadius: 25, paddingHorizontal: 15, minHeight: normalize(45, factor), marginRight: 8, alignItems: 'center' },
  textInput: { flex: 1, paddingVertical: 10 },
  recordingIndicator: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  recordingText: { marginLeft: 10, color: baseColors.danger, fontWeight: 'bold' },
  iconButton: { padding: 5 },
  sendBtn: { width: normalize(48, factor), height: normalize(48, factor), borderRadius: normalize(24, factor), justifyContent: 'center', alignItems: 'center' }
});
