# Meet Me - Application de Chat

Une application de chat moderne avec traduction en temps réel, messages vocaux et notifications push.

## Fonctionnalités

### Frontend (React Native / Expo)
- ✅ Authentification utilisateur (login, signup, mot de passe oublié)
- ✅ Interface de chat avec liste des conversations
- ✅ Messages avec traduction en temps réel
- ✅ Messages vocaux (enregistrement/lecture)
- ✅ Notifications push
- ✅ Gestion des médias (images, vidéos, fichiers)
- ✅ Interface utilisateur moderne avec React Native Paper

### Backend (À venir - Node.js + Express)
- Authentification sécurisée (JWT, bcrypt)
- Messagerie en temps réel (Socket.io)
- Traduction des messages (API externe)
- Stockage des fichiers audio et images
- Base de données (PostgreSQL/Supabase)
- Notifications push (Firebase Cloud Messaging)

## Structure du Projet

```
src/
├── screens/           # Écrans de l'application
│   ├── LoginScreen.tsx
│   ├── SignupScreen.tsx
│   ├── ForgotPasswordScreen.tsx
│   ├── ChatListScreen.tsx
│   ├── ChatScreen.tsx
│   └── SettingsScreen.tsx
├── components/        # Composants réutilisables
│   ├── Button.tsx
│   ├── Input.tsx
│   └── index.ts
├── navigation/        # Navigation
│   └── AppNavigator.tsx
├── styles/           # Styles et thèmes
│   └── theme.ts
├── services/         # Services API (à venir)
└── utils/            # Utilitaires (à venir)
```

## Installation

1. **Cloner le projet**
   ```bash
   git clone <repository-url>
   cd MeeetMe
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Démarrer l'application**
   ```bash
   npm start
   ```

4. **Lancer sur un émulateur ou appareil**
   - iOS: `npm run ios`
   - Android: `npm run android`
   - Web: `npm run web`

## Dépendances Principales

- **React Native**: Framework mobile
- **Expo**: Outils de développement
- **React Navigation**: Navigation entre écrans
- **Expo Vector Icons**: Icônes
- **Expo AV**: Audio/vidéo
- **Expo Notifications**: Notifications push

## Design System

L'application utilise un système de design cohérent avec :

### Couleurs
- Primaire: `#007AFF` (Bleu iOS)
- Secondaire: `#5856D6` (Violet)
- Succès: `#4CD964` (Vert)
- Danger: `#FF3B30` (Rouge)

### Typographie
- H1: 32px, bold
- H2: 24px, bold  
- H3: 20px, semi-bold
- Body: 16px, normal

### Espacements
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

## Fonctionnalités Implémentées

### Écran de Login
- Formulaire de connexion avec validation
- Affichage/masquage du mot de passe
- Navigation vers inscription et mot de passe oublié

### Écran d'Inscription
- Formulaire d'inscription complet
- Validation des champs
- Conditions d'utilisation

### Écran Mot de Passe Oublié
- Processus en 3 étapes (email → code → nouveau mot de passe)
- Règles de mot de passe
- Timer pour renvoi de code

### Liste des Conversations
- Liste des chats avec avatars
- Indicateurs de statut en ligne/hors ligne
- Badges de messages non lus
- Recherche de conversations
- Bouton nouveau message (FAB)

### Écran de Chat
- Interface de messagerie complète
- Bulles de messages avec styles différents
- Traduction en temps réel des messages
- Enregistrement et envoi de messages vocaux
- Indicateurs de lecture
- Barre d'entrée avec émoticônes et médias

### Écran des Paramètres
- Gestion du profil utilisateur
- Paramètres de langue et traduction
- Contrôle des notifications
- Apparence (mode sombre)
- Support et informations légales
- Déconnexion

## Prochaines Étapes

### Frontend
1. Intégration avec l'API backend
2. Implémentation des notifications push
3. Gestion des médias (images, vidéos)
4. Amélioration des performances
5. Tests unitaires et d'intégration

### Backend
1. Configuration du serveur Node.js
2. Implémentation de l'authentification
3. Intégration de Socket.io pour le chat en temps réel
4. Connexion à la base de données
5. Intégration des APIs de traduction
6. Stockage des fichiers sur AWS S3/Firebase

## Développement

### Structure des Commits
- `feat:` Nouvelles fonctionnalités
- `fix:` Corrections de bugs
- `docs:` Documentation
- `style:` Formatage du code
- `refactor:` Refactorisation
- `test:` Tests
- `chore:` Tâches de maintenance

### Convention de Nommage
- Composants: `PascalCase`
- Fichiers: `PascalCase.tsx`
- Variables: `camelCase`
- Constantes: `UPPER_SNAKE_CASE`
- Fonctions: `camelCase`

## Licence

© 2024 Meet Me. Tous droits réservés.