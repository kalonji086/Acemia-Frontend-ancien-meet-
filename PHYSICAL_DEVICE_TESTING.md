# Guide de Test sur Appareils Physiques

## 📱 **Pourquoi Tester sur Appareils Physiques?**

### Problèmes du Simulateur/Émulateur
- ❌ Pas de microphone/caméra réels
- ❌ Pas de notifications push
- ❌ Performance différente
- ❌ Permissions système différentes
- ❌ Problèmes réseau réels

### Avantages des Appareils Physiques
- ✅ Microphone/caméra réels
- ✅ Notifications push fonctionnelles
- ✅ Performance réelle
- ✅ Permissions système réelles
- ✅ Tests réseau réels

## 🚀 **Méthodes de Test**

### 1. **Expo Go (Développement Rapide)**
```bash
# Installer Expo Go sur votre téléphone
# App Store (iOS) ou Play Store (Android)

# Démarrer le serveur de développement
cd frontend
npm start

# Scanner le QR code avec Expo Go
```

**Limitations Expo Go:**
- ❌ Pas d'Agora (appels audio/vidéo)
- ❌ Pas de notifications push complètes
- ❌ Certaines permissions limitées

### 2. **Build de Développement (EAS Build)**
```bash
# Installer EAS CLI
npm install -g eas-cli

# Se connecter à Expo
eas login

# Créer un build de développement
eas build --platform android --profile development
# ou
eas build --platform ios --profile development
```

**Avantages:**
- ✅ Agora fonctionnel
- ✅ Notifications push
- ✅ Toutes les permissions
- ✅ Debugging possible

### 3. **Build de Production (Test Final)**
```bash
# Build de production
eas build --platform android --profile production
# ou
eas build --platform ios --profile production

# Distribuer via TestFlight (iOS) ou Internal Testing (Android)
```

## 📋 **Checklist de Test Complète**

### 1. **Permissions Système**
- [ ] Microphone (appels audio)
- [ ] Caméra (appels vidéo, photos)
- [ ] Galerie photos (status, partage)
- [ ] Contacts (synchronisation)
- [ ] Notifications (push)

### 2. **Appels Audio/Video**
- [ ] Appel audio sortant
- [ ] Appel audio entrant
- [ ] Appel vidéo sortant
- [ ] Appel vidéo entrant
- [ ] Switch caméra (avant/arrière)
- [ ] Haut-parleur/écouteur
- [ ] Mute microphone
- [ ] Timeout 30 secondes
- [ ] Qualité audio (réseau faible/fort)

### 3. **Status**
- [ ] Création status texte
- [ ] Création status photo
- [ ] Expiration 24h
- [ ] Réactions emojis
- [ ] Commentaires
- [ ] Vue des réactions (propriétaire)

### 4. **Chat & Messages**
- [ ] Envoi message texte
- [ ] Envoi message audio
- [ ] Envoi photo
- [ ] Traduction automatique
- [ ] Notifications message
- [ ] Marquer comme lu

### 5. **Performance**
- [ ] Temps de démarrage < 3s
- [ ] Fluidité défilement
- [ ] Consommation mémoire
- [ ] Battery drain
- [ ] Chauffage appareil

### 6. **Réseau**
- [ ] WiFi → 4G/5G (changement)
- [ ] 4G/5G → WiFi (changement)
- [ ] Mode avion → réseau
- [ ] Réseau faible (Edge/3G)
- [ ] Reconnexion automatique

## 🔧 **Outils de Test**

### 1. **React Native Debugger**
```bash
# Télécharger React Native Debugger
# https://github.com/jhen0409/react-native-debugger

# Démarrer avec le bon port
react-native-debugger --port 8081
```

### 2. **Flipper (Facebook)**
```bash
# Installer Flipper
# https://fbflipper.com/

# Plugins utiles:
# - Network Inspector
# - React DevTools
# - Database Inspector
# - Layout Inspector
```

### 3. **Android Studio Logcat**
```bash
# Pour Android
adb logcat -s ReactNative

# Filtrer par tag
adb logcat -s ReactNative:V ReactNativeJS:V
```

### 4. **Xcode Console**
```bash
# Pour iOS
# Ouvrir Xcode → Window → Devices and Simulators
# Sélectionner l'appareil → View Device Logs
```

## 🐛 **Scénarios de Test Critiques**

### 1. **Appels en Contexte Réel**
```javascript
// Scénarios à tester:
1. Appel en voiture (Bluetooth)
2. Appel avec écouteurs
3. Appel en marchant (mouvement)
4. Appel avec bruit ambiant
5. Appel longue durée (30min+)
```

