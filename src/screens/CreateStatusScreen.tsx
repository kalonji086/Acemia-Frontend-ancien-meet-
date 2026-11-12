import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/theme';
import apiService from '../services/api.service';

const BACKGROUND_COLORS = ['#673AB7', '#9162e4', '#74676a', '#6e257e', '#c1a03f', '#d3396d', '#1d62ce'];

export default function CreateStatusScreen({ navigation, route }: any) {
  const { imageUri, imageMimeType, imageFileName } = route.params || {};
  const { width } = useWindowDimensions();
  const [content, setContent] = useState('');
  const [bgColorIndex, setBgColorIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const handlePublish = async () => {
    if (loading || (!imageUri && !content.trim())) return;
    setLoading(true);
    try {
      let finalMediaUrl = null;
      let type: 'text' | 'image' = 'text';

      if (imageUri) {
        type = 'image';
        const extension = typeof imageFileName === 'string' ? imageFileName.split('.').pop()?.toLowerCase() : undefined;
        const mimeType = imageMimeType || (extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg');
        const fileName = imageFileName || `status_${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`;
        const uploadRes = await apiService.uploadFile({
          uri: imageUri,
          type: mimeType,
          mimeType,
          name: fileName,
          fileName,
        }, 'image');

        if (!uploadRes.success || !uploadRes.data?.fileUrl) {
          throw new Error(uploadRes.error || 'Le téléchargement de la photo a échoué.');
        }
        finalMediaUrl = uploadRes.data.fileUrl;
      }

      const response = await apiService.createStatus({
        content: content.trim(),
        type: type,
        mediaUrl: finalMediaUrl,
        backgroundColor: imageUri ? undefined : BACKGROUND_COLORS[bgColorIndex]
      });

      if (response.success) {
        navigation.navigate('ChatList', { screen: 'status' }); // Retour à l'onglet Statuts
      } else {
        Alert.alert('Erreur', response.error || 'Impossible de publier le status');
      }
    } catch (error) {
      console.error('Error creating status:', error);
      Alert.alert(
        'Publication impossible',
        error instanceof Error ? error.message : 'Une erreur est survenue lors de la publication.'
      );
    } finally {
      setLoading(false);
    }
  };

  const cycleColor = () => {
    setBgColorIndex((prev) => (prev + 1) % BACKGROUND_COLORS.length);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: imageUri ? '#000' : BACKGROUND_COLORS[bgColorIndex] }]}>
      <StatusBar barStyle="light-content" />

      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
      )}

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Annuler la création du statut"
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={30} color="#fff" />
        </TouchableOpacity>

        {!imageUri && (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={cycleColor} style={styles.actionButton}>
              <Ionicons name="color-palette" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* CONTENT AREA */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={{ flex: 1 }}
      >
        <View style={imageUri ? styles.imageModeContent : styles.textModeContent}>
          {imageUri ? (
            <View style={styles.bottomActionsContainer}>
              <View style={styles.captionInputContainer}>
                <TextInput
                  style={styles.captionInput}
                  placeholder="Ajouter une légende..."
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={content}
                  onChangeText={setContent}
                  multiline
                  maxLength={200}
                />
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Publier le statut photo"
                onPress={handlePublish}
                disabled={loading}
                style={[styles.sendButtonCircle, loading && styles.disabled]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="send" size={26} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.textComposerScroll}
                contentContainerStyle={styles.textComposerScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <TextInput
                  style={[styles.textStatusInput, { fontSize: Math.min(32, Math.max(22, width * 0.075)) }]}
                  placeholder="Tapez un statut"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  multiline
                  maxLength={200}
                  value={content}
                  onChangeText={setContent}
                  autoFocus
                  textAlignVertical="center"
                />
              </ScrollView>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Publier le statut"
                onPress={handlePublish}
                disabled={loading || !content.trim()}
                style={[styles.floatingPublishBtn, (!content.trim() || loading) && styles.disabled]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="send" size={26} color="#fff" />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    zIndex: 10,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 25,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 20,
    padding: 5,
  },
  publishButtonTop: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textModeContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  textComposerScroll: { flex: 1, width: '100%' },
  textComposerScrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 90 },
  textStatusInput: {
    color: '#fff',
    textAlign: 'center',
    width: '100%',
    fontWeight: '400',
    minHeight: 140,
  },
  imageModeContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomActionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  captionInputContainer: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginRight: 10,
    minHeight: 45,
    maxHeight: 120,
    justifyContent: 'center',
  },
  captionInput: {
    color: '#fff',
    fontSize: 16,
    paddingVertical: 10,
    maxHeight: 100,
    textAlignVertical: 'center',
  },
  sendButtonCircle: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disabled: {
    opacity: 0.5,
  },
  floatingPublishBtn: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  }
});
