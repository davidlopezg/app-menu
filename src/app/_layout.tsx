import { Stack } from 'expo-router';
import AppTabs from '@/components/app-tabs';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="onboarding" options={{ presentation: 'transparentModal' }} />
    </Stack>
  );
}
