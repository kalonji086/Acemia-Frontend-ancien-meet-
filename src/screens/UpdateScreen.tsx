import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, BackHandler, Platform } from 'react-native';
import { colors, normalize } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UpdateScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { updateUrl, releaseNotes, forceUpdate, latestVersion } = route.params as any;

  React.useEffect(() => {
    // Empêcher le retour arrière si la mise à jour est obligatoire
    if (forceUpdate) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => backHandler.remove();
    }
  }, [forceUpdate]);

  const handleUpdate = () => {
    if (updateUrl) {
      Linking.openURL(updateUrl);
    }
  };

  const handleLater = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userString = await AsyncStorage.getItem('user');

      if (token && userString) {
        navigation.dispatch(CommonActions.reset({
          index: 0,
          routes: [{ name: 'ChatList' }]
        }));
      } else {
        navigation.dispatch(CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }]
        }));
      }
    } catch (e) {
      navigation.dispatch(CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }]
      }));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="cloud-download" size={normalize(60)} color={colors.primary} />
        </View>

        <Text style={styles.title}>{t('updateAvailable')}</Text>
        <Text style={styles.version}>{t('newVersion')} {latestVersion}</Text>

        <View style={styles.notesContainer}>
          <Text style={styles.notesTitle}>Nouveautés :</Text>
          <Text style={styles.notesText}>{releaseNotes || "Améliorations de performance et corrections de bugs."}</Text>
        </View>

        <TouchableOpacity
          style={styles.updateButton}
          onPress={handleUpdate}
        >
          <Text style={styles.updateButtonText}>{t('updateNow')}</Text>
        </TouchableOpacity>

        {!forceUpdate && (
          <TouchableOpacity
            style={styles.laterButton}
            onPress={handleLater}
          >
            <Text style={styles.laterButtonText}>{t('updateLater')}</Text>
          </TouchableOpacity>
        )}

        {forceUpdate && (
          <Text style={styles.footerNote}>
            {t('forcedUpdateNote')}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 30,
    padding: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: normalize(100),
    height: normalize(100),
    backgroundColor: colors.primary + '10',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: normalize(24),
    fontWeight: '900',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 5,
  },
  version: {
    fontSize: normalize(14),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 20,
  },
  notesContainer: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
  },
  notesTitle: {
    fontSize: normalize(14),
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  notesText: {
    fontSize: normalize(15),
    color: '#374151',
    lineHeight: 22,
  },
  updateButton: {
    backgroundColor: colors.primary,
    width: '100%',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  updateButtonText: {
    color: '#FFF',
    fontSize: normalize(14),
    fontWeight: '900',
    letterSpacing: 1,
  },
  laterButton: {
    marginTop: 20,
    padding: 10,
  },
  laterButtonText: {
    color: '#9CA3AF',
    fontSize: normalize(14),
    fontWeight: 'bold',
  },
  footerNote: {
    marginTop: 20,
    fontSize: normalize(11),
    color: '#EF4444',
    textAlign: 'center',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  }
});

export default UpdateScreen;
