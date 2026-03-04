import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { useDatabase } from '../src/db/DatabaseProvider';
import { useUserStore } from '../src/stores';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../src/theme';

export default function Index() {
  const db = useDatabase();
  const { profile, loadProfile } = useUserStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadProfile(db).then(() => setReady(true));
  }, [db]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (profile && !profile.onboarding_completed) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return <Redirect href="/(tabs)/dashboard" />;
}
