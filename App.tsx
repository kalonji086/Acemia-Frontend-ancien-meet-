import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import * as Notifications from 'expo-notifications';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Empêcher l'écran de chargement natif de se cacher automatiquement
SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    // On laisse l'écran natif (violet uni) un court instant puis on passe au composant animé
    const hideNativeSplash = async () => {
      await SplashScreen.hideAsync();
    };
    hideNativeSplash();
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </SafeAreaProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
