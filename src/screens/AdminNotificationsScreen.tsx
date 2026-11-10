import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Bell, Check } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import { useTheme } from '../context/ThemeContext';

interface AdminNotification {
  id: string;
  source_type: string;
  source_id: string;
  metadata?: {
    proposalStatus?: string;
    claimStatus?: string;
    officialEmail?: string;
    phone?: string;
    evidence?: string;
  };
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export default function AdminNotificationsScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewingProposal, setReviewingProposal] = useState<string | null>(null);
  const notificationsOffset = useRef(0);

  const loadNotifications = useCallback(async (isRefresh = false, loadMore = false) => {
    if (loadMore) setLoadingMore(true);
    else if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const offset = loadMore ? notificationsOffset.current : 0;
      const response = await apiService.getAdminNotifications(50, offset);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Impossible de charger les notifications.');
      }

      const items = response.data.notifications || [];
      setNotifications(previous => loadMore ? [...previous, ...items] : items);
      notificationsOffset.current = offset + items.length;
      setTotalCount(Number(response.data.totalCount) || 0);
      setUnreadCount(Number(response.data.unreadCount) || 0);
    } catch (error: any) {
      console.error('Unable to load admin notifications:', error);
      Alert.alert('Notifications Admin', error?.message || 'Impossible de charger les notifications.');
    } finally {
      if (loadMore) setLoadingMore(false);
      else {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadNotifications();
  }, [loadNotifications]));

  React.useEffect(() => {
    const handleNewAdminNotification = () => {
      void loadNotifications(true);
    };
    socketService.on('admin_notification', handleNewAdminNotification);
    return () => socketService.off('admin_notification', handleNewAdminNotification);
  }, [loadNotifications]);

  const updateAppBadge = async () => {
    if (Platform.OS === 'web') return;
    const response = await apiService.getBadges();
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Impossible de mettre à jour le badge.');
    }
    await Notifications.setBadgeCountAsync(Number(response.data.notifications) || 0);
  };

  const markRead = async (id: string) => {
    try {
      const response = await apiService.markAdminNotificationRead(id);
      if (!response.success) {
        throw new Error(response.error || 'Impossible de marquer la notification comme lue.');
      }
      await Promise.all([loadNotifications(true), updateAppBadge()]);
    } catch (error: any) {
      console.error('Unable to mark admin notification as read:', error);
      Alert.alert('Notifications Admin', error?.message || 'Impossible de mettre à jour la notification.');
    }
  };

  const markAllRead = async () => {
    try {
      const response = await apiService.markAllAdminNotificationsRead();
      if (!response.success) {
        throw new Error(response.error || 'Impossible de marquer les notifications comme lues.');
      }
      await Promise.all([loadNotifications(true), updateAppBadge()]);
    } catch (error: any) {
      console.error('Unable to mark all admin notifications as read:', error);
      Alert.alert('Notifications Admin', error?.message || 'Impossible de mettre à jour les notifications.');
    }
  };

  const reviewSchoolDirectoryItem = async (item: AdminNotification, status: 'accepted' | 'rejected') => {
    if (item.source_type === 'school_directory_claim' && status === 'accepted') {
      Alert.alert(
        'Activer l’espace partenaire ?',
        'Confirmez-vous avoir vérifié l’identité et le mandat du responsable ? L’approbation activera son accès au tableau de bord scolaire.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Vérifier et activer', onPress: () => { void processSchoolDirectoryItem(item, status); } }
        ]
      );
      return;
    }
    await processSchoolDirectoryItem(item, status);
  };

  const processSchoolDirectoryItem = async (item: AdminNotification, status: 'accepted' | 'rejected') => {
    setReviewingProposal(item.source_id);
    try {
      const response = item.source_type === 'school_directory_claim'
        ? await apiService.reviewSchoolDirectoryClaim(item.source_id, status)
        : await apiService.reviewSchoolDirectoryProposal(item.source_id, status);
      if (!response.success) {
        throw new Error(response.error || 'Impossible de traiter cette demande.');
      }
      await loadNotifications(true);
      Alert.alert('Demande traitée', response.message || 'La décision a été enregistrée.');
    } catch (error: any) {
      console.error('Unable to review school directory request:', error);
      Alert.alert('Répertoire scolaire', error?.message || 'Impossible de traiter cette demande.');
    } finally {
      setReviewingProposal(null);
    }
  };

  const renderNotification = ({ item }: { item: AdminNotification }) => {
    const unread = !item.read_at;
    const pendingDirectoryRequest = (
      (item.source_type === 'school_directory_proposal' && item.metadata?.proposalStatus === 'pending')
      || (item.source_type === 'school_directory_claim' && item.metadata?.claimStatus === 'pending')
    );
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.icon, { backgroundColor: `${colors.primary}15` }]}>
            <Bell size={18} color={colors.primary} />
          </View>
          <View style={styles.cardCopy}>
            <Text style={[styles.title, { color: colors.text.primary }]}>{item.title}</Text>
            <Text style={[styles.date, { color: colors.text.secondary }]}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </View>
          {unread && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Marquer comme lu"
              onPress={() => markRead(item.id)}
              style={[styles.readButton, { borderColor: colors.primary }]}
            >
              <Check size={16} color={colors.primary} />
              <Text style={[styles.readButtonText, { color: colors.primary }]}>Lu</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text selectable style={[styles.body, { color: colors.text.primary }]}>{item.body}</Text>
        {item.source_type === 'school_directory_claim' && item.metadata?.claimStatus === 'pending' && (
          <View style={[styles.claimDetails, { backgroundColor: colors.background }]}>
            {!!item.metadata.officialEmail && <Text style={[styles.claimDetailText, { color: colors.text.primary }]}>E-mail professionnel : {item.metadata.officialEmail}</Text>}
            {!!item.metadata.phone && <Text style={[styles.claimDetailText, { color: colors.text.primary }]}>Téléphone : {item.metadata.phone}</Text>}
            {!!item.metadata.evidence && <Text style={[styles.claimDetailText, { color: colors.text.secondary }]}>Vérification : {item.metadata.evidence}</Text>}
          </View>
        )}
        {pendingDirectoryRequest && (
          <View style={styles.proposalActions}>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={reviewingProposal === item.source_id}
              onPress={() => void reviewSchoolDirectoryItem(item, 'accepted')}
              style={[styles.proposalButton, { backgroundColor: '#2E7D32' }]}
            >
              {reviewingProposal === item.source_id
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.proposalButtonText}>
                  {item.source_type === 'school_directory_claim' ? 'Vérifier et activer partenaire' : 'Ajouter au répertoire'}
                </Text>}
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={reviewingProposal === item.source_id}
              onPress={() => void reviewSchoolDirectoryItem(item, 'rejected')}
              style={[styles.proposalButton, { backgroundColor: colors.danger }]}
            >
              <Text style={styles.proposalButtonText}>Refuser</Text>
            </TouchableOpacity>
          </View>
        )}
        {unread && <View style={[styles.unreadDot, { backgroundColor: colors.danger }]} />}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Retour"
          style={[styles.backButton, { backgroundColor: colors.background }]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Notifications Admin</Text>
          <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>{unreadCount} non lue(s)</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Tout marquer comme lu"
          disabled={unreadCount === 0}
          onPress={markAllRead}
        >
          <Text style={[styles.markAll, { color: unreadCount ? colors.primary : colors.text.disabled }]}>Tout lire</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.list}
          onEndReached={() => {
            if (!loadingMore && !loading && notifications.length < totalCount) {
              void loadNotifications(false, true);
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} /> : null}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications(true)} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Bell size={36} color={colors.text.disabled} />
              <Text style={[styles.emptyText, { color: colors.text.secondary }]}>Aucune notification reçue.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSubtitle: { marginTop: 3, fontSize: 12 },
  markAll: { fontSize: 12, fontWeight: '700' },
  list: { flexGrow: 1, gap: 10, padding: 16 },
  card: { position: 'relative', borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 15 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  cardCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '800' },
  date: { marginTop: 3, fontSize: 11 },
  body: { marginTop: 13, fontSize: 14, lineHeight: 21 },
  readButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 7, borderWidth: 1, borderRadius: 10 },
  readButtonText: { fontSize: 11, fontWeight: '700' },
  unreadDot: { position: 'absolute', top: 11, right: 11, width: 7, height: 7, borderRadius: 4 },
  proposalActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  claimDetails: { borderRadius: 10, padding: 11, marginTop: 12, gap: 6 },
  claimDetailText: { fontSize: 12, lineHeight: 18 },
  proposalButton: { minHeight: 40, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 13, borderRadius: 10 },
  proposalButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { marginTop: 12, fontSize: 14 },
});
