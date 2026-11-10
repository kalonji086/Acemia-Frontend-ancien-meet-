# Guide du Développeur - Acemia Frontend

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 16+
- npm ou yarn
- Expo CLI
- Android Studio / Xcode (pour le développement natif)

### Installation
```bash
cd frontend
npm install
```

### Développement
```bash
# Démarrage Expo
npm start

# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## 🏗️ Architecture du Projet

### Structure des Fichiers
```
frontend/
├── src/
│   ├── components/     # Composants réutilisables
│   ├── screens/       # Écrans de l'application
│   ├── navigation/    # Configuration de navigation
│   ├── services/      # Services API et WebSocket
│   ├── context/       # Contextes React (Theme, Language)
│   ├── utils/         # Utilitaires et helpers
│   └── styles/        # Styles et thèmes
├── assets/            # Images, fonts, etc.
└── scripts/           # Scripts de build et test
```

### Principes d'Architecture
1. **Composants fonctionnels** avec hooks React
2. **Gestion d'état** via Context API
3. **Navigation** avec React Navigation
4. **Styling** avec StyleSheet et thèmes
5. **Gestion des erreurs** avec ErrorBoundary

## 🔧 Configuration

### Variables d'Environnement
Copier `.env.example` vers `.env` et configurer :
```env
API_BASE_URL=https://votre-backend.com/api
SOCKET_URL=https://votre-backend.com
```

### Configuration Expo
Le fichier `app.json` contient :
- Configuration Android/iOS
- Permissions
- Configuration des plugins
- Métadonnées de l'application

## 🛡️ Bonnes Pratiques de Stabilité

### 1. Gestion des Erreurs
Toujours utiliser les wrappers sécurisés :
```typescript
import { safeAsync, safeSync } from './src/utils/stability';

// Bon
const data = await safeAsync(() => apiService.getData(), 'getData');

// Mauvais
const data = await apiService.getData(); // Pas de gestion d'erreur
```

### 2. Navigation Sécurisée
```typescript
// Dans AppNavigator.tsx
const onRing = (data: any) => {
  if (!data || !navRef.current) return;
  
  setTimeout(() => {
    try {
      if (navRef.current?.isReady?.()) {
        navRef.current.navigate('IncomingCall', data);
      }
    } catch (err) {
      console.error('Navigation failed:', err);
      // Fallback vers un écran sûr
    }
  }, 100);
};
```

### 3. Gestion de la Mémoire
Nettoyer toujours les ressources :
```typescript
useEffect(() => {
  const timer = setInterval(() => {
    // Logique
  }, 1000);
  
  const subscription = service.subscribe();
  
  return () => {
    clearInterval(timer);      // Nettoyer les intervalles
    subscription.unsubscribe(); // Nettoyer les abonnements
  };
}, []);
```

### 4. Performance
- Utiliser `React.memo` pour les composants coûteux
- Éviter les re-renders inutiles
- Charger les données de manière paresseuse
- Optimiser les listes avec `FlatList`

## 🧪 Tests

### Tests de Stabilité
```bash
# Exécuter tous les tests de stabilité
npm run stability-test

# Vérifications pré-build
npm run prebuild-check
```

### Tests Manuels
1. **Test de crash** : Ouvrir/fermer rapidement les écrans
2. **Test réseau** : Simuler perte/rétablissement connexion
3. **Test mémoire** : Utiliser l'application pendant 30+ minutes
4. **Test permissions** : Refuser/accepter les permissions

## 🐛 Dépannage

### Problèmes Courants

#### 1. Crash au Démarrage
```bash
# Vérifier la configuration
npm run doctor
npm run check

# Vérifier les dépendances
npm audit
```

#### 2. Erreurs Réseau
- Vérifier `.env` et `constants.ts`
- Tester avec différentes connexions
- Vérifier les timeouts dans `api.service.ts`

#### 3. Problèmes d'Appels
- Vérifier les permissions microphone/caméra
- Tester en mode production (pas Expo Go)
- Vérifier la configuration Agora

#### 4. Fuites de Mémoire
- Utiliser React DevTools Profiler
- Vérifier le nettoyage dans les `useEffect`
- Tester avec de longues sessions

### Outils de Débogage
1. **React DevTools** : Inspection des composants
2. **Flipper** : Debugging natif
3. **Chrome DevTools** : Debugging web
4. **Sentry** : Monitoring des erreurs (à configurer)

## 📈 Monitoring

### Métriques à Surveiller
1. **Taux de crash** : < 1%
2. **Temps de démarrage** : < 3 secondes
3. **Performance réseau** : Latence < 500ms
4. **Utilisation mémoire** : < 200MB

### Logging Structuré
```typescript
console.error('API Error:', {
  url: request.url,
  method: request.method,
  status: error.response?.status,
  message: error.message,
  timestamp: new Date().toISOString()
});
```

## 🔄 Déploiement

### Build Production
```bash
# Android
eas build --platform android

# iOS
eas build --platform ios
```

### Mises à Jour OTA
```bash
# Publier une mise à jour
eas update --auto

# Rollback si problème
eas update --rollback
```

## 🤝 Contribution

### Workflow Git
1. Créer une branche feature
2. Développer avec tests
3. Exécuter les vérifications
4. Créer une Pull Request

### Code Review
Vérifier :
- [ ] Gestion des erreurs
- [ ] Performance
- [ ] Sécurité
- [ ] Tests
- [ ] Documentation

### Standards de Code
- TypeScript strict
- ESLint configuré
- Prettier pour le formatting
- Commentaires JSDoc pour les fonctions complexes

## 📚 Ressources

### Documentation
- [React Native](https://reactnative.dev)
- [Expo](https://docs.expo.dev)
- [React Navigation](https://reactnavigation.org)
- [TypeScript](https://www.typescriptlang.org)

### Outils
- [Expo DevTools](https://docs.expo.dev/workflow/expo-cli)
- [React DevTools](https://reactnative.dev/docs/debugging)
- [Sentry for React Native](https://docs.sentry.io/platforms/react-native)

### Communauté
- [Expo Discord](https://discord.gg/expo)
- [React Native Community](https://github.com/react-native-community)

---

**Dernière mise à jour :** $(date)
**Version :** 5.0.0
**Statut :** Production Ready ✅