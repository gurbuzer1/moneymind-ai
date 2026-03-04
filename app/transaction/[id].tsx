import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { Input, Button, DatePicker } from '../../src/components';
import { useTransactionStore } from '../../src/stores';
import { useDatabase } from '../../src/db/DatabaseProvider';
import { TransactionType } from '../../src/types';
import { expenseCategories, incomeCategories } from '../../src/utils/categories';

export default function EditTransactionScreen() {
  const db = useDatabase();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, updateTransaction, deleteTransaction } = useTransactionStore();

  const existing = transactions.find((t) => t.id === id);

  const [type, setType] = useState<TransactionType>(existing?.type ?? 'expense');
  const [amount, setAmount] = useState(existing?.amount.toString() ?? '');
  const [category, setCategory] = useState(existing?.category ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [date, setDate] = useState(existing?.date ?? '');
  const [isRecurring, setIsRecurring] = useState(existing?.is_recurring ?? false);
  const [loading, setLoading] = useState(false);

  const cats = type === 'expense' ? expenseCategories : incomeCategories;

  useEffect(() => {
    if (!existing) return;
    setType(existing.type);
    setAmount(existing.amount.toString());
    setCategory(existing.category);
    setDescription(existing.description);
    setDate(existing.date);
    setIsRecurring(existing.is_recurring);
  }, [existing]);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || !category || !existing) return;
    setLoading(true);
    await updateTransaction(db, {
      ...existing,
      type,
      amount: amt,
      category,
      description,
      date,
      is_recurring: isRecurring,
    });
    router.back();
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert('Delete Transaction', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(db, id);
          router.back();
        },
      },
    ]);
  };

  if (!existing) {
    return (
      <View style={styles.container}>
        <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 40 }}>
          Transaction not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.typeToggle}>
        <TouchableOpacity
          style={[styles.typeBtn, type === 'expense' && styles.typeBtnActive]}
          onPress={() => { setType('expense'); setCategory(''); }}
        >
          <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeBtn, type === 'income' && styles.incomeActive]}
          onPress={() => { setType('income'); setCategory(''); }}
        >
          <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>Income</Text>
        </TouchableOpacity>
      </View>

      <Input label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" containerStyle={styles.field} />

      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryGrid}>
        {cats.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.catItem, category === c.id && { borderColor: c.color, backgroundColor: c.color + '15' }]}
            onPress={() => setCategory(c.id)}
          >
            <MaterialIcons name={c.icon as any} size={22} color={c.color} />
            <Text style={styles.catLabel} numberOfLines={1}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Input label="Description" value={description} onChangeText={setDescription} containerStyle={styles.field} />
      <View style={styles.field}>
        <DatePicker label="Date" value={date} onChange={setDate} />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Recurring</Text>
        <Switch value={isRecurring} onValueChange={setIsRecurring} trackColor={{ true: colors.primary }} />
      </View>

      <Button title="Save Changes" onPress={handleSave} loading={loading} style={styles.saveBtn} />
      <Button title="Delete Transaction" onPress={handleDelete} variant="ghost" textStyle={{ color: colors.error }} style={{ marginTop: spacing.sm }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 40 },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.md,
  },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.sm,
  },
  typeBtnActive: { backgroundColor: colors.expense },
  incomeActive: { backgroundColor: colors.income },
  typeText: { ...typography.captionBold, color: colors.text },
  typeTextActive: { color: '#fff' },
  field: { marginBottom: spacing.md },
  label: { ...typography.captionBold, color: colors.text, marginBottom: spacing.sm },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  catItem: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 4,
  },
  catLabel: { ...typography.small, color: colors.text, textAlign: 'center' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  switchLabel: { ...typography.body, color: colors.text },
  saveBtn: { marginTop: spacing.sm },
});
