import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ImageBackground,
  Alert,
  ActivityIndicator,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import {
  ShieldAlert, X, Mail, Lock, Megaphone, EyeOff, Eye
} from 'lucide-react-native';
import apiService from '../services/api.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VERSION } from '../utils/constants';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';

export default function LoginScreen({ navigation, route }: any) {
  const { colors, normalize, isDark, fontSizeFactor } = useTheme();
  const { width } = useWindowDimensions();
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
  const passwordInputRef = useRef<TextInput>(null);

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
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert('Erreur', 'Veuillez saisir une adresse email valide.');
      return;
    }

    setLoading(true);

    try {
      const deviceInfo = await apiService.getDeviceInfo();
      const response = await apiService.login({
        email: normalizedEmail,
        password,
        device_info: deviceInfo,
        appVersion: APP_VERSION
      });
      if (response.success) {
        const user = response.data?.user;
        if (!user) {
          Alert.alert('Erreur', 'La connexion a réussi, mais le profil utilisateur est incomplet. Réessayez.');
          return;
        }

        // 1. Mettre à jour le contexte utilisateur et attendre la persistance
        await setUser(user);

        // 2. Mettre à jour le timestamp d'ouverture
        try {
          await AsyncStorage.setItem('last_app_open', Date.now().toString());
        } catch (storageError) {
          console.warn('Login: Failed to save last app open timestamp', storageError);
        }

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
        } else if ((response as { attemptsLeft?: number }).attemptsLeft !== undefined) {
          Alert.alert(
            '⚠️ Sécurité',
            `Mot de passe incorrect. Attention, après 3 tentatives infructueuses, votre accès sera définitivement bloqué.\n\nTentatives restantes : ${(response as { attemptsLeft?: number }).attemptsLeft}`,
            [{ text: "J'ai compris", style: 'destructive' }]
          );
        } else {
          Alert.alert('Erreur', response.error || response.message || 'Échec de la connexion');
        }
      }
    } catch (error: any) {
      console.error('Login: Authentication failed', error);
      Alert.alert('Erreur', error?.message || 'Une erreur est survenue pendant la connexion.');
    } finally {
      setLoading(false);
    }
  };

  const animatedShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  const styles = createStyles(colors, normalize, fontSizeFactor, isDark, width);
  const isWide = width > 1024;

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
            L'accès à ce compte Acemia a été suspendu pour violation grave de nos conditions d'utilisation.
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
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
      <ImageBackground
        source={require('../../assets/AcemiaBackground.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backgroundImageOverlay]} />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.backgroundOrb, styles.backgroundOrbTop, { backgroundColor: colors.primary + '12' }]} />
        <View style={[styles.backgroundOrb, styles.backgroundOrbBottom, { backgroundColor: colors.secondary + '10' }]} />
      </View>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.contentWrapper, isWide && styles.wideContentWrapper]}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/AcemiaLogo.png')}
                style={styles.brandLogo}
                resizeMode="contain"
                accessibilityLabel="Acemia"
              />
              <Text style={[styles.tagline, { color: colors.text.secondary }]}>
                {mode === 'password_only' ? `Heureux de vous revoir, ${name.split(' ')[0]} !` : 'Connectez-vous pour retrouver vos proches'}
              </Text>
            </View>

            <Animated.View style={[styles.formContainer, animatedShakeStyle]}>
              <Text style={[styles.formTitle, { color: colors.text.primary }]}>
                {mode === 'password_only' ? 'Confirmer votre identité' : 'Bienvenue'}
              </Text>
              <Text style={[styles.formSubtitle, { color: colors.text.secondary }]}>
                {mode === 'password_only' ? 'Saisissez votre mot de passe pour continuer.' : 'Entrez vos identifiants pour vous connecter.'}
              </Text>
              {mode === 'full' ? (
                <>
                  <Text style={[styles.label, { color: colors.text.primary }]}>Adresse Email</Text>
                  <View style={[styles.inputContainer, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border }]}>
                    <Mail size={normalize(18)} color={colors.text.secondary} />
                    <TextInput
                      style={[styles.input, { color: colors.text.primary }]}
                      placeholder="votre@email.com"
                      placeholderTextColor={colors.text.disabled}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      returnKeyType="next"
                      onSubmitEditing={() => passwordInputRef.current?.focus()}
                      accessibilityLabel="Adresse email"
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
                <Lock size={normalize(17)} color={colors.text.secondary} />
                <TextInput
                  ref={passwordInputRef}
                  style={[styles.input, { color: colors.text.primary }]}
                  placeholder="Votre mot de passe"
                  placeholderTextColor={colors.text.disabled}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  accessibilityLabel="Mot de passe"
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

const createStyles = (colors: any, normalize: any, factor: number, isDark: boolean, width: number) => StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingVertical: 28 },
  contentWrapper: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: width < 360 ? 18 : 26,
    paddingVertical: 24,
    alignItems: 'center',
  },
  wideContentWrapper: { maxWidth: 500 },
  backgroundOrb: { position: 'absolute', borderRadius: 999 },
  backgroundImageOverlay: { backgroundColor: 'rgba(255,255,255,0.56)' },
  backgroundOrbTop: { width: 260, height: 260, top: -150, right: -80 },
  backgroundOrbBottom: { width: 320, height: 320, bottom: -210, left: -150 },
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
  logoContainer: { alignItems: 'center', marginBottom: normalize(28) },
  brandLogo: { width: normalize(190), height: normalize(155), marginBottom: 8 },
  tagline: { fontSize: normalize(13, factor), textAlign: 'center', marginTop: 6 },
  formContainer: { width: '100%', padding: width < 360 ? 18 : 24, backgroundColor: colors.surface, borderRadius: 26, borderWidth: 1, borderColor: colors.border, shadowColor: '#17152B', shadowOpacity: isDark ? 0 : 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: isDark ? 0 : 3 },
  formTitle: { fontSize: normalize(21, factor), fontWeight: '800', letterSpacing: -0.4 },
  formSubtitle: { fontSize: normalize(13, factor), marginTop: 5, marginBottom: 24, lineHeight: normalize(19, factor) },
  label: { fontSize: normalize(12, factor), fontWeight: '700', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, borderRadius: 14, marginBottom: 20, height: normalize(54), borderWidth: 1 },
  input: { flex: 1, minWidth: 0, fontSize: normalize(15, factor) },
  lockedEmailContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderRadius: 12, marginBottom: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
  lockedEmailText: { fontSize: normalize(14, factor), marginLeft: 10, fontWeight: '600' },
  passwordToggle: { padding: 5 },
  loginButton: { borderRadius: 15, height: normalize(54), justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 3 },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: { color: '#fff', fontSize: normalize(16, factor), fontWeight: 'bold' },
  footerLinks: { alignItems: 'center', marginTop: 10, width: '100%' },
  signupButton: { backgroundColor: 'transparent', borderRadius: 15, height: normalize(52), justifyContent: 'center', alignItems: 'center', marginTop: 20, borderWidth: 1.5, width: '100%' },
  signupButtonText: { fontSize: normalize(16, factor), fontWeight: 'bold' },
  switchAccountBtn: { marginTop: 20, padding: 10 },
  switchAccountText: { fontSize: normalize(13, factor), fontWeight: 'bold', textDecorationLine: 'underline' },
  forgotPassword: { marginTop: 25 },
  forgotPasswordText: { fontSize: normalize(14, factor), fontWeight: '600' },
  helpdeskLink: { marginTop: 20 },
  helpdeskLinkText: { fontSize: normalize(12, factor), textDecorationLine: 'underline' },
});
