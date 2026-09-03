import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Image, TextInput, ActivityIndicator
} from 'react-native';
import { Search, MapPin, User, ChevronRight, ArrowLeft, MessageCircle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

export default function TalentSearchScreen({ navigation }: any) {
  const { colors, normalize } = useTheme();
  const [loading, setLoading] = useState(false);
  const [talents, setTalents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchTalents();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fetchTalents = async () => {
    setLoading(true);
    try {
      const res = await apiService.searchTalents(searchQuery);
      if (res.success) {
        setTalents(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderTalentItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.talentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
    >
      <View style={styles.cardContent}>
        <Image
          source={{ uri: item.avatar_url || 'https://placehold.co/100x100?text=User' }}
          style={styles.avatar}
        />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text.primary }]}>{item.full_name}</Text>
          <Text style={[styles.username, { color: colors.primary }]}>@{item.username}</Text>

          <View style={styles.locationRow}>
            <MapPin size={12} color={colors.text.secondary} />
            <Text style={[styles.location, { color: colors.text.secondary }]}>
              {item.city || 'Ville non précisée'}, {item.country}
            </Text>
          </View>

          {item.bio && (
            <Text style={[styles.bio, { color: colors.text.secondary }]} numberOfLines={2}>
              {item.bio}
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[styles.contactBtn, { backgroundColor: colors.primary + '15' }]}
          onPress={async () => {
            const res = await apiService.createChat([item.id]);
            if (res.success) {
              navigation.navigate('Chat', {
                chatId: res.data.id,
                name: item.full_name,
                peerUserId: item.id
              });
            }
          }}
        >
          <MessageCircle size={16} color={colors.primary} />
          <Text style={[styles.contactBtnText, { color: colors.primary }]}>CONTACTER</Text>
        </TouchableOpacity>
        <ChevronRight size={20} color={colors.text.disabled} />
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
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Chercher des Talents</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.background }]}>
          <Search size={20} color={colors.text.disabled} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Nom, compétences, ville..."
            placeholderTextColor={colors.text.disabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={talents}
          renderItem={renderTalentItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <User size={60} color={colors.text.disabled} />
              <Text style={{ marginTop: 20, color: colors.text.secondary }}>Aucun profil trouvé.</Text>
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
  header: { padding: 15, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 50,
    borderRadius: 15,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  listContent: { padding: 20 },
  talentCard: {
    padding: 15,
    borderRadius: 24,
    marginBottom: 15,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  cardContent: { flexDirection: 'row', marginBottom: 12 },
  avatar: { width: 64, height: 64, borderRadius: 20 },
  info: { flex: 1, marginLeft: 15 },
  name: { fontSize: 17, fontWeight: 'bold' },
  username: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  location: { fontSize: 11, marginLeft: 4 },
  bio: { fontSize: 12, lineHeight: 18 },
  divider: { height: 1, width: '100%', marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10
  },
  contactBtnText: { fontSize: 11, fontWeight: 'bold', marginLeft: 6 },
  emptyContainer: { alignItems: 'center', marginTop: 100 }
});