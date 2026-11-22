import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type StatCardProps = {
  value: string;
  label: string;
  accentColor: string;
  emoji: string;
};

export function StatCard({ value, label, accentColor, emoji }: StatCardProps) {
  const theme = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withTiming(1, { duration: 600 }) }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.innerContent, animatedStyle]}>
        <View style={[styles.emojiContainer, { backgroundColor: `${accentColor}20` }]}>
          <ThemedText type="default" style={styles.emojiText}>
            {emoji}
          </ThemedText>
        </View>
        <View style={styles.content}>
          <Animated.Text style={[styles.value, { color: theme.accent }]}>{value}</Animated.Text>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.label}>
            {label}
          </ThemedText>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 20,
    margin: Spacing.two,
  },
  innerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
