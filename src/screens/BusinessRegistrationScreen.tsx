import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiService from '../services/api.service';
import * as ImagePicker from 'expo-image-picker';

const CATEGORIES = [
  "Menuisier",
  "Informatique",
  "Boutique",
  "Charpentier",
  "Électricien",
  "Centre de formation",
  "Maçons"
];

export default function BusinessRegistrationScreen({ navigation }: any) {
  const { colors, normalize, isDark, fontSizeFactor } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth > 768;
  const contentWidth = isTablet ? 600 : screenWidth;

  const styles = createStyles(colors, normalize, fontSizeFactor, isDark);

  // Form State
  const [formData, setFormData] = useState({
    category: '',
    businessName: '',
    shortDescription: '',
    fullDescription: '',
    logoUrl: '',
    bannerUrl: '',
    contactInfo: '',
    addressCity: '',
    addressCommune: '',
    addressProvince: '',
    addressQuarter: '',
    addressPostalCode: '',
    idCardUrl: '',
    nationalIdNumber: '',
    rccmNumber: '',
    employeeCount: '',
    capitalAmount: '',
    acceptedTerms: false,
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pickImage = async (field: 'logoUrl' | 'bannerUrl' | 'idCardUrl') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à votre galerie.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: field === 'bannerUrl' ? [16, 9] : [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadFile(result.assets[0].uri, field);
    }
  };

  const uploadFile = async (uri: string, field: string) => {
    setUploadingField(field);
    try {
      const res = await apiService.uploadFile({
        uri,
        type: 'image/jpeg',
        name: `${field}.jpg`
      }, 'image');

      if (res.success) {
        updateField(field, res.data.fileUrl);
      } else {
        Alert.alert('Erreur', 'Échec du téléchargement de l\'image');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'upload');
    } finally {
      setUploadingField(null);
    }
  };

  const handleNext = () => {
    if (step === 1 && !formData.category) {
      return Alert.alert('Info', 'Veuillez sélectionner une catégorie');
    }
    if (step === 2 && (!formData.businessName.trim() || !formData.shortDescription.trim() || !formData.addressCity.trim() || !formData.contactInfo.trim())) {
      return Alert.alert('Informations incomplètes', 'Indiquez le nom, une brève description, un moyen de contact et la ville.');
    }
    if (step === 3) {
      if (!formData.idCardUrl) return Alert.alert('Info', 'La photo de votre pièce d\'identité est requise');
      if (formData.category === 'Boutique' && (!formData.nationalIdNumber || !formData.rccmNumber)) {
        return Alert.alert('Info', 'Pour une boutique, l\'ID National et le RCCM sont obligatoires');
      }
    }
    if (step < 5) setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!formData.acceptedTerms) {
      return Alert.alert('Info', 'Veuillez accepter les conditions de Meet Me');
    }

    setLoading(true);
    try {
      const res = await apiService.registerBusiness(formData);
      if (res.success) {
        Alert.alert('Félicitations !', res.message, [
          { text: 'OK', onPress: () => navigation.replace('ChatList') }
        ]);
      } else {
        Alert.alert('Erreur', res.error || 'Une erreur est survenue');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de soumettre votre demande');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <ScrollView
      style={[styles.stepContainer, isTablet && { alignSelf: 'center', width: contentWidth }]}
      showsVerticalScrollIndicator={true}
      persistentScrollbar={true}
    >
      <Text style={[styles.stepTitle, { color: colors.text.primary, fontSize: normalize(24, fontSizeFactor) }]}>Quelle est votre catégorie ?</Text>
      <Text style={[styles.stepSubtitle, { color: colors.text.secondary, fontSize: normalize(14, fontSizeFactor) }]}>Choisissez le domaine qui correspond le mieux à votre activité.</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryCard,
              { backgroundColor: colors.surface, borderColor: formData.category === cat ? colors.primary : colors.border, width: isTablet ? '31%' : '48%' },
              formData.category === cat && { borderWidth: 2 }
            ]}
            onPress={() => updateField('category', cat)}
          >
            <Ionicons
              name={cat === 'Boutique' ? 'cart' : (cat === 'Informatique' ? 'laptop' : 'construct')}
              size={normalize(30)}
              color={formData.category === cat ? colors.primary : colors.text.secondary}
            />
            <Text style={[styles.categoryText, { color: colors.text.primary, fontWeight: formData.category === cat ? 'bold' : 'normal', fontSize: normalize(13, fontSizeFactor) }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView
      style={[styles.stepContainer, isTablet && { alignSelf: 'center', width: contentWidth }]}
      showsVerticalScrollIndicator={true}
      persistentScrollbar={true}
    >
      <Text style={[styles.stepTitle, { color: colors.text.primary, fontSize: normalize(24, fontSizeFactor) }]}>Détails du business</Text>
      <Text style={[styles.stepSubtitle, { color: colors.text.secondary, fontSize: normalize(14, fontSizeFactor) }]}>Les champs marqués d’un astérisque sont requis pour vérifier votre activité.</Text>

      <Text style={[styles.label, { fontSize: normalize(12, fontSizeFactor) }]}>Nom du business *</Text>
      <TextInput
        style={[styles.input, { color: colors.text.primary, backgroundColor: colors.surface, fontSize: normalize(16, fontSizeFactor), borderColor: colors.border, borderWidth: 1 }]}
        value={formData.businessName}
        onChangeText={v => updateField('businessName', v)}
        placeholder="Ex: Ma Super Boutique"
        placeholderTextColor={colors.text.disabled}
      />

      <Text style={[styles.label, { fontSize: normalize(12, fontSizeFactor) }]}>Brève description *</Text>
      <TextInput
        style={[styles.input, { color: colors.text.primary, backgroundColor: colors.surface, fontSize: normalize(16, fontSizeFactor), borderColor: colors.border, borderWidth: 1 }]}
        value={formData.shortDescription}
        onChangeText={v => updateField('shortDescription', v)}
        placeholder="Une phrase pour vous présenter"
        placeholderTextColor={colors.text.disabled}
      />

      <Text style={[styles.label, { fontSize: normalize(12, fontSizeFactor) }]}>Téléphone, e-mail ou WhatsApp *</Text>
      <TextInput
        style={[styles.input, { color: colors.text.primary, backgroundColor: colors.surface, fontSize: normalize(16, fontSizeFactor), borderColor: colors.border, borderWidth: 1 }]}
        value={formData.contactInfo}
        onChangeText={v => updateField('contactInfo', v)}
        placeholder="Ex : +243 000 000 000 ou contact@entreprise.cd"
        placeholderTextColor={colors.text.disabled}
        autoCapitalize="none"
      />

      <Text style={[styles.label, { fontSize: normalize(12, fontSizeFactor) }]}>Description complète</Text>
      <TextInput
        style={[styles.input, { color: colors.text.primary, backgroundColor: colors.surface, minHeight: normalize(100), fontSize: normalize(16, fontSizeFactor), borderColor: colors.border, borderWidth: 1, textAlignVertical: 'top' }]}
        value={formData.fullDescription}
        onChangeText={v => updateField('fullDescription', v)}
        placeholder="Détaillez vos services ou produits..."
        placeholderTextColor={colors.text.disabled}
        multiline
      />

      <View style={styles.mediaButtons}>
        <TouchableOpacity style={[styles.mediaBtn, { backgroundColor: colors.primary + '15' }]} onPress={() => pickImage('logoUrl')}>
          {uploadingField === 'logoUrl' ? <ActivityIndicator size="small" color={colors.primary} /> : (
            <>
              <Ionicons name="image" size={normalize(20)} color={colors.primary} />
              <Text style={{ color: colors.primary, marginLeft: 8, fontSize: normalize(14, fontSizeFactor) }}>{formData.logoUrl ? 'Logo prêt' : 'Ajouter Logo'}</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mediaBtn, { backgroundColor: colors.primary + '15' }]} onPress={() => pickImage('bannerUrl')}>
          {uploadingField === 'bannerUrl' ? <ActivityIndicator size="small" color={colors.primary} /> : (
            <>
              <Ionicons name="images" size={normalize(20)} color={colors.primary} />
              <Text style={{ color: colors.primary, marginLeft: 8, fontSize: normalize(14, fontSizeFactor) }}>{formData.bannerUrl ? 'Bannière prête' : 'Ajouter Bannière'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { fontSize: normalize(12, fontSizeFactor) }]}>Adresse complète *</Text>
      <View style={styles.gridInputs}>
        <TextInput style={[styles.gridInput, { fontSize: normalize(15, fontSizeFactor), color: colors.text.primary, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} placeholder="Ville" placeholderTextColor={colors.text.disabled} value={formData.addressCity} onChangeText={v => updateField('addressCity', v)} />
        <TextInput style={[styles.gridInput, { fontSize: normalize(15, fontSizeFactor), color: colors.text.primary, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} placeholder="Commune" placeholderTextColor={colors.text.disabled} value={formData.addressCommune} onChangeText={v => updateField('addressCommune', v)} />
      </View>
      <View style={styles.gridInputs}>
        <TextInput style={[styles.gridInput, { fontSize: normalize(15, fontSizeFactor), color: colors.text.primary, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} placeholder="Province" placeholderTextColor={colors.text.disabled} value={formData.addressProvince} onChangeText={v => updateField('addressProvince', v)} />
        <TextInput style={[styles.gridInput, { fontSize: normalize(15, fontSizeFactor), color: colors.text.primary, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} placeholder="Quartier" placeholderTextColor={colors.text.disabled} value={formData.addressQuarter} onChangeText={v => updateField('addressQuarter', v)} />
      </View>
      <TextInput style={[styles.input, { fontSize: normalize(16, fontSizeFactor), color: colors.text.primary, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} placeholder="Code postal" placeholderTextColor={colors.text.disabled} value={formData.addressPostalCode} onChangeText={v => updateField('addressPostalCode', v)} keyboardType="numeric" />
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView
      style={[styles.stepContainer, isTablet && { alignSelf: 'center', width: contentWidth }]}
      showsVerticalScrollIndicator={true}
      persistentScrollbar={true}
    >
      <Text style={[styles.stepTitle, { color: colors.text.primary, fontSize: normalize(24, fontSizeFactor) }]}>Documents légaux</Text>
      <Text style={[styles.stepSubtitle, { color: colors.text.secondary, fontSize: normalize(14, fontSizeFactor) }]}>Nous avons besoin de vérifier votre identité pour la sécurité du market.</Text>

      <TouchableOpacity
        style={[styles.idUpload, { borderColor: formData.idCardUrl ? colors.primary : colors.border }]}
        onPress={() => pickImage('idCardUrl')}
      >
        {uploadingField === 'idCardUrl' ? <ActivityIndicator color={colors.primary} /> : (
          formData.idCardUrl ? (
            <Image source={{ uri: formData.idCardUrl }} style={styles.idPreview} />
          ) : (
            <>
              <Ionicons name="card-outline" size={normalize(50)} color={colors.text.disabled} />
              <Text style={{ color: colors.text.secondary, marginTop: 10, fontSize: normalize(14, fontSizeFactor) }}>Photo Carte d'identité / Passeport *</Text>
            </>
          )
        )}
      </TouchableOpacity>

      {formData.category === 'Boutique' && (
        <View style={{ marginTop: 20 }}>
          <Text style={[styles.label, { fontSize: normalize(12, fontSizeFactor) }]}>Numéro d'identité national / ID.NAT *</Text>
          <TextInput
            style={[styles.input, { color: colors.text.primary, backgroundColor: colors.surface, fontSize: normalize(16, fontSizeFactor), borderColor: colors.border, borderWidth: 1 }]}
            value={formData.nationalIdNumber}
            onChangeText={v => updateField('nationalIdNumber', v)}
            placeholder="Entrez votre numéro ID.NAT"
            placeholderTextColor={colors.text.disabled}
          />
          <Text style={[styles.label, { fontSize: normalize(12, fontSizeFactor) }]}>Numéro RCCM *</Text>
          <TextInput
            style={[styles.input, { color: colors.text.primary, backgroundColor: colors.surface, fontSize: normalize(16, fontSizeFactor), borderColor: colors.border, borderWidth: 1 }]}
            value={formData.rccmNumber}
            onChangeText={v => updateField('rccmNumber', v)}
            placeholder="Entrez votre numéro RCCM"
            placeholderTextColor={colors.text.disabled}
          />
        </View>
      )}
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView
      style={[styles.stepContainer, isTablet && { alignSelf: 'center', width: contentWidth }]}
      showsVerticalScrollIndicator={true}
      persistentScrollbar={true}
    >
      <Text style={[styles.stepTitle, { color: colors.text.primary, fontSize: normalize(24, fontSizeFactor) }]}>Taille de l'entreprise</Text>

      <Text style={[styles.label, { fontSize: normalize(12, fontSizeFactor) }]}>Nombre d'employés</Text>
      <TextInput
        style={[styles.input, { color: colors.text.primary, backgroundColor: colors.surface, fontSize: normalize(16, fontSizeFactor), borderColor: colors.border, borderWidth: 1 }]}
        value={formData.employeeCount}
        onChangeText={v => updateField('employeeCount', v)}
        keyboardType="numeric"
        placeholder="Ex: 5"
        placeholderTextColor={colors.text.disabled}
      />

      <Text style={[styles.label, { fontSize: normalize(12, fontSizeFactor) }]}>Capital estimé (USD)</Text>
      <TextInput
        style={[styles.input, { color: colors.text.primary, backgroundColor: colors.surface, fontSize: normalize(16, fontSizeFactor), borderColor: colors.border, borderWidth: 1 }]}
        value={formData.capitalAmount}
        onChangeText={v => updateField('capitalAmount', v)}
        keyboardType="numeric"
        placeholder="Ex: 1000"
        placeholderTextColor={colors.text.disabled}
      />
    </ScrollView>
  );

  const renderStep5 = () => (
    <ScrollView
      style={[styles.stepContainer, isTablet && { alignSelf: 'center', width: contentWidth }]}
      showsVerticalScrollIndicator={true}
      persistentScrollbar={true}
    >
      <Text style={[styles.stepTitle, { color: colors.text.primary, fontSize: normalize(24, fontSizeFactor) }]}>Vérification & Envoi</Text>
      <View style={styles.finalBox}>
        <Ionicons name="shield-checkmark" size={normalize(80)} color={colors.primary} />
        <Text style={[styles.finalText, { color: colors.text.primary, fontSize: normalize(16, fontSizeFactor) }]}>
          En soumettant ce formulaire, vous acceptez les conditions d'utilisation du Market Meet Me.
          Votre compte sera audité par notre équipe de sécurité sous 24h à 48h.
        </Text>

        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => updateField('acceptedTerms', !formData.acceptedTerms)}
        >
          <Ionicons
            name={formData.acceptedTerms ? "checkbox" : "square-outline"}
            size={normalize(24)}
            color={formData.acceptedTerms ? colors.primary : colors.text.disabled}
          />
          <Text style={[styles.termsText, { color: colors.text.secondary, fontSize: normalize(14, fontSizeFactor) }]}>J'accepte les conditions de Meet Me</Text>
        </TouchableOpacity>
      </View>

      {/* Registration Footer */}
      <View style={styles.registrationFooter}>
        <View style={styles.socialRow}>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.facebook.com/people/TOGETHE-Tech/61589824992529/')}>
            <Ionicons name="logo-facebook" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('https://wa.me/243975186643')}>
            <Ionicons name="logo-whatsapp" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.linkedin.com/company/together-tech-solutions')}>
            <Ionicons name="logo-linkedin" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
          <Text style={[styles.footerLink, { color: colors.primary }]}>Lire la politique de confidentialité</Text>
        </TouchableOpacity>

        <Text style={[styles.addressText, { color: colors.text.disabled }]}>
          TOGETHE Tech Solutions, Kinshasa, RDC.
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* Header */}
        <View style={[styles.header, isTablet && { alignSelf: 'center', width: contentWidth }]}>
          <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()} style={{ padding: 5 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: normalize(18, fontSizeFactor) }]}>Inscription Market — Étape {step}/5</Text>
          <View style={{ width: 34 }} />
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressBg, isTablet && { alignSelf: 'center', width: contentWidth, borderRadius: 2 }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${(step / 5) * 100}%` }]} />
        </View>

        {/* Form Content */}
        <View style={{ flex: 1 }}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
        </View>

        {/* Footer Button */}
        <View style={[styles.footer, isTablet && { alignSelf: 'center', width: contentWidth, borderTopWidth: 0 }]}>
          <TouchableOpacity
            style={[styles.mainBtn, { backgroundColor: colors.primary }, (loading || !!uploadingField) && { opacity: 0.7 }]}
            onPress={step === 5 ? handleSubmit : handleNext}
            disabled={loading || !!uploadingField}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={[styles.mainBtnText, { fontSize: normalize(16, fontSizeFactor) }]}>{step === 5 ? "SOUMETTRE LA DEMANDE" : "CONTINUER"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: any, normalize: any, factor: number, isDark: boolean) {
  return StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontWeight: 'bold' },
  progressBg: { height: 4, backgroundColor: isDark ? '#333' : '#eee', width: '100%' },
  progressFill: { height: '100%' },
  stepContainer: { flex: 1, padding: 25 },
  stepTitle: { fontWeight: '900', marginBottom: 10 },
  stepSubtitle: { lineHeight: 20, marginBottom: 30 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: { padding: 20, borderRadius: 20, borderWidth: 1, alignItems: 'center', marginBottom: 15 },
  categoryText: { marginTop: 10 },
  label: { fontWeight: 'bold', color: '#999', marginTop: 15, marginBottom: 8, textTransform: 'uppercase' },
  input: { padding: 15, borderRadius: 15 },
  gridInputs: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  gridInput: { width: '48%', padding: 15, borderRadius: 15 },
  mediaButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  mediaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, marginHorizontal: 5 },
  idUpload: { width: '100%', height: 200, borderRadius: 20, borderStyle: 'dashed', borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginTop: 20, overflow: 'hidden' },
  idPreview: { width: '100%', height: '100%' },
  finalBox: { alignItems: 'center', marginTop: 30 },
  finalText: { textAlign: 'center', fontSize: 16, lineHeight: 24, marginVertical: 30 },
  termsRow: { flexDirection: 'row', alignItems: 'center' },
  termsText: { marginLeft: 10 },
  registrationFooter: { marginTop: 40, alignItems: 'center', paddingBottom: 20 },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 15 },
  footerLink: { fontSize: 12, fontWeight: 'bold', textDecorationLine: 'underline', marginBottom: 10 },
  addressText: { fontSize: 10, textAlign: 'center' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  mainBtn: { padding: 18, borderRadius: 20, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  mainBtnText: { color: '#fff', fontWeight: '900' },
});
}
