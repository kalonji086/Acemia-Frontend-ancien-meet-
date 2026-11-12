import React, { useState, useRef, useEffect } from 'react';
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
  Image,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { Key, Mail, MailWarning, Lock, ShieldCheck, ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import apiService from '../services/api.service';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen({ navigation }: any) {
  const { colors, isDark, normalize, fontSizeFactor } = useTheme();
  const { width, height } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setNewConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: email, 2: code, 3: new password
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Refs pour l'OTP automatique
  const otpRefs = useRef<Array<TextInput | null>>([]);

  // Vérification de l'existence de l'email en temps réel
  useEffect(() => {
    if (step !== 1) return;

    const timer = setTimeout(async () => {
      if (email.includes('@') && email.length > 5) {
        try {
          const res: any = await apiService.checkAvailability({ email });
          // available: true signifie que l'email n'est PAS utilisé (donc n'existe pas)
          if (res.success) {
            setEmailError(res.available ? 'Cette adresse email n\'existe pas dans notre base de données.' : '');
          }
        } catch (e) {
          // Ignorer les erreurs silencieuses en mode temps réel
        }
      } else {
        setEmailError('');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [email, step]);

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert('Erreur', 'Veuillez entrer votre email');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.forgotPassword(email);
      if (response.success) {
        setStep(2);
        Alert.alert('Succès', 'Un code OTP a été envoyé à votre email');
      } else {
        throw new Error(response.message || response.error || 'Erreur lors de l\'envoi du code');
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      Alert.alert('Erreur', 'Veuillez entrer le code à 6 chiffres');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.verifyOTP(email, code);
      if (response.success) {
        setStep(3);
      } else {
        throw new Error(response.message || response.error || 'Code OTP invalide');
      }
    } catch (error: any) {
      Alert.alert('Code invalide', error.message || 'Le code saisi est incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.resetPassword(email, otp.join(''), newPassword);
      if (response.success) {
        Alert.alert('Succès', 'Votre mot de passe a été réinitialisé avec succès', [
          { text: 'Se connecter', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        throw new Error(response.error || 'Erreur lors de la réinitialisation');
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Gérer le copier-coller du code entier
      if (value.length === 6) {
        const pasteOtp = value.split('');
        setOtp(pasteOtp);
        otpRefs.current[5]?.focus();
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus suivant
    if (value !== '' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Retour arrière automatique
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const dynamicStyles = createStyles(colors, normalize, fontSizeFactor, width, height, isDark);

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <ImageBackground
        source={require('../../assets/AcemiaBackground.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, dynamicStyles.backgroundOverlay]} />
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={dynamicStyles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={dynamicStyles.contentWrapper}>
            <View style={dynamicStyles.hero}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={dynamicStyles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Retour"
              >
                <ArrowLeft size={21} color={colors.primary} />
              </TouchableOpacity>
              <Image
                source={require('../../assets/AcemiaLogo.png')}
                style={dynamicStyles.brandLogo}
                resizeMode="contain"
                accessibilityLabel="Acemia"
              />
              <Text style={dynamicStyles.title}>Mot de passe oublié</Text>
              <Text style={dynamicStyles.heroSubtitle}>Retrouvez l’accès à votre compte Acemia.</Text>
            </View>

            <View style={dynamicStyles.formContainer}>
              <View style={dynamicStyles.progressHeader}>
                <Text style={dynamicStyles.stepLabel}>ÉTAPE {step} SUR 3</Text>
                <View style={dynamicStyles.progressTrack}>
                  {[1, 2, 3].map((item) => (
                    <View
                      key={item}
                      style={[dynamicStyles.progressSegment, item <= step && dynamicStyles.progressSegmentActive]}
                    />
                  ))}
                </View>
              </View>

            {step === 1 && (
              <>
                <View style={dynamicStyles.iconContainer}>
                  <Key size={30} color={colors.primary} />
                </View>

                <Text style={dynamicStyles.description}>
                  Entrez votre adresse e-mail pour recevoir un code de réinitialisation.
                </Text>

                <View style={dynamicStyles.inputWrapper}>
                  <Mail size={19} color={colors.text.secondary} />
                  <TextInput
                    style={dynamicStyles.input}
                    placeholder="Votre adresse e-mail"
                    placeholderTextColor={colors.text.disabled}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    accessibilityLabel="Adresse e-mail"
                  />
                </View>

                {emailError ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 }}>
                    <MailWarning size={14} color={colors.danger} />
                    <Text style={{ flex: 1, color: colors.danger, fontSize: normalize(12, fontSizeFactor), marginLeft: 5, lineHeight: normalize(16, fontSizeFactor) }}>{emailError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity style={[dynamicStyles.primaryButton, (loading || !!emailError) && dynamicStyles.primaryButtonDisabled]} onPress={handleSendCode} disabled={loading || !!emailError}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={dynamicStyles.primaryButtonText}>ENVOYER LE CODE</Text>}
                </TouchableOpacity>
              </>
            )}

            {step === 2 && (
              <>
                <View style={dynamicStyles.iconContainer}>
                  <MailWarning size={30} color={colors.primary} />
                </View>

                <Text style={dynamicStyles.description}>
                  Entrez le code à 6 chiffres envoyé à votre adresse e-mail.
                </Text>
                <Text style={dynamicStyles.emailNotice}>{email}</Text>

                <View style={dynamicStyles.codeContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        otpRefs.current[index] = ref;
                      }}
                      style={dynamicStyles.codeInput}
                      maxLength={1}
                      keyboardType="number-pad"
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      selectTextOnFocus
                      accessibilityLabel={`Chiffre ${index + 1} du code`}
                    />
                  ))}
                </View>

                <TouchableOpacity style={[dynamicStyles.primaryButton, loading && dynamicStyles.primaryButtonDisabled]} onPress={handleVerifyCode} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={dynamicStyles.primaryButtonText}>VÉRIFIER LE CODE</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={dynamicStyles.resendBtn} onPress={handleSendCode} disabled={loading}>
                  <Text style={dynamicStyles.resendText}>Renvoyer le code</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 3 && (
              <>
                <View style={dynamicStyles.iconContainer}>
                  <Lock size={30} color={colors.primary} />
                </View>

                <Text style={dynamicStyles.description}>
                  Créez un nouveau mot de passe sécurisé pour votre compte.
                </Text>

                <View style={dynamicStyles.inputWrapper}>
                  <Lock size={19} color={colors.text.secondary} />
                  <TextInput
                    style={dynamicStyles.input}
                    placeholder="Nouveau mot de passe"
                    placeholderTextColor={colors.text.disabled}
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    autoComplete="new-password"
                    accessibilityLabel="Nouveau mot de passe"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={dynamicStyles.eyeIcon}>
                    {showPassword ? <EyeOff size={20} color={colors.text.secondary} /> : <Eye size={20} color={colors.text.secondary} />}
                  </TouchableOpacity>
                </View>

                <View style={dynamicStyles.inputWrapper}>
                  <ShieldCheck size={19} color={colors.text.secondary} />
                  <TextInput
                    style={dynamicStyles.input}
                    placeholder="Confirmer le nouveau mot de passe"
                    placeholderTextColor={colors.text.disabled}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setNewConfirmPassword}
                    autoComplete="new-password"
                    accessibilityLabel="Confirmer le nouveau mot de passe"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={dynamicStyles.eyeIcon}>
                    {showConfirmPassword ? <EyeOff size={20} color={colors.text.secondary} /> : <Eye size={20} color={colors.text.secondary} />}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={dynamicStyles.primaryButton} onPress={handleResetPassword} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={dynamicStyles.primaryButtonText}>RÉINITIALISER LE MOT DE PASSE</Text>}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={dynamicStyles.backToLogin} onPress={() => navigation.navigate('Login')} accessibilityRole="link">
              <Text style={dynamicStyles.backToLoginText}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, normalize: any, factor: number, width: number, height: number, isDark: boolean) => {
  const compact = width < 360 || height < 700;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backgroundOverlay: { backgroundColor: isDark ? 'rgba(18,18,18,0.82)' : 'rgba(255,255,255,0.56)' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingVertical: compact ? 12 : 24, paddingHorizontal: width < 360 ? 16 : 26 },
  contentWrapper: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  hero: { alignItems: 'center', marginBottom: compact ? 12 : 18, paddingTop: 4 },
  backButton: { position: 'absolute', top: 8, left: 0, width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  brandLogo: { width: normalize(compact ? 112 : 132, factor), height: normalize(compact ? 72 : 88, factor), marginBottom: 2 },
  title: { fontSize: normalize(24, factor), fontWeight: '800', letterSpacing: -0.5, color: colors.text.primary, textAlign: 'center' },
  heroSubtitle: { fontSize: normalize(13, factor), color: colors.text.secondary, textAlign: 'center', marginTop: 5 },
  formContainer: { width: '100%', padding: width < 360 ? 16 : 24, backgroundColor: colors.surface, borderRadius: 26, borderWidth: 1, borderColor: colors.border, shadowColor: '#17152B', shadowOpacity: isDark ? 0 : 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: isDark ? 0 : 3 },
  progressHeader: { marginBottom: compact ? 14 : 20 },
  stepLabel: { fontSize: normalize(11, factor), color: colors.primary, fontWeight: '800', letterSpacing: 0.8, marginBottom: 9 },
  progressTrack: { flexDirection: 'row', gap: 7 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressSegmentActive: { backgroundColor: colors.primary },
  iconContainer: { width: compact ? 52 : 60, height: compact ? 52 : 60, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.primary + '12', marginBottom: compact ? 10 : 14 },
  description: { fontSize: normalize(14, factor), color: colors.text.secondary, textAlign: 'center', marginBottom: compact ? 14 : 18, lineHeight: normalize(21, factor) },
  emailNotice: { fontSize: normalize(13, factor), fontWeight: '700', color: colors.text.primary, textAlign: 'center', marginTop: -7, marginBottom: 18 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#252525' : '#F9F9FB',
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 12,
    height: normalize(52, factor),
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  input: { flex: 1, minWidth: 0, height: '100%', fontSize: normalize(14, factor), marginLeft: 10, color: colors.text.primary },
  eyeIcon: { padding: 5 },
  codeContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: compact ? 5 : 7, width: '100%', marginBottom: compact ? 16 : 20 },
  codeInput: {
    flex: 1,
    maxWidth: 48,
    minWidth: 30,
    height: normalize(compact ? 46 : 50, factor),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    textAlign: 'center',
    fontSize: normalize(20, factor),
    backgroundColor: isDark ? '#252525' : '#F9F9FB',
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 15,
    minHeight: normalize(54, factor),
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
    elevation: 3,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontSize: normalize(14, factor), fontWeight: '800', letterSpacing: 0.4, textAlign: 'center', flexShrink: 1 },
  resendBtn: { marginTop: 18, alignSelf: 'center', paddingVertical: 4 },
  resendText: { color: colors.primary, fontSize: normalize(14, factor), fontWeight: '700' },
  backToLogin: { marginTop: 20, alignSelf: 'center', paddingVertical: 6 },
  backToLoginText: { color: colors.text.secondary, fontSize: normalize(13, factor), fontWeight: '600', textDecorationLine: 'underline' },
  });
};
