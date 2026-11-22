import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MenuCategory = {
  id: string;
  label: string;
  icon: string;
  color: string;
  count?: number;
};

const menuCategories: MenuCategory[] = [
  {
    id: 'menu',
    label: 'Menú Semanal',
    icon: '📅',
    color: '#2D6A4F',
    count: 7,
  },
  {
    id: 'recipes',
    label: 'Recetas',
    icon: '🍳',
    color: '#6C757D',
    count: 12,
  },
  {
    id: 'shopping',
    label: 'Lista de Compras',
    icon: '🛒',
    color: '#FFC107',
    count: 5,
  },
  {
    id: 'prep',
    label: 'Preparación',
    icon: '👨‍🍳',
    color: '#EF4444',
    count: 3,
  },
];

const stats = [
  { id: '1', label: 'Recetas', value: '12' },
  { id: '2', label: 'Platos esta semana', value: '7' },
  { id: '3', label: 'Calorías', value: '~2100' },
  { id: '4', label: 'Lista de compras', value: '5' },
];

export function HomeScreen() {
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
          ¡Hola! 👋
        </ThemedText>
        <ThemedText type="title" style={styles.welcomeTitle}>
          Planifica tu menú
        </ThemedText>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: theme.surface }]}>
        <ThemedText type="smallBold" style={[styles.cardLabel, { color: theme.textSecondary }]}>
          Resumen semanal
        </ThemedText>
        <View style={styles.statsRow}>
          {stats.map((stat, i) => (
            <View key={stat.id} style={styles.statItem}>
              <ThemedText type="code" style={[styles.statValue, { color: theme.accent }]}>
                {stat.value}
              </ThemedText>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </ThemedView>

      <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        Categorías
      </ThemedText>

      <View style={styles.categoriesGrid}>
        {menuCategories.map((category, i) => (
          <Pressable
            key={category.id}
            style={({ pressed }) => [
              styles.categoryCard,
              {
                borderLeftColor: category.color,
                backgroundColor: theme.backgroundElement,
                opacity: pressed ? 0.9 : 1,
              },
            ]}>
            <View style={styles.categoryIcon}>
              <Text style={styles.categoryIconText}>{category.icon}</Text>
            </View>
            <View style={styles.categoryContent}>
              <Text style={[styles.categoryTitle, { color: theme.text }]}>{category.label}</Text>
              <Text style={[styles.categoryCount, { color: theme.textSecondary }]}>
                {category.count ?? 0} elementos
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        Acciones rápidas
      </ThemedText>

      <View style={styles.actionsRow}>
        <Pressable style={[styles.actionButton, { backgroundColor: theme.backgroundElement }]}
                       onPress={() => {}}>
          <Text style={styles.actionIcon}>➕</Text>
          <Text style={[styles.actionLabel, { color: theme.text }]}>Nueva receta</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, { backgroundColor: theme.backgroundElement }]}
                       onPress={() => {}}>
          <Text style={styles.actionIcon}>📝</Text>
          <Text style={[styles.actionLabel, { color: theme.text }]}>Nuevo menú</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, { backgroundColor: theme.backgroundElement }]}
                       onPress={() => {}}>
          <Text style={styles.actionIcon}>📊</Text>
          <Text style={[styles.actionLabel, { color: theme.text }]}>Nutrición</Text>
        </Pressable>
      </View>

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
  welcomeTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1B1B1B',
  },
  card: {
    width: '100%',
    padding: Spacing.four,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLabel: {
    marginBottom: Spacing.two,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    width: '100%',
  },
  sectionTitle: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
    width: '100%',
    alignSelf: 'flex-start',
    fontSize: 14,
    fontWeight: '700',
  },
  categoriesGrid: {
    width: '100%',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 12,
    borderLeftWidth: 4,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: Spacing.two,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.two,
  },
  categoryIconText: {
    fontSize: 20,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.five,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.two,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: Spacing.one,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: Spacing.five,
  },
});