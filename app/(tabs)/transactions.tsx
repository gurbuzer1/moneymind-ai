import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { Card, EmptyState } from '../../src/components';
import { useTransactionStore } from '../../src/stores';
import { useDatabase } from '../../src/db/DatabaseProvider';
import { formatCurrency, formatDate } from '../../src/utils/formatting';
import { getCategoryById } from '../../src/utils/categories';
import { Transaction } from '../../src/types';

export default function TransactionsScreen() {
  const db = useDatabase();
  const router = useRouter();
  const { transactions, loadTransactions, deleteTransaction } = useTransactionStore();

  useFocusEffect(
    useCallback(() => {
      loadTransactions(db);
    }, [db])
  );

  const handleDelete = (id: string) => {
    Alert.alert('Delete Transaction', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTransaction(db, id),
      },
    ]);
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const cat = getCategoryById(item.category);
    return (
      <TouchableOpacity
        onPress={() => router.push(`/transaction/${item.id}`)}
        onLongPress={() => handleDelete(item.id)}
      >
        <Card style={styles.item}>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: cat.color + '20' }]}>
              <MaterialIcons name={cat.icon as any} size={20} color={cat.color} />
            </View>
            <View style={styles.info}>
              <Text style={styles.desc}>{item.description || cat.name}</Text>
              <Text style={styles.date}>{formatDate(item.date)}</Text>
            </View>
            <View style={styles.amountCol}>
              <Text
                style={[
                  styles.amount,
                  { color: item.type === 'income' ? colors.income : colors.expense },
                ]}
              >
                {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
              </Text>
              <Text style={styles.category}>{cat.name}</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-long"
            title="No Transactions"
            message="Start tracking your spending by adding a transaction."
            actionLabel="Add Transaction"
            onAction={() => router.push('/transaction/add')}
          />
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/transaction/add')}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, paddingBottom: 100 },
  item: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  desc: { ...typography.body, color: colors.text },
  date: { ...typography.small, color: colors.textTertiary, marginTop: 2 },
  amountCol: { alignItems: 'flex-end' },
  amount: { ...typography.bodyBold },
  category: { ...typography.small, color: colors.textTertiary, marginTop: 2 },
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
