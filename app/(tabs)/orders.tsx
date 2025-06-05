import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Package, Plus } from 'lucide-react-native';
import { loadOrders, updateOrderStatus } from '@/utils/dataService';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OrdersScreen() {
  const router = useRouter();
  const { filter } = useLocalSearchParams(); // Get navigation params
  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState(filter || 'all'); // Use filter from params if provided
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
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
      const orderData = await loadOrders();
      setOrders(orderData || []);
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось загрузить заказы: ' + error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
      // Set activeFilter based on navigation params if provided
      if (filter) {
        setActiveFilter(filter);
      }
    }, [fetchOrders, filter])
  );

  const filterOrders = () => {
    return activeFilter === 'all'
      ? orders
      : orders.filter(order => order.status.toLowerCase() === activeFilter.toLowerCase());
  };

  const handleAddOrder = () => {
    router.push('/order-detail');
  };

  const handleOrderPress = (orderId) => {
    if (!orderId) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'ID заказа не указан',
      });
      return;
    }
    router.push({
      pathname: '/order-detail',
      params: { id: String(orderId) },
    });
  };

  const handleFilterPress = (filter) => {
    setActiveFilter(filter);
  };

  const handleStatusPress = async (orderId) => {
    if (activeFilter === 'all') {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Выберите фильтр для изменения статуса',
      });
      return;
    }
    setIsLoading(true);
    try {
      const updatedOrder = await updateOrderStatus(orderId, activeFilter);
      setOrders(prevOrders =>
        prevOrders.map(o => (o.id === orderId ? updatedOrder : o))
      );
      Toast.show({
        type: 'success',
        text1: 'Статус обновлён',
        text2: `Заказ #${updatedOrder.orderNumber} теперь "${translateStatus(activeFilter)}"`,
      });
    } catch (error) {
      console.error('Ошибка обновления статуса заказа:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось обновить статус заказа: ' + error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderOrderItem = ({ item }) => (
    <Pressable style={[styles.orderItem, isDarkTheme ? styles.darkCard : {}]} onPress={() => handleOrderPress(item.id)}>
      <View style={[styles.orderHeader, isDarkTheme ? styles.darkOrderHeader : {}]}>
        <Text style={[styles.orderNumber, isDarkTheme ? styles.darkText : {}]}>Заказ #{item.orderNumber}</Text>
        <Pressable onPress={() => handleStatusPress(item.id)}>
          <View style={[styles.statusBadge, getStatusStyle(item.status, isDarkTheme)]}>
            <Text style={[styles.statusText, isDarkTheme ? styles.darkStatusText : {}]}>{translateStatus(item.status)}</Text>
          </View>
        </Pressable>
      </View>
      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, isDarkTheme ? styles.darkSubtext : {}]}>Клиент:</Text>
          <Text style={[styles.detailValue, isDarkTheme ? styles.darkText : {}]}>{item.customer}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, isDarkTheme ? styles.darkSubtext : {}]}>Дата:</Text>
          <Text style={[styles.detailValue, isDarkTheme ? styles.darkText : {}]}>{new Date(item.date).toLocaleDateString('ru-RU')}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, isDarkTheme ? styles.darkSubtext : {}]}>Товары:</Text>
          <Text style={[styles.detailValue, isDarkTheme ? styles.darkText : {}]}>{item.items.length}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, isDarkTheme ? styles.darkSubtext : {}]}>Итого:</Text>
          <Text style={[styles.totalValue, isDarkTheme ? styles.darkText : {}]}>
            {item.total.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, isDarkTheme ? styles.darkContainer : {}]}>
      <StatusBar style={isDarkTheme ? 'light' : 'auto'} />
      <View style={[styles.header, isDarkTheme ? styles.darkHeader : {}]}>
        <Text style={[styles.title, isDarkTheme ? styles.darkText : {}]}>Заказы</Text>
        <Pressable style={[styles.addButton, isDarkTheme ? styles.darkAddButton : {}]} onPress={handleAddOrder}>
          <Plus size={24} color="#FFFFFF" />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterContainer, isDarkTheme ? styles.darkFilterContainer : {}]}
        style={{ flexGrow: 0 }}
      >
        <FilterButton
          title="Все"
          filter="all"
          active={activeFilter === 'all'}
          onPress={() => handleFilterPress('all')}
          color={isDarkTheme ? '#A3BFFA' : '#64748B'}
          isDarkTheme={isDarkTheme}
        />
        <FilterButton
          title="Ожидающие"
          filter="pending"
          active={activeFilter === 'pending'}
          onPress={() => handleFilterPress('pending')}
          color={isDarkTheme ? '#FCD34D' : '#F59E0B'}
          isDarkTheme={isDarkTheme}
        />
        <FilterButton
          title="В обработке"
          filter="processing"
          active={activeFilter === 'processing'}
          onPress={() => handleFilterPress('processing')}
          color={isDarkTheme ? '#60A5FA' : '#3B82F6'}
          isDarkTheme={isDarkTheme}
        />
        <FilterButton
          title="Отправленные"
          filter="shipped"
          active={activeFilter === 'shipped'}
          onPress={() => handleFilterPress('shipped')}
          color={isDarkTheme ? '#34D399' : '#10B981'}
          isDarkTheme={isDarkTheme}
        />
        <FilterButton
          title="Завершённые"
          filter="completed"
          active={activeFilter === 'completed'}
          onPress={() => handleFilterPress('completed')}
          color={isDarkTheme ? '#34D399' : '#10B981'}
          isDarkTheme={isDarkTheme}
        />
        <FilterButton
          title="Отменённые"
          filter="cancelled"
          active={activeFilter === 'cancelled'}
          onPress={() => handleFilterPress('cancelled')}
          color={isDarkTheme ? '#F87171' : '#EF4444'}
          isDarkTheme={isDarkTheme}
        />
      </ScrollView>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDarkTheme ? '#60A5FA' : '#3B82F6'} />
          <Text style={[styles.loadingText, isDarkTheme ? styles.darkSubtext : {}]}>Загрузка заказов...</Text>
        </View>
      ) : (
        <FlatList
          data={filterOrders()}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.ordersList}
          extraData={[orders, activeFilter]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package size={48} color={isDarkTheme ? '#A3BFFA' : '#94A3B8'} />
              <Text style={[styles.emptyText, isDarkTheme ? styles.darkText : {}]}>Заказы не найдены</Text>
              <Text style={[styles.emptySubtext, isDarkTheme ? styles.darkSubtext : {}]}>
                {activeFilter === 'all'
                  ? 'Начните с создания нового заказа'
                  : `Нет заказов со статусом "${translateFilter(activeFilter)}"`}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function FilterButton({ title, filter, active, onPress, color, isDarkTheme }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.filterButton,
        active && [styles.activeFilterButton, { borderColor: color }],
        pressed && styles.pressedFilterButton,
        isDarkTheme ? styles.darkFilterButton : {},
      ]}
      onPress={onPress}
    >
      <View style={[styles.colorIndicator, { backgroundColor: color }]} />
      <Text style={[styles.filterButtonText, active && { color }, isDarkTheme ? styles.darkText : {}]}>{title}</Text>
    </Pressable>
  );
}

