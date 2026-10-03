import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCheck,
  Clock,
  Download,
  Heart,
  Mic,
  MoreVertical,
  Paperclip,
  Pause,
  Play,
  Send,
  Image as ImageIcon,
  Square,
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { API_BASE_URL } from '../utils/constants';
import { PRESET_WALLPAPERS } from '../utils/wallpapers';

const formatFileSize = (size?: number | string | null) => {
  if (size === null || size === undefined || size === '') return null;
  const raw = typeof size === 'string' ? Number(size) : size;
  if (!Number.isFinite(raw) || raw <= 0) return null;
  if (raw < 1024) return `${raw} B`;
  if (raw < 1024 * 1024) return `${(raw / 1024).toFixed(1)} KB`;
  return `${(raw / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (seconds: number) => {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const safeDate = (value?: string | number | Date | null) => {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const normalizeSender = (item: any) => {
  const senderRaw = item?.sender || item?.user || item?.author || item?.message?.sender || {};
  const senderId = senderRaw?.id ?? item?.sender_id ?? item?.user_id ?? item?.author_id ?? item?.message?.sender_id ?? null;
  const senderName = senderRaw?.full_name || senderRaw?.fullName || senderRaw?.name || item?.sender_name || item?.user_name || item?.message?.sender_name || 'User';
  const senderAvatar = senderRaw?.avatar_url || senderRaw?.avatarUrl || senderRaw?.avatar || item?.sender_avatar || item?.avatar_url || item?.message?.sender_avatar || null;

  return {
    id: senderId,
    full_name: senderName,
    avatar_url: senderAvatar,
    name: senderName,
    avatar: senderAvatar,
  };
};

const dedupePayload = (item: any) => {
  const raw = item?.message && item?.chatId ? item.message : item;
  const media = raw?.file || raw?.media || raw?.metadata || raw?.media_metadata || raw?.file_metadata || item?.file || item?.media || item?.metadata || item?.media_metadata || item?.file_metadata || {};
  const fileUrl = raw?.localUri || raw?.file_url || raw?.fileUrl || raw?.media_url || raw?.mediaUrl || raw?.url || raw?.file?.url || raw?.file?.file_url || raw?.file?.fileUrl || media?.url || media?.file_url || media?.fileUrl || null;
  const mimeType = raw?.mime_type || raw?.mimeType || raw?.file_mime_type || raw?.fileMimeType || media?.mime_type || media?.mimeType || media?.file_mime_type || media?.fileMimeType || '';
  const fileName = raw?.file_name || raw?.fileName || raw?.filename || raw?.name || media?.file_name || media?.fileName || media?.filename || media?.name || '';
  const fileSize = raw?.file_size ?? raw?.size ?? raw?.fileSize ?? media?.file_size ?? media?.size ?? media?.size_bytes ?? null;
  const sender = normalizeSender(raw);
  const createdAt = raw?.created_at || raw?.createdAt || item?.created_at || item?.createdAt || new Date().toISOString();
  const messageType = (raw?.type || raw?.message_type || raw?.messageType || '').toLowerCase();

  let inferredType = messageType || undefined;
  if (!inferredType) {
    const urlOrName = `${fileUrl || ''} ${fileName || ''}`.toLowerCase();
    if (/\.(mp3|m4a|aac|wav|ogg)$/i.test(urlOrName) || /audio\//i.test(mimeType)) inferredType = 'audio';
    else if (/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(urlOrName) || /image\//i.test(mimeType)) inferredType = 'image';
    else if (/\.(mp4|mov|webm|m4v)$/i.test(urlOrName) || /video\//i.test(mimeType)) inferredType = 'video';
    else if (fileUrl || mimeType) inferredType = 'file';
    else inferredType = 'text';
  }

  const hasFileLikeContent = ['image', 'audio', 'video', 'file'].includes(inferredType);
  const fallbackName = fileName || (hasFileLikeContent ? 'Document' : '');

  return {
    ...item,
    ...raw,
    id: raw?.id ?? item?.id ?? raw?.message_id ?? item?.message_id ?? `${raw?.chat_id ?? raw?.chatId ?? item?.chat_id ?? item?.chatId ?? 'msg'}-${safeDate(createdAt).getTime()}`,
    chat_id: raw?.chat_id ?? raw?.chatId ?? item?.chat_id ?? item?.chatId ?? null,
    chatId: raw?.chatId ?? raw?.chat_id ?? item?.chatId ?? item?.chat_id ?? null,
    sender_id: sender.id ?? raw?.sender_id ?? raw?.user_id ?? raw?.author_id ?? item?.sender_id ?? item?.user_id ?? item?.author_id ?? null,
    user_id: sender.id ?? raw?.user_id ?? raw?.sender_id ?? raw?.author_id ?? item?.user_id ?? item?.sender_id ?? item?.author_id ?? null,
    sender,
    content: typeof raw?.content === 'string' ? raw.content : (inferredType === 'text' ? '' : fallbackName),
    file_url: fileUrl,
    fileUrl,
    media_url: fileUrl,
    url: fileUrl,
    file_name: fallbackName,
    filename: fallbackName,
    mime_type: mimeType,
    mimeType,
    file_size: fileSize,
    size: fileSize,
    type: inferredType,
    created_at: createdAt,
    createdAt,
    metadata: raw?.metadata || media,
    file_metadata: raw?.file_metadata || media,
  };
};

const getFileExtension = (mimeType?: string, fileName?: string) => {
  if (mimeType) {
    const type = String(mimeType).split('/')[1] || '';
    if (type) return type.toUpperCase();
  }

  const name = (fileName || '').split('.').pop();
  if (name) return name.toUpperCase();
  return 'FILE';
};

const getFullUrl = (value?: string | null) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || /^data:/i.test(value) || value.startsWith('file:')) return value;
  if (value.startsWith('/')) {
    return `${API_BASE_URL.replace(/\/api\/?$/, '')}${value}`;
  }
  return value;
};

const MessageItem = React.memo((props: any) => {
  const {
    item,
    isMe,
    isGroup,
    sender,
    themeColors,
    isDark,
    getFullUrl: resolveUrl,
    handleMessageLongPress,
    playAudio,
    playingId,
    playbackStatus,
    downloadFile,
    downloadProgress,
    t,
    chatColor,
    styles,
    downloadedFiles,
    currentUser,
    onLike,
  } = props;

  const normalized = dedupePayload(item);
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const mediaUrl = normalized.localUri || normalized.file_url || normalized.fileUrl || normalized.media_url || normalized.url || normalized.file?.url || normalized.file?.file_url || null;
  const mediaName = normalized.file_name || normalized.filename || normalized.name || (normalized.type === 'text' ? '' : normalized.content) || 'Document';
  const mimeType = normalized.mime_type || normalized.mimeType || normalized.file?.mime_type || normalized.file?.mimeType || normalized.metadata?.mimeType || normalized.metadata?.mime_type || '';
  const mediaSize = normalized.file_size || normalized.size || normalized.file?.size || normalized.file?.file_size || normalized.metadata?.size || normalized.metadata?.file_size || null;
  const messageType = normalized.type || (mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('audio/') ? 'audio' : mimeType.startsWith('video/') ? 'video' : mediaUrl ? 'file' : 'text');
  const isAudioMessage = messageType === 'audio' || /\.(m4a|mp3|aac|wav|ogg)$/i.test(mediaName || mediaUrl || '') || /audio\//i.test(mimeType);
  const isImageMessage = messageType === 'image' || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(mediaName || mediaUrl || '') || /image\//i.test(mimeType);
  const isVideoMessage = messageType === 'video' || /\.(mp4|mov|webm|m4v)$/i.test(mediaName || mediaUrl || '') || /video\//i.test(mimeType);
  const isFileMessage = messageType === 'file' && (Boolean(mediaUrl) || Boolean(normalized.file_name || normalized.filename || normalized.name));
  const isDeleted = Boolean(normalized.content && normalized.content.includes('Ce message a été supprimé'));
  const isSending = normalized.status === 'sending';
  const likes = Array.isArray(normalized.likes) ? normalized.likes : [];
  const isLikedByCurrentUser = likes.some((userId: string | number) => String(userId) === String(currentUser?.id));

  const bubbleStyle = useMemo(() => [
    styles.bubble,
    isMe ? { backgroundColor: chatColor || themeColors.primary, borderBottomRightRadius: 4 } : { backgroundColor: themeColors.surface, borderBottomLeftRadius: 4 },
    isDeleted && { backgroundColor: isDark ? '#222' : '#f0f0f0', borderWidth: 1, borderStyle: 'dashed', borderColor: '#ccc' },
    isSending && { opacity: 0.72 },
  ], [chatColor, isDark, isDeleted, isMe, isSending, styles.bubble, themeColors.primary, themeColors.surface]);

  const renderAudioWaveform = () => {
    const currentId = normalized.id;
    const isPlaying = playingId === currentId && Boolean(playbackStatus[currentId]?.isPlaying);
    const positionMs = playbackStatus[currentId]?.positionMillis || 0;
    const durationMs = playbackStatus[currentId]?.durationMillis || 0;
    const progress = durationMs ? Math.min(Math.max(positionMs / durationMs, 0), 1) : 0;
    const audioDuration = normalized.metadata?.duration || normalized.file_metadata?.duration || (durationMs ? durationMs / 1000 : 0);
    const displayTime = isPlaying ? formatDuration(positionMs / 1000) : formatDuration(audioDuration);
    const waveformHeights = [8, 14, 10, 18, 12, 20, 9, 15, 22, 12, 17, 8, 19, 11, 15, 23, 10, 16, 7, 20, 13, 18, 9, 14, 21, 11, 17, 8, 19, 12, 15, 10];

    return (
      <View style={styles.whatsappAudioContainer}>
        {!isMe && sender?.avatar_url && (
          <Image source={{ uri: resolveUrl(sender.avatar_url) || undefined }} style={styles.audioAvatar} />
        )}

        <TouchableOpacity style={[styles.playButtonCircle, { backgroundColor: isMe ? '#fff' : themeColors.primary }]} onPress={() => playAudio(normalized)}>
          {isPlaying ? (
            <Pause size={18} fill={isMe ? themeColors.primary : '#fff'} color={isMe ? themeColors.primary : '#fff'} />
          ) : (
            <Play size={18} fill={isMe ? themeColors.primary : '#fff'} color={isMe ? themeColors.primary : '#fff'} style={{ marginLeft: 2 }} />
          )}
        </TouchableOpacity>

        <View style={styles.audioWaveformContainer}>
          <View style={styles.waveformTrack}>
            {waveformHeights.map((height, index) => (
              <View
                key={index}
                style={[
                  styles.waveformBar,
                  {
                    height,
                    backgroundColor: index / waveformHeights.length <= progress
                      ? (isMe ? 'rgba(255,255,255,0.88)' : themeColors.primary)
                      : (isMe ? 'rgba(255,255,255,0.35)' : 'rgba(107,114,128,0.42)'),
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.audioInfoRow}>
            <Text style={[styles.audioTime, { color: isMe ? 'rgba(255,255,255,0.82)' : '#6b7280' }]}>{displayTime}</Text>
            <Mic size={10} color={isMe ? 'rgba(255,255,255,0.5)' : '#7b7b7b'} />
          </View>
        </View>
      </View>
    );
  };

  const renderDocumentBubble = () => {
    const metaText = isSending
      ? 'Sending...'
      : downloadProgress[normalized.id] === -1
        ? 'Retry'
        : typeof downloadProgress[normalized.id] === 'number'
          ? `Downloading ${Math.round(downloadProgress[normalized.id] * 100)}%`
          : `${getFileExtension(mimeType, mediaName)}${mediaSize ? ` • ${formatFileSize(mediaSize)}` : ''}`;

    const actionText = isSending ? 'Envoi...' : downloadProgress[normalized.id] === -1 ? 'Réessayer' : typeof downloadProgress[normalized.id] === 'number' ? 'Téléchargement...' : 'Appuyer pour télécharger / partager';

    return (
      <TouchableOpacity
        style={styles.fileMsg}
        onPress={() => downloadFile(normalized)}
        disabled={(typeof downloadProgress[normalized.id] === 'number' && downloadProgress[normalized.id] >= 0) || isSending}
        activeOpacity={0.85}
      >
        <View style={[styles.fileIcon, { backgroundColor: isMe ? 'rgba(255,255,255,0.18)' : `${themeColors.primary}20` }]}>
          {isSending ? (
            <ActivityIndicator size="small" color={isMe ? '#fff' : themeColors.primary} />
          ) : downloadProgress[normalized.id] === -1 ? (
            <Text style={{ color: '#f44336', fontSize: 12, fontWeight: '700' }}>!</Text>
          ) : typeof downloadProgress[normalized.id] === 'number' ? (
            <ActivityIndicator size="small" color={isMe ? '#fff' : themeColors.primary} />
          ) : (
            <Paperclip size={19} color={isMe ? '#fff' : themeColors.primary} />
          )}
        </View>

        <View style={styles.fileInfo}>
          <Text style={[styles.fileName, { color: isMe ? '#fff' : themeColors.text.primary }]} numberOfLines={1}>
            {mediaName}
          </Text>
          <Text style={[styles.fileSize, { color: isMe ? 'rgba(255,255,255,0.78)' : '#667085' }]} numberOfLines={2}>
            {metaText}
          </Text>
          <Text style={[styles.fileAction, { color: isMe ? 'rgba(255,255,255,0.82)' : themeColors.primary }]}>
            {actionText}
          </Text>
        </View>

        {!isSending && (
          <Download size={16} color={isMe ? 'rgba(255,255,255,0.8)' : '#64748b'} />
        )}
      </TouchableOpacity>
    );
  };

  const renderVideoBubble = () => {
    return (
      <TouchableOpacity onPress={() => downloadFile(normalized)} style={styles.videoContainer} activeOpacity={0.9}>
        <View style={styles.videoThumbnail} />
        <View style={styles.videoOverlay}>
          <View style={styles.videoPlayButton}><Play size={18} color="#fff" fill="#fff" /></View>
        </View>
        <View style={styles.videoMeta}>
          <Text style={styles.videoMetaText} numberOfLines={1}>{mediaName}</Text>
          <Text style={styles.videoMetaSubText}>{mediaSize ? formatFileSize(mediaSize) : 'Vidéo'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.messageRow, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
      {!isMe && isGroup && sender && (
        <Image source={{ uri: resolveUrl(sender.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(sender.full_name || 'User')}` }} style={styles.msgAvatar} resizeMode="cover" />
      )}

      <View style={{ maxWidth: '85%' }}>
        {!isMe && isGroup && sender && (
          <Text style={[styles.senderName, { color: themeColors.primary }]}>{sender.full_name}</Text>
        )}

        <TouchableOpacity activeOpacity={0.82} onPress={() => {}} onLongPress={() => handleMessageLongPress(normalized)} disabled={isDeleted} style={bubbleStyle}>
          {isAudioMessage ? (
            renderAudioWaveform()
          ) : isImageMessage ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: getFullUrl(downloadedFiles[normalized.id] || normalized.localUri || mediaUrl) || undefined }}
                style={[
                  styles.imageMsg,
                  imageAspectRatio > 220 / 260
                    ? { width: 220, height: 220 / imageAspectRatio }
                    : { width: Math.max(110, 260 * imageAspectRatio), height: 260 },
                ]}
                resizeMode="contain"
                onLoad={({ nativeEvent }) => {
                  const { width, height } = nativeEvent.source;
                  if (width > 0 && height > 0) setImageAspectRatio(width / height);
                }}
              />

              {!normalized.localUri && !downloadedFiles[normalized.id] && (
                <TouchableOpacity style={styles.downloadOverlay} onPress={() => downloadFile(normalized)}>
                  {typeof downloadProgress[normalized.id] === 'number' && downloadProgress[normalized.id] >= 0 ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Download size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : isVideoMessage ? (
            renderVideoBubble()
          ) : isFileMessage ? (
            renderDocumentBubble()
          ) : (
            <Text style={[styles.msgText, { color: isMe ? '#fff' : isDark ? '#fff' : '#171717' }, isDeleted && { fontStyle: 'italic', color: '#999' }]}>
              {isDeleted ? (t?.('messageRemoved') || 'Ce message a été supprimé') : (normalized.translatedText || normalized.content || '')}
            </Text>
          )}

          <View style={styles.msgFooter}>
            {!isDeleted && !isSending && (
              <TouchableOpacity
                style={styles.likeButton}
                onPress={() => onLike(normalized)}
                accessibilityRole="button"
                accessibilityLabel={isLikedByCurrentUser ? 'Retirer le j’aime' : 'Aimer le message'}
              >
                <Heart size={13} color={isLikedByCurrentUser ? '#ef4444' : isMe ? 'rgba(255,255,255,0.8)' : '#667085'} fill={isLikedByCurrentUser ? '#ef4444' : 'transparent'} />
                {likes.length > 0 && (
                  <Text style={[styles.likesCount, { color: isMe ? 'rgba(255,255,255,0.8)' : '#667085' }]}>{likes.length}</Text>
                )}
              </TouchableOpacity>
            )}
            <Text style={[styles.timeText, { color: isMe ? 'rgba(255,255,255,0.75)' : '#667085' }]}>
              {safeDate(normalized.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 4 }}>
                {isSending ? (
                  <Clock size={10} color="rgba(255,255,255,0.55)" />
                ) : normalized.status === 'read' || normalized.status === 'delivered' ? (
                  <CheckCheck size={13} color={normalized.status === 'read' ? '#34B7F1' : 'rgba(255,255,255,0.65)'} />
                ) : (
                  <Check size={13} color="rgba(255,255,255,0.65)" />
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const createStyles = (colors: any, normalize: any, isDark: boolean) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: normalize(18), fontWeight: '700', color: colors.text.primary },
  headerSubtitle: { fontSize: normalize(11), color: colors.text.secondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  avatar: { width: normalize(40), height: normalize(40), borderRadius: normalize(20), backgroundColor: '#E2E8F0', marginRight: normalize(10) },
  body: { flex: 1 },
  wallpaper: { opacity: isDark ? 0.14 : 0.22 },
  messagesList: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageRow: { flexDirection: 'row', marginVertical: 6 },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10, overflow: 'hidden' },
  msgText: { fontSize: normalize(15), lineHeight: normalize(22) },
  msgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 6 },
  likeButton: { flexDirection: 'row', alignItems: 'center', marginRight: 7, minWidth: 18, minHeight: 18, justifyContent: 'center' },
  likesCount: { fontSize: 10, fontWeight: '700', marginLeft: 3 },
  timeText: { fontSize: 11, fontWeight: '500' },
  senderName: { fontSize: 10, fontWeight: '700', marginBottom: 4, marginLeft: 6 },
  msgAvatar: { width: normalize(28), height: normalize(28), borderRadius: normalize(14), marginRight: 8, alignSelf: 'flex-end', backgroundColor: '#e5e7eb' },
  imageContainer: { maxWidth: '100%', borderRadius: 12, overflow: 'hidden', backgroundColor: '#e5e7eb' },
  imageMsg: { borderRadius: 12 },
  downloadOverlay: { position: 'absolute', right: 8, bottom: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.36)', alignItems: 'center', justifyContent: 'center' },
  fileMsg: { flexDirection: 'row', alignItems: 'center', minWidth: 210, maxWidth: 260, padding: 10 },
  fileIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  fileInfo: { flex: 1, paddingRight: 6 },
  fileName: { fontSize: normalize(14), fontWeight: '700' },
  fileSize: { marginTop: 3, fontSize: normalize(11), lineHeight: normalize(16) },
  fileAction: { marginTop: 4, fontSize: normalize(11), fontWeight: '700' },
  videoContainer: { width: 220, maxWidth: '100%', borderRadius: 12, overflow: 'hidden', backgroundColor: '#e5e7eb' },
  videoThumbnail: { width: '100%', height: 180, backgroundColor: '#d1d5db' },
  videoOverlay: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  videoPlayButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.38)', alignItems: 'center', justifyContent: 'center' },
  videoMeta: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'rgba(17,24,39,0.12)' },
  videoMetaText: { fontSize: normalize(12), color: '#fff', fontWeight: '600' },
  videoMetaSubText: { fontSize: normalize(10), color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  whatsappAudioContainer: { flexDirection: 'row', alignItems: 'center', minWidth: 200, maxWidth: 260 },
  audioAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8, backgroundColor: '#e5e7eb' },
  playButtonCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  audioWaveformContainer: { flex: 1, minWidth: 120 },
  waveformTrack: { height: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  waveformBar: { width: 2, borderRadius: 1, marginHorizontal: 1 },
  audioInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  audioTime: { fontSize: 11, fontWeight: '600' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
    paddingHorizontal: 14,
    paddingRight: 12,
    minHeight: normalize(44),
    marginRight: 8,
  },
  textInput: { flex: 1, fontSize: normalize(15), color: colors.text.primary, paddingVertical: 10 },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginHorizontal: 3 },
  recordingButton: { backgroundColor: '#d93025' },
  recordingTime: { color: '#d93025', fontSize: normalize(12), fontWeight: '700', marginHorizontal: 4 },
  sendButton: { width: normalize(46), height: normalize(46), borderRadius: normalize(23), backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  actionSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  actionSheet: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.surface },
  actionSheetTitle: { paddingVertical: 10, fontSize: normalize(14), fontWeight: '700', color: colors.text.secondary, textAlign: 'center' },
  actionSheetButton: { minHeight: 48, justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  actionSheetButtonText: { fontSize: normalize(16), fontWeight: '600', color: colors.text.primary, textAlign: 'center' },
  destructiveAction: { color: '#dc2626' },
  wallpaperGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingVertical: 8 },
  wallpaperOption: { width: '31%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  wallpaperOptionSelected: { borderColor: colors.primary },
  wallpaperPreview: { width: '100%', height: '100%' },
  wallpaperLabel: { position: 'absolute', right: 0, bottom: 0, left: 0, paddingVertical: 3, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: normalize(10), fontWeight: '700', textAlign: 'center' },
});

