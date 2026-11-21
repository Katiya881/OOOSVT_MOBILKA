import React, { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
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
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);
  const [isPrivacySubModalVisible, setIsPrivacySubModalVisible] = useState(false);
  const [selectedSection, setSelectedSection] = useState('');
  const [messages, setMessages] = useState([]);
  const scrollViewRef = useRef(null);

  const updateProfile = async () => {
    try {
      const updatedProfile = {
        id: '1',
        name: 'Никита Бойко',
        email: 'Nikita.boiko@gmail.com',
        role: 'Складской работник',
        department: 'svt',
        avatarUrl: 'https://via.placeholder.com/64x64.png?text=NB',
      };
      await AsyncStorage.setItem('profile', JSON.stringify(updatedProfile));
      console.log('Profile updated in AsyncStorage:', updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const fetchOperatorMessages = async () => {
    try {
      const TOKEN = '8193505029:AAHKMOB4N_BFSBSUW0dTmsi1VsikbxTtNB8';
      const lastUpdateId = await AsyncStorage.getItem('lastUpdateId');
      const url = `https://api.telegram.org/bot${TOKEN}/getUpdates${lastUpdateId ? `?offset=${parseInt(lastUpdateId) + 1}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(`API Error: ${data.description || 'Unknown error'}`);
      }

      if (!data.result || !Array.isArray(data.result)) {
        throw new Error('Invalid response format');
      }

      const CHAT_ID = '974254791';
      const newMessages = data.result
        .filter(update => update.message && update.message.chat.id.toString() === CHAT_ID)
        .map(update => ({
          id: update.message.message_id,
          text: update.message.text,
          date: new Date(update.message.date * 1000).toLocaleString('ru-RU', {
            timeZone: 'America/New_York',
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
          sender: 'operator',
        }));

      if (newMessages.length > 0) {
        const latestUpdateId = data.result[data.result.length - 1].update_id;
        await AsyncStorage.setItem('lastUpdateId', latestUpdateId.toString());
        setMessages(prevMessages => [...prevMessages, ...newMessages]);
      }
    } catch (error) {
      console.error('Ошибка получения сообщений:', error.message);
      Alert.alert('Ошибка', 'Не удалось загрузить сообщения от оператора. Проверьте подключение или токен.');
    }
  };

  useEffect(() => {
    async function initialize() {
      try {
        await updateProfile();
        const profile = await getUserProfile();
        console.log('Loaded profile:', profile);
        setUserProfile(profile);
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
        console.error('Ошибка загрузки профиля или темы:', error);
      }
    }
    initialize();
  }, []);

  useEffect(() => {
    let interval;
    if (isSupportModalVisible) {
      fetchOperatorMessages();
      interval = setInterval(fetchOperatorMessages, 3000);
    }
    return () => clearInterval(interval);
  }, [isSupportModalVisible]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: supportMessage }),
      });
      if (!response.ok) throw new Error('Ошибка отправки сообщения');
      const currentDate = new Date().toLocaleString('ru-RU', {
        timeZone: 'America/New_York',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: Date.now().toString(),
          text: supportMessage,
          date: currentDate,
          sender: 'worker',
        },
      ]);
      Alert.alert('Успех', `Сообщение отправлено в ${currentDate}.`);
      setSupportMessage('');
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
          <Pressable style={styles.optionItem} onPress={() => setIsPrivacyModalVisible(true)}>
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
          <Pressable style={styles.optionItem} onPress={() => setIsSupportModalVisible(true)}>
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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
          >
            <View style={[styles.modalContent, isDarkTheme ? styles.darkCard : {}]}>
              <Text style={[styles.supportLabel, isDarkTheme ? styles.darkText : {}]}>
                Сообщения
              </Text>
              <ScrollView
                style={styles.messagesContainer}
                contentContainerStyle={{ paddingBottom: 16 }}
                ref={scrollViewRef}
              >
                {messages.length === 0 ? (
                  <Text style={[styles.noMessagesText, isDarkTheme ? styles.darkSubtext : {}]}>
                    Нет сообщений
                  </Text>
                ) : (
                  messages.map(message => (
                    <View
                      key={message.id}
                      style={[
                        styles.messageBubble,
                        message.sender === 'operator' ? styles.operatorMessageBubble : styles.workerMessageBubble,
                        isDarkTheme ? styles.darkMessageBubble : {},
                      ]}
                    >
                      <Text style={[styles.messageText, isDarkTheme ? styles.darkText : {}]}>
                        {message.text}
                      </Text>
                      <Text style={[styles.messageDate, isDarkTheme ? styles.darkSubtext : {}]}>
                        {message.date}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
              <View style={styles.inputContainer}>
                <Text style={[styles.supportLabel, isDarkTheme ? styles.darkText : {}]}>
                  Ваше сообщение
                </Text>
                <TextInput
                  style={[styles.supportInput, isDarkTheme ? styles.darkInput : {}]}
                  multiline
                  numberOfLines={4}
                  placeholder="Опишите вашу проблему..."
                  placeholderTextColor={isDarkTheme ? '#A3BFFA' : '#94A3B8'}
                  value={supportMessage}
                  onChangeText={setSupportMessage}
                />
                <Pressable
                  style={[
                    styles.sendButton,
                    isSending ? styles.disabledButton : {},
                    isDarkTheme ? { backgroundColor: isSending ? '#93C5FD' : '#60A5FA' } : {},
                  ]}
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
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={isPrivacyModalVisible}
        animationType="slide"
        onRequestClose={() => setIsPrivacyModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, isDarkTheme ? styles.darkContainer : {}]}>
          <View style={[styles.modalHeader, isDarkTheme ? styles.darkHeader : {}]}>
            <Text style={[styles.modalTitle, isDarkTheme ? styles.darkText : {}]}>
              Конфиденциальность и безопасность
            </Text>
            <Pressable onPress={() => setIsPrivacyModalVisible(false)}>
              <Text style={[styles.modalCloseText, isDarkTheme ? styles.darkText : {}]}>
                Закрыть
              </Text>
            </Pressable>
          </View>
          <View style={[styles.modalContent, styles.compactModal, isDarkTheme ? styles.darkCard : {}]}>
            <Pressable
              style={[styles.subSection, isDarkTheme ? styles.darkSubSection : {}]}
              onPress={() => {
                setSelectedSection('privacy');
                setIsPrivacySubModalVisible(true);
              }}
            >
              <Text style={[styles.subSectionText, isDarkTheme ? styles.darkText : {}]}>
                Управление конфиденциальностью
              </Text>
            </Pressable>
            <Pressable
              style={[styles.subSection, isDarkTheme ? styles.darkSubSection : {}]}
              onPress={() => {
                setSelectedSection('password');
                setIsPrivacySubModalVisible(true);
              }}
            >
              <Text style={[styles.subSectionText, isDarkTheme ? styles.darkText : {}]}>
                Смена пароля
              </Text>
            </Pressable>
            <Pressable
              style={[styles.subSection, isDarkTheme ? styles.darkSubSection : {}]}
              onPress={() => {
                setSelectedSection('data');
                setIsPrivacySubModalVisible(true);
              }}
            >
              <Text style={[styles.subSectionText, isDarkTheme ? styles.darkText : {}]}>
                Управление данными
              </Text>
            </Pressable>
            <Pressable
              style={[styles.subSection, isDarkTheme ? styles.darkSubSection : {}]}
              onPress={() => {
                setSelectedSection('login');
                setIsPrivacySubModalVisible(true);
              }}
            >
              <Text style={[styles.subSectionText, isDarkTheme ? styles.darkText : {}]}>
                Двухфакторная аутентификация
              </Text>
            </Pressable>
            <Pressable
              style={[styles.subSection, isDarkTheme ? styles.darkSubSection : {}]}
              onPress={() => {
                setSelectedSection('backup');
                setIsPrivacySubModalVisible(true);
              }}
            >
              <Text style={[styles.subSectionText, isDarkTheme ? styles.darkText : {}]}>
                Резервное копирование
              </Text>
            </Pressable>
            <Pressable
              style={[styles.subSection, isDarkTheme ? styles.darkSubSection : {}]}
              onPress={() => {
                setSelectedSection('warehouseSafety');
                setIsPrivacySubModalVisible(true);
              }}
            >
              <Text style={[styles.subSectionText, isDarkTheme ? styles.darkText : {}]}>
                Безопасность на складе
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={isPrivacySubModalVisible}
        animationType="slide"
        onRequestClose={() => setIsPrivacySubModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, isDarkTheme ? styles.darkContainer : {}]}>
          <View style={[styles.modalHeader, isDarkTheme ? styles.darkHeader : {}]}>
            <Text style={[styles.modalTitle, isDarkTheme ? styles.darkText : {}]}>
              {selectedSection === 'privacy' && 'Управление конфиденциальностью'}
              {selectedSection === 'password' && 'Смена пароля'}
              {selectedSection === 'data' && 'Управление данными'}
              {selectedSection === 'login' && 'Двухфакторная аутентификация'}
              {selectedSection === 'backup' && 'Резервное копирование'}
              {selectedSection === 'warehouseSafety' && 'Безопасность на складе'}
            </Text>
            <Pressable onPress={() => setIsPrivacySubModalVisible(false)}>
              <Text style={[styles.modalCloseText, isDarkTheme ? styles.darkText : {}]}>
                Закрыть
              </Text>
            </Pressable>
          </View>
          <ScrollView style={[styles.modalContent, styles.compactModal, isDarkTheme ? styles.darkCard : {}]}>
            <Text style={[styles.supportLabel, isDarkTheme ? styles.darkText : {}]}>
              {selectedSection === 'privacy' && (
                <>
                  Управляйте доступом к вашим данным, чтобы обеспечить конфиденциальность вашей информации. Вы можете настроить параметры, которые определяют, кто может видеть ваш профиль, активность и другую информацию.
                  {'\n\n'}
                  • **Настройка видимости профиля**: Выберите, кто может видеть ваш профиль (все, только коллеги, только администраторы).
                  {'\n'}
                  • **Контроль доступа к данным**: Ограничьте доступ к вашим данным, например, к истории активности или личной информации.
                  {'\n'}
                  • **Управление разрешениями**: Разрешите или запретите приложению доступ к определённым данным, таким как геолокация или контакты.
                  {'\n'}
                  • **Анонимность в отчётах**: Включите опцию анонимного участия в аналитических отчётах компании.
                  {'\n'}
                  • **История изменений**: Просмотрите, кто и когда получал доступ к вашим данным.
                  {'\n\n'}
                  Для изменения настроек конфиденциальности:
                  1. Перейдите в раздел "Конфиденциальность и безопасность".
                  2. Выберите "Управление конфиденциальностью".
                  3. Настройте параметры согласно вашим предпочтениям.
                  4. Сохраните изменения.
                </>
              )}
              {selectedSection === 'password' && (
                <>
                  Смена пароля позволяет повысить безопасность вашего аккаунта. Рекомендуется использовать сложный пароль, содержащий буквы, цифры и специальные символы.
                  {'\n\n'}
                  • **Требования к паролю**: Пароль должен содержать не менее 8 символов, включая заглавные и строчные буквы, цифры и специальные символы.
                  {'\n'}
                  • **Рекомендации**: Не используйте один и тот же пароль на других платформах. Обновляйте пароль каждые 3-6 месяцев.
                  {'\n'}
                  • **Восстановление пароля**: Если вы забыли пароль, используйте опцию восстановления через электронную почту.
                  {'\n'}
                  • **Безопасность**: Убедитесь, что вы находитесь в безопасной сети при смене пароля.
                  {'\n\n'}
                  Для смены пароля:
                  1. Перейдите в настройки аккаунта.
                  2. Выберите "Смена пароля".
                  3. Введите текущий пароль и новый пароль дважды.
                  4. Подтвердите изменения.
                </>
              )}
              {selectedSection === 'data' && (
                <>
                  Управление данными позволяет вам контролировать, какие данные хранятся в приложении, экспортировать их или удалить.
                  {'\n\n'}
                  • **Экспорт данных**: Скачайте копию всех ваших данных, включая профиль, историю активности и настройки.
                  {'\n'}
                  • **Удаление данных**: Удалите свои данные из приложения. Обратите внимание, что это действие необратимо.
                  {'\n'}
                  • **Выборочные данные**: Выберите, какие данные вы хотите удалить (например, только историю активности).
                  {'\n'}
                  • **Соответствие нормам**: Все действия с данными соответствуют международным стандартам конфиденциальности, таким как GDPR.
                  {'\n'}
                  • **История запросов**: Просмотрите историю ваших запросов на экспорт или удаление данных.
                  {'\n\n'}
                  Для управления данными:
                  1. Зайдите в раздел "Конфиденциальность".
                  2. Выберите "Управление данными".
                  3. Выполните действие (удаление/экспорт).
                </>
              )}
              {selectedSection === 'login' && (
                <>
                  Двухфакторная аутентификация (2FA) добавляет дополнительный уровень безопасности к вашему аккаунту, требуя второй фактор подтверждения при входе.
                  {'\n\n'}
                  • **Методы 2FA**: Используйте приложение-аутентификатор (например, Google Authenticator, Authy) или SMS-коды.
                  {'\n'}
                  • **Настройка**: Сканируйте QR-код в приложении-аутентификаторе для привязки вашего аккаунта.
                  {'\n'}
                  • **Резервные коды**: Сохраните резервные коды на случай утраты доступа к устройству.
                  {'\n'}
                  • **Безопасность**: 2FA предотвращает несанкционированный доступ, даже если ваш пароль скомпрометирован.
                  {'\n'}
                  • **Отключение 2FA**: Для отключения потребуется подтверждение личности.
                  {'\n\n'}
                  Для включения двухфакторной аутентификации:
                  1. Перейдите в "Безопасность".
                  2. Активируйте 2FA.
                  3. Используйте код из приложения-аутентификатора.
                </>
              )}
              {selectedSection === 'backup' && (
                <>
                  Резервное копирование позволяет сохранить ваши данные на устройстве или в облаке для их восстановления в случае необходимости.
                  {'\n\n'}
                  • **Локальное копирование**: Сохраните данные на вашем устройстве в зашифрованном виде.
                  {'\n'}
                  • **Облачное копирование**: Используйте безопасное облачное хранилище для резервных копий.
                  {'\n'}
                  • **Автоматическое копирование**: Настройте регулярное создание резервных копий.
                  {'\n'}
                  • **Шифрование**: Все резервные копии защищены 256-битным шифрованием AES.
                  {'\n'}
                  • **Восстановление**: Восстановите данные из резервной копии в случае сбоя приложения или смены устройства.
                  {'\n\n'}
                  Для создания резервной копии:
                  1. Откройте "Конфиденциальность".
                  2. Выберите "Резервное копирование".
                  3. Сохраните данные на устройство или в облако.
                </>
              )}
              {selectedSection === 'warehouseSafety' && (
                <>
                  Соблюдение правил безопасности на складе критически важно для предотвращения аварий и обеспечения безопасности всех сотрудников. Ознакомьтесь с рекомендациями по поведению в рабочей среде и действиями в случае чрезвычайных ситуаций.
                  {'\n\n'}
                  • **Общие правила безопасности**:
                  {'\n'}
                  - Носите соответствующую защитную экипировку: каску, защитные очки, перчатки и обувь с нескользящей подошвой.
                  {'\n'}
                  - Соблюдайте правила работы с техникой: используйте погрузчики и штабелёры только при наличии соответствующего обучения.
                  {'\n'}
                  - Держите рабочие зоны свободными от препятствий: убирайте пролитые вещества и мусор немедленно.
                  {'\n'}
                  - Следуйте указаниям по максимальной нагрузке стеллажей и не перегружайте их.
                  {'\n'}
                  - Пройдите обучение по технике безопасности и регулярно обновляйте свои знания.
                  {'\n\n'}
                  • **Действия в случае пожара**:
                  {'\n'}
                  - Немедленно активируйте пожарную сигнализацию, если она не сработала автоматически.
                  {'\n'}
                  - Сообщите о пожаре руководителю или ответственному за безопасность.
                  {'\n'}
                  - Используйте огнетушитель только в случае, если вы обучены и пожар небольшой.
                  {'\n'}
                  - Следуйте указанным путям эвакуации и не используйте лифты.
                  {'\n'}
                  - Сбор на заранее обозначенной точке эвакуации и дождитесь проверки.
                  {'\n\n'}
                  • **Действия при разливе химических веществ**:
                  {'\n'}
                  - Немедленно изолируйте зону разлива, используя предупреждающие знаки или барьеры.
                  {'\n'}
                  - Наденьте соответствующее защитное снаряжение (маска, перчатки, костюм).
                  {'\n'}
                  - Используйте абсорбирующие материалы для нейтрализации разлива, если это безопасно.
                  {'\n'}
                  - Сообщите о разливе ответственному лицу и следуйте их инструкциям.
                  {'\n'}
                  - Не пытайтесь устранить разлив самостоятельно, если не уверены в безопасности.
                  {'\n\n'}
                  • **Действия при травмах**:
                  {'\n'}
                  - Немедленно окажите первую помощь пострадавшему, если вы обучены.
                  {'\n'}
                  - Вызовите медицинскую помощь через внутреннюю систему или по номеру экстренной службы.
                  {'\n'}
                  - Сообщите о происшествии руководителю и заполните отчёт о травме.
                  {'\n'}
                  - Не перемещайте пострадавшего, если есть риск усугубления травмы.
                  {'\n'}
                  - Обеспечьте доступ для медицинских служб к месту происшествия.
                  {'\n\n'}
                  • **Эвакуация при чрезвычайной ситуации**:
                  {'\n'}
                  - Ознакомьтесь с планом эвакуации склада и расположением аварийных выходов.
                  {'\n'}
                  - Следуйте указателям и не возвращайтесь за личными вещами.
                  {'\n'}
                  - Помогайте коллегам, если это безопасно, особенно лицам с ограниченными возможностями.
                  {'\n'}
                  - После эвакуации оставайтесь на точке сбора до получения дальнейших инструкций.
                  {'\n'}
                  - Сообщайте руководству о любых пропавших сотрудниках.
                  {'\n\n'}
                  Для получения дополнительной информации:
                  1. Перейдите в раздел "Конфиденциальность и безопасность".
                  2. Выберите "Безопасность на складе".
                  3. Ознакомьтесь с инструкциями и обратитесь к ответственному за безопасность.
                </>
              )}
            </Text>
          </ScrollView>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  darkContainer: { backgroundColor: '#1F2937' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  darkHeader: { backgroundColor: '#374151', borderBottomColor: '#4B5563' },
  title: { fontSize: 28, fontWeight: '700', color: '#1E293B' },
  darkText: { color: '#F3F4F6' },
  scrollContainer: { flex: 1 },
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
  darkCard: { backgroundColor: '#374151', shadowColor: '#000' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E2E8F0' },
  profileInfo: { marginLeft: 16, flex: 1 },
  name: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  role: { fontSize: 14, color: '#64748B', marginBottom: 8 },
  darkSubtext: { color: '#A3BFFA' },
  badgeContainer: { flexDirection: 'row' },
  badge: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  darkBadge: { backgroundColor: '#4B5563' },
  badgeText: { fontSize: 12, color: '#3B82F6', fontWeight: '500' },
  darkBadgeText: { color: '#60A5FA' },
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
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#64748B', marginBottom: 16 },
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
  darkIconContainer: { backgroundColor: '#4B5563' },
  optionContent: { flex: 1 },
  optionText: { fontSize: 16, color: '#1E293B' },
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
  darkLogoutButton: { backgroundColor: '#4B5563' },
  logoutText: { marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#EF4444' },
  darkLogoutText: { color: '#F87171' },
  versionText: { textAlign: 'center', fontSize: 12, color: '#94A3B8', marginBottom: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#64748B' },
  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexWrap: 'wrap',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 10,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#3B82F6',
    padding: 10,
    textAlign: 'right',
  },
  modalContent: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  supportLabel: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
  supportInput: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  darkInput: { borderColor: '#4B5563', backgroundColor: '#4B5563', color: '#F3F4F6' },
  sendButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledButton: { backgroundColor: '#93C5FD' },
  sendButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  subSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  darkSubSection: { borderBottomColor: '#4B5563' },
  subSectionText: { fontSize: 16, color: '#1E293B' },
  messagesContainer: {
    flexGrow: 1,
    marginBottom: 16,
  },
  messageBubble: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    maxWidth: '80%',
  },
  operatorMessageBubble: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
  },
  workerMessageBubble: {
    backgroundColor: '#BFDBFE',
    alignSelf: 'flex-end',
  },
  darkMessageBubble: {
    backgroundColor: '#4B5563',
  },
  darkWorkerMessageBubble: {
    backgroundColor: '#60A5FA',
  },
  messageText: {
    fontSize: 14,
    color: '#1E293B',
  },
  messageDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'right',
  },
  noMessagesText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginVertical: 16,
  },
  inputContainer: {},
  compactModal: { flex: 1 },
});