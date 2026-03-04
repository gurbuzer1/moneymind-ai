import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { Card, Input, Button, Modal } from '../../src/components';
import { useUserStore } from '../../src/stores';
import { useDatabase } from '../../src/db/DatabaseProvider';
import { formatCurrency } from '../../src/utils/formatting';

export default function ProfileScreen() {
  const db = useDatabase();
  const router = useRouter();
  const { profile, loadProfile, updateProfile } = useUserStore();
  const [showEdit, setShowEdit] = useState(false);
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');
  const [currency, setCurrency] = useState('USD');

  useFocusEffect(
    useCallback(() => {
      loadProfile(db);
    }, [db])
  );

  const openEdit = () => {
    setName(profile?.display_name ?? '');
    setIncome(profile?.monthly_income?.toString() ?? '');
    setCurrency(profile?.currency ?? 'USD');
    setShowEdit(true);
  };

  const handleSave = async () => {
    await updateProfile(db, {
      display_name: name,
      monthly_income: parseFloat(income) || 0,
      currency,
    });
    setShowEdit(false);
  };

  const menuItems = [
    { icon: 'savings' as const, label: 'Savings Goals', onPress: () => router.push('/savings') },
    { icon: 'star' as const, label: 'Upgrade to Premium', onPress: () => router.push('/subscription') },
    { icon: 'info' as const, label: 'About', onPress: () => Alert.alert('MoneyMind AI', 'Version 1.0.0\nAI-powered personal finance') },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card variant="elevated" style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.display_name?.[0] ?? 'U').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.display_name || 'User'}</Text>
        <Text style={styles.email}>{profile?.email || 'Set up your profile'}</Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatCurrency(profile?.monthly_income ?? 0)}</Text>
            <Text style={styles.statLabel}>Monthly Income</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile?.currency ?? 'USD'}</Text>
            <Text style={styles.statLabel}>Currency</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {profile?.subscription_tier === 'premium' ? 'Pro' : 'Free'}
            </Text>
            <Text style={styles.statLabel}>Plan</Text>
          </View>
        </View>
        <Button title="Edit Profile" onPress={openEdit} variant="outline" size="sm" />
      </Card>

      {menuItems.map((item) => (
        <TouchableOpacity key={item.label} onPress={item.onPress}>
          <Card style={styles.menuItem}>
            <View style={styles.menuRow}>
              <MaterialIcons name={item.icon} size={22} color={colors.primary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <MaterialIcons name="chevron-right" size={22} color={colors.textTertiary} />
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      <Modal visible={showEdit} onClose={() => setShowEdit(false)} title="Edit Profile">
        <Input label="Name" value={name} onChangeText={setName} placeholder="Your name" />
        <Input
          label="Monthly Income"
          value={income}
          onChangeText={setIncome}
          keyboardType="numeric"
          placeholder="e.g. 5000"
          containerStyle={{ marginTop: spacing.md }}
        />
        <Input
          label="Currency"
          value={currency}
          onChangeText={setCurrency}
          placeholder="USD"
          containerStyle={{ marginTop: spacing.md }}
        />
        <Button title="Save" onPress={handleSave} style={{ marginTop: spacing.lg }} />
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  profileCard: { alignItems: 'center', padding: spacing.lg, marginBottom: spacing.md },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.h1, color: '#fff' },
  name: { ...typography.h3, color: colors.text, marginTop: spacing.sm },
  email: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  stats: {
    flexDirection: 'row',
    marginVertical: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    width: '100%',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.bodyBold, color: colors.text },
  statLabel: { ...typography.small, color: colors.textTertiary, marginTop: 2 },
  divider: { width: 1, backgroundColor: colors.borderLight },
  menuItem: { marginBottom: spacing.sm },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  menuLabel: { ...typography.body, color: colors.text, flex: 1 },
});
