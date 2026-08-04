import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/theme';

export default function AudioCallScreen({ navigation, route }: any) {
  const { name = 'Utilisateur', avatar = `https://ui-avatars.com/api/?name=${name}&size=200` } = route.params || {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileSection}>
        <Image source={{ uri: avatar }} style={styles.avatar} />
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.warning}>Les appels audio ne sont pas encore disponibles sur navigateur Web.</Text>
      </View>

      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeButtonText}>Retour</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#075E54', alignItems: 'center', justifyContent: 'center', padding: 20 },
  profileSection: { alignItems: 'center' },
  avatar: { width: 150, height: 150, borderRadius: 75, marginBottom: 20 },
  name: { fontSize: 28, color: '#fff', marginBottom: 10 },
  warning: { color: '#fff', textAlign: 'center', fontSize: 16, opacity: 0.8 },
  closeButton: { marginTop: 40, padding: 15, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
  closeButtonText: { color: '#fff', fontWeight: 'bold' }
});
