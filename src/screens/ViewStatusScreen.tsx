import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, normalize } from '../styles/theme';
import apiService from '../services/api.service';
import { SOCKET_URL } from '../utils/constants';
import SocketService from '../services/socket.service';

const { width, height } = Dimensions.get('window');
const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '🙏', '👍'];
const STATUS_DURATION = 5000; // 5 secondes par status comme WhatsApp

const AnimatedFloatingEmoji = ({ emoji }: { emoji: string }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 0.6],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  const scale = anim.interpolate({
    inputRange: [0, 0.2],
    outputRange: [0.5, 1.5],
  });

  return (
    <Animated.View
      style={[
        styles.floatingEmoji,
        {
          opacity,
          transform: [{ translateY }, { scale }],
          left: width / 2 - 20,
        },
      ]}
    >
      <Text style={{ fontSize: 40 }}>{emoji}</Text>
    </Animated.View>
  );
};

export default function ViewStatusScreen({ navigation, route }: any) {
  const userStatus = route?.params?.userStatus;
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [isPaused, setIsPaused] = useState(false);
  const [comment, setComment] = useState('');
  const [reactions, setReactions] = useState<any[]>([]);
  const [showReactions, setShowReactions] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<any[]>([]);

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
    if (!url || url === 'null') return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;

    const baseUrl = SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL;
    const path = url.startsWith('/') ? url : `/${url}`;

    return `${baseUrl}${path}`;
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

    // Écouter les réactions en temps réel
    const onRealTimeReaction = (data: any) => {
      if (data.statusId === currentStatus.id) {
        setReactions(prev => {
          if (prev.some(r => r.id === data.reaction.id)) return prev;
          return [data.reaction, ...prev];
        });
      }
    };

    SocketService.on('status:reacted', onRealTimeReaction);

    return () => {
      SocketService.off('status:reacted', onRealTimeReaction);
    };
  }, [currentIndex, currentStatus.id]);

  const fetchReactions = async () => {
    try {
      const response = await apiService.getStatusReactions(currentStatus.id);
      if (response.success) setReactions(response.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!isPaused && !showReactions && currentStatus) {
      // Animation de progression comme WhatsApp
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: STATUS_DURATION,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          nextStatus();
        }
      });
    } else {
      // Pause l'animation
      progressAnim.stopAnimation();
    }
    
    return () => {
      progressAnim.stopAnimation();
    };
  }, [currentIndex, isPaused, showReactions, currentStatus]);

  const nextStatus = () => {
    if (currentIndex < userStatus.statuses.length - 1) {
      setCurrentIndex(currentIndex + 1);
      progressAnim.setValue(0);
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
      progressAnim.setValue(0);
    } else {
      progressAnim.setValue(0);
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

    if (type === 'emoji') {
      // Effet visuel immédiat (Floating Emoji)
      const id = Date.now();
      setFloatingEmojis(prev => [...prev, { id, emoji: content }]);
      setTimeout(() => {
        setFloatingEmojis(prev => prev.filter(e => e.id !== id));
      }, 2000);

      // Pour que ça s'affiche dans la chatlist, on crée une discussion et on envoie un message
      try {
        const chatRes = await apiService.createChat([userStatus.user_id]);
        if (chatRes.success) {
          const msgPrefix = type === 'like' ? "A aimé votre statut" : "A réagi à votre statut : ";
          await apiService.sendMessage(chatRes.data.id, `${msgPrefix}${content}`);
        }
      } catch (e) { console.error('Error sending emoji message:', e); }

      // Appel API de réaction
      apiService.addStatusReaction(currentStatus.id, { content, type })
        .catch(e => console.error('Silent emoji error:', e));

      return;
    }

    setSending(true);
    setIsPaused(true);
    try {
      const reactionRes = await apiService.addStatusReaction(currentStatus.id, { content, type });
      
      if (reactionRes.success) {
        if (type === 'comment') {
          const chatRes = await apiService.createChat([userStatus.user_id]);
          if (chatRes.success) {
            const msgPrefix = "A commenté votre statut : ";
            await apiService.sendMessage(chatRes.data.id, `${msgPrefix}${content}`);
          }
          setComment('');
        }
      }
    } catch (error) {
      console.error('Send reaction error:', error);
    } finally {
      setSending(false);
      if (type === 'comment') setIsPaused(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentStatus.type === 'text' ? currentStatus.background_color : '#000' }]}>
      <StatusBar hidden />
      <View style={styles.mainContainer}>
        <TouchableOpacity activeOpacity={1} onPress={handlePress} onLongPress={() => setIsPaused(true)} onPressOut={() => setIsPaused(false)} style={styles.touchArea}>
          {currentStatus.type === 'image' && <Image source={{ uri: getFullUrl(currentStatus.media_url) }} style={styles.image} resizeMode="contain" />}

          {/* Floating Emojis Animation Area */}
          {floatingEmojis.map(e => (
            <AnimatedFloatingEmoji key={e.id} emoji={e.emoji} />
          ))}

          <View style={styles.overlay}>
            <View style={styles.progressContainer}>
              {userStatus.statuses.map((_: any, index: number) => (
                <View key={index} style={styles.progressBarBg}>
                  <Animated.View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: index < currentIndex ? '100%' : 
                               index === currentIndex ? progressAnim.interpolate({
                                 inputRange: [0, 1],
                                 outputRange: ['0%', '100%']
                               }) : '0%' 
                      }
                    ]} 
                  />
                </View>
              ))}
            </View>
            <View style={styles.header}>
              <View style={styles.userInfo}>
                <Image source={{ uri: getFullUrl(userStatus.avatar_url) || `https://ui-avatars.com/api/?name=${userStatus.full_name}` }} style={styles.avatar} />
                <View>
                  <Text style={styles.userName}>{userStatus.full_name}</Text>
                  <Text style={styles.time}>
                  {(() => {
                    const statusDate = new Date(currentStatus.created_at);
                    const now = new Date();
                    const hoursDiff = (now.getTime() - statusDate.getTime()) / (1000 * 60 * 60);
                    
                    if (hoursDiff < 1) {
                      const minutes = Math.floor(hoursDiff * 60);
                      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
                    } else if (hoursDiff < 24) {
                      return `${Math.floor(hoursDiff)} heure${Math.floor(hoursDiff) > 1 ? 's' : ''}`;
                    } else {
                      return 'Hier';
                    }
                  })()}
                </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ChatList')}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            {currentStatus.type === 'text' && <View style={styles.textContainer}><Text style={styles.statusText}>{currentStatus.content}</Text></View>}

            <View style={styles.bottomSection}>
              {isOwner && (
                <TouchableOpacity style={styles.viewsContainer} onPress={() => setShowReactions(!showReactions)}>
                  <Ionicons name="eye-outline" size={20} color="#fff" />
                  <Text style={styles.viewsText}>{reactions.length} réactions</Text>
                </TouchableOpacity>
              )}
              {currentStatus.type === 'image' && currentStatus.content && (
                <View style={styles.captionContainer}>
                  <Text style={styles.captionText}>{currentStatus.content}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

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
              <TextInput
                style={styles.replyInput}
                placeholder="Répondre..."
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={comment}
                onChangeText={setComment}
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
              />
              <TouchableOpacity onPress={() => sendReaction(comment, 'comment')} disabled={sending || !comment.trim()}>
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={24} color="#fff" />}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>

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
  mainContainer: { flex: 1, position: 'relative' },
  touchArea: { flex: 1 },
  image: { width: width, height: height, backgroundColor: '#000' },
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
  bottomSection: { marginBottom: 10, width: '100%' },
  captionContainer: { paddingHorizontal: 20, marginBottom: 5, alignItems: 'center' },
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
  reactionText: { color: '#666', fontSize: 15 },
  floatingEmoji: { position: 'absolute', bottom: 100, zIndex: 100 }
});
