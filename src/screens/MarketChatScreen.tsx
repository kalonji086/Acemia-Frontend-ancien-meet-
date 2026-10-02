import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function MarketChatScreen({ route, navigation }: any) {
  const { conversationId, name } = route.params;
  const { colors } = useTheme();
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    const response = await apiService.getMarketMessages(conversationId);
    if (response.success) setMessages(response.data);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    loadMessages().catch(() => setLoading(false));
  }, [loadMessages]);

  const send = async () => {
    const value = content.trim();
    if (!value || sending) return;
    setSending(true);
    const response = await apiService.sendMarketMessage(conversationId, value);
    if (response.success) {
      setMessages(current => [...current, response.data]);
      setContent('');
    }
    setSending(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={24} color={colors.text.primary} /></TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.text.primary }]}>{name}</Text>
          <Text style={[styles.subtitle, { color: colors.primary }]}>Discussion Market</Text>
        </View>
      </View>
      {loading ? <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View> : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) => (
            <View style={[styles.bubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sender, { color: colors.primary }]}>{item.full_name || 'Utilisateur'}</Text>
              <Text style={{ color: colors.text.primary }}>{item.content}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.text.secondary }]}>Commencez cette discussion commerciale.</Text>}
        />
      )}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <TextInput value={content} onChangeText={setContent} placeholder="Écrire un message commercial…" placeholderTextColor={colors.text.disabled} style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]} multiline />
          <TouchableOpacity onPress={send} disabled={sending || !content.trim()} style={[styles.send, { backgroundColor: colors.primary, opacity: sending || !content.trim() ? 0.5 : 1 }]}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  back: { padding: 8, marginRight: 8 },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { marginTop: 2, fontSize: 12, fontWeight: '700' },
  messages: { padding: 16, gap: 10 },
  bubble: { alignSelf: 'flex-start', maxWidth: '85%', padding: 12, borderWidth: 1, borderRadius: 14 },
  sender: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  empty: { textAlign: 'center', paddingTop: 30 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }
});
