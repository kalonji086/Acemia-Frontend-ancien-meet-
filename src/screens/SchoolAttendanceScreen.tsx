import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  ScrollView,
  Modal
} from 'react-native';
import { ArrowLeft, Plus, Calendar, Users, CheckCircle, XCircle, Clock, Filter, Search, BarChart3, Download } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolAttendanceScreen({ navigation, route }: any) {
  const { colors, normalize } = useTheme();
  const canRecordAttendance = !route?.params?.schoolRole || ['directeur', 'enseignant'].includes(route.params.schoolRole);
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // États pour les modales
  const [showRecordAttendance, setShowRecordAttendance] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});

  // Form states pour nouvelle date
  const [newDate, setNewDate] = useState('');

  useEffect(() => {
    fetchData();
    fetchStats();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attRes, studRes, clsRes] = await Promise.all([
        apiService.getSchoolAttendance(),
        apiService.getSchoolStudents(),
        apiService.getSchoolClasses()
      ]);

      if (attRes.success) setAttendance(attRes.data || []);
      if (studRes.success) setStudents(studRes.data || []);
      if (clsRes.success) setClasses(clsRes.data || []);
    } catch (e) {
      console.error('Error fetching data:', e);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiService.getSchoolAttendanceStats();
      if (res.success) {
        setStats(res.data || res.stats);
      }
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const loadClassForAttendance = (classId: string, date: string) => {
    setSelectedClassId(classId);
    setSelectedDate(date || new Date().toISOString().split('T')[0]);

    // Filtrer les élèves de la classe sélectionnée
    const classStudents = students.filter(s => s.class_id === classId);

    // Initialiser les enregistrements de présence
    const initialRecords: Record<string, string> = {};
    classStudents.forEach(student => {
      // Vérifier s'il y a déjà un enregistrement pour cette date
      const existingRecord = attendance.find(
        a => a.student_id === student.id && a.date === (date || new Date().toISOString().split('T')[0])
      );
      initialRecords[student.id] = existingRecord?.status || 'present';
    });

    setAttendanceRecords(initialRecords);
    setShowRecordAttendance(true);
  };

  const handleRecordAttendance = async () => {
    if (!selectedDate || Object.keys(attendanceRecords).length === 0) {
      Alert.alert('Attention', 'Veuillez sélectionner une date et au moins un élève.');
      return;
    }

    const records = Object.entries(attendanceRecords).map(([studentId, status]) => ({
      studentId,
      status,
      classId: selectedClassId || null,
      reason: status === 'excused' ? 'Excusé' : status === 'absent' ? 'Absent' : null
    }));

    setSubmitting(true);
    try {
      const res = await apiService.recordSchoolAttendance({
        date: selectedDate,
        records
      });

      if (res.success) {
        Alert.alert('Succès', 'Présences enregistrées avec succès !');
        setShowRecordAttendance(false);
        resetAttendanceForm();
        fetchData();
        fetchStats();
      } else {
        Alert.alert('Erreur', res.error || 'Impossible d\'enregistrer les présences.');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAttendanceForm = () => {
    setSelectedDate('');
    setSelectedClassId('');
    setAttendanceRecords({});
    setNewDate('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#4CAF50';
      case 'absent': return '#F44336';
      case 'excused': return '#FF9800';
      case 'late': return '#2196F3';
      default: return colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle size={16} color="#4CAF50" />;
      case 'absent': return <XCircle size={16} color="#F44336" />;
      case 'excused': return <Clock size={16} color="#FF9800" />;
      case 'late': return <Clock size={16} color="#2196F3" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'Présent';
      case 'absent': return 'Absent';
      case 'excused': return 'Excusé';
      case 'late': return 'En retard';
      default: return status;
    }
  };

  const filteredAttendance = attendance.filter(a => {
    const matchesSearch = !searchQuery ||
      a.student_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass = !filterClassId || a.class_id === filterClassId;
    const matchesDate = !filterDate || a.date === filterDate;
    const matchesStatus = !filterStatus || a.status === filterStatus;

    return matchesSearch && matchesClass && matchesDate && matchesStatus;
  });

  const attendanceStatuses = [
    { value: 'present', label: 'Présent', color: '#4CAF50' },
    { value: 'absent', label: 'Absent', color: '#F44336' },
    { value: 'excused', label: 'Excusé', color: '#FF9800' },
    { value: 'late', label: 'En retard', color: '#2196F3' }
  ];

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: normalize(18) }]}>
          Gestion des Présences
        </Text>
        {canRecordAttendance && (
          <TouchableOpacity
            style={[styles.addHeaderBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={() => {
              setNewDate(new Date().toISOString().split('T')[0]);
              setShowRecordAttendance(true);
            }}
          >
            <Plus size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Statistiques */}
      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 20, paddingTop: 15 }}>
          <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.total || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Total</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.present || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Présents</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#F44336' }]}>{stats.absent || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Absents</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FF9800' }]}>{stats.excused || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Excusés</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#2196F3' }]}>{stats.late || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Retards</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.presenceRate || 0}%</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Taux présence</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Barre de Recherche et Filtres */}
      <View style={{ paddingHorizontal: 20, paddingTop: 15 }}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.text.secondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Rechercher par nom d'élève..."
            placeholderTextColor={colors.text.disabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filtres */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Filtre par date */}
            <View style={[styles.filterChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Calendar size={14} color={colors.text.secondary} style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.dateInput, { color: colors.text.primary }]}
                placeholder="Date (YYYY-MM-DD)"
                placeholderTextColor={colors.text.disabled}
                value={filterDate}
                onChangeText={setFilterDate}
              />
              {filterDate && (
                <TouchableOpacity onPress={() => setFilterDate('')}>
                  <Text style={{ color: colors.danger, fontSize: 12, marginLeft: 6 }}>×</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Filtre par classe */}
            <View style={[styles.filterDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Filter size={14} color={colors.text.secondary} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Classe:</Text>
              <ScrollView style={{ maxHeight: 100 }} nestedScrollEnabled={true}>
                <TouchableOpacity
                  style={[styles.filterOption, !filterClassId && { backgroundColor: colors.primary + '20' }]}
                  onPress={() => setFilterClassId('')}
                >
                  <Text style={{ color: colors.text.primary, fontSize: 12 }}>Toutes</Text>
                  {!filterClassId && <CheckCircle size={12} color={colors.primary} />}
                </TouchableOpacity>
                {classes.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.filterOption, filterClassId === c.id && { backgroundColor: colors.primary + '20' }]}
                    onPress={() => setFilterClassId(filterClassId === c.id ? '' : c.id)}
                  >
                    <Text style={{ color: colors.text.primary, fontSize: 12 }}>{c.name}</Text>
                    {filterClassId === c.id && <CheckCircle size={12} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Filtre par statut */}
            <View style={[styles.filterDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Users size={14} color={colors.text.secondary} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Statut:</Text>
              <ScrollView style={{ maxHeight: 100 }} nestedScrollEnabled={true}>
                <TouchableOpacity
                  style={[styles.filterOption, !filterStatus && { backgroundColor: colors.primary + '20' }]}
                  onPress={() => setFilterStatus('')}
                >
                  <Text style={{ color: colors.text.primary, fontSize: 12 }}>Tous</Text>
                  {!filterStatus && <CheckCircle size={12} color={colors.primary} />}
                </TouchableOpacity>
                {attendanceStatuses.map(s => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.filterOption, filterStatus === s.value && { backgroundColor: s.color + '20' }]}
                    onPress={() => setFilterStatus(filterStatus === s.value ? '' : s.value)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.statusDot, { backgroundColor: s.color }]} />
                      <Text style={{ color: colors.text.primary, fontSize: 12, marginLeft: 6 }}>{s.label}</Text>
                    </View>
                    {filterStatus === s.value && <CheckCircle size={12} color={s.color} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Liste des Présences */}
      <FlatList
        data={filteredAttendance}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Calendar size={48} color={colors.text.disabled} style={{ marginBottom: 10 }} />
            <Text style={{ textAlign: 'center', color: colors.text.secondary, fontSize: 14 }}>
              {searchQuery || filterClassId || filterDate || filterStatus
                ? 'Aucune présence ne correspond à votre recherche.'
                : 'Aucun enregistrement de présence pour le moment.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.attendanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.attendanceHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.studentName, { color: colors.text.primary }]}>{item.student_name}</Text>
                <Text style={[styles.className, { color: colors.text.secondary }]}>{item.class_name || 'Non assigné'}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                {getStatusIcon(item.status)}
                <Text style={[styles.statusText, { color: getStatusColor(item.status), marginLeft: 4 }]}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>

            <View style={[styles.attendanceDetails, { borderTopColor: colors.border }]}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Date:</Text>
                <Text style={[styles.detailValue, { color: colors.text.primary }]}>
                  {new Date(item.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
              {item.reason && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Raison:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>{item.reason}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Vérifié par:</Text>
                <Text style={[styles.detailValue, { color: colors.text.primary }]}>{item.verified_by || 'Système'}</Text>
              </View>
            </View>
          </View>
        )}
      />

      {/* Modal: Enregistrer les Présences */}
      {canRecordAttendance && <Modal
        animationType="slide"
        transparent={true}
        visible={showRecordAttendance}
        onRequestClose={() => setShowRecordAttendance(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxWidth: isTablet ? 500 : '90%', maxHeight: '80%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Enregistrer les Présences</Text>
              <TouchableOpacity onPress={() => { resetAttendanceForm(); setShowRecordAttendance(false); }}>
                <Text style={{ color: colors.text.secondary, fontSize: 24 }}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Sélection de la date */}
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>Date *</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.text.disabled}
                value={selectedDate || newDate}
                onChangeText={(text) => {
                  if (selectedClassId) {
                    setSelectedDate(text);
                  } else {
                    setNewDate(text);
                  }
                }}
              />

              {/* Sélection de la classe */}
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>Classe *</Text>
              {classes.length === 0 ? (
                <Text style={{ color: colors.text.secondary, textAlign: 'center', marginBottom: 15 }}>
                  Aucune classe disponible. Veuillez d'abord créer des classes.
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {classes.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.classChip,
                          { borderColor: colors.border },
                          (selectedClassId === c.id || (!selectedClassId && newDate)) && {
                            backgroundColor: colors.primary + '20',
                            borderColor: colors.primary
                          }
                        ]}
                        onPress={() => {
                          if (newDate) {
                            loadClassForAttendance(c.id, newDate);
                          } else {
                            setSelectedClassId(c.id);
                          }
                        }}
                      >
                        <Text style={{
                          color: selectedClassId === c.id ? colors.primary : colors.text.primary,
                          fontWeight: selectedClassId === c.id ? 'bold' : 'normal'
                        }}>
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* Liste des élèves pour enregistrement */}
              {selectedClassId && (
                <>
                  <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                    Élèves de la classe ({Object.keys(attendanceRecords).length})
                  </Text>

                  {students.filter(s => s.class_id === selectedClassId).length === 0 ? (
                    <Text style={{ color: colors.text.secondary, textAlign: 'center', marginBottom: 15 }}>
                      Aucun élève dans cette classe.
                    </Text>
                  ) : (
                    students
                      .filter(s => s.class_id === selectedClassId)
                      .map(student => (
                        <View key={student.id} style={[styles.studentRow, { borderBottomColor: colors.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.studentName, { color: colors.text.primary }]}>{student.full_name}</Text>
                          </View>

                          <View style={styles.statusButtons}>
                            {attendanceStatuses.map(status => (
                              <TouchableOpacity
                                key={status.value}
                                style={[
                                  styles.statusButton,
                                  attendanceRecords[student.id] === status.value && {
                                    backgroundColor: status.color,
                                    borderColor: status.color
                                  }
                                ]}
                                onPress={() => {
                                  setAttendanceRecords(prev => ({
                                    ...prev,
                                    [student.id]: status.value
                                  }));
                                }}
                              >
                                <Text style={{
                                  color: attendanceRecords[student.id] === status.value ? '#fff' : status.color,
                                  fontSize: 12,
                                  fontWeight: 'bold'
                                }}>
                                  {status.label.charAt(0)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      ))
                  )}
                </>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: colors.border }]}
                onPress={() => { resetAttendanceForm(); setShowRecordAttendance(false); }}
              >
                <Text style={{ color: colors.text.primary }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleRecordAttendance}
                disabled={submitting || !selectedDate || Object.keys(attendanceRecords).length === 0}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd'
  },
  headerTitle: { fontWeight: 'bold' },
  addHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 10
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 11
  },
  statDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 10
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44
  },
  searchInput: { flex: 1, height: 44 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1
  },
  dateInput: {
    flex: 1,
    fontSize: 12,
    padding: 0
  },
  filterDropdown: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },
  attendanceCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 15,
    overflow: 'hidden'
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15
  },
  studentName: {
    fontWeight: 'bold',
    marginBottom: 4
  },
  className: {
    fontSize: 12
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  attendanceDetails: {
    padding: 15,
    borderTopWidth: 1
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 12
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalBody: {
    padding: 20
  },
  formLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8
  },
  formInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 20
  },
  classChip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 6
  },
  statusButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    gap: 10
  },
  modalButton: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1
  }
});