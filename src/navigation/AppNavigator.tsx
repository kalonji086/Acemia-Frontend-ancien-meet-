import React, { useEffect, useRef } from 'react';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
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
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
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
import EmploiMainScreen from '../screens/EmploiMainScreen';
import EmployerRequestScreen from '../screens/EmployerRequestScreen';
import EmployerDashboardScreen from '../screens/EmployerDashboardScreen';
import NewEmployerDashboard from '../screens/NewEmployerDashboard';
import TalentSearchScreen from '../screens/TalentSearchScreen';
import JobDiscoveryScreen from '../screens/JobDiscoveryScreen';
import JobDetailsScreen from '../screens/JobDetailsScreen';
import CreateJobPostingScreen from '../screens/CreateJobPostingScreen';
import MyJobsScreen from '../screens/MyJobsScreen';
import EmployerPlanningScreen from '../screens/EmployerPlanningScreen';
import SchoolRequestScreen from '../screens/SchoolRequestScreen';
import SchoolDashboardScreen from '../screens/SchoolDashboardScreen';
import SchoolStudentsScreen from '../screens/SchoolStudentsScreen';
import SchoolScheduleScreen from '../screens/SchoolScheduleScreen';
import SchoolFeesScreen from '../screens/SchoolFeesScreen';
import SchoolAccountsScreen from '../screens/SchoolAccountsScreen';
import SchoolClassesScreen from '../screens/SchoolClassesScreen';
import SchoolLoginScreen from '../screens/SchoolLoginScreen';
import SchoolStaffDashboard from '../screens/SchoolStaffDashboard';
import StudentDashboard from '../screens/StudentDashboard';
import { useTheme } from '../context/ThemeContext';
import { DefaultTheme, DarkTheme } from '@react-navigation/native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    // S'assurer que le socket est initialisé dès le démarrage si on a un token
    const initSocketEarly = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        await socketService.initialize();
        await socketService.connect();
        await socketService.authenticate();
      }
    };
    initSocketEarly();

    const onLegalUpdate = async (data: any) => {
      console.log('AppNavigator: Received real-time legal_update', data);

      // On déclenche l'affichage si force_acceptance est vrai (on accepte "true" ou true)
      const isForced = data.force_acceptance === true || data.force_acceptance === 'true';
      if (!isForced) {
        console.log('AppNavigator: Legal update not forced, ignoring.');
        return;
      }

      // SÉCURITÉ : Vérifier si l'utilisateur a déjà cette version pour éviter les boucles
      // SAUF si c'est un broadcast explicite temps réel (isRealTime)
      try {
        const userString = await AsyncStorage.getItem('user');
        if (userString && !data.isRealTime) {
          const user = JSON.parse(userString);
          const currentVersion = data.type === 'privacy' ? user.accepted_privacy_version : user.accepted_tos_version;
          if (currentVersion === data.version) {
            console.log(`AppNavigator: Legal version ${data.version} already accepted, ignoring.`);
            return;
          }
        }
      } catch (e) { console.error('Error checking local version:', e); }

      // On attend un peu que navRef soit stable
      let attempts = 0;
      while (!navRef.current && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!navRef.current) return;

      const currentRoute = navRef.current.getCurrentRoute();
      if (currentRoute?.name === 'LegalAcceptance') return;

      console.log('AppNavigator: Forcing navigation to LegalAcceptance (REAL-TIME)');
      
      navRef.current.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{
            name: 'LegalAcceptance',
            params: {
              isRealTime: true,
              documents: [{
                type: data.type,
                content: data.content,
                version: data.version,
                force_acceptance: true
              }]
            }
          }]
        })
      );
    };

    const onAppConfigUpdate = (data: any) => {
      // ... same logic
    };

    const onLegalRemoved = (data: any) => {
      console.log('AppNavigator: Received legal_removed', data);
      // Si on est sur l'écran LegalAcceptance, on repart vers le Splash pour re-calculer la destination
      if (navRef.current?.getCurrentRoute()?.name === 'LegalAcceptance') {
        navRef.current.reset({
          index: 0,
          routes: [{ name: 'Splash' }]
        });
      }
    };

    // Listen for updates
    socketService.on('legal_update', onLegalUpdate);
    socketService.on('app_config_update', onAppConfigUpdate);
    socketService.on('legal_removed', onLegalRemoved);

    return () => {
      socketService.off('legal_update', onLegalUpdate);
      socketService.off('app_config_update', onAppConfigUpdate);
      socketService.off('legal_removed', onLegalRemoved);
    };
  }, []);

  // Configuration du Linking pour le Web (URLs propres)
  const linking = {
    prefixes: ['https://meetme.cd', 'meetme://'],
    config: {
      screens: {
        Splash: '',
        Login: 'login',
        Signup: 'signup',
        ForgotPassword: 'forgot-password',
        ChatList: 'chats',
        Chat: 'chat/:chatId',
        Settings: 'settings',
        Contacts: 'contacts',
        CreateStatus: 'status/create',
        ViewStatus: 'status/view/:statusId',
        AddContact: 'contacts/add',
        EditProfile: 'profile/edit',
        PrivacyPolicy: 'privacy-policy',
        TermsOfService: 'terms-of-service',
        CreateGroup: 'groups/create',
        BusinessDashboard: 'business',
        EmploiMain: 'emploi',
        EmployerDashboard: 'employer-dashboard',
        SchoolRequest: 'school/request',
        SchoolDashboard: 'school/dashboard',
        SchoolStudents: 'school/students',
        SchoolSchedule: 'school/schedule',
        SchoolFees: 'school/fees',
        SchoolAccounts: 'school/accounts',
        SchoolClasses: 'school/classes',
        SchoolLogin: 'school/login',
        SchoolStaffDashboard: 'school/staff-dashboard',
        StudentDashboard: 'school/student-dashboard',
      },
    },
  };

  return (
    <NavigationContainer ref={navRef} theme={navigationTheme} linking={Platform.OS === 'web' ? linking : undefined}>
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
          name="TermsOfService"
          component={TermsOfServiceScreen}
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
        <Stack.Screen
          name="EmploiMain"
          component={EmploiMainScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EmployerRequest"
          component={EmployerRequestScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EmployerDashboard"
          component={NewEmployerDashboard}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TalentSearch"
          component={TalentSearchScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="JobDiscovery"
          component={JobDiscoveryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="JobDetails"
          component={JobDetailsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CreateJobPosting"
          component={CreateJobPostingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MyJobs"
          component={MyJobsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EmployerPlanning"
          component={EmployerPlanningScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SchoolRequest"
          component={SchoolRequestScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SchoolDashboard"
          component={SchoolDashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SchoolStudents"
          component={SchoolStudentsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SchoolSchedule"
          component={SchoolScheduleScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SchoolFees"
          component={SchoolFeesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SchoolAccounts"
          component={SchoolAccountsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SchoolClasses"
          component={SchoolClassesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SchoolLogin"
          component={SchoolLoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SchoolStaffDashboard"
          component={SchoolStaffDashboard}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="StudentDashboard"
          component={StudentDashboard}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
