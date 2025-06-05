import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Switch,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Bell, ChevronRight, CircleHelp, LogOut, Settings, ShieldCheck } from 'lucide-react-native';
import { getUserProfile } from '@/utils/dataService';

export default function ProfileScreen() {
  const [userProfile, setUserProfile] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isSupportModalVisible, setIsSupportModalVisible] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Temporary function to update profile in AsyncStorage (remove after running once)
  const updateProfile = async () => {
    try {
      const updatedProfile = {
        id: '1',
        name: 'Никита Бойко',
        email: 'Nikita.boiko@gmail.com',
        role: 'Складской работник',
        department: 'stv',
        avatarUrl: 'https://via.placeholder.com/64x64.png?text=NB',
      };
      await AsyncStorage.setItem('profile', JSON.stringify(updatedProfile));
      console.log('Profile updated in AsyncStorage:', updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  useEffect(() => {
    async function initialize() {
      try {
        // Run temporary profile update (remove after first run)
        await updateProfile();

        const profile = await getUserProfile();
        console.log('Loaded profile:', profile); // Debug log
        setUserProfile(profile);
        const savedTheme = await AsyncStorage.getItem('theme');
        const now = new Date();
        const hours = now.getHours();
        // Автоматическая темная тема с 18:00 до 6:00
        const autoDarkTheme = hours >= 18 || hours < 6;
        if (savedTheme) {
          setIsDarkTheme(savedTheme === 'dark');
        } else {
          setIsDarkTheme(autoDarkTheme);
          await AsyncStorage.setItem('theme', autoDarkTheme ? 'dark' : 'light');
        }
      } catch (error) {
        console.error('Ошибка загрузки профиля или темы:', error);
      }
    }
    initialize();
  }, []);

  const toggleTheme = async () => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const handleSendSupportMessage = async () => {
    if (!supportMessage.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, введите сообщение');
      return;
    }

    setIsSending(true);
    try {
      const TOKEN = '8193505029:AAHKMOB4N_BFSBSUW0dTmsi1VsikbxTtNB8';
      const CHAT_ID = '974254791';
      const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: supportMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка отправки сообщения');
      }

      const currentDate = new Date().toLocaleString('ru-RU', {
        timeZone: 'America/New_York',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      Alert.alert('Успех', `Сообщение отправлено в ${currentDate}.`);
      setSupportMessage('');
      setIsSupportModalVisible(false);
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      Alert.alert('Ошибка', 'Не удалось отправить сообщение. Проверьте токен и chat_id.');
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Выход', 'Выход из системы...');
  };

  if (!userProfile) {
    return (
      <SafeAreaView style={[styles.container, isDarkTheme ? styles.darkContainer : {}]}>
        <StatusBar style={isDarkTheme ? 'light' : 'auto'} />
        <View style={[styles.loadingContainer, isDarkTheme ? styles.darkContainer : {}]}>
          <Text style={[styles.loadingText, isDarkTheme ? styles.darkText : {}]}>
            Загрузка профиля...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkTheme ? styles.darkContainer : {}]}>
      <StatusBar style={isDarkTheme ? 'light' : 'auto'} />
      <View style={[styles.header, isDarkTheme ? styles.darkHeader : {}]}>
        <Text style={[styles.title, isDarkTheme ? styles.darkText : {}]}>Профиль</Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        <View style={[styles.profileCard, isDarkTheme ? styles.darkCard : {}]}>
          <Image
            source={{ uri: userProfile.avatarUrl || 'https://via.placeholder.com/64x64.png?text=NB' }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={[styles.name, isDarkTheme ? styles.darkText : {}]}>
              {userProfile.name || 'Неизвестный пользователь'}
            </Text>
            <Text style={[styles.role, isDarkTheme ? styles.darkSubtext : {}]}>
              {translateRole(userProfile.role)}
            </Text>
            <View style={styles.badgeContainer}>
              <View style={[styles.badge, isDarkTheme ? styles.darkBadge : {}]}>
                <Text style={[styles.badgeText, isDarkTheme ? styles.darkBadgeText : {}]}>
                  {userProfile.department}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.sectionContainer, isDarkTheme ? styles.darkCard : {}]}>
          <Text style={[styles.sectionTitle, isDarkTheme ? styles.darkSubtext : {}]}>
            Аккаунт
          </Text>

          <Pressable style={styles.optionItem} onPress={toggleTheme}>
            <View style={[styles.optionIconContainer, isDarkTheme ? styles.darkIconContainer : {}]}>
              <Settings size={20} color={isDarkTheme ? '#60A5FA' : '#3B82F6'} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionText, isDarkTheme ? styles.darkText : {}]}>
                Смена темы
              </Text>
            </View>
            <Switch
              value={isDarkTheme}
              onValueChange={toggleTheme}
              trackColor={{ false: isDarkTheme ? '#4B5563' : '#E2E8F0', true: isDarkTheme ? '#93C5FD' : '#BFDBFE' }}
              thumbColor={isDarkTheme ? '#60A5FA' : '#3B82F6'}
            />
          </Pressable>

          <Pressable style={styles.optionItem}>
            <View style={[styles.optionIconContainer, isDarkTheme ? styles.darkIconContainer : {}]}>
              <ShieldCheck size={20} color={isDarkTheme ? '#A78BFA' : '#8B5CF6'} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionText, isDarkTheme ? styles.darkText : {}]}>
                Конфиденциальность и безопасность
              </Text>
            </View>
            <ChevronRight size={20} color={isDarkTheme ? '#A3BFFA' : '#94A3B8'} />
          </Pressable>

          <View style={styles.optionItem}>
            <View style={[styles.optionIconContainer, isDarkTheme ? styles.darkIconContainer : {}]}>
              <Bell size={20} color={isDarkTheme ? '#FBBF24' : '#F59E0B'} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionText, isDarkTheme ? styles.darkText : {}]}>
                Уведомления
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: isDarkTheme ? '#4B5563' : '#E2E8F0', true: isDarkTheme ? '#93C5FD' : '#BFDBFE' }}
              thumbColor={notificationsEnabled ? (isDarkTheme ? '#60A5FA' : '#3B82F6') : (isDarkTheme ? '#6B7280' : '#94A3B8')}
            />
          </View>
        </View>

        <View style={[styles.sectionContainer, isDarkTheme ? styles.darkCard : {}]}>
          <Text style={[styles.sectionTitle, isDarkTheme ? styles.darkSubtext : {}]}>
            Поддержка
          </Text>

          <Pressable
            style={styles.optionItem}
            onPress={() => setIsSupportModalVisible(true)}
          >
            <View style={[styles.optionIconContainer, isDarkTheme ? styles.darkIconContainer : {}]}>
              <CircleHelp size={20} color={isDarkTheme ? '#34D399' : '#10B981'} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionText, isDarkTheme ? styles.darkText : {}]}>
                Помощь и поддержка
              </Text>
            </View>
            <ChevronRight size={20} color={isDarkTheme ? '#A3BFFA' : '#94A3B8'} />
          </Pressable>
        </View>

        <Pressable style={[styles.logoutButton, isDarkTheme ? styles.darkLogoutButton : {}]} onPress={handleLogout}>
          <LogOut size={20} color={isDarkTheme ? '#F87171' : '#EF4444'} />
          <Text style={[styles.logoutText, isDarkTheme ? styles.darkLogoutText : {}]}>
            Выйти
          </Text>
        </Pressable>

        <Text style={[styles.versionText, isDarkTheme ? styles.darkSubtext : {}]}>
          Версия 1.0.0
        </Text>
      </ScrollView>

      {/* Модальное окно для помощи и поддержки */}
      <Modal
        visible={isSupportModalVisible}
        animationType="slide"
        onRequestClose={() => setIsSupportModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, isDarkTheme ? styles.darkContainer : {}]}>
          <View style={[styles.modalHeader, isDarkTheme ? styles.darkHeader : {}]}>
            <Text style={[styles.modalTitle, isDarkTheme ? styles.darkText : {}]}>
              Помощь и поддержка
            </Text>
            <Pressable onPress={() => setIsSupportModalVisible(false)}>
              <Text style={[styles.modalCloseText, isDarkTheme ? styles.darkText : {}]}>
                Закрыть
              </Text>
            </Pressable>
          </View>
          <View style={[styles.modalContent, isDarkTheme ? styles.darkCard : {}]}>
            <Text style={[styles.supportLabel, isDarkTheme ? styles.darkText : {}]}>
              Ваше сообщение
            </Text>
            <TextInput
              style={[styles.supportInput, isDarkTheme ? styles.darkInput : {}]}
              multiline
              numberOfLines={5}
              placeholder="Опишите вашу проблему..."
              placeholderTextColor={isDarkTheme ? '#A3BFFA' : '#94A3B8'}
              value={supportMessage}
              onChangeText={setSupportMessage}
            />
            <Pressable
              style={[styles.sendButton, isSending ? styles.disabledButton : {}, isDarkTheme ? { backgroundColor: isSending ? '#93C5FD' : '#60A5FA' } : {}]}
              onPress={handleSendSupportMessage}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendButtonText}>Отправить</Text>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function translateRole(role) {
  const roleTranslations = {
    Admin: 'Администратор',
    Manager: 'Менеджер',
    Employee: 'Сотрудник',
    Owner: 'Владелец',
  };
  return roleTranslations[role] || role;
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
  scrollContainer: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  darkCard: {
    backgroundColor: '#374151',
    shadowColor: '#000',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E2E8F0',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  darkSubtext: {
    color: '#A3BFFA',
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  badge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  darkBadge: {
    backgroundColor: '#4B5563',
  },
  badgeText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  darkBadgeText: {
    color: '#60A5FA',
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  darkIconContainer: {
    backgroundColor: '#4B5563',
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: '#1E293B',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  darkLogoutButton: {
    backgroundColor: '#4B5563',
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  darkLogoutText: {
    color: '#F87171',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
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
  supportInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  darkInput: {
    borderColor: '#4B5563',
    backgroundColor: '#4B5563',
    color: '#F3F4F6',
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#93C5FD',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});