import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { Input, Button, DatePicker } from '../../src/components';
import { useTransactionStore } from '../../src/stores';
import { useDatabase } from '../../src/db/DatabaseProvider';
import { TransactionType } from '../../src/types';
import { expenseCategories, incomeCategories } from '../../src/utils/categories';
import { format } from 'date-fns';
import { hapticSuccess, hapticSelection } from '../../src/utils/haptics';

export default function AddTransactionScreen() {
  const db = useDatabase();
  const router = useRouter();
  const { addTransaction } = useTransactionStore();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);

  const cats = type === 'expense' ? expenseCategories : incomeCategories;

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || !category) return;
    setLoading(true);
    await addTransaction(db, {
      type,
      amount: amt,
      category,
      description,
      date,
      is_recurring: isRecurring,
    });
    hapticSuccess();
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Type Toggle */}
      <View style={styles.typeToggle}>
        <TouchableOpacity
          style={[styles.typeBtn, type === 'expense' && styles.typeBtnActive]}
          onPress={() => { hapticSelection(); setType('expense'); setCategory(''); }}
        >
          <MaterialIcons
            name="arrow-upward"
            size={18}
            color={type === 'expense' ? '#fff' : colors.text}
          />
          <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>
            Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeBtn, type === 'income' && styles.incomeActive]}
          onPress={() => { hapticSelection(); setType('income'); setCategory(''); }}
        >
          <MaterialIcons
            name="arrow-downward"
            size={18}
            color={type === 'income' ? '#fff' : colors.text}
          />
          <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>
            Income
          </Text>
        </TouchableOpacity>
      </View>

      {/* Amount */}
      <Input
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="0.00"
        containerStyle={styles.field}
      />

      {/* Category Grid */}
      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryGrid}>
        {cats.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.catItem, category === c.id && { borderColor: c.color, backgroundColor: c.color + '15' }]}
            onPress={() => { hapticSelection(); setCategory(c.id); }}
          >
            <MaterialIcons name={c.icon as any} size={22} color={c.color} />
            <Text style={styles.catLabel} numberOfLines={1}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Description */}
      <Input
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. Lunch at Chipotle"
        containerStyle={styles.field}
      />

      {/* Date */}
      <View style={styles.field}>
        <DatePicker label="Date" value={date} onChange={setDate} />
      </View>

      {/* Recurring Toggle */}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Recurring Transaction</Text>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ true: colors.primary }}
        />
      </View>

      <Button
        title="Save Transaction"
        onPress={handleSave}
        loading={loading}
        disabled={!amount || !category}
        style={styles.saveBtn}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
    borderRadius: borderRadius.sm,
  },
  typeBtnActive: { backgroundColor: colors.expense },
  incomeActive: { backgroundColor: colors.income },
  typeText: { ...typography.captionBold, color: colors.text },
  typeTextActive: { color: '#fff' },
  field: { marginBottom: spacing.md },
  label: { ...typography.captionBold, color: colors.text, marginBottom: spacing.sm },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
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
