import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { Button } from '../../src/components';
import { useUserStore } from '../../src/stores';
import { useDatabase } from '../../src/db/DatabaseProvider';
import { expenseCategories } from '../../src/utils/categories';

export default function SetupCategoriesScreen() {
  const db = useDatabase();
  const router = useRouter();
  const { updateProfile } = useUserStore();
  const [selected, setSelected] = useState<string[]>([
    'food',
    'transport',
    'groceries',
    'bills',
    'entertainment',
  ]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    await updateProfile(db, { onboarding_completed: true });
    router.replace('/(tabs)/dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progress}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotActive]} />
      </View>

      <Text style={styles.title}>Your Spending Categories</Text>
      <Text style={styles.subtitle}>Select categories you typically spend on.</Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.grid}>
        {expenseCategories.map((c) => {
          const isSelected = selected.includes(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, isSelected && { backgroundColor: c.color + '20', borderColor: c.color }]}
              onPress={() => toggle(c.id)}
            >
              <MaterialIcons name={c.icon as any} size={20} color={c.color} />
              <Text style={styles.chipText}>{c.name}</Text>
              {isSelected && <MaterialIcons name="check" size={16} color={c.color} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Button title="Start Using MoneyMind" onPress={handleFinish} size="lg" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  scroll: { flex: 1, marginTop: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: { ...typography.caption, color: colors.text },
});
