import React, { useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { Card } from '../../src/components';
import { useTransactionStore } from '../../src/stores';
import { useDatabase } from '../../src/db/DatabaseProvider';
import { formatCurrency } from '../../src/utils/formatting';
import { getCategoryById } from '../../src/utils/categories';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const db = useDatabase();
  const router = useRouter();
  const {
    monthlyIncome,
    monthlyExpenses,
    categoryTotals,
    transactions,
    loadTransactions,
  } = useTransactionStore();

  useFocusEffect(
    useCallback(() => {
      loadTransactions(db);
    }, [db])
  );

  const savings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? savings / monthlyIncome : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <Card variant="elevated" style={{ ...styles.summaryCard, backgroundColor: colors.primary }}>
          <MaterialIcons name="arrow-downward" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(monthlyIncome)}</Text>
        </Card>
        <Card variant="elevated" style={{ ...styles.summaryCard, backgroundColor: colors.expense }}>
          <MaterialIcons name="arrow-upward" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(monthlyExpenses)}</Text>
        </Card>
      </View>

      {/* Savings Card */}
      <Card variant="elevated" style={styles.savingsCard}>
        <View style={styles.savingsHeader}>
          <Text style={styles.savingsTitle}>Net Savings</Text>
          <Text style={[styles.savingsRate, { color: savings >= 0 ? colors.income : colors.expense }]}>
            {Math.round(savingsRate * 100)}%
          </Text>
        </View>
        <Text style={[styles.savingsAmount, { color: savings >= 0 ? colors.income : colors.expense }]}>
          {formatCurrency(savings)}
        </Text>
      </Card>

      {/* Spending Breakdown */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Spending Breakdown</Text>
      </View>
      {categoryTotals.length > 0 ? (
        <Card variant="elevated" style={styles.breakdownCard}>
          {categoryTotals.slice(0, 6).map((item) => {
            const cat = getCategoryById(item.category);
            const pct = monthlyExpenses > 0 ? item.total / monthlyExpenses : 0;
            return (
              <View key={item.category} style={styles.categoryRow}>
                <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                  <MaterialIcons name={cat.icon as any} size={18} color={cat.color} />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(pct * 100, 100)}%`, backgroundColor: cat.color },
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.categoryAmount}>{formatCurrency(item.total)}</Text>
              </View>
            );
          })}
        </Card>
      ) : (
        <Card variant="elevated" style={styles.emptyCard}>
          <MaterialIcons name="receipt-long" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No transactions yet</Text>
          <TouchableOpacity onPress={() => router.push('/transaction/add')}>
            <Text style={styles.emptyAction}>Add your first transaction</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Recent Transactions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      {transactions.slice(0, 5).map((t) => {
        const cat = getCategoryById(t.category);
        return (
          <Card key={t.id} style={styles.transactionItem}>
            <View style={styles.transactionRow}>
              <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                <MaterialIcons name={cat.icon as any} size={18} color={cat.color} />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDesc}>{t.description || cat.name}</Text>
                <Text style={styles.transactionDate}>{t.date}</Text>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  { color: t.type === 'income' ? colors.income : colors.expense },
                ]}
              >
                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
              </Text>
            </View>
          </Card>
        );
      })}

      {/* FAB spacer */}
      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  summaryCard: { flex: 1, padding: spacing.md },
  summaryLabel: { ...typography.small, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs },
  summaryAmount: { ...typography.h3, color: '#fff', marginTop: spacing.xs },
  savingsCard: { marginBottom: spacing.md },
  savingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  savingsTitle: { ...typography.captionBold, color: colors.textSecondary },
  savingsRate: { ...typography.captionBold },
  savingsAmount: { ...typography.h2, marginTop: spacing.xs },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: { ...typography.h4, color: colors.text },
  seeAll: { ...typography.captionBold, color: colors.primary },
  breakdownCard: { gap: spacing.md },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: { flex: 1 },
  categoryName: { ...typography.caption, color: colors.text },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    marginTop: 4,
  },
  progressFill: { height: '100%', borderRadius: 2 },
  categoryAmount: { ...typography.captionBold, color: colors.text },
  emptyCard: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary },
  emptyAction: { ...typography.captionBold, color: colors.primary },
  transactionItem: { marginBottom: spacing.sm },
  transactionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  transactionInfo: { flex: 1 },
  transactionDesc: { ...typography.caption, color: colors.text },
  transactionDate: { ...typography.small, color: colors.textTertiary },
  transactionAmount: { ...typography.captionBold },
});
