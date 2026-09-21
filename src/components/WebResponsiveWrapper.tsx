import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions, Image } from 'react-native';

interface WebResponsiveWrapperProps {
  children: React.ReactNode;
}

/**
 * Ce composant enveloppe l'application sur le Web pour limiter la largeur sur Desktop
 * et centrer le contenu, tout en restant en plein écran sur Mobile.
 */
const WebResponsiveWrapper: React.FC<WebResponsiveWrapperProps> = ({ children }) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  // Sur Desktop (largeur > 1024), on limite la largeur à 1024px
  // Sur Tablette (largeur > 768), on limite à 768px
  // Sinon plein écran
  const maxContainerWidth = width > 1024 ? 1024 : width > 768 ? 768 : '100%';

  return (
    <View style={styles.outerContainer}>
      {/* Fond Cyber-Design animé pour le Web */}
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1924&auto=format&fit=crop' }}
          style={{ width: '100%', height: '100%', opacity: 0.15 }}
          blurRadius={5}
        />
        {/* Vous pourriez ajouter une vidéo ici plus tard si nécessaire */}
      </View>
      <View style={[styles.innerContainer, { maxWidth: maxContainerWidth as any }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#0a0a0c', // Fond sombre profond (Cyber-Design)
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff',
    // Ombre portée pour l'effet "carte" sur Desktop
    shadowColor: "#8b5cf6", // Ombre violette néon
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
});

export default WebResponsiveWrapper;
