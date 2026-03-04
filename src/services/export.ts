import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import { getTransactionsByMonth, getTransactions } from '../db/queries';
import { getCategoryById } from '../utils/categories';
import { format } from 'date-fns';

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function exportTransactionsCSV(
  db: SQLite.SQLiteDatabase,
  month?: string
): Promise<void> {
  const transactions = month
    ? await getTransactionsByMonth(db, month)
    : await getTransactions(db, 1000);

  if (transactions.length === 0) {
    throw new Error('No transactions to export');
  }

  const header = 'Date,Type,Category,Description,Amount,Recurring\n';
  const rows = transactions.map((t) => {
    const cat = getCategoryById(t.category);
    return [
      t.date,
      t.type,
      escapeCSV(cat.name),
      escapeCSV(t.description || ''),
      t.amount.toFixed(2),
      t.is_recurring ? 'Yes' : 'No',
    ].join(',');
  });

  const csv = header + rows.join('\n');
  const filename = month
    ? `moneymind-transactions-${month}.csv`
    : `moneymind-transactions-all-${format(new Date(), 'yyyy-MM-dd')}.csv`;

  const file = new File(Paths.cache, filename);
  file.write(csv);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Transactions',
      UTI: 'public.comma-separated-values-text',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}
