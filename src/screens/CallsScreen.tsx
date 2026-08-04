import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/theme';

export default function CallsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.createLink}>
        <View style={styles.linkIcon}>
          <Ionicons name="link" size={24} color="#fff" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Créer un lien d'appel</Text>
          <Text style={styles.subtitle}>Partager un lien pour votre appel</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Récents</Text>
      </View>

      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Pour commencer à appeler des contacts qui ont Meet Me, appuyez sur l'icône en bas de votre écran.</Text>
      </View>

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="call" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  createLink: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
  },
  linkIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-45deg' }],
  },
  textContainer: {
    marginLeft: 15,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111B21',
  },
  subtitle: {
    fontSize: 14,
    color: '#667781',
    marginTop: 2,
  },
  sectionHeader: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111B21',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#667781',
    fontSize: 14,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  }
});
