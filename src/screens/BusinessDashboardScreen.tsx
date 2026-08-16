import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Image,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import apiService from '../services/api.service';
import { SOCKET_URL } from '../utils/constants';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

export default function BusinessDashboardScreen({ navigation }: any) {
  const { colors, normalize, isDark, fontSizeFactor } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState('overview');

  const styles = createStyles(colors, normalize, fontSizeFactor, isDark);

  const [publishForm, setPublishForm] = useState({
    title: '',
    content: '',
    type: 'announcement',
    image: null as string | null,
    uploadedUrl: null as string | null,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Mettre à jour le type de publication par défaut quand les données sont chargées
  useEffect(() => {
    if (data?.business) {
      setPublishForm(prev => ({
        ...prev,
        type: data.business.category === 'Boutique' ? 'announcement' : 'exploit'
      }));
    }
  }, [data]);

  const fetchDashboardData = async () => {
    try {
      const res = await apiService.getMarketDashboard();
      if (res.success) {
        setData(res.data);
      } else {
        Alert.alert('Erreur', res.message || 'Impossible de charger le tableau de bord');
        navigation.goBack();
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Un problème est survenu lors de la connexion au serveur.');
      navigation.goBack();
    }
    finally { setLoading(false); }
  };

  if (loading || !data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { business, stats } = data;
  const category = business.category;

  // Configuration des couleurs selon la catégorie
  const getCategoryColor = () => {
    switch (category) {
      case 'Boutique': return '#FF5722';
      case 'Informatique': return '#2196F3';
      case 'Menuisier': return '#795548';
      case 'Electricien': return '#FFC107';
      default: return colors.primary;
    }
  };

  const catColor = getCategoryColor();

  const handlePublish = async () => {
    if (!publishForm.title || !publishForm.content) {
      return Alert.alert('Info', 'Veuillez remplir le titre et le contenu');
    }

    setLoading(true);
    try {
      const res = await apiService.createMarketPost({
        title: publishForm.title,
        content: publishForm.content,
        type: publishForm.type,
        images: publishForm.uploadedUrl ? [publishForm.uploadedUrl] : []
      });

      if (res.success) {
        Alert.alert('Succès', 'Votre annonce a été publiée !');
        setPublishForm({
          title: '',
          content: '',
          type: business.category === 'Boutique' ? 'announcement' : 'exploit',
          image: null,
          uploadedUrl: null
        });
        setActiveMenu('overview');
        fetchDashboardData();
      }
    } catch (e) {
      Alert.alert('Erreur', 'Échec de la publication');
    } finally {
      setLoading(false);
    }
  };

  const pickPublishImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setPublishForm(prev => ({ ...prev, image: uri }));
      // Upload immédiat
      try {
        const res = await apiService.uploadFile({ uri, type: 'image/jpeg', name: 'post.jpg' }, 'image');
        if (res.success) setPublishForm(prev => ({ ...prev, uploadedUrl: res.data.fileUrl }));
      } catch (e) { Alert.alert('Erreur', 'Échec de l\'upload'); }
    }
  };

  const renderSidebar = () => (
    <View style={[styles.sidebar, { backgroundColor: isDark ? '#1a1a1a' : '#f8f9fa', borderRightColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.sidebarItem, activeMenu === 'overview' && { backgroundColor: catColor + '20' }]}
        onPress={() => setActiveMenu('overview')}
      >
        <Ionicons name="grid" size={24} color={activeMenu === 'overview' ? catColor : colors.text.secondary} />
      </TouchableOpacity>

      {(category === 'Boutique') ? (
        <>
          <TouchableOpacity
            style={[styles.sidebarItem, activeMenu === 'orders' && { backgroundColor: catColor + '20' }]}
            onPress={() => setActiveMenu('orders')}
          >
            <Ionicons name="cart" size={24} color={activeMenu === 'orders' ? catColor : colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sidebarItem, activeMenu === 'stock' && { backgroundColor: catColor + '20' }]}
            onPress={() => setActiveMenu('stock')}
          >
            <Ionicons name="cube" size={24} color={activeMenu === 'stock' ? catColor : colors.text.secondary} />
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={[styles.sidebarItem, activeMenu === 'requests' && { backgroundColor: catColor + '20' }]}
          onPress={() => setActiveMenu('requests')}
        >
          <Ionicons name="document-text" size={24} color={activeMenu === 'requests' ? catColor : colors.text.secondary} />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.sidebarItem, activeMenu === 'publish' && { backgroundColor: catColor + '20' }]}
        onPress={() => setActiveMenu('publish')}
      >
        <Ionicons name="add-circle" size={24} color={activeMenu === 'publish' ? catColor : colors.text.secondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.sidebarItem, activeMenu === 'messages' && { backgroundColor: catColor + '20' }]}
        onPress={() => setActiveMenu('messages')}
      >
        <Ionicons name="chatbubbles" size={24} color={activeMenu === 'messages' ? catColor : colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );

  const renderOverview = () => (
    <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Vue d'ensemble</Text>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={styles.statLabel}>Revenus</Text>
          <Text style={[styles.statValue, { color: catColor }]}>$ {stats.totalSales || 0}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={styles.statLabel}>{category === 'Boutique' ? 'Commandes' : 'Devis'}</Text>
          <Text style={[styles.statValue, { color: catColor }]}>{stats.pendingOrders || stats.pendingRequests || 0}</Text>
        </View>
      </View>

      <View style={[styles.chartPlaceholder, { backgroundColor: colors.surface }]}>
        <Ionicons name="trending-up" size={40} color={catColor} />
        <Text style={{ color: colors.text.secondary, marginTop: 10 }}>Graphique des revenus (Réel)</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text.primary, marginTop: 30 }]}>Dernières activités</Text>
      <View style={[styles.activityList, { backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.text.disabled, textAlign: 'center', padding: 20 }}>Aucune activité récente</Text>
      </View>
    </ScrollView>
  );

  const renderPublishForm = () => (
    <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
        {business.category === 'Boutique' ? 'Nouvelle Annonce' : 'Publier un Exploit'}
      </Text>

      <Text style={styles.label}>Titre de la publication</Text>
      <TextInput
        style={[styles.input, { color: colors.text.primary, backgroundColor: colors.surface }]}
        value={publishForm.title}
        onChangeText={t => setPublishForm(p => ({ ...p, title: t }))}
        placeholder="Ex: Arrivage de nouveaux smartphones"
        placeholderTextColor={colors.text.disabled}
      />

      <Text style={styles.label}>Message / Description</Text>
      <TextInput
        style={[styles.input, { color: colors.text.primary, backgroundColor: colors.surface, minHeight: 120, textAlignVertical: 'top' }]}
        value={publishForm.content}
        onChangeText={t => setPublishForm(p => ({ ...p, content: t }))}
        placeholder="Détaillez votre offre ou votre réalisation..."
        placeholderTextColor={colors.text.disabled}
        multiline
      />

      <TouchableOpacity
        style={[styles.imageUploadBtn, { borderColor: catColor }]}
        onPress={pickPublishImage}
      >
        {publishForm.image ? (
          <Image source={{ uri: publishForm.image }} style={styles.previewImage} />
        ) : (
          <>
            <Ionicons name="camera" size={32} color={catColor} />
            <Text style={{ color: catColor, marginTop: 8, fontWeight: 'bold' }}>AJOUTER UNE PHOTO</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.publishBtn, { backgroundColor: catColor }]}
        onPress={handlePublish}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.publishBtnText}>PUBLIER MAINTENANT</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={[styles.businessName, { color: colors.text.primary }]}>{business.business_name}</Text>
          <Text style={[styles.categoryTag, { color: catColor }]}>{category.toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.contentWrapper}>
          {renderSidebar()}
          <View style={{ flex: 1 }}>
            {activeMenu === 'overview' && renderOverview()}
            {activeMenu === 'publish' && renderPublishForm()}
            {(activeMenu === 'orders' || activeMenu === 'stock' || activeMenu === 'requests' || activeMenu === 'messages') && (
              <View style={styles.centered}>
                <Ionicons name="construct-outline" size={50} color={colors.text.disabled} />
                <Text style={{ color: colors.text.secondary, marginTop: 15 }}>Module en cours de finalisation...</Text>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: any, normalize: any, factor: number, isDark: boolean) {
  return StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: normalize(20), borderBottomWidth: 0.5, borderBottomColor: colors.border },
  headerInfo: { flex: 1 },
  businessName: { fontSize: normalize(20, factor), fontWeight: '900' },
  categoryTag: { fontSize: normalize(10, factor), fontWeight: 'bold', marginTop: 2, letterSpacing: 1 },
  contentWrapper: { flex: 1, flexDirection: 'row' },
  sidebar: { width: normalize(65), alignItems: 'center', paddingTop: normalize(20), borderRightWidth: 0.5 },
  sidebarItem: { width: normalize(45), height: normalize(45), borderRadius: normalize(12), justifyContent: 'center', alignItems: 'center', marginBottom: normalize(15) },
  mainContent: { flex: 1, padding: normalize(20) },
  sectionTitle: { fontSize: normalize(18, factor), fontWeight: 'bold', marginBottom: normalize(20) },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: normalize(20) },
  statCard: { width: '48%', padding: normalize(15), borderRadius: normalize(20), elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  statLabel: { fontSize: normalize(10, factor), color: '#999', marginBottom: 5, textTransform: 'uppercase' },
  statValue: { fontSize: normalize(20, factor), fontWeight: '900' },
  chartPlaceholder: { width: '100%', height: normalize(180), borderRadius: normalize(25), justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 1 },
  activityList: { width: '100%', borderRadius: normalize(20), marginTop: 10 },
  label: { fontSize: normalize(11, factor), fontWeight: 'bold', color: '#999', marginBottom: 8, marginTop: 15, textTransform: 'uppercase' },
  input: { padding: normalize(15), borderRadius: 15, fontSize: normalize(15, factor), borderBottomWidth: 1, borderBottomColor: colors.divider },
  imageUploadBtn: { width: '100%', height: normalize(160), borderRadius: normalize(20), borderStyle: 'dashed', borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginTop: normalize(20), overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  publishBtn: { marginTop: normalize(30), padding: normalize(18), borderRadius: normalize(20), alignItems: 'center', elevation: 3 },
  publishBtnText: { color: '#fff', fontWeight: '900', fontSize: normalize(16, factor) }
});
}
