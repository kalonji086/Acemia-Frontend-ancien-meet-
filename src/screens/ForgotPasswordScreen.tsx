import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { normalize } from '../styles/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setNewConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: email, 2: code, 3: new password
  const [loading, setLoading] = useState(false);

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
        Alert.alert('Succès', 'Un code OTP a été envoyé à votre email via Brevo');
      } else {
        throw new Error(response.error || 'Erreur lors de l\'envoi du code');
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = () => {
    const code = otp.join('');
    if (code.length !== 6) {
      Alert.alert('Erreur', 'Veuillez entrer le code à 6 chiffres');
      return;
    }
    setStep(3);
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
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
  };

  const dynamicStyles = createStyles(colors);

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={dynamicStyles.scrollContainer}>
          <View style={dynamicStyles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={dynamicStyles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={dynamicStyles.title}>Mot de passe oublié</Text>
          </View>

          <View style={dynamicStyles.formContainer}>
            {step === 1 && (
              <>
                <View style={dynamicStyles.iconContainer}>
                  <Ionicons name="key-outline" size={80} color={colors.primary} />
                </View>

                <Text style={dynamicStyles.description}>
                  Entrez votre adresse email pour recevoir un code de réinitialisation
                </Text>

                <View style={dynamicStyles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color={colors.text.secondary} />
                  <TextInput
                    style={dynamicStyles.input}
                    placeholder="Email"
                    placeholderTextColor={colors.text.disabled}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity style={dynamicStyles.primaryButton} onPress={handleSendCode} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={dynamicStyles.primaryButtonText}>Envoyer le code</Text>}
                </TouchableOpacity>
              </>
            )}

            {step === 2 && (
              <>
                <View style={dynamicStyles.iconContainer}>
                  <Ionicons name="mail-unread-outline" size={80} color={colors.primary} />
                </View>

                <Text style={dynamicStyles.description}>
                  Entrez le code à 6 chiffres envoyé à {email}
                </Text>

                <View style={dynamicStyles.codeContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      style={dynamicStyles.codeInput}
                      maxLength={1}
                      keyboardType="number-pad"
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value, index)}
                    />
                  ))}
                </View>

                <TouchableOpacity style={dynamicStyles.primaryButton} onPress={handleVerifyCode}>
                  <Text style={dynamicStyles.primaryButtonText}>Vérifier le code</Text>
                </TouchableOpacity>

                <TouchableOpacity style={dynamicStyles.resendBtn} onPress={handleSendCode}>
                  <Text style={dynamicStyles.resendText}>Renvoyer le code</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 3 && (
              <>
                <View style={dynamicStyles.iconContainer}>
                  <Ionicons name="lock-open-outline" size={80} color={colors.primary} />
                </View>

                <Text style={dynamicStyles.description}>
                  Créez un nouveau mot de passe sécurisé
                </Text>

                <View style={dynamicStyles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.text.secondary} />
                  <TextInput
                    style={dynamicStyles.input}
                    placeholder="Nouveau mot de passe"
                    placeholderTextColor={colors.text.disabled}
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={dynamicStyles.eyeIcon}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.text.secondary} />
                  </TouchableOpacity>
                </View>

                <View style={dynamicStyles.inputWrapper}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.text.secondary} />
                  <TextInput
                    style={dynamicStyles.input}
                    placeholder="Confirmer le nouveau mot de passe"
                    placeholderTextColor={colors.text.disabled}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setNewConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={dynamicStyles.eyeIcon}>
                    <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.text.secondary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={dynamicStyles.primaryButton} onPress={handleResetPassword} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={dynamicStyles.primaryButtonText}>Réinitialiser le mot de passe</Text>}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={dynamicStyles.backToLogin} onPress={() => navigation.navigate('Login')}>
              <Text style={dynamicStyles.backToLoginText}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContainer: { flexGrow: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  backButton: { marginRight: 15 },
  title: { fontSize: normalize(22), fontWeight: 'bold', color: colors.text.primary },
  formContainer: { width: '100%', alignItems: 'center' },
  iconContainer: { marginBottom: 30, marginTop: 20 },
  description: { fontSize: normalize(15), color: colors.text.secondary, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 15,
    height: normalize(50),
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  input: { flex: 1, height: '100%', fontSize: normalize(15), marginLeft: 10, color: colors.text.primary },
  eyeIcon: { padding: 5 },
  codeContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 30 },
  codeInput: {
    width: normalize(45),
    height: normalize(55),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 22,
    backgroundColor: colors.surface,
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 25,
    height: normalize(50),
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
    elevation: 3,
  },
  primaryButtonText: { color: '#fff', fontSize: normalize(16), fontWeight: 'bold' },
  resendBtn: { marginTop: 20 },
  resendText: { color: colors.primary, fontSize: normalize(14), fontWeight: '600' },
  backToLogin: { marginTop: 40 },
  backToLoginText: { color: colors.text.secondary, fontSize: normalize(14) },
});
