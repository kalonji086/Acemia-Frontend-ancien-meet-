import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { colors } from '../styles/theme';

export default function VideoCallScreen({ navigation, route }: any) {
  const { name = 'Utilisateur' } = route.params || {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.warning}>Les appels vidéo ne sont pas encore disponibles sur navigateur Web.</Text>
      </View>

      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeButtonText}>Retour</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20 },
  content: { alignItems: 'center' },
  name: { fontSize: 28, color: '#fff', marginBottom: 10 },
  warning: { color: '#fff', textAlign: 'center', fontSize: 16, opacity: 0.8 },
  closeButton: { marginTop: 40, padding: 15, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
  closeButtonText: { color: '#fff', fontWeight: 'bold' }
});