export default function ChatScreen({ navigation, route }: any) {
  const { colors, isDark, normalize } = useTheme();
  const { t } = useLanguage();
  const { user: currentUser } = useUser();
  const insets = useSafeAreaInsets();
  const chatId = route?.params?.chatId || route?.params?.id;
  const styles = createStyles(colors, normalize, isDark);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<Record<string, any>>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number | undefined>>({});
  const [downloadedFiles, setDownloadedFiles] = useState<Record<string, string>>({});
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [isChatFavorite, setIsChatFavorite] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [isWallpaperPickerOpen, setIsWallpaperPickerOpen] = useState(false);
  const [wallpaperId, setWallpaperId] = useState('default');
  const [customWallpaperUri, setCustomWallpaperUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const currentChatName = route?.params?.name || chatInfo?.name || 'Conversation';
  const currentChatAvatar = route?.params?.avatar || chatInfo?.avatar_url || chatInfo?.avatar || null;
  const wallpaperStorageKey = `chat-wallpaper:${currentUser?.id || 'guest'}:${chatId || 'unknown'}`;
  const selectedWallpaper = PRESET_WALLPAPERS.find((wallpaper) => wallpaper.id === wallpaperId) || PRESET_WALLPAPERS[0];
  const wallpaperSource = customWallpaperUri ? { uri: customWallpaperUri } : selectedWallpaper.image;

  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    setIsLoading(true);
    try {
      const res = await apiService.getMessages(chatId, 1, 50);
      const nextItems = Array.isArray(res?.data) ? res.data.map((item: any) => dedupePayload(item)) : [];
      setMessages(nextItems);
    } catch (error) {
      console.error('Error fetching messages', error);
    } finally {
      setIsLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    if (chatId) loadMessages();
  }, [chatId, loadMessages]);

  useEffect(() => {
    if (!chatId) return;

    const loadChatInfo = async () => {
      const res = await apiService.getChat(chatId);
      if (!res?.success) {
        console.error('Error fetching chat details', res?.error);
        return;
      }
      setChatInfo(res.data);
      setIsChatFavorite(Boolean(res.data?.is_favorite));
    };

    loadChatInfo().catch((error) => {
      console.error('Error fetching chat details', error);
    });
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    let isActive = true;
    setWallpaperId('default');
    setCustomWallpaperUri(null);

    const loadWallpaper = async () => {
      try {
        const savedValue = await AsyncStorage.getItem(wallpaperStorageKey);
        if (!savedValue || !isActive) return;
        const savedWallpaper = JSON.parse(savedValue);
        if (typeof savedWallpaper?.wallpaperId === 'string') {
          setWallpaperId(savedWallpaper.wallpaperId);
        }
        if (typeof savedWallpaper?.customWallpaperUri === 'string') {
          setCustomWallpaperUri(savedWallpaper.customWallpaperUri);
        }
      } catch (error) {
        console.error('Unable to load chat wallpaper', error);
      }
    };

    loadWallpaper();
    return () => {
      isActive = false;
    };
  }, [chatId, wallpaperStorageKey]);

  useEffect(() => {
    if (!chatId) return;

    const onNewMessage = (payload: any) => {
      const incoming = payload?.message ?? payload;
      if (!incoming || (incoming.chat_id !== chatId && incoming.chatId !== chatId)) return;
      const next = dedupePayload(incoming);
      setMessages((prev) => {
        const exists = prev.some((m) => String(m.id) === String(next.id));
        return exists ? prev.map((m) => (String(m.id) === String(next.id) ? next : m)) : [...prev, next];
      });
    };

    socketService.on('new_message', onNewMessage);
    return () => socketService.off('new_message', onNewMessage);
  }, [chatId]);

  useEffect(() => {
    const onReaction = (payload: any) => {
      if (!payload?.messageId || !Array.isArray(payload.likes)) return;
      setMessages((prev) => prev.map((message) => (
        String(message.id) === String(payload.messageId)
          ? { ...message, likes: payload.likes }
          : message
      )));
    };

    socketService.on('message_reaction', onReaction);
    return () => socketService.off('message_reaction', onReaction);
  }, []);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [sound]);

  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch((error) => {
          console.error('Voice recording cleanup failed', error);
        });
      }
    };
  }, []);

  const shareMessage = useCallback(async (item: any) => {
    const normalized = dedupePayload(item);
    const fileUrl = getFullUrl(normalized.file_url || normalized.media_url || normalized.localUri);
    const message = normalized.content || normalized.file_name || 'Message';
    try {
      if (Platform.OS === 'web') {
        const sharedText = [message, fileUrl].filter(Boolean).join('\n');
        if (typeof navigator.share === 'function') {
          await navigator.share({ text: sharedText });
          return;
        }
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(sharedText);
          Alert.alert('Transfert', 'Le message a été copié dans le presse-papiers.');
          return;
        }
        throw new Error('Web sharing is not available.');
      }

      await Share.share({
        message,
        ...(fileUrl ? { url: fileUrl } : {}),
      });
    } catch (error) {
      console.error('Message share failed', error);
      Alert.alert('Transfert', 'Impossible de transférer ce message.');
    }
  }, []);

  const toggleChatFavorite = useCallback(async () => {
    if (!chatId) return;
    const nextFavorite = !isChatFavorite;
    const res = await apiService.toggleFavoriteChat(chatId, nextFavorite);
    if (!res?.success) {
      Alert.alert('Favoris', res?.error || 'Impossible de modifier les favoris.');
      return;
    }
    setIsChatFavorite(nextFavorite);
  }, [chatId, isChatFavorite]);

  const deleteMessage = useCallback(async (item: any, deleteType: 'everyone' | 'me') => {
    const normalized = dedupePayload(item);
    const res = await apiService.deleteMessage(String(normalized.id), deleteType);
    if (!res?.success) {
      Alert.alert('Suppression', res?.error || 'Impossible de supprimer ce message.');
      return;
    }

    setMessages((prev) => {
      if (deleteType === 'me') {
        return prev.filter((message) => String(message.id) !== String(normalized.id));
      }
      return prev.map((message) => (
        String(message.id) === String(normalized.id)
          ? { ...message, content: 'Ce message a été supprimé', type: 'text', file_url: null, media_url: null }
          : message
      ));
    });
  }, []);

  const likeMessage = useCallback(async (item: any) => {
    const normalized = dedupePayload(item);
    const res = await apiService.reactToMessage(String(normalized.id));
    if (!res?.success || !Array.isArray(res.data?.likes)) {
      Alert.alert('J’aime', res?.error || 'Impossible de modifier le j’aime de ce message.');
      return;
    }
    setMessages((prev) => prev.map((message) => (
      String(message.id) === String(normalized.id)
        ? { ...message, likes: res.data.likes }
        : message
    )));
  }, []);

  const handleMessageLongPress = useCallback((item: any) => {
    const normalized = dedupePayload(item);
    if (Platform.OS === 'web') {
      setSelectedMessage(normalized);
      return;
    }

    const isMine = String(normalized.sender_id || normalized.user_id || normalized.author_id) === String(currentUser?.id);
    const actions: any[] = [
      { text: 'Transférer', onPress: () => { shareMessage(normalized); } },
      { text: isChatFavorite ? 'Retirer des favoris' : 'Mettre en favoris', onPress: () => { toggleChatFavorite(); } },
      { text: 'Supprimer pour moi', style: 'destructive', onPress: () => { deleteMessage(normalized, 'me'); } },
    ];

    if (isMine) {
      actions.splice(2, 0, {
        text: 'Supprimer pour tous',
        style: 'destructive',
        onPress: () => { deleteMessage(normalized, 'everyone'); },
      });
    }
    actions.push({ text: 'Annuler', style: 'cancel' });
    Alert.alert('Actions du message', normalized.content || normalized.file_name || 'Message média', actions);
  }, [currentUser?.id, deleteMessage, isChatFavorite, shareMessage, toggleChatFavorite]);

  const playAudio = useCallback(async (item: any) => {
    const normalized = dedupePayload(item);
    const url = getFullUrl(normalized.file_url || normalized.media_url || normalized.localUri);
    if (!url) return;

    try {
      if (sound && playingId === normalized.id) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await sound.pauseAsync();
          setPlayingId(null);
          setPlaybackStatus((prev) => ({ ...prev, [normalized.id]: { ...prev[normalized.id], isPlaying: false, positionMillis: status.positionMillis || 0, durationMillis: status.durationMillis || prev[normalized.id]?.durationMillis || 0 } }));
          return;
        }
      }

      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: nextSound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true }, (status) => {
        if (status.isLoaded) {
          setPlaybackStatus((prev) => ({
            ...prev,
            [normalized.id]: {
              isPlaying: status.isPlaying,
              positionMillis: status.positionMillis || 0,
              durationMillis: status.durationMillis || prev[normalized.id]?.durationMillis || 0,
            },
          }));
        }
      });

      setSound(nextSound);
      setPlayingId(normalized.id);
      setPlaybackStatus((prev) => ({ ...prev, [normalized.id]: { isPlaying: true, positionMillis: 0, durationMillis: prev[normalized.id]?.durationMillis || 0 } }));
      await nextSound.playAsync();
    } catch (error) {
      console.error('Audio playback error', error);
      Alert.alert('Audio', 'Unable to play this audio file.');
    }
  }, [playingId, sound]);

  const downloadFile = useCallback(async (item: any) => {
    const normalized = dedupePayload(item);
    const targetUrl = getFullUrl(normalized.file_url || normalized.media_url || normalized.localUri);
    if (!targetUrl) return;

    const existingLocal = downloadedFiles[normalized.id];
    if (existingLocal) {
      await Sharing.shareAsync(existingLocal, { mimeType: normalized.mime_type || '*/*', UTI: normalized.mime_type || undefined });
      return;
    }

    if (downloadProgress[normalized.id] !== undefined && downloadProgress[normalized.id] !== -1) return;

    setDownloadProgress((prev) => ({ ...prev, [normalized.id]: 0 }));

    try {
      const safeName = `${encodeURIComponent(String(normalized.id))}-${encodeURIComponent(normalized.file_name || 'file')}`;
      const fileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${safeName}`;
      const result = await FileSystem.downloadAsync(targetUrl, fileUri);
      setDownloadedFiles((prev) => ({ ...prev, [normalized.id]: result.uri }));
      setDownloadProgress((prev) => ({ ...prev, [normalized.id]: 1 }));

      if (Platform.OS !== 'web') {
        await Sharing.shareAsync(result.uri, { mimeType: normalized.mime_type || '*/*', UTI: normalized.mime_type || undefined });
      } else {
        await Share.share({ url: result.uri, message: normalized.file_name || 'Shared file' });
      }
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next[normalized.id];
        return next;
      });
    } catch (error) {
      console.error('Download error', error);
      setDownloadProgress((prev) => ({ ...prev, [normalized.id]: -1 }));
      Alert.alert('Download failed', 'Unable to download the file for this message.');
    }
  }, [downloadProgress, downloadedFiles]);

  const sendMessage = useCallback(async () => {
    if (!chatId || !input.trim()) return;
    setIsSending(true);
    try {
      const res = await apiService.sendMessage(chatId, input.trim(), 'text');
      if (!res?.success) {
        Alert.alert('Échec de l’envoi', res?.error || 'Le message n’a pas pu être envoyé.');
        return;
      }
      setInput('');
      await loadMessages();
    } catch (error) {
      console.error('Send message error', error);
    } finally {
      setIsSending(false);
    }
  }, [chatId, input, loadMessages]);

  const startVoiceRecording = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Messages vocaux', 'L’enregistrement vocal est disponible dans l’application mobile.');
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Autorisation du micro', 'Autorisez l’accès au microphone pour enregistrer un message vocal.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      setRecordingDuration(0);
      const result = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.isRecording) setRecordingDuration(status.durationMillis || 0);
        }
      );
      recordingRef.current = result.recording;
      setRecording(result.recording);
    } catch (error) {
      console.error('Voice recording start failed', error);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch((modeError) => {
        console.error('Unable to reset audio mode after recording setup', modeError);
      });
      Alert.alert('Échec de l’enregistrement', 'Impossible de démarrer l’enregistrement vocal.');
    }
  }, []);

  const stopVoiceRecording = useCallback(async () => {
    if (!recording || !chatId) return;
    const activeRecording = recording;
    recordingRef.current = null;
    setRecording(null);
    setIsSending(true);

    try {
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      const status = await activeRecording.getStatusAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (!uri) throw new Error('The recording file was not created.');

      const uploadRes = await apiService.uploadFile({
        uri,
        name: `voice-${Date.now()}.m4a`,
        type: 'audio/mp4',
        mimeType: 'audio/mp4',
      }, 'audio');
      if (!uploadRes.success || !uploadRes.data?.fileUrl) {
        throw new Error(uploadRes.error || 'Impossible d’envoyer le fichier vocal.');
      }

        const durationMillis = status.durationMillis || recordingDuration;
      const sendRes = await apiService.sendMessage(
        chatId,
        'Message vocal',
        'audio',
        uploadRes.data.fileUrl,
        {
          mimeType: uploadRes.data.mimeType || 'audio/mp4',
          fileSize: uploadRes.data.fileSize,
          duration: Math.round(durationMillis / 1000),
        }
      );
      if (!sendRes.success) throw new Error(sendRes.error || 'Impossible d’envoyer le message vocal.');
      await loadMessages();
    } catch (error: any) {
      console.error('Voice message send failed', error);
      Alert.alert('Message vocal', error.message || 'Impossible d’envoyer le message vocal.');
    } finally {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch((error) => {
        console.error('Unable to reset audio mode', error);
      });
      setRecordingDuration(0);
      setIsSending(false);
    }
  }, [chatId, loadMessages, recording, recordingDuration]);

  const sendImage = useCallback(async (selected: ImagePicker.ImagePickerAsset) => {
    if (!chatId) return;
    setIsSending(true);
    try {
      const photoName = selected.fileName || `photo-${Date.now()}.jpg`;
      const uploadRes = await apiService.uploadFile({ uri: selected.uri, name: photoName, type: selected.mimeType || 'image/jpeg' }, 'image');
      if (!uploadRes.success) {
        Alert.alert('Échec de l’envoi', uploadRes.error || 'Impossible de téléverser la photo.');
        return;
      }

      const imageUrl = uploadRes.data?.url || uploadRes.data?.fileUrl;
      if (!imageUrl) {
        Alert.alert('Échec de l’envoi', 'Le serveur n’a pas retourné le fichier photo.');
        return;
      }

      const sendRes = await apiService.sendMessage(chatId, photoName, 'image', imageUrl, {
        mimeType: selected.mimeType || 'image/jpeg',
        fileName: photoName,
        fileSize: selected.fileSize || uploadRes.data?.fileSize,
      });

      if (!sendRes.success) {
        Alert.alert('Échec de l’envoi', sendRes.error || 'Impossible d’envoyer la photo.');
        return;
      }

      await loadMessages();
    } catch (error) {
      console.error('Photo send failed', error);
      Alert.alert('Échec de l’envoi', 'Impossible d’envoyer la photo.');
    } finally {
      setIsSending(false);
    }
  }, [chatId, loadMessages]);

  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Autorisation requise', 'Autorisez l’accès à la galerie pour envoyer une photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      await sendImage(result.assets[0]);
    }
  }, [sendImage]);

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Autorisation requise', 'Autorisez l’accès à la caméra pour prendre une photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      await sendImage(result.assets[0]);
    }
  }, [sendImage]);

  const saveWallpaper = useCallback(async (nextWallpaperId: string, nextCustomUri: string | null) => {
    try {
      await AsyncStorage.setItem(wallpaperStorageKey, JSON.stringify({
        wallpaperId: nextWallpaperId,
        customWallpaperUri: nextCustomUri,
      }));
      setWallpaperId(nextWallpaperId);
      setCustomWallpaperUri(nextCustomUri);
      setIsWallpaperPickerOpen(false);
    } catch (error) {
      console.error('Unable to save chat wallpaper', error);
      Alert.alert('Fond d’écran', 'Impossible d’enregistrer ce fond d’écran.');
    }
  }, [wallpaperStorageKey]);

  const pickCustomWallpaper = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Autorisation requise', 'Autorisez l’accès à la galerie pour choisir un fond d’écran.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      await saveWallpaper('custom', result.assets[0].uri);
    }
  }, [saveWallpaper]);

  const pickDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false });
    if (result.canceled || !result.assets?.[0]) return;
    const selected = result.assets[0];
    const uploadRes = await apiService.uploadFile({ uri: selected.uri, name: selected.name, type: selected.mimeType || 'application/octet-stream' }, 'document');
    if (!uploadRes.success) {
      Alert.alert('Échec de l’envoi', uploadRes.error || 'Impossible de téléverser le document.');
      return;
    }

    const documentUrl = uploadRes.data?.url || uploadRes.data?.fileUrl;
    if (!documentUrl) {
      Alert.alert('Échec de l’envoi', 'Le serveur n’a pas retourné le fichier document.');
      return;
    }

    const sendRes = await apiService.sendMessage(chatId, selected.name, 'file', documentUrl, {
      mimeType: selected.mimeType || uploadRes.data?.mimeType || 'application/octet-stream',
      fileName: selected.name,
      fileSize: selected.size || uploadRes.data?.fileSize,
    });
    if (!sendRes.success) {
      Alert.alert('Échec de l’envoi', sendRes.error || 'Impossible d’envoyer le document sélectionné.');
      return;
    }
    await loadMessages();
  }, [chatId, loadMessages]);

  const renderItem = ({ item }: { item: any }) => {
    const normalizedItem = dedupePayload(item);
    return (
      <MessageItem
        item={normalizedItem}
        isMe={String(normalizedItem.sender_id || normalizedItem.user_id || normalizedItem.author_id) === String(currentUser?.id)}
        isGroup={Boolean(route?.params?.isGroup || chatInfo?.type === 'group')}
        sender={normalizedItem.sender || normalizedItem.user || chatInfo?.participants?.find?.((p: any) => p.id !== currentUser?.id) || null}
        currentUser={currentUser}
      themeColors={colors}
      isDark={isDark}
      getFullUrl={getFullUrl}
      handleMessageLongPress={handleMessageLongPress}
      playAudio={playAudio}
      playingId={playingId}
      playbackStatus={playbackStatus}
      downloadFile={downloadFile}
      downloadProgress={downloadProgress}
      downloadedFiles={downloadedFiles}
      t={t}
      onTranslate={() => Promise.resolve()}
      onLike={likeMessage}
      chatColor={colors.primary}
      styles={styles}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation?.goBack?.()}>
            <ArrowLeft size={20} color={colors.text.primary} />
          </TouchableOpacity>
          {currentChatAvatar ? (
            <Image source={{ uri: getFullUrl(currentChatAvatar) || undefined }} style={styles.avatar} resizeMode="cover" />
          ) : (
            <View style={styles.avatar} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{currentChatName}</Text>
            <Text style={styles.headerSubtitle}>{isLoading ? 'Loading...' : 'Online'}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={takePhoto}
            accessibilityRole="button"
            accessibilityLabel="Prendre une photo"
          >
            <Camera size={18} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setIsWallpaperPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Personnaliser la conversation"
          >
            <MoreVertical size={18} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.bottom + 8}>
        <ImageBackground source={wallpaperSource} style={styles.body} imageStyle={styles.wallpaper}>
          {isLoading && messages.length === 0 ? (
            <View style={styles.center}><ActivityIndicator size="small" color={colors.primary} /></View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />
          )}
        </ImageBackground>

        <View style={styles.composer}>
          <TouchableOpacity style={styles.iconButton} onPress={pickImage} accessibilityRole="button" accessibilityLabel="Envoyer une photo">
            <ImageIcon size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={pickDocument}><Paperclip size={18} color={colors.primary} /></TouchableOpacity>

          <View style={styles.inputBox}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Message"
              placeholderTextColor={colors.text.secondary}
              style={styles.textInput}
              multiline
            />
            {recording ? (
              <Text style={styles.recordingTime}>{formatDuration(recordingDuration / 1000)}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.iconButton, recording && styles.recordingButton]}
              onPress={recording ? stopVoiceRecording : startVoiceRecording}
              disabled={isSending}
              accessibilityRole="button"
              accessibilityLabel={recording ? 'Arrêter et envoyer le message vocal' : 'Enregistrer un message vocal'}
            >
              {recording ? <Square size={16} color="#fff" fill="#fff" /> : <Mic size={18} color={colors.primary} />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={isSending || !input.trim()}>
            {isSending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        transparent
        visible={Platform.OS === 'web' && Boolean(selectedMessage)}
        animationType="fade"
        onRequestClose={() => setSelectedMessage(null)}
      >
        <Pressable style={styles.actionSheetOverlay} onPress={() => setSelectedMessage(null)}>
          <View style={styles.actionSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.actionSheetTitle}>Actions du message</Text>
            <TouchableOpacity
              style={styles.actionSheetButton}
              onPress={() => {
                const item = selectedMessage;
                setSelectedMessage(null);
                shareMessage(item);
              }}
            >
              <Text style={styles.actionSheetButtonText}>Transférer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionSheetButton}
              onPress={() => {
                setSelectedMessage(null);
                toggleChatFavorite();
              }}
            >
              <Text style={styles.actionSheetButtonText}>{isChatFavorite ? 'Retirer des favoris' : 'Mettre en favoris'}</Text>
            </TouchableOpacity>
            {selectedMessage && String(selectedMessage.sender_id || selectedMessage.user_id || selectedMessage.author_id) === String(currentUser?.id) && (
              <TouchableOpacity
                style={styles.actionSheetButton}
                onPress={() => {
                  const item = selectedMessage;
                  setSelectedMessage(null);
                  deleteMessage(item, 'everyone');
                }}
              >
                <Text style={[styles.actionSheetButtonText, styles.destructiveAction]}>Supprimer pour tous</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionSheetButton}
              onPress={() => {
                const item = selectedMessage;
                setSelectedMessage(null);
                deleteMessage(item, 'me');
              }}
            >
              <Text style={[styles.actionSheetButtonText, styles.destructiveAction]}>Supprimer pour moi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetButton} onPress={() => setSelectedMessage(null)}>
              <Text style={styles.actionSheetButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={isWallpaperPickerOpen}
        animationType="slide"
        onRequestClose={() => setIsWallpaperPickerOpen(false)}
      >
        <Pressable style={styles.actionSheetOverlay} onPress={() => setIsWallpaperPickerOpen(false)}>
          <View style={styles.actionSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.actionSheetTitle}>Personnaliser le fond d’écran</Text>
            <View style={styles.wallpaperGrid}>
              {PRESET_WALLPAPERS.map((wallpaper) => (
                <TouchableOpacity
                  key={wallpaper.id}
                  style={[styles.wallpaperOption, !customWallpaperUri && wallpaperId === wallpaper.id && styles.wallpaperOptionSelected]}
                  onPress={() => saveWallpaper(wallpaper.id, null)}
                  accessibilityRole="button"
                  accessibilityLabel={`Fond d’écran ${wallpaper.name}`}
                >
                  <Image source={wallpaper.image} style={styles.wallpaperPreview} />
                  <Text style={styles.wallpaperLabel}>{wallpaper.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.actionSheetButton} onPress={pickCustomWallpaper}>
              <Text style={styles.actionSheetButtonText}>Choisir une photo personnalisée</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetButton} onPress={() => setIsWallpaperPickerOpen(false)}>
              <Text style={styles.actionSheetButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
