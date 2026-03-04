import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PolarChart, Pie } from 'victory-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../theme';
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

  const segments = categoryTotals.slice(0, 8);

  const pieData = segments.map((item) => ({
    value: item.total,
    color: getCategoryById(item.category).color,
    label: item.category,
  }));

  return (
    <View style={styles.container}>
      {/* Pie Chart */}
      <View style={styles.chartWrapper}>
        <PolarChart
          data={pieData}
          colorKey="color"
          valueKey="value"
          labelKey="label"
        >
          <Pie.Chart innerRadius="55%">
            {() => <Pie.Slice />}
          </Pie.Chart>
        </PolarChart>
        <View style={styles.chartCenter}>
          <Text style={styles.centerAmount}>{formatCurrency(totalExpenses)}</Text>
          <Text style={styles.centerLabel}>Total Spent</Text>
        </View>
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
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
  },
  chartCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  centerAmount: {
    ...typography.h4,
    color: colors.text,
  },
  centerLabel: {
    ...typography.small,
    color: colors.textSecondary,
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
