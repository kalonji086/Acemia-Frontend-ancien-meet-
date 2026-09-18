import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView
} from 'react-native';
import { ArrowLeft, User, Check, X, BookOpen, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolEnrollmentRequestsScreen({ navigation, route }: any) {
  const { schoolId } = route?.params || {};
  const { colors, normalize } = useTheme();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Selection
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    try {
      const [reqRes, classesRes] = await Promise.all([
        apiService.getEnrollmentRequests(schoolId),
        apiService.getSchoolClasses(schoolId)
      ]);
      if (reqRes.success) setRequests(reqRes.data);
      if (classesRes.success) setClasses(classesRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId: string, status: 'approved' | 'rejected', classId?: string) => {
    try {
      const res = await apiService.handleEnrollment(requestId, { status, classId });
      if (res.success) {
        Alert.alert('Succès', res.message);
        setShowAssignModal(false);
        fetchData();
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de traiter la demande.');
    }
  };

  const renderRequestItem = ({ item }: any) => (
    <View style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
          <User size={24} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.studentName, { color: colors.text.primary }]}>{item.student_first_name} {item.student_last_name}</Text>
          <Text style={[styles.parentInfo, { color: colors.text.secondary }]}>Parent : {item.parent_name}</Text>
          <Text style={[styles.levelInfo, { color: colors.primary }]}>Niveau : {item.previous_level}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.btn, styles.rejectBtn, { borderColor: '#FF525230' }]}
          onPress={() => handleAction(item.id, 'rejected')}
        >
          <X size={18} color="#FF5252" />
          <Text style={styles.rejectText}>REJETER</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.approveBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            setSelectedRequest(item);
            setShowAssignModal(true);
          }}
        >
          <Check size={18} color="#fff" />
          <Text style={styles.approveText}>APPROUVER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Demandes d'inscription</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.text.secondary }}>Aucune demande en attente.</Text>}
        />
      )}

      {/* Modal d'assignation de classe */}
      <Modal visible={showAssignModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Assigner une classe</Text>
            <Text style={[styles.modalSub, { color: colors.text.secondary }]}>Pour finaliser l'inscription de {selectedRequest?.student_first_name}, veuillez lui choisir une classe.</Text>

            <ScrollView style={{ maxHeight: 300 }}>
              {classes.length === 0 ? (
                <Text style={{ textAlign: 'center', marginVertical: 20 }}>Aucune classe créée dans cette école.</Text>
              ) : (
                classes.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.classOption, { borderColor: colors.border }]}
                    onPress={() => handleAction(selectedRequest.id, 'approved', c.id)}
                  >
                    <BookOpen size={20} color={colors.primary} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={[styles.className, { color: colors.text.primary }]}>{c.name}</Text>
                      <Text style={{ fontSize: 10, color: colors.text.secondary }}>Niveau : {c.level}</Text>
                    </View>
                    <ChevronRight size={16} color={colors.text.disabled} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowAssignModal(false)}
              style={styles.closeBtn}
            >
              <Text style={{ color: colors.text.secondary, fontWeight: 'bold' }}>FERMER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  requestCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 15 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  info: { marginLeft: 15, flex: 1 },
  studentName: { fontSize: 17, fontWeight: 'bold' },
  parentInfo: { fontSize: 12, marginTop: 2 },
  levelInfo: { fontSize: 11, fontWeight: 'bold', marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12 },
  rejectBtn: { borderWidth: 1, backgroundColor: '#FF525210' },
  approveBtn: { },
  rejectText: { color: '#FF5252', fontSize: 11, fontWeight: 'bold', marginLeft: 8 },
  approveText: { color: '#fff', fontSize: 11, fontWeight: 'bold', marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 30, borderRadius: 40 },
  modalTitle: { fontSize: 22, fontWeight: '900', marginBottom: 10 },
  modalSub: { fontSize: 13, marginBottom: 25, lineHeight: 18 },
  classOption: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, borderWidth: 1, marginBottom: 10 },
  className: { fontWeight: 'bold', fontSize: 15 },
  closeBtn: { marginTop: 20, padding: 10, alignItems: 'center' }
});