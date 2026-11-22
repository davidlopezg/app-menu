import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';

const slides = [
  {
    id: 'welcome',
    emoji: '🍽️',
    title: 'Menú Semanal',
    subtitle: 'Planifica tus comidas para toda la semana en minutos',
    description:
      'Organiza menús, recetas, listas de compras y sesiones de cocina con un solo lugar.',
  },
  {
    id: 'nutrition',
    emoji: '🥗',
    title: 'Nutrición Inteligente',
    subtitle: 'Calorías, macronutrientes y balance perfecto para tu familia',
    description:
      'Calcula automáticamente el aporte nutricional de cada plato y mantén hábitos saludables.',
  },
  {
    id: 'ai',
    emoji: '✨',
    title: 'Cocina con IA',
    subtitle: 'Recetas personalizadas con inteligencia artificial',
    description:
      'Genera recetas creativas adaptadas a lo que tienes en la nevera y a tus gustos.',
  },
];

export function Onboarding() {
  const { currentSlide } = useLocalSearchParams<{ currentSlide?: string }>();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (typeof currentSlide === 'string') {
      const idx = parseInt(currentSlide, 10);
      if (!Number.isNaN(idx)) {
        setActiveIndex(idx);
      }
    }
  }, [currentSlide]);

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      setActiveIndex((prev) => prev + 1);
    } else {
      router.replace('/');
    }
  };

  const handleSkip = () => {
    router.replace('/');
  };

  const slideStyle = (isActive: boolean) => ({
    opacity: isActive ? 1 : 0,
    transform: [{ translateX: isActive ? 0 : isActive ? 0 : -50 }],
  });

  return (
    <View style={styles.container}>
      {slides.map((slide, index) => {
        const isActive = index === activeIndex;
        return (
          <Animated.View
            key={slide.id}
            entering={index === 0 ? FadeIn.duration(600) : FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={[styles.card, isActive && styles.activeCard, slideStyle(isActive)]}>
            <View style={[styles.iconContainer, isActive && styles.iconGlow]}>
              <Text style={styles.icon}>{slide.emoji}</Text>
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
            <Text style={styles.description}>{slide.description}</Text>
          </Animated.View>
        );
      })}

      <View style={styles.indicatorContainer}>
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          return (
            <View key={slide.id} style={[styles.indicator, isActive && styles.indicatorActive]}>
              {isActive && <View style={styles.indicatorDot} />}
            </View>
          );
        })}
      </View>

      <Animated.View entering={FadeIn.duration(400)} style={styles.buttonContainer}>
        <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.nextButtonWrapper}>
          <Pressable style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {activeIndex < slides.length - 1 ? 'Siguiente' : 'Comenzar'}
            </Text>
          </Pressable>
        </Animated.View>
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Saltar</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  card: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    marginHorizontal: 32,
    padding: 32,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  activeCard: {
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconGlow: {
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B1B1B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D6A4F',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
  },
  indicatorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 60,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E1E6',
  },
  indicatorActive: {
    backgroundColor: '#2D6A4F',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonWrapper: {
    marginBottom: 16,
  },
  nextButton: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#2D6A4F',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingHorizontal: 32,
    paddingVertical: 8,
  },
  skipButtonText: {
    color: '#6C757D',
    fontSize: 14,
  },
});
