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

  // Sur Desktop (largeur > 1024), on limite la largeur à 1024px
  // Sur Tablette (largeur > 768), on limite à 768px
  // Sinon plein écran
  const maxContainerWidth = width > 1024 ? 1024 : width > 768 ? 768 : '100%';

  if (!isWeb) {
    return <>{children}</>;
  }

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.innerContainer, { maxWidth: maxContainerWidth as any }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#000', // Fond sombre autour du site sur grand écran
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff',
    // Ombre portée pour l'effet "carte" sur Desktop
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
});

export default WebResponsiveWrapper;
