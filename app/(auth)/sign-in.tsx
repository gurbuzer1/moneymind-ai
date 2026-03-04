import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../src/theme';
import { Input, Button } from '../../src/components';
import { login } from '../../src/services/auth';
import { useUserStore } from '../../src/stores';
import { useDatabase } from '../../src/db/DatabaseProvider';

export default function SignInScreen() {
  const router = useRouter();
  const db = useDatabase();
  const { updateProfile } = useUserStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      const { user } = await login(email, password);
      await updateProfile(db, {
        email: user.email,
        display_name: user.displayName,
        onboarding_completed: true,
      });
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Login failed. Check your credentials.';
      Alert.alert('Sign In Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your MoneyMind account</Text>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
            containerStyle={styles.field}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Your password"
            containerStyle={styles.field}
          />
        </View>

        <Button title="Sign In" onPress={handleSignIn} loading={loading} size="lg" />
        <Button
          title="Don't have an account? Sign Up"
          variant="ghost"
          onPress={() => router.push('/(auth)/sign-up')}
        />
        <Button
          title="Continue without account"
          variant="ghost"
          onPress={() => router.replace('/(auth)/welcome')}
          textStyle={{ color: colors.textTertiary }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  title: { ...typography.h1, color: colors.text, textAlign: 'center' },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  form: { marginBottom: spacing.lg },
  field: { marginBottom: spacing.md },
});
