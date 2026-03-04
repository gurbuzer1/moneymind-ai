import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../src/theme';
import { Button } from '../../src/components';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="account-balance-wallet" size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>MoneyMind AI</Text>
        <Text style={styles.subtitle}>
          Your AI-powered personal finance companion. Track spending, set budgets, and get smart financial advice.
        </Text>
      </View>

      <View style={styles.features}>
        {[
          { icon: 'trending-up' as const, text: 'Smart spending analysis' },
          { icon: 'smart-toy' as const, text: 'AI financial advisor' },
          { icon: 'pie-chart' as const, text: 'Budget tracking' },
        ].map((f) => (
          <View key={f.text} style={styles.feature}>
            <MaterialIcons name={f.icon} size={24} color={colors.primary} />
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button title="Get Started" onPress={() => router.push('/(auth)/setup-income')} size="lg" />
        <Button
          title="I'll set up later"
          variant="ghost"
          onPress={() => router.replace('/(tabs)/dashboard')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  hero: { alignItems: 'center', marginTop: spacing.xxl },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h1, color: colors.text, marginTop: spacing.lg },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  features: { gap: spacing.md },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureText: { ...typography.body, color: colors.text },
  actions: { gap: spacing.sm },
});
