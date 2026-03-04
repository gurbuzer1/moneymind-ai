import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { Card, Modal, Input, Button, EmptyState } from '../../src/components';
import { useDatabase } from '../../src/db/DatabaseProvider';
import { getSavingsGoals, insertSavingsGoal, updateSavingsGoal, deleteSavingsGoal } from '../../src/db/queries';
import { SavingsGoal } from '../../src/types';
import { formatCurrency } from '../../src/utils/formatting';
import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';

export default function SavingsScreen() {
  const db = useDatabase();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState(format(new Date(Date.now() + 90 * 86400000), 'yyyy-MM-dd'));

  const load = async () => setGoals(await getSavingsGoals(db));

  useEffect(() => { load(); }, [db]);

  const handleAdd = async () => {
    const t = parseFloat(target);
    if (!name || isNaN(t) || t <= 0) return;
    await insertSavingsGoal(db, {
      id: uuid(),
      name,
      target_amount: t,
      current_amount: 0,
      target_date: targetDate,
    });
    setShowModal(false);
    setName('');
    setTarget('');
    load();
  };

  const handleAddFunds = async (goal: SavingsGoal) => {
    // Alert.prompt is iOS only; for cross-platform, use a simple increment
    const increment = goal.target_amount * 0.1; // Add 10% of target as default
    await updateSavingsGoal(db, { ...goal, current_amount: goal.current_amount + increment });
    load();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Goal', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteSavingsGoal(db, id); load(); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={goals}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const pct = item.target_amount > 0 ? item.current_amount / item.target_amount : 0;
          return (
            <Card variant="elevated" style={styles.card}>
              <View style={styles.header}>
                <View>
                  <Text style={styles.goalName}>{item.name}</Text>
                  <Text style={styles.goalDate}>Target: {item.target_date}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <MaterialIcons name="delete-outline" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
              <View style={styles.amountRow}>
                <Text style={styles.current}>{formatCurrency(item.current_amount)}</Text>
                <Text style={styles.target}>/ {formatCurrency(item.target_amount)}</Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${Math.min(pct * 100, 100)}%` }]} />
              </View>
              <Text style={styles.pct}>{Math.round(pct * 100)}% saved</Text>
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="savings"
            title="No Savings Goals"
            message="Set goals to track your savings progress."
            actionLabel="Add Goal"
            onAction={() => setShowModal(true)}
          />
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} onClose={() => setShowModal(false)} title="New Savings Goal">
        <Input label="Goal Name" value={name} onChangeText={setName} placeholder="e.g. Emergency Fund" />
        <Input
          label="Target Amount"
          value={target}
          onChangeText={setTarget}
          keyboardType="numeric"
          placeholder="e.g. 10000"
          containerStyle={{ marginTop: spacing.md }}
        />
        <Input
          label="Target Date"
          value={targetDate}
          onChangeText={setTargetDate}
          placeholder="YYYY-MM-DD"
          containerStyle={{ marginTop: spacing.md }}
        />
        <Button title="Create Goal" onPress={handleAdd} disabled={!name || !target} style={{ marginTop: spacing.lg }} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, paddingBottom: 100 },
  card: { marginBottom: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  goalName: { ...typography.bodyBold, color: colors.text },
  goalDate: { ...typography.small, color: colors.textTertiary, marginTop: 2 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: spacing.sm },
  current: { ...typography.h3, color: colors.primary },
  target: { ...typography.caption, color: colors.textSecondary },
  progressBg: { height: 8, borderRadius: 4, backgroundColor: colors.borderLight, marginTop: spacing.sm },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  pct: { ...typography.small, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'right' },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
