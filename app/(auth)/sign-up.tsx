import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../src/theme';
import { Input, Button } from '../../src/components';
import { register } from '../../src/services/auth';
import { useUserStore } from '../../src/stores';
import { useDatabase } from '../../src/db/DatabaseProvider';

export default function SignUpScreen() {
  const router = useRouter();
  const db = useDatabase();
  const { updateProfile } = useUserStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) return;
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { user } = await register(email, password, name);
      await updateProfile(db, {
        email: user.email,
        display_name: user.displayName || name,
      });
      router.replace('/(auth)/setup-income');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Registration failed. Try again.';
      Alert.alert('Sign Up Failed', msg);
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
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Start your journey to better finances</Text>

        <View style={styles.form}>
          <Input
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            containerStyle={styles.field}
          />
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
            placeholder="At least 6 characters"
            containerStyle={styles.field}
          />
        </View>

        <Button title="Create Account" onPress={handleSignUp} loading={loading} size="lg" />
        <Button
          title="Already have an account? Sign In"
          variant="ghost"
          onPress={() => router.push('/(auth)/sign-in')}
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
