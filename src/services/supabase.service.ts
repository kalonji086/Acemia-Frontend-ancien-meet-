import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// These should be in your .env file
const supabaseUrl = 'https://jpddrhqpzydjugwhgddr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZGRyaHFwenlkanVnd2hnZGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NjQxNzEsImV4cCI6MjEwMTA0MDE3MX0.fVdv0f_7hi7M6RsAFnsjbBz8TIhDvfT5ZsexLEpH3AA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return session;
};

export const subscribeToMessages = (chatId: string, onNewMessage: (message: any) => void) => {
  return supabase
    .channel(`chat:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        onNewMessage(payload.new);
      }
    )
    .subscribe();
};

export const sendMessage = async (chatId: string, userId: string, content: string, type = 'text', fileUrl?: string) => {
  const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        chat_id: chatId,
        sender_id: userId,
        content,
        type,
        file_url: fileUrl
      },
    ]);

  if (error) throw error;
  return data;
};

export const uploadAudioMessage = async (uri: string, userId: string) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileName = `${userId}/${Date.now()}.m4a`;

    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(fileName, blob, {
        contentType: 'audio/m4a',
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('chat-media')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (err) {
    console.error('Upload error:', err);
    throw err;
  }
};
