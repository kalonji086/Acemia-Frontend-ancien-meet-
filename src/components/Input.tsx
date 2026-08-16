import React from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../styles/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: string;
  iconPosition?: 'left' | 'right';
  onIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export default function Input({
  label,
  error,
  icon,
  iconPosition = 'left',
  onIconPress,
  containerStyle,
  inputStyle,
  ...props
}: InputProps) {
  const renderIcon = () => {
    if (!icon) return null;

    const iconComponent = (
      <Ionicons
        name={icon as any}
        size={20}
        color={error ? colors.danger : colors.text.secondary}
        style={iconPosition === 'left' ? styles.leftIcon : styles.rightIcon}
      />
    );

    if (onIconPress) {
      return (
        <TouchableOpacity onPress={onIconPress}>
          {iconComponent}
        </TouchableOpacity>
      );
    }

    return iconComponent;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[
        styles.inputContainer,
        error && styles.inputContainerError,
        icon && iconPosition === 'left' && styles.inputWithLeftIcon,
        icon && iconPosition === 'right' && styles.inputWithRightIcon,
      ]}>
        {icon && iconPosition === 'left' && renderIcon()}
        
        <TextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor={colors.text.secondary}
          {...props}
        />
        
        {icon && iconPosition === 'right' && renderIcon()}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md(),
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.xs(),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md(),
  },
  inputContainerError: {
    borderColor: colors.danger,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.sm(),
  },
  inputWithRightIcon: {
    paddingRight: spacing.sm(),
  },
  leftIcon: {
    marginRight: spacing.sm(),
  },
  rightIcon: {
    marginLeft: spacing.sm(),
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: colors.text.primary,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: spacing.xs(),
  },
});