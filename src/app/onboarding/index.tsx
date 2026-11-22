import { StyleSheet, View } from 'react-native';
import { Onboarding } from '@/components/onboarding';

export default function OnboardingScreen() {
  return (
    <View style={styles.container}>
      <Onboarding />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});