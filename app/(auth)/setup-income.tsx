import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../src/theme';
import { Input, Button } from '../../src/components';
import { useUserStore } from '../../src/stores';
import { useDatabase } from '../../src/db/DatabaseProvider';

export default function SetupIncomeScreen() {
  const db = useDatabase();
  const router = useRouter();
  const { updateProfile } = useUserStore();
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');

  const handleNext = async () => {
    await updateProfile(db, {
      display_name: name || 'User',
      monthly_income: parseFloat(income) || 0,
    });
    router.push('/(auth)/setup-categories');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progress}>
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
      </View>

      <Text style={styles.title}>Set Up Your Profile</Text>
      <Text style={styles.subtitle}>Tell us about yourself so we can help you better.</Text>

      <View style={styles.form}>
        <Input
          label="Your Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Alex"
          containerStyle={styles.field}
        />
        <Input
          label="Monthly Income"
          value={income}
          onChangeText={setIncome}
          keyboardType="numeric"
          placeholder="e.g. 5000"
          containerStyle={styles.field}
        />
      </View>

      <View style={styles.actions}>
        <Button title="Continue" onPress={handleNext} size="lg" />
        <Button title="Skip" variant="ghost" onPress={handleNext} />
      </View>
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
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  form: { marginTop: spacing.xl },
  field: { marginBottom: spacing.md },
  actions: { marginTop: 'auto', gap: spacing.sm },
});
