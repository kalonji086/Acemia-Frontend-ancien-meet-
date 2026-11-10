import React, { useEffect } from 'react';
import { View, StyleSheet, Image, StatusBar } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalize } from '../styles/theme';
import apiService from '../services/api.service';
import { APP_VERSION } from '../utils/constants';

const SplashScreen = () => {
  const navigation = useNavigation();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const progress = useSharedValue(0);
  const hasNavigated = React.useRef(false);

  const safeNavigate = (routeName: string, params?: any) => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    progress.value = withTiming(1, { duration: 300 });

    try {
      navigation.dispatch(CommonActions.reset({
        index: 0,
        routes: [{ name: routeName, params }],
      }));
    } catch (error) {
      console.error('Failed to navigate from splash:', error);
    }
  };

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  };

  const navigateToNext = async () => {
    if (hasNavigated.current) return;

    try {
      // Skip network check entirely to avoid blocking on slow networks
      // The API calls will fail gracefully if there's no network

      await new Promise((resolve) => setTimeout(resolve, 300));

      const token = await AsyncStorage.getItem('auth_token');
      const userString = await AsyncStorage.getItem('user');
      let userObj = null;

      try {
        userObj = userString ? JSON.parse(userString) : null;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }

      if (!token || !userObj) {
        // Même si non connecté, on vérifie si une acceptation légale est forcée pour les nouveaux utilisateurs
        try {
          const legalRes = await withTimeout(apiService.getLegalDocs(), 4000, 'legal-check-guest') as any;
          if (legalRes && legalRes.success) {
            const docs = legalRes.data || [];
            // Pour les invités, on vérifie par rapport à une version stockée localement
            const lastAccepted = await AsyncStorage.getItem('guest_accepted_legal_version');
            const mustAccept = docs.some((doc: any) => doc.force_acceptance && doc.version !== lastAccepted);

            if (mustAccept) {
              safeNavigate('LegalAcceptance', { documents: docs, isGuest: true });
              return;
            }
          }
        } catch (e) {
          console.log('Guest legal check failed, continuing to login');
        }

        safeNavigate('Login');
        return;
      }

      try {
        // Check update avec timeout plus long
        const updateRes = (await withTimeout(
          apiService.checkUpdate(APP_VERSION, userObj?.id),
          8000,
          'update-check'
        )) as any;

        if (updateRes && updateRes.updateRequired === true) {
          safeNavigate('Update', {
            updateUrl: updateRes.updateUrl,
            releaseNotes: updateRes.releaseNotes,
            forceUpdate: updateRes.forceUpdate,
            latestVersion: updateRes.latestVersion,
          });
          return;
        }
      } catch (updateErr) {
        console.error('Update check failed:', updateErr);
        // Continue even if update check fails
      }

      let checkRes: any;
      try {
        // Check user avec timeout plus long pour Render
        checkRes = await withTimeout(apiService.getMe(), 10000, 'user-check') as any;
      } catch (err) {
        console.error('User check failed:', err);
        // En cas d'erreur de connexion, on tente quand même d'aller sur l'écran principal
        // si on a des données locales, sinon Login.
        if (userObj) {
          safeNavigate('ChatList');
        } else {
          safeNavigate('Login');
        }
        return;
      }

      if (checkRes && !checkRes.success) {
        safeNavigate('Login', {
          isLocked: checkRes.isLocked,
          lockMessage: checkRes.message,
        });
        return;
      }

      const user = checkRes?.data || userObj;

      try {
        const legalRes = await withTimeout(apiService.getLegalDocs(), 4000, 'legal-check') as any;

        if (legalRes && legalRes.success) {
          const docs = legalRes.data || [];
          const mustAccept = docs.some((doc: any) => {
            if (!doc.force_acceptance) return false;
            if (doc.type === 'tos') return doc.version !== user?.accepted_tos_version;
            if (doc.type === 'privacy') return doc.version !== user?.accepted_privacy_version;
            return doc.version !== user?.accepted_legal_version;
          });

          if (mustAccept) {
            safeNavigate('LegalAcceptance', { documents: docs });
            return;
          }
        }
      } catch (legalErr) {
        console.error('Legal check failed:', legalErr);
        // Continue even if legal check fails
      }

      const lastLogin = user?.last_login_at ? new Date(user.last_login_at).getTime() : Date.now();
      const lastAppOpenStr = await AsyncStorage.getItem('last_app_open');
      const lastAppOpen = lastAppOpenStr ? parseInt(lastAppOpenStr) : lastLogin;

      const now = Date.now();
      const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
      const tenDaysInMs = 10 * 24 * 60 * 60 * 1000;

      if (now - lastLogin > tenDaysInMs) {
        // Session trop ancienne (10 jours), reconnexion totale requise
        safeNavigate('Login');
      } else if (now - lastAppOpen > twoDaysInMs) {
        // Plus de 2 jours d'inactivité, demander seulement le mot de passe
        safeNavigate('Login', {
          mode: 'password_only',
          email: user.email,
          name: user.full_name || user.name
        });
      } else {
        // Connexion auto, on met à jour le temps d'ouverture
        await AsyncStorage.setItem('last_app_open', now.toString());
        safeNavigate('ChatList');
      }
    } catch (error) {
      console.error('Critical navigation error:', error);
      safeNavigate('Login');
    }
  };

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 1000 });
    scale.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.back(1.5)) });

    progress.value = withTiming(0.9, { duration: 8000, easing: Easing.out(Easing.quad) });

    const timer = setTimeout(() => {
      try {
        void navigateToNext();
      } catch (error) {
        console.error('Error in navigateToNext:', error);
        safeNavigate('Login');
      }
    }, 1500);

    // Fallback plus court pour les vrais appareils - 8 secondes max
    const fallbackTimer = setTimeout(() => {
      console.log('Splash fallback triggered');
      safeNavigate('Login');
    }, 8000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      opacity.value = 0;
      scale.value = 0.8;
      progress.value = 0;
    };
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
        <Image
          source={require('../../assets/AcemiaLogo.png')}
          style={styles.logoImage}
          resizeMode="contain"
          accessibilityLabel="Acemia"
        />
      </Animated.View>
      <View style={styles.progressTrack} accessibilityRole="progressbar">
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  logoContainer: { alignItems: 'center' },
  logoImage: { width: normalize(250), height: normalize(250) },
  progressTrack: { width: normalize(220), height: 5, marginTop: 20, overflow: 'hidden', borderRadius: 3, backgroundColor: '#E8EAF0' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#673AB7' },
});

export default SplashScreen;
