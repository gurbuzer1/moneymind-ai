import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { Card, Modal, Input, Button, EmptyState, DatePicker } from '../../src/components';
import { useDatabase } from '../../src/db/DatabaseProvider';
import { getSavingsGoals, insertSavingsGoal, updateSavingsGoal, deleteSavingsGoal } from '../../src/db/queries';
import { SavingsGoal } from '../../src/types';
import { formatCurrency } from '../../src/utils/formatting';
import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';

export default function SavingsScreen() {
  const db = useDatabase();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFundsModal, setShowFundsModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState(format(new Date(Date.now() + 90 * 86400000), 'yyyy-MM-dd'));
  const [fundsAmount, setFundsAmount] = useState('');

  const load = async () => setGoals(await getSavingsGoals(db));

  useEffect(() => { load(); }, [db]);

  const handleCreate = async () => {
    const t = parseFloat(target);
    if (!name || isNaN(t) || t <= 0) return;
    await insertSavingsGoal(db, {
      id: uuid(),
      name,
      target_amount: t,
      current_amount: 0,
      target_date: targetDate,
    });
    setShowCreateModal(false);
    setName('');
    setTarget('');
    load();
  };

  const openAddFunds = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setFundsAmount('');
    setShowFundsModal(true);
  };

  const handleAddFunds = async () => {
    if (!selectedGoal) return;
    const amt = parseFloat(fundsAmount);
    if (isNaN(amt) || amt <= 0) return;
    await updateSavingsGoal(db, {
      ...selectedGoal,
      current_amount: Math.min(selectedGoal.current_amount + amt, selectedGoal.target_amount),
    });
    setShowFundsModal(false);
    setSelectedGoal(null);
    load();
  };

  const handleWithdraw = async () => {
    if (!selectedGoal) return;
    const amt = parseFloat(fundsAmount);
    if (isNaN(amt) || amt <= 0) return;
    await updateSavingsGoal(db, {
      ...selectedGoal,
      current_amount: Math.max(selectedGoal.current_amount - amt, 0),
    });
    setShowFundsModal(false);
    setSelectedGoal(null);
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
          const isComplete = pct >= 1;
          return (
            <Card variant="elevated" style={styles.card}>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalName}>
                    {isComplete ? '  ' : ''}{item.name}
                  </Text>
                  <Text style={styles.goalDate}>Target: {item.target_date}</Text>
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity onPress={() => openAddFunds(item)} style={styles.actionBtn}>
                    <MaterialIcons name="add-circle-outline" size={22} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                    <MaterialIcons name="delete-outline" size={20} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.amountRow}>
                <Text style={styles.current}>{formatCurrency(item.current_amount)}</Text>
                <Text style={styles.targetText}>/ {formatCurrency(item.target_amount)}</Text>
              </View>
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(pct * 100, 100)}%`,
                      backgroundColor: isComplete ? colors.income : colors.primary,
                    },
                  ]}
                />
              </View>
              <View style={styles.bottomRow}>
                <Text style={styles.pct}>{Math.round(pct * 100)}% saved</Text>
                {isComplete && <Text style={styles.completeText}>Goal reached!</Text>}
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="savings"
            title="No Savings Goals"
            message="Set goals to track your savings progress."
            actionLabel="Add Goal"
            onAction={() => setShowCreateModal(true)}
          />
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Create Goal Modal */}
      <Modal visible={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Savings Goal">
        <Input label="Goal Name" value={name} onChangeText={setName} placeholder="e.g. Emergency Fund" />
        <Input
          label="Target Amount"
          value={target}
          onChangeText={setTarget}
          keyboardType="numeric"
          placeholder="e.g. 10000"
          containerStyle={{ marginTop: spacing.md }}
        />
        <View style={{ marginTop: spacing.md }}>
          <DatePicker label="Target Date" value={targetDate} onChange={setTargetDate} />
        </View>
        <Button title="Create Goal" onPress={handleCreate} disabled={!name || !target} style={{ marginTop: spacing.lg }} />
      </Modal>

      {/* Add/Withdraw Funds Modal */}
      <Modal
        visible={showFundsModal}
        onClose={() => setShowFundsModal(false)}
        title={selectedGoal ? `Update: ${selectedGoal.name}` : 'Update Savings'}
      >
        {selectedGoal && (
          <Text style={styles.fundsInfo}>
            Current: {formatCurrency(selectedGoal.current_amount)} / {formatCurrency(selectedGoal.target_amount)}
          </Text>
        )}
        <Input
          label="Amount"
          value={fundsAmount}
          onChangeText={setFundsAmount}
          keyboardType="numeric"
          placeholder="Enter amount"
          containerStyle={{ marginTop: spacing.sm }}
        />
        <View style={styles.fundsActions}>
          <Button
            title="Add Funds"
            onPress={handleAddFunds}
            disabled={!fundsAmount}
            style={{ flex: 1 }}
          />
          <Button
            title="Withdraw"
            onPress={handleWithdraw}
            disabled={!fundsAmount}
            variant="outline"
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, paddingBottom: 100 },
  card: { marginBottom: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  actionBtn: { padding: 4 },
  goalName: { ...typography.bodyBold, color: colors.text },
  goalDate: { ...typography.small, color: colors.textTertiary, marginTop: 2 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: spacing.sm },
  current: { ...typography.h3, color: colors.primary },
  targetText: { ...typography.caption, color: colors.textSecondary },
  progressBg: { height: 8, borderRadius: 4, backgroundColor: colors.borderLight, marginTop: spacing.sm },
  progressFill: { height: '100%', borderRadius: 4 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  pct: { ...typography.small, color: colors.textSecondary },
  completeText: { ...typography.smallBold, color: colors.income },
  fundsInfo: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  fundsActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
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
