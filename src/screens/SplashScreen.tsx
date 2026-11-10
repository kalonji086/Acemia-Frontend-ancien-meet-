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

      const userString = await AsyncStorage.getItem('user');
      let userObj = null;

      try {
        userObj = userString ? JSON.parse(userString) : null;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }

      const hasToken = await apiService.hasAuthToken();
      if (hasToken && userObj) {
        const lastAppOpenStr = await AsyncStorage.getItem('last_app_open');
        const storedLastAppOpen = lastAppOpenStr ? Number.parseInt(lastAppOpenStr, 10) : Number.NaN;
        const lastLogin = userObj.last_login_at ? new Date(userObj.last_login_at).getTime() : Date.now();
        const lastAppOpen = Number.isFinite(storedLastAppOpen) ? storedLastAppOpen : lastLogin;
        const now = Date.now();
        const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;

        if (now - lastAppOpen >= twoDaysInMs) {
          await apiService.expireSessionPreservingUser();
          safeNavigate('Login', {
            mode: 'password_only',
            email: userObj.email,
            name: userObj.full_name || userObj.name,
          });
        } else {
          await AsyncStorage.setItem('last_app_open', now.toString());
          safeNavigate('ChatList');
          void apiService.checkUpdate(APP_VERSION, userObj.id).then((updateRes: any) => {
            if (updateRes?.updateRequired === true) {
              navigation.dispatch(CommonActions.reset({
                index: 0,
                routes: [{
                  name: 'Update',
                  params: {
                    updateUrl: updateRes.updateUrl,
                    releaseNotes: updateRes.releaseNotes,
                    forceUpdate: updateRes.forceUpdate,
                    latestVersion: updateRes.latestVersion,
                  },
                }],
              }));
            }
          }).catch((updateError) => {
            console.error('Update check failed:', updateError);
          });
        }
        return;
      }

      if (!hasToken || !userObj) {
        const requiresPassword = await AsyncStorage.getItem('session_requires_password');
        if (userObj && requiresPassword === 'true') {
          safeNavigate('Login', {
            mode: 'password_only',
            email: userObj.email,
            name: userObj.full_name || userObj.name,
          });
          return;
        }

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
