import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, LanguageCode, TranslationKeys } from '../i18n/translations';
import * as Localization from 'expo-localization';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  autoTranslate: boolean;
  setAutoTranslate: (val: boolean) => void;
  t: (key: TranslationKeys) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('fr');
  const [autoTranslate, setAutoTranslateState] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [savedLang, savedAuto] = await Promise.all([
        AsyncStorage.getItem('user_language'),
        AsyncStorage.getItem('user_auto_translate'),
      ]);

      if (savedLang && savedLang in translations) {
        setLanguageState(savedLang as LanguageCode);
      } else {
        // Détection auto si possible (sécurisée)
        const locales = Localization.getLocales();
        const deviceLocale = locales && locales.length > 0 ? locales[0].languageCode as LanguageCode : 'en' as LanguageCode;

        if (deviceLocale && deviceLocale in translations) {
          setLanguageState(deviceLocale);
        } else {
          setLanguageState('fr'); // Fallback par défaut
        }
      }

      if (savedAuto !== null) {
        setAutoTranslateState(savedAuto === 'true');
      }
    } catch (error) {
      console.error('Error loading language settings:', error);
    }
  };

  const setLanguage = async (lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem('user_language', lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const setAutoTranslate = async (val: boolean) => {
    setAutoTranslateState(val);
    try {
      await AsyncStorage.setItem('user_auto_translate', val.toString());
    } catch (error) {
      console.error('Error saving auto translate:', error);
    }
  };

  const t = (key: TranslationKeys): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, autoTranslate, setAutoTranslate, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
