import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, typography, spacing, borderRadius } from '../theme';
import { format, parseISO } from 'date-fns';

interface DatePickerProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

export const DatePicker: React.FC<DatePickerProps> = ({ label, value, onChange }) => {
  const [show, setShow] = useState(false);
  const dateValue = value ? parseISO(value) : new Date();

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selectedDate) {
      onChange(format(selectedDate, 'yyyy-MM-dd'));
    }
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.button} onPress={() => setShow(true)}>
        <Text style={styles.buttonText}>
          {value ? format(parseISO(value), 'MMM dd, yyyy') : 'Select date'}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          maximumDate={new Date()}
        />
      )}
      {show && Platform.OS === 'ios' && (
        <TouchableOpacity style={styles.done} onPress={() => setShow(false)}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    ...typography.captionBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  button: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  buttonText: {
    ...typography.body,
    color: colors.text,
  },
  done: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
  },
  doneText: {
    ...typography.captionBold,
    color: colors.primary,
  },
});
