import React, { useEffect } from 'react';
import { View, StyleSheet, Text, StatusBar } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, normalize } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import { APP_VERSION } from '../utils/constants';

const SplashScreen = () => {
  const navigation = useNavigation();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);
  const hasNavigated = React.useRef(false);

  const safeNavigate = (routeName: string, params?: any) => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;

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
      try {
        // Augmentation des timeouts pour laisser le temps au serveur Render de se "réveiller"
        const response = await withTimeout(
          fetch('https://www.google.com', { method: 'HEAD' }),
          3000,
          'network-check'
        );

        if (!response.ok) {
          console.log('No internet connection');
        }
      } catch (netErr) {
        console.log('Network check failed, continuing startup:', netErr);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

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
          const legalRes = await withTimeout(apiService.getLegalDocs(), 2500, 'legal-check-guest') as any;
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
        } catch (e) { console.log('Guest legal check failed'); }

        safeNavigate('Login');
        return;
      }

      try {
        // Temps plus long pour le check update (Render wake up)
        const updateRes = (await withTimeout(
          apiService.checkUpdate(APP_VERSION, userObj?.id),
          5000,
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
      }

      let checkRes: any;
      try {
        // Temps plus long pour le check user (Render wake up)
        checkRes = await withTimeout(apiService.getMe(), 6000, 'user-check') as any;
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
        const legalRes = await withTimeout(apiService.getLegalDocs(), 2500, 'legal-check') as any;

        if (legalRes && legalRes.success) {
          const docs = legalRes.data || [];
          const mustAccept = docs.some((doc: any) => {
            if (!doc.force_acceptance) return false;
            if (doc.type === 'tos') return doc.version !== user?.accepted_tos_version;
            if (doc.type === 'privacy') return doc.version !== user?.accepted_privacy_version;
            return doc.version !== user?.accepted_legal_version;
          });

          if (mustAccept) {
            // Ne pas montrer si c'est du contenu placeholder par défaut (31.0.0 ou vieux résidus)
            const isPlaceholder = docs.every((d: any) =>
              d.content === `Conditions Générales d'Utilisation - Version ${d.version}` ||
              d.content === `Politique de Confidentialité - Version ${d.version}` ||
              d.content.includes('Version 5.0.0') ||
              d.content.includes('Version 32.0.0')
            );

            if (!isPlaceholder || docs.some((d: any) => d.force_acceptance === true)) {
              safeNavigate('LegalAcceptance', { documents: docs });
              return;
            }
          }
        }
      } catch (legalErr) {
        console.error('Legal check failed:', legalErr);
      }

      const lastLogin = user?.last_login_at ? new Date(user.last_login_at).getTime() : Date.now();
      const now = Date.now();
      const tenDaysInMs = 10 * 24 * 60 * 60 * 1000;

      if (now - lastLogin > tenDaysInMs) {
        safeNavigate('Login');
      } else {
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

    const dotAnim = (val: any, delay: number) => {
      val.value = withSequence(
        withTiming(0, { duration: delay }),
        withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0, { duration: 400 })), -1, true)
      );
    };
    dotAnim(dot1, 0); dotAnim(dot2, 200); dotAnim(dot3, 400);

    const timer = setTimeout(() => {
      try {
        void navigateToNext();
      } catch (error) {
        console.error('Error in navigateToNext:', error);
        safeNavigate('Login');
      }
    }, 1500);

    const fallbackTimer = setTimeout(() => {
      console.log('Splash fallback triggered');
      safeNavigate('Login');
    }, 12000); // 12 secondes de sécurité totale

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      opacity.value = 0;
      scale.value = 0.8;
    };
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const getDotStyle = (val: any) => useAnimatedStyle(() => ({
    opacity: val.value,
    transform: [{ translateY: -val.value * 10 }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
        <View style={styles.iconStack}>
          <Ionicons name="chatbubble" size={normalize(80)} color="#fff" style={styles.backIcon} />
          <Ionicons name="heart" size={normalize(35)} color={colors.secondary} style={styles.frontIcon} />
        </View>
        <Text style={styles.appName}>Meet</Text>
      </Animated.View>
      <View style={styles.loader}>
        <Animated.View style={[styles.dot, getDotStyle(dot1)]} />
        <Animated.View style={[styles.dot, getDotStyle(dot2)]} />
        <Animated.View style={[styles.dot, getDotStyle(dot3)]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  logoContainer: { alignItems: 'center' },
  iconStack: { position: 'relative', width: normalize(80), height: normalize(80), justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  backIcon: { opacity: 0.9 },
  frontIcon: { position: 'absolute', top: normalize(20) },
  appName: { fontSize: normalize(42), fontWeight: 'bold', color: '#FFFFFF', letterSpacing: 3, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 5 },
  loader: { flexDirection: 'row', marginTop: 50 },
  dot: { width: normalize(10), height: normalize(10), borderRadius: 5, backgroundColor: '#FFFFFF', marginHorizontal: 5 },
});

export default SplashScreen;
