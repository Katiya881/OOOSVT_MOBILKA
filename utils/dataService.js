import AsyncStorage from '@react-native-async-storage/async-storage';

// Sample data for initial app state
const sampleProducts = [
  {
    id: '1',
    name: 'Laptop Pro',
    description: 'High-performance laptop with 16GB RAM and 512GB SSD',
    price: 1299.99,
    quantity: 15,
    category: 'Electronics',
    lowStockThreshold: 5,
    imageUrl: 'https://via.placeholder.com/400x400.png?text=Laptop',
  },
  {
    id: '2',
    name: 'Business Shirt',
    description: 'Premium cotton business shirt, perfect for formal occasions',
    price: 49.99,
    quantity: 32,
    category: 'Clothing',
    lowStockThreshold: 10,
    imageUrl: 'https://via.placeholder.com/400x400.png?text=Shirt',
  },
  {
    id: '3',
    name: 'Coffee Maker',
    description: 'Automatic coffee maker with timer and multiple brew settings',
    price: 79.99,
    quantity: 8,
    category: 'Home',
    lowStockThreshold: 3,
    imageUrl: 'https://via.placeholder.com/400x400.png?text=Coffee+Maker',
  },
  {
    id: '4',
    name: 'Office Chair',
    description: 'Ergonomic office chair with lumbar support',
    price: 159.99,
    quantity: 4,
    category: 'Office',
    lowStockThreshold: 5,
    imageUrl: 'https://via.placeholder.com/400x400.png?text=Office+Chair',
  },
  {
    id: '5',
    name: 'Wireless Earbuds',
    description: 'Noise-cancelling wireless earbuds with long battery life',
    price: 89.99,
    quantity: 25,
    category: 'Electronics',
    lowStockThreshold: 8,
    imageUrl: 'https://via.placeholder.com/400x400.png?text=Earbuds',
  },
];

const sampleOrders = [
  {
    id: '1',
    orderNumber: '10458',
    customer: 'John Doe',
    date: '2024-06-15T14:30:00Z',
    status: 'Processing',
    items: [
      { productId: '1', name: 'Laptop Pro', price: 1299.99, quantity: 1 },
      { productId: '5', name: 'Wireless Earbuds', price: 89.99, quantity: 2 },
    ],
    total: 1479.97,
  },
  {
    id: '2',
    orderNumber: '10459',
    customer: 'Jane Smith',
    date: '2024-06-14T10:15:00Z',
    status: 'Shipped',
    items: [
      { productId: '2', name: 'Business Shirt', price: 49.99, quantity: 3 },
      { productId: '4', name: 'Office Chair', price: 159.99, quantity: 1 },
    ],
    total: 309.96,
  },
  {
    id: '3',
    orderNumber: '10460',
    customer: 'Alice Johnson',
    date: '2024-06-16T09:20:00Z',
    status: 'Pending',
    items: [
      { productId: '3', name: 'Coffee Maker', price: 79.99, quantity: 1 },
    ],
    total: 79.99,
  },
];

const sampleProfile = {
  id: '1',
  name: 'Никита Бойко',
  email: 'Nikita.boiko@gmail.com',
  role: 'Складской работник',
  department: 'stv',
};

const initialCategories = ['Electronics', 'Clothing', 'Home', 'Food', 'Office'];

// Initialize the database with sample data
export const initDatabase = async () => {
  try {
    const isInitialized = await AsyncStorage.getItem('db_initialized');
    if (isInitialized === 'true') {
      console.log('Database already initialized');
      return;
    }

    console.log('Initializing database...');
    await AsyncStorage.setItem('products', JSON.stringify(sampleProducts));
    await AsyncStorage.setItem('orders', JSON.stringify(sampleOrders));
    await AsyncStorage.setItem('profile', JSON.stringify(sampleProfile));
    await AsyncStorage.setItem('categories', JSON.stringify(initialCategories));
    await AsyncStorage.setItem('db_initialized', 'true');

    console.log('Database initialized with sample data');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Ensure database is initialized before any data operations
const ensureInit = async () => {
  await initDatabase();
};

// Categories management
export const loadCategories = async () => {
  await ensureInit();
  try {
    const categoriesJson = await AsyncStorage.getItem('categories');
    const categories = categoriesJson ? JSON.parse(categoriesJson) : [];
    console.log('Loaded categories from AsyncStorage:', categories);
    return categories;
  } catch (error) {
    console.error('Error loading categories:', error);
    throw error;
  }
};

export const saveCategory = async (category) => {
  await ensureInit();
  try {
    const categories = JSON.parse(await AsyncStorage.getItem('categories') || '[]');
    const normalizedCategory = category.trim();
    if (!categories.some(c => c.toLowerCase() === normalizedCategory.toLowerCase())) {
      categories.push(normalizedCategory);
      await AsyncStorage.setItem('categories', JSON.stringify(categories));
      console.log('Category saved:', normalizedCategory);
    } else {
      console.log('Category already exists:', normalizedCategory);
    }
    return normalizedCategory;
  } catch (error) {
    console.error('Error saving category:', error);
    throw error;
  }
};

// Dashboard data
export const loadDashboardData = async () => {
  await ensureInit();
  try {
    const products = JSON.parse(await AsyncStorage.getItem('products') || '[]');
    const orders = JSON.parse(await AsyncStorage.getItem('orders') || '[]');

    const lowStockItems = products.filter(p => p.quantity <= p.lowStockThreshold).length;
    const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Processing').length;
    const totalRevenue = orders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, order) => sum + order.total, 0);

    return {
      totalProducts: products.length,
      lowStockItems,
      pendingOrders,
      revenue: totalRevenue,
    };
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    throw error;
  }
};

