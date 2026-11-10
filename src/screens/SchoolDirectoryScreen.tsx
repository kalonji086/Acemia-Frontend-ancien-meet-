import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Building2, MapPin, Search } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

interface SchoolDirectoryEntry {
  id: string;
  name: string;
  type: string;
  city: string;
  country: string;
  address: string;
  website: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  source: string;
  isPartner: boolean;
  claimed: boolean;
  claimStatus?: 'pending' | 'accepted' | 'rejected';
}

export default function SchoolDirectoryScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const [location, setLocation] = useState('');
  const [searchedLocation, setSearchedLocation] = useState('');
  const [schools, setSchools] = useState<SchoolDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<SchoolDirectoryEntry | null>(null);
  const [proposalVisible, setProposalVisible] = useState(false);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [claimVisible, setClaimVisible] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSchool, setClaimSchool] = useState<SchoolDirectoryEntry | null>(null);
  const [claimForm, setClaimForm] = useState({
    fullName: '',
    role: '',
    officialEmail: '',
    phone: '',
    evidence: '',
  });
  const [proposal, setProposal] = useState({
    name: '',
    schoolType: '',
    country: '',
    city: '',
    address: '',
    phone: '',
    website: '',
  });

  const search = async () => {
    const searchTerm = location.trim();
    if (searchTerm.length < 2) {
      setError('Saisissez une ville ou une localité.');
      setSchools([]);
      return;
    }

    setLoading(true);
    setError('');
    setSearchedLocation(searchTerm);
    try {
      const response = await apiService.searchSchoolDirectory(searchTerm);
      if (!response.success) {
        setError(response.error || 'Impossible de rechercher des établissements.');
        setSchools([]);
        return;
      }
      setSchools(Array.isArray(response.data?.schools) ? response.data.schools : []);
    } catch (searchError) {
      console.error('Unable to search the school directory', searchError);
      setError('Une erreur est survenue pendant la recherche.');
      setSchools([]);
    } finally {
      setLoading(false);
    }
  };

  const openAttribution = async () => {
    try {
      await Linking.openURL('https://www.openstreetmap.org/copyright');
    } catch (linkError) {
      console.error('Unable to open OpenStreetMap attribution', linkError);
    }
  };

  const submitProposal = async () => {
    if (!proposal.name.trim() || !proposal.city.trim() || !proposal.country.trim()) {
      Alert.alert('Informations requises', 'Indiquez le nom de l’établissement, la ville et le pays.');
      return;
    }

    setProposalLoading(true);
    try {
      const response = await apiService.proposeSchoolDirectoryEntry(proposal);
      if (!response.success) {
        Alert.alert('Proposition non envoyée', response.error || 'Impossible d’envoyer la proposition.');
        return;
      }
      setProposalVisible(false);
      setProposal({ name: '', schoolType: '', country: '', city: '', address: '', phone: '', website: '' });
      Alert.alert('Proposition envoyée', response.message || 'L’équipe vérifiera les informations avant publication.');
    } catch (proposalError) {
      console.error('Unable to submit school directory proposal', proposalError);
      Alert.alert('Proposition non envoyée', 'Une erreur est survenue. Réessayez plus tard.');
    } finally {
      setProposalLoading(false);
    }
  };

  const openSchoolLink = async (url: string) => {
    const safeUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    try {
      await Linking.openURL(safeUrl);
    } catch (linkError) {
      console.error('Unable to open school link', linkError);
      Alert.alert('Lien indisponible', 'Impossible d’ouvrir ce lien sur cet appareil.');
    }
  };

  const updateProposal = (field: keyof typeof proposal, value: string) => {
    setProposal((current) => ({ ...current, [field]: value }));
  };

  const updateClaimForm = (field: keyof typeof claimForm, value: string) => {
    setClaimForm((current) => ({ ...current, [field]: value }));
  };

  const submitClaim = async () => {
    if (!claimSchool) return;
    if (Object.values(claimForm).some((value) => !value.trim())) {
      Alert.alert('Informations requises', 'Complétez tous les champs pour demander la vérification.');
      return;
    }

    setClaimLoading(true);
    try {
      const response = await apiService.submitSchoolDirectoryClaim(claimSchool.id, claimForm);
      if (!response.success) {
        Alert.alert('Demande non envoyée', response.error || 'Impossible d’envoyer la demande de réclamation.');
        return;
      }
      setClaimVisible(false);
      setSelectedSchool((current) => current ? { ...current, claimStatus: 'pending' } : current);
      setClaimForm({ fullName: '', role: '', officialEmail: '', phone: '', evidence: '' });
      Alert.alert('Demande envoyée', response.message || 'Notre équipe vérifiera votre mandat avant d’activer l’école.');
    } catch (claimError) {
      console.error('Unable to submit school directory claim', claimError);
      Alert.alert('Demande non envoyée', 'Une erreur est survenue. Réessayez plus tard.');
    } finally {
      setClaimLoading(false);
    }
  };

  const openSchoolProfile = async (school: SchoolDirectoryEntry) => {
    setSelectedSchool(school);
    if (school.isPartner || school.claimed) return;
    const response = await apiService.getSchoolDirectoryClaimStatus(school.id);
    if (response.success && response.data?.status) {
      setSelectedSchool((current) => current?.id === school.id
        ? { ...current, claimStatus: response.data.status }
        : current);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text.primary, fontSize: normalize(18) }]}>Écoles du monde</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary, fontSize: normalize(12) }]}>Répertoire OpenStreetMap</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.intro, { color: colors.text.secondary, fontSize: normalize(14) }]}>
          Recherchez les établissements répertoriés dans un rayon d’environ 12 km autour d’une ville ou d’une localité.
        </Text>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.navigate('SchoolAdmissions', { mode: 'mine' })}
          style={[styles.proposeButton, { borderColor: colors.primary }]}
        >
          <Building2 size={18} color={colors.primary} />
          <Text style={[styles.proposeButtonText, { color: colors.primary }]}>Mes candidatures et notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => {
            setProposal((current) => ({
              ...current,
              city: current.city || searchedLocation
            }));
            setProposalVisible(true);
          }}
          style={[styles.proposeButton, { borderColor: colors.primary }]}
        >
          <Building2 size={18} color={colors.primary} />
          <Text style={[styles.proposeButtonText, { color: colors.primary }]}>École absente ? Proposer un établissement</Text>
        </TouchableOpacity>

        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MapPin size={20} color={colors.text.disabled} />
          <TextInput
            accessibilityLabel="Ville ou localité"
            style={[styles.input, { color: colors.text.primary, fontSize: normalize(15) }]}
            placeholder="Ex. Kinshasa, Paris, Londres"
            placeholderTextColor={colors.text.disabled}
            value={location}
            onChangeText={setLocation}
            onSubmitEditing={search}
            returnKeyType="search"
            autoCorrect={false}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Rechercher les écoles"
            onPress={search}
            disabled={loading}
            style={[styles.searchButton, { backgroundColor: colors.primary }]}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Search size={20} color="#fff" />}
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.stateText, { color: colors.text.secondary }]}>Recherche des établissements…</Text>
          </View>
        )}

        {!loading && !!error && (
          <View style={[styles.messageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.stateText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        {!loading && !error && searchedLocation.length > 0 && schools.length === 0 && (
          <View style={[styles.messageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Building2 size={26} color={colors.text.disabled} />
            <Text style={[styles.stateText, { color: colors.text.secondary }]}>
              Aucun établissement OpenStreetMap trouvé près de « {searchedLocation} ». La couverture dépend des données disponibles dans cette région.
            </Text>
          </View>
        )}

        {!loading && schools.length > 0 && (
          <>
            <Text style={[styles.resultCount, { color: colors.text.secondary, fontSize: normalize(13) }]}>
              {schools.length} établissement{schools.length > 1 ? 's' : ''} trouvé{schools.length > 1 ? 's' : ''} près de {searchedLocation}
            </Text>
            {schools.map((school) => (
              <TouchableOpacity
                key={school.id}
                accessibilityRole="button"
                accessibilityLabel={`Voir la fiche de ${school.name}`}
                onPress={() => void openSchoolProfile(school)}
                style={[styles.schoolCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.schoolIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Building2 size={22} color={colors.primary} />
                </View>
                <View style={styles.schoolDetails}>
                  <Text style={[styles.schoolName, { color: colors.text.primary, fontSize: normalize(15) }]}>{school.name}</Text>
                  <Text style={[styles.schoolType, { color: colors.primary }]}>{school.type}</Text>
                  {!!(school.city || school.country) && (
                    <Text style={[styles.schoolMeta, { color: colors.text.secondary }]}>
                      {[school.city, school.country].filter(Boolean).join(', ')}
                    </Text>
                  )}
                  {!!school.address && (
                    <Text style={[styles.schoolMeta, { color: colors.text.secondary }]}>{school.address}</Text>
                  )}
                  {!!school.phone && (
                    <Text style={[styles.schoolMeta, { color: colors.text.secondary }]}>Tél. : {school.phone}</Text>
                  )}
                  {!!school.website && (
                    <Text style={[styles.schoolMeta, { color: colors.text.secondary }]} numberOfLines={1}>Site : {school.website}</Text>
                  )}
                  <Text style={[styles.schoolMeta, { color: colors.text.disabled }]}>Fiche issue d’OpenStreetMap</Text>
                  <Text style={[styles.schoolMeta, { color: school.isPartner ? '#2E7D32' : colors.text.secondary }]}>
                    {school.isPartner ? 'Établissement partenaire' : 'Établissement non partenaire'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <TouchableOpacity
          accessibilityRole="link"
          onPress={openAttribution}
          style={styles.attribution}
        >
          <Text style={[styles.attributionText, { color: colors.text.secondary }]}>© OpenStreetMap contributors</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={!!selectedSchool} animationType="slide" transparent onRequestClose={() => setSelectedSchool(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeading}>
                <View style={[styles.schoolIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Building2 size={22} color={colors.primary} />
                </View>
                <View style={styles.schoolDetails}>
                  <Text style={[styles.schoolName, { color: colors.text.primary, fontSize: normalize(18) }]}>{selectedSchool?.name}</Text>
                  <Text style={[styles.schoolType, { color: colors.primary }]}>{selectedSchool?.type}</Text>
                </View>
              </View>
              <Text style={[styles.profileStatus, { color: selectedSchool?.isPartner ? '#2E7D32' : colors.text.secondary }]}>
                {selectedSchool?.isPartner
                  ? (selectedSchool.claimed ? 'École partenaire vérifiée' : 'École partenaire')
                  : 'Profil public — école non partenaire'}
              </Text>
              {!!(selectedSchool?.city || selectedSchool?.country) && (
                <Text style={[styles.profileDetail, { color: colors.text.primary }]}>
                  {[selectedSchool.city, selectedSchool.country].filter(Boolean).join(', ')}
                </Text>
              )}
              {!!selectedSchool?.address && <Text style={[styles.profileDetail, { color: colors.text.secondary }]}>{selectedSchool.address}</Text>}
              {!!selectedSchool?.phone && <Text style={[styles.profileDetail, { color: colors.text.secondary }]}>Téléphone : {selectedSchool.phone}</Text>}
              {!!selectedSchool?.website && (
                <TouchableOpacity onPress={() => void openSchoolLink(selectedSchool.website!)}>
                  <Text style={[styles.profileLink, { color: colors.primary }]}>{selectedSchool.website}</Text>
                </TouchableOpacity>
              )}
              {selectedSchool && !selectedSchool.id.startsWith('local/') && (
                <TouchableOpacity
                  onPress={() => void openSchoolLink(`https://www.openstreetmap.org/${selectedSchool.id}`)}
                  style={[styles.profileAction, { borderColor: colors.border }]}
                >
                  <MapPin size={17} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>Voir sur OpenStreetMap</Text>
                </TouchableOpacity>
              )}
              {selectedSchool?.claimStatus === 'pending' && (
                <Text style={[styles.profileStatus, { color: '#B26A00' }]}>Votre demande de réclamation est en cours de vérification.</Text>
              )}
              {selectedSchool?.claimStatus === 'rejected' && (
                <Text style={[styles.profileStatus, { color: colors.danger }]}>Votre précédente demande a été refusée. Vous pouvez en soumettre une nouvelle.</Text>
              )}
              {selectedSchool?.claimStatus === 'accepted' && (
                <Text style={[styles.profileStatus, { color: '#2E7D32' }]}>Votre demande a été approuvée. Accédez à votre espace depuis le tableau de bord École.</Text>
              )}
              {selectedSchool && !selectedSchool.isPartner && !selectedSchool.claimed
                && selectedSchool.claimStatus !== 'pending' && selectedSchool.claimStatus !== 'accepted' && (
                <TouchableOpacity
                  onPress={() => {
                    setClaimSchool(selectedSchool);
                    setClaimVisible(true);
                  }}
                  style={[styles.claimButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.closeButtonText}>Réclamer cette école</Text>
                </TouchableOpacity>
              )}
              {selectedSchool?.isPartner && selectedSchool.claimed && (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => {
                    const school = selectedSchool;
                    setSelectedSchool(null);
                    navigation.navigate('SchoolAdmissions', { mode: 'apply', school });
                  }}
                  style={[styles.claimButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.closeButtonText}>Déposer une candidature</Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.profileFootnote, { color: colors.text.disabled }]}>
                Les informations proviennent d’OpenStreetMap et peuvent être incomplètes ou non vérifiées.
              </Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setSelectedSchool(null)} style={[styles.closeButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={claimVisible} animationType="slide" transparent onRequestClose={() => setClaimVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text.primary, fontSize: normalize(19) }]}>Réclamer cette école</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              {claimSchool?.name}. L’équipe vérifiera votre identité et votre mandat avant d’activer l’espace partenaire.
              Ne saisissez pas de mot de passe ni de document confidentiel dans ce formulaire.
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.proposalFields}>
              {([
                ['fullName', 'Nom complet *'],
                ['role', 'Fonction dans l’établissement *'],
                ['officialEmail', 'E-mail professionnel *'],
                ['phone', 'Téléphone professionnel *'],
              ] as const).map(([field, label]) => (
                <TextInput
                  key={field}
                  accessibilityLabel={label}
                  style={[styles.proposalInput, { color: colors.text.primary, backgroundColor: colors.background, borderColor: colors.border }]}
                  placeholder={label}
                  placeholderTextColor={colors.text.disabled}
                  value={claimForm[field]}
                  onChangeText={(value) => updateClaimForm(field, value)}
                  autoCapitalize={field === 'officialEmail' ? 'none' : 'sentences'}
                  keyboardType={field === 'officialEmail' ? 'email-address' : field === 'phone' ? 'phone-pad' : 'default'}
                />
              ))}
              <TextInput
                accessibilityLabel="Comment vérifier votre mandat"
                style={[styles.proposalInput, styles.multilineInput, { color: colors.text.primary, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="Expliquez comment l’équipe peut vérifier votre mandat (site officiel, standard, fonction…) *"
                placeholderTextColor={colors.text.disabled}
                value={claimForm.evidence}
                onChangeText={(value) => updateClaimForm('evidence', value)}
                multiline
                textAlignVertical="top"
                maxLength={1200}
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity disabled={claimLoading} onPress={() => setClaimVisible(false)} style={[styles.cancelButton, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text.primary, fontWeight: '700' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={claimLoading} onPress={() => void submitClaim()} style={[styles.closeButton, { backgroundColor: colors.primary, flex: 1 }]}>
                {claimLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.closeButtonText}>Envoyer pour vérification</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={proposalVisible} animationType="slide" transparent onRequestClose={() => setProposalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text.primary, fontSize: normalize(19) }]}>Proposer une école</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              La proposition sera vérifiée par notre équipe avant d’apparaître dans le répertoire.
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.proposalFields}>
              {([
                ['name', 'Nom de l’établissement *'],
                ['schoolType', 'Type d’établissement'],
                ['city', 'Ville *'],
                ['country', 'Pays *'],
                ['address', 'Adresse'],
                ['phone', 'Téléphone'],
                ['website', 'Site web (https://…)'],
              ] as const).map(([field, label]) => (
                <TextInput
                  key={field}
                  accessibilityLabel={label}
                  style={[styles.proposalInput, { color: colors.text.primary, backgroundColor: colors.background, borderColor: colors.border }]}
                  placeholder={label}
                  placeholderTextColor={colors.text.disabled}
                  value={proposal[field]}
                  onChangeText={(value) => updateProposal(field, value)}
                  autoCapitalize={field === 'website' ? 'none' : 'sentences'}
                  keyboardType={field === 'phone' ? 'phone-pad' : field === 'website' ? 'url' : 'default'}
                />
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity disabled={proposalLoading} onPress={() => setProposalVisible(false)} style={[styles.cancelButton, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text.primary, fontWeight: '700' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={proposalLoading} onPress={() => void submitProposal()} style={[styles.closeButton, { backgroundColor: colors.primary, flex: 1 }]}>
                {proposalLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.closeButtonText}>Envoyer</Text>}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerText: { marginLeft: 10, flex: 1 },
  title: { fontWeight: '800' },
  subtitle: { marginTop: 2 },
  content: { padding: 18, width: '100%', maxWidth: 850, alignSelf: 'center' },
  intro: { lineHeight: 21, marginBottom: 16 },
  searchBox: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingLeft: 14, paddingRight: 6 },
  input: { flex: 1, minWidth: 0, height: 54, marginHorizontal: 10 },
  searchButton: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stateContainer: { alignItems: 'center', paddingVertical: 34, gap: 12 },
  stateText: { lineHeight: 21, textAlign: 'center' },
  messageCard: { alignItems: 'center', borderWidth: 1, borderRadius: 16, marginTop: 20, padding: 20, gap: 12 },
  resultCount: { fontWeight: '700', marginTop: 24, marginBottom: 10 },
  schoolCard: { flexDirection: 'row', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10, gap: 12 },
  schoolIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  schoolDetails: { flex: 1, minWidth: 0 },
  schoolName: { fontWeight: '800', lineHeight: 21 },
  schoolType: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  schoolMeta: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  proposeButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 14, marginBottom: 14 },
  proposeButtonText: { fontWeight: '700', fontSize: 13, textAlign: 'center', flexShrink: 1 },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', padding: 18 },
  modalCard: { width: '100%', maxWidth: 560, maxHeight: '90%', borderRadius: 20, padding: 20 },
  modalHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  profileStatus: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  profileDetail: { fontSize: 14, lineHeight: 21, marginBottom: 7 },
  profileLink: { fontSize: 14, lineHeight: 21, marginBottom: 8, textDecorationLine: 'underline' },
  profileAction: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 12, marginTop: 8 },
  profileFootnote: { fontSize: 12, lineHeight: 18, marginTop: 16 },
  closeButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginTop: 14, paddingHorizontal: 14 },
  closeButtonText: { color: '#fff', fontWeight: '800' },
  proposalFields: { gap: 10, paddingVertical: 14 },
  proposalInput: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 14 },
  multilineInput: { minHeight: 100, paddingTop: 12 },
  claimButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginTop: 14 },
  modalActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  cancelButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 18 },
  attribution: { alignSelf: 'center', marginTop: 22, padding: 10 },
  attributionText: { fontSize: 12, textDecorationLine: 'underline' },
});
