import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#C5A46D',
      tabBarInactiveTintColor: '#8390A0',
      tabBarStyle: {
        backgroundColor: '#101D2D',
        borderTopColor: '#26364A',
        height: 82,
        paddingTop: 10,
        paddingBottom: 22,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Explore',
        tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="stays" options={{
        title: 'Stays',
        tabBarIcon: ({ color, size }) => <Ionicons name="bed-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="bookings" options={{
        title: 'Bookings',
        tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="partner" options={{
        title: 'Partner',
        tabBarIcon: ({ color, size }) => <Ionicons name="business-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="account" options={{
        title: 'Account',
        tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
