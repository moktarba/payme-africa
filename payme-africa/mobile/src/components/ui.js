import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  TextInput,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows, ButtonHeight } from '../utils/theme';

// ============================================================
// BUTTON
// ============================================================
export function Button({
  title,
  onPress,
  variant = 'primary', // primary | secondary | outline | ghost | danger
  size = 'md',          // sm | md | lg | xl
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) {
  const styles = getButtonStyles(variant, size, disabled || loading);

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={styles.loaderColor} size="small" />
      ) : (
        <View style={btnStyles.row}>
          {icon && <View style={btnStyles.iconWrapper}>{icon}</View>}
          <Text style={[styles.text, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function getButtonStyles(variant, size, disabled) {
  const heights = { sm: ButtonHeight.sm, md: ButtonHeight.md, lg: ButtonHeight.lg, xl: ButtonHeight.xl };
  const fontSizes = { sm: 14, md: 16, lg: 18, xl: 20 };

  const base = {
    borderRadius: BorderRadius.md,
    height: heights[size],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    opacity: disabled ? 0.5 : 1,
  };

  const variants = {
    primary: {
      button: { ...base, backgroundColor: Colors.primary, ...Shadows.md },
      text: { color: Colors.white, fontSize: fontSizes[size], fontWeight: Typography.fontWeightBold },
      loaderColor: Colors.white,
    },
    secondary: {
      button: { ...base, backgroundColor: Colors.secondary },
      text: { color: Colors.white, fontSize: fontSizes[size], fontWeight: Typography.fontWeightBold },
      loaderColor: Colors.white,
    },
    outline: {
      button: { ...base, backgroundColor: 'transparent', borderWidth: 2, borderColor: Colors.primary },
      text: { color: Colors.primary, fontSize: fontSizes[size], fontWeight: Typography.fontWeightSemibold },
      loaderColor: Colors.primary,
    },
    ghost: {
      button: { ...base, backgroundColor: 'transparent' },
      text: { color: Colors.primary, fontSize: fontSizes[size], fontWeight: Typography.fontWeightMedium },
      loaderColor: Colors.primary,
    },
    danger: {
      button: { ...base, backgroundColor: Colors.error },
      text: { color: Colors.white, fontSize: fontSizes[size], fontWeight: Typography.fontWeightBold },
      loaderColor: Colors.white,
    },
    success: {
      button: { ...base, backgroundColor: Colors.success, ...Shadows.md },
      text: { color: Colors.white, fontSize: fontSizes[size], fontWeight: Typography.fontWeightBold },
      loaderColor: Colors.white,
    },
  };

  return variants[variant] || variants.primary;
}

const btnStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrapper: { marginRight: Spacing.sm },
});

// ============================================================
// INPUT
// ============================================================
export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  error,
  prefix,
  suffix,
  multiline = false,
  style,
  inputStyle,
  autoFocus = false,
  maxLength,
  editable = true,
}) {
  return (
    <View style={[inputStyles.container, style]}>
      {label && <Text style={inputStyles.label}>{label}</Text>}
      <View style={[inputStyles.inputRow, error && inputStyles.inputError, !editable && inputStyles.inputDisabled]}>
        {prefix && <Text style={inputStyles.prefix}>{prefix}</Text>}
        <TextInput
          style={[inputStyles.input, inputStyle, multiline && inputStyles.multiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.gray400}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoFocus={autoFocus}
          multiline={multiline}
          maxLength={maxLength}
          editable={editable}
          numberOfLines={multiline ? 3 : 1}
        />
        {suffix && <Text style={inputStyles.suffix}>{suffix}</Text>}
      </View>
      {error && <Text style={inputStyles.errorText}>{error}</Text>}
    </View>
  );
}

const inputStyles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: {
    fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightMedium,
    color: Colors.gray800,
    marginBottom: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  inputError: { borderColor: Colors.error },
  inputDisabled: { backgroundColor: Colors.gray100 },
  input: {
    flex: 1,
    fontSize: Typography.fontSizeMD,
    color: Colors.gray900,
    paddingVertical: Spacing.sm,
  },
  multiline: { height: 100, textAlignVertical: 'top' },
  prefix: { fontSize: Typography.fontSizeMD, color: Colors.gray600, marginRight: Spacing.sm },
  suffix: { fontSize: Typography.fontSizeMD, color: Colors.gray600, marginLeft: Spacing.sm },
  errorText: { fontSize: Typography.fontSizeSM, color: Colors.error, marginTop: 4 },
});

// ============================================================
// CARD
// ============================================================
export function Card({ children, style, onPress }) {
  if (onPress) {
    return (
      <TouchableOpacity
        style={[cardStyles.card, style]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[cardStyles.card, style]}>{children}</View>;
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.md,
  },
});

// ============================================================
// BADGE STATUT TRANSACTION
// ============================================================
export function StatusBadge({ status }) {
  const configs = {
    completed: { label: 'Confirmé', bg: Colors.successBg, color: Colors.success },
    awaiting_confirmation: { label: 'En attente', bg: Colors.warningBg, color: '#856404' },
    pending: { label: 'En attente', bg: Colors.warningBg, color: '#856404' },
    failed: { label: 'Échoué', bg: Colors.errorBg, color: Colors.error },
    cancelled: { label: 'Annulé', bg: Colors.gray100, color: Colors.gray600 },
  };
  const config = configs[status] || configs.pending;

  return (
    <View style={[badgeStyles.badge, { backgroundColor: config.bg }]}>
      <Text style={[badgeStyles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightSemibold,
  },
});

// ============================================================
// EMPTY STATE
// ============================================================
export function EmptyState({ icon, title, subtitle }) {
  return (
    <View style={emptyStyles.container}>
      {icon && <Text style={emptyStyles.icon}>{icon}</Text>}
      <Text style={emptyStyles.title}>{title}</Text>
      {subtitle && <Text style={emptyStyles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', padding: Spacing.xxl },
  icon: { fontSize: 48, marginBottom: Spacing.md },
  title: {
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightSemibold,
    color: Colors.gray700,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSizeMD,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
  },
});
