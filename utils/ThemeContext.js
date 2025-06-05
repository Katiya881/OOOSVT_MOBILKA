import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

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
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ isDarkTheme, toggleTheme, loadTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};