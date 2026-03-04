import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../src/theme';
import { Button, Card } from '../src/components';
import { useUserStore } from '../src/stores';
import { useDatabase } from '../src/db/DatabaseProvider';

export default function SubscriptionScreen() {
  const db = useDatabase();
  const router = useRouter();
  const { profile, updateProfile } = useUserStore();

  const isPremium = profile?.subscription_tier === 'premium';

  const features = [
    { icon: 'all-inclusive' as const, free: 'false', premium: 'true', label: 'Unlimited AI Chats' },
    { icon: 'analytics' as const, free: '5/mo', premium: 'Unlimited', label: 'AI Analysis' },
    { icon: 'trending-up' as const, free: 'Basic', premium: 'Advanced', label: 'Insights' },
    { icon: 'cloud-download' as const, free: 'false', premium: 'true', label: 'Data Export' },
  ];

  const handleUpgrade = async () => {
    // In production, this would go through IAP
    await updateProfile(db, { subscription_tier: 'premium' });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <MaterialIcons name="workspace-premium" size={48} color={colors.warning} />
        <Text style={styles.title}>MoneyMind Premium</Text>
        <Text style={styles.subtitle}>Unlock the full power of AI financial advice</Text>
      </View>

      <Card variant="elevated" style={styles.priceCard}>
        <Text style={styles.price}>$4.99</Text>
        <Text style={styles.period}>/month</Text>
      </Card>

      <View style={styles.features}>
        {features.map((f) => (
          <View key={f.label} style={styles.featureRow}>
            <MaterialIcons name={f.icon} size={22} color={colors.primary} />
            <Text style={styles.featureLabel}>{f.label}</Text>
            <MaterialIcons name="check-circle" size={18} color={colors.income} />
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        {isPremium ? (
          <Button title="You're on Premium" disabled onPress={() => {}} />
        ) : (
          <Button title="Upgrade to Premium" onPress={handleUpgrade} size="lg" />
        )}
        <Button title="Maybe Later" variant="ghost" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  header: { alignItems: 'center', marginTop: spacing.lg },
  title: { ...typography.h2, color: colors.text, marginTop: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginVertical: spacing.lg,
    padding: spacing.lg,
  },
  price: { ...typography.amount, color: colors.primary },
  period: { ...typography.body, color: colors.textSecondary },
  features: { gap: spacing.md, marginBottom: spacing.xl },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureLabel: { ...typography.body, color: colors.text, flex: 1 },
  actions: { marginTop: 'auto', gap: spacing.sm },
});
