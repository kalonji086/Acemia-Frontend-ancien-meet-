import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';
import { SOCKET_URL } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import SocketService from '../services/socket.service';

export default function StatusScreen() {
  const { colors: themeColors, isDark, normalize } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const [userStatuses, setUserStatuses] = useState<any[]>([]);
  const [myStatuses, setMyStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription.remove();
  }, []);

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;

    const baseUrl = SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL;
    const path = url.startsWith('/') ? url : `/${url}`;

    return `${baseUrl}${path}`;
  };

  const handlePickStatusImage = async () => {
    try {
      Alert.alert(
        'Ajouter un statut',
        'Choisissez une source',
        [
          {
            text: 'Prendre une photo',
            onPress: async () => {
              try {
                const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
                if (cameraStatus !== 'granted') {
                  Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à votre caméra.');
                  return;
                }
                
                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  aspect: [9, 16], // Format story
                  quality: 0.8,
                });

                if (!result.canceled) {
                  navigation.navigate('CreateStatus', { imageUri: result.assets[0].uri });
                }
              } catch (error) {
                console.error('Camera error:', error);
                Alert.alert('Erreur', 'Impossible d\'accéder à la caméra.');
              }
            }
          },
          {
            text: 'Choisir depuis la galerie',
            onPress: async () => {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour accéder à vos photos.');
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [9, 16], // Format story
                quality: 0.8,
              });

              if (!result.canceled) {
                navigation.navigate('CreateStatus', { imageUri: result.assets[0].uri });
              }
            }
          },
          {
            text: 'Annuler',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('handlePickStatusImage error:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      
      // Écouter les mises à jour de status en temps réel
      const handleStatusUpdate = (data: any) => {
        if (data && data.user_id !== currentUser?.id) {
          // Rafraîchir les données
          fetchData();
        }
      };
      
      SocketService.on('status:updated', handleStatusUpdate);
      SocketService.on('status:deleted', handleStatusUpdate);
      
      return () => {
        SocketService.off('status:updated', handleStatusUpdate);
        SocketService.off('status:deleted', handleStatusUpdate);
      };
    }, [currentUser?.id])
  );

  const fetchData = async () => {
    try {
      const user = await apiService.getCurrentUser();
      setCurrentUser(user);

      const response = await apiService.getStatuses();
      if (response.success) {
        const allStatuses = response.data;
        
        // Filtrer les status expirés (24h comme WhatsApp)
        const now = new Date();
        const filteredStatuses = allStatuses.map((userStatus: any) => {
          const validStatuses = userStatus.statuses.filter((status: any) => {
            const statusDate = new Date(status.created_at);
            const hoursDiff = (now.getTime() - statusDate.getTime()) / (1000 * 60 * 60);
            return hoursDiff <= 24; // Status valide pendant 24h
          });
          
          return {
            ...userStatus,
            statuses: validStatuses,
            hasValidStatuses: validStatuses.length > 0
          };
        }).filter((userStatus: any) => userStatus.hasValidStatuses);
        
        const others = filteredStatuses.filter((s: any) => s.user_id !== user?.id && !s.is_global_admin);
        const mine = filteredStatuses.find((s: any) => s.user_id === user?.id);

        setUserStatuses(others);
        setMyStatuses(mine ? mine.statuses : []);
        
        // Supprimer automatiquement les status expirés côté client
        if (mine && mine.statuses.length === 0) {
          // Optionnel: notifier le backend pour suppression
        }
      }
    } catch (error) {
      console.error('Error fetching statuses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const styles = createStyles(themeColors, normalize, isDark);

  const renderStatusCard = (item: any, isMine = false) => {
    const lastStatus = item.statuses && item.statuses.length > 0
      ? item.statuses[item.statuses.length - 1]
      : null;

    // Vérifier s'il y a des status non vus
    const hasUnread = !isMine && item.statuses?.some((s: any) => !s.is_viewed);

    // Calcul dynamique de la largeur pour tablettes
    const cardWidth = screenWidth > 600 ? (screenWidth - 60) / 4 : normalize(110);
    const cardHeight = screenWidth > 600 ? cardWidth * 1.5 : normalize(170);

    return (
      <TouchableOpacity
        style={[styles.squareCard, { width: cardWidth, height: cardHeight }]}
        onPress={() => {
          if (isMine && (!item.statuses || item.statuses.length === 0)) {
            navigation.navigate('CreateStatus');
          } else {
            navigation.navigate('ViewStatus', { userStatus: item });
          }
        }}
      >
        <View style={[styles.cardBg, { backgroundColor: isDark ? '#333' : '#e1e1e1', borderRadius: 12, overflow: 'hidden' }]}>
          {lastStatus?.type === 'image' ? (
            <Image
              source={{ uri: getFullUrl(lastStatus.media_url) }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : lastStatus?.type === 'text' ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: lastStatus.background_color || themeColors.primary, justifyContent: 'center', alignItems: 'center', padding: 10 }]}>
              <Text style={styles.previewText} numberOfLines={4}>{lastStatus.content}</Text>
            </View>
          ) : (
            <Image
              source={{ uri: getFullUrl(item.avatar_url) || `https://ui-avatars.com/api/?name=${item.full_name}&background=random` }}
              style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
              resizeMode="cover"
            />
          )}

          <View style={styles.cardOverlay}>
            <View style={[
              styles.cardAvatarContainer,
              {
                borderColor: hasUnread ? themeColors.primary : 'rgba(255,255,255,0.5)',
                borderWidth: item.statuses?.length > 0 ? 2.5 : 0
              }
            ]}>
              <Image
                source={{ uri: getFullUrl(item.avatar_url) || `https://ui-avatars.com/api/?name=${item.full_name || 'Me'}&background=random` }}
                style={styles.cardAvatar}
              />
              {isMine && (!item.statuses || item.statuses.length === 0) && (
                <View style={[styles.addIconSmall, { backgroundColor: themeColors.primary }]}>
                  <Ionicons name="add" size={12} color="#fff" />
                </View>
              )}
            </View>
            <Text style={styles.cardUserName} numberOfLines={1}>
              {isMine ? 'Mon statut' : item.full_name}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const insets = useSafeAreaInsets();
  const [marketFeed, setMarketFeed] = useState<any[]>([]);

  useEffect(() => {
    fetchMarketFeed();
  }, []);

  const fetchMarketFeed = async () => {
    try {
      const res = await apiService.getMarketFeed();
      if (res.success) setMarketFeed(res.data);
    } catch (e) { console.error(e); }
  };

  const renderMarketItem = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.marketCard, { backgroundColor: themeColors.surface }]}
      onPress={() => navigation.navigate('BusinessPublicProfile', { businessId: item.business_id })}
    >
      <View style={styles.marketHeader}>
        <Image source={{ uri: getFullUrl(item.logo_url) || `https://ui-avatars.com/api/?name=${item.business_name}` }} style={styles.marketLogo} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.marketName, { color: themeColors.text.primary }]}>{item.business_name}</Text>
            <Ionicons name="checkmark-circle" size={14} color={themeColors.primary} style={{ marginLeft: 4 }} />
          </View>
          <Text style={[styles.marketCategory, { color: themeColors.text.secondary }]}>{item.category} · ID NAT: {item.national_id_number || 'Vérifié'}</Text>
        </View>
      </View>
      {item.images?.[0] && (
        <Image source={{ uri: getFullUrl(item.images[0]) }} style={styles.marketImage} />
      )}
      <View style={styles.marketContent}>
        <Text style={[styles.marketTitle, { color: themeColors.text.primary }]}>{item.title}</Text>
        <Text style={[styles.marketText, { color: themeColors.text.secondary }]} numberOfLines={2}>{item.content}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={{ height: insets.top, backgroundColor: themeColors.primary }} />
      <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[themeColors.primary]} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.statusSection}>
          <Text style={[styles.sectionTitleMain, { color: themeColors.text.primary }]}>Statuts</Text>

          <ScrollView
            horizontal={screenWidth <= 600}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.horizontalScroll,
              screenWidth > 600 && { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }
            ]}
          >
            {/* Mon Statut */}
            {renderStatusCard({
              user_id: currentUser?.id,
              full_name: 'Moi',
              statuses: myStatuses,
              avatar_url: currentUser?.avatar
            }, true)}

            {/* Status des autres */}
            {userStatuses.map((item) => (
              <React.Fragment key={item.user_id}>
                {renderStatusCard(item)}
              </React.Fragment>
            ))}

            {userStatuses.length === 0 && !loading && (
              <View style={styles.emptyCardPlaceholder}>
                <Text style={styles.emptyCardText}>Aucun autre statut</Text>
              </View>
            )}
          </ScrollView>
        </View>

        <View style={[styles.sectionHeader, { backgroundColor: isDark ? '#333' : '#F0F2F5', marginTop: 20 }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>Toutes les mises à jour</Text>
        </View>

        {userStatuses.length > 0 ? (
          userStatuses.map((item) => (
            <TouchableOpacity
              key={item.user_id}
              style={styles.statusItemRow}
              onPress={() => navigation.navigate('ViewStatus', { userStatus: item })}
            >
              <View style={[styles.avatarRing, { borderColor: themeColors.primary }]}>
                <Image
                  source={{ uri: getFullUrl(item.avatar_url) || `https://ui-avatars.com/api/?name=${item.full_name}&background=random` }}
                  style={styles.avatar}
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.userName, { color: themeColors.text.primary }]}>{item.full_name}</Text>
                <Text style={[styles.time, { color: themeColors.text.secondary }]}>
                  {(() => {
                    const lastStatus = item.statuses[item.statuses.length - 1];
                    return new Date(lastStatus.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  })()}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={60} color={themeColors.text.disabled} />
            <Text style={[styles.emptyText, { color: themeColors.text.secondary, marginTop: 10 }]}>
              Les statuts de vos contacts s'afficheront ici.
            </Text>
          </View>
        )}

        {/* Section Market (Phase 3) */}
        <View style={[styles.sectionHeader, { backgroundColor: isDark ? '#333' : '#F0F2F5', marginTop: 30 }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>Découvertes Market</Text>
        </View>

        {marketFeed && marketFeed.length > 0 ? (
          <View style={{ padding: 15 }}>
            {marketFeed.map((item) => {
              if (!item || !item.id) return null;
              return (
                <React.Fragment key={item.id}>
                  {renderMarketItem({ item })}
                </React.Fragment>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={{ color: themeColors.text.disabled }}>Aucune annonce market pour le moment.</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fabEdit}
        onPress={() => navigation.navigate('CreateStatus')}
      >
        <Ionicons name="pencil" size={normalize(20)} color="#455A64" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.fabCamera, { backgroundColor: themeColors.primary }]}
        onPress={handlePickStatusImage}
      >
        <Ionicons name="camera" size={normalize(24)} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: any, normalize: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  statusSection: {
    paddingVertical: 15,
  },
  sectionTitleMain: {
    fontSize: normalize(20),
    fontWeight: 'bold',
    marginLeft: 15,
    marginBottom: 15,
  },
  horizontalScroll: {
    paddingLeft: 15,
    paddingRight: 15,
  },
  squareCard: {
    width: normalize(110),
    height: normalize(170),
    marginRight: 10,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardBg: {
    flex: 1,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 10,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  cardAvatarContainer: {
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    padding: 2,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: normalize(15),
  },
  cardUserName: {
    color: '#fff',
    fontSize: normalize(12),
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 5,
  },
  addIconSmall: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  textStatusPreview: {
    ...StyleSheet.absoluteFillObject,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    color: '#fff',
    fontSize: normalize(10),
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyCardPlaceholder: {
    width: normalize(110),
    height: normalize(170),
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.text.disabled,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
  },
  emptyCardText: {
    color: colors.text.disabled,
    fontSize: normalize(10),
    textAlign: 'center',
  },
  statusItemRow: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.divider,
  },
  avatarRing: {
    width: normalize(56),
    height: normalize(56),
    borderRadius: normalize(28),
    borderWidth: 2,
    padding: 2,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: normalize(48),
    height: normalize(48),
    borderRadius: normalize(24),
  },
  textContainer: {
    flex: 1,
  },
  userName: {
    fontSize: normalize(16),
    fontWeight: 'bold',
  },
  time: {
    fontSize: normalize(14),
    marginTop: 2,
  },
  sectionHeader: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: normalize(14),
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: normalize(14),
  },
  fabCamera: {
    position: 'absolute',
    bottom: normalize(25),
    right: normalize(20),
    width: normalize(56),
    height: normalize(56),
    borderRadius: normalize(28),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabEdit: {
    position: 'absolute',
    bottom: normalize(100),
    right: normalize(25),
    width: normalize(46),
    height: normalize(46),
    borderRadius: normalize(23),
    backgroundColor: isDark ? '#444' : '#e9edef',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  marketCard: {
    width: '100%',
    borderRadius: normalize(20),
    marginBottom: normalize(20),
    padding: normalize(15),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5
  },
  marketHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: normalize(12) },
  marketLogo: { width: normalize(40), height: normalize(40), borderRadius: normalize(12), marginRight: normalize(12) },
  marketName: { fontSize: normalize(16), fontWeight: 'bold' },
  marketCategory: { fontSize: normalize(11) },
  marketImage: { width: '100%', height: normalize(180), borderRadius: normalize(12), marginBottom: normalize(12) },
  marketContent: {},
  marketTitle: { fontSize: normalize(15), fontWeight: 'bold', marginBottom: normalize(4) },
  marketText: { fontSize: normalize(13), lineHeight: normalize(18) }
});

