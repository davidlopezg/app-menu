import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code'
    | 'display'
    | 'headline'
    | 'body'
    | 'caption'
    | 'button';
  themeColor?: ThemeColor;
  /** Apply glassmorphism tint */
  glassTint?: boolean;
};

export function ThemedText({ style, type = 'default', themeColor, glassTint = false, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  const baseColor = theme[themeColor ?? 'text'];

  // Glass tint styles when enabled
  const glassStyles = glassTint
    ? {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 12,
      }
    : {};

  return (
    <Text
      style={[
        { color: baseColor },
        styles[type],
        glassStyles,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  // Original types
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 600,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },

  // New visual types
  display: {
    fontSize: 64,
    fontWeight: 'bold',
    lineHeight: 72,
  },
  headline: {
    fontSize: 32,
    fontWeight: 600,
    lineHeight: 40,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 400,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 500,
    color: '#6C757D',
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});