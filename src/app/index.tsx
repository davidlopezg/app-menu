import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreen as NativeHomeScreen } from '@/components/home-screen';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <NativeHomeScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
