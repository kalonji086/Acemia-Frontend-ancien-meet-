import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, normalize } from '../styles/theme';
import apiService from '../services/api.service';
import { SOCKET_URL } from '../utils/constants';

const { width, height } = Dimensions.get('window');
const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '🙏', '👍'];

export default function ViewStatusScreen({ navigation, route }: any) {
  const userStatus = route?.params?.userStatus;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [comment, setComment] = useState('');
  const [reactions, setReactions] = useState<any[]>([]);
  const [showReactions, setShowReactions] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sending, setSending] = useState(false);

  // Sécurité si les données sont absentes
  useEffect(() => {
    if (!userStatus) {
      navigation.navigate('ChatList');
    }
  }, [userStatus]);

  if (!userStatus || !userStatus.statuses) return null;

  const currentStatus = userStatus.statuses[currentIndex];
  const isOwner = currentUser?.id === userStatus.user_id;

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${SOCKET_URL}${url}`;
  };

  useEffect(() => {
    const fetchUser = async () => {
      const user = await apiService.getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
    fetchReactions();
    if (!isOwner) {
      apiService.markStatusAsViewed(currentStatus.id);
    }
  }, [currentIndex]);

  const fetchReactions = async () => {
    try {
      const response = await apiService.getStatusReactions(currentStatus.id);
      if (response.success) setReactions(response.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    let timer: any;
    if (!isPaused && !showReactions) {
      timer = setInterval(() => {
        setProgress((prev) => prev + 0.01);
      }, 50);
    }
    return () => clearInterval(timer);
  }, [currentIndex, isPaused, showReactions]);

  useEffect(() => {
    if (progress >= 1) nextStatus();
  }, [progress]);

  const nextStatus = () => {
    if (currentIndex < userStatus.statuses.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('ChatList');
      }
    }
  };

  const prevStatus = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  const handlePress = (evt: any) => {
    const x = evt.nativeEvent.locationX;
    if (x < width / 3) {
      prevStatus();
    } else {
      nextStatus();
    }
  };

  const sendReaction = async (content: string, type: 'emoji' | 'comment' | 'like') => {
    if (!content.trim() && type === 'comment') return;
    setSending(true);
    setIsPaused(true);
    try {
      await apiService.addStatusReaction(currentStatus.id, { content, type });
      const chatRes = await apiService.createChat([userStatus.user_id]);
      if (chatRes.success) {
        const msgPrefix = type === 'emoji' ? "A réagi à votre statut : " : "A commenté votre statut : ";
        await apiService.sendMessage(chatRes.data.id, `${msgPrefix}${content}`);
      }
      if (type === 'comment') setComment('');
      Alert.alert("Succès", "Réaction envoyée !");
      if (type === 'emoji') setIsPaused(false);
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'envoyer la réaction");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentStatus.type === 'text' ? currentStatus.background_color : '#000' }]}>
      <StatusBar hidden />
      <TouchableOpacity activeOpacity={1} onPress={handlePress} onLongPress={() => setIsPaused(true)} onPressOut={() => setIsPaused(false)} style={styles.touchArea}>
        {currentStatus.type === 'image' && <Image source={{ uri: getFullUrl(currentStatus.media_url) }} style={styles.image} resizeMode="contain" />}
        <View style={styles.overlay}>
          <View style={styles.progressContainer}>
            {userStatus.statuses.map((_: any, index: number) => (
              <View key={index} style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: index < currentIndex ? '100%' : index === currentIndex ? `${Math.min(progress * 100, 100)}%` : '0%' }]} />
              </View>
            ))}
          </View>
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <Image source={{ uri: getFullUrl(userStatus.avatar_url) || `https://ui-avatars.com/api/?name=${userStatus.full_name}` }} style={styles.avatar} />
              <View>
                <Text style={styles.userName}>{userStatus.full_name}</Text>
                <Text style={styles.time}>{new Date(currentStatus.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ChatList')}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          {currentStatus.type === 'text' && <View style={styles.textContainer}><Text style={styles.statusText}>{currentStatus.content}</Text></View>}
          {currentStatus.type === 'image' && currentStatus.content && <View style={styles.captionContainer}><Text style={styles.captionText}>{currentStatus.content}</Text></View>}
          {!isOwner && (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.interactionArea}>
              <View style={styles.quickEmojis}>
                {QUICK_EMOJIS.map(emoji => (
                  <TouchableOpacity key={emoji} onPress={() => sendReaction(emoji, 'emoji')} disabled={sending}>
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.replyBar}>
                <TextInput style={styles.replyInput} placeholder="Répondre..." placeholderTextColor="#fff" value={comment} onChangeText={setComment} onFocus={() => setIsPaused(true)} onBlur={() => setIsPaused(false)} />
                <TouchableOpacity onPress={() => sendReaction(comment, 'comment')} disabled={sending || !comment.trim()}>
                  {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={24} color="#fff" />}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}
          {isOwner && (
            <TouchableOpacity style={styles.viewsContainer} onPress={() => setShowReactions(!showReactions)}>
              <Ionicons name="eye-outline" size={20} color="#fff" />
              <Text style={styles.viewsText}>{reactions.length} réactions</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
      {showReactions && (
        <View style={styles.reactionsModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Réactions et réponses</Text>
            <TouchableOpacity onPress={() => setShowReactions(false)}><Ionicons name="close" size={24} color="#000" /></TouchableOpacity>
          </View>
          <FlatList
            data={reactions}
            keyExtractor={(item) => item.id}
            renderItem={({item}) => (
              <View style={styles.reactionItem}>
                <Image source={{ uri: getFullUrl(item.avatar_url) || `https://ui-avatars.com/api/?name=${item.full_name}` }} style={styles.reactionAvatar} />
                <View style={styles.reactionContent}>
                  <Text style={styles.reactionName}>{item.full_name}</Text>
                  <Text style={styles.reactionText}>{item.content}</Text>
                </View>
              </View>
            )}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  touchArea: { flex: 1 },
  image: { width: width, height: height },
  overlay: { ...StyleSheet.absoluteFillObject, paddingTop: 10, justifyContent: 'space-between' },
  progressContainer: { flexDirection: 'row', paddingHorizontal: 10, marginBottom: 10 },
  progressBarBg: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 2, borderRadius: 1, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#fff' },
  userName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  time: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  textContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  statusText: { color: '#fff', fontSize: normalize(28), textAlign: 'center' },
  captionContainer: { paddingHorizontal: 20, marginBottom: 150, alignItems: 'center' },
  captionText: { color: '#fff', fontSize: 16, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 10 },
  interactionArea: { paddingBottom: 20, paddingHorizontal: 15 },
  quickEmojis: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15, backgroundColor: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 20 },
  emojiText: { fontSize: normalize(24) },
  replyBar: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.5)', paddingBottom: 5 },
  replyInput: { flex: 1, color: '#fff', fontSize: 16, paddingRight: 10 },
  viewsContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20 },
  viewsText: { color: '#fff', marginHorizontal: 10, fontWeight: '600' },
  reactionsModal: { position: 'absolute', bottom: 0, width: '100%', height: height * 0.5, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, elevation: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  reactionItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  reactionAvatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15 },
  reactionContent: { flex: 1 },
  reactionName: { fontWeight: 'bold', color: '#000', fontSize: 14 },
  reactionText: { color: '#666', fontSize: 15 }
});
