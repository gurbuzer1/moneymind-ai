import React, { createContext, useContext, useEffect, useState } from 'react';
import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { DATABASE_NAME, initializeDatabase } from './schema';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme';

const DatabaseContext = createContext<SQLiteDatabase | null>(null);

export const useDatabase = (): SQLiteDatabase => {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error('useDatabase must be used within DatabaseProvider');
  return db;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);

  useEffect(() => {
    (async () => {
      const database = await openDatabaseAsync(DATABASE_NAME);
      await initializeDatabase(database);
      setDb(database);
    })();
  }, []);

  if (!db) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;
};

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
});
