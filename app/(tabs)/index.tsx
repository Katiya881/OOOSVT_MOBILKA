import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { TriangleAlert as AlertTriangle, ArrowUpRight, PackageCheck, Wallet } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { loadDashboardData } from '@/utils/dataService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DashboardScreen() {
  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    pendingOrders: 0,
    revenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [activities, setActivities] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    async function initialize() {
      try {
        const data = await loadDashboardData();
        setDashboardData(data);
        await loadTheme();
        await loadActivities();
      } catch (error) {
        console.error('Ошибка при загрузке данных или темы:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      const now = new Date();
      const hours = now.getHours();
      const autoDarkTheme = hours >= 18 || hours < 6;
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

  const loadActivities = async () => {
    try {
      const storedActivities = await AsyncStorage.getItem('orderActivities');
      let activities = storedActivities ? JSON.parse(storedActivities) : [];
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      activities = activities.filter(activity => new Date(activity.time) > oneWeekAgo);
      await AsyncStorage.setItem('orderActivities', JSON.stringify(activities));
      setActivities(activities);
    } catch (error) {
      console.error('Ошибка загрузки активностей:', error);
    }
  };

  const formatTime = (isoTime) => {
    const now = new Date();
    const activityTime = new Date(isoTime);
    const diffInHours = (now - activityTime) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)} минут назад`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} часов назад`;
    } else if (diffInHours < 48) {
      return 'Вчера';
    } else {
      return activityTime.toLocaleDateString('ru-RU');
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTheme();
      loadActivities();
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.container, isDarkTheme ? styles.darkContainer : {}]}>
      <StatusBar style={isDarkTheme ? 'light' : 'auto'} />
      <View style={[styles.header, isDarkTheme ? styles.darkHeader : {}]}>
        <Text style={[styles.title, isDarkTheme ? styles.darkText : {}]}>Панель управления</Text>
        <View style={styles.dateContainer}>
          <Text style={[styles.date, isDarkTheme ? styles.darkSubtext : {}]}>
            {new Date().toLocaleDateString('ru-RU')}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <Pressable
            style={({ pressed }) => [
              { opacity: pressed ? 0.7 : 1 },
              { width: '48%', marginBottom: 16 },
            ]}
          >
            <StatCard 
              title="Всего товаров" 
              value={dashboardData.totalProducts}
              icon={<PackageCheck size={24} color={isDarkTheme ? '#60A5FA' : '#3B82F6'} />}
              color={isDarkTheme ? '#374151' : '#EFF6FF'}
              isLoading={isLoading}
              isDarkTheme={isDarkTheme}
            />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('products', { lowStock: true })}
            style={({ pressed }) => [
              { opacity: pressed ? 0.7 : 1 },
              { width: '48%', marginBottom: 16 },
            ]}
          >
            <StatCard 
              title="Мало на складе" 
              value={dashboardData.lowStockItems}
              icon={<AlertTriangle size={24} color={isDarkTheme ? '#FBBF24' : '#F59E0B'} />}
              color={isDarkTheme ? '#374151' : '#FFFBEB'}
              isLoading={isLoading}
              isDarkTheme={isDarkTheme}
            />
          </Pressable>
         <Pressable
  onPress={() => navigation.navigate('orders', { filter: 'processing' })}
  style={({ pressed }) => [
    { opacity: pressed ? 0.7 : 1 },
    { width: '48%', marginBottom: 16 },
  ]}
>
  <StatCard 
    title="В обработке" 
    value={dashboardData.pendingOrders}
    icon={<ShoppingCart size={24} color={isDarkTheme ? '#A78BFA' : '#8B5CF6'} />}
    color={isDarkTheme ? '#374151' : '#F5F3FF'}
    isLoading={isLoading}
    isDarkTheme={isDarkTheme}
  />
