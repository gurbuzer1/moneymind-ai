import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DatabaseProvider } from '../src/db/DatabaseProvider';
import { initAuth } from '../src/services/auth';
import { colors } from '../src/theme';

export default function RootLayout() {
  useEffect(() => {
    initAuth();
  }, []);

  return (
    <DatabaseProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="transaction/add"
          options={{ title: 'Add Transaction', presentation: 'modal' }}
        />
        <Stack.Screen
          name="transaction/[id]"
          options={{ title: 'Edit Transaction', presentation: 'modal' }}
        />
        <Stack.Screen name="savings/index" options={{ title: 'Savings Goals' }} />
        <Stack.Screen name="subscription" options={{ title: 'Premium', presentation: 'modal' }} />
      </Stack>
    </DatabaseProvider>
  );
}
