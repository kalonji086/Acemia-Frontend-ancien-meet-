import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Image, ActivityIndicator, Alert,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Briefcase, MapPin, Clock, ChevronRight, ArrowLeft, Plus } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';
import { SOCKET_URL } from '../utils/constants';

export default function MyJobsScreen({ navigation }: any) {
  const { colors, normalize, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;
  const numColumns = isTablet ? 2 : 1;

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    fetchMyJobs();
  }, []);

  const fetchMyJobs = async () => {
    try {
      const res = await apiService.getMyJobs();
      if (res.success) {
        setJobs(res.data);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de charger vos offres.');
    } finally {
      setLoading(false);
    }
  };

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http')) return url;
    return `${SOCKET_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const renderJobItem = ({ item }: { item: any }) => {
    if (!item) return null;
    return (
      <TouchableOpacity
        style={[
          styles.jobCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isTablet && { width: (windowWidth - normalize(60)) / 2, marginHorizontal: 5 }
        ]}
        onPress={() => navigation.navigate('JobDetails', { jobId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.companyLogo, { backgroundColor: colors.background }]}>
            {item.company_logo ? (
              <Image source={{ uri: getFullUrl(item.company_logo)! }} style={styles.logoImage} />
            ) : (
              <Briefcase size={normalize(24)} color={colors.primary} />
            )}
          </View>
          <View style={styles.jobMainInfo}>
            <Text style={[styles.jobTitle, { color: colors.text.primary, fontSize: normalize(17) }]} numberOfLines={1}>{item.title || "Offre sans titre"}</Text>
            <Text style={[styles.jobStatus, { color: (item.status === 'active' || !item.status) ? '#4CAF50' : '#FF9800', fontSize: normalize(12) }]}>
              ● {(item.status === 'active' || !item.status) ? 'En ligne' : item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.tagsRow}>
          <View style={[styles.tag, { backgroundColor: colors.background }]}>
            <MapPin size={12} color={colors.text.secondary} />
            <Text style={[styles.tagText, { color: colors.text.secondary, fontSize: normalize(11) }]}>{item.location || "N/C"}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.background }]}>
            <Clock size={12} color={colors.text.secondary} />
            <Text style={[styles.tagText, { color: colors.text.secondary, fontSize: normalize(11) }]}>{item.job_type || "N/C"}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.cardFooter}>
          <Text style={[styles.timePosted, { color: colors.text.disabled, fontSize: normalize(12) }]}>
             Publié le {item.created_at ? new Date(item.created_at).toLocaleDateString() : "--/--/----"}
          </Text>
          <ChevronRight size={20} color={colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, paddingHorizontal: isTablet ? '5%' : 20 }]}>
        <View style={styles.headerTop}>
           <TouchableOpacity onPress={() => navigation.goBack()}>
             <ArrowLeft size={24} color={colors.text.primary} />
           </TouchableOpacity>
           <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: normalize(20) }]}>Mes Offres</Text>
           <TouchableOpacity onPress={() => navigation.navigate('CreateJobPosting')}>
             <Plus size={24} color={colors.primary} />
           </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          key={isTablet ? 'tablet' : 'phone'}
          data={jobs}
          renderItem={renderJobItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: isTablet ? '5%' : 20 }]}
          numColumns={numColumns}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchMyJobs}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Briefcase size={normalize(60)} color={colors.text.disabled} />
              <Text style={{ marginTop: 20, color: colors.text.secondary, fontSize: normalize(14), textAlign: 'center' }}>
                Vous n'avez pas encore publié d'offre d'emploi.
              </Text>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('CreateJobPosting')}
              >
                <Text style={styles.createBtnText}>Publier ma première offre</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingVertical: 20, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontWeight: 'bold' },
  listContent: { paddingVertical: 20 },
  jobCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  companyLogo: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden'
  },
  logoImage: { width: '100%', height: '100%' },
  jobMainInfo: { flex: 1 },
  jobTitle: { fontWeight: 'bold', marginBottom: 2 },
  jobStatus: { fontWeight: 'bold' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 5
  },
  tagText: { fontWeight: '600', marginLeft: 4 },
  divider: { height: 1, width: '100%', marginBottom: 15 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timePosted: { fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  createBtn: { marginTop: 30, paddingHorizontal: 25, paddingVertical: 15, borderRadius: 15 },
  createBtnText: { color: '#fff', fontWeight: 'bold' }
});
