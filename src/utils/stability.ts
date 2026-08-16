// Utilitaires pour améliorer la stabilité de l'application

import { Platform, Alert } from 'react-native';
// import * as Updates from 'expo-updates';

/**
 * Gestionnaire d'erreurs global
 */
export class StabilityManager {
  private static instance: StabilityManager;
  private errorCount = 0;
  private lastErrorTime = 0;
  private readonly MAX_ERRORS_PER_MINUTE = 5;
  
  private constructor() {}
  
  static getInstance(): StabilityManager {
    if (!StabilityManager.instance) {
      StabilityManager.instance = new StabilityManager();
    }
    return StabilityManager.instance;
  }
  
  /**
   * Gère une erreur de manière sécurisée
   */
  handleError(error: Error, context?: string): void {
    const now = Date.now();
    
    // Réinitialiser le compteur si plus d'une minute s'est écoulée
    if (now - this.lastErrorTime > 60000) {
      this.errorCount = 0;
    }
    
    this.errorCount++;
    this.lastErrorTime = now;
    
    // Loguer l'erreur
    console.error(`[Stability] Error${context ? ` in ${context}` : ''}:`, error);
    
    // Si trop d'erreurs en peu de temps, suggérer un redémarrage
    if (this.errorCount >= this.MAX_ERRORS_PER_MINUTE) {
      this.suggestRestart();
    }
  }
  
  /**
   * Suggère un redémarrage de l'application
   */
  private suggestRestart(): void {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Problème de stabilité',
        'L\'application rencontre plusieurs erreurs. Voulez-vous redémarrer ?',
        [
          { text: 'Plus tard', style: 'cancel' },
          { 
            text: 'Redémarrer', 
            style: 'destructive',
            onPress: () => window.location.reload()
          }
        ]
      );
    } else {
      Alert.alert(
        'Problème de stabilité',
        'L\'application rencontre plusieurs erreurs. Veuillez fermer et rouvrir l\'application.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
    }
  }
  
  /**
   * Réinitialise le compteur d'erreurs
   */
  resetErrorCount(): void {
    this.errorCount = 0;
    this.lastErrorTime = 0;
  }
  
  /**
   * Vérifie si l'application est stable
   */
  isStable(): boolean {
    return this.errorCount < this.MAX_ERRORS_PER_MINUTE;
  }
}

/**
 * Wrapper sécurisé pour les fonctions asynchrones
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context?: string,
  fallback?: T
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    StabilityManager.getInstance().handleError(error as Error, context);
    
    if (fallback !== undefined) {
      return fallback;
    }
    
    return null;
  }
}

/**
 * Wrapper sécurisé pour les fonctions synchrones
 */
export function safeSync<T>(
  fn: () => T,
  context?: string,
  fallback?: T
): T | null {
  try {
    return fn();
  } catch (error) {
    StabilityManager.getInstance().handleError(error as Error, context);
    
    if (fallback !== undefined) {
      return fallback;
    }
    
    return null;
  }
}

/**
 * Délai sécurisé
 */
export function safeDelay(ms: number): Promise<void> {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      resolve();
    }, ms);
    
    // Nettoyer le timer en cas d'annulation
    return () => clearTimeout(timer);
  });
}

/**
 * Vérifie les prérequis avant d'exécuter une action
 */
export interface Prerequisites {
  hasNetwork?: boolean;
  hasPermissions?: boolean;
  isLoggedIn?: boolean;
}

export async function checkPrerequisites(
  prerequisites: Prerequisites,
  onMissing?: (missing: string[]) => void
): Promise<boolean> {
  const missing: string[] = [];
  
  // Vérifications basiques
  if (prerequisites.hasNetwork && !navigator.onLine) {
    missing.push('connexion internet');
  }
  
  // Vous pouvez ajouter d'autres vérifications ici
  
  if (missing.length > 0) {
    if (onMissing) {
      onMissing(missing);
    }
    return false;
  }
  
  return true;
}

/**
 * Hook pour surveiller la mémoire
 */
export function useMemoryMonitor() {
  // Cette fonctionnalité est limitée sur React Native
  // Mais vous pouvez implémenter une surveillance basique
  const checkMemory = () => {
    if (Platform.OS === 'web' && 'memory' in performance) {
      const memory = (performance as any).memory;
      console.log('Memory usage:', {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      });
      
      // Avertir si utilisation mémoire élevée
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
        console.warn('High memory usage detected');
      }
    }
  };
  
  return { checkMemory };
}

/**
 * Gestionnaire de retry avec backoff exponentiel
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Backoff exponentiel
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Retry attempt ${attempt}/${maxRetries} in ${delay}ms`);
      
      await safeDelay(delay);
    }
  }
  
  throw lastError!;
}

/**
 * Validateur de données d'entrée
 */
export function validateInput(data: any, schema: Record<string, (value: any) => boolean>): string[] {
  const errors: string[] = [];
  
  for (const [key, validator] of Object.entries(schema)) {
    if (!validator(data[key])) {
      errors.push(key);
    }
  }
  
  return errors;
}

// Exemples de validateurs communs
export const validators = {
  isString: (value: any) => typeof value === 'string' && value.trim().length > 0,
  isNumber: (value: any) => typeof value === 'number' && !isNaN(value),
  isArray: (value: any) => Array.isArray(value) && value.length > 0,
  isObject: (value: any) => typeof value === 'object' && value !== null && !Array.isArray(value),
  isEmail: (value: any) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value),
  isPhone: (value: any) => /^[+]?[\\d\\s-]+$/.test(value.replace(/\\s/g, '')),
};

export default StabilityManager.getInstance();