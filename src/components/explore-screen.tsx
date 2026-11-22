import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const recentRecipes = [
  {
    id: '1',
    title: 'Pasta con pesto',
    time: '20 min',
    servings: 2,
    calories: '450 kcal',
    emoji: '🍝',
  },
  {
    id: '2',
    title: 'Ensalada César',
    time: '15 min',
    servings: 1,
    calories: '320 kcal',
    emoji: '🥗',
  },
  {
    id: '3',
    title: 'Tortilla de patatas',
    time: '25 min',
    servings: 3,
    calories: '380 kcal',
    emoji: '🥔',
  },
];

const featuredRecipes = [
  {
    id: '4',
    title: 'Paella Valenciana',
    emoji: '🥘',
    color: '#FFC107',
    progress: 75,
  },
  {
    id: '5',
    title: 'Ramen Casero',
    emoji: '🍜',
    color: '#EF4444',
    progress: 40,
  },
];

export function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      contentInset={{
        top: insets.top,
        bottom: insets.bottom,
      }}>
      <ThemedView style={[styles.headerContainer, { backgroundColor: theme.surface }]}>
        <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Recetas recientes
        </ThemedText>
        <View style={styles.recipesList}>
          {recentRecipes.map((recipe) => (
            <Animated.View
              key={recipe.id}
              entering={FadeInUp.duration(600).delay(100 * recentRecipes.indexOf(recipe))}
              style={styles.recipeCard}>
              <View style={[styles.recipeIcon, { backgroundColor: recipe.emoji === '🍝' ? '#F8F9FA' : '#F8F9FA' }]}>
                <Text style={styles.recipeIconText}>{recipe.emoji}</Text>
              </View>
              <View style={styles.recipeInfo}>
                <Text style={[styles.recipeTitle, { color: theme.text }]}>{recipe.title}</Text>
                <Text style={[styles.recipeMeta, { color: theme.textSecondary }]}>
                  {recipe.time} • {recipe.servings} porc.
                </Text>
                <Text style={[styles.recipeCalories, { color: theme.accent }]}>
                  {recipe.calories}
                </Text>
              </View>
              <Pressable style={styles.recipeChevron}>
                <Text style={styles.recipeChevronText}>›</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </ThemedView>

      <ThemedView style={[styles.featuredSection, { backgroundColor: theme.surface }]}>
        <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Destacadas
        </ThemedText>
        <View style={styles.featuredGrid}>
          {featuredRecipes.map((recipe) => (
            <Pressable key={recipe.id} style={[styles.featuredCard, { borderLeftColor: recipe.color }]}>
              <View style={styles.featuredIcon}>
                <Text style={styles.featuredIconText}>{recipe.emoji}</Text>
              </View>
              <View style={styles.featuredContent}>
                <Text style={[styles.featuredTitle, { color: theme.text }]}>{recipe.title}</Text>
                <View style={styles.featuredProgressContainer}>
                  <View style={[styles.featuredProgressBar, { backgroundColor: recipe.color }]} />
                </View>
                <Text style={[styles.featuredProgressText, { color: theme.textSecondary }]}>
                  {recipe.progress}% completado
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ThemedView>

      <ThemedView style={[styles.actionsSection, { backgroundColor: theme.surface }]}>
        <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Acciones rápidas
        </ThemedText>
        <View style={styles.actionsGrid}>
          <Pressable style={[styles.actionCard, { borderColor: '#2D6A4F' }]}>
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={[styles.actionTitle, { color: theme.text }]}>Ver menú semanal</Text>
          </Pressable>
          <Pressable style={[styles.actionCard, { borderColor: '#6C757D' }]}>
            <Text style={styles.actionIcon}>🛒</Text>
            <Text style={[styles.actionTitle, { color: theme.text }]}>Lista de compras</Text>
          </Pressable>
          <Pressable style={[styles.actionCard, { borderColor: '#FFC107' }]}>
            <Text style={styles.actionIcon}>✨</Text>
            <Text style={[styles.actionTitle, { color: theme.text }]}>Receta con IA</Text>
          </Pressable>
        </View>
      </ThemedView>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
    alignItems: 'center',
  },
  headerContainer: {
    width: '100%',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.two,
  },
  sectionTitle: {
    marginBottom: Spacing.two,
    width: '100%',
    alignSelf: 'flex-start',
  },
  recipesList: {
    width: '100%',
    gap: Spacing.two,
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: Spacing.two,
  },
  recipeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  recipeIconText: {
    fontSize: 24,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  recipeMeta: {
    fontSize: 13,
    marginBottom: 4,
  },
  recipeCalories: {
    fontSize: 13,
    fontWeight: '600',
  },
  recipeChevron: {
    padding: 8,
  },
  recipeChevronText: {
    fontSize: 20,
    color: '#DEE2E6',
  },
  featuredSection: {
    width: '100%',
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.four,
  },
  featuredGrid: {
    width: '100%',
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  featuredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  featuredIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  featuredIconText: {
    fontSize: 20,
  },
  featuredContent: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.two,
  },
  featuredProgressContainer: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E0E1E6',
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  featuredProgressBar: {
    height: '100%',
    width: '60%',
  },
  featuredProgressText: {
    fontSize: 12,
  },
  actionsSection: {
    width: '100%',
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.four,
  },
  actionsGrid: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIcon: {
    fontSize: 22,
    marginRight: Spacing.two,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: Spacing.five,
  },
});
