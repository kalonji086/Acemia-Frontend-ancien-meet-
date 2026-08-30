import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react-native';
import apiService from '../services/api.service';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { SOCKET_URL } from '../utils/constants';
import { useFocusEffect } from '@react-navigation/native';
import socketService from '../services/socket.service';

export default function CallHistoryScreen({ navigation }: any) {
  const { colors, normalize, isDark } = useTheme();
  const { t } = useLanguage();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchHistory = async () => {
    try {
      const user = await apiService.getCurrentUser();
      setCurrentUser(user);
      const res = await apiService.getCallHistory();
      if (res.success) {
        setCalls(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();

      const onHistoryUpdate = () => fetchHistory();
      socketService.on('call:history_update', onHistoryUpdate);

      return () => {
        socketService.off('call:history_update', onHistoryUpdate);
      };
    }, [])
  );

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http')) return url;
    return `${SOCKET_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const renderItem = ({ item }: any) => {
    const isIncoming = item.callee_id === currentUser?.id;
    const isMissed = item.status === 'missed' || item.status === 'busy' || (isIncoming && item.status === 'rejected');
    const statusColor = isMissed ? colors.danger : (item.status === 'connected' ? '#2ecc71' : '#999');

    // Pour simplifier, on prend l'autre partie
    const peerName = isIncoming ? item.caller_name : item.callee_name;
    const peerAvatar = isIncoming ? item.caller_avatar : item.callee_avatar;

    const date = new Date(item.created_at);
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayName = dayNames[date.getDay()];
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let statusText = 'Appel';
    if (isIncoming) {
      if (item.status === 'missed') statusText = 'Appel manqué';
      else if (item.status === 'busy') statusText = 'Appel manqué (Occupé)';
      else if (item.status === 'rejected') statusText = 'Appel rejeté';
      else if (item.status === 'connected') statusText = 'Appel reçu';
      else statusText = 'Appel entrant';
    } else {
      statusText = 'Appel sortant';
      if (item.status === 'connected') statusText += ' (abouti)';
      else statusText += ' (non abouti)';
    }

    return (
      <View style={styles.callItem}>
        <Image
          source={{ uri: getFullUrl(peerAvatar) || `https://ui-avatars.com/api/?name=${peerName}` }}
          style={styles.avatar}
        />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text.primary }]}>{peerName}</Text>
          <View style={styles.statusRow}>
            {isIncoming ? (
              item.status === 'missed' ? <PhoneMissed size={14} color={statusColor} style={{ marginRight: 5 }} /> : <PhoneIncoming size={14} color={statusColor} style={{ marginRight: 5 }} />
            ) : (
              <PhoneOutgoing size={14} color={statusColor} style={{ marginRight: 5 }} />
            )}
            <Text style={[styles.status, { color: colors.text.secondary }]}>
              {statusText}
              {item.duration_seconds ? ` • ${item.duration_seconds}s` : ''}
            </Text>
          </View>
          <Text style={[styles.fullDate, { color: colors.text.disabled }]}>
            {dayName} {dateStr} à {timeStr}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Chat', {
            chatId: null, // Sera trouvé par le PeerUserId
            peerUserId: isIncoming ? item.caller_id : item.callee_id,
            name: peerName,
            avatar: peerAvatar
          })}
        >
          {item.call_type === 'video' ? <Video size={22} color={colors.primary} /> : <Phone size={22} color={colors.primary} />}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={calls}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Phone size={80} color={colors.text.disabled} />
            <Text style={{ color: colors.text.secondary, marginTop: 20 }}>Aucun historique d'appel</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingVertical: 10 },
  callItem: { flexDirection: 'row', padding: 15, alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  status: { fontSize: 13 },
  fullDate: { fontSize: 11, marginTop: 4 },
  time: { fontSize: 12, color: '#999' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 150 },
});
