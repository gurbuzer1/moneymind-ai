import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { Card, Modal, Input, Button, EmptyState } from '../../src/components';
import { useBudgetStore, useTransactionStore } from '../../src/stores';
import { useDatabase } from '../../src/db/DatabaseProvider';
import { formatCurrency, getCurrentMonth } from '../../src/utils/formatting';
import { getCategoryById, expenseCategories } from '../../src/utils/categories';

export default function BudgetScreen() {
  const db = useDatabase();
  const { budgets, loadBudgets, setBudget } = useBudgetStore();
  const { categoryTotals, loadTransactions } = useTransactionStore();
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [limitInput, setLimitInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadBudgets(db);
      loadTransactions(db);
    }, [db])
  );

  const handleSave = async () => {
    const limit = parseFloat(limitInput);
    if (!selectedCategory || isNaN(limit) || limit <= 0) return;
    await setBudget(db, selectedCategory, limit);
    setShowModal(false);
    setSelectedCategory('');
    setLimitInput('');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Monthly Budget</Text>
        <Text style={styles.subtitle}>{getCurrentMonth()}</Text>

        {budgets.length === 0 ? (
          <EmptyState
            icon="pie-chart"
            title="No Budgets Set"
            message="Set spending limits for your categories to stay on track."
            actionLabel="Add Budget"
            onAction={() => setShowModal(true)}
          />
        ) : (
          budgets.map((b) => {
            const cat = getCategoryById(b.category);
            const spent = categoryTotals.find((c) => c.category === b.category)?.total ?? 0;
            const pct = Math.min(spent / b.monthly_limit, 1);
            const isOver = spent >= b.monthly_limit;
            const isWarning = pct >= 0.8 && !isOver;

            return (
              <Card key={b.id} variant="elevated" style={styles.budgetCard}>
                <View style={styles.budgetHeader}>
                  <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                    <MaterialIcons name={cat.icon as any} size={18} color={cat.color} />
                  </View>
                  <View style={styles.budgetInfo}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <Text style={styles.budgetDetail}>
                      {formatCurrency(spent)} / {formatCurrency(b.monthly_limit)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.pctText,
                      {
                        color: isOver
                          ? colors.expense
                          : isWarning
                          ? colors.warning
                          : colors.income,
                      },
                    ]}
                  >
                    {Math.round(pct * 100)}%
                  </Text>
                </View>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(pct * 100, 100)}%`,
                        backgroundColor: isOver
                          ? colors.expense
                          : isWarning
                          ? colors.warning
                          : colors.income,
                      },
                    ]}
                  />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} onClose={() => setShowModal(false)} title="Set Budget">
        <Text style={styles.modalLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catPicker}>
          {expenseCategories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.catChip, selectedCategory === c.id && styles.catChipActive]}
              onPress={() => setSelectedCategory(c.id)}
            >
              <MaterialIcons
                name={c.icon as any}
                size={16}
                color={selectedCategory === c.id ? '#fff' : colors.text}
              />
              <Text
                style={[styles.chipText, selectedCategory === c.id && { color: '#fff' }]}
              >
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Input
          label="Monthly Limit"
          value={limitInput}
          onChangeText={setLimitInput}
          keyboardType="numeric"
          placeholder="e.g. 500"
          containerStyle={{ marginTop: spacing.md }}
        />
        <Button
          title="Save Budget"
          onPress={handleSave}
          disabled={!selectedCategory || !limitInput}
          style={{ marginTop: spacing.lg }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 100 },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  budgetCard: { marginBottom: spacing.sm },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  catIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetInfo: { flex: 1 },
  catName: { ...typography.captionBold, color: colors.text },
  budgetDetail: { ...typography.small, color: colors.textSecondary },
  pctText: { ...typography.bodyBold },
  progressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderLight,
  },
  progressFill: { height: '100%', borderRadius: 3 },
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
  modalLabel: { ...typography.captionBold, color: colors.text, marginBottom: spacing.sm },
  catPicker: { maxHeight: 44 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.small, color: colors.text },
});
