import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator, Alert, Platform } from 'react-native';
import { TriangleAlert, ArrowUpRight, PackageCheck, Wallet, Moon, Sun } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { loadDashboardData, loadProducts } from '@/utils/dataService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function DashboardScreen() {
  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    pendingOrders: 0,
    revenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [activities, setActivities] = useState([
    {
      id: '1',
      title: 'Исправлен баг',
      description: 'Устранена ошибка в расчете скидок для заказов',
      time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      isStatusChange: true,
    },
    {
      id: '2',
      title: 'Обновление системы',
      description: 'Обновлен модуль управления складом',
      time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      title: 'Ошибка сервера',
      description: 'Зафиксирован сбой API интеграции, требуется проверка',
      time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      isWarning: true,
    },
    {
      id: '4',
      title: 'Оптимизация базы данных',
      description: 'Проведена индексация таблиц для ускорения запросов',
      time: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    },
  ]);
  const [isLowStockModalVisible, setIsLowStockModalVisible] = useState(false);
  const [stockData, setStockData] = useState({ 
    lowStock: [], 
    highStock: [], 
    turnoverRates: {}, 
    reorderSuggestions: [] 
  });
  const navigation = useNavigation();

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      setIsDarkTheme(savedTheme === 'dark');
    } catch (error) {
      console.error('Ошибка при загрузке темы:', error);
      setIsDarkTheme(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkTheme;
      setIsDarkTheme(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Ошибка при сохранении темы:', error);
      Alert.alert('Ошибка', 'Не удалось сменить тему');
    }
  };

  const calculateStockMetrics = (products) => {
    const lowStock = products
      .filter(product => product.quantity <= product.lowStockThreshold)
      .sort((a, b) => a.quantity - b.quantity);
    
    const highStock = products
      .filter(product => product.quantity > product.lowStockThreshold * 2)
      .sort((a, b) => b.quantity - a.quantity);

    // Calculate turnover rates (assuming products have salesData)
    const turnoverRates = products.reduce((acc, product) => {
      const salesLast30Days = product.salesData?.last30Days || 0;
      const avgInventory = product.quantity;
      acc[product.id] = salesLast30Days / (avgInventory || 1); // Avoid division by zero
      return acc;
    }, {});

    // Generate reorder suggestions based on demand
    const reorderSuggestions = lowStock.map(product => {
      const demand = product.salesData?.last30Days || 10; // Default to 10 if no sales data
      const safetyStock = Math.round(product.lowStockThreshold * 0.5);
      const reorderQuantity = Math.round(demand * 1.5 + safetyStock - product.quantity);
      return {
        productId: product.id,
        name: product.name,
        suggestedQuantity: Math.max(reorderQuantity, product.lowStockThreshold),
        estimatedCost: (reorderQuantity * (product.costPrice || 0)).toFixed(2),
      };
    });

    return { lowStock, highStock, turnoverRates, reorderSuggestions };
  };

  useEffect(() => {
    async function initialize() {
      try {
        const data = await loadDashboardData();
        const products = await loadProducts();
        
        const stockMetrics = calculateStockMetrics(products);
        setStockData(stockMetrics);
        setDashboardData({
          ...data,
          totalProducts: products.length,
          lowStockItems: stockMetrics.lowStock.length,
        });

        await loadTheme();
        await loadActivities();
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        Alert.alert('Ошибка', 'Не удалось загрузить данные');
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  const loadActivities = async () => {
    try {
      const storedActivities = await AsyncStorage.getItem('orderActivities');
      let loadedActivities = storedActivities ? JSON.parse(storedActivities) : [];
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      loadedActivities = loadedActivities.filter(activity => new Date(activity.time) > oneWeekAgo);
      await AsyncStorage.setItem('orderActivities', JSON.stringify(loadedActivities));
      setActivities(prevActivities => [...prevActivities, ...loadedActivities]);
    } catch (error) {
      console.error('Ошибка загрузки активностей:', error);
    }
  };

  const formatTime = (isoTime) => {
    const now = new Date();
    const activityTime = new Date(isoTime);
    const diffInHours = (now - activityTime) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return `${Math.floor(diffInHours * 60)} минут назад`;
    if (diffInHours < 24) return `${Math.floor(diffInHours)} часов назад`;
    if (diffInHours < 48) return 'Вчера';
    return activityTime.toLocaleDateString('ru-RU');
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTheme();
      loadActivities();
    });
    return unsubscribe;
  }, [navigation]);

  const exportLowStockReport = async () => {
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        lowStockItems: stockData.lowStock.map(item => ({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          threshold: item.lowStockThreshold,
          turnoverRate: stockData.turnoverRates[item.id]?.toFixed(2) || 'N/A',
        })),
        reorderSuggestions: stockData.reorderSuggestions,
      };

      const fileUri = `${FileSystem.cacheDirectory}low_stock_report_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(reportData, null, 2));
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Экспорт отчета о низких запасах',
        });
      } else {
        Alert.alert('Ошибка', 'Функция экспорта недоступна на этом устройстве');
      }
    } catch (error) {
      console.error('Ошибка экспорта отчета:', error);
      Alert.alert('Ошибка', 'Не удалось экспортировать отчет');
    }
  };

  const generateRecommendations = (lowStock, highStock, turnoverRates, reorderSuggestions) => {
    const recommendations = [];
    
    // Low stock recommendations
    if (lowStock.length > 0) {
      const criticalStock = lowStock.filter(item => item.quantity <= Math.round(item.lowStockThreshold * 0.5));
      if (criticalStock.length > 0) {
        recommendations.push(
          `Критически низкий запас у ${criticalStock.length} товаров: ${criticalStock.map(item => item.name).join(', ')}. Срочно пополните!`
        );
      }
      recommendations.push(
        `Товары с низким запасом (${lowStock.length}): ${lowStock.slice(0, 3).map(item => item.name).join(', ')}${lowStock.length > 3 ? ' и др.' : ''}.`
      );
      recommendations.push('Рекомендуемые объемы закупки доступны в разделе "Предложения по пополнению".');
    } else {
      recommendations.push('Товаров с низким запасом нет.');
    }

    // High stock recommendations
    if (highStock.length > 0) {
      const slowMoving = highStock.filter(item => turnoverRates[item.id] < 0.5);
      if (slowMoving.length > 0) {
        recommendations.push(
          `Медленно оборачиваемые товары (${slowMoving.length}): ${slowMoving.slice(0, 3).map(item => item.name).join(', ')}${slowMoving.length > 3 ? ' и др.' : ''}. Рассмотрите скидки.`
        );
      }
      recommendations.push(
        `Товары с избытком (${highStock.length}): ${highStock.slice(0, 3).map(item => item.name).join(', ')}${highStock.length > 3 ? ' и др.' : ''}. Проведите акции.`
      );
    } else {
      recommendations.push('Товаров с избытком нет.');
    }

    // General optimization
    recommendations.push('');

    return recommendations;
  };

  return (
    <SafeAreaView style={[styles.container, isDarkTheme ? styles.darkContainer : {}]}>
      <StatusBar style={isDarkTheme ? 'light' : 'auto'} />
      <View style={[styles.header, isDarkTheme ? styles.darkHeader : {}]}>
        <View>
          <Text style={[styles.title, isDarkTheme ? styles.darkText : {}]}>
            Панель управления
          </Text>
          <View style={styles.dateContainer}>
            <Text style={[styles.date, isDarkTheme ? styles.darkSubtext : {}]}>
              {new Date().toLocaleDateString('ru-RU')}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <Pressable
            onPress={() => navigation.navigate('products', { viewMode: 'all' })}
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
            onPress={() => setIsLowStockModalVisible(true)}
            style={({ pressed }) => [
              { opacity: pressed ? 0.7 : 1 },
              { width: '48%', marginBottom: 16 },
            ]}
          >
            <StatCard 
              title="Мало на складе" 
              value={dashboardData.lowStockItems}
              icon={<TriangleAlert size={24} color={isDarkTheme ? '#FBBF24' : '#F59E0B'} />}
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
            <Pressable onPress={() => navigation.navigate('activities')}>
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

      <Modal
        visible={isLowStockModalVisible}
        animationType="slide"
        onRequestClose={() => setIsLowStockModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, isDarkTheme ? styles.darkContainer : {}]}>
          <View style={[styles.modalHeader, isDarkTheme ? styles.darkHeader : {}]}>
            <Text style={[styles.modalTitle, isDarkTheme ? styles.darkText : {}]}>
              Управление запасами
            </Text>
            <View style={styles.modalHeaderActions}>
              
              <Pressable onPress={() => setIsLowStockModalVisible(false)}>
                <Text style={[styles.modalCloseText, isDarkTheme ? styles.darkText : {}]}>
                  Закрыть
                </Text>
              </Pressable>
            </View>
          </View>
          <ScrollView style={[styles.modalContent, isDarkTheme ? styles.darkCard : {}]}>
            <Text style={[styles.supportLabel, isDarkTheme ? styles.darkText : {}]}>
              Товары с низким уровнем запасов:
            </Text>
            {stockData.lowStock.length > 0 ? (
              stockData.lowStock.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.stockItem, isDarkTheme ? styles.darkSubSection : {}]}
                  onPress={() => {
                    setIsLowStockModalVisible(false);
                    navigation.navigate('product-detail', { id: item.id });
                  }}
                >
                  <Text style={[
                    styles.stockItemText,
                    isDarkTheme ? styles.darkText : {},
                    item.quantity <= Math.round(item.lowStockThreshold * 0.5) ? styles.criticalStockText : {},
                  ]}>
                    {item.name} ({item.category}): {item.quantity} шт. 
                    (порог: {item.lowStockThreshold} шт., оборот: {(stockData.turnoverRates[item.id] || 0).toFixed(2)})
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text style={[styles.noStockText, isDarkTheme ? styles.darkSubtext : {}]}>
                Нет товаров с низким уровнем запасов.
              </Text>
            )}

            <Text style={[styles.supportLabel, isDarkTheme ? styles.darkText : {}, { marginTop: 16 }]}>
              Предложения по пополнению:
            </Text>
            {stockData.reorderSuggestions.length > 0 ? (
              stockData.reorderSuggestions.map((suggestion) => (
                <View
                  key={suggestion.productId}
                  style={[styles.stockItem, isDarkTheme ? styles.darkSubSection : {}]}
                >
                  <Text style={[styles.stockItemText, isDarkTheme ? styles.darkText : {}]}>
                    {suggestion.name}: Рекомендуем заказать {suggestion.suggestedQuantity} шт. 
                    (≈{suggestion.estimatedCost} ₽)
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.noStockText, isDarkTheme ? styles.darkSubtext : {}]}>
                Нет предложений по пополнению.
              </Text>
            )}

            <Text style={[styles.supportLabel, isDarkTheme ? styles.darkText : {}, { marginTop: 16 }]}>
              Товары с высоким уровнем запасов:
            </Text>
            {stockData.highStock.length > 0 ? (
              stockData.highStock.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.stockItem, isDarkTheme ? styles.darkSubSection : {}]}
                  onPress={() => {
                    setIsLowStockModalVisible(false);
                    navigation.navigate('product-detail', { id: item.id });
                  }}
                >
                  <Text style={[styles.stockItemText, isDarkTheme ? styles.darkText : {}]}>
                    {item.name} ({item.category}): {item.quantity} шт. 
                    (порог: {item.lowStockThreshold} шт., оборот: {(stockData.turnoverRates[item.id] || 0).toFixed(2)})
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text style={[styles.noStockText, isDarkTheme ? styles.darkSubtext : {}]}>
                Нет товаров с высоким уровнем запасов.
              </Text>
            )}

            <Text style={[styles.supportLabel, isDarkTheme ? styles.darkText : {}, { marginTop: 16 }]}>
              Рекомендации:
            </Text>
            {generateRecommendations(
              stockData.lowStock, 
              stockData.highStock, 
              stockData.turnoverRates, 
              stockData.reorderSuggestions
            ).map((rec, index) => (
              <Text
                key={index}
                style={[styles.stockItemText, isDarkTheme ? styles.darkText : {}, { marginVertical: 4 }]}
              >
                • {rec}
              </Text>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
        <Text style={[styles.titleText, isDarkTheme ? styles.darkText : {}]}>{title}</Text>
        <Text style={[styles.descriptionColor, isDarkTheme ? styles.darkSubtext : {}]}>{description}</Text>
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
    fontWeight: '600',
    color: '#1E293B',
  },
  darkText: {
    color: '#F3F4F6',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    gap: 16,
  },
  modalActionText: {
    fontSize: 16,
    color: '#3B82F6',
    padding: 10,
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
  titleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  descriptionColor: {
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#3B82F6',
    padding: 10,
  },
  modalContent: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  supportLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  stockItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  darkSubSection: {
    borderBottomColor: '#4B5563',
  },
  stockItemText: {
    fontSize: 16,
    color: '#1E293B',
  },
  criticalStockText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  noStockText: {
    fontSize: 14,
    color: '#64748B',
    paddingVertical: 8,
  },
});