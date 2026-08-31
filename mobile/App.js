import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Users, Contact, Bot } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { DashboardScreen } from './src/screens/DashboardScreen';
import { LeadsScreen } from './src/screens/LeadsScreen';
import { ContactsScreen } from './src/screens/ContactsScreen';
import { AgentScreen } from './src/screens/AgentScreen';
import { colors } from './src/theme/colors';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          'rgba(59, 130, 246, 0.15)',
          colors.background,
          'rgba(16, 185, 129, 0.1)'
        ]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.15, y: 0.5 }}
        end={{ x: 0.85, y: 0.3 }}
      />
      
      <NavigationContainer theme={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: colors.primary,
          background: 'transparent',
          card: colors.surfaceSolid,
          text: colors.textPrimary,
          border: colors.border,
          notification: colors.danger,
        }
      }}>
        <Tab.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.surfaceSolid,
              borderBottomColor: colors.border,
              borderBottomWidth: 1,
            },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: {
              fontWeight: '600',
            },
            tabBarStyle: {
              backgroundColor: colors.surfaceSolid,
              borderTopColor: colors.border,
              borderTopWidth: 1,
              paddingBottom: 5,
              height: 60,
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textSecondary,
          }}
        >
          <Tab.Screen 
            name="Dashboard" 
            component={DashboardScreen} 
            options={{
              headerShown: false,
              tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />
            }}
          />
          <Tab.Screen 
            name="Leads" 
            component={LeadsScreen} 
            options={{
              headerShown: false,
              tabBarIcon: ({ color, size }) => <Users color={color} size={size} />
            }}
          />
          <Tab.Screen 
            name="Contacts" 
            component={ContactsScreen} 
            options={{
              headerShown: false,
              tabBarIcon: ({ color, size }) => <Contact color={color} size={size} />
            }}
          />
          <Tab.Screen 
            name="AI Agent" 
            component={AgentScreen} 
            options={{
              headerShown: false,
              tabBarIcon: ({ color, size }) => <Bot color={color} size={size} />
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
