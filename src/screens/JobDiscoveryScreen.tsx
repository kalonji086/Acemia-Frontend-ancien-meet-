import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Image, TextInput, ActivityIndicator, Alert,
  ScrollView
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
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await apiService.getAllJobs();
      if (res.success) {
        setJobs(res.data);
      } else {
        // Fallback pour démo si l'API ne renvoie rien
        setJobs([
          {
            id: '1',
            title: 'Directeur Commercial',
            company: 'Bralima RDC',
            employer_id: 'user1',
            location: 'Kinshasa, Gombe',
            job_type: 'Full-time',
            salary_range: 'Négociable',
            category: 'sales',
            created_at: new Date().toISOString(),
            logo: 'https://logo.clearbit.com/bralima.cd'
          },
          {
            id: '2',
            title: 'Comptable Junior',
            company: 'Rawbank',
            employer_id: 'user2',
            location: 'Lubumbashi',
            job_type: 'CDI',
            salary_range: '1200$ - 1500$',
            category: 'finance',
            created_at: new Date().toISOString(),
            logo: 'https://logo.clearbit.com/rawbank.com'
          },
          {
            id: '3',
            title: 'Développeur React Native',
            company: 'Together Tech',
            employer_id: 'user3',
            location: 'Remote',
            job_type: 'Contract',
            salary_range: '2500$+',
            category: 'tech',
            created_at: new Date().toISOString(),
            logo: null
          }
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           job.company.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || job.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [jobs, searchQuery, activeCategory]);

  const renderJobItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => navigation.navigate('JobDetails', { jobId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.companyLogo, { backgroundColor: colors.background }]}>
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={styles.logoImage} />
          ) : (
            <Briefcase size={24} color={colors.primary} />
          )}
        </View>
        <View style={styles.jobMainInfo}>
          <Text style={[styles.jobTitle, { color: colors.text.primary }]}>{item.title}</Text>
          <Text style={[styles.companyName, { color: colors.primary }]}>{item.company}</Text>
        </View>
      </View>

      <View style={styles.tagsRow}>
        <View style={[styles.tag, { backgroundColor: colors.background }]}>
          <MapPin size={12} color={colors.text.secondary} />
          <Text style={[styles.tagText, { color: colors.text.secondary }]}>{item.location}</Text>
        </View>
        <View style={[styles.tag, { backgroundColor: colors.background }]}>
          <Clock size={12} color={colors.text.secondary} />
          <Text style={[styles.tagText, { color: colors.text.secondary }]}>{item.job_type || item.type}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.cardFooter}>
        <Text style={[styles.timePosted, { color: colors.text.disabled }]}>
          {item.salary_range || 'Salaire non spécifié'}
        </Text>
        <ChevronRight size={20} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerTop}>
           <TouchableOpacity onPress={() => navigation.goBack()}>
             <ArrowLeft size={24} color={colors.text.primary} />
           </TouchableOpacity>
           <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Opportunités</Text>
           <View style={{ width: 24 }} />
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.background }]}>
          <Search size={20} color={colors.text.disabled} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
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
              <Text style={[styles.categoryText, { color: activeCategory === cat.id ? '#fff' : colors.text.secondary }]}>{cat.name}</Text>
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
          data={filteredJobs}
          renderItem={renderJobItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Briefcase size={60} color={colors.text.disabled} />
              <Text style={{ marginTop: 20, color: colors.text.secondary }}>Aucune offre correspondante.</Text>
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
  header: { padding: 20, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 50,
    borderRadius: 15,
    marginBottom: 15
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  categoriesScroll: { flexDirection: 'row' },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 10, height: 40 },
  categoryText: { marginLeft: 8, fontSize: 13, fontWeight: '600' },
  listContent: { padding: 20 },
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
  jobTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 2 },
  companyName: { fontSize: 14, fontWeight: '600' },
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
  tagText: { fontSize: 11, fontWeight: '600', marginLeft: 4 },
  divider: { height: 1, width: '100%', marginBottom: 15 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timePosted: { fontSize: 12, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 100 }
});

