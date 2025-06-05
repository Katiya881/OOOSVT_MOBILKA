import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { ChartBar as BarChart, Package, ShoppingCart, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';

export default function TabLayout() {
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const navigation = useNavigation();

  // Функция для загрузки темы
  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      const now = new Date();
      const hours = now.getHours();
      const autoDarkTheme = hours >= 18 || hours < 6; // Тёмная тема с 18:00 до 6:00
      if (savedTheme) {
        setIsDarkTheme(savedTheme === 'dark');
      } else {
        setIsDarkTheme(autoDarkTheme);
        await AsyncStorage.setItem('theme', autoDarkTheme ? 'dark' : 'light');
      }
    } catch (error) {
      console.error('Ошибка при загрузке темы:', error);
    }
  };

  useEffect(() => {
    // Инициализация темы при монтировании
    loadTheme();

    // Периодическая проверка изменений темы каждые 500 мс
    const interval = setInterval(() => {
      loadTheme();
    }, 5);

    // Очистка интервала при размонтировании
    return () => clearInterval(interval);
  }, []);

  // Слушатель фокуса для дополнительной синхронизации
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTheme(); // Перезагружаем тему при фокусе любого экрана
    });

    return unsubscribe; // Очищаем слушатель при размонтировании
  }, [navigation]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDarkTheme ? '#60A5FA' : '#3B82F6',
        tabBarInactiveTintColor: isDarkTheme ? '#A3BFFA' : '#94A3B8',
        tabBarStyle: [styles.tabBar, isDarkTheme ? styles.darkTabBar : {}],
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Панель',
          tabBarIcon: ({ color, size }) => (
            <BarChart size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Товары',
          tabBarIcon: ({ color, size }) => (
            <Package size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Заказы',
          tabBarIcon: ({ color, size }) => (
            <ShoppingCart size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    height: 60,
    paddingBottom: 5,
    paddingTop: 5,
  },
  darkTabBar: {
    backgroundColor: '#374151',
    borderTopColor: '#4B5563',
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});