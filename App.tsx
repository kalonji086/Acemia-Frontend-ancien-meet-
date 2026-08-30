import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { UserProvider } from './src/context/UserContext';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import ErrorBoundary from './src/components/ErrorBoundary';
import ErrorScreen from './src/screens/ErrorScreen';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
              <ErrorBoundary
                onError={handleError}
                fallback={(
                  <ErrorScreen
                    error={new Error('Application error')}
                    showDetails={__DEV__}
                  />
                )}
              >
                <StatusBar style="auto" />
                <AppNavigator />
              </ErrorBoundary>
            </SafeAreaProvider>
          </ThemeProvider>
        </UserProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
