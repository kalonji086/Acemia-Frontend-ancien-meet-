import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import MainScreen from '../screens/MainScreen';
import ChatScreen from '../screens/ChatScreen';
import AudioCallScreen from '../screens/AudioCallScreen';
import VideoCallScreen from '../screens/VideoCallScreen';
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
import HelpdeskScreen from '../screens/HelpdeskScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash">
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
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
          name="AudioCall"
          component={AudioCallScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="VideoCall"
          component={VideoCallScreen}
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
          name="Helpdesk"
          component={HelpdeskScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
