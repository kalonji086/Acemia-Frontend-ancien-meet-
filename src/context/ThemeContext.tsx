import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme, Dimensions, PixelRatio } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as defaultColors, darkColors as defaultDarkColors } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375;

type ThemeType = 'light' | 'dark';

export const APP_COLORS = [
  { id: 'purple', main: '#673AB7', light: '#9575CD' },
  { id: 'green', main: '#00A884', light: '#05D7A0' },
  { id: 'blue', main: '#2196F3', light: '#64B5F6' },
  { id: 'red', main: '#F44336', light: '#E57373' },
  { id: 'pink', main: '#E91E63', light: '#F06292' },
  { id: 'orange', main: '#FF9800', light: '#FFB74D' },
  { id: 'teal', main: '#009688', light: '#4DB6AC' },
];

interface ThemeContextType {
  theme: ThemeType;
  isDark: boolean;
  colors: typeof defaultColors;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
  primaryColor: string;
  setPrimaryColor: (colorId: string) => void;
  fontSizeFactor: number;
  setFontSizeFactor: (factor: number) => void;
  normalize: (size: number) => number;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeType>('light');
  const [colorId, setColorId] = useState('purple');
  const [fontSizeFactor, setFontSizeFactorState] = useState(1);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [savedTheme, savedColor, savedFont] = await Promise.all([
        AsyncStorage.getItem('user_theme'),
        AsyncStorage.getItem('user_color'),
        AsyncStorage.getItem('user_font_size'),
      ]);

      if (savedTheme) setThemeState(savedTheme as ThemeType);
      else setThemeState(systemColorScheme === 'dark' ? 'dark' : 'light');

      if (savedColor) setColorId(savedColor);
      if (savedFont) setFontSizeFactorState(parseFloat(savedFont));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem('user_theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setPrimaryColor = async (id: string) => {
    setColorId(id);
    try {
      await AsyncStorage.setItem('user_color', id);
    } catch (error) {
      console.error('Error saving color:', error);
    }
  };

  const setFontSizeFactor = async (factor: number) => {
    setFontSizeFactorState(factor);
    try {
      await AsyncStorage.setItem('user_font_size', factor.toString());
    } catch (error) {
      console.error('Error saving font size:', error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const normalize = useCallback((size: number) => {
    const newSize = size * scale * fontSizeFactor;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }, [fontSizeFactor]);

  const selectedColorSet = APP_COLORS.find(c => c.id === colorId) || APP_COLORS[0];

  const baseColors = theme === 'dark' ? defaultDarkColors : defaultColors;
  const currentColors = {
    ...baseColors,
    primary: selectedColorSet.main,
    primaryLight: selectedColorSet.light,
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      isDark: theme === 'dark',
      colors: currentColors,
      toggleTheme,
      setTheme,
      primaryColor: colorId,
      setPrimaryColor,
      fontSizeFactor,
      setFontSizeFactor,
      normalize
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
