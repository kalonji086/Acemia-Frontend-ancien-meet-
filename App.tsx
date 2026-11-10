import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { UserProvider } from './src/context/UserContext';
import * as Device from 'expo-device';
import { Platform, Alert, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import ErrorBoundary from './src/components/ErrorBoundary';
import ErrorScreen from './src/screens/ErrorScreen';

// Empêcher le splash screen de se cacher automatiquement
SplashScreen.preventAutoHideAsync().catch(() => {});

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

// Composant de chargement minimal pour éviter les écrans blancs
const MinimalLoader = () => (
  <View style={styles.loader}>
    <ActivityIndicator size="large" color="#673AB7" />
    <Text style={styles.loaderText}>Chargement...</Text>
  </View>
);

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        // Petit délai pour s'assurer que tout est initialisé
        await new Promise(resolve => setTimeout(resolve, 100));
        setIsReady(true);
      } catch (error) {
        console.error('App preparation error:', error);
        setHasError(true);
      } finally {
        // Cacher le splash screen une fois prêt
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          console.log('SplashScreen already hidden');
        }
      }
    };

    prepare();

    // Fallback de sécurité - forcer le chargement après 3 secondes max
    const fallbackTimer = setTimeout(() => {
      if (!isReady) {
        console.log('App fallback triggered - forcing ready state');
        setIsReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 3000);

    return () => clearTimeout(fallbackTimer);
  }, [isReady]);

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Global error caught:', error, errorInfo);
    setHasError(true);
  };

  // En cas d'erreur critique, afficher un écran d'erreur
  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Une erreur est survenue</Text>
        <Text style={styles.errorSubtext}>Veuillez redémarrer l'application</Text>
      </View>
    );
  }

  // Afficher un loader minimal pendant l'initialisation
  if (!isReady) {
    return <MinimalLoader />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary onError={handleError} fallback={<ErrorScreen />}>
        <LanguageProvider>
          <UserProvider>
            <ThemeProvider>
              <SafeAreaProvider>
                <WebResponsiveWrapper>
                  {Platform.OS !== 'web' && <StatusBar style="auto" />}
                  <AppNavigator />
                </WebResponsiveWrapper>
              </SafeAreaProvider>
            </ThemeProvider>
          </UserProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#673AB7',
  },
  loaderText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
