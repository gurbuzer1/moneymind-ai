import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';
import { getCategoryById } from '../utils/categories';
import { formatCurrency } from '../utils/formatting';

interface SpendingChartProps {
  categoryTotals: { category: string; total: number }[];
  totalExpenses: number;
}

export const SpendingChart: React.FC<SpendingChartProps> = ({
  categoryTotals,
  totalExpenses,
}) => {
  if (categoryTotals.length === 0) return null;

  // Build pie segments as a ring chart using conic gradient simulation
  // Since react-native-svg conic gradients are complex, use a stacked bar approach
  const segments = categoryTotals.slice(0, 8);
  let accumulated = 0;

  return (
    <View style={styles.container}>
      {/* Horizontal stacked bar */}
      <View style={styles.barContainer}>
        {segments.map((item) => {
          const pct = totalExpenses > 0 ? (item.total / totalExpenses) * 100 : 0;
          const cat = getCategoryById(item.category);
          accumulated += pct;
          return (
            <View
              key={item.category}
              style={[
                styles.barSegment,
                {
                  width: `${Math.max(pct, 2)}%`,
                  backgroundColor: cat.color,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {segments.map((item) => {
          const cat = getCategoryById(item.category);
          const pct = totalExpenses > 0 ? (item.total / totalExpenses) * 100 : 0;
          return (
            <View key={item.category} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
              <View style={styles.legendInfo}>
                <View style={styles.legendRow}>
                  <MaterialIcons name={cat.icon as any} size={14} color={cat.color} />
                  <Text style={styles.legendName} numberOfLines={1}>{cat.name}</Text>
                </View>
                <Text style={styles.legendValue}>
                  {formatCurrency(item.total)} ({Math.round(pct)}%)
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  barContainer: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.borderLight,
  },
  barSegment: {
    height: '100%',
  },
  legend: {
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  legendName: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
  },
  legendValue: {
    ...typography.small,
    color: colors.textSecondary,
  },
});
