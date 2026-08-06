import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SocketService from '../services/socket.service';
import apiService from '../services/api.service';

export default function IncomingCallScreen({ navigation, route }: any) {
  const { fromUserId, channelName, callType, callId } = route.params || {};
  const [caller, setCaller] = useState<any>(null);

  useEffect(() => {
    const loadCaller = async () => {
      if (!fromUserId) return;
      const res = await apiService.getUserById(fromUserId);
      if (res.success) setCaller(res.data);
    };
    loadCaller();
  }, [fromUserId]);

  useEffect(() => {
    return () => {
      // cleanup if navigated away
    };
  }, []);

  const accept = () => {
    SocketService.acceptCall(callId);
    // Navigate to corresponding call screen
    if (callType === 'video') {
      navigation.replace('VideoCall', { chatId: channelName, outgoing: false, callId, peerUserId: fromUserId });
    } else {
      navigation.replace('AudioCall', { chatId: channelName, outgoing: false, callId, peerUserId: fromUserId });
    }
  };

  const reject = () => {
    SocketService.rejectCall(callId);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Ionicons name="call" size={48} color="#4caf50" />
        <Text style={styles.title}>Appel entrant</Text>
        <Text style={styles.subtitle}>De: {caller?.name || caller?.username || fromUserId || 'Inconnu'}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.btn, styles.reject]} onPress={reject}>
          <Ionicons name="close" size={28} color="#fff" />
          <Text style={styles.btnText}>Refuser</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.accept]} onPress={accept}>
          <Ionicons name="checkmark" size={28} color="#fff" />
          <Text style={styles.btnText}>Accepter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', padding: 40, backgroundColor: '#101217' },
  info: { alignItems: 'center', marginTop: 80 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 16 },
  subtitle: { color: '#ddd', fontSize: 16, marginTop: 8 },
  controls: { flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 60 },
  btn: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  accept: { backgroundColor: '#4caf50' },
  reject: { backgroundColor: '#ff3b30' },
  btnText: { color: '#fff', marginTop: 8 }
});
