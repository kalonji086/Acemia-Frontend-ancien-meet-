import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, FlatList, Alert, Dimensions, Modal } from 'react-native';
import { GraduationCap, Users, BookOpen, CreditCard, MessageSquare, Plus, ChevronRight, CheckCircle, Clock, Star, ShieldCheck, Building2, ArrowRight, X, Send, UserPlus, Menu } from 'lucide-react-native';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import { useTheme } from '../context/ThemeContext';
import SchoolSideMenu from '../components/SchoolSideMenu';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const tabs = ['Répertoire', 'Mon Dashboard'];

export default function SchoolScreen({ navigation }: any) {
  const { colors, normalize, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('Répertoire');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);

  // Modals state
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({ fullName: '', email: '', role: 'teacher' as 'teacher' | 'director' });
  const [sendingStaff, setSendingStaff] = useState(false);
  const [showEnrollChildModal, setShowEnrollChildModal] = useState(false);
  const [enrollChildForm, setEnrollChildForm] = useState({ firstName: '', lastName: '', age: '', gradeLevel: '' });
  const [showSideMenu, setShowSideMenu] = useState(false);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiService.getSchoolOverview();
      if (res.success) {
        setOverview(res.data);
        setSchools(res.data.worldSchools || []);

        if (res.data.mySchool) {
          await fetchDashboard(res.data.mySchool.id);
        }
      } else {
        console.error('API Error:', res.error);
      }
    } catch (e) {
      console.error('Error loading school data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async (schoolId: string) => {
    try {
      const res = await apiService.getSchoolDashboard(schoolId);
      if (res.success) setDashboard(res.data);
    } catch (e) { console.error('Error loading school dashboard:', e); }
  };

  useEffect(() => {
    loadData();

    const onNewGrade = (data: any) => {
      Alert.alert('Nouvelle Note !', `Vous avez reçu une note en ${data.subject}: ${data.score}/20`);
      if (overview?.mySchool) fetchDashboard(overview.mySchool.id);
    };

    const onSchoolApproved = (data: any) => {
      Alert.alert('Félicitations !', `Votre établissement "${data.schoolName}" a été approuvé par l'administration.`);
      loadData(false); // Reload with spinner to show transition
      setActiveTab('Mon Dashboard');
    };

    const onNewSchoolActive = (data: any) => {
      setSchools(prev => {
        if (prev.some(s => s.id === data.id)) return prev;
        return [data, ...prev];
      });
    };

    socketService.on('school:new_grade', onNewGrade);
    socketService.on('school:approved', onSchoolApproved);
    socketService.on('school:new_active', onNewSchoolActive);

    return () => {
      socketService.off('school:new_grade', onNewGrade);
      socketService.off('school:approved', onSchoolApproved);
      socketService.off('school:new_active', onNewSchoolActive);
    };
  }, []);

  const handleRoleSelection = (role: 'promoter' | 'parent' | 'student') => {
    if (role === 'promoter') {
      if (overview?.mySchool) {
        setActiveTab('Mon Dashboard');
      } else {
        navigation.navigate('SchoolRegistration');
      }
    } else {
      setActiveTab('Mon Dashboard');
    }
  };

  const renderPendingUI = () => (
    <View style={styles.centered}>
      <Clock size={normalize(80)} color={colors.primary} />
      <Text style={[styles.dashTitle, { color: colors.text.primary, marginTop: 20, textAlign: 'center' }]}>Examen en cours</Text>
      <Text style={[styles.subtitle, { color: colors.text.secondary, marginTop: 10, textAlign: 'center', paddingHorizontal: 30 }]}>
        Votre demande pour l'établissement "{overview.mySchool.name}" est en cours d'examen par notre équipe.
        Dès qu'elle sera approuvée, vous pourrez gérer tout votre établissement ici.
      </Text>
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: 30, width: '80%' }]}
        onPress={() => setActiveTab('Répertoire')}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>RETOUR AU RÉPERTOIRE</Text>
      </TouchableOpacity>
    </View>
  );

  const handleEnrollChild = async () => {
    if (!enrollChildForm.firstName || !enrollChildForm.lastName) return Alert.alert('Erreur', 'Le prénom et le nom sont obligatoires.');
    try {
      const res = await apiService.enrollInSchool({
        schoolId: overview.mySchool.id,
        firstName: enrollChildForm.firstName,
        lastName: enrollChildForm.lastName,
        age: parseInt(enrollChildForm.age) || 0,
        level: enrollChildForm.gradeLevel
      });
      if (res.success) {
        Alert.alert('Succès', 'Votre demande d\'inscription a été envoyée.', [{ text: 'OK', onPress: () => loadData() }]);
        setShowEnrollChildModal(false);
        setEnrollChildForm({ firstName: '', lastName: '', age: '', gradeLevel: '' });
      } else {
        Alert.alert('Erreur', res.error || 'Impossible d\'envoyer la demande.');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'envoyer la demande.');
    }
  };

  const handleStaffRequest = async () => {
    if (!staffForm.fullName || !staffForm.email) return Alert.alert('Erreur', 'Informations incomplètes.');
    setSendingStaff(true);
    try {
      const res = await apiService.requestSchoolStaff({
        schoolId: overview.mySchool.id,
        ...staffForm,
        roleRequested: staffForm.role
      });
      if (res.success) {
        Alert.alert('Envoyé', 'Votre demande de compte staff a été envoyée à l’administration.');
        setShowStaffModal(false);
        setStaffForm({ fullName: '', email: '', role: 'teacher' });
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d’envoyer la demande.');
    } finally {
      setSendingStaff(false);
    }
  };

  const renderSchoolCard = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.schoolCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => navigation.navigate('SchoolProfile', { schoolId: item.id })}
    >
      <Image source={{ uri: item.logo_url || 'https://placehold.co/100x100?text=School' }} style={styles.schoolLogo} />
      <View style={styles.schoolInfo}>
        <Text style={[styles.schoolName, { color: colors.text.primary }]}>{item.name}</Text>
        <Text style={[styles.schoolMeta, { color: colors.text.secondary }]}>{item.city}, {item.country}</Text>
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.tagText, { color: colors.primary }]}>{item.school_type || 'Privé'}</Text>
          </View>
          {item.status === 'approved' && <ShieldCheck size={14} color="#4CAF50" />}
        </View>
      </View>
      <ChevronRight size={20} color={colors.text.disabled} />
    </TouchableOpacity>
  );

  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
        <View style={styles.welcomeHeader}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primary + '15', width: normalize(80), height: normalize(80), borderRadius: normalize(40) }]}>
            <GraduationCap size={normalize(40)} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text.primary, fontSize: normalize(28) }]}>Meet School</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary, fontSize: normalize(16) }]}>
            Le portail éducatif mondial pour parents, élèves et établissements.
          </Text>
        </View>

        <View style={styles.questionContainer}>
          <Text style={[styles.questionText, { color: colors.text.primary, fontSize: normalize(18) }]}>Votre profil scolaire</Text>

          <View style={styles.roleGrid}>
            <RoleCard
              title={overview?.mySchool ? (overview.mySchool.status === 'approved' ? "Mon Dashboard" : "Demande en cours") : "Parent / Élève"}
              desc={overview?.mySchool ? "Accéder à votre espace école" : "Suivi académique et paiements"}
              icon={<Users size={24} color="#4CAF50" />}
              onPress={() => handleRoleSelection('parent')}
              colors={colors}
              normalize={normalize}
            />
            <RoleCard
              title={overview?.mySchool ? (overview.mySchool.status === 'approved' ? "Gestion École" : "Demande envoyée") : "Promoteur"}
              desc={overview?.mySchool ? "Tableau de bord de gestion" : "Gérer votre établissement"}
              icon={<Building2 size={24} color={colors.primary} />}
              onPress={() => handleRoleSelection('promoter')}
              colors={colors}
              normalize={normalize}
            />
          </View>
        </View>

        <Text style={[styles.sectionHeader, { color: colors.text.primary, marginTop: 30, marginBottom: 15 }]}>Découvrir des écoles</Text>
    </View>
  );

  const renderStudentDashboard = () => (
    <ScrollView style={styles.dashContainer}>
      <View style={styles.dashHeaderRow}>
        <Text style={[styles.dashTitle, { color: colors.text.primary }]}>Mon Espace Élève</Text>
        <TouchableOpacity onPress={() => setActiveTab('Répertoire')}><Text style={{color: colors.primary, fontWeight:'bold'}}>RETOUR</Text></TouchableOpacity>
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.infoRowSimple}>
          <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Ma Classe :</Text>
          <Text style={[styles.infoValue, { color: colors.text.primary }]}>{dashboard?.profile?.grade_level || 'Non assigné'}</Text>
        </View>
        <View style={styles.infoRowSimple}>
          <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Camarades :</Text>
          <Text style={[styles.infoValue, { color: colors.text.primary }]}>{dashboard?.profile?.classmates_count || 0} élèves</Text>
        </View>
        <View style={styles.infoRowSimple}>
          <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Enseignant :</Text>
          <Text style={[styles.infoValue, { color: colors.text.primary }]}>{dashboard?.assignments?.[0]?.teacher_name || 'À venir'}</Text>
        </View>
        <View style={styles.infoRowSimple}>
          <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Directeur :</Text>
          <Text style={[styles.infoValue, { color: colors.text.primary }]}>{dashboard?.schoolInfo?.director_name || 'Direction'}</Text>
        </View>
      </View>

      <Text style={[styles.sectionHeader, { color: colors.text.primary, marginTop: 20 }]}>Frais Scolaires</Text>
      <View style={[styles.feesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {dashboard?.fees?.length === 0 ? (
          <Text style={{ color: colors.text.disabled, fontSize: 12 }}>Aucun frais configuré.</Text>
        ) : (
          dashboard?.fees?.map((f: any, i: number) => (
            <View key={i} style={styles.feeItem}>
               <Text style={[styles.feeName, { color: colors.text.primary }]}>{f.fee_name}</Text>
               <Text style={[styles.feeAmount, { color: colors.primary }]}>{f.amount}$</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.grid}>
        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Star size={24} color="#FFD700" />
          <Text style={[styles.statVal, { color: colors.text.primary }]}>{dashboard?.grades?.length || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Notes</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <BookOpen size={24} color={colors.primary} />
          <Text style={[styles.statVal, { color: colors.text.primary }]}>{dashboard?.assignments?.length || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Devoirs</Text>
        </View>
      </View>

      <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>Devoirs & Exercices</Text>
      {dashboard?.assignments?.map((a: any, i: number) => (
        <View key={i} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemTitle, { color: colors.text.primary }]}>{a.title}</Text>
            <Text style={[styles.itemSub, { color: colors.text.secondary }]} numberOfLines={1}>{a.description}</Text>
          </View>
          <TouchableOpacity
            style={[styles.smallActionBtn, { backgroundColor: colors.primary }]}
            onPress={() => Alert.alert('Travail', 'Interface de soumission de travail à venir.')}
          >
            <Text style={styles.smallActionText}>RÉPONDRE</Text>
          </TouchableOpacity>
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderParentDashboard = () => (
    <ScrollView style={styles.dashContainer}>
      <View style={styles.dashHeaderRow}>
        <Text style={[styles.dashTitle, { color: colors.text.primary }]}>Espace Parent</Text>
        <TouchableOpacity onPress={() => setActiveTab('Répertoire')}><Text style={{color: colors.primary, fontWeight:'bold'}}>RETOUR</Text></TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => setShowEnrollChildModal(true)}>
        <Plus size={20} color="#fff" />
        <Text style={styles.actionBtnText}>Inscrire un enfant</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>Mes Enfants</Text>
      {dashboard?.children?.map((c: any, i: number) => (
        <TouchableOpacity key={i} style={[styles.childCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Users size={24} color={colors.text.secondary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.childName, { color: colors.text.primary }]}>{c.first_name} {c.last_name}</Text>
            <Text style={[styles.childClass, { color: colors.text.secondary }]}>{c.grade_level}</Text>
          </View>
          <ChevronRight size={20} color={colors.text.disabled} />
        </TouchableOpacity>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderTeacherDashboard = () => (
    <ScrollView style={styles.dashContainer}>
      <View style={styles.dashHeaderRow}>
        <Text style={[styles.dashTitle, { color: colors.text.primary }]}>Mon Espace Enseignant</Text>
        <TouchableOpacity onPress={() => setActiveTab('Répertoire')}><Text style={{color: colors.primary, fontWeight:'bold'}}>RETOUR</Text></TouchableOpacity>
      </View>

      <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>Ma Classe ({dashboard?.students?.length || 0} élèves)</Text>
      {dashboard?.students?.map((s: any, i: number) => (
        <View key={i} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.avatarMini, { backgroundColor: colors.primary + '20' }]}>
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{s.first_name[0]}</Text>
            </View>
            <View style={{ marginLeft: 10 }}>
               <Text style={[styles.itemTitle, { color: colors.text.primary }]}>{s.first_name} {s.last_name}</Text>
               {s.is_new && (
                 <View style={styles.newBadge}><Text style={styles.newBadgeText}>NOUVEAU</Text></View>
               )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={() => Alert.alert('Note', 'Attribuer une note à ' + s.first_name)}><Star size={20} color={colors.text.disabled} /></TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Message', 'Écrire à ' + s.first_name)}><MessageSquare size={20} color={colors.primary} /></TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: 20 }]}>
        <Plus size={20} color="#fff" />
        <Text style={styles.actionBtnText}>Envoyer un devoir à la classe</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderAdminDashboards = () => (
    <ScrollView style={styles.dashContainer}>
       <View style={styles.dashHeaderRow}>
         <Text style={[styles.dashTitle, { color: colors.text.primary }]}>
           Dashboard {overview?.role === 'promoter' ? 'Promoteur' : 'Directeur'}
         </Text>
         <TouchableOpacity onPress={() => setActiveTab('Répertoire')}><Text style={{color: colors.primary, fontWeight:'bold'}}>RETOUR</Text></TouchableOpacity>
       </View>

       <View style={styles.grid}>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Users size={24} color="#2196F3" />
            <Text style={[styles.statVal, { color: colors.text.primary }]}>{dashboard?.stats?.totalStudents || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Élèves</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <CreditCard size={24} color="#4CAF50" />
            <Text style={[styles.statVal, { color: colors.text.primary }]}>{dashboard?.stats?.revenue || 0}$</Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Revenus</Text>
          </View>
       </View>

       <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>Derniers Élèves Inscrits</Text>
       {dashboard?.students?.slice(0, 5).map((s: any, i: number) => (
         <View key={i} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.itemTitle, { color: colors.text.primary }]}>{s.first_name} {s.last_name}</Text>
              <Text style={[styles.itemSub, { color: colors.text.secondary }]}>{s.grade_level}</Text>
            </View>
            {s.is_new && <View style={styles.newBadge}><Text style={styles.newBadgeText}>NOUVEAU</Text></View>}
         </View>
       ))}

       <View style={[styles.adminActions, { marginTop: 30 }]}>
          <AdminActionItem
            icon={<UserPlus />}
            label="Gérer Inscriptions"
            onPress={() => navigation.navigate('SchoolEnrollmentRequests', { schoolId: overview.mySchool.id })}
            colors={colors}
          />
          <AdminActionItem icon={<Users />} label="Demander compte Staff" onPress={() => setShowStaffModal(true)} colors={colors} />
          <AdminActionItem icon={<GraduationCap />} label="Gérer Classes" colors={colors} />
          <AdminActionItem icon={<MessageSquare />} label="Annonces École" colors={colors} />
       </View>
    </ScrollView>
  );

  const renderCurrentTab = () => {
    if (loading) {
       return (
         <View style={styles.centered}>
           <ActivityIndicator size="large" color={colors.primary} />
           <Text style={{ marginTop: 20, color: colors.text.secondary, fontWeight: 'bold' }}>Synchronisation Meet School...</Text>
         </View>
       );
    }

    if (activeTab === 'Répertoire') {
      return (
        <FlatList
          data={schools}
          renderItem={renderSchoolCard}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={renderWelcome}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Building2 size={60} color={colors.text.disabled} />
              <Text style={{ marginTop: 20, color: colors.text.secondary, textAlign: 'center' }}>Aucune école répertoriée pour le moment.</Text>
            </View>
          }
        />
      );
    }

    if (activeTab === 'Mon Dashboard') {
      if (!overview?.mySchool) return (
        <View style={styles.centered}>
           <GraduationCap size={60} color={colors.text.disabled} />
           <Text style={{ color: colors.text.secondary, marginTop: 20, textAlign: 'center' }}>Vous n'êtes membre d'aucune école.</Text>
           <TouchableOpacity onPress={() => setActiveTab('Répertoire')} style={{ marginTop: 20 }}><Text style={{ color: colors.primary, fontWeight: 'bold' }}>RETOUR</Text></TouchableOpacity>
        </View>
      );

      // Si c'est un promoteur et que son école est en attente
      if (overview.role === 'promoter' && overview.mySchool.status === 'pending') {
        return renderPendingUI();
      }

      switch (overview.role) {
        case 'student': return renderStudentDashboard();
        case 'parent': return renderParentDashboard();
        case 'teacher': return renderTeacherDashboard();
        case 'director':
        case 'promoter': return renderAdminDashboards();
        default: return <View style={styles.centered}><Text style={{ color: colors.text.primary }}>Accès limité.</Text></View>;
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Menu Button */}
      <View style={[styles.topHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => setShowSideMenu(true)} style={styles.menuBtn}>
          <Menu size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Meet School</Text>
        <View style={{ width: 40 }} />
      </View>

      {renderCurrentTab()}

      {/* Side Menu */}
      <Modal visible={showSideMenu} transparent animationType="slide">
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} 
            onPress={() => setShowSideMenu(false)}
            activeOpacity={1}
          />
          <View style={{ width: 300 }}>
            <SchoolSideMenu
              navigation={navigation}
              currentScreen="School"
              schoolName={overview?.mySchool?.name}
              userRole={overview?.role}
              onClose={() => setShowSideMenu(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Staff Request */}
      <Modal visible={showStaffModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Demande de compte Staff</Text>
              <TouchableOpacity onPress={() => setShowStaffModal(false)}><X size={24} color={colors.text.secondary} /></TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: colors.text.secondary }]}>Demandez à l'administrateur principal Meet Me de créer un compte pour un enseignant ou préfet de votre école.</Text>

            <TextInput placeholder="Nom complet de la personne" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} value={staffForm.fullName} onChangeText={v => setStaffForm({...staffForm, fullName: v})} placeholderTextColor={colors.text.disabled} />
            <TextInput placeholder="Adresse Email (Meet Me)" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} value={staffForm.email} onChangeText={v => setStaffForm({...staffForm, email: v})} placeholderTextColor={colors.text.disabled} keyboardType="email-address" />

            <View style={styles.roleSelectRow}>
              {['teacher', 'director'].map(r => (
                <TouchableOpacity key={r} onPress={() => setStaffForm({...staffForm, role: r as any})} style={[styles.roleOption, { borderColor: colors.border }, staffForm.role === r && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                   <Text style={[styles.roleOptionText, { color: staffForm.role === r ? '#fff' : colors.text.secondary }]}>{r === 'teacher' ? 'Enseignant' : 'Directeur'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleStaffRequest}
              disabled={sendingStaff}
              style={[styles.confirmBtn, { backgroundColor: colors.primary, marginTop: 20 }]}
            >
              {sendingStaff ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Send size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 10 }}>ENVOYER LA DEMANDE</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Inscription Enfant */}
      <Modal visible={showEnrollChildModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Inscrire un enfant</Text>
              <TouchableOpacity onPress={() => setShowEnrollChildModal(false)}><X size={24} color={colors.text.secondary} /></TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: colors.text.secondary }]}>Remplissez les informations de l'enfant à inscrire.</Text>
            <TextInput placeholder="Prénom" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} value={enrollChildForm.firstName} onChangeText={v => setEnrollChildForm({...enrollChildForm, firstName: v})} placeholderTextColor={colors.text.disabled} />
            <TextInput placeholder="Nom" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} value={enrollChildForm.lastName} onChangeText={v => setEnrollChildForm({...enrollChildForm, lastName: v})} placeholderTextColor={colors.text.disabled} />
            <TextInput placeholder="Âge" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} value={enrollChildForm.age} onChangeText={v => setEnrollChildForm({...enrollChildForm, age: v})} placeholderTextColor={colors.text.disabled} keyboardType="numeric" />
            <TextInput placeholder="Classe souhaitée" style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} value={enrollChildForm.gradeLevel} onChangeText={v => setEnrollChildForm({...enrollChildForm, gradeLevel: v})} placeholderTextColor={colors.text.disabled} />
            <TouchableOpacity
              onPress={handleEnrollChild}
              style={[styles.confirmBtn, { backgroundColor: colors.primary, marginTop: 10 }]}
            >
              <Send size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 10 }}>ENVOYER LA DEMANDE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const RoleCard = ({ title, desc, icon, onPress, colors, normalize }: any) => (
  <TouchableOpacity
    style={[styles.roleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    onPress={onPress}
  >
    <View style={styles.roleIcon}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.roleTitle, { color: colors.text.primary }]}>{title}</Text>
      <Text style={[styles.roleDesc, { color: colors.text.secondary }]}>{desc}</Text>
    </View>
    <ArrowRight size={18} color={colors.text.disabled} />
  </TouchableOpacity>
);

const AdminActionItem = ({ icon, label, onPress, colors }: any) => (
  <TouchableOpacity onPress={onPress} style={[styles.adminAction, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    {React.cloneElement(icon, { color: colors.primary, size: 24 })}
    <Text style={[styles.adminActionLabel, { color: colors.text.primary }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15 },
  menuBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  welcomeContainer: { padding: 20, paddingTop: 20 },
  welcomeHeader: { alignItems: 'center', marginBottom: 40 },
  iconBadge: { justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
  questionContainer: { width: '100%' },
  questionText: { fontWeight: '700', marginBottom: 20 },
  roleGrid: { gap: 12 },
  roleCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, borderWidth: 1 },
  roleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  roleTitle: { fontWeight: 'bold', fontSize: 16 },
  roleDesc: { fontSize: 12, marginTop: 2 },
  schoolCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, marginBottom: 15, borderWidth: 1, marginHorizontal: 20 },
  schoolLogo: { width: 60, height: 60, borderRadius: 15 },
  schoolInfo: { flex: 1, marginLeft: 15 },
  schoolName: { fontWeight: 'bold', fontSize: 16 },
  schoolMeta: { fontSize: 12, marginTop: 2 },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
  tagText: { fontSize: 10, fontWeight: 'bold' },
  dashContainer: { padding: 20, paddingTop: 60 },
  dashHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  dashTitle: { fontSize: 22, fontWeight: '900' },
  infoCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 25 },
  infoRowSimple: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  infoLabel: { fontSize: 12, fontWeight: '600' },
  infoValue: { fontWeight: 'bold', fontSize: 13 },
  feesCard: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 25 },
  feeItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  feeName: { fontWeight: '600', fontSize: 13 },
  feeAmount: { fontWeight: '900' },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statBox: { width: '48%', padding: 20, borderRadius: 24, borderWidth: 1, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '900', marginTop: 10 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5 },
  itemTitle: { fontWeight: 'bold' },
  itemSub: { fontSize: 11, marginTop: 2 },
  scoreText: { fontSize: 18, fontWeight: '900' },
  smallActionBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  smallActionText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, justifyContent: 'center', marginBottom: 25 },
  actionBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 10 },
  avatarMini: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  newBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, alignSelf: 'flex-start' },
  newBadgeText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  childCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  childName: { fontWeight: 'bold' },
  childClass: { fontSize: 12 },
  adminActions: { gap: 12 },
  adminAction: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, borderWidth: 1 },
  adminActionLabel: { fontWeight: 'bold', marginLeft: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  input: { padding: 18, borderRadius: 18, borderWidth: 1, marginBottom: 15, fontSize: 16 },
  confirmBtn: { flexDirection: 'row', padding: 18, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 30, borderRadius: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalSub: { fontSize: 12, marginBottom: 25, lineHeight: 18 },
  roleSelectRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  roleOption: { flex: 1, padding: 15, borderRadius: 15, borderWidth: 1, alignItems: 'center' },
  roleOptionText: { fontWeight: 'bold', fontSize: 13 }
});