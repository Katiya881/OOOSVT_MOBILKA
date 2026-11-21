import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { Plus, Search, SlidersHorizontal } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { loadProducts } from '@/utils/dataService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProductsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { viewMode } = useLocalSearchParams(); // Changed from lowStock to viewMode
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  const fetchProducts = async () => {
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
      const productData = await loadProducts();
      setProducts(productData);
      setFilteredProducts(productData);
      const uniqueCategories = [...new Set(productData.map((product) => product.category))].sort();
      setAllCategories(uniqueCategories);
      const savedCategories = await AsyncStorage.getItem('selectedCategories');
      if (savedCategories) {
        const parsedCategories = JSON.parse(savedCategories);
        const validCategories = parsedCategories.filter((cat) => uniqueCategories.includes(cat));
        setSelectedCategories(validCategories.length > 0 ? validCategories : uniqueCategories);
        if (validCategories.length !== parsedCategories.length) {
          await AsyncStorage.setItem('selectedCategories', JSON.stringify(validCategories.length > 0 ? validCategories : uniqueCategories));
        }
      } else {
        setSelectedCategories(uniqueCategories);
        await AsyncStorage.setItem('selectedCategories', JSON.stringify(uniqueCategories));
      }
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось загрузить товары',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      setSearchQuery(''); // Clear search query
      setSelectedCategories(allCategories); // Reset category filter
      if (viewMode === 'lowStock') {
        setFilteredProducts(products.filter((product) => product.quantity <= product.lowStockThreshold));
      } else {
        setFilteredProducts(products); // Show all products
      }
    }, [viewMode, products, allCategories])
  );

  useEffect(() => {
    let filtered = products;

    if (viewMode === 'lowStock') {
      filtered = filtered.filter((product) => product.quantity <= product.lowStockThreshold);
    }

    if (searchQuery.trim() !== '') {
      filtered = filtered.filter((product) => {
        const query = searchQuery.toLowerCase();
        return (
          product.name.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query) ||
          product.price.toString().toLowerCase().includes(query) ||
          product.quantity.toString().toLowerCase().includes(query) ||
          (product.description?.toLowerCase().includes(query) || false) ||
          (product.sku?.toLowerCase().includes(query) || false)
        );
      });
    }

    if (selectedCategories.length > 0 && selectedCategories.length < allCategories.length) {
      filtered = filtered.filter((product) => selectedCategories.includes(product.category));
    }

    setFilteredProducts(filtered);
  }, [searchQuery, products, selectedCategories, allCategories, viewMode]);

  const handleAddProduct = () => {
    router.push('/product-detail');
  };

  const handleProductPress = (productId) => {
    router.push(`/product-detail?id=${productId}`);
  };

  const toggleCategory = async (category) => {
    setSelectedCategories((prev) => {
      const newCategories = prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category];
      AsyncStorage.setItem('selectedCategories', JSON.stringify(newCategories));
      return newCategories;
    });
  };

  const toggleAllCategories = async () => {
    const newCategories = selectedCategories.length === allCategories.length ? [] : allCategories;
    setSelectedCategories(newCategories);
    await AsyncStorage.setItem('selectedCategories', JSON.stringify(newCategories));
  };

  const renderProductItem = ({ item }) => (
    <Pressable
      style={[styles.productItem, isDarkTheme ? styles.darkProductItem : {}]}
      onPress={() => handleProductPress(item.id)}
    >
      <View style={[styles.productColorTag, { backgroundColor: getCategoryColor(item.category) }]} />
      <View style={styles.productContent}>
        <Text style={[styles.productName, isDarkTheme ? styles.darkText : {}]}>{item.name}</Text>
        <Text style={[styles.productCategory, isDarkTheme ? styles.darkSubtext : {}]}>
          {translateCategory(item.category)}
        </Text>
        <View style={styles.productFooter}>
          <Text style={[styles.productPrice, isDarkTheme ? styles.darkText : {}]}>
            {item.price.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
          </Text>
          <View style={[styles.stockContainer, isDarkTheme ? { backgroundColor: '#4B5563' } : {}]}>
            <Text
              style={[
                styles.stockText,
                item.quantity <= item.lowStockThreshold ? styles.lowStockText : null,
                isDarkTheme ? styles.darkSubtext : {},
              ]}
            >
              {item.quantity} на складе
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, isDarkTheme ? styles.darkContainer : {}]}>
      <StatusBar style={isDarkTheme ? 'light' : 'auto'} />
      <View style={[styles.header, isDarkTheme ? styles.darkHeader : {}]}>
        <Text style={[styles.title, isDarkTheme ? styles.darkText : {}]}>
          {viewMode === 'lowStock' ? 'Мало на складе' : 'Товары'}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.addButton, isDarkTheme ? { backgroundColor: '#60A5FA' } : { backgroundColor: '#3B82F6' }]}
            onPress={handleAddProduct}
          >
            <Plus size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View style={[styles.searchContainer, isDarkTheme ? styles.darkSearchContainer : {}]}>
        <View style={[styles.searchInputContainer, isDarkTheme ? { backgroundColor: '#4B5563' } : {}]}>
          <Search size={20} color={isDarkTheme ? '#A3BFFA' : '#94A3B8'} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, isDarkTheme ? styles.darkInput : {}]}
            placeholder="Поиск по названию, категории, цене..."
            placeholderTextColor={isDarkTheme ? '#A3BFFA' : '#94A3B8'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Pressable
          style={[styles.filterButton, isDarkTheme ? { backgroundColor: '#4B5563' } : { backgroundColor: '#EFF6FF' }]}
          onPress={() => setIsFilterModalVisible(true)}
        >
          <SlidersHorizontal size={20} color={isDarkTheme ? '#60A5FA' : '#3B82F6'} />
          {selectedCategories.length !== allCategories.length && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{selectedCategories.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDarkTheme ? '#60A5FA' : '#3B82F6'} />
          <Text style={[styles.loadingText, isDarkTheme ? styles.darkSubtext : {}]}>Загрузка товаров...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProductItem}
          contentContainerStyle={styles.productsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, isDarkTheme ? styles.darkText : {}]}>
                {viewMode === 'lowStock' ? 'Товары с низким запасом не найдены' : 'Товары не найдены'}
              </Text>
              <Text style={[styles.emptySubtext, isDarkTheme ? styles.darkSubtext : {}]}>
                Попробуйте изменить поиск или выбрать другие категории
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.filterModal, isDarkTheme ? styles.darkFilterModal : {}]}>
            <View style={[styles.modalHeader, isDarkTheme ? styles.darkModalHeader : {}]}>
              <Text style={[styles.modalTitle, isDarkTheme ? styles.darkText : {}]}>Выберите категории</Text>
              <Pressable onPress={() => setIsFilterModalVisible(false)}>
                <Text style={[styles.modalCloseText, isDarkTheme ? styles.darkModalCloseText : {}]}>Закрыть</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalContent}>
              <Pressable
                style={[styles.toggleAllButton, isDarkTheme ? styles.darkToggleAllButton : {}]}
                onPress={toggleAllCategories}
              >
                <Text style={[styles.toggleAllText, isDarkTheme ? styles.darkToggleAllText : {}]}>
                  {selectedCategories.length === allCategories.length ? 'Снять выбор' : 'Выбрать все'}
                </Text>
              </Pressable>
              {allCategories.map((category) => (
                <Pressable
                  key={category}
                  style={[styles.categoryItem, isDarkTheme ? styles.darkCategoryItem : {}]}
                  onPress={() => toggleCategory(category)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      selectedCategories.includes(category) ? styles.checkedCheckbox : {},
                      isDarkTheme ? styles.darkCheckbox : {},
                      selectedCategories.includes(category) && isDarkTheme ? styles.darkCheckedCheckbox : {},
                    ]}
                  >
                    {selectedCategories.includes(category) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text style={[styles.categoryText, isDarkTheme ? styles.darkText : {}]}>
                    {translateCategory(category)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.applyButton, isDarkTheme ? { backgroundColor: '#60A5FA' } : { backgroundColor: '#3B82F6' }]}
              onPress={() => setIsFilterModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>Применить</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Toast />
    </SafeAreaView>
  );
}

function translateCategory(category) {
  const categoryTranslations = {
    Electronics: 'Электроника',
    Clothing: 'Одежда',
    Home: 'Дом',
    Food: 'Еда',
    Office: 'Офис',
  };
  return categoryTranslations[category] || category;
}

function getCategoryColor(category) {
  const categoryColors = {
    Electronics: '#3B82F6',
    Clothing: '#8B5CF6',
    Home: '#F59E0B',
    Food: '#10B981',
    Office: '#EF4444',
  };
  if (!categoryColors[category]) {
    const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    categoryColors[category] = randomColor;
  }
  return categoryColors[category] || '#94A3B8';
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  darkHeader: {
    backgroundColor: '#374151',
    borderBottomColor: '#4B5563',
  },
  title: {
    fontSize: 24,
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
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  darkSearchContainer: {
    backgroundColor: '#374151',
    borderBottomColor: '#4B5563',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  darkInput: {
    color: '#F3F4F6',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#1E293B',
    fontSize: 16,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  productsList: {
    padding: 16,
  },
  productItem: {
    flexDirection: 'row',
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
  darkProductItem: {
    backgroundColor: '#374151',
    shadowColor: '#000',
  },
  productColorTag: {
    width: 6,
  },
  productContent: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  productCategory: {
    fontSize: 14,
    color: '#64748B',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  stockContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  stockText: {
    fontSize: 12,
    color: '#64748B',
  },
  lowStockText: {
    color: '#EF4444',
  },
  darkLowStockText: {
    color: '#F87171',
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
  darkSubtext: {
    color: '#A3BFFA',
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  darkFilterModal: {
    backgroundColor: '#374151',
    shadowColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  darkModalHeader: {
    borderBottomColor: '#4B5563',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#3B82F6',
  },
  darkModalCloseText: {
    color: '#60A5FA',
  },
  modalContent: {
    paddingVertical: 12,
  },
  toggleAllButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  darkToggleAllButton: {
    borderBottomColor: '#4B5563',
  },
  toggleAllText: {
    fontSize: 16,
    color: '#3B82F6',
  },
  darkToggleAllText: {
    color: '#60A5FA',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  darkCategoryItem: {
    borderBottomColor: '#4B5563',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  darkCheckbox: {
    borderColor: '#A3BFFA',
  },
  checkedCheckbox: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  darkCheckedCheckbox: {
    backgroundColor: '#60A5FA',
    borderColor: '#60A5FA',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  categoryText: {
    fontSize: 16,
    color: '#1E293B',
  },
  applyButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});