import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  ScrollView,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, BookOpen, Filter, Search, Edit, Trash2, FileText, Check, X, BarChart3, Download } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function SchoolGradesScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState('');

  // États pour les modales
  const [showAddEvaluation, setShowAddEvaluation] = useState(false);
  const [showAddGrades, setShowAddGrades] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);
  const [studentsForGrades, setStudentsForGrades] = useState<any[]>([]);

  // Form states pour nouvelle évaluation
  const [evaluationTitle, setEvaluationTitle] = useState('');
  const [evaluationType, setEvaluationType] = useState('interrogation');
  const [evaluationClassId, setEvaluationClassId] = useState('');
  const [evaluationSubjectId, setEvaluationSubjectId] = useState('');
  const [evaluationMaxScore, setEvaluationMaxScore] = useState('20');
  const [evaluationDate, setEvaluationDate] = useState('');
  const [evaluationDescription, setEvaluationDescription] = useState('');

  // Form states pour notes
  const [grades, setGrades] = useState<Record<string, { score: string; comment: string }>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [evalRes, subjRes, clsRes] = await Promise.all([
        apiService.getSchoolEvaluations(),
        apiService.getSchoolSubjects(),
        apiService.getSchoolClasses()
      ]);

      if (evalRes.success) setEvaluations(evalRes.data || []);
      if (subjRes.success) setSubjects(subjRes.data || []);
      if (clsRes.success) setClasses(clsRes.data || []);
    } catch (e) {
      console.error('Error fetching data:', e);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvaluation = async () => {
    if (!evaluationTitle.trim() || !evaluationDate) {
      Alert.alert('Attention', 'Veuillez remplir le titre et la date de l\'évaluation.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiService.addSchoolEvaluation({
        title: evaluationTitle.trim(),
        type: evaluationType,
        classId: evaluationClassId || null,
        subjectId: evaluationSubjectId || null,
        maxScore: parseFloat(evaluationMaxScore) || 20,
        evaluationDate: evaluationDate,
        description: evaluationDescription || null
      });

      if (res.success) {
        Alert.alert('Succès', 'Évaluation créée avec succès !');
        resetEvaluationForm();
        setShowAddEvaluation(false);
        fetchData();
      } else {
        Alert.alert('Erreur', res.error || 'Impossible de créer l\'évaluation.');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddGrades = async () => {
    if (!selectedEvaluation) return;

    const gradesArray = Object.entries(grades)
      .filter(([_, grade]) => grade.score.trim() !== '')
      .map(([studentId, grade]) => ({
        studentId,
        score: parseFloat(grade.score),
        comment: grade.comment || null
      }));

    if (gradesArray.length === 0) {
      Alert.alert('Attention', 'Veuillez saisir au moins une note.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiService.addSchoolEvaluationGrades(selectedEvaluation.id, { grades: gradesArray });

      if (res.success) {
        Alert.alert('Succès', 'Notes enregistrées avec succès !');
        resetGradesForm();
        setShowAddGrades(false);
        fetchData();
      } else {
        Alert.alert('Erreur', res.error || 'Impossible d\'enregistrer les notes.');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const loadStudentsForGrades = async (evaluation: any) => {
    setSelectedEvaluation(evaluation);

    try {
      // Récupérer les élèves de la classe si spécifiée
      let students = [];
      if (evaluation.class_id) {
        const studentsRes = await apiService.getSchoolStudents();
        if (studentsRes.success) {
          students = (studentsRes.data || []).filter((s: any) => s.class_id === evaluation.class_id);
        }
      } else {
        // Tous les élèves de l'école
        const studentsRes = await apiService.getSchoolStudents();
        if (studentsRes.success) {
          students = studentsRes.data || [];
        }
      }

      setStudentsForGrades(students);

      // Initialiser les grades avec les notes existantes
      const gradesRes = await apiService.getSchoolEvaluationGrades(evaluation.id);
      if (gradesRes.success) {
        const existingGrades: Record<string, { score: string; comment: string }> = {};
        gradesRes.data.forEach((grade: any) => {
          existingGrades[grade.student_id] = {
            score: grade.score.toString(),
            comment: grade.comment || ''
          };
        });
        setGrades(existingGrades);
      } else {
        // Initialiser avec des valeurs vides
        const emptyGrades: Record<string, { score: string; comment: string }> = {};
        students.forEach((student: any) => {
          emptyGrades[student.id] = { score: '', comment: '' };
        });
        setGrades(emptyGrades);
      }

      setShowAddGrades(true);
    } catch (e) {
      console.error('Error loading students:', e);
      Alert.alert('Erreur', 'Impossible de charger les élèves.');
    }
  };

  const resetEvaluationForm = () => {
    setEvaluationTitle('');
    setEvaluationType('interrogation');
    setEvaluationClassId('');
    setEvaluationSubjectId('');
    setEvaluationMaxScore('20');
    setEvaluationDate('');
    setEvaluationDescription('');
  };

  const resetGradesForm = () => {
    setSelectedEvaluation(null);
    setStudentsForGrades([]);
    setGrades({});
  };

  const filteredEvaluations = evaluations.filter(e => {
    const matchesSearch = !searchQuery ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.subject_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass = !filterClassId || e.class_id === filterClassId;
    const matchesSubject = !filterSubjectId || e.subject_id === filterSubjectId;

    return matchesSearch && matchesClass && matchesSubject;
  });

  const evaluationTypes = [
    { value: 'interrogation', label: 'Interrogation' },
    { value: 'devoir', label: 'Devoir' },
    { value: 'examen', label: 'Examen' },
    { value: 'projet', label: 'Projet' },
    { value: 'participation', label: 'Participation' }
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
          Notes & Évaluations ({filteredEvaluations.length})
        </Text>
        <TouchableOpacity
          style={[styles.addHeaderBtn, { backgroundColor: colors.primary + '15' }]}
          onPress={() => setShowAddEvaluation(true)}
        >
          <Plus size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Barre de Recherche */}
      <View style={{ paddingHorizontal: 20, paddingTop: 15 }}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.text.secondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Rechercher par titre ou matière..."
            placeholderTextColor={colors.text.disabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filtres */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
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
                  {!filterClassId && <Check size={12} color={colors.primary} />}
                </TouchableOpacity>
                {classes.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.filterOption, filterClassId === c.id && { backgroundColor: colors.primary + '20' }]}
                    onPress={() => setFilterClassId(filterClassId === c.id ? '' : c.id)}
                  >
                    <Text style={{ color: colors.text.primary, fontSize: 12 }}>{c.name}</Text>
                    {filterClassId === c.id && <Check size={12} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Filtre par matière */}
            <View style={[styles.filterDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <BookOpen size={14} color={colors.text.secondary} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Matière:</Text>
              <ScrollView style={{ maxHeight: 100 }} nestedScrollEnabled={true}>
                <TouchableOpacity
                  style={[styles.filterOption, !filterSubjectId && { backgroundColor: colors.primary + '20' }]}
                  onPress={() => setFilterSubjectId('')}
                >
                  <Text style={{ color: colors.text.primary, fontSize: 12 }}>Toutes</Text>
                  {!filterSubjectId && <Check size={12} color={colors.primary} />}
                </TouchableOpacity>
                {subjects.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.filterOption, filterSubjectId === s.id && { backgroundColor: colors.primary + '20' }]}
                    onPress={() => setFilterSubjectId(filterSubjectId === s.id ? '' : s.id)}
                  >
                    <Text style={{ color: colors.text.primary, fontSize: 12 }}>{s.name}</Text>
                    {filterSubjectId === s.id && <Check size={12} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Liste des Évaluations */}
      <FlatList
        data={filteredEvaluations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <BookOpen size={48} color={colors.text.disabled} style={{ marginBottom: 10 }} />
            <Text style={{ textAlign: 'center', color: colors.text.secondary, fontSize: 14 }}>
              {searchQuery || filterClassId || filterSubjectId
                ? 'Aucune évaluation ne correspond à votre recherche.'
                : 'Aucune évaluation créée pour le moment.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.evaluationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.evaluationHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.evaluationTitle, { color: colors.text.primary, fontSize: normalize(15) }]}>
                  {item.title}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                  {item.class_name && (
                    <View style={[styles.tag, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.tagText, { color: colors.primary }]}>{item.class_name}</Text>
                    </View>
                  )}
                  {item.subject_name && (
                    <View style={[styles.tag, { backgroundColor: '#4CAF50' + '15', marginLeft: 6 }]}>
                      <Text style={[styles.tagText, { color: '#4CAF50' }]}>{item.subject_name}</Text>
                    </View>
                  )}
                  <View style={[styles.tag, { backgroundColor: '#FF9800' + '15', marginLeft: 6 }]}>
                    <Text style={[styles.tagText, { color: '#FF9800' }]}>{item.type}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.gradeBadge, { backgroundColor: item.is_published ? '#4CAF50' + '20' : '#FF9800' + '20' }]}>
                <Text style={{ color: item.is_published ? '#4CAF50' : '#FF9800', fontSize: 11, fontWeight: 'bold' }}>
                  {item.is_published ? 'Publié' : 'Brouillon'}
                </Text>
              </View>
            </View>

            <View style={styles.evaluationDetails}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Date:</Text>
                <Text style={[styles.detailValue, { color: colors.text.primary }]}>
                  {new Date(item.evaluation_date).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Score max:</Text>
                <Text style={[styles.detailValue, { color: colors.text.primary }]}>{item.max_score}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Notes:</Text>
                <Text style={[styles.detailValue, { color: colors.text.primary }]}>{item.grades_count || 0}</Text>
              </View>
            </View>

            {item.description && (
              <Text style={[styles.evaluationDescription, { color: colors.text.secondary }]} numberOfLines={2}>
                {item.description}
              </Text>
            )}

            <View style={[styles.evaluationActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                onPress={() => loadStudentsForGrades(item)}
              >
                <Edit size={16} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                  {item.grades_count > 0 ? 'Modifier notes' : 'Ajouter notes'}
                </Text>
              </TouchableOpacity>

              {item.is_published && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#4CAF50' + '15' }]}
                  onPress={() => {
                    // Navigation vers les statistiques de l'évaluation
                    Alert.alert('Info', 'Statistiques bientôt disponibles');
                  }}
                >
                  <BarChart3 size={16} color="#4CAF50" />
                  <Text style={[styles.actionButtonText, { color: '#4CAF50' }]}>Statistiques</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />

      {/* Modal: Nouvelle Évaluation */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddEvaluation}
        onRequestClose={() => setShowAddEvaluation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxWidth: isTablet ? 500 : '90%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Nouvelle Évaluation</Text>
              <TouchableOpacity onPress={() => { resetEvaluationForm(); setShowAddEvaluation(false); }}>
                <X size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>Titre de l'évaluation *</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border }]}
                placeholder="Ex: Interrogation de Mathématiques"
                placeholderTextColor={colors.text.disabled}
                value={evaluationTitle}
                onChangeText={setEvaluationTitle}
              />

              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>Type d'évaluation</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {evaluationTypes.map(type => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeChip,
                        evaluationType === type.value && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => setEvaluationType(type.value)}
                    >
                      <Text style={{
                        color: evaluationType === type.value ? '#fff' : colors.text.primary,
                        fontSize: 12,
                        fontWeight: evaluationType === type.value ? 'bold' : 'normal'
                      }}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>Classe (optionnel)</Text>
              <ScrollView style={{ maxHeight: 120, marginBottom: 15, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }}>
                <TouchableOpacity
                  style={[styles.selectItem, !evaluationClassId && { backgroundColor: colors.primary + '20' }]}
                  onPress={() => setEvaluationClassId('')}
                >
                  <Text style={{ color: colors.text.primary }}>Toutes les classes</Text>
                  {!evaluationClassId && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
                {classes.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.selectItem, evaluationClassId === c.id && { backgroundColor: colors.primary + '20' }]}
                    onPress={() => setEvaluationClassId(c.id)}
                  >
                    <Text style={{ color: colors.text.primary }}>{c.name} ({c.level})</Text>
                    {evaluationClassId === c.id && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>Matière (optionnel)</Text>
              <ScrollView style={{ maxHeight: 120, marginBottom: 15, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }}>
                <TouchableOpacity
                  style={[styles.selectItem, !evaluationSubjectId && { backgroundColor: colors.primary + '20' }]}
                  onPress={() => setEvaluationSubjectId('')}
                >
                  <Text style={{ color: colors.text.primary }}>Toutes les matières</Text>
                  {!evaluationSubjectId && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
                {subjects.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.selectItem, evaluationSubjectId === s.id && { backgroundColor: colors.primary + '20' }]}
                    onPress={() => setEvaluationSubjectId(s.id)}
                  >
                    <Text style={{ color: colors.text.primary }}>{s.name}</Text>
                    {evaluationSubjectId === s.id && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 15 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: colors.text.secondary }]}>Score maximum</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border }]}
                    placeholder="20"
                    placeholderTextColor={colors.text.disabled}
                    value={evaluationMaxScore}
                    onChangeText={setEvaluationMaxScore}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: colors.text.secondary }]}>Date *</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.text.disabled}
                    value={evaluationDate}
                    onChangeText={setEvaluationDate}
                  />
                </View>
              </View>

              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>Description (optionnel)</Text>
              <TextInput
                style={[styles.formTextArea, { color: colors.text.primary, borderColor: colors.border }]}
                placeholder="Description détaillée de l'évaluation..."
                placeholderTextColor={colors.text.disabled}
                value={evaluationDescription}
                onChangeText={setEvaluationDescription}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: colors.border }]}
                onPress={() => { resetEvaluationForm(); setShowAddEvaluation(false); }}
              >
                <Text style={{ color: colors.text.primary }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddEvaluation}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Créer l'évaluation</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Ajouter/Modifier les Notes */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddGrades}
        onRequestClose={() => setShowAddGrades(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxWidth: isTablet ? 600 : '95%', maxHeight: '80%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                  {selectedEvaluation?.title || 'Notes'}
                </Text>
                <Text style={{ color: colors.text.secondary, fontSize: 12 }}>
                  Score maximum: {selectedEvaluation?.max_score || 20}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { resetGradesForm(); setShowAddGrades(false); }}>
                <X size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {studentsForGrades.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>
                    Aucun élève disponible pour cette évaluation.
                  </Text>
                </View>
              ) : (
                studentsForGrades.map((student) => (
                  <View key={student.id} style={[styles.gradeRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.studentName, { color: colors.text.primary }]}>{student.full_name}</Text>
                      <Text style={{ color: colors.text.secondary, fontSize: 12 }}>
                        {student.class_name || 'Non assigné'}
                      </Text>
                    </View>

                    <View style={styles.gradeInputs}>
                      <TextInput
                        style={[styles.scoreInput, {
                          color: colors.text.primary,
                          borderColor: colors.border,
                          backgroundColor: colors.background
                        }]}
                        placeholder="Score"
                        placeholderTextColor={colors.text.disabled}
                        value={grades[student.id]?.score || ''}
                        onChangeText={(text) => {
                          setGrades(prev => ({
                            ...prev,
                            [student.id]: { ...prev[student.id], score: text }
                          }));
                        }}
                        keyboardType="numeric"
                      />
                      <TextInput
                        style={[styles.commentInput, {
                          color: colors.text.primary,
                          borderColor: colors.border,
                          backgroundColor: colors.background
                        }]}
                        placeholder="Commentaire"
                        placeholderTextColor={colors.text.disabled}
                        value={grades[student.id]?.comment || ''}
                        onChangeText={(text) => {
                          setGrades(prev => ({
                            ...prev,
                            [student.id]: { ...prev[student.id], comment: text }
                          }));
                        }}
                      />
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: colors.border }]}
                onPress={() => { resetGradesForm(); setShowAddGrades(false); }}
              >
                <Text style={{ color: colors.text.primary }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddGrades}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Enregistrer les notes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44
  },
  searchInput: { flex: 1, height: 44 },
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },
  evaluationCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 15,
    overflow: 'hidden'
  },
  evaluationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 15,
    borderBottomWidth: 1
  },
  evaluationTitle: { fontWeight: 'bold' },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  tagText: { fontSize: 10, fontWeight: 'bold' },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  evaluationDetails: { padding: 15 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  detailLabel: { fontSize: 12 },
  detailValue: { fontSize: 12, fontWeight: '500' },
  evaluationDescription: {
    fontSize: 12,
    paddingHorizontal: 15,
    paddingBottom: 15
  },
  evaluationActions: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    gap: 10
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center'
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6
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
  modalBody: { padding: 20 },
  formLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6
  },
  formInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 15
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc'
  },
  selectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
    borderColor: '#eee'
  },
  formTextArea: {
    height: 80,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 15,
    textAlignVertical: 'top'
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
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  studentName: {
    fontWeight: 'bold',
    marginBottom: 4
  },
  gradeInputs: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  scoreInput: {
    width: 60,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    textAlign: 'center'
  },
  commentInput: {
    width: 120,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8
  }
});