import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Check, GraduationCap, RefreshCw, X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

type AdmissionMode = 'apply' | 'mine' | 'inbox';

interface AdmissionApplication {
  id: string;
  school_name?: string;
  city?: string;
  country?: string;
  full_name: string;
  email: string;
  phone: string;
  current_level: string;
  requested_program: string;
  motivation: string;
  applicant_response?: string | null;
  status: 'pending' | 'info_requested' | 'accepted' | 'rejected';
  decision_message?: string | null;
  school_access_code?: string | null;
  history?: Array<{
    actorType: string;
    eventType: string;
    message?: string | null;
    createdAt: string;
  }>;
  created_at: string;
}

interface AdmissionNotification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
}

const statusLabels: Record<AdmissionApplication['status'], string> = {
  pending: 'En attente',
  info_requested: 'Informations demandées',
  accepted: 'Acceptée',
  rejected: 'Refusée',
};

const eventLabels: Record<string, string> = {
  submitted: 'Candidature envoyée',
  info_requested: 'Informations complémentaires demandées',
  accepted: 'Candidature acceptée',
  rejected: 'Candidature refusée',
  response_received: 'Réponse du candidat envoyée',
};

export default function SchoolAdmissionsScreen({ navigation, route }: any) {
  const { colors, normalize } = useTheme();
  const mode: AdmissionMode = route.params?.mode || 'mine';
  const school = route.params?.school;
  const [loading, setLoading] = useState(mode !== 'apply');
  const [submitting, setSubmitting] = useState(false);
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [notifications, setNotifications] = useState<AdmissionNotification[]>([]);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    currentLevel: '',
    requestedProgram: '',
    motivation: '',
  });

  const loadData = useCallback(async () => {
    if (mode === 'apply') return;
    setLoading(true);
    try {
      const [applicationResponse, notificationResponse] = await Promise.all([
        mode === 'inbox' ? apiService.getSchoolAdmissionInbox() : apiService.getMySchoolAdmissions(),
        apiService.getMyAdmissionNotifications(),
      ]);
      if (!applicationResponse.success) {
        Alert.alert('Candidatures', applicationResponse.error || 'Impossible de charger les candidatures.');
      } else {
        setApplications(Array.isArray(applicationResponse.data) ? applicationResponse.data : []);
      }
      if (notificationResponse.success) {
        setNotifications(Array.isArray(notificationResponse.data) ? notificationResponse.data : []);
      } else {
        Alert.alert('Notifications', notificationResponse.error || 'Impossible de charger les notifications.');
      }
    } catch (error) {
      console.error('Unable to load school admission data', error);
      Alert.alert('Candidatures', 'Une erreur est survenue pendant le chargement.');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submitApplication = async () => {
    if (!school?.id) {
      Alert.alert('École introuvable', 'Retournez au répertoire et sélectionnez à nouveau l’établissement.');
      return;
    }
    if (Object.values(form).some((value) => !value.trim())) {
      Alert.alert('Informations requises', 'Complétez tous les champs avant d’envoyer votre candidature.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiService.submitSchoolAdmission(school.id, form);
      if (!response.success) {
        Alert.alert('Candidature non envoyée', response.error || 'Impossible d’envoyer la candidature.');
        return;
      }
      Alert.alert('Candidature envoyée', response.message || 'Votre demande a été transmise à l’établissement.', [
        { text: 'Voir mes candidatures', onPress: () => navigation.replace('SchoolAdmissions', { mode: 'mine' }) },
      ]);
    } catch (error) {
      console.error('Unable to submit school admission', error);
      Alert.alert('Candidature non envoyée', 'Une erreur est survenue. Réessayez plus tard.');
    } finally {
      setSubmitting(false);
    }
  };

  const decide = (application: AdmissionApplication, status: 'info_requested' | 'accepted' | 'rejected') => {
    const message = (messages[application.id] || '').trim();
    if (status === 'info_requested' && !message) {
      Alert.alert('Informations requises', 'Précisez les informations attendues avant de continuer.');
      return;
    }
    const action = async () => {
      setSubmitting(true);
      try {
        const response = await apiService.decideSchoolAdmission(application.id, status, message);
        if (!response.success) {
          Alert.alert('Action impossible', response.error || 'La candidature n’a pas pu être mise à jour.');
          return;
        }
        setMessages((current) => ({ ...current, [application.id]: '' }));
        await loadData();
      } catch (error) {
        console.error('Unable to update school admission', error);
        Alert.alert('Action impossible', 'Une erreur est survenue. Réessayez.');
      } finally {
        setSubmitting(false);
      }
    };

    if (status === 'info_requested') {
      void action();
      return;
    }
    Alert.alert(
      status === 'accepted' ? 'Accepter cette candidature ?' : 'Refuser cette candidature ?',
      status === 'accepted'
        ? 'L’élève sera rattaché à votre établissement.'
        : 'Cette décision sera communiquée au candidat.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', style: status === 'rejected' ? 'destructive' : 'default', onPress: () => void action() },
      ]
    );
  };

  const respond = async (application: AdmissionApplication) => {
    const message = (messages[application.id] || '').trim();
    if (!message) {
      Alert.alert('Informations requises', 'Saisissez les informations demandées par l’établissement.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiService.respondToSchoolAdmission(application.id, message);
      if (!response.success) {
        Alert.alert('Réponse non envoyée', response.error || 'Impossible de transmettre votre réponse.');
        return;
      }
      setMessages((current) => ({ ...current, [application.id]: '' }));
      await loadData();
    } catch (error) {
      console.error('Unable to respond to school admission', error);
      Alert.alert('Réponse non envoyée', 'Une erreur est survenue. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  const markRead = async (notification: AdmissionNotification) => {
    const response = await apiService.markAdmissionNotificationRead(notification.id);
    if (!response.success) {
      Alert.alert('Notification', response.error || 'Impossible de mettre à jour la notification.');
      return;
    }
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item));
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    multiline = false,
    keyboardType: 'default' | 'email-address' | 'phone-pad' = 'default',
  ) => (
    <TextInput
      accessibilityLabel={label}
      placeholder={label}
      placeholderTextColor={colors.text.disabled}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={[
        styles.input,
        { color: colors.text.primary, backgroundColor: colors.background, borderColor: colors.border },
        multiline && styles.multiline,
      ]}
    />
  );

  const renderNotification = (notification: AdmissionNotification) => (
    <TouchableOpacity
      key={notification.id}
      accessibilityRole="button"
      onPress={() => !notification.is_read && void markRead(notification)}
      style={[styles.notification, { backgroundColor: colors.surface, borderColor: colors.border }, !notification.is_read && { borderLeftColor: colors.primary, borderLeftWidth: 3 }]}
    >
      <Bell size={17} color={colors.primary} />
      <View style={styles.flex}>
        <Text style={[styles.cardTitle, { color: colors.text.primary }]}>{notification.title}</Text>
        <Text style={[styles.body, { color: colors.text.secondary }]}>{notification.body}</Text>
      </View>
      {!notification.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
    </TouchableOpacity>
  );

  const renderApplication = (application: AdmissionApplication) => {
    const isInbox = mode === 'inbox';
    const isResponding = application.status === 'info_requested' && mode === 'mine';
    return (
      <View key={application.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: `${colors.primary}15` }]}>
            <GraduationCap size={21} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
              {isInbox ? application.full_name : application.school_name || 'Établissement'}
            </Text>
            <Text style={[styles.body, { color: colors.text.secondary }]}>
              {application.requested_program} · {application.current_level}
            </Text>
          </View>
          <Text style={[styles.status, { color: application.status === 'accepted' ? '#25834A' : application.status === 'rejected' ? colors.danger : '#B26A00' }]}>
            {statusLabels[application.status]}
          </Text>
        </View>
        {isInbox && (
          <>
            <Text style={[styles.body, { color: colors.text.primary }]}>{application.email} · {application.phone}</Text>
            <Text style={[styles.body, { color: colors.text.secondary, marginTop: 8 }]}>{application.motivation}</Text>
            {!!application.applicant_response && (
              <Text style={[styles.body, { color: colors.primary, marginTop: 8 }]}>Réponse du candidat : {application.applicant_response}</Text>
            )}
          </>
        )}
        {mode === 'mine' && (
          <>
            {!!application.decision_message && <Text style={[styles.body, { color: colors.text.secondary, marginTop: 8 }]}>{application.decision_message}</Text>}
            {!!application.city && <Text style={[styles.body, { color: colors.text.secondary }]}>{[application.city, application.country].filter(Boolean).join(', ')}</Text>}
            {!!application.school_access_code && (
              <Text style={[styles.accessCode, { color: colors.primary, backgroundColor: `${colors.primary}12` }]}>
                Code d’accès scolaire : {application.school_access_code}
              </Text>
            )}
          </>
        )}
        {isInbox && (application.status === 'pending' || application.status === 'info_requested') && (
          <View style={styles.actionsBlock}>
            {renderInput('Message ou informations à demander', messages[application.id] || '', (value) => setMessages((current) => ({ ...current, [application.id]: value })), true)}
            <View style={styles.buttonRow}>
              <TouchableOpacity disabled={submitting} onPress={() => decide(application, 'info_requested')} style={[styles.actionButton, { borderColor: colors.primary }]}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Demander des infos</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={submitting} onPress={() => decide(application, 'rejected')} style={[styles.actionButton, { borderColor: colors.danger }]}>
                <X size={15} color={colors.danger} />
                <Text style={{ color: colors.danger, fontWeight: '700' }}>Refuser</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={submitting} onPress={() => decide(application, 'accepted')} style={[styles.actionButton, { backgroundColor: '#25834A', borderColor: '#25834A' }]}>
                <Check size={15} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700' }}>Accepter</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {isResponding && (
          <View style={styles.actionsBlock}>
            {renderInput('Votre réponse', messages[application.id] || '', (value) => setMessages((current) => ({ ...current, [application.id]: value })), true)}
            <TouchableOpacity disabled={submitting} onPress={() => void respond(application)} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.primaryButtonText}>Envoyer les informations demandées</Text>
            </TouchableOpacity>
          </View>
        )}
        {!!application.history?.length && (
          <View style={[styles.history, { borderTopColor: colors.border }]}>
            <Text style={[styles.historyTitle, { color: colors.text.primary }]}>Historique</Text>
            {application.history.map((event, index) => (
              <View key={`${application.id}-${index}`} style={styles.historyRow}>
                <View style={[styles.historyDot, { backgroundColor: colors.primary }]} />
                <View style={styles.flex}>
                  <Text style={[styles.body, { color: colors.text.primary }]}>
                    {eventLabels[event.eventType] || event.eventType}
                  </Text>
                  {!!event.message && <Text style={[styles.body, { color: colors.text.secondary }]}>{event.message}</Text>}
                  <Text style={[styles.date, { color: colors.text.disabled }]}>
                    {new Date(event.createdAt).toLocaleString('fr-FR')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const title = mode === 'apply' ? 'Candidature scolaire' : mode === 'inbox' ? 'Demandes d’admission' : 'Mes candidatures';
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retour" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.primary, fontSize: normalize(18) }]}>{title}</Text>
        {mode !== 'apply' && (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Actualiser" onPress={() => void loadData()} style={styles.backButton}>
            <RefreshCw size={19} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {mode === 'apply' ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text.primary, fontSize: normalize(17) }]}>{school?.name || 'Établissement partenaire'}</Text>
              <Text style={[styles.body, { color: colors.text.secondary, marginTop: 5 }]}>
                {[school?.city, school?.country].filter(Boolean).join(', ')}. Aucun document confidentiel n’est demandé dans cette étape.
              </Text>
              <View style={styles.form}>
                {renderInput('Nom complet *', form.fullName, (value) => updateForm('fullName', value))}
                {renderInput('E-mail *', form.email, (value) => updateForm('email', value), false, 'email-address')}
                {renderInput('Téléphone *', form.phone, (value) => updateForm('phone', value), false, 'phone-pad')}
                {renderInput('Niveau actuel *', form.currentLevel, (value) => updateForm('currentLevel', value))}
                {renderInput('Formation ou classe souhaitée *', form.requestedProgram, (value) => updateForm('requestedProgram', value))}
                {renderInput('Motivation *', form.motivation, (value) => updateForm('motivation', value), true)}
                <TouchableOpacity disabled={submitting} onPress={() => void submitApplication()} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Envoyer ma candidature</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {notifications.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Notifications persistantes</Text>
                  {notifications.map(renderNotification)}
                </>
              )}
              {applications.length > 0 ? applications.map(renderApplication) : (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <GraduationCap size={30} color={colors.text.disabled} />
                  <Text style={[styles.body, { color: colors.text.secondary, textAlign: 'center' }]}>
                    {mode === 'inbox' ? 'Aucune candidature reçue pour le moment.' : 'Vous n’avez pas encore envoyé de candidature.'}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10 },
  backButton: { width: 42, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontWeight: '800', textAlign: 'center' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { borderWidth: 1, borderRadius: 16, padding: 15 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  body: { fontSize: 13, lineHeight: 19 },
  status: { fontSize: 11, fontWeight: '800', textAlign: 'right', flexShrink: 1 },
  accessCode: { fontSize: 14, fontWeight: '900', padding: 11, borderRadius: 10, overflow: 'hidden', marginTop: 10 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, fontSize: 14 },
  multiline: { minHeight: 90, paddingTop: 11 },
  form: { gap: 10, marginTop: 16 },
  actionsBlock: { gap: 10, marginTop: 14 },
  history: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 12, gap: 10 },
  historyTitle: { fontSize: 13, fontWeight: '800' },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  historyDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  date: { fontSize: 11, marginTop: 3 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  actionButton: { minHeight: 40, flexGrow: 1, flexBasis: '30%', borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  primaryButton: { minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 4 },
  primaryButtonText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  notification: { minHeight: 70, borderWidth: 1, borderRadius: 13, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' },
  unreadDot: { width: 8, height: 8, borderRadius: 5 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  emptyCard: { minHeight: 140, borderWidth: 1, borderRadius: 16, padding: 22, alignItems: 'center', justifyContent: 'center', gap: 12 },
});
