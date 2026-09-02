import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Image, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { Search, Filter, MapPin, Briefcase, DollarSign, Clock, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function JobDiscoveryScreen({ navigation }: any) {
  const { colors, normalize, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Simuler le chargement des offres
    setTimeout(() => {
      setJobs([
        {
          id: '1',
          title: 'Directeur Commercial',
          company: 'Bralima RDC',
          location: 'Kinshasa, Gombe',
          type: 'Full-time',
          salary: 'Négociable',
          time: 'Il y a 3h',
          logo: 'https://logo.clearbit.com/bralima.cd'
        },
        {
          id: '2',
          title: 'Comptable Junior',
          company: 'Rawbank',
          location: 'Lubumbashi',
          type: 'CDI',
          salary: '1200$ - 1500$',
          time: 'Il y a 5h',
          logo: 'https://logo.clearbit.com/rawbank.com'
        },
        {
          id: '3',
          title: 'Développeur Mobile React Native',
          company: 'Together Tech',
          location: 'Remote / Kinshasa',
          type: 'Contract',
          salary: '2500$+',
          time: 'Hier',
          logo: null
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const renderJobItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => Alert.alert('Information', 'Cette fonctionnalité sera disponible prochainement.')}
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
        <TouchableOpacity style={styles.saveBtn}>
          <Clock size={18} color={colors.text.disabled} />
        </TouchableOpacity>
      </View>

      <View style={styles.tagsRow}>
        <View style={[styles.tag, { backgroundColor: colors.background }]}>
          <MapPin size={12} color={colors.text.secondary} />
          <Text style={[styles.tagText, { color: colors.text.secondary }]}>{item.location}</Text>
        </View>
        <View style={[styles.tag, { backgroundColor: colors.background }]}>
          <Clock size={12} color={colors.text.secondary} />
          <Text style={[styles.tagText, { color: colors.text.secondary }]}>{item.type}</Text>
        </View>
        <View style={[styles.tag, { backgroundColor: colors.background }]}>
          <DollarSign size={12} color={colors.text.secondary} />
          <Text style={[styles.tagText, { color: colors.text.secondary }]}>{item.salary}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.cardFooter}>
        <Text style={[styles.timePosted, { color: colors.text.disabled }]}>Publiée {item.time}</Text>
        <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.applyBtnText}>Postuler</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Offres d'emploi</Text>
        <View style={[styles.searchBox, { backgroundColor: colors.background }]}>
          <Search size={20} color={colors.text.disabled} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Rechercher un poste, une ville..."
            placeholderTextColor={colors.text.disabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.filterBtn}>
            <Filter size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJobItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 50,
    borderRadius: 12
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  filterBtn: { padding: 5 },
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
  saveBtn: { padding: 5 },
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
  timePosted: { fontSize: 12 },
  applyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  applyBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' }
});
