import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { ArrowLeft, KeyRound, School } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolLoginScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!code) return Alert.alert('Attention', 'Veuillez entrer votre code d\'accès unique.');

    setLoading(true);
    try {
      const res = await apiService.api.post('/school/login-by-code', { code });
      if (res.data.success) {
        const { type, role, user } = res.data;
        if (type === 'student') {
          navigation.navigate('StudentDashboard', { user });
        } else {
          navigation.navigate('SchoolStaffDashboard', { user, role });
        }
      }
    } catch (e: any) {
      Alert.alert('Erreur d\'accès', e.response?.data?.error || 'Code invalide ou erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <School size={60} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text.primary, fontSize: normalize(24) }]}>Espace Scolaire</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary, fontSize: normalize(14) }]}>
            Entrez le code unique fourni par votre établissement pour accéder à votre espace de gestion ou de suivi.
          </Text>

          <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
            <KeyRound size={20} color={colors.text.disabled} />
            <TextInput
              style={[styles.input, { color: colors.text.primary, fontSize: normalize(16) }]}
              placeholder="Ex: SCH-X12345 ou STU-Y67890"
              placeholderTextColor={colors.text.disabled}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Accéder à mon espace</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20 },
  content: { flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center' },
  iconContainer: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  title: { fontWeight: 'bold', marginBottom: 10 },
  subtitle: { textAlign: 'center', marginBottom: 40, lineHeight: 22 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 15, paddingHorizontal: 15, height: 60, width: '100%', marginBottom: 25 },
  input: { flex: 1, marginLeft: 12, height: '100%', fontWeight: 'bold', letterSpacing: 1 },
  loginBtn: { height: 60, borderRadius: 15, width: '100%', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  loginBtnText: { color: '#fff', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: 1 }
});
