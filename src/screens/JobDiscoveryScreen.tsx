import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Image, TextInput, ActivityIndicator, Alert,
  ScrollView, useWindowDimensions
} from 'react-native';
import { Search, Filter, MapPin, Briefcase, DollarSign, Clock, ChevronRight, LayoutGrid, Zap, Monitor, HeartPulse, Hammer, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

const CATEGORIES = [
  { id: 'all', name: 'Tous', icon: <LayoutGrid size={16} /> },
  { id: 'tech', name: 'Tech', icon: <Monitor size={16} /> },
  { id: 'sales', name: 'Vente', icon: <Zap size={16} /> },
  { id: 'health', name: 'Santé', icon: <HeartPulse size={16} /> },
  { id: 'manual', name: 'Artisan', icon: <Hammer size={16} /> },
];

export default function JobDiscoveryScreen({ navigation }: any) {
  const { colors, normalize, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;
  const numColumns = isTablet ? 2 : 1;

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    fetchJobs();
  }, [activeCategory, searchQuery]);

  const fetchJobs = async () => {
    try {
      const res = await apiService.getAllJobs(activeCategory, searchQuery);
      if (res.success) {
        setJobs(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs; // Filter is now handled by API


  const renderJobItem = ({ item }: { item: any }) => (
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
          {item.company_logo || item.logo ? (
            <Image source={{ uri: item.company_logo || item.logo }} style={styles.logoImage} />
          ) : (
            <Briefcase size={normalize(24)} color={colors.primary} />
          )}
        </View>
        <View style={styles.jobMainInfo}>
          <Text style={[styles.jobTitle, { color: colors.text.primary, fontSize: normalize(17) }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.companyName, { color: colors.primary, fontSize: normalize(14) }]} numberOfLines={1}>{item.company_name || item.company || 'Entreprise'}</Text>
        </View>
      </View>

      <View style={styles.tagsRow}>
        <View style={[styles.tag, { backgroundColor: colors.background }]}>
          <MapPin size={12} color={colors.text.secondary} />
          <Text style={[styles.tagText, { color: colors.text.secondary, fontSize: normalize(11) }]}>{item.location}</Text>
        </View>
        <View style={[styles.tag, { backgroundColor: colors.background }]}>
          <Clock size={12} color={colors.text.secondary} />
          <Text style={[styles.tagText, { color: colors.text.secondary, fontSize: normalize(11) }]}>{item.job_type || item.type || 'Type non spécifié'}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.cardFooter}>
        <Text style={[styles.timePosted, { color: colors.text.disabled, fontSize: normalize(12) }]}>
          {item.salary_range || 'Salaire non spécifié'}
        </Text>
        <ChevronRight size={20} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, paddingHorizontal: isTablet ? '5%' : 20 }]}>
        <View style={styles.headerTop}>
           <TouchableOpacity onPress={() => navigation.goBack()}>
             <ArrowLeft size={24} color={colors.text.primary} />
           </TouchableOpacity>
           <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: normalize(20) }]}>Opportunités</Text>
           <View style={{ width: 24 }} />
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.background, borderRadius: normalize(15) }]}>
          <Search size={20} color={colors.text.disabled} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary, fontSize: normalize(16) }]}
            placeholder="Poste, entreprise..."
            placeholderTextColor={colors.text.disabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryBtn,
                { borderColor: colors.border },
                activeCategory === cat.id && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => setActiveCategory(cat.id)}
            >
              {React.cloneElement(cat.icon as React.ReactElement, { color: activeCategory === cat.id ? '#fff' : colors.text.secondary })}
              <Text style={[styles.categoryText, { color: activeCategory === cat.id ? '#fff' : colors.text.secondary, fontSize: normalize(13) }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          key={isTablet ? 'tablet' : 'phone'}
          data={filteredJobs}
          renderItem={renderJobItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: isTablet ? '5%' : 20 }]}
          numColumns={numColumns}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Briefcase size={normalize(60)} color={colors.text.disabled} />
              <Text style={{ marginTop: 20, color: colors.text.secondary, fontSize: normalize(14) }}>Aucune offre correspondante.</Text>
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
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontWeight: 'bold' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 15
  },
  searchInput: { flex: 1, marginLeft: 10 },
  categoriesScroll: { flexDirection: 'row' },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 10, height: 40 },
  categoryText: { marginLeft: 8, fontWeight: '600' },
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
  companyName: { fontWeight: '600' },
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
  emptyContainer: { alignItems: 'center', marginTop: 100 }
});

