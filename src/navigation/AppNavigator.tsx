import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import MainScreen from '../screens/MainScreen';
import ChatScreen from '../screens/ChatScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ContactsScreen from '../screens/ContactsScreen';
import CreateStatusScreen from '../screens/CreateStatusScreen';
import ViewStatusScreen from '../screens/ViewStatusScreen';
import AddContactScreen from '../screens/AddContactScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import SecurityPrivacyScreen from '../screens/SecurityPrivacyScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import GroupDetailsScreen from '../screens/GroupDetailsScreen';
import GroupInfoScreen from '../screens/GroupInfoScreen';
import AddParticipantsToGroupScreen from '../screens/AddParticipantsToGroupScreen';
import HelpdeskScreen from '../screens/HelpdeskScreen';
import UpdateScreen from '../screens/UpdateScreen';
import LegalAcceptanceScreen from '../screens/LegalAcceptanceScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import BusinessRegistrationScreen from '../screens/BusinessRegistrationScreen';
import BusinessDashboardScreen from '../screens/BusinessDashboardScreen';
import BusinessPublicProfileScreen from '../screens/BusinessPublicProfileScreen';
import { useTheme } from '../context/ThemeContext';
import { DefaultTheme, DarkTheme } from '@react-navigation/native';
import socketService from '../services/socket.service';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { isDark, colors: themeColors } = useTheme();
  const navRef = useRef<any>(null);

  // Thème personnalisé pour React Navigation
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: themeColors.primary,
      background: themeColors.background,
      card: themeColors.surface,
      text: themeColors.text.primary,
      border: themeColors.border,
      notification: themeColors.primary,
    },
  };

  useEffect(() => {
    const onLegalUpdate = (data: any) => {
      console.log('AppNavigator: Received legal_update', data);
      if (!data || !navRef.current) return;

      // On déclenche l'affichage si force_acceptance est vrai (on accepte "true" ou true)
      const isForced = data.force_acceptance === true || data.force_acceptance === 'true';
      if (!isForced) return;
      
      setTimeout(() => {
        try {
          console.log('AppNavigator: Attempting reset to LegalAcceptance');
          if (navRef.current?.isReady?.()) {
            navRef.current.reset({
              index: 0,
              routes: [{
                name: 'LegalAcceptance',
                params: {
                  documents: [{
                    type: data.type,
                    content: data.content,
                    version: data.version,
                    force_acceptance: true
                  }]
                }
              }]
            });
          } else {
            console.warn('AppNavigator: Navigation not ready for legal reset');
          }
        } catch (err) {
          console.error('Navigation to LegalAcceptance failed:', err);
          // Fallback vers Login
          try {
            navRef.current?.reset({
              index: 0,
              routes: [{ name: 'Login' }]
            });
          } catch (fallbackErr) {
            console.error('Fallback navigation also failed:', fallbackErr);
          }
        }
      }, 100);
    };

    const onAppConfigUpdate = (data: any) => {
      if (!data || !navRef.current) return;

      // On vérifie si la version actuelle est plus ancienne
      const isVersionGreaterOrEqual = (v1: string, v2: string) => {
        if (!v1 || !v2) return false;
        const p1 = v1.split('.').map(Number);
        const p2 = v2.split('.').map(Number);
        for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
          const num1 = p1[i] || 0;
          const num2 = p2[i] || 0;
          if (num1 > num2) return true;
          if (num1 < num2) return false;
        }
        return true;
      };

      const APP_VERSION_CURRENT = '32.0.0';

      if (!isVersionGreaterOrEqual(APP_VERSION_CURRENT, data.current_version)) {
        setTimeout(() => {
          try {
            if (navRef.current?.isReady?.()) {
              navRef.current.navigate('Update', {
                updateUrl: data.update_url,
                releaseNotes: data.release_notes,
                forceUpdate: data.force_update,
                latestVersion: data.current_version,
              });
            }
          } catch (err) {
            console.error('Real-time update navigation failed:', err);
          }
        }, 100);
      }
    };

    // Listen for updates
    socketService.on('legal_update', onLegalUpdate);
    socketService.on('app_config_update', onAppConfigUpdate);

    return () => {
      socketService.off('legal_update', onLegalUpdate);
      socketService.off('app_config_update', onAppConfigUpdate);
    };
  }, []);

  return (
    <NavigationContainer ref={navRef} theme={navigationTheme}>
      <Stack.Navigator initialRouteName="Splash">
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Update"
          component={UpdateScreen}
          options={{ headerShown: false, presentation: 'transparentModal' }}
        />
        <Stack.Screen
          name="LegalAcceptance"
          component={LegalAcceptanceScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Signup" 
          component={SignupScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ForgotPassword" 
          component={ForgotPasswordScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ChatList" 
          component={MainScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={{ headerTitle: 'Paramètres' }}
        />
        <Stack.Screen
          name="Contacts"
          component={ContactsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CreateStatus"
          component={CreateStatusScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ViewStatus"
          component={ViewStatusScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddContact"
          component={AddContactScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SecurityPrivacy"
          component={SecurityPrivacyScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CreateGroup"
          component={CreateGroupScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="GroupDetails"
          component={GroupDetailsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="GroupInfo"
          component={GroupInfoScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddParticipantsToGroup"
          component={AddParticipantsToGroupScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Helpdesk"
          component={HelpdeskScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="UserProfile"
          component={UserProfileScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BusinessRegistration"
          component={BusinessRegistrationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BusinessDashboard"
          component={BusinessDashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BusinessPublicProfile"
          component={BusinessPublicProfileScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
