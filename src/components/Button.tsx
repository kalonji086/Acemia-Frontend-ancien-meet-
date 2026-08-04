import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, typography, borderRadius, spacing } from '../styles/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const getButtonStyle = () => {
    const baseStyle: ViewStyle = {
      borderRadius: borderRadius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: disabled ? 0.6 : 1,
    };

    const sizeStyle: ViewStyle = {
      paddingHorizontal: size === 'small' ? spacing.md : size === 'large' ? spacing.xl : spacing.lg,
      paddingVertical: size === 'small' ? spacing.sm : size === 'large' ? spacing.md : spacing.sm,
    };

    const variantStyle: ViewStyle = {
      backgroundColor: variant === 'primary' ? colors.primary :
                      variant === 'secondary' ? colors.secondary :
                      variant === 'danger' ? colors.danger : 'transparent',
      borderWidth: variant === 'outline' ? 1 : 0,
      borderColor: variant === 'outline' ? colors.primary : 'transparent',
    };

    return [baseStyle, sizeStyle, variantStyle, style];
  };

  const getTextStyle = () => {
    const baseStyle: TextStyle = {
      ...typography.button,
      color: variant === 'outline' ? colors.primary : colors.text.inverse,
    };

    const sizeStyle: TextStyle = {
      fontSize: size === 'small' ? 14 : size === 'large' ? 18 : 16,
    };

    return [baseStyle, sizeStyle, textStyle];
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : colors.text.inverse} />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}