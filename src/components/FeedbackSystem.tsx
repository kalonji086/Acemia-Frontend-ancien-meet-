import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';
import * as MailComposer from 'expo-mail-composer';
import * as Device from 'expo-device';
// import * as Application from 'expo-application';

interface FeedbackSystemProps {
  visible: boolean;
  onClose: () => void;
  context?: string; // Contexte où le feedback est demandé
}

type FeedbackType = 'bug' | 'feature' | 'suggestion' | 'general';

export default function FeedbackSystem({ visible, onClose, context }: FeedbackSystemProps) {
  const { colors, normalize, isDark } = useTheme();
  
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const feedbackTypes = [
    { id: 'bug', icon: 'bug', label: 'Bug', description: 'Quelque chose ne fonctionne pas' },
    { id: 'feature', icon: 'bulb', label: 'Idée', description: 'Nouvelle fonctionnalité' },
    { id: 'suggestion', icon: 'chatbubble', label: 'Suggestion', description: 'Amélioration existante' },
    { id: 'general', icon: 'help', label: 'Général', description: 'Autre commentaire' },
  ];

  const collectDeviceInfo = () => {
    return {
      platform: Platform.OS,
      version: '12.0.0', // Application version forcée
      build: '12',
      device: Device.modelName || 'Unknown',
      os: Device.osName || 'Unknown',
      osVersion: Device.osVersion || 'Unknown',
      timestamp: new Date().toISOString(),
      context,
    };
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Information manquante', 'Veuillez remplir le titre et la description.');
      return;
    }

    setIsSubmitting(true);

    try {
      const deviceInfo = collectDeviceInfo();
      
      const response = await apiService.submitFeedback({
        type: feedbackType,
        title: title.trim(),
        description: description.trim(),
        email: email.trim() || undefined,
        deviceInfo,
        context,
      });

      if (response.success) {
        Alert.alert(
          'Merci !',
          'Votre feedback a été envoyé avec succès.',
          [{ text: 'OK', onPress: onClose }]
        );
        resetForm();
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      
      // Option 2: Fallback - Envoyer par email
      try {
        await sendEmailFallback();
      } catch (emailError) {
        console.error('Email fallback also failed:', emailError);
        Alert.alert(
          'Erreur',
          'Impossible d\'envoyer votre feedback. Veuillez réessayer plus tard.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendEmailFallback = async () => {
    const deviceInfo = collectDeviceInfo();
    const emailBody = `
Type: ${feedbackType}
Titre: ${title}
Description: ${description}
Email: ${email || 'Non fourni'}
Contexte: ${context || 'Non spécifié'}

--- Informations Appareil ---
Plateforme: ${deviceInfo.platform}
Version App: ${deviceInfo.version}
Build: ${deviceInfo.build}
Appareil: ${deviceInfo.device}
OS: ${deviceInfo.os} ${deviceInfo.osVersion}
Date: ${deviceInfo.timestamp}
    `.trim();

    const isAvailable = await MailComposer.isAvailableAsync();
    
    if (isAvailable) {
      await MailComposer.composeAsync({
        recipients: ['support@meetme.app'],
        subject: `[Meet Me Feedback] ${title}`,
        body: emailBody,
      });
      
      Alert.alert(
        'Email ouvert',
        'Veuillez envoyer l\'email pour soumettre votre feedback.',
        [{ text: 'OK', onPress: onClose }]
      );
      resetForm();
    } else {
      throw new Error('Email not available');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEmail('');
    setScreenshot(null);
    setFeedbackType('general');
    setCurrentStep(1);
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text.primary }]}>
        Type de feedback
      </Text>
      <Text style={[styles.stepDescription, { color: colors.text.secondary }]}>
        Choisissez la catégorie qui correspond le mieux
      </Text>
      
      <View style={styles.typeGrid}>
        {feedbackTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.typeButton,
              { 
                backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
                borderColor: feedbackType === type.id ? colors.primary : 'transparent'
              }
            ]}
            onPress={() => {
              setFeedbackType(type.id as FeedbackType);
              setCurrentStep(2);
            }}
          >
            <Ionicons 
              name={type.icon as any} 
              size={normalize(24)} 
              color={feedbackType === type.id ? colors.primary : colors.text.secondary} 
            />
            <Text style={[
              styles.typeLabel, 
              { color: feedbackType === type.id ? colors.primary : colors.text.primary }
            ]}>
              {type.label}
            </Text>
            <Text style={[styles.typeDescription, { color: colors.text.secondary }]}>
              {type.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.helpRedirect, { backgroundColor: isDark ? '#333' : '#F0F2F5' }]}>
        <Ionicons name="help-buoy" size={20} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.helpText, { color: colors.text.primary }]}>
            C'est un problème urgent ?
          </Text>
          <Text style={[styles.helpSubtext, { color: colors.text.secondary }]}>
            Utilisez notre Centre d'aide pour un support direct.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.helpBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            onClose();
            // Note: On suppose que la navigation est accessible via un Ref ou un service global
            // Mais ici on va laisser l'utilisateur fermer et aller dans Aide
          }}
        >
          <Text style={styles.helpBtnText}>Aide</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setCurrentStep(1)}
      >
        <Ionicons name="arrow-back" size={20} color={colors.primary} />
        <Text style={[styles.backButtonText, { color: colors.primary }]}>
          Retour
        </Text>
      </TouchableOpacity>
      
      <Text style={[styles.stepTitle, { color: colors.text.primary }]}>
        Détails du feedback
      </Text>
      
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text.primary }]}>
          Titre *
        </Text>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: isDark ? '#333' : '#f9f9f9',
              color: colors.text.primary,
              borderColor: colors.border
            }
          ]}
          placeholder="Décrivez brièvement"
          placeholderTextColor={colors.text.disabled}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text.primary }]}>
          Description détaillée *
        </Text>
        <TextInput
          style={[
            styles.textArea,
            { 
              backgroundColor: isDark ? '#333' : '#f9f9f9',
              color: colors.text.primary,
              borderColor: colors.border
            }
          ]}
          placeholder="Décrivez en détail..."
          placeholderTextColor={colors.text.disabled}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={[styles.charCount, { color: colors.text.secondary }]}>
          {description.length}/1000 caractères
        </Text>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text.primary }]}>
          Email (optionnel)
        </Text>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: isDark ? '#333' : '#f9f9f9',
              color: colors.text.primary,
              borderColor: colors.border
            }
          ]}
          placeholder="votre@email.com"
          placeholderTextColor={colors.text.disabled}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={[styles.helperText, { color: colors.text.secondary }]}>
          Pour vous recontacter si besoin
        </Text>
      </View>
      
      <TouchableOpacity
        style={[
          styles.submitButton,
          { backgroundColor: colors.primary },
          (!title.trim() || !description.trim() || isSubmitting) && styles.disabledButton
        ]}
        onPress={handleSubmit}
        disabled={!title.trim() || !description.trim() || isSubmitting}
      >
        {isSubmitting ? (
          <Text style={styles.submitButtonText}>Envoi en cours...</Text>
        ) : (
          <Text style={styles.submitButtonText}>Envoyer le feedback</Text>
        )}
      </TouchableOpacity>
      
      <Text style={[styles.privacyNote, { color: colors.text.secondary }]}>
        Vos informations seront utilisées uniquement pour améliorer l'application.
        Nous ne partagerons jamais votre email avec des tiers.
      </Text>
    </ScrollView>
  );

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: isDark ? colors.background : '#fff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: normalize(18),
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    closeButton: {
      padding: 5,
    },
    stepContainer: {
      padding: 20,
    },
    stepTitle: {
      fontSize: normalize(20),
      fontWeight: 'bold',
      marginBottom: 8,
    },
    stepDescription: {
      fontSize: normalize(14),
      marginBottom: 24,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    typeButton: {
      width: '48%',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 12,
      borderWidth: 2,
    },
    typeLabel: {
      fontSize: normalize(16),
      fontWeight: '600',
      marginTop: 8,
      marginBottom: 4,
    },
    typeDescription: {
      fontSize: normalize(12),
      textAlign: 'center',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    backButtonText: {
      fontSize: normalize(16),
      fontWeight: '600',
      marginLeft: 8,
    },
    formGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: normalize(14),
      fontWeight: '600',
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: normalize(16),
    },
    textArea: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: normalize(16),
      minHeight: 120,
    },
    charCount: {
      fontSize: normalize(12),
      textAlign: 'right',
      marginTop: 4,
    },
    helperText: {
      fontSize: normalize(12),
      marginTop: 4,
    },
    submitButton: {
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
    },
    disabledButton: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: '#fff',
      fontSize: normalize(16),
      fontWeight: 'bold',
    },
    privacyNote: {
      fontSize: normalize(12),
      textAlign: 'center',
      marginTop: 20,
      lineHeight: 18,
    },
    helpRedirect: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      borderRadius: 12,
      marginTop: 20,
    },
    helpText: {
      fontSize: normalize(14),
      fontWeight: 'bold',
    },
    helpSubtext: {
      fontSize: normalize(12),
    },
    helpBtn: {
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
    },
    helpBtnText: {
      color: '#fff',
      fontSize: normalize(12),
      fontWeight: 'bold',
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {currentStep === 1 ? 'Donnez votre avis' : 'Détails'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          {currentStep === 1 ? renderStep1() : renderStep2()}
        </View>
      </View>
    </Modal>
  );
}

// Hook pour utiliser facilement le feedback system
export const useFeedback = () => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackContext, setFeedbackContext] = useState<string>();

  const showFeedbackModal = (context?: string) => {
    setFeedbackContext(context);
    setShowFeedback(true);
  };

  const hideFeedbackModal = () => {
    setShowFeedback(false);
    setFeedbackContext(undefined);
  };

  const FeedbackModal = () => (
    <FeedbackSystem
      visible={showFeedback}
      onClose={hideFeedbackModal}
      context={feedbackContext}
    />
  );

  return {
    showFeedbackModal,
    hideFeedbackModal,
    FeedbackModal,
  };
};

// Composant bouton de feedback flottant
export const FeedbackFAB = ({ context }: { context?: string }) => {
  const { colors } = useTheme();
  const { showFeedbackModal } = useFeedback();

  return (
    <TouchableOpacity
      style={[
        fabStyles.container,
        { backgroundColor: colors.primary }
      ]}
      onPress={() => showFeedbackModal(context)}
    >
      <Ionicons name="chatbubble" size={24} color="#fff" />
    </TouchableOpacity>
  );
};

const fabStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});