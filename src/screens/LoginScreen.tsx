import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import {
  ShieldAlert, X, Mail, Megaphone, MessageSquare,
  Heart, EyeOff, Eye
} from 'lucide-react-native';
import apiService from '../services/api.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { APP_VERSION } from '../utils/constants';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation, route }: any) {
  const { colors, normalize, isDark, fontSizeFactor } = useTheme();
  const { setUser } = useUser();

  const mode = route.params?.mode || 'full'; // 'full' or 'password_only'
  const [email, setEmail] = useState(route.params?.email || '');
  const [name, setName] = useState(route.params?.name || '');

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [isLocked, setIsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState('');
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [sendingAppeal, setSendingAppeal] = useState(false);

  const insets = useSafeAreaInsets();
  const shakeOffset = useSharedValue(0);

  useEffect(() => {
    checkLastLogin();
    // Gérer le blocage détecté au démarrage (Splash)
    if (route.params?.isLocked) {
      setIsLocked(true);
      setLockMessage(route.params.lockMessage);
      triggerShake();
    }
  }, [route.params]);

  const checkLastLogin = async () => {
    try {
      const lastUser = await AsyncStorage.getItem('user');
      if (lastUser) {
        const user = JSON.parse(lastUser);
        if (user && user.email) setEmail(user.email);
      }
    } catch (e) {
      console.warn('Login: Failed to parse last user', e);
    }
  };

  const triggerShake = () => {
    shakeOffset.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withRepeat(withTiming(10, { duration: 100 }), 5, true),
      withTiming(0, { duration: 50 })
    );
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);

    const deviceInfo = {
      brand: Device.brand,
      model: Device.modelName,
      os: Device.osName,
      version: Device.osVersion
    };

    try {
      const response = await apiService.login({
        email,
        password,
        device_info: deviceInfo,
        appVersion: APP_VERSION
      });
      if (response.success) {
        // 1. Mettre à jour le contexte utilisateur et attendre la persistance
        await setUser(response.data.user);

        // 2. Mettre à jour le timestamp d'ouverture
        await AsyncStorage.setItem('last_app_open', Date.now().toString());

        // 3. Petite pause pour laisser le temps au state de se propager avant le switch
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'ChatList' }],
          });
        }, 300);
      } else {
        triggerShake();
        if (response.isLocked) {
          setIsLocked(true);
          setLockMessage(response.message || 'Compte bloqué');
        } else if ((response as any).attemptsLeft !== undefined) {
          Alert.alert(
            '⚠️ Sécurité',
            `Mot de passe incorrect. Attention, après 3 tentatives infructueuses, votre accès sera définitivement bloqué.\n\nTentatives restantes : ${(response as any).attemptsLeft}`,
            [{ text: "J'ai compris", style: 'destructive' }]
          );
        } else {
          Alert.alert('Erreur', response.error || 'Échec de la connexion');
        }
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Une erreur réseau est survenue');
    } finally {
      setLoading(false);
    }
  };

  const animatedShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  const styles = createStyles(colors, normalize, fontSizeFactor, isDark);

  const handleSendAppeal = async () => {
    if (!appealReason.trim()) return;
    setSendingAppeal(true);
    try {
      const res = await apiService.submitAppeal(appealReason);
      if (res.success) {
        Alert.alert("Envoyé", "Votre contestation a été transmise à l'administrateur.");
        setShowAppealModal(false);
        setAppealReason('');
      } else {
        Alert.alert("Erreur", res.error || "Impossible d'envoyer la demande.");
      }
    } catch (e: any) {
      const msg = e.response?.data?.error || "Un problème est survenu lors de l'envoi.";
      Alert.alert("Erreur", msg);
    } finally {
      setSendingAppeal(false);
    }
  };

  if (isLocked) {
    return (
      <View style={styles.bannedContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#7a0000" />
        <View style={styles.bannedHeader}>
          <Animated.View style={[styles.bannedIconCircle, animatedShakeStyle]}>
            <ShieldAlert size={80} color="#ff3b30" />
            <X size={40} color="#ff3b30" style={styles.bannedX} />
          </Animated.View>
          <Text style={styles.bannedTitle}>COMPTE BANNI</Text>
        </View>

        <View style={styles.bannedContent}>
          <Text style={styles.bannedText}>
            L'accès à ce compte Meet Me a été suspendu pour violation grave de nos conditions d'utilisation.
          </Text>

          <View style={styles.bannedInfoBox}>
            <Text style={styles.infoBoxLabel}>Motif du bannissement :</Text>
            <Text style={styles.infoBoxValue}>{lockMessage || 'Non-respect des règles communautaires'}</Text>
          </View>

          <Text style={styles.supportText}>
            Si vous pensez qu'il s'agit d'une erreur, vous pouvez contacter notre centre d'assistance :
          </Text>

          <TouchableOpacity
            style={styles.emailButton}
            onPress={() => Alert.alert("Assistance", "Email: support@meetme.app")}
          >
            <Mail size={20} color="#fff" />
            <Text style={styles.emailButtonText}>support@meetme.app</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[ { backgroundColor: '#ff3b30', marginTop: 15, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 30 }]}
            onPress={() => setShowAppealModal(true)}
          >
            <Megaphone size={20} color="#fff" />
            <Text style={[styles.emailButtonText, {marginLeft: 10}]}>CONTESTER LE BLOCAGE</Text>
          </TouchableOpacity>
        </View>

        {/* Modal de contestation */}
        {showAppealModal && (
          <View style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20}}>
            <View style={{backgroundColor: '#fff', borderRadius: 20, padding: 20}}>
              <Text style={{fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 15, textAlign: 'center'}}>Pourquoi contester ?</Text>
              <TextInput
                style={{backgroundColor: '#f5f5f5', borderRadius: 15, padding: 15, minHeight: 120, textAlignVertical: 'top', color: '#000'}}
                multiline
                placeholder="Expliquez-nous votre situation..."
                value={appealReason}
                onChangeText={setAppealReason}
              />
              <View style={{flexDirection: 'row', marginTop: 20, justifyContent: 'space-between'}}>
                <TouchableOpacity onPress={() => setShowAppealModal(false)} style={{padding: 15, flex: 1}}><Text style={{textAlign: 'center', fontWeight: 'bold', color: '#999'}}>ANNULER</Text></TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSendAppeal}
                  disabled={sendingAppeal}
                  style={{padding: 15, flex: 1, backgroundColor: '#ff3b30', borderRadius: 15}}
                >
                  {sendingAppeal ? <ActivityIndicator color="#fff" /> : <Text style={{textAlign: 'center', fontWeight: 'bold', color: '#fff'}}>ENVOYER</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={() => { setIsLocked(false); navigation.navigate('Signup'); }}
          style={styles.bannedFooterBtn}
        >
          <Text style={styles.bannedFooterText}>CRÉER UN NOUVEAU COMPTE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.contentWrapper}>
            <View style={styles.logoContainer}>
              <View style={[styles.iconStack, { backgroundColor: colors.primary }]}>
                <MessageSquare size={normalize(45)} color="#fff" />
                <Heart size={normalize(20)} color={colors.secondary} style={styles.heartIcon} />
              </View>
              <Text style={[styles.appName, { color: colors.primary }]}>Meet Me</Text>
              <Text style={[styles.tagline, { color: colors.text.secondary }]}>
                {mode === 'password_only' ? `Heureux de vous revoir, ${name.split(' ')[0]} !` : 'Connexion sécurisée'}
              </Text>
            </View>

            <Animated.View style={[styles.formContainer, animatedShakeStyle]}>
              {mode === 'full' ? (
                <>
                  <Text style={[styles.label, { color: colors.text.primary }]}>Adresse Email</Text>
                  <View style={[styles.inputContainer, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.input, { color: colors.text.primary }]}
                      placeholder="votre@email.com"
                      placeholderTextColor={colors.text.disabled}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </>
              ) : (
                <View style={styles.lockedEmailContainer}>
                   <Mail size={16} color={colors.text.secondary} />
                   <Text style={[styles.lockedEmailText, { color: colors.text.secondary }]}>{email}</Text>
                </View>
              )}

              <Text style={[styles.label, { color: colors.text.primary }]}>Mot de passe</Text>
              <View style={[styles.inputContainer, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  placeholder="Votre mot de passe"
                  placeholderTextColor={colors.text.disabled}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordToggle}>
                  {showPassword ? <EyeOff size={normalize(20)} color={colors.text.secondary} /> : <Eye size={normalize(20)} color={colors.text.secondary} />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, { backgroundColor: colors.primary }, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>{mode === 'password_only' ? 'DÉVERROUILLER' : 'SE CONNECTER'}</Text>}
              </TouchableOpacity>

              <View style={styles.footerLinks}>
                {mode === 'full' ? (
                  <TouchableOpacity style={[styles.signupButton, { borderColor: colors.primary }]} onPress={() => navigation.navigate('Signup')}>
                    <Text style={[styles.signupButtonText, { color: colors.primary }]}>CRÉER UN COMPTE</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.switchAccountBtn} onPress={() => navigation.setParams({ mode: 'full', email: '', name: '' })}>
                    <Text style={[styles.switchAccountText, { color: colors.primary }]}>Ce n'est pas vous ? Changer de compte</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotPassword}>
                  <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Mot de passe oublié ?</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Helpdesk')} style={styles.helpdeskLink}>
                  <Text style={[styles.helpdeskLinkText, { color: colors.text.secondary }]}>Besoin d'aide ? Contacter le support</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: any, normalize: any, factor: number, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center' },
  contentWrapper: {
    paddingHorizontal: width > 600 ? '20%' : 30,
    paddingVertical: 40,
    alignItems: 'center'
  },
  bannedContainer: { flex: 1, backgroundColor: '#000', padding: 30, justifyContent: 'center' },
  bannedHeader: { alignItems: 'center', marginBottom: 40 },
  bannedIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255, 59, 48, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ff3b30' },
  bannedX: { position: 'absolute' },
  bannedTitle: { color: '#ff3b30', fontSize: normalize(28, factor), fontWeight: '900', marginTop: 20, letterSpacing: 4 },
  bannedContent: { alignItems: 'center' },
  bannedText: { color: '#fff', textAlign: 'center', fontSize: normalize(16, factor), lineHeight: 26, opacity: 0.8 },
  bannedInfoBox: { backgroundColor: '#1a1a1a', width: '100%', padding: 20, borderRadius: 15, marginVertical: 30, borderLeftWidth: 4, borderLeftColor: '#ff3b30' },
  infoBoxLabel: { color: '#666', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  infoBoxValue: { color: '#fff', fontSize: 15, marginTop: 5, fontWeight: '600' },
  supportText: { color: '#999', textAlign: 'center', fontSize: 13, marginBottom: 20 },
  emailButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 30 },
  emailButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 10, fontSize: 15 },
  bannedFooterBtn: { position: 'absolute', bottom: 40, left: 30, right: 30, alignItems: 'center' },
  bannedFooterText: { color: '#666', fontWeight: 'bold', fontSize: 12, textDecorationLine: 'underline' },
  logoContainer: { alignItems: 'center', marginBottom: normalize(45) },
  iconStack: { width: normalize(90), height: normalize(90), borderRadius: normalize(45), justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 5 },
  heartIcon: { position: 'absolute', bottom: normalize(20) },
  appName: { fontSize: normalize(32, factor), fontWeight: 'bold' },
  tagline: { fontSize: normalize(14, factor), textAlign: 'center', marginTop: 8 },
  formContainer: { width: '100%' },
  label: { fontSize: normalize(13, factor), fontWeight: '700', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRadius: 15, marginBottom: 20, height: normalize(55), borderWidth: 1.5 },
  input: { flex: 1, fontSize: normalize(16, factor) },
  lockedEmailContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderRadius: 12, marginBottom: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
  lockedEmailText: { fontSize: normalize(14, factor), marginLeft: 10, fontWeight: '600' },
  passwordToggle: { padding: 5 },
  loginButton: { borderRadius: 30, height: normalize(55), justifyContent: 'center', alignItems: 'center', marginTop: 15, elevation: 3 },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: { color: '#fff', fontSize: normalize(16, factor), fontWeight: 'bold' },
  footerLinks: { alignItems: 'center', marginTop: 10, width: '100%' },
  signupButton: { backgroundColor: 'transparent', borderRadius: 30, height: normalize(55), justifyContent: 'center', alignItems: 'center', marginTop: 20, borderWidth: 2, width: '100%' },
  signupButtonText: { fontSize: normalize(16, factor), fontWeight: 'bold' },
  switchAccountBtn: { marginTop: 20, padding: 10 },
  switchAccountText: { fontSize: normalize(13, factor), fontWeight: 'bold', textDecorationLine: 'underline' },
  forgotPassword: { marginTop: 25 },
  forgotPasswordText: { fontSize: normalize(14, factor), fontWeight: '600' },
  helpdeskLink: { marginTop: 20 },
  helpdeskLinkText: { fontSize: normalize(12, factor), textDecorationLine: 'underline' },
});
