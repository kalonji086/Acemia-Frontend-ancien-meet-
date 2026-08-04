import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, LanguageCode, TranslationKeys } from '../i18n/translations';
import * as Localization from 'expo-localization';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: TranslationKeys) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('fr');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('user_language');
      if (savedLang && savedLang in translations) {
        setLanguageState(savedLang as LanguageCode);
      } else {
        // Détection auto si possible
        const deviceLocale = Localization.getLocales()[0].languageCode as LanguageCode;
        if (deviceLocale && deviceLocale in translations) {
          setLanguageState(deviceLocale);
        }
      }
    } catch (error) {
      console.error('Error loading language:', error);
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

  const t = (key: TranslationKeys): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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
