import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, LanguageCode, TranslationKeys } from '../i18n/translations';
import * as Localization from 'expo-localization';
import apiService from '../services/api.service';

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

      const locales = Localization.getLocales();
      const deviceLocale = locales?.[0]?.languageCode as LanguageCode | undefined;
      const localLanguage = savedLang && savedLang in translations ? savedLang as LanguageCode : undefined;
      let preferredLanguage = localLanguage || (deviceLocale && deviceLocale in translations ? deviceLocale : 'fr');
      let preferredAutoTranslate = savedAuto === null ? true : savedAuto === 'true';

      const currentUser = await apiService.getCurrentUser();
      if (!localLanguage && currentUser?.preferred_language && currentUser.preferred_language in translations) {
        preferredLanguage = currentUser.preferred_language;
      }
      if (savedAuto === null && typeof currentUser?.auto_translate === 'boolean') {
        preferredAutoTranslate = currentUser.auto_translate;
      }

      setLanguageState(preferredLanguage);
      setAutoTranslateState(preferredAutoTranslate);
      await Promise.all([
        AsyncStorage.setItem('user_language', preferredLanguage),
        AsyncStorage.setItem('user_auto_translate', String(preferredAutoTranslate)),
      ]);
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
    await saveAccountPreference({ preferred_language: lang });
  };

  const setAutoTranslate = async (val: boolean) => {
    setAutoTranslateState(val);
    try {
      await AsyncStorage.setItem('user_auto_translate', val.toString());
    } catch (error) {
      console.error('Error saving auto translate:', error);
    }
    await saveAccountPreference({ auto_translate: val });
  };

  const saveAccountPreference = async (preference: { preferred_language?: LanguageCode; auto_translate?: boolean }) => {
    if (!(await apiService.getCurrentUser())) return;
    const response = await apiService.updateProfile(preference);
    if (!response.success) {
      console.error('Unable to save account language preferences:', response.error);
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
