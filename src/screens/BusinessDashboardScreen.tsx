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
  Image,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Modal,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import { SOCKET_URL } from '../utils/constants';

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export default function BusinessDashboardScreen({ navigation }: any) {
  const { colors, normalize, isDark, fontSizeFactor } = useTheme();
  const { t } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= 900;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState('overview');
  const [menuVisible, setMenuVisible] = useState(false);

  const [stockTab, setStockTab] = useState<'current' | 'logs'>('current');

  const [orders, setOrders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [quoteForm, setQuoteForm] = useState({ title: '', amount: '', notes: '' });
  const [inventoryForm, setInventoryForm] = useState({ itemName: '', quantity: '', price: '', action: 'create' as 'create' | 'add' | 'remove', reason: '' });
  const [orderForm, setOrderForm] = useState({ status: '', trackingNumber: '', adminNotes: '' });
  const [createOrderForm, setCreateOrderForm] = useState({ customerName: '', items: '', totalAmount: '' });

  const styles = createStyles(colors, normalize, fontSizeFactor, isDark);

  const [publishForm, setPublishForm] = useState({
    title: '',
    content: '',
    type: 'announcement',
    images: [] as string[],
    uploadedUrls: [] as string[],
  });

  useEffect(() => {
    fetchDashboardData(true); // Initial load with parallel fetching

    socketService.on('market:new_like', () => fetchDashboardData(false));
    socketService.on('market:new_comment', () => fetchDashboardData(false));
    socketService.on('market:new_follower', () => fetchDashboardData(false));
    socketService.on('market:order_updated', () => fetchOrders());
    socketService.on('market:new_order', () => { fetchOrders(); fetchDashboardData(false); });
    socketService.on('market:new_request', () => { fetchRequests(); fetchDashboardData(false); });

    return () => {
      socketService.off('market:new_like');
      socketService.off('market:new_comment');
      socketService.off('market:new_follower');
      socketService.off('market:order_updated');
      socketService.off('market:new_order');
      socketService.off('market:new_request');
    };
  }, []);

  useEffect(() => {
    if (data?.business) {
      if (!publishForm.title) {
         setPublishForm(prev => ({ ...prev, type: data.business.category === 'Boutique' ? 'announcement' : 'exploit' }));
      }

      // On ne recharge que si on change de menu et que les données sont vides
      // ou pour forcer le rafraîchissement
      if (activeMenu === 'orders' && orders.length === 0) fetchOrders();
      if (activeMenu === 'requests' && requests.length === 0) fetchRequests();
      if (activeMenu === 'stock' && inventory.length === 0) fetchInventory();
      if (activeMenu === 'messages' && chats.length === 0) fetchChats();
      if (activeMenu === 'docs' && documents.length === 0) fetchDocuments();
    }
  }, [activeMenu]);

  const fetchDashboardData = async (isInitial = false) => {
    try {
      const res = await apiService.getMarketDashboard();
      if (res.success) {
        setData(res.data);

        // Initialisation instantanée des listes depuis le dashboard
        if (res.data.initialData) {
          if (res.data.initialData.orders) setOrders(res.data.initialData.orders);
          if (res.data.initialData.requests) setRequests(res.data.initialData.requests);
          if (res.data.initialData.inventory) setInventory(res.data.initialData.inventory);
        }

        // Si c'est le premier chargement, on lance les autres requêtes en tâche de fond
        if (isInitial) {
          fetchAllModulesInBackground();
        }
      }
      else { Alert.alert('Erreur', res.message); navigation.goBack(); }
    } catch (e) { console.warn('Dashboard fetch error', e); }
    finally { setLoading(false); }
  };

  const fetchAllModulesInBackground = async () => {
     // Lancer tout en parallèle pour que tout soit prêt quand on clique
     Promise.all([
       fetchOrders(),
       fetchRequests(),
       fetchInventory(),
       fetchChats(),
       fetchDocuments()
     ]).catch(e => console.log('Background fetch silent error', e));
  };

  const fetchOrders = async () => { const res = await apiService.getMarketOrders(); if (res.success) setOrders(res.data); };
  const fetchRequests = async () => { const res = await apiService.getMarketRequests(); if (res.success) setRequests(res.data); };
  const fetchInventory = async () => { const res = await apiService.getMarketInventory(); if (res.success) setInventory(res.data); };
  const fetchInventoryLogs = async () => { const res = await apiService.getMarketInventoryLogs(); if (res.success) setInventoryLogs(res.data); };
  const fetchChats = async () => { const res = await apiService.getMarketChats(); if (res.success) setChats(res.data); };
  const fetchDocuments = async () => { const res = await apiService.getMarketDocuments(); if (res.success) setDocuments(res.data); };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled) {
        const file = result.assets[0];
        setLoading(true);
        const uploadRes = await apiService.uploadFile({ uri: file.uri, name: file.name, type: file.mimeType }, 'document');
        if (uploadRes.success) {
          await apiService.uploadMarketDocument({ name: file.name, fileUrl: uploadRes.data.fileUrl, fileSize: (file.size! / (1024 * 1024)).toFixed(2) + ' MB', mimeType: file.mimeType });
          fetchDocuments();
          Alert.alert('Succès', 'Document ajouté.');
        }
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;
    setLoading(true);
    try {
      const res = await apiService.updateMarketOrder(selectedOrder.id, orderForm);
      if (res.success) {
        Alert.alert('Succès', 'Commande mise à jour.');
        setShowOrderModal(false);
        fetchOrders();
      }
    } catch (e) { Alert.alert('Erreur', 'Mise à jour échouée'); } finally { setLoading(false); }
  };

  const handleCreateManualOrder = async () => {
    if (!createOrderForm.customerName || !createOrderForm.totalAmount) {
      return Alert.alert('Info', 'Veuillez remplir le nom du client et le montant');
    }
    setLoading(true);
    try {
      const res = await apiService.createMarketOrder({
        customerName: createOrderForm.customerName,
        items: { description: createOrderForm.items },
        totalAmount: parseFloat(createOrderForm.totalAmount)
      });
      if (res.success) {
        Alert.alert('Succès', 'Commande enregistrée manuellement.');
        setShowCreateOrderModal(false);
        setCreateOrderForm({ customerName: '', items: '', totalAmount: '' });
        fetchOrders();
      }
    } catch (e) { Alert.alert('Erreur', 'Création échouée'); } finally { setLoading(false); }
  };

  const handleCreateQuote = async () => {
    if (!quoteForm.title || !quoteForm.amount) return;
    setLoading(true);
    try {
      const res = await apiService.createMarketQuote({ requestId: selectedRequest.id, customerId: selectedRequest.user_id, title: quoteForm.title, amount: parseFloat(quoteForm.amount), notes: quoteForm.notes });
      if (res.success) { Alert.alert('Succès', 'Devis envoyé.'); setShowQuoteModal(false); setQuoteForm({ title: '', amount: '', notes: '' }); fetchRequests(); }
    } catch (e) { Alert.alert('Erreur', 'Échec envoi devis'); } finally { setLoading(false); }
  };

  const handleUpdateInventory = async () => {
    if (!inventoryForm.itemName || !inventoryForm.quantity) return;
    setLoading(true);
    try {
      const res = await apiService.updateMarketInventory({
        itemName: inventoryForm.itemName,
        quantity: parseInt(inventoryForm.quantity),
        price: parseFloat(inventoryForm.price || '0'),
        action: inventoryForm.action,
        reason: inventoryForm.reason
      });
      if (res.success) {
        Alert.alert('Succès', 'Inventaire mis à jour.');
        setShowInventoryModal(false);
        setInventoryForm({ itemName: '', quantity: '', price: '', action: 'create', reason: '' });
        stockTab === 'current' ? fetchInventory() : fetchInventoryLogs();
      }
    } catch (e) { Alert.alert('Erreur', 'Mise à jour échouée'); } finally { setLoading(false); }
  };

  const handleDeleteInventoryItem = async (itemId: string) => {
    Alert.alert('Supprimer', 'Voulez-vous supprimer cet article définitivement ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
          setLoading(true);
          try {
            const res = await apiService.deleteMarketInventoryItem(itemId);
            if (res.success) fetchInventory();
          } catch (e) { Alert.alert('Erreur', 'Échec de suppression'); }
          finally { setLoading(false); }
        }}
    ]);
  };

  if (loading || !data) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;
  const { business, stats } = data;
  if (business.status === 'blocked') return (
    <View style={[styles.centered, { backgroundColor: colors.background, padding: 40 }]}>
      <Ionicons name="lock-closed" size={80} color={colors.danger} />
      <Text style={[styles.sectionTitle, { color: colors.danger, marginTop: 20 }]}>Dashboard Suspendu</Text>
      <Text style={{ textAlign: 'center', color: colors.text.secondary }}>Accès restreint. Contactez l'admin.</Text>
      <TouchableOpacity style={[styles.publishBtn, { backgroundColor: colors.primary, marginTop: 30 }]} onPress={() => navigation.goBack()}><Text style={styles.publishBtnText}>RETOUR</Text></TouchableOpacity>
    </View>
  );

  const category = business.category;
  const getCategoryColor = () => {
    switch (category) {
      case 'Boutique': return '#FF5722'; case 'Informatique': return '#2196F3'; case 'Menuisier': return '#795548'; case 'Electricien': return '#FFC107'; case 'Maçons': return '#607D8B'; default: return colors.primary;
    }
  };
  const catColor = getCategoryColor();

  const handlePublish = async () => {
    if (!publishForm.title || !publishForm.content) return Alert.alert('Info', 'Remplissez le titre et le contenu');
    setLoading(true);
    try {
      const res = await apiService.createMarketPost({ title: publishForm.title, content: publishForm.content, type: publishForm.type, images: publishForm.uploadedUrls });
      if (res.success) { Alert.alert('Succès', 'Annonce publiée !'); setPublishForm({ title: '', content: '', type: business.category === 'Boutique' ? 'announcement' : 'exploit', images: [], uploadedUrls: [] }); setActiveMenu('overview'); fetchDashboardData(); }
    } catch (e) { Alert.alert('Erreur', 'Échec publication'); } finally { setLoading(false); }
  };

  const pickPublishImage = async () => {
    if (publishForm.images.length >= 5) return Alert.alert('Limite', 'Max 5 photos.');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.7 });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setPublishForm(prev => ({ ...prev, images: [...prev.images, uri] }));
      try {
        const res = await apiService.uploadFile({ uri, type: 'image/jpeg', name: `post_${Date.now()}.jpg` }, 'image');
        if (res.success) setPublishForm(prev => ({ ...prev, uploadedUrls: [...prev.uploadedUrls, res.data.fileUrl] }));
      } catch (e) { Alert.alert('Erreur', 'Échec upload'); setPublishForm(prev => ({ ...prev, images: prev.images.filter(i => i !== uri) })); }
    }
  };

  const getFullUrl = (url: string) => { if (!url || url === 'null') return null; if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url; return `${SOCKET_URL}${url.startsWith('/') ? '' : '/'}${url}`; };

  const renderSidebar = () => (
    <View style={[styles.sidebar, { width: isWide ? normalize(240) : Math.min(windowWidth * 0.84, 340), backgroundColor: isDark ? '#151923' : colors.surface, borderRightColor: colors.border }]}>
      <View style={styles.sidebarBrand}>
        <Image source={require('../../assets/AcemiaLogo.png')} style={styles.sidebarLogo} resizeMode="contain" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.sidebarBrandName, { color: colors.text.primary }]}>Acemia Market</Text>
          <Text numberOfLines={1} style={[styles.sidebarBusinessName, { color: colors.text.secondary }]}>{business.business_name}</Text>
        </View>
        {!isWide && (
          <TouchableOpacity style={styles.closeSidebarButton} accessibilityLabel="Fermer le menu" onPress={() => setMenuVisible(false)}>
            <Ionicons name="close" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: normalize(12) }}>
        <TouchableOpacity style={[styles.sidebarItem, activeMenu === 'overview' && { backgroundColor: catColor + '20' }]} onPress={() => { setActiveMenu('overview'); setMenuVisible(false); }}><Ionicons name="grid" size={22} color={activeMenu === 'overview' ? catColor : colors.text.secondary} /><Text style={[styles.sidebarLabel, { color: activeMenu === 'overview' ? catColor : colors.text.secondary }]}>Vue d’ensemble</Text></TouchableOpacity>
        {(category === 'Boutique') ? (
          <>
            <TouchableOpacity style={[styles.sidebarItem, activeMenu === 'orders' && { backgroundColor: catColor + '20' }]} onPress={() => { setActiveMenu('orders'); setMenuVisible(false); }}><Ionicons name="cart" size={22} color={activeMenu === 'orders' ? catColor : colors.text.secondary} /><Text style={[styles.sidebarLabel, { color: activeMenu === 'orders' ? catColor : colors.text.secondary }]}>Commandes</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.sidebarItem, activeMenu === 'stock' && { backgroundColor: catColor + '20' }]} onPress={() => { setActiveMenu('stock'); setMenuVisible(false); }}><Ionicons name="cube" size={22} color={activeMenu === 'stock' ? catColor : colors.text.secondary} /><Text style={[styles.sidebarLabel, { color: activeMenu === 'stock' ? catColor : colors.text.secondary }]}>Stock</Text></TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={[styles.sidebarItem, activeMenu === 'requests' && { backgroundColor: catColor + '20' }]} onPress={() => { setActiveMenu('requests'); setMenuVisible(false); }}><Ionicons name="document-text" size={22} color={activeMenu === 'requests' ? catColor : colors.text.secondary} /><Text style={[styles.sidebarLabel, { color: activeMenu === 'requests' ? catColor : colors.text.secondary }]}>Demandes</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.sidebarItem, activeMenu === 'docs' && { backgroundColor: catColor + '20' }]} onPress={() => { setActiveMenu('docs'); setMenuVisible(false); }}><Ionicons name="folder" size={22} color={activeMenu === 'docs' ? catColor : colors.text.secondary} /><Text style={[styles.sidebarLabel, { color: activeMenu === 'docs' ? catColor : colors.text.secondary }]}>Documents</Text></TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={[styles.sidebarItem, activeMenu === 'publish' && { backgroundColor: catColor + '20' }]} onPress={() => { setActiveMenu('publish'); setMenuVisible(false); }}><Ionicons name="add-circle" size={22} color={activeMenu === 'publish' ? catColor : colors.text.secondary} /><Text style={[styles.sidebarLabel, { color: activeMenu === 'publish' ? catColor : colors.text.secondary }]}>Publier</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.sidebarItem, activeMenu === 'messages' && { backgroundColor: catColor + '20' }]} onPress={() => { setActiveMenu('messages'); setMenuVisible(false); }}><Ionicons name="chatbubbles" size={22} color={activeMenu === 'messages' ? catColor : colors.text.secondary} /><Text style={[styles.sidebarLabel, { color: activeMenu === 'messages' ? catColor : colors.text.secondary }]}>Messages Market</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderOverview = () => (
    <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={true} persistentScrollbar={true}>
      <View style={[styles.dashboardHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.dashboardHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary, marginBottom: 5 }]} numberOfLines={2}>Bonjour, {business.business_name}</Text>
          <Text style={{ color: colors.text.secondary, fontSize: 12 }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
        </View>
        <TouchableOpacity style={[styles.heroAction, { backgroundColor: catColor }]} onPress={() => setActiveMenu('publish')}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.heroActionText}>Publier</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.statIconCircle, { backgroundColor: catColor + '15' }]}><Ionicons name="wallet" size={20} color={catColor} /></View>
          <Text style={styles.statLabel}>Revenus</Text>
          <Text style={[styles.statValue, { color: catColor }]}>$ {stats.totalSales || 0}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.statIconCircle, { backgroundColor: '#4CAF5015' }]}><Ionicons name="stats-chart" size={20} color="#4CAF50" /></View>
          <Text style={styles.statLabel}>{category === 'Boutique' ? 'Commandes' : 'Devis'}</Text>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.pendingOrders || stats.pendingRequests || 0}</Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.surface, width: '100%', marginTop: 10, flexDirection: 'row', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}><Text style={styles.statLabel}>Abonnés (Fidélité)</Text><Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.followers || 0}</Text></View>
        <View style={[styles.statIconCircle, { backgroundColor: '#2196F315', width: 50, height: 50 }]}><Ionicons name="people" size={24} color="#2196F3" /></View>
      </TouchableOpacity>
      <View style={[styles.chartPlaceholder, { backgroundColor: colors.surface, marginTop: 25 }]}><Ionicons name="trending-up" size={40} color={catColor} /><Text style={{ color: colors.text.secondary, marginTop: 10, fontWeight: 'bold' }}>Tendances de la semaine</Text></View>
    </ScrollView>
  );

  const renderPublishForm = () => (
    <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={true} persistentScrollbar={true}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{business.category === 'Boutique' ? 'Nouvelle Annonce' : 'Publier un Exploit'}</Text>
      <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
        <Text style={styles.label}>Titre de la publication</Text>
        <TextInput style={[styles.input, { color: colors.text.primary, backgroundColor: isDark ? '#2a2a2a' : '#f9f9f9' }]} value={publishForm.title} onChangeText={t => setPublishForm(p => ({ ...p, title: t }))} placeholder="Ex: Arrivage de nouveaux smartphones" placeholderTextColor={colors.text.disabled} />
        <Text style={styles.label}>Message / Description</Text>
        <TextInput style={[styles.input, { color: colors.text.primary, backgroundColor: isDark ? '#2a2a2a' : '#f9f9f9', minHeight: 120, textAlignVertical: 'top' }]} value={publishForm.content} onChangeText={t => setPublishForm(p => ({ ...p, content: t }))} placeholder="Détaillez votre offre ou votre réalisation..." placeholderTextColor={colors.text.disabled} multiline />
        <Text style={styles.label}>Photos (jusqu'à 5)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {publishForm.images.map((img, idx) => (<View key={idx} style={styles.imagePreviewWrapper}><Image source={{ uri: img }} style={styles.smallPreview} /><TouchableOpacity style={styles.removeImgBtn} onPress={() => { const ni = [...publishForm.images]; const nu = [...publishForm.uploadedUrls]; ni.splice(idx,1); nu.splice(idx,1); setPublishForm(p => ({...p, images: ni, uploadedUrls: nu})); }}><Ionicons name="close-circle" size={20} color="#ff3b30" /></TouchableOpacity></View>))}
          {publishForm.images.length < 5 && (<TouchableOpacity style={[styles.addImageBtn, { borderColor: catColor }]} onPress={pickPublishImage}><Ionicons name="add" size={30} color={catColor} /></TouchableOpacity>)}
        </ScrollView>
      </View>
      <TouchableOpacity style={[styles.publishBtn, { backgroundColor: catColor }]} onPress={handlePublish} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishBtnText}>PUBLIER MAINTENANT</Text>}</TouchableOpacity>
    </ScrollView>
  );

  const renderOrders = () => (
    <View style={styles.mainContent}>
      <View style={styles.moduleHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary, marginBottom: 0 }]}>Commandes Clients</Text>
        <TouchableOpacity style={{ backgroundColor: catColor, padding: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }} onPress={() => setShowCreateOrderModal(true)}>
          <Ionicons name="add-circle" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 5, fontSize: 12 }}>SAISIR</Text>
        </TouchableOpacity>
      </View>

      <FlatList data={orders} keyExtractor={item => item.id} showsVerticalScrollIndicator={true} persistentScrollbar={true} renderItem={({ item }) => (
        <TouchableOpacity style={[styles.moduleCard, { backgroundColor: colors.surface }]} onPress={() => { setSelectedOrder(item); setOrderForm({ status: item.status, trackingNumber: item.tracking_number || '', adminNotes: item.admin_notes || '' }); setShowOrderModal(true); }}>
          <Image source={{ uri: getFullUrl(item.customer_avatar) || `https://ui-avatars.com/api/?name=${item.customer_name || item.manual_customer_name}` }} style={styles.moduleAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.moduleName, { color: colors.text.primary }]}>{item.customer_name || item.manual_customer_name}</Text>
            <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Total: $ {item.total_amount}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'shipped' ? '#E3F2FD' : (item.status === 'pending' ? '#FFF9C4' : '#E8F5E9') }]}><Text style={{ fontSize: 10, fontWeight: 'bold', color: item.status === 'shipped' ? '#1E88E5' : (item.status === 'pending' ? '#FBC02D' : '#2E7D32') }}>{item.status.toUpperCase()}</Text></View>
        </TouchableOpacity>
      )} ListEmptyComponent={<Text style={styles.emptyMsg}>Aucune commande.</Text>} />

      {/* Create Manual Order Modal */}
      <Modal visible={showCreateOrderModal} transparent animationType="slide" onRequestClose={() => setShowCreateOrderModal(false)}>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Saisir une Commande</Text><TouchableOpacity onPress={() => setShowCreateOrderModal(false)}><Ionicons name="close" size={24} color="#000" /></TouchableOpacity></View>

          <Text style={styles.label}>Nom du client (via message)</Text>
          <TextInput style={styles.modalInput} placeholder="Ex: Jean Mukendi" value={createOrderForm.customerName} onChangeText={t => setCreateOrderForm({...createOrderForm, customerName: t})} />

          <Text style={styles.label}>Articles / Détails</Text>
          <TextInput style={[styles.modalInput, { height: 80 }]} placeholder="Ex: 2x iPhone 15, 1x Coque" multiline value={createOrderForm.items} onChangeText={t => setCreateOrderForm({...createOrderForm, items: t})} />

          <Text style={styles.label}>Montant total ($)</Text>
          <TextInput style={styles.modalInput} placeholder="2500" keyboardType="numeric" value={createOrderForm.totalAmount} onChangeText={t => setCreateOrderForm({...createOrderForm, totalAmount: t})} />

          <TouchableOpacity style={[styles.publishBtn, { backgroundColor: catColor, width: '100%' }]} onPress={handleCreateManualOrder}><Text style={styles.publishBtnText}>ENREGISTRER LA COMMANDE</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Order Edit Modal */}
      <Modal visible={showOrderModal} transparent animationType="slide" onRequestClose={() => setShowOrderModal(false)}>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Gérer la Commande</Text><TouchableOpacity onPress={() => setShowOrderModal(false)}><Ionicons name="close" size={24} color="#000" /></TouchableOpacity></View>

          <Text style={styles.label}>Statut de livraison</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
            {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(st => (
              <TouchableOpacity key={st} style={[styles.statusSelectBtn, orderForm.status === st && { backgroundColor: catColor, borderColor: catColor }]} onPress={() => setOrderForm({...orderForm, status: st})}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: orderForm.status === st ? '#fff' : colors.text.secondary }}>{st.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Numéro de suivi (Tracking)</Text>
          <TextInput style={styles.modalInput} placeholder="Ex: DHL-123456" value={orderForm.trackingNumber} onChangeText={t => setOrderForm({...orderForm, trackingNumber: t})} />

          <Text style={styles.label}>Notes internes / client</Text>
          <TextInput style={[styles.modalInput, { height: 80 }]} placeholder="Détails de l'expédition..." multiline value={orderForm.adminNotes} onChangeText={t => setOrderForm({...orderForm, adminNotes: t})} />

          <TouchableOpacity style={[styles.publishBtn, { backgroundColor: catColor, width: '100%' }]} onPress={handleUpdateOrder}><Text style={styles.publishBtnText}>METTRE À JOUR</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );

  const renderRequests = () => (
    <View style={styles.mainContent}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Demandes de Devis</Text>
      <FlatList data={requests} keyExtractor={item => item.id} showsVerticalScrollIndicator={true} persistentScrollbar={true} renderItem={({ item }) => (
        <View style={[styles.moduleCard, { backgroundColor: colors.surface }]}>
          <Image source={{ uri: getFullUrl(item.customer_avatar) || `https://ui-avatars.com/api/?name=${item.customer_name}` }} style={styles.moduleAvatar} />
          <View style={{ flex: 1 }}><Text style={[styles.moduleName, { color: colors.text.primary }]}>{item.customer_name}</Text><Text style={{ color: colors.text.secondary, fontSize: 12 }} numberOfLines={1}>{item.details?.description || 'Sans description'}</Text></View>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: catColor }]} onPress={() => { setSelectedRequest(item); setShowQuoteModal(true); }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>RÉPONDRE</Text></TouchableOpacity>
        </View>
      )} ListEmptyComponent={<Text style={styles.emptyMsg}>Aucune demande.</Text>} />
      <Modal visible={showQuoteModal} transparent animationType="slide" onRequestClose={() => setShowQuoteModal(false)}>
        <View style={styles.modalOverlay}><View style={styles.modalContent}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Créer un Devis</Text><TouchableOpacity onPress={() => setShowQuoteModal(false)}><Ionicons name="close" size={24} color="#000" /></TouchableOpacity></View><Text style={styles.label}>Titre du devis</Text><TextInput style={styles.modalInput} placeholder="Installation de..." value={quoteForm.title} onChangeText={t => setQuoteForm({...quoteForm, title: t})} /><Text style={styles.label}>Montant total ($)</Text><TextInput style={styles.modalInput} placeholder="500" keyboardType="numeric" value={quoteForm.amount} onChangeText={t => setQuoteForm({...quoteForm, amount: t})} /><Text style={styles.label}>Notes</Text><TextInput style={[styles.modalInput, { height: 80 }]} placeholder="Détails techniques..." multiline value={quoteForm.notes} onChangeText={t => setQuoteForm({...quoteForm, notes: t})} /><TouchableOpacity style={[styles.publishBtn, { backgroundColor: catColor, width: '100%' }]} onPress={handleCreateQuote}><Text style={styles.publishBtnText}>ENVOYER AU CLIENT</Text></TouchableOpacity></View></View>
      </Modal>
    </View>
  );

  const renderStock = () => (
    <View style={styles.mainContent}>
      <View style={styles.moduleHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary, marginBottom: 0 }]}>Inventaire Boutique</Text>
        <TouchableOpacity style={{ backgroundColor: catColor, padding: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }} onPress={() => { setInventoryForm({ itemName: '', quantity: '', price: '', action: 'create', reason: '' }); setShowInventoryModal(true); }}>
          <Ionicons name="add-circle" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 5, fontSize: 12 }}>AJOUTER</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabItem, stockTab === 'current' && { borderBottomColor: catColor, borderBottomWidth: 3 }]} onPress={() => setStockTab('current')}><Text style={[styles.tabText, { color: stockTab === 'current' ? catColor : colors.text.secondary }]}>STOCK ACTUEL</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, stockTab === 'logs' && { borderBottomColor: catColor, borderBottomWidth: 3 }]} onPress={() => setStockTab('logs')}><Text style={[styles.tabText, { color: stockTab === 'logs' ? catColor : colors.text.secondary }]}>HISTORIQUE (E/S)</Text></TouchableOpacity>
      </View>
      {stockTab === 'current' ? (
        <FlatList data={inventory} keyExtractor={item => item.id} showsVerticalScrollIndicator={true} persistentScrollbar={true} renderItem={({ item }) => (
          <View style={[styles.moduleCard, { backgroundColor: colors.surface }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.moduleName, { color: colors.text.primary }]}>{item.item_name}</Text>
              <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Prix: $ {item.price} • Quantité: {item.quantity}</Text>
              {item.quantity <= 0 && <Text style={{ color: colors.danger, fontSize: 10, fontWeight: 'bold' }}>TERMINÉ / RUPTURE</Text>}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.stockActionBtn} onPress={() => { setInventoryForm({ itemName: item.item_name, quantity: '1', price: item.price.toString(), action: 'add', reason: 'Réapprovisionnement' }); handleUpdateInventory(); }}><Ionicons name="add" size={20} color="#4CAF50" /></TouchableOpacity>
              <TouchableOpacity style={styles.stockActionBtn} onPress={() => { setInventoryForm({ itemName: item.item_name, quantity: '1', price: item.price.toString(), action: 'remove', reason: 'Vente directe' }); handleUpdateInventory(); }}><Ionicons name="remove" size={20} color="#F44336" /></TouchableOpacity>
              <TouchableOpacity style={styles.stockActionBtn} onPress={() => handleDeleteInventoryItem(item.id)}><Ionicons name="trash-outline" size={18} color={colors.text.disabled} /></TouchableOpacity>
            </View>
          </View>
        )} ListEmptyComponent={<Text style={styles.emptyMsg}>Aucun produit.</Text>} />
      ) : (
        <FlatList data={inventoryLogs} keyExtractor={item => item.id} showsVerticalScrollIndicator={true} persistentScrollbar={true} renderItem={({ item }) => (
          <View style={[styles.moduleCard, { backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: item.type === 'in' ? '#4CAF50' : '#F44336' }]}><View style={{ flex: 1 }}><Text style={[styles.moduleName, { color: colors.text.primary }]}>{item.item_name}</Text><Text style={{ color: colors.text.secondary, fontSize: 11 }}>{item.reason || (item.type === 'in' ? 'Entrée' : 'Sortie')}</Text><Text style={{ color: colors.text.disabled, fontSize: 10, marginTop: 2 }}>{new Date(item.created_at).toLocaleString()}</Text></View><Text style={{ fontWeight: 'bold', color: item.type === 'in' ? '#4CAF50' : '#F44336' }}>{item.type === 'in' ? '+' : '-'}{item.quantity}</Text></View>
        )} ListEmptyComponent={<Text style={styles.emptyMsg}>Aucun mouvement.</Text>} />
      )}
      <Modal visible={showInventoryModal} transparent animationType="slide" onRequestClose={() => setShowInventoryModal(false)}>
        <View style={styles.modalOverlay}><View style={styles.modalContent}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Nouveau Produit</Text><TouchableOpacity onPress={() => setShowInventoryModal(false)}><Ionicons name="close" size={24} color="#000" /></TouchableOpacity></View><Text style={styles.label}>Nom du produit</Text><TextInput style={styles.modalInput} placeholder="Ex: iPhone 15 Pro" value={inventoryForm.itemName} onChangeText={t => setInventoryForm({...inventoryForm, itemName: t})} /><View style={{ flexDirection: 'row', gap: 15 }}><View style={{ flex: 1 }}>
                <Text style={styles.label}>Quantité</Text>
                <TextInput style={styles.modalInput} placeholder="10" keyboardType="numeric" value={inventoryForm.quantity} onChangeText={t => setInventoryForm({...inventoryForm, quantity: t})} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Prix ($)</Text>
                <TextInput style={styles.modalInput} placeholder="999" keyboardType="numeric" value={inventoryForm.price} onChangeText={t => setInventoryForm({...inventoryForm, price: t})} />
              </View></View><TouchableOpacity style={[styles.publishBtn, { backgroundColor: catColor, width: '100%', marginTop: 10 }]} onPress={handleUpdateInventory}><Text style={styles.publishBtnText}>ENREGISTRER</Text></TouchableOpacity></View></View>
      </Modal>
    </View>
  );

  const renderMessages = () => (
    <View style={styles.mainContent}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Messages Clients</Text>
      <FlatList data={chats} keyExtractor={item => item.id} showsVerticalScrollIndicator={true} persistentScrollbar={true} renderItem={({ item }) => (
        <TouchableOpacity style={[styles.moduleCard, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate('MarketChat', { conversationId: item.id, name: item.other_name, avatarUrl: item.other_avatar })}><Image source={{ uri: getFullUrl(item.other_avatar) || `https://ui-avatars.com/api/?name=${item.other_name}` }} style={styles.moduleAvatar} /><View style={{ flex: 1 }}><Text style={[styles.moduleName, { color: colors.text.primary }]}>{item.other_name}</Text><Text style={{ color: colors.text.secondary, fontSize: 12 }} numberOfLines={1}>{item.last_message || 'Nouvelle discussion commerciale'}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.text.disabled} /></TouchableOpacity>
      )} ListEmptyComponent={<Text style={styles.emptyMsg}>Aucun message.</Text>} />
    </View>
  );

  const renderDocuments = () => (
    <View style={styles.mainContent}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Mes Documents (Portfolio)</Text>
      <FlatList data={documents} keyExtractor={item => item.id} showsVerticalScrollIndicator={true} persistentScrollbar={true} renderItem={({ item }) => (
        <View style={[styles.moduleCard, { backgroundColor: colors.surface }]}><View style={[styles.statIconCircle, { backgroundColor: catColor + '10', marginRight: 15 }]}><Ionicons name="document-attach" size={20} color={catColor} /></View><View style={{ flex: 1 }}><Text style={[styles.moduleName, { color: colors.text.primary }]}>{item.name}</Text><Text style={{ color: colors.text.secondary, fontSize: 11 }}>{item.file_size} • {new Date(item.created_at).toLocaleDateString()}</Text></View><TouchableOpacity onPress={() => Linking.openURL(getFullUrl(item.file_url)!)}><Ionicons name="download-outline" size={20} color={colors.text.secondary} /></TouchableOpacity></View>
      )} ListEmptyComponent={<Text style={styles.emptyMsg}>Aucun document.</Text>} />
      <TouchableOpacity style={[styles.publishBtn, { backgroundColor: catColor, marginTop: 20 }]} onPress={handlePickDocument}><Text style={styles.publishBtnText}>AJOUTER UN DOCUMENT</Text></TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        {!isWide && <TouchableOpacity style={styles.headerMenuButton} accessibilityLabel="Ouvrir le menu Market" onPress={() => setMenuVisible(true)}><Ionicons name="menu" size={24} color={colors.text.primary} /></TouchableOpacity>}
        <Image source={require('../../assets/AcemiaLogo.png')} style={styles.headerLogo} resizeMode="contain" />
        <View style={styles.headerInfo}>
          <Text style={[styles.brandTitle, { color: colors.text.primary }]}>Acemia Market</Text>
          <Text numberOfLines={1} style={[styles.businessName, { color: colors.text.secondary }]}>{business.business_name} · <Text style={{ color: catColor }}>{category}</Text></Text>
        </View>
        <TouchableOpacity style={styles.headerExitButton} onPress={() => navigation.goBack()} accessibilityLabel="Fermer le tableau de bord">
          <Ionicons name="close" size={22} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
      <View style={styles.contentWrapper}>
        {isWide && renderSidebar()}
        <View style={{ flex: 1, minWidth: 0 }}>{activeMenu === 'overview' && renderOverview()}{activeMenu === 'publish' && renderPublishForm()}{activeMenu === 'orders' && renderOrders()}{activeMenu === 'requests' && renderRequests()}{activeMenu === 'stock' && renderStock()}{activeMenu === 'messages' && renderMessages()}{activeMenu === 'docs' && renderDocuments()}</View>
      </View>
      <Modal visible={menuVisible && !isWide} transparent animationType="slide" onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.drawerOverlay}>
          {renderSidebar()}
          <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={() => setMenuVisible(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: any, normalize: any, factor: number, isDark: boolean) {
  return StyleSheet.create({
  container: { flex: 1 }, centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: normalize(10), paddingHorizontal: normalize(16), paddingVertical: normalize(11), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.surface },
  headerMenuButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: isDark ? '#ffffff10' : '#00000008' },
  headerLogo: { width: 40, height: 40 },
  headerInfo: { flex: 1, minWidth: 0 }, brandTitle: { fontSize: normalize(15, factor), fontWeight: '900' }, businessName: { fontSize: normalize(12, factor), fontWeight: '600', marginTop: 2 },
  headerExitButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: isDark ? '#ffffff10' : '#00000008' },
  contentWrapper: { flex: 1, flexDirection: 'row' },
  sidebar: { borderRightWidth: StyleSheet.hairlineWidth, height: '100%' },
  sidebarBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: normalize(14), paddingVertical: normalize(16), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  sidebarLogo: { width: 38, height: 38 },
  sidebarBrandName: { fontSize: normalize(14, factor), fontWeight: '900' },
  sidebarBusinessName: { fontSize: normalize(11, factor), fontWeight: '600', marginTop: 2 },
  closeSidebarButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', minHeight: normalize(48), borderRadius: normalize(14), marginHorizontal: normalize(10), marginBottom: normalize(5), paddingHorizontal: normalize(12) },
  sidebarLabel: { marginLeft: normalize(10), fontSize: normalize(12, factor), fontWeight: '700' },
  mainContent: { flex: 1, padding: normalize(16), width: '100%', maxWidth: 1120, alignSelf: 'center' },
  dashboardHero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: normalize(18), borderWidth: 1, borderRadius: normalize(20), marginBottom: normalize(18) },
  dashboardHeader: { flex: 1, minWidth: 0, marginBottom: 0, paddingRight: normalize(10) },
  heroAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, borderRadius: 14, gap: 4 },
  heroActionText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  sectionTitle: { fontSize: normalize(18, factor), fontWeight: '800', marginBottom: normalize(16) },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: normalize(16), gap: normalize(8) },
  statCard: { width: '48%', padding: normalize(15), borderRadius: normalize(20), elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8 },
  statIconCircle: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statLabel: { fontSize: normalize(10, factor), color: '#999', marginBottom: 5, fontWeight: 'bold' },
  statValue: { fontSize: normalize(22, factor), fontWeight: '900' },
  chartPlaceholder: { width: '100%', height: normalize(160), borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 1 },
  activityList: { width: '100%', borderRadius: normalize(25), marginTop: 10, elevation: 1 },
  formCard: { padding: 20, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, elevation: 1 },
  label: { fontSize: normalize(10, factor), fontWeight: 'bold', color: '#999', marginBottom: 8, marginTop: 15, textTransform: 'uppercase' },
  input: { padding: normalize(15), borderRadius: 14, borderWidth: 1, borderColor: colors.border, fontSize: normalize(15, factor), marginTop: 2 },
  imagePreviewWrapper: { marginRight: 10, position: 'relative' }, smallPreview: { width: normalize(100), height: normalize(100), borderRadius: 20 }, removeImgBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: '#fff', borderRadius: 10, elevation: 2 }, addImageBtn: { width: normalize(100), height: normalize(100), borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  publishBtn: { marginTop: normalize(18), minHeight: 54, paddingHorizontal: normalize(18), paddingVertical: normalize(15), borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 2, width: '100%' }, publishBtnText: { color: '#fff', fontWeight: '900', fontSize: normalize(14, factor), letterSpacing: 0.3 },
  moduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  moduleCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 18, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: 8 }, moduleAvatar: { width: 44, height: 44, borderRadius: 14, marginRight: 8 }, moduleName: { fontWeight: '800', fontSize: 14 }, statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }, actionBtn: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 12 },
  tabBar: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee' }, tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center' }, tabText: { fontWeight: 'bold', fontSize: 11 },
  stockActionBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: isDark ? '#ffffff10' : 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center' },
  emptyMsg: { textAlign: 'center', color: '#999', marginTop: 50, fontStyle: 'italic' },
  drawerOverlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.42)' },
  drawerBackdrop: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end', paddingTop: 20 },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 24, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: colors.text.primary },
  modalInput: { backgroundColor: isDark ? '#222733' : '#f4f6fa', borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 15, marginBottom: 14, color: colors.text.primary, fontSize: 16, minHeight: 52 },
  modalBtn: { minHeight: 52, padding: 15, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flex: 1 },
  statusSelectBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
});
}
