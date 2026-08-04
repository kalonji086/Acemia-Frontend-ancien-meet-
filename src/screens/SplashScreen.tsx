import React, { useEffect } from 'react';
import { View, StyleSheet, Text, StatusBar } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, normalize } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';

const SplashScreen = () => {
  const navigation = useNavigation();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  const navigateToNext = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userString = await AsyncStorage.getItem('user');

      if (!token || !userString) {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
        return;
      }

      // VÉRIFICATION RÉELLE DU STATUT DU COMPTE (BLOCAGE)
      let checkRes;
      try {
        checkRes = await apiService.getMe();
      } catch (err) {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'ChatList' }] }));
        return;
      }

      if (checkRes && !checkRes.success) {
        // Si le compte est bloqué, apiService.getMe renverra success: false et isLocked: true
        navigation.dispatch(CommonActions.reset({
          index: 0,
          routes: [{
            name: 'Login',
            params: {
              isLocked: checkRes.isLocked,
              lockMessage: checkRes.message
            }
          }]
        }));
        return;
      }

      const user = checkRes.data;
      const lastLogin = user.last_login_at ? new Date(user.last_login_at).getTime() : Date.now();
      const now = Date.now();
      const tenDaysInMs = 10 * 24 * 60 * 60 * 1000;

      if (now - lastLogin > tenDaysInMs) {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
      } else {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'ChatList' }] }));
      }
    } catch (error) {
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
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
    const timer = setTimeout(() => { runOnJS(navigateToNext)(); }, 3000);
    return () => clearTimeout(timer);
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
        <Text style={styles.appName}>Meet Me</Text>
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
