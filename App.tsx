import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { UserProvider } from './src/context/UserContext';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import ErrorBoundary from './src/components/ErrorBoundary';
import ErrorScreen from './src/screens/ErrorScreen';

// Polyfill/Shim pour le Web
if (Platform.OS === 'web') {
  // Rendre Alert.alert compatible avec le Web (utiliser window.alert/confirm)
  (Alert as any).alert = (title: string, message?: string, buttons?: any[]) => {
    if (buttons && buttons.length > 0) {
      const confirmMsg = `${title}${message ? '\n\n' + message : ''}`;

      // Trouver le bouton "OK" ou équivalent (non-cancel)
      const positiveBtn = buttons.find(b => b.style !== 'cancel') || buttons[0];
      const cancelBtn = buttons.find(b => b.style === 'cancel');

      if (buttons.length === 1) {
        window.alert(confirmMsg);
        if (positiveBtn.onPress) positiveBtn.onPress();
      } else {
        const result = window.confirm(confirmMsg);
        if (result) {
          if (positiveBtn.onPress) positiveBtn.onPress();
        } else {
          if (cancelBtn && cancelBtn.onPress) cancelBtn.onPress();
        }
      }
    } else {
      window.alert(`${title}${message ? '\n\n' + message : ''}`);
    }
  };

  // Injecter des styles globaux pour le curseur pointer sur le Web
  const style = document.createElement('style');
  style.textContent = `
    [role="button"], button, a, [data-testid="touchable"] {
      cursor: pointer !important;
    }
    /* Cacher les scrollbars mais garder le défilement */
    ::-webkit-scrollbar {
      width: 6px;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(0,0,0,0.1);
      border-radius: 10px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    .glass-sidebar {
      backdrop-filter: blur(20px) !important;
      -webkit-backdrop-filter: blur(20px) !important;
    }
  `;
  document.head.append(style);
}

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import WebResponsiveWrapper from './src/components/WebResponsiveWrapper';

export default function App() {
  useEffect(() => {
    const hideSplash = async () => {
      try {
        // Un petit délai pour laisser le temps au moteur de rendu de s'initialiser
        setTimeout(async () => {
          await SplashScreen.hideAsync();
        }, 1000);
      } catch (hideError) {
        // console.log('Splash hide error');
      }
    };

    // On cache le splash screen le plus tôt possible pour éviter le blocage
    const splashTimer = setTimeout(() => {
      hideSplash();
    }, 500);

    return () => {
      clearTimeout(splashTimer);
    };
  }, []);

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Global error caught:', error, errorInfo);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <UserProvider>
          <ThemeProvider>
            <SafeAreaProvider>
              <ErrorBoundary onError={handleError}>
                <WebResponsiveWrapper>
                  {Platform.OS !== 'web' && <StatusBar style="auto" />}
                  <AppNavigator />
                </WebResponsiveWrapper>
              </ErrorBoundary>
            </SafeAreaProvider>
          </ThemeProvider>
        </UserProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
