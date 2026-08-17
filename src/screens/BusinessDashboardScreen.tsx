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
  FlatList,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import { SOCKET_URL } from '../utils/constants';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

const { width } = Dimensions.get('window');

export default function BusinessDashboardScreen({ navigation }: any) {
  const { colors, normalize, isDark, fontSizeFactor } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState('overview');

  // States for modules
  const [orders, setOrders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  // Quote Creation State
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [quoteForm, setQuoteForm] = useState({ title: '', amount: '', notes: '' });

  const styles = createStyles(colors, normalize, fontSizeFactor, isDark);

  const [publishForm, setPublishForm] = useState({
    title: '',
    content: '',
    type: 'announcement',
    images: [] as string[], // Local URIs
    uploadedUrls: [] as string[], // Remote URLs
  });

  useEffect(() => {
    fetchDashboardData();

    // Real-time events
    socketService.on('market:new_like', () => fetchDashboardData());
    socketService.on('market:new_comment', () => fetchDashboardData());
    socketService.on('market:new_follower', () => fetchDashboardData());

    return () => {
      socketService.off('market:new_like');
      socketService.off('market:new_comment');
      socketService.off('market:new_follower');
    };
  }, []);

  useEffect(() => {
    if (data?.business) {
      if (!publishForm.title) {
         setPublishForm(prev => ({
          ...prev,
          type: data.business.category === 'Boutique' ? 'announcement' : 'exploit'
        }));
      }

      if (activeMenu === 'orders') fetchOrders();
      if (activeMenu === 'requests') fetchRequests();
      if (activeMenu === 'stock') fetchInventory();
      if (activeMenu === 'messages') fetchChats();
      if (activeMenu === 'docs') fetchDocuments();
    }
  }, [data, activeMenu]);

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

  const fetchOrders = async () => {
    const res = await apiService.getMarketOrders();
    if (res.success) setOrders(res.data);
  };

  const fetchRequests = async () => {
    const res = await apiService.getMarketRequests();
    if (res.success) setRequests(res.data);
  };

  const fetchInventory = async () => {
    const res = await apiService.getMarketInventory();
    if (res.success) setInventory(res.data);
  };

  const fetchChats = async () => {
    const res = await apiService.getMarketChats();
    if (res.success) setChats(res.data);
  };

  const fetchDocuments = async () => {
    const res = await apiService.getMarketDocuments();
    if (res.success) setDocuments(res.data);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const file = result.assets[0];
        setLoading(true);

        const uploadRes = await apiService.uploadFile({
          uri: file.uri,
          name: file.name,
          type: file.mimeType
        }, 'document');

        if (uploadRes.success) {
          await apiService.uploadMarketDocument({
            name: file.name,
            fileUrl: uploadRes.data.fileUrl,
            fileSize: (file.size! / (1024 * 1024)).toFixed(2) + ' MB',
            mimeType: file.mimeType
          });
          fetchDocuments();
          Alert.alert('Succès', 'Document ajouté à votre portfolio.');
        }
      }
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const handleCreateQuote = async () => {
    if (!quoteForm.title || !quoteForm.amount) return;
    setLoading(true);
    try {
      const res = await apiService.createMarketQuote({
        requestId: selectedRequest.id,
        customerId: selectedRequest.user_id,
        title: quoteForm.title,
        amount: parseFloat(quoteForm.amount),
        notes: quoteForm.notes
      });

      if (res.success) {
        Alert.alert('Succès', 'Le devis a été envoyé au client.');
        setShowQuoteModal(false);
        setQuoteForm({ title: '', amount: '', notes: '' });
        fetchRequests();
      }
    } catch (e) {
      Alert.alert('Erreur', 'Échec de l\'envoi du devis');
    } finally { setLoading(false); }
  };

  if (loading || !data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { business, stats } = data;

  if (business.status === 'blocked') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 40 }]}>
        <Ionicons name="lock-closed" size={80} color={colors.danger} />
        <Text style={[styles.sectionTitle, { color: colors.danger, marginTop: 20 }]}>Dashboard Suspendu</Text>
        <Text style={{ textAlign: 'center', color: colors.text.secondary }}>
          Votre accès professionnel a été restreint. Veuillez contacter l'administration.
        </Text>
        <TouchableOpacity
          style={[styles.publishBtn, { backgroundColor: colors.primary, marginTop: 30 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.publishBtnText}>RETOUR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const category = business.category;

  const getCategoryColor = () => {
    switch (category) {
      case 'Boutique': return '#FF5722';
      case 'Informatique': return '#2196F3';
      case 'Menuisier': return '#795548';
      case 'Electricien': return '#FFC107';
      case 'Maçons': return '#607D8B';
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
        images: publishForm.uploadedUrls
      });

      if (res.success) {
        Alert.alert('Succès', 'Votre annonce a été publiée !');
        setPublishForm({
          title: '',
          content: '',
          type: business.category === 'Boutique' ? 'announcement' : 'exploit',
          images: [],
          uploadedUrls: []
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
    if (publishForm.images.length >= 5) {
      return Alert.alert('Limite atteinte', 'Vous pouvez ajouter au maximum 5 photos.');
    }

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
      const tempImages = [...publishForm.images, uri];
      setPublishForm(prev => ({ ...prev, images: tempImages }));

      try {
        const res = await apiService.uploadFile({ uri, type: 'image/jpeg', name: `post_${Date.now()}.jpg` }, 'image');
        if (res.success) {
          setPublishForm(prev => ({
            ...prev,
            uploadedUrls: [...prev.uploadedUrls, res.data.fileUrl]
          }));
        }
      } catch (e) {
        Alert.alert('Erreur', 'Échec de l\'upload');
        setPublishForm(prev => ({ ...prev, images: prev.images.filter(i => i !== uri) }));
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...publishForm.images];
    const newUrls = [...publishForm.uploadedUrls];
    newImages.splice(index, 1);
    newUrls.splice(index, 1);
    setPublishForm(prev => ({ ...prev, images: newImages, uploadedUrls: newUrls }));
  };

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;
    return `${SOCKET_URL}${url.startsWith('/') ? '' : '/'}${url}`;
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
        <>
          <TouchableOpacity
            style={[styles.sidebarItem, activeMenu === 'requests' && { backgroundColor: catColor + '20' }]}
            onPress={() => setActiveMenu('requests')}
          >
            <Ionicons name="document-text" size={24} color={activeMenu === 'requests' ? catColor : colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sidebarItem, activeMenu === 'docs' && { backgroundColor: catColor + '20' }]}
            onPress={() => setActiveMenu('docs')}
          >
            <Ionicons name="folder" size={24} color={activeMenu === 'docs' ? catColor : colors.text.secondary} />
          </TouchableOpacity>
        </>
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

      <View style={[styles.statCard, { backgroundColor: colors.surface, width: '100%', marginTop: 10, flexDirection: 'row', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.statLabel}>Abonnés (Fidélité)</Text>
          <Text style={[styles.statValue, { color: catColor }]}>{stats.followers || 0}</Text>
        </View>
        <Ionicons name="people" size={40} color={catColor + '40'} />
      </View>

      <View style={[styles.chartPlaceholder, { backgroundColor: colors.surface, marginTop: 25 }]}>
        <Ionicons name="trending-up" size={40} color={catColor} />
        <Text style={{ color: colors.text.secondary, marginTop: 10 }}>Statistiques réelles</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text.primary, marginTop: 30 }]}>Performances</Text>
      <View style={[styles.activityList, { backgroundColor: colors.surface, padding: 20 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
          <Text style={{ color: colors.text.secondary }}>Annonces publiées</Text>
          <Text style={{ fontWeight: 'bold', color: colors.text.primary }}>{stats.posts || 0}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text.secondary }}>Avis clients</Text>
          <Text style={{ fontWeight: 'bold', color: colors.text.primary }}>{stats.reviews || 0} ({stats.rating?.toFixed(1) || 0}★)</Text>
        </View>
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

      <Text style={styles.label}>Photos (jusqu'à 5)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        {publishForm.images.map((img, idx) => (
          <View key={idx} style={styles.imagePreviewWrapper}>
            <Image source={{ uri: img }} style={styles.smallPreview} />
            <TouchableOpacity style={styles.removeImgBtn} onPress={() => removeImage(idx)}>
              <Ionicons name="close-circle" size={20} color="#ff3b30" />
            </TouchableOpacity>
          </View>
        ))}
        {publishForm.images.length < 5 && (
          <TouchableOpacity
            style={[styles.addImageBtn, { borderColor: catColor }]}
            onPress={pickPublishImage}
          >
            <Ionicons name="add" size={30} color={catColor} />
          </TouchableOpacity>
        )}
      </ScrollView>

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

  const renderOrders = () => (
    <View style={styles.mainContent}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Commandes Clients</Text>
      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.moduleCard, { backgroundColor: colors.surface }]}>
            <Image source={{ uri: getFullUrl(item.customer_avatar) || `https://ui-avatars.com/api/?name=${item.customer_name}` }} style={styles.moduleAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.moduleName, { color: colors.text.primary }]}>{item.customer_name}</Text>
              <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Total: $ {item.total_amount}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'pending' ? '#FFF9C4' : '#E8F5E9' }]}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyMsg}>Aucune commande pour le moment.</Text>}
      />
    </View>
  );

  const renderRequests = () => (
    <View style={styles.mainContent}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Demandes de Devis</Text>
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.moduleCard, { backgroundColor: colors.surface }]}>
            <Image source={{ uri: getFullUrl(item.customer_avatar) || `https://ui-avatars.com/api/?name=${item.customer_name}` }} style={styles.moduleAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.moduleName, { color: colors.text.primary }]}>{item.customer_name}</Text>
              <Text style={{ color: colors.text.secondary, fontSize: 12 }} numberOfLines={1}>{item.details?.description || 'Sans description'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: catColor }]}
              onPress={() => { setSelectedRequest(item); setShowQuoteModal(true); }}
            >
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>RÉPONDRE</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyMsg}>Aucune demande de devis.</Text>}
      />

      {/* Quote Modal */}
      <Modal visible={showQuoteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Créer un Devis</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Titre du devis (ex: Installation électrique)"
              value={quoteForm.title}
              onChangeText={t => setQuoteForm({...quoteForm, title: t})}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Montant total ($)"
              keyboardType="numeric"
              value={quoteForm.amount}
              onChangeText={t => setQuoteForm({...quoteForm, amount: t})}
            />
            <TextInput
              style={[styles.modalInput, { height: 100 }]}
              placeholder="Notes additionnelles..."
              multiline
              value={quoteForm.notes}
              onChangeText={t => setQuoteForm({...quoteForm, notes: t})}
            />
            <View style={{ flexDirection: 'row', gap: 15 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#eee' }]} onPress={() => setShowQuoteModal(false)}>
                <Text>ANNULER</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: catColor, flex: 2 }]} onPress={handleCreateQuote}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>ENVOYER LE DEVIS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderStock = () => (
    <View style={styles.mainContent}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Gestion de Stock</Text>
        <TouchableOpacity style={{ backgroundColor: catColor, padding: 8, borderRadius: 10 }}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={inventory}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.moduleCard, { backgroundColor: colors.surface }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.moduleName, { color: colors.text.primary }]}>{item.item_name}</Text>
              <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Stock: {item.quantity}</Text>
            </View>
            <Text style={{ fontWeight: 'bold', color: catColor }}>Actif</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyMsg}>Votre inventaire est vide.</Text>}
      />
    </View>
  );

  const renderMessages = () => (
    <View style={styles.mainContent}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Messages Clients</Text>
      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.moduleCard, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('Chat', { chatId: item.id, name: item.other_name })}
          >
            <Image source={{ uri: getFullUrl(item.other_avatar) || `https://ui-avatars.com/api/?name=${item.other_name}` }} style={styles.moduleAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.moduleName, { color: colors.text.primary }]}>{item.other_name}</Text>
              <Text style={{ color: colors.text.secondary, fontSize: 12 }} numberOfLines={1}>
                {item.last_message || 'Nouvelle discussion commerciale'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.disabled} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyMsg}>Aucun message client.</Text>}
      />
    </View>
  );

  const renderDocuments = () => (
    <View style={styles.mainContent}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Mes Documents (Portfolio)</Text>
      <FlatList
        data={documents}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.moduleCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="document-attach" size={30} color={catColor} style={{ marginRight: 15 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.moduleName, { color: colors.text.primary }]}>{item.name}</Text>
              <Text style={{ color: colors.text.secondary, fontSize: 11 }}>{item.file_size} • {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <TouchableOpacity onPress={() => Linking.openURL(getFullUrl(item.file_url)!)}>
              <Ionicons name="download-outline" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyMsg}>Aucun document ajouté.</Text>}
      />
      <TouchableOpacity
        style={[styles.publishBtn, { backgroundColor: catColor, marginTop: 20 }]}
        onPress={handlePickDocument}
      >
        <Text style={styles.publishBtnText}>AJOUTER UN DOCUMENT</Text>
      </TouchableOpacity>
    </View>
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
            {activeMenu === 'orders' && renderOrders()}
            {activeMenu === 'requests' && renderRequests()}
            {activeMenu === 'stock' && renderStock()}
            {activeMenu === 'messages' && renderMessages()}
            {activeMenu === 'docs' && renderDocuments()}
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
  chartPlaceholder: { width: '100%', height: normalize(180), borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 1 },
  activityList: { width: '100%', borderRadius: normalize(20), marginTop: 10 },
  label: { fontSize: normalize(11, factor), fontWeight: 'bold', color: '#999', marginBottom: 8, marginTop: 15, textTransform: 'uppercase' },
  input: { padding: normalize(15), borderRadius: 15, fontSize: normalize(15, factor), borderBottomWidth: 1, borderBottomColor: colors.divider },
  imagePreviewWrapper: { marginRight: 10, position: 'relative' },
  smallPreview: { width: normalize(100), height: normalize(100), borderRadius: 15 },
  removeImgBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: '#fff', borderRadius: 10, elevation: 2 },
  addImageBtn: { width: normalize(100), height: normalize(100), borderRadius: 15, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  publishBtn: { marginTop: normalize(30), padding: normalize(18), borderRadius: normalize(20), alignItems: 'center', elevation: 3 },
  publishBtnText: { color: '#fff', fontWeight: '900', fontSize: normalize(16, factor) },
  moduleCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 1 },
  moduleAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15 },
  moduleName: { fontWeight: 'bold', fontSize: 14 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  emptyMsg: { textAlign: 'center', color: '#999', marginTop: 50 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 25, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalInput: { backgroundColor: '#f5f5f5', borderRadius: 15, padding: 15, marginBottom: 15, color: '#000' },
  modalBtn: { padding: 15, borderRadius: 15, alignItems: 'center', flex: 1 },
});
}