</Pressable>
          <Pressable
            style={({ pressed }) => [
              { opacity: pressed ? 0.7 : 1 },
              { width: '48%', marginBottom: 16 },
            ]}
          >
            <StatCard 
              title="Выручка" 
              value={`${dashboardData.revenue.toLocaleString('ru-RU')} ₽`}
              icon={<Wallet size={24} color={isDarkTheme ? '#34D399' : '#10B981'} />}
              color={isDarkTheme ? '#374151' : '#ECFDF5'}
              isLoading={isLoading}
              isDarkTheme={isDarkTheme}
            />
          </Pressable>
        </View>
        
        <View style={[styles.sectionContainer, isDarkTheme ? styles.darkCard : {}]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isDarkTheme ? styles.darkText : {}]}>Последняя активность</Text>
            <Pressable>
              <Text style={[styles.seeAll, isDarkTheme ? styles.darkSeeAll : {}]}>Смотреть все</Text>
            </Pressable>
          </View>
          {activities.length > 0 ? (
            activities.map((activity, index) => (
              <ActivityItem
                key={activity.id}
                title={activity.title}
                description={activity.description}
                time={formatTime(activity.time)}
                isWarning={activity.isWarning || false}
                isStatusChange={activity.isStatusChange || false}
                isDarkTheme={isDarkTheme}
              />
            ))
          ) : (
            <Text style={[styles.noActivityText, isDarkTheme ? styles.darkSubtext : {}]}>
              Нет последних активностей
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ title, value, icon, color, isLoading, isDarkTheme }) {
  return (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      <View style={[styles.statIconContainer, isDarkTheme ? styles.darkIconContainer : {}]}>{icon}</View>
      <Text style={[styles.statTitle, isDarkTheme ? styles.darkSubtext : {}]} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
      {isLoading ? (
        <View style={[styles.loadingPlaceholder, isDarkTheme ? styles.darkLoadingPlaceholder : {}]} />
      ) : (
        <Text style={[styles.statValue, isDarkTheme ? styles.darkText : {}]} numberOfLines={1} ellipsizeMode="tail">
          {value}
        </Text>
      )}
    </View>
  );
}

function ActivityItem({ title, description, time, isWarning = false, isStatusChange = false, isDarkTheme }) {
  return (
    <View style={[styles.activityItem, isDarkTheme ? styles.darkActivityItem : {}]}>
      <View
        style={[
          styles.activityDot,
          isWarning && styles.warningDot,
          isStatusChange && styles.statusChangeDot,
          isDarkTheme && isWarning ? styles.darkWarningDot : {},
          isDarkTheme && isStatusChange ? styles.darkStatusChangeDot : {},
        ]}
      />
      <View style={styles.activityContent}>
        <Text style={[styles.activityTitle, isDarkTheme ? styles.darkText : {}]}>{title}</Text>
        <Text style={[styles.activityDescription, isDarkTheme ? styles.darkSubtext : {}]}>{description}</Text>
      </View>
      <Text style={[styles.activityTime, isDarkTheme ? styles.darkSubtext : {}]}>{time}</Text>
    </View>
  );
}

function ShoppingCart(props) {
  return <ArrowUpRight {...props} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  darkContainer: {
    backgroundColor: '#1F2937',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  darkHeader: {
    backgroundColor: '#374151',
    borderBottomColor: '#4B5563',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
  },
  darkText: {
    color: '#F3F4F6',
  },
  dateContainer: {
    marginTop: 4,
  },
  date: {
    fontSize: 14,
    color: '#64748B',
  },
  darkSubtext: {
    color: '#A3BFFA',
  },
  scrollContainer: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
    height: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    justifyContent: 'space-between',
  },
  statIconContainer: {
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkIconContainer: {
    backgroundColor: '#4B5563',
  },
  statTitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  loadingPlaceholder: {
    height: 24,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    width: '70%',
  },
  darkLoadingPlaceholder: {
    backgroundColor: '#4B5563',
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  darkCard: {
    backgroundColor: '#374151',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  seeAll: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  darkSeeAll: {
    color: '#60A5FA',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  darkActivityItem: {
    borderBottomColor: '#4B5563',
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    marginRight: 12,
  },
  warningDot: {
    backgroundColor: '#F59E0B',
  },
  darkWarningDot: {
    backgroundColor: '#FBBF24',
  },
  statusChangeDot: {
    backgroundColor: '#8B5CF6',
  },
  darkStatusChangeDot: {
    backgroundColor: '#A78BFA',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  activityDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  activityTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  noActivityText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 16,
  },
});