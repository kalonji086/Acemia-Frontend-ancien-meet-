import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import apiService from '../services/api.service';
import { useTheme } from '../context/ThemeContext';

const tabs = ['Répertoire', 'Créer école', 'Mes enfants', 'Gestion'];

export default function SchoolScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const [activeTab, setActiveTab] = useState('Répertoire');
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    schoolType: 'private',
    country: '',
    city: '',
    address: '',
    contactEmail: '',
    phone: '',
    description: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const overviewRes = await apiService.getSchoolOverview();
      const worldRes = await apiService.getSchoolWorld();
      if (overviewRes.success) setOverview(overviewRes.data);
      if (worldRes.success) setSchools(worldRes.data || []);
    } catch (error) {
      console.error('School load error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const stats = useMemo(() => ({
    totalSchools: schools.length || overview?.dashboard?.stats?.totalSchools || 0,
    students: overview?.dashboard?.stats?.totalStudents || 0,
    assignments: overview?.dashboard?.stats?.totalAssignments || 0
  }), [schools, overview]);

  const handleCreateSchool = async () => {
    if (!form.name || !form.country) {
      return;
    }

    const res = await apiService.createSchool({
      name: form.name,
      schoolType: form.schoolType,
      country: form.country,
      city: form.city,
      address: form.address,
      contactEmail: form.contactEmail,
      phone: form.phone,
      description: form.description,
    });

    if (res.success) {
      setForm({
        name: '', schoolType: 'private', country: '', city: '', address: '', contactEmail: '', phone: '', description: ''
      });
      setActiveTab('Gestion');
      loadData();
    }
  };

  const renderOverview = () => (
    <View style={styles.grid}>
      <MetricCard label="Écoles" value={String(stats.totalSchools)} colors={colors} />
      <MetricCard label="Élèves" value={String(stats.students)} colors={colors} />
      <MetricCard label="Devoirs" value={String(stats.assignments)} colors={colors} />
      <MetricCard label="Rôle" value={overview?.dashboard?.role || 'parent'} colors={colors} />
    </View>
  );

  const renderWorld = () => (
    <View style={styles.listWrap}>
      {schools.map((school: any) => (
        <TouchableOpacity key={school.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text.primary }]}>{school.name}</Text>
          <Text style={[styles.cardMeta, { color: colors.text.secondary }]}>{school.country} • {school.city || 'Ville non précisée'}</Text>
          <Text style={[styles.cardMeta, { color: colors.text.secondary }]}>{school.school_type || 'private'}</Text>
          <Text style={[styles.cardMeta, { color: colors.text.secondary }]}>{school.status}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderChildren = () => (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <Text style={[styles.panelTitle, { color: colors.text.primary }]}>Inscription d’un enfant</Text>
      <TextInput
        placeholder="Prénom"
        placeholderTextColor={colors.text.secondary}
        style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]}
      />
      <TextInput
        placeholder="Nom"
        placeholderTextColor={colors.text.secondary}
        style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]}
      />
      <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
        <Text style={styles.primaryText}>Ajouter l’élève</Text>
      </TouchableOpacity>
    </View>
  );

  const renderManagement = () => (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <Text style={[styles.panelTitle, { color: colors.text.primary }]}>Tableau de bord</Text>
      <Text style={[styles.cardMeta, { color: colors.text.secondary }]}>Dashboard Élève • Parent • Enseignant • Directeur • Promoteur • Admin principal</Text>
      <Text style={[styles.cardMeta, { color: colors.text.secondary }]}>Permissions de gestion : notes, devoirs, paiements, classes et communication.</Text>
    </View>
  );

  const renderCreateSchool = () => (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <Text style={[styles.panelTitle, { color: colors.text.primary }]}>Créer une école</Text>
      <TextInput value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="Nom de l’école" placeholderTextColor={colors.text.secondary} style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} />
      <TextInput value={form.country} onChangeText={(v) => setForm({ ...form, country: v })} placeholder="Pays" placeholderTextColor={colors.text.secondary} style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} />
      <TextInput value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} placeholder="Ville" placeholderTextColor={colors.text.secondary} style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} />
      <TextInput value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} placeholder="Adresse" placeholderTextColor={colors.text.secondary} style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} />
      <TextInput value={form.contactEmail} onChangeText={(v) => setForm({ ...form, contactEmail: v })} placeholder="Email contact" placeholderTextColor={colors.text.secondary} style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} />
      <TextInput value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} placeholder="Téléphone" placeholderTextColor={colors.text.secondary} style={[styles.input, { borderColor: colors.border, color: colors.text.primary }]} />
      <TextInput value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="Description" placeholderTextColor={colors.text.secondary} multiline style={[styles.input, { borderColor: colors.border, color: colors.text.primary, minHeight: 90, textAlignVertical: 'top' }]} />
      <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleCreateSchool}>
        <Text style={styles.primaryText}>Valider l’école</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'Répertoire': return renderWorld();
      case 'Créer école': return renderCreateSchool();
      case 'Mes enfants': return renderChildren();
      case 'Gestion': return renderManagement();
      default: return renderOverview();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>School</Text>
      </View>

      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && { backgroundColor: colors.primary }, { borderColor: colors.border }]}>
            <Text style={[styles.tabText, { color: activeTab === tab ? '#fff' : colors.text.secondary }]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 30 }} color={colors.primary} /> : (
        <ScrollView contentContainerStyle={styles.content}>
          {activeTab === 'Répertoire' ? renderOverview() : null}
          {renderCurrentTab()}
        </ScrollView>
      )}
    </View>
  );
}

const MetricCard = ({ label, value, colors }: any) => (
  <View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
    <Text style={[styles.metricLabel, { color: colors.text.secondary }]}>{label}</Text>
    <Text style={[styles.metricValue, { color: colors.text.primary }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, flexWrap: 'wrap' },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, margin: 4 },
  tabText: { fontSize: 12, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  metric: { width: '48%', borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  metricLabel: { fontSize: 12, marginBottom: 8 },
  metricValue: { fontSize: 22, fontWeight: '800' },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  cardMeta: { fontSize: 12, marginBottom: 4 },
  panel: { borderRadius: 18, borderWidth: 1, padding: 16 },
  panelTitle: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 12 },
  primaryButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#fff', fontWeight: '700' },
  listWrap: { marginTop: 8 },
});