### 2. **Battery & Performance**
```javascript
// Mesurer:
1. Battery usage sur 1 heure d'utilisation
2. Mémoire utilisée (avant/après appels)
3. CPU usage pendant les appels
4. Data usage (4G/5G)
```

### 3. **Permissions & États**
```javascript
// Tester:
1. Refuser permission → redemander
2. Appeler sans permission → message erreur
3. Mode avion → essayer d'appeler
4. Battery saver mode
5. Low storage warning
```

## 📊 **Collecte de Données de Test**

### 1. **Logs Automatiques**
```javascript
// Dans votre code
console.log('[PERF] App start:', Date.now() - startTime);
console.log('[NETWORK] Call quality:', qualityMetrics);
console.log('[MEMORY] Usage:', memoryUsage);
```

### 2. **Screenshots & Videos**
- Enregistrer les sessions de test
- Capturer les bugs visuels
- Documenter les flux utilisateur

### 3. **Feedback Utilisateur**
```javascript
// Questions à poser:
1. L'appel était-il clair?
2. La connexion était-elle stable?
3. L'interface était-elle intuitive?
4. Des bugs rencontrés?
5. Suggestions d'amélioration?
```

## 🚨 **Problèmes Courants & Solutions**

### 1. **Appels Audio Brouillés**
```bash
# Causes possibles:
1. Mauvais codec Agora
2. Réseau instable
3. Permission microphone
4. Problème hardware

# Solutions:
1. Vérifier configuration Agora
2. Tester sur réseau stable
3. Vérifier permissions
4. Tester sur autre appareil
```

### 2. **Notifications Non Reçues**
```bash
# Causes possibles:
1. Token push expiré
2. App en background killée
3. Configuration Firebase
4. Restrictions iOS/Android

# Solutions:
1. Regénérer tokens push
2. Vérifier background modes
3. Vérifier config Firebase
4. Vérifier settings système
```

### 3. **Performance Médiocre**
```bash
# Causes possibles:
1. Images non optimisées
2. Re-renders React inutiles
3. Mémoire leaks
4. Opérations bloquantes

# Solutions:
1. Optimiser images (WebP)
2. Utiliser React.memo, useMemo
3. Nettoyer useEffect
4. Déplacer en background thread
```

## 📝 **Template de Rapport de Test**

```markdown
# Rapport de Test - [Date]

## Appareil
- Modèle: [iPhone 14 / Samsung Galaxy S23]
- OS: [iOS 17.2 / Android 14]
- Réseau: [4G/5G/WiFi]

## Tests Réalisés
### ✅ Fonctionnel
- [ ] Appels audio
- [ ] Appels vidéo
- [ ] Status
- [ ] Chat

### ⚠️ Problèmes
1. [Description du problème]
   - Fréquence: [Souvent/Parfois/Rarement]
   - Étapes pour reproduire
   - Screenshot/video

2. [Autre problème...]

## Performance
- Temps démarrage: [X] secondes
- Mémoire: [X] MB
- Battery: [X] % par heure

## Recommendations
1. [Amélioration 1]
2. [Amélioration 2]
3. [Bug fix 1]
```

## 🔄 **Processus de Test Itératif**

### Phase 1: Test Initial
```bash
1. Build développement
2. Test permissions de base
3. Test fonctionnalités critiques
4. Collecter feedback initial
```

### Phase 2: Test Approfondi
```bash
1. Build production interne
2. Test scénarios réels
3. Test performance
4. Test edge cases
```

### Phase 3: Test Bêta
```bash
1. Distribution TestFlight/Play Console
2. Test par utilisateurs réels
3. Collecter feedback scale
4. Ajuster avant release
```

## 🎯 **Objectifs de Qualité**

### Minimum Viable
- ✅ Appels audio fonctionnels
- ✅ Chat de base
- ✅ Pas de crash critiques
- ✅ Performance acceptable

### Production Ready
- ✅ Appels audio/vidéo stables
- ✅ Toutes fonctionnalités
- ✅ Performance optimale
- ✅ UX fluide
- ✅ Sécurité validée

### Excellent
- ✅ Expérience premium
- ✅ Performance exceptionnelle
- ✅ Innovation features
- ✅ User delight
```

**Prochaines étapes:**
1. Choisir méthode de test
2. Créer build de test
3. Exécuter checklist
4. Documenter résultats
5. Itérer sur problèmes