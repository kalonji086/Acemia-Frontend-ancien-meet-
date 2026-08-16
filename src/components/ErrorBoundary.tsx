import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo
    });

    // Loguer l'erreur
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Appeler le callback personnalisé
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Vous pourriez aussi envoyer l'erreur à un service de monitoring
    // sendErrorToMonitoringService(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleRestart = (): void => {
    // Cette fonction pourrait redémarrer l'app
    // Pour l'instant, on reset juste l'état
    this.handleReset();
    
    // Dans une vraie implémentation, vous pourriez :
    // - Recharger l'application
    // - Naviguer vers l'écran d'accueil
    // - Redémarrer certains services
  };

  renderFallback(): ReactNode {
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { error } = this.state;
    
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="bug" size={60} color="#FF3B30" />
        </View>
        
        <Text style={styles.title}>Une erreur est survenue</Text>
        
        <Text style={styles.message}>
          {error?.message || "L'application a rencontré un problème"}
        </Text>
        
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={this.handleReset}
          >
            <Text style={styles.buttonText}>Réessayer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={this.handleRestart}
          >
            <Text style={styles.secondaryButtonText}>Redémarrer</Text>
          </TouchableOpacity>
        </View>
        
        {__DEV__ && this.state.errorInfo && (
          <View style={styles.errorDetails}>
            <Text style={styles.errorDetailsTitle}>Détails de l'erreur :</Text>
            <Text style={styles.errorStack}>
              {this.state.error?.toString()}
            </Text>
            <Text style={styles.componentStack}>
              {this.state.errorInfo.componentStack}
            </Text>
          </View>
        )}
      </View>
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.renderFallback();
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F7',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6E6E73',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#C7C7CC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorDetails: {
    marginTop: 30,
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    width: '100%',
    maxHeight: 200,
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 12,
    color: '#FF3B30',
    fontFamily: 'Menlo',
    marginBottom: 8,
  },
  componentStack: {
    fontSize: 10,
    color: '#6E6E73',
    fontFamily: 'Menlo',
  },
});

// Hook pour utiliser l'ErrorBoundary dans les composants fonctionnels
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    console.error('Component error:', error);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
    hasError: !!error,
  };
};

export default ErrorBoundary;