function translateStatus(status) {
  const statusTranslations = {
    Pending: 'Ожидающий',
    Processing: 'В обработке',
    Shipped: 'Отправлен',
    Completed: 'Завершён',
    Cancelled: 'Отменён',
  };
  return statusTranslations[status] || status;
}

function translateFilter(filter) {
  const filterTranslations = {
    all: 'все',
    pending: 'ожидающие',
    processing: 'в обработке',
    shipped: 'отправленные',
    completed: 'завершённые',
    cancelled: 'отменённые',
  };
  return filterTranslations[filter] || filter;
}

function getStatusStyle(status, isDarkTheme) {
  const statusStyles = {
    Pending: isDarkTheme ? styles.darkPendingStatus : styles.pendingStatus,
    Processing: isDarkTheme ? styles.darkProcessingStatus : styles.processingStatus,
    Shipped: isDarkTheme ? styles.darkShippedStatus : styles.shippedStatus,
    Completed: isDarkTheme ? styles.darkCompletedStatus : styles.completedStatus,
    Cancelled: isDarkTheme ? styles.darkCancelledStatus : styles.cancelledStatus,
  };
  return statusStyles[status] || (isDarkTheme ? styles.darkDefaultStatus : styles.defaultStatus);
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
  },
  darkAddButton: {
    backgroundColor: '#60A5FA',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    height: 68,
    alignItems: 'center',
  },
  darkFilterContainer: {
    backgroundColor: '#374151',
    borderBottomColor: '#4B5563',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    height: 44,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  darkFilterButton: {
    backgroundColor: '#4B5563',
    borderColor: '#6B7280',
  },
  activeFilterButton: {
    backgroundColor: '#EFF6FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  darkActiveFilterButton: {
    backgroundColor: '#4B5563',
  },
  pressedFilterButton: {
    backgroundColor: '#E2E8F0',
    opacity: 0.8,
  },
  darkPressedFilterButton: {
    backgroundColor: '#6B7280',
  },
  colorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  ordersList: {
    padding: 16,
  },
  orderItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  darkCard: {
    backgroundColor: '#374151',
    shadowColor: '#000',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  darkOrderHeader: {
    borderBottomColor: '#4B5563',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  pendingStatus: {
    backgroundColor: '#FEF3C7',
  },
  darkPendingStatus: {
    backgroundColor: '#713F12',
  },
  processingStatus: {
    backgroundColor: '#EFF6FF',
  },
  darkProcessingStatus: {
    backgroundColor: '#1E3A8A',
  },
  shippedStatus: {
    backgroundColor: '#F0FDFA',
  },
  darkShippedStatus: {
    backgroundColor: '#064E3B',
  },
  completedStatus: {
    backgroundColor: '#ECFDF5',
  },
  darkCompletedStatus: {
    backgroundColor: '#064E3B',
  },
  cancelledStatus: {
    backgroundColor: '#FEF2F2',
  },
  darkCancelledStatus: {
    backgroundColor: '#7F1D1D',
  },
  defaultStatus: {
    backgroundColor: '#F1F5F9',
  },
  darkDefaultStatus: {
    backgroundColor: '#4B5563',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  darkStatusText: {
    color: '#F3F4F6',
  },
  orderDetails: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    width: 80,
    fontSize: 14,
    color: '#64748B',
  },
  darkSubtext: {
    color: '#A3BFFA',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
});