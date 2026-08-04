import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const scale = SCREEN_WIDTH / 375;
export const normalize = (size: number, factor: number = 1) => {
  const newSize = size * scale * factor;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const colors = {
  primary: '#673AB7',
  primaryLight: '#9575CD',
  secondary: '#FF4081',
  success: '#4CAF50',
  warning: '#FFC107',
  danger: '#F44336',
  info: '#2196F3',
  background: '#F5F5F7',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#9E9E9E',
    inverse: '#FFFFFF',
  },
  border: '#E0E0E0',
  divider: '#EEEEEE',
};

export const darkColors = {
  primary: '#9575CD',
  primaryLight: '#B39DDB',
  secondary: '#FF80AB',
  success: '#81C784',
  warning: '#FFD54F',
  danger: '#E57373',
  info: '#64B5F6',
  background: '#121212',
  surface: '#1E1E1E',
  card: '#1E1E1E',
  text: {
    primary: '#F5F5F7',
    secondary: '#B0B0B0',
    disabled: '#6E6E6E',
    inverse: '#121212',
  },
  border: '#333333',
  divider: '#2C2C2C',
};

export const spacing = {
  xs: (f: number = 1) => normalize(4, f),
  sm: (f: number = 1) => normalize(8, f),
  md: (f: number = 1) => normalize(16, f),
  lg: (f: number = 1) => normalize(24, f),
  xl: (f: number = 1) => normalize(32, f),
};
