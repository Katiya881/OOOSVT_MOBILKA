import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, FlatList, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Plus, Save, Trash, FileText } from 'lucide-react-native';
import { getOrder, saveOrder, deleteOrder, loadProducts, updateOrderStatus } from '@/utils/dataService';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';

const statusOptions = ['Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled'];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const orderId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showProductList, setShowProductList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [order, setOrder] = useState({
    id: orderId || '',
    orderNumber: Math.floor(10000 + Math.random() * 90000).toString(),
    customer: '',
    date: new Date().toISOString(),
    status: 'Pending',
    items: [],
    total: 0,
    notes: '',
    paymentMethod: 'Cash',
  });

  useEffect(() => {
    async function fetchData() {
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

        const products = await loadProducts();
        setAvailableProducts(products || []);
        setFilteredProducts(products || []);
        if (orderId) {
          const orderData = await getOrder(orderId);
          if (!orderData) {
            Toast.show({
              type: 'error',
              text1: 'Ошибка',
              text2: 'Заказ не найден',
            });
            router.replace('/orders');
            return;
          }
          setOrder(orderData);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        Toast.show({
          type: 'error',
          text1: 'Ошибка',
          text2: 'Не удалось загрузить данные: ' + error.message,
        });
        router.replace('/orders');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [orderId, router]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(availableProducts);
    } else {
      const filtered = availableProducts.filter(product =>
        product.name?.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, availableProducts]);

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const updateOrderItems = (items) => {
    const updatedTotal = calculateTotal(items);
    setOrder(prev => ({
      ...prev,
      items,
      total: updatedTotal,
    }));
  };

  const addOrderItem = (product) => {
    const newItem = {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
    };
    const updatedItems = [...order.items, newItem];
    updateOrderItems(updatedItems);
    setShowProductList(false);
    setSearchQuery('');
    Toast.show({
      type: 'success',
      text1: 'Товар добавлен',
      text2: `${product.name} добавлен в заказ`,
    });
  };

  const updateItemQuantity = (index, quantity) => {
    const updatedItems = [...order.items];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: Math.max(1, parseInt(quantity) || 1),
    };
    updateOrderItems(updatedItems);
  };

  const removeItem = (index) => {
    const updatedItems = order.items.filter((_, i) => i !== index);
    updateOrderItems(updatedItems);
    Toast.show({
      type: 'success',
      text1: 'Товар удалён',
      text2: 'Товар успешно удалён из заказа',
    });
  };

  const handleStatusChange = async (status) => {
    setOrder(prev => ({ ...prev, status }));
    if (orderId) {
      setIsSaving(true);
      try {
        await updateOrderStatus(orderId, status);
        Toast.show({
          type: 'success',
          text1: 'Статус обновлён',
          text2: `Заказ теперь "${translateStatus(status)}"`,
        });
      } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        Toast.show({
          type: 'error',
          text1: 'Ошибка',
          text2: 'Не удалось обновить статус заказа: ' + error.message,
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSave = async () => {
    if (!order.customer.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Пожалуйста, укажите имя клиента',
      });
      return;
    }
    if (order.items.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Пожалуйста, добавьте хотя бы один товар в заказ',
      });
      return;
    }
    setIsSaving(true);
    try {
      const savedOrder = await saveOrder({
        ...order,
        id: orderId || undefined,
      });
      Toast.show({
        type: 'success',
        text1: 'Заказ сохранён',
        text2: `Заказ #${savedOrder.orderNumber} успешно сохранён`,
      });
      router.replace('/orders');
    } catch (error) {
      console.error('Ошибка сохранения заказа:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось сохранить заказ: ' + error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!orderId) return;
    setIsSaving(true);
    try {
      await deleteOrder(orderId);
      Toast.show({
        type: 'success',
        text1: 'Заказ удалён',
        text2: `Заказ #${order.orderNumber} успешно удалён`,
      });
      router.replace('/orders');
    } catch (error) {
      console.error('Ошибка удаления заказа:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось удалить заказ: ' + error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const generateReceiptHTML = () => {
    const itemsHTML = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid ${isDarkTheme ? '#4B5563' : '#E2E8F0'}; text-align: left;">${item.productId}</td>
        <td style="padding: 10px; border-bottom: 1px solid ${isDarkTheme ? '#4B5563' : '#E2E8F0'}; text-align: left;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid ${isDarkTheme ? '#4B5563' : '#E2E8F0'}; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid ${isDarkTheme ? '#4B5563' : '#E2E8F0'}; text-align: right;">
          ${item.price.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid ${isDarkTheme ? '#4B5563' : '#E2E8F0'}; text-align: right;">
          ${(item.price * item.quantity).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
        </td>
      </tr>
    `).join('');

    const taxRate = 0.2;
    const subtotal = order.total;
    const taxAmount = subtotal * taxRate;
    const grandTotal = subtotal + taxAmount;

    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 40px;
              color: ${isDarkTheme ? '#F3F4F6' : '#1E293B'};
              background-color: ${isDarkTheme ? '#1F2937' : '#FFFFFF'};
              line-height: 1.5;
            }
            .receipt {
              max-width: 800px;
              margin: 0 auto;
              border: 1px solid ${isDarkTheme ? '#4B5563' : '#E2E8F0'};
              padding: 20px;
              border-radius: 8px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid ${isDarkTheme ? '#4B5563' : '#E2E8F0'};
              padding-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              color: ${isDarkTheme ? '#60A5FA' : '#3B82F6'};
            }
            .company-info {
              margin-bottom: 20px;
              text-align: center;
              font-size: 14px;
            }
            .info {
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
            }
            .info-column {
              width: 48%;
            }
            .info p {
              margin: 5px 0;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              padding: 10px;
              text-align: left;
              font-size: 14px;
            }
            th {
              background-color: ${isDarkTheme ? '#374151' : '#F8FAFC'};
              font-weight: bold;
            }
            .total {
              text-align: right;
              font-size: 16px;
              font-weight: bold;
              margin-top: 20px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
              color: ${isDarkTheme ? '#A3BFFA' : '#64748B'};
              border-top: 1px solid ${isDarkTheme ? '#4B5563' : '#E2E8F0'};
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>Чек заказа #${order.orderNumber}</h1>
            </div>
            <div class="company-info">
              <p><strong>ООО "СПЕЦВИДЕОТЕХНИКА"</strong></p>
              <p>Адрес: ул. Демиденко, 54, Черкесск, Карачаево-Черкесская Республика</p>
              <p>ИНН: 1234567890 | Телефон: +7 (906) 443-43-32</p>
              <p>Email: info@spetsvideo.ru</p>
            </div>
            <div class="info">
              <div class="info-column">
                <p><strong>Клиент:</strong> ${order.customer}</p>
                <p><strong>Дата заказа:</strong> ${new Date(order.date).toLocaleDateString('ru-RU', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}</p>
                <p><strong>Время заказа:</strong> ${new Date(order.date).toLocaleTimeString('ru-RU')}</p>
              </div>
              <div class="info-column">
                <p><strong>Статус:</strong> ${translateStatus(order.status)}</p>
                <p><strong>Способ оплаты:</strong> ${order.paymentMethod}</p>
                <p><strong>Примечания:</strong> ${order.notes || 'Нет'}</p>
              </div>
            </div>
            <table>
              <tr>
                <th>Код товара</th>
                <th>Наименование</th>
                <th>Количество</th>
                <th>Цена за ед.</th>
                <th>Сумма</th>
              </tr>
              ${itemsHTML}
            </table>
            <div class="total">
              <p>Промежуточный итог: ${subtotal.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</p>
              <p>НДС (20%): ${taxAmount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</p>
              <p>Итого: ${grandTotal.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</p>
            </div>
            <div class="footer">
              <p>Спасибо за ваш заказ!</p>
              <p>Для возврата или обмена сохраните этот чек.</p>
              <p>© 2025 ООО "СПЕЦВИДЕОТЕХНИКА". Все права защищены.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handleGenerateReceipt = async () => {
    if (!orderId) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Сначала сохраните заказ',
      });
      return;
    }

    setIsGeneratingReceipt(true);
    try {
      const htmlContent = generateReceiptHTML();
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 595,
        height: 842,
      });

      const fileUri = `${FileSystem.documentDirectory}Receipt_${order.orderNumber}.pdf`;
      await FileSystem.moveAsync({
        from: uri,
        to: fileUri,
      });

      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Общий доступ недоступен на этом устройстве');
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Чек заказа #${order.orderNumber}`,
        UTI: 'com.adobe.pdf',
      });

      Toast.show({
        type: 'success',
        text1: 'Чек создан',
        text2: `PDF-чек для заказа #${order.orderNumber} готов`,
      });
    } catch (error) {
      console.error('Ошибка создания PDF чека:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: `Не удалось создать PDF чек: ${error.message}`,
      });
    } finally {
      setIsGeneratingReceipt(false);
    }
  };

  const renderOrderItem = ({ item, index }) => (
    <Pressable
      style={styles.orderItem}
      onPress={() => router.push(`/product-detail?id=${item.productId}`)}
    >
      <View style={styles.orderItemDetails}>
        <Text style={[styles.orderItemName, isDarkTheme ? styles.darkText : {}]}>{item.name}</Text>
        <Text style={[styles.orderItemPrice, isDarkTheme ? styles.darkSubtext : {}]}>
          {item.price.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
        </Text>
      </View>
      <View style={styles.quantityContainer}>
        <Pressable
          style={[styles.quantityButton, isDarkTheme ? { backgroundColor: '#4B5563' } : {}]}
          onPress={() => updateItemQuantity(index, item.quantity - 1)}
        >
          <Text style={[styles.quantityButtonText, isDarkTheme ? styles.darkText : {}]}>-</Text>
        </Pressable>
        <Text style={[styles.quantityText, isDarkTheme ? styles.darkText : {}]}>{item.quantity}</Text>
        <Pressable
          style={[styles.quantityButton, isDarkTheme ? { backgroundColor: '#4B5563' } : {}]}
          onPress={() => updateItemQuantity(index, item.quantity + 1)}
        >
          <Text style={[styles.quantityButtonText, isDarkTheme ? styles.darkText : {}]}>+</Text>
        </Pressable>
        <Pressable
          style={styles.removeButton}
          onPress={() => removeItem(index)}
        >
          <Trash size={16} color={isDarkTheme ? '#F87171' : '#EF4444'} />
        </Pressable>
      </View>
    </Pressable>
  );

  const renderProductItem = ({ item }) => (
    <Pressable
      style={[styles.productItem, isDarkTheme ? { borderBottomColor: '#4B5563' } : {}]}
      onPress={() => addOrderItem(item)}
    >
      <Text style={[styles.productItemName, isDarkTheme ? styles.darkText : {}]}>{item.name}</Text>
      <Text style={[styles.productItemPrice, isDarkTheme ? styles.darkSubtext : {}]}>
        {item.price.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
      </Text>
    </Pressable>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, isDarkTheme ? styles.darkContainer : {}]}>
        <StatusBar style={isDarkTheme ? 'light' : 'auto'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDarkTheme ? '#60A5FA' : '#3B82F6'} />
          <Text style={[styles.loadingText, isDarkTheme ? styles.darkSubtext : {}]}>Загрузка заказа...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkTheme ? styles.darkContainer : {}]}>
      <StatusBar style={isDarkTheme ? 'light' : 'auto'} />
      <View style={[styles.header, isDarkTheme ? styles.darkHeader : {}]}>
        <Pressable style={styles.backButton} onPress={() => router.replace('/orders')}>
          <ArrowLeft size={24} color={isDarkTheme ? '#F3F4F6' : '#1E293B'} />
        </Pressable>
        <Text style={[styles.title, isDarkTheme ? styles.darkText : {}]}>{orderId ? 'Редактировать заказ' : 'Новый заказ'}</Text>
        <View style={styles.headerActions}>
          {orderId && (
            <Pressable style={styles.deleteButton} onPress={handleDelete}>
              <Trash size={24} color={isDarkTheme ? '#F87171' : '#EF4444'} />
            </Pressable>
          )}
          <Pressable style={[styles.saveButton, isDarkTheme ? { backgroundColor: '#60A5FA' } : { backgroundColor: '#3B82F6' }]} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Save size={24} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </View>
      <ScrollView style={styles.scrollContainer}>
        <View style={[styles.orderInfoSection, isDarkTheme ? styles.darkCard : {}]}>
          <View style={styles.orderNumberContainer}>
            <Text style={[styles.orderNumberLabel, isDarkTheme ? styles.darkSubtext : {}]}>Заказ №</Text>
            <Text style={[styles.orderNumber, isDarkTheme ? styles.darkText : {}]}>{order.orderNumber}</Text>
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, isDarkTheme ? styles.darkText : {}]}>Клиент</Text>
            <TextInput
              style={[styles.customerInput, isDarkTheme ? styles.darkInput : {}]}
              value={order.customer}
              onChangeText={(text) => setOrder(prev => ({ ...prev, customer: text }))}
              placeholder="Введите имя клиента"
              placeholderTextColor={isDarkTheme ? '#A3BFFA' : '#94A3B8'}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, isDarkTheme ? styles.darkText : {}]}>Статус</Text>
            <View style={styles.statusContainer}>
              {statusOptions.map((status) => (
                <Pressable
                  key={status}
                  style={[
                    styles.statusButton,
                    order.status === status && getStatusButtonStyle(status, isDarkTheme),
                    isDarkTheme ? { borderColor: '#4B5563', backgroundColor: '#4B5563' } : {},
                  ]}
                  onPress={() => handleStatusChange(status)}
                >
                  <Text
                    style={[
                      styles.statusText,
                      order.status === status && styles.activeStatusText,
                      isDarkTheme ? styles.darkSubtext : {},
                      order.status === status && isDarkTheme ? styles.darkText : {},
                    ]}
                  >
                    {translateStatus(status)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, isDarkTheme ? styles.darkText : {}]}>Способ оплаты</Text>
            <TextInput
              style={[styles.customerInput, isDarkTheme ? styles.darkInput : {}]}
              value={order.paymentMethod}
              onChangeText={(text) => setOrder(prev => ({ ...prev, paymentMethod: text }))}
              placeholder="Введите способ оплаты (например, Наличные, Карта)"
              placeholderTextColor={isDarkTheme ? '#A3BFFA' : '#94A3B8'}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, isDarkTheme ? styles.darkText : {}]}>Примечания</Text>
            <TextInput
              style={[styles.customerInput, isDarkTheme ? styles.darkInput : {}, { height: 80 }]}
              value={order.notes}
              onChangeText={(text) => setOrder(prev => ({ ...prev, notes: text }))}
              placeholder="Введите примечания к заказу"
              placeholderTextColor={isDarkTheme ? '#A3BFFA' : '#94A3B8'}
              multiline
            />
          </View>
        </View>
        <View style={[styles.itemsSection, isDarkTheme ? styles.darkCard : {}]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isDarkTheme ? styles.darkText : {}]}>Товары</Text>
            <Pressable
              style={[styles.addItemButton, isDarkTheme ? { backgroundColor: '#60A5FA' } : { backgroundColor: '#3B82F6' }]}
              onPress={() => setShowProductList(!showProductList)}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.addItemText}>Добавить товар</Text>
            </Pressable>
          </View>
          {showProductList && (
            <View>
              <TextInput
                style={[styles.searchInput, isDarkTheme ? styles.darkInput : {}]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Поиск товаров..."
                placeholderTextColor={isDarkTheme ? '#A3BFFA' : '#94A3B8'}
              />
              {filteredProducts.length > 0 ? (
                <FlatList
                  data={filteredProducts}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderProductItem}
                  style={[styles.productList, isDarkTheme ? { backgroundColor: '#4B5563' } : {}]}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={[styles.noProductsText, isDarkTheme ? styles.darkSubtext : {}]}>
                  {searchQuery.trim() ? 'Товары не найдены' : 'Список товаров пуст'}
                </Text>
              )}
            </View>
          )}
          {order.items.length === 0 ? (
            <View style={[styles.emptyItemsContainer, isDarkTheme ? { backgroundColor: '#4B5563' } : {}]}>
              <Text style={[styles.emptyItemsText, isDarkTheme ? styles.darkText : {}]}>Товары еще не добавлены</Text>
              <Text style={[styles.emptyItemsSubtext, isDarkTheme ? styles.darkSubtext : {}]}>
                Нажмите "Добавить товар", чтобы начать формировать заказ
              </Text>
            </View>
          ) : (
            <FlatList
              data={order.items}
              keyExtractor={(item, index) => `${item.productId}-${index}`}
              renderItem={renderOrderItem}
              scrollEnabled={false}
            />
          )}
        </View>
        <View style={[styles.summarySection, isDarkTheme ? styles.darkCard : {}]}>
          <Pressable
            style={[styles.receiptButton, isGeneratingReceipt && styles.disabledButton, isDarkTheme ? { backgroundColor: '#34D399' } : { backgroundColor: '#10B981' }]}
            onPress={handleGenerateReceipt}
            disabled={isGeneratingReceipt}
          >
            {isGeneratingReceipt ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <FileText size={20} color="#FFFFFF" />
                <Text style={styles.receiptButtonText}>Создать PDF чек</Text>
              </>
            )}
          </Pressable>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isDarkTheme ? styles.darkSubtext : {}]}>Промежуточный итог</Text>
            <Text style={[styles.summaryValue, isDarkTheme ? styles.darkText : {}]}>
              {order.total.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isDarkTheme ? styles.darkSubtext : {}]}>НДС (20%)</Text>
            <Text style={[styles.summaryValue, isDarkTheme ? styles.darkText : {}]}>
              {(order.total * 0.2).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
            </Text>
          </View>
          <View style={[styles.summaryTotalRow, isDarkTheme ? { borderTopColor: '#4B5563' } : {}]}>
            <Text style={[styles.totalLabel, isDarkTheme ? styles.darkText : {}]}>Итого</Text>
            <Text style={[styles.totalValue, isDarkTheme ? styles.darkText : {}]}>
              {(order.total * 1.2).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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

function getStatusButtonStyle(status, isDarkTheme) {
  const statusStyles = {
    Pending: [styles.pendingStatusButton, isDarkTheme ? { borderColor: '#FCD34D', backgroundColor: '#452700' } : {}],
    Processing: [styles.processingStatusButton, isDarkTheme ? { borderColor: '#60A5FA', backgroundColor: '#1E3A8A' } : {}],
    Shipped: [styles.shippedStatusButton, isDarkTheme ? { borderColor: '#34D399', backgroundColor: '#1A2F26' } : {}],
    Completed: [styles.completedStatusButton, isDarkTheme ? { borderColor: '#34D399', backgroundColor: '#1A2F26' } : {}],
    Cancelled: [styles.cancelledStatusButton, isDarkTheme ? { borderColor: '#F87171', backgroundColor: '#4A1A1A' } : {}],
  };
  return statusStyles[status] || {};
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  darkHeader: {
    backgroundColor: '#374151',
    borderBottomColor: '#4B5563',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  darkText: {
    color: '#F3F4F6',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  receiptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  disabledButton: {
    backgroundColor: '#6EE7B7',
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  orderInfoSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
  },
  darkCard: {
    backgroundColor: '#374151',
  },
  orderNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderNumberLabel: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
    marginRight: 8,
  },
  darkSubtext: {
    color: '#A3BFFA',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  customerInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
  },
  darkInput: {
    backgroundColor: '#4B5563',
    borderColor: '#4B5563',
    color: '#F3F4F6',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusButton: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  pendingStatusButton: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  processingStatusButton: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  shippedStatusButton: {
    backgroundColor: '#F0FDFA',
    borderColor: '#10B981',
  },
  completedStatusButton: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  cancelledStatusButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  statusText: {
    fontSize: 14,
    color: '#64748B',
  },
  activeStatusText: {
    fontWeight: '600',
    color: '#1E293B',
  },
  itemsSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
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
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addItemText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 8,
  },
  productList: {
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  productItemName: {
    fontSize: 16,
    color: '#1E293B',
  },
  productItemPrice: {
    fontSize: 14,
    color: '#64748B',
  },
  noProductsText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyItemsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  emptyItemsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptyItemsSubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  orderItemDetails: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 4,
  },
  orderItemPrice: {
    fontSize: 14,
    color: '#64748B',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginHorizontal: 4,
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    width: 30,
    textAlign: 'center',
  },
  removeButton: {
    marginLeft: 8,
  },
  summarySection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  totalValue: {
    fontSize: 18,
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
});