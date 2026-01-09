import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { t } = useTranslation();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ffb300',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#333333',
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 30,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#0a0a0a',
          borderBottomColor: '#333333',
          borderBottomWidth: 1,
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('tabs.metrics'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: t('tabs.train'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: t('tabs.nutrition'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      
      {/* Ocultar pantallas del tab bar */}
      <Tabs.Screen
        name="dashboard"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      
      {/* Ocultar pantallas adicionales del tab bar */}
      <Tabs.Screen
        name="steps-detail"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="distance-detail"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="calories-detail"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="exercise-detail"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="tracking-screen"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="workout-generator"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="workout-plan-detail"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="workout-day-detail"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="progress-photos"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="register-weight"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="workout/custom-plan-setup"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="workout/custom-plan-days"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="workout/custom-plan-day-detail"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="workout/custom-plan-select-exercise"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
