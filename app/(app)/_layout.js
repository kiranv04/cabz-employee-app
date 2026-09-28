import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import LoadingScreen from '../../src/components/LoadingScreen';
import BiometricLockScreen from '../../src/components/BiometricLockScreen';
import BrandHeader from '../../src/components/BrandHeader';
import { colors } from '../../src/constants/colors';
import { useProfileSync } from '../../src/hooks/useProfileSync';

export default function AppLayout() {
  const { isAuthenticated, isLoading, biometricLocked } = useAuth();
  useProfileSync();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (biometricLocked) return <BiometricLockScreen />;

  return (
    <Tabs
      screenOptions={{
        // SmartCabz logo bar on every tab screen (Features Item 34).
        headerShown: true,
        header: () => <BrandHeader />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray500,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.gray200,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="book-cab"
        options={{
          title: 'Book',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="track/[id]"
        options={{ href: null }} // hidden from tab bar
      />
      <Tabs.Screen
        name="trip/[id]"
        options={{ href: null }} // hidden from tab bar
      />
    </Tabs>
  );
}