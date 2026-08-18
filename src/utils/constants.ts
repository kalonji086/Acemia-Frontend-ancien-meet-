import Constants from 'expo-constants';

// Constantes de l'application

export const APP_NAME = 'Meet';
export const APP_VERSION = "40.0.0";

// URLs API
const extra = Constants?.expoConfig?.extra || {};
export const API_BASE_URL = extra.apiUrl || 'https://meet-me-backend-sg5c.onrender.com/api';
export const SOCKET_URL = extra.socketUrl || 'https://meet-me-backend-sg5c.onrender.com';

// Pour le développement local (commenté)
// export const API_BASE_URL = 'http://localhost:3000/api';
// export const SOCKET_URL = 'http://localhost:3000';

// Pour Android emulator
// export const API_BASE_URL = 'http://10.0.2.2:3000/api';
// export const SOCKET_URL = 'http://10.0.2.2:3000';

// Pour iOS simulator
// export const API_BASE_URL = 'http://localhost:3000/api';
// export const SOCKET_URL = 'http://localhost:3000';

// Pour appareil physique (même réseau)
// export const API_BASE_URL = 'http://VOTRE_IP_LOCALE:3000/api';
// export const SOCKET_URL = 'http://VOTRE_IP_LOCALE:3000';

// Clés API (à configurer)
export const GOOGLE_TRANSLATE_API_KEY = 'YOUR_GOOGLE_TRANSLATE_API_KEY';
export const DEEPL_API_KEY = 'YOUR_DEEPL_API_KEY';

// Langues supportées
export const SUPPORTED_LANGUAGES = [  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

// Configuration audio
export const AUDIO_CONFIG = {
  quality: 'Low' as const,
  extension: '.m4a',
  outputFormat: 'm4a' as const,
  audioEncoder: 'aac' as const,
  sampleRate: 44100,
  numberOfChannels: 2,
  bitRate: 128000,
};

// Limites de fichiers
export const FILE_LIMITS = {
  IMAGE: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
  VIDEO: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['video/mp4', 'video/quicktime'],
  },
  AUDIO: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: ['audio/m4a', 'audio/mp3', 'audio/wav'],
  },
  DOCUMENT: {
    maxSize: 25 * 1024 * 1024, // 25MB
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
};

// Messages d'erreur
export const ERROR_MESSAGES = {
  NETWORK: 'Erreur de connexion. Vérifiez votre connexion internet.',
  AUTH: 'Email ou mot de passe incorrect.',
  SIGNUP: 'Erreur lors de la création du compte.',
  UPLOAD: 'Erreur lors du téléchargement du fichier.',
  TRANSLATION: 'Erreur lors de la traduction.',
  AUDIO: 'Erreur lors de l\'enregistrement audio.',
  GENERAL: 'Une erreur est survenue. Veuillez réessayer.',
};

// Messages de succès
export const SUCCESS_MESSAGES = {
  LOGIN: 'Connexion réussie !',
  SIGNUP: 'Compte créé avec succès !',
  PASSWORD_RESET: 'Mot de passe réinitialisé avec succès !',
  MESSAGE_SENT: 'Message envoyé !',
  TRANSLATION: 'Message traduit !',
  AUDIO_SENT: 'Message audio envoyé !',
  PROFILE_UPDATED: 'Profil mis à jour !',
};

// Configuration du cache
export const CACHE_CONFIG = {
  MESSAGES: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 1000,
  },
  USERS: {
    ttl: 30 * 60 * 1000, // 30 minutes
    maxSize: 100,
  },
  MEDIA: {
    ttl: 24 * 60 * 60 * 1000, // 24 heures
    maxSize: 50,
  },
};