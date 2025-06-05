import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { initDatabase } from '@/utils/dataService';

export default function Index() {
  useEffect(() => {
    // Initialize the database when the app starts
    initDatabase();
  }, []);

  // Redirect to the dashboard tab
  return <Redirect href="/(tabs)" />;
}