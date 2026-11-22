import { View, StyleSheet } from 'react-native';
import { GlassView } from 'expo-glass-effect';

import { Spacing } from '@/constants/theme';

/**
 * Glassmorphism component for cards and containers
 * Creates an elegant frosted glass effect with subtle blur and tint
 */
export function GlassCard({
  children,
  style,
  tintColor = '#FFFFFF',
  blurRadius = 12,
  tintOpacity = 0.3,
  ...props
}: any) {
  return (
    <GlassView
      style={[styles.glassContainer, style]}
      blurRadius={blurRadius}
      tintOpacity={tintOpacity}
      tintColor={tintColor}
      {...props}
    >
      <View style={styles.content}>{children}</View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  glassContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    margin: Spacing.two,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  content: {
    padding: Spacing.three,
  },
});

export default GlassCard;
