import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import * as Updates from 'expo-updates';

interface ErrorScreenProps {
  error?: Error;
  onRetry?: () => void;
  onRestart?: () => void;
  showDetails?: boolean;
}

export default function ErrorScreen({ 
  error, 
  onRetry, 
  onRestart,
  showDetails = false 
}: ErrorScreenProps) {
  const { colors, normalize, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  const errorMessage = error?.message || 'Une erreur inattendue est survenue';
  const errorStack = error?.stack || '';
  
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // Par défaut, redémarrer l'app
      handleRestart();
    }
  };
  
  const handleRestart = async () => {
    try {
      if (onRestart) {
        onRestart();
      } else {
        // Fallback pour le développement et la production sans expo-updates
        if (Platform.OS === 'web') {
          window.location.reload();
        } else {
          Alert.alert('Info', 'Veuillez fermer et rouvrir l\'application.');
        }
      }
    } catch (restartError) {
      console.error('Failed to restart app:', restartError);
    }
  };
  
  const handleGoBack = () => {
    // Tentative de retour en arrière
    // Cette fonctionnalité dépendra de votre implémentation de navigation
    console.log('Go back requested');
  };
  
  const styles = createStyles(colors, normalize, isDark);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <View style={[styles.errorIcon, { backgroundColor: colors.danger + '20' }]}>
            <Ionicons name="warning" size={normalize(60)} color={colors.danger} />
          </View>
        </View>
        
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Oups ! Quelque chose s'est mal passé
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          L'application a rencontré une erreur inattendue
        </Text>
        
        <View style={[styles.errorBox, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
          <Text style={[styles.errorMessage, { color: colors.danger }]}>
            {errorMessage}
          </Text>
          
          {showDetails && errorStack && (
            <View style={styles.stackContainer}>
              <Text style={[styles.stackLabel, { color: colors.text.secondary }]}>
                Détails techniques :
              </Text>
              <ScrollView style={styles.stackScroll}>
                <Text style={[styles.stackText, { color: colors.text.secondary }]}>
                  {errorStack}
                </Text>
              </ScrollView>
            </View>
          )}
        </View>
        
        <View style={styles.suggestions}>
          <Text style={[styles.suggestionTitle, { color: colors.text.primary }]}>
            Suggestions :
          </Text>
          
          <View style={styles.suggestionItem}>
            <Ionicons name="refresh" size={20} color={colors.primary} />
            <Text style={[styles.suggestionText, { color: colors.text.secondary }]}>
              Redémarrer l'application peut résoudre le problème
            </Text>
          </View>
          
          <View style={styles.suggestionItem}>
            <Ionicons name="wifi" size={20} color={colors.primary} />
            <Text style={[styles.suggestionText, { color: colors.text.secondary }]}>
              Vérifiez votre connexion internet
            </Text>
          </View>
          
          <View style={styles.suggestionItem}>
            <Ionicons name="phone-portrait" size={20} color={colors.primary} />
            <Text style={[styles.suggestionText, { color: colors.text.secondary }]}>
              Assurez-vous que l'application est à jour
            </Text>
          </View>
        </View>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleRetry}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>RÉESSAYER</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.primary }]}
            onPress={handleRestart}
          >
            <Ionicons name="power" size={20} color={colors.primary} />
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
              REDÉMARRER L'APP
            </Text>
          </TouchableOpacity>
          
          {showDetails && (
            <TouchableOpacity
              style={[styles.tertiaryButton, { borderColor: colors.border }]}
              onPress={handleGoBack}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
              <Text style={[styles.tertiaryButtonText, { color: colors.text.secondary }]}>
                RETOUR
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.text.disabled }]}>
            Code d'erreur : {Date.now().toString(36).toUpperCase()}
          </Text>
          <Text style={[styles.footerText, { color: colors.text.disabled }]}>
            Version 40.0.0 • {Platform.OS.toUpperCase()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, normalize: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  errorIcon: {
    width: normalize(120),
    height: normalize(120),
    borderRadius: normalize(60),
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: normalize(24),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: normalize(16),
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  errorBox: {
    width: '100%',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  errorMessage: {
    fontSize: normalize(14),
    fontWeight: '600',
    marginBottom: 15,
  },
  stackContainer: {
    marginTop: 10,
  },
  stackLabel: {
    fontSize: normalize(12),
    fontWeight: '600',
    marginBottom: 8,
  },
  stackScroll: {
    maxHeight: 150,
    backgroundColor: isDark ? '#1a1a1a' : '#e0e0e0',
    borderRadius: 8,
    padding: 10,
  },
  stackText: {
    fontSize: normalize(10),
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  suggestions: {
    width: '100%',
    marginBottom: 30,
  },
  suggestionTitle: {
    fontSize: normalize(18),
    fontWeight: 'bold',
    marginBottom: 15,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 5,
  },
  suggestionText: {
    fontSize: normalize(14),
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 15,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: normalize(16),
    fontWeight: 'bold',
    marginLeft: 10,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 15,
  },
  secondaryButtonText: {
    fontSize: normalize(16),
    fontWeight: 'bold',
    marginLeft: 10,
  },
  tertiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  tertiaryButtonText: {
    fontSize: normalize(14),
    fontWeight: '600',
    marginLeft: 10,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: normalize(11),
    marginBottom: 5,
  },
});