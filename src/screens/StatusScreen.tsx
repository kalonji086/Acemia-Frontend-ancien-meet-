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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { SOCKET_URL } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function StatusScreen() {
  const { colors: themeColors, isDark, normalize } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const [userStatuses, setUserStatuses] = useState<any[]>([]);
  const [myStatuses, setMyStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${SOCKET_URL}${url}`;
  };

  const handlePickStatusImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour accéder à vos photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      navigation.navigate('CreateStatus', { imageUri: result.assets[0].uri });
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      const user = await apiService.getCurrentUser();
      setCurrentUser(user);

      const response = await apiService.getStatuses();
      if (response.success) {
        const allStatuses = response.data;
        const others = allStatuses.filter((s: any) => s.user_id !== user?.id);
        const mine = allStatuses.find((s: any) => s.user_id === user?.id);

        setUserStatuses(others);
        setMyStatuses(mine ? mine.statuses : []);
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

  const renderStatusItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.statusItem}
      onPress={() => navigation.navigate('ViewStatus', { userStatus: item })}
    >
      <View style={styles.ringContainer}>
        <View style={[styles.avatarRing, { borderColor: themeColors.secondary }]}>
          <Image
            source={{ uri: getFullUrl(item.avatar_url) || `https://ui-avatars.com/api/?name=${item.full_name}&background=random` }}
            style={styles.avatar}
          />
        </View>
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.userName, { color: themeColors.text.primary }]}>{item.full_name}</Text>
        <Text style={[styles.time, { color: themeColors.text.secondary }]}>
          {new Date(item.statuses[item.statuses.length - 1].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />

      <FlatList
        data={userStatuses}
        renderItem={renderStatusItem}
        keyExtractor={(item) => item.user_id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[themeColors.primary]} />
        }
        ListHeaderComponent={
          <>
            <TouchableOpacity
              style={styles.myStatusContainer}
              onPress={() => myStatuses.length > 0
                ? navigation.navigate('ViewStatus', { userStatus: { user_id: currentUser?.id, full_name: 'Mon statut', statuses: myStatuses, avatar_url: currentUser?.avatar } })
                : navigation.navigate('CreateStatus')
              }
            >
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: getFullUrl(currentUser?.avatar) || `https://ui-avatars.com/api/?name=${currentUser?.name || 'Me'}&background=random` }}
                  style={styles.avatar}
                />
                {myStatuses.length === 0 && (
                  <View style={[styles.addIcon, { backgroundColor: themeColors.secondary }]}>
                    <Ionicons name="add" size={18} color="#fff" />
                  </View>
                )}
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.title, { color: themeColors.text.primary }]}>Mon statut</Text>
                <Text style={[styles.subtitle, { color: themeColors.text.secondary }]}>
                  {myStatuses.length > 0 ? 'Appuyez pour voir vos mises à jour' : 'Appuyez pour ajouter un statut'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.sectionHeader, { backgroundColor: isDark ? '#333' : '#F0F2F5' }]}>
              <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>Mises à jour récentes</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>Aucune mise à jour de statut pour le moment.</Text>
            </View>
          ) : null
        }
      />

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
    </SafeAreaView>
  );
}

const createStyles = (colors: any, normalize: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  myStatusContainer: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  ringContainer: {
    marginRight: 15,
  },
  avatarRing: {
    width: normalize(60),
    height: normalize(60),
    borderRadius: normalize(30),
    borderWidth: 2,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: normalize(50),
    height: normalize(50),
    borderRadius: normalize(25),
  },
  addIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: normalize(22),
    height: normalize(22),
    borderRadius: normalize(11),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: isDark ? colors.background : '#fff',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: normalize(17),
    fontWeight: 'bold',
  },
  userName: {
    fontSize: normalize(17),
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: normalize(14),
    marginTop: 2,
  },
  time: {
    fontSize: normalize(14),
    marginTop: 2,
  },
  sectionHeader: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: normalize(14),
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: normalize(14),
  },
  fabCamera: {
    position: 'absolute',
    bottom: 30,
    right: 20,
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
    bottom: 100,
    right: 25,
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
  }
});