// Products CRUD
export const loadProducts = async () => {
  await ensureInit();
  try {
    const products = await AsyncStorage.getItem('products');
    return products ? JSON.parse(products) : [];
  } catch (error) {
    console.error('Error loading products:', error);
    throw error;
  }
};

export const getProduct = async (id) => {
  await ensureInit();
  try {
    const products = JSON.parse(await AsyncStorage.getItem('products') || '[]');
    const product = products.find(p => p.id === id);
    if (!product) throw new Error('Product not found');
    return product;
  } catch (error) {
    console.error('Error getting product:', error);
    throw error;
  }
};

export const saveProduct = async (product) => {
  await ensureInit();
  try {
    const products = JSON.parse(await AsyncStorage.getItem('products') || '[]');

    if (product.id) {
      const index = products.findIndex(p => p.id === product.id);
      if (index !== -1) {
        products[index] = product;
      } else {
        throw new Error('Product not found');
      }
    } else {
      product.id = Date.now().toString();
      products.push(product);
    }

    await AsyncStorage.setItem('products', JSON.stringify(products));
    return product;
  } catch (error) {
    console.error('Error saving product:', error);
    throw error;
  }
};

export const deleteProduct = async (id) => {
  await ensureInit();
  try {
    const products = JSON.parse(await AsyncStorage.getItem('products') || '[]');
    const updatedProducts = products.filter(p => p.id !== id);

    await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// Orders CRUD
export const loadOrders = async () => {
  await ensureInit();
  try {
    const orders = await AsyncStorage.getItem('orders');
    return orders ? JSON.parse(orders) : [];
  } catch (error) {
    console.error('Error loading orders:', error);
    throw error;
  }
};

export const getOrder = async (id) => {
  await ensureInit();
  try {
    const orders = JSON.parse(await AsyncStorage.getItem('orders') || '[]');
    const order = orders.find(o => o.id === id);
    if (!order) throw new Error('Order not found');
    return order;
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
};

export const saveOrder = async (order) => {
  await ensureInit();
  try {
    const orders = JSON.parse(await AsyncStorage.getItem('orders') || '[]');

    if (order.id) {
      const index = orders.findIndex(o => o.id === order.id);
      if (index !== -1) {
        orders[index] = order;
      } else {
        throw new Error('Order not found');
      }
    } else {
      order.id = Date.now().toString();
      orders.push(order);
    }

    await AsyncStorage.setItem('orders', JSON.stringify(orders));
    return order;
  } catch (error) {
    console.error('Error saving order:', error);
    throw error;
  }
};

export const deleteOrder = async (id) => {
  await ensureInit();
  try {
    const orders = JSON.parse(await AsyncStorage.getItem('orders') || '[]');
    const updatedOrders = orders.filter(o => o.id !== id);

    await AsyncStorage.setItem('orders', JSON.stringify(updatedOrders));
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
};

// User profile
export const getUserProfile = async () => {
  await ensureInit();
  try {
    const profile = await AsyncStorage.getItem('profile');
    return profile ? JSON.parse(profile) : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (profileData) => {
  await ensureInit();
  try {
    const currentProfile = JSON.parse(await AsyncStorage.getItem('profile') || '{}');
    const updatedProfile = { ...currentProfile, ...profileData };

    await AsyncStorage.setItem('profile', JSON.stringify(updatedProfile));
    return updatedProfile;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Update order status
export const updateOrderStatus = async (orderId, newStatus) => {
  await ensureInit();
  const validStatuses = ['Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  try {
    const orders = JSON.parse(await AsyncStorage.getItem('orders') || '[]');
    const index = orders.findIndex(o => o.id === orderId);
    if (index === -1) {
      throw new Error('Order not found');
    }
    orders[index] = { ...orders[index], status: newStatus };
    await AsyncStorage.setItem('orders', JSON.stringify(orders));
    return orders[index];
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};