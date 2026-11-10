import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';

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

  const maxContainerWidth = Math.min(width, 1440);

  // Sur mobile, on retourne directement les children sans wrapper pour optimiser les performances
  if (!isWeb) {
    return <>{children}</>;
  }

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.innerContainer, { maxWidth: maxContainerWidth }]}>
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
