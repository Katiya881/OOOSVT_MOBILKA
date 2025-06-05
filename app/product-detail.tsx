import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, QrCode, Save, Trash, Image as ImageIcon } from 'lucide-react-native';
import { getProduct, saveProduct, deleteProduct, loadCategories, saveCategory } from '@/utils/dataService';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import QRCode from 'react-native-qrcode-svg';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(id ? true : false);
  const [isSaving, setIsSaving] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const qrCodeRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [product, setProduct] = useState({
    id: '',
    name: '',
    description: '',
    price: '',
    quantity: '',
    category: '',
    lowStockThreshold: '',
    imageUrl: 'https://via.placeholder.com/400x400.png?text=Product+Image',
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

        const loadedCategories = await loadCategories();
        setCategories(loadedCategories || []);
        if (id) {
          const productData = await getProduct(id);
          setProduct({
            ...productData,
            price: productData.price.toString(),
            quantity: productData.quantity.toString(),
            lowStockThreshold: productData.lowStockThreshold.toString(),
          });
          setCategoryInput(productData.category || '');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        Toast.show({
          type: 'error',
          text1: 'Ошибка',
          text2: 'Не удалось загрузить данные',
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Требуется разрешение на доступ к галерее',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProduct((prev) => ({ ...prev, imageUrl: result.assets[0].uri }));
    }
  };

  const handleCategoryConfirm = async () => {
    const trimmedCategory = categoryInput.trim();
    if (!trimmedCategory) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Категория не может быть пустой',
      });
      return;
    }

    const normalizedCategory = trimmedCategory.toLowerCase();
    const existingCategory = categories.find(
      (c) => c.toLowerCase() === normalizedCategory
    );
    const finalCategory = existingCategory || trimmedCategory;

    if (!existingCategory) {
      try {
        await saveCategory(trimmedCategory);
        setCategories((prev) => [...prev, trimmedCategory]);
        Toast.show({
          type: 'success',
          text1: 'Категория добавлена',
          text2: `Категория "${trimmedCategory}" создана`,
        });
      } catch (error) {
        console.error('Error saving category:', error);
        Toast.show({
          type: 'error',
          text1: 'Ошибка',
          text2: 'Не удалось сохранить категорию',
        });
        return;
      }
    } else {
      Toast.show({
        type: 'info',
        text1: 'Категория выбрана',
        text2: `Выбрана существующая категория "${finalCategory}"`,
      });
    }

    setProduct((prev) => ({ ...prev, category: finalCategory }));
  };

  const handleCategorySelect = (category) => {
    setCategoryInput(category);
    setProduct((prev) => ({ ...prev, category }));
    Toast.show({
      type: 'info',
      text1: 'Категория выбрана',
      text2: `Выбрана категория "${category}"`,
    });
  };

  const filteredCategories = categories
    .filter((cat) =>
      cat.toLowerCase().includes(categoryInput.toLowerCase().trim())
    )
    .slice(0, 5);

  const handleSave = async () => {
    if (!product.name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Введите название продукта',
      });
      return;
    }
    if (!product.category.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Выберите или введите категорию',
      });
      return;
    }
    setIsSaving(true);
    try {
      const productToSave = {
        ...product,
        price: parseFloat(product.price) || 0,
        quantity: parseInt(product.quantity) || 0,
        lowStockThreshold: parseInt(product.lowStockThreshold) || 0,
      };
      await saveProduct(productToSave);
      Toast.show({
        type: 'success',
        text1: 'Продукт сохранён',
        text2: `Продукт "${productToSave.name}" успешно сохранён`,
      });
      router.back();
    } catch (error) {
      console.error('Error saving product:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось сохранить продукт',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteProduct(id);
      Toast.show({
        type: 'success',
        text1: 'Продукт удалён',
        text2: 'Продукт успешно удалён',
      });
      router.back();
    } catch (error) {
      console.error('Error deleting product:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось удалить продукт',
      });
    }
  };

  const handleQrCode = () => {
    if (id) {
      setShowQrModal(true);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'QR-код недоступен: продукт не сохранён',
      });
    }
  };

  const saveQrCode = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Ошибка',
          text2: 'Требуется разрешение на сохранение изображения',
        });
        return;
      }

      const svg = qrCodeRef.current;
      if (!svg) {
        Toast.show({
          type: 'error',
          text1: 'Ошибка',
          text2: 'Не удалось сгенерировать QR-код',
        });
        return;
      }

      const fileUri = `${FileSystem.cacheDirectory}qr_code_${id}.png`;
      await new Promise((resolve, reject) => {
        svg.toDataURL(async (data) => {
          try {
            const base64Data = data.replace(/^data:image\/png;base64,/, '');
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            await MediaLibrary.saveToLibraryAsync(fileUri);
            Toast.show({
              type: 'success',
              text1: 'QR-код сохранён',
              text2: 'QR-код успешно сохранён в галерею',
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('Error saving QR code:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось сохранить QR-код',
      });
    }
  };

  const updateField = (field, value) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, isDarkTheme ? styles.darkContainer : {}]}>
        <StatusBar style={isDarkTheme ? 'light' : 'auto'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDarkTheme ? '#60A5FA' : '#3B82F6'} />
          <Text style={[styles.loadingText, isDarkTheme ? styles.darkSubtext : {}]}>Загрузка продукта...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkTheme ? styles.darkContainer : {}]}>
      <StatusBar style={isDarkTheme ? 'light' : 'auto'} />
      <View style={[styles.header, isDarkTheme ? styles.darkHeader : {}]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={isDarkTheme ? '#F3F4F6' : '#1E293B'} />
        </Pressable>
        <Text style={[styles.title, isDarkTheme ? styles.darkText : {}]}>{id ? 'Редактировать' : 'Новый продукт'}</Text>
        <View style={styles.headerActions}>
          {id && (
            <Pressable style={styles.deleteButton} onPress={handleDelete}>
              <Trash size={24} color={isDarkTheme ? '#F87171' : '#EF4444'} />
            </Pressable>
          )}
          <Pressable style={[styles.saveButton, isDarkTheme ? { backgroundColor: '#60A5FA' } : {}]} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Save size={24} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.formContainer}>
        <View style={styles.imageContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.imagePressable,
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleImagePick}
          >
            <Image source={{ uri: product.imageUrl }} style={[styles.productImage, isDarkTheme ? { backgroundColor: '#4B5563' } : {}]} />
            {product.imageUrl.includes('placeholder') && (
              <View style={[styles.imageOverlay, isDarkTheme ? { backgroundColor: 'rgba(0, 0, 0, 0.3)' } : {}]}>
                <ImageIcon size={32} color={isDarkTheme ? '#A3BFFA' : '#64748B'} />
                <Text style={[styles.imageOverlayText, isDarkTheme ? styles.darkSubtext : {}]}>Добавить изображение</Text>
              </View>
            )}
          </Pressable>
          {id && (
            <View style={styles.qrButtonsContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.qrButton,
                  pressed && { opacity: 0.7 },
                  isDarkTheme ? { backgroundColor: '#60A5FA' } : {},
                ]}
                onPress={handleQrCode}
              >
                <QrCode size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, isDarkTheme ? styles.darkText : {}]}>Название</Text>
          <TextInput
            style={[styles.input, isDarkTheme ? styles.darkInput : {}]}
            value={product.name}
            onChangeText={(text) => updateField('name', text)}
            placeholder="Название продукта"
            placeholderTextColor={isDarkTheme ? '#A3BFFA' : '#94A3B8'}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, isDarkTheme ? styles.darkText : {}]}>Описание</Text>
          <TextInput
            style={[styles.input, styles.textArea, isDarkTheme ? styles.darkInput : {}]}
            value={product.description}
            onChangeText={(text) => updateField('description', text)}
            placeholder="Описание продукта"
            placeholderTextColor={isDarkTheme ? '#A3BFFA' : '#94A3B8'}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.rowContainer}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.label, isDarkTheme ? styles.darkText : {}]}>Цена (₽)</Text>
            <TextInput
              style={[styles.input, isDarkTheme ? styles.darkInput : {}]}
              value={product.price}
              onChangeText={(text) => updateField('price', text)}
              placeholder="0.00"
              placeholderTextColor={isDarkTheme ? '#A3BFFA' : '#94A3B8'}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.label, isDarkTheme ? styles.darkText : {}]}>Количество</Text>
            <TextInput
              style={[styles.input, isDarkTheme ? styles.darkInput : {}]}
              value={product.quantity}
              onChangeText={(text) => updateField('quantity', text)}
              placeholder="0"
              placeholderTextColor={isDarkTheme ? '#A3BFFA' : '#94A3B8'}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, isDarkTheme ? styles.darkText : {}]}>Категория</Text>
          <TextInput
            style={[styles.input, isDarkTheme ? styles.darkInput : {}]}
            value={categoryInput}
            onChangeText={setCategoryInput}
            onBlur={handleCategoryConfirm}
            onSubmitEditing={handleCategoryConfirm}
            placeholder="Введите категорию (например, Кофе)"
            placeholderTextColor={isDarkTheme ? '#A3BFFA' : '#94A3B8'}
            autoCapitalize="sentences"
          />
          {categoryInput.trim() && filteredCategories.length > 0 && (
            <View style={[styles.categorySuggestions, isDarkTheme ? { backgroundColor: '#374151' } : {}]}>
              {filteredCategories.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.categorySuggestionButton, isDarkTheme ? { backgroundColor: '#4B5563', borderColor: '#4B5563' } : {}]}
                  onPress={() => handleCategorySelect(cat)}
                >
                  <Text style={[styles.categorySuggestionText, isDarkTheme ? styles.darkText : {}]}>{cat}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, isDarkTheme ? styles.darkText : {}]}>Порог низкого запаса</Text>
          <TextInput
            style={[styles.input, isDarkTheme ? styles.darkInput : {}]}
            value={product.lowStockThreshold}
            onChangeText={(text) => updateField('lowStockThreshold', text)}
            placeholder="Количество для предупреждения"
            placeholderTextColor={isDarkTheme ? '#A3BFFA' : '#94A3B8'}
            keyboardType="numeric"
          />
          <Text style={[styles.helperText, isDarkTheme ? styles.darkSubtext : {}]}>
            Вы получите уведомления, когда запас упадёт ниже этого значения
          </Text>
        </View>
      </ScrollView>

      <Modal visible={showQrModal} animationType="slide" transparent={true}>
        <View style={[styles.modalContainer, isDarkTheme ? { backgroundColor: 'rgba(0, 0, 0, 0.8)' } : {}]}>
          <View style={[styles.modalContent, isDarkTheme ? styles.darkModalContent : {}]}>
            <Text style={[styles.modalTitle, isDarkTheme ? styles.darkText : {}]}>QR продукта</Text>
            <QRCode
              value={`myapp://product-detail?id=${id}`}
              size={200}
              backgroundColor={isDarkTheme ? '#374151' : '#FFFFFF'}
              color={isDarkTheme ? '#F3F4F6' : '#1E293B'}
              getRef={(c) => (qrCodeRef.current = c)}
            />
            <View style={styles.modalButtonContainer}>
              <Pressable style={[styles.modalSaveButton, isDarkTheme ? { backgroundColor: '#34D399' } : {}]} onPress={saveQrCode}>
                <Text style={styles.modalButtonText}>Скачать</Text>
              </Pressable>
              <Pressable style={[styles.modalCloseButton, isDarkTheme ? { backgroundColor: '#60A5FA' } : {}]} onPress={() => setShowQrModal(false)}>
                <Text style={styles.modalButtonText}>Назад</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
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
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imagePressable: {
    borderRadius: 8,
  },
  productImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
  },
  imageOverlayText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
  },
  darkSubtext: {
    color: '#A3BFFA',
  },
  qrButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  qrButton: {
    backgroundColor: '#3B82F6',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
  },
  darkInput: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
    color: '#F3F4F6',
  },
  textArea: {
    height: 100,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categorySuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    maxHeight: 100,
    overflow: 'scroll',
  },
  categorySuggestionButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  categorySuggestionText: {
    fontSize: 14,
    color: '#1E293B',
  },
  helperText: {
    marginTop: 4,
    fontSize: 12,
    color: '#94A3B8',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    width: '80%',
  },
  darkModalContent: {
    backgroundColor: '#374151',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  modalSaveButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  modalCloseButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});