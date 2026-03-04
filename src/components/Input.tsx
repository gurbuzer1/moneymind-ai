import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  leftIcon,
  style,
  ...props
}) => (
  <View style={containerStyle}>
    {label && <Text style={styles.label}>{label}</Text>}
    <View style={[styles.inputContainer, error ? styles.inputError : null]}>
      {leftIcon && <View style={styles.icon}>{leftIcon}</View>}
      <TextInput
        style={[styles.input, leftIcon ? styles.inputWithIcon : null, style]}
        placeholderTextColor={colors.textTertiary}
        {...props}
      />
    </View>
    {error && <Text style={styles.error}>{error}</Text>}
  </View>
);

const styles = StyleSheet.create({
  label: {
    ...typography.captionBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputError: {
    borderColor: colors.error,
  },
  icon: {
    paddingLeft: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  inputWithIcon: {
    paddingLeft: spacing.sm,
  },
  error: {
    ...typography.small,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
