import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { colors, typography, spacing } from '../theme';

interface MonthSelectorProps {
  month: string; // YYYY-MM
  onChange: (month: string) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ month, onChange }) => {
  const date = parseISO(`${month}-01`);

  const prev = () => onChange(format(subMonths(date, 1), 'yyyy-MM'));
  const next = () => {
    const nextMonth = addMonths(date, 1);
    if (nextMonth <= new Date()) onChange(format(nextMonth, 'yyyy-MM'));
  };

  const isCurrentMonth = format(new Date(), 'yyyy-MM') === month;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={prev} style={styles.arrow}>
        <MaterialIcons name="chevron-left" size={28} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.label}>{format(date, 'MMMM yyyy')}</Text>
      <TouchableOpacity
        onPress={next}
        style={styles.arrow}
        disabled={isCurrentMonth}
      >
        <MaterialIcons
          name="chevron-right"
          size={28}
          color={isCurrentMonth ? colors.textTertiary : colors.text}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  arrow: {
    padding: spacing.xs,
  },
  label: {
    ...typography.h4,
    color: colors.text,
    minWidth: 160,
    textAlign: 'center',
  },
});
