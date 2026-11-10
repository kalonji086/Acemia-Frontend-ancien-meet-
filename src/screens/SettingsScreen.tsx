import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  Image,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import {
  Moon, Sun, Palette, Type, Languages, ArrowRightLeft,
  ArrowLeft, ChevronRight, ShieldCheck, FileText, HelpCircle,
  LogOut, CheckCircle, Check, X, ChevronDown
} from 'lucide-react-native';
import apiService from '../services/api.service';
import { SOCKET_URL } from '../utils/constants';
import { useTheme, APP_COLORS } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { LanguageCode } from '../i18n/translations';
import { useFeedback } from '../components/FeedbackSystem';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform, useWindowDimensions } from 'react-native';
import EditProfileScreen from './EditProfileScreen';
import SecurityPrivacyScreen from './SecurityPrivacyScreen';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import HelpdeskScreen from './HelpdeskScreen';

export default function SettingsScreen({ navigation }: any) {
  const { isDark, colors, toggleTheme, setTheme, primaryColor, setPrimaryColor, fontSizeFactor, setFontSizeFactor, normalize } = useTheme();
  const { language, setLanguage, t, autoTranslate, setAutoTranslate } = useLanguage();
  const { user, setUser, loading: userLoading } = useUser();
  const { showFeedbackModal, FeedbackModal } = useFeedback();
  const { width: screenWidth } = useWindowDimensions();

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [colorModalVisible, setColorModalVisible] = useState(false);
  const [appearanceModalVisible, setAppearanceModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('profile');
  const isTablet = screenWidth > 768;

  const notifyChange = async (message: string) => {
    console.log('Setting changed:', message);
  };

  const getFullUrl = (url: string) => {
    if (!url || url === 'null') return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;

    const baseUrl = SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL;
    const path = url.startsWith('/') ? url : `/${url}`;

    return `${baseUrl}${path}`;
  };

  const handleLogout = async () => {
    Alert.alert(
      t('logout'),
      t('logoutConfirm'),
      [
        { text: t('cancel'), style: "cancel" },
        {
          text: t('logout'),
          style: "destructive",
          onPress: async () => {
            await apiService.logout();
            await setUser(null);
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }
        }
      ]
    );
  };

  const adjustFontSize = (increment: boolean) => {
    const newFactor = increment ? fontSizeFactor + 0.1 : fontSizeFactor - 0.1;
    if (newFactor >= 0.8 && newFactor <= 1.5) {
      setFontSizeFactor(parseFloat(newFactor.toFixed(1)));
      notifyChange("Taille du texte mise à jour !");
    }
  };

  const handleColorChange = (colorId: string) => {
    setPrimaryColor(colorId);
    setColorModalVisible(false);
    notifyChange("Couleur du thème modifiée !");
  };

  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  ];

  const dynamicStyles = createStyles(colors, normalize, fontSizeFactor);

  if (userLoading) {
    return (
      <View style={dynamicStyles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderDetailPane = () => {
    switch (selectedCategory) {
      case 'profile':
        return <EditProfileScreen navigation={navigation} isComponent={true} />;
      case 'security':
        return <SecurityPrivacyScreen navigation={navigation} isComponent={true} />;
      case 'privacy':
        return <PrivacyPolicyScreen navigation={navigation} isComponent={true} />;
      case 'appearance':
        return renderAppearanceSettings();
      case 'helpdesk':
        return <HelpdeskScreen navigation={navigation} isComponent={true} />;
      default:
        return <EditProfileScreen navigation={navigation} isComponent={true} />;
    }
  };

  const renderAppearanceSettings = () => (
    <View style={{ padding: 20 }}>
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>{t('appearance')}</Text>
        <View style={dynamicStyles.menuItem}>
          {isDark ? <Moon size={22} color={colors.primary} /> : <Sun size={22} color={colors.primary} />}
          <Text style={dynamicStyles.menuText}>{t('darkMode')}</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={isDark ? colors.primary : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity
          style={dynamicStyles.menuItem}
          onPress={() => setColorModalVisible(true)}
        >
          <Palette size={22} color={colors.primary} />
          <Text style={dynamicStyles.menuText}>Couleur de l'application</Text>
          <View style={[dynamicStyles.colorPreview, { backgroundColor: colors.primary }]} />
        </TouchableOpacity>

        <View style={[dynamicStyles.menuItem, { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Type size={22} color={colors.primary} />
            <Text style={dynamicStyles.menuText}>Taille du texte</Text>
          </View>
          <View style={dynamicStyles.fontSizeContainer}>
            <TouchableOpacity
              style={[dynamicStyles.fontBtn, fontSizeFactor <= 0.8 && dynamicStyles.fontBtnDisabled]}
              onPress={() => adjustFontSize(false)}
              disabled={fontSizeFactor <= 0.8}
            >
              <Text style={{ fontSize: 24, color: colors.primary }}>-</Text>
            </TouchableOpacity>

            <View style={dynamicStyles.fontSizePreview}>
              <Text style={{ fontSize: normalize(16), color: colors.text.primary, fontWeight: 'bold' }}>
                {Math.round(fontSizeFactor * 100)}%
              </Text>
            </View>

            <TouchableOpacity
              style={[dynamicStyles.fontBtn, fontSizeFactor >= 1.5 && dynamicStyles.fontBtnDisabled]}
              onPress={() => adjustFontSize(true)}
              disabled={fontSizeFactor >= 1.5}
            >
              <Text style={{ fontSize: 24, color: colors.primary }}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>{t('translation')}</Text>
        <TouchableOpacity
          style={dynamicStyles.menuItem}
          onPress={() => setLangModalVisible(true)}
        >
          <Languages size={22} color={colors.primary} />
          <Text style={dynamicStyles.menuText}>{t('preferredLanguage')}</Text>
          <Text style={dynamicStyles.valueText}>
            {languages.find(l => l.code === language)?.name}
          </Text>
          <ChevronDown size={20} color={colors.text.disabled} />
        </TouchableOpacity>

        <View style={dynamicStyles.menuItem}>
          <ArrowRightLeft size={22} color={colors.primary} />
          <Text style={dynamicStyles.menuText}>{t('autoTranslate')}</Text>
          <Switch
            value={autoTranslate}
            onValueChange={setAutoTranslate}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={autoTranslate ? colors.primary : '#f4f3f4'}
          />
        </View>
      </View>
    </View>
  );

  const renderMasterPane = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={dynamicStyles.header}>
        {!isTablet && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={dynamicStyles.backButton}>
            <ArrowLeft size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
        <Text style={dynamicStyles.headerTitle}>{t('settings')}</Text>
      </View>

      <TouchableOpacity
        style={[
          dynamicStyles.profileSection,
          isTablet && selectedCategory === 'profile' && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
        ]}
        onPress={() => isTablet ? setSelectedCategory('profile') : navigation.navigate('EditProfile')}
      >
        <Image
          source={{ uri: getFullUrl(user?.avatar) || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random` }}
          style={dynamicStyles.profileImage}
        />
        <View style={dynamicStyles.profileInfo}>
          <Text style={dynamicStyles.profileName}>{user?.name || 'Utilisateur'}</Text>
          <Text style={dynamicStyles.profileEmail}>{user?.email || 'N/A'}</Text>
        </View>
        {!isTablet && <ChevronRight size={24} color={colors.text.disabled} />}
      </TouchableOpacity>

      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>{t('account')}</Text>
        <TouchableOpacity
          style={[
            dynamicStyles.menuItem,
            isTablet && selectedCategory === 'security' && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
          ]}
          onPress={() => isTablet ? setSelectedCategory('security') : navigation.navigate('SecurityPrivacy')}
        >
          <ShieldCheck size={22} color={colors.primary} />
          <Text style={dynamicStyles.menuText}>{t('security')}</Text>
          <ChevronRight size={20} color={colors.text.disabled} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            dynamicStyles.menuItem,
            isTablet && selectedCategory === 'privacy' && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
          ]}
          onPress={() => isTablet ? setSelectedCategory('privacy') : navigation.navigate('PrivacyPolicy')}
        >
          <FileText size={22} color={colors.primary} />
          <Text style={dynamicStyles.menuText}>{t('privacyPolicy')}</Text>
          <ChevronRight size={20} color={colors.text.disabled} />
        </TouchableOpacity>

        <TouchableOpacity
          style={dynamicStyles.menuItem}
          onPress={() => navigation.navigate('TermsOfService')}
        >
          <FileText size={22} color={colors.primary} />
          <Text style={dynamicStyles.menuText}>Conditions d'Utilisation</Text>
          <ChevronRight size={20} color={colors.text.disabled} />
        </TouchableOpacity>
      </View>

      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>{t('appearance')}</Text>
        <TouchableOpacity
          style={[
            dynamicStyles.menuItem,
            isTablet && selectedCategory === 'appearance' && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
          ]}
          onPress={() => isTablet ? setSelectedCategory('appearance') : setAppearanceModalVisible(true)}
        >
          <Palette size={22} color={colors.primary} />
          <Text style={dynamicStyles.menuText}>Thème et Apparence</Text>
          <ChevronRight size={20} color={colors.text.disabled} />
        </TouchableOpacity>
      </View>

      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>Support & Aide</Text>
        <TouchableOpacity
          style={[
            dynamicStyles.menuItem,
            isTablet && selectedCategory === 'helpdesk' && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
          ]}
          onPress={() => isTablet ? setSelectedCategory('helpdesk') : navigation.navigate('Helpdesk')}
        >
          <HelpCircle size={22} color={colors.primary} />
          <Text style={dynamicStyles.menuText}>Centre d'aide</Text>
          <ChevronRight size={20} color={colors.text.disabled} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={dynamicStyles.logoutButton} onPress={handleLogout}>
        <LogOut size={22} color={colors.danger} />
        <Text style={dynamicStyles.logoutText}>{t('logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  if (isTablet) {
    return (
      <View style={[dynamicStyles.container, { flexDirection: 'row' }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
        <View style={{ width: 350, borderRightWidth: 1, borderRightColor: colors.divider }}>
          {renderMasterPane()}
        </View>
        <View style={{ flex: 1 }}>
          {renderDetailPane()}
        </View>

        {/* Modals for Tablet */}
        <Modal visible={langModalVisible} transparent animationType="slide" onRequestClose={() => setLangModalVisible(false)}>
          <View style={dynamicStyles.modalOverlay}>
            <View style={dynamicStyles.modalContent}>
              <Text style={dynamicStyles.modalTitle}>{t('preferredLanguage')}</Text>
              <FlatList
                data={languages}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[dynamicStyles.langItem, language === item.code && dynamicStyles.selectedLangItem]}
                    onPress={() => { setLanguage(item.code as LanguageCode); setLangModalVisible(false); notifyChange("Langue modifiée !"); }}
                  >
                    <Text style={dynamicStyles.langFlag}>{item.flag}</Text>
                    <Text style={[dynamicStyles.langName, language === item.code && dynamicStyles.selectedLangText]}>{item.name}</Text>
                    {language === item.code && <CheckCircle size={24} color={colors.primary} />}
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity style={dynamicStyles.closeBtn} onPress={() => setLangModalVisible(false)}><Text style={dynamicStyles.closeBtnText}>{t('cancel')}</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={colorModalVisible} transparent animationType="slide" onRequestClose={() => setColorModalVisible(false)}>
          <View style={dynamicStyles.modalOverlay}>
            <View style={dynamicStyles.modalContent}>
              <Text style={dynamicStyles.modalTitle}>Couleur du thème</Text>
              <View style={dynamicStyles.colorGrid}>
                {APP_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color.id}
                    style={[dynamicStyles.colorItem, { backgroundColor: color.main }, primaryColor === color.id && dynamicStyles.selectedColorItem]}
                    onPress={() => handleColorChange(color.id)}
                  >
                    {primaryColor === color.id && <Check size={24} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={dynamicStyles.closeBtn} onPress={() => setColorModalVisible(false)}><Text style={dynamicStyles.closeBtnText}>{t('cancel')}</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

        <FeedbackModal />
      </View>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
      {renderMasterPane()}
      <FeedbackModal />

      {/* Modals for Phone */}
      <Modal visible={langModalVisible} transparent animationType="slide" onRequestClose={() => setLangModalVisible(false)}>
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <Text style={dynamicStyles.modalTitle}>{t('preferredLanguage')}</Text>
            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[dynamicStyles.langItem, language === item.code && dynamicStyles.selectedLangItem]}
                  onPress={() => { setLanguage(item.code as LanguageCode); setLangModalVisible(false); notifyChange("Langue modifiée !"); }}
                >
                  <Text style={dynamicStyles.langFlag}>{item.flag}</Text>
                  <Text style={[dynamicStyles.langName, language === item.code && dynamicStyles.selectedLangText]}>{item.name}</Text>
                  {language === item.code && <CheckCircle size={24} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={dynamicStyles.closeBtn} onPress={() => setLangModalVisible(false)}><Text style={dynamicStyles.closeBtnText}>{t('cancel')}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={colorModalVisible} transparent animationType="slide" onRequestClose={() => setColorModalVisible(false)}>
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <Text style={dynamicStyles.modalTitle}>Couleur du thème</Text>
            <View style={dynamicStyles.colorGrid}>
              {APP_COLORS.map((color) => (
                <TouchableOpacity
                  key={color.id}
                  style={[dynamicStyles.colorItem, { backgroundColor: color.main }, primaryColor === color.id && dynamicStyles.selectedColorItem]}
                  onPress={() => handleColorChange(color.id)}
                >
                  {primaryColor === color.id && <Check size={24} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={dynamicStyles.closeBtn} onPress={() => setColorModalVisible(false)}><Text style={dynamicStyles.closeBtnText}>{t('cancel')}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Apparence sur Phone */}
      <Modal visible={appearanceModalVisible} transparent animationType="slide" onRequestClose={() => setAppearanceModalVisible(false)}>
        <View style={dynamicStyles.modalOverlay}>
          <View style={[dynamicStyles.modalContent, { maxHeight: '90%' }]}>
            <View style={{ padding: 20 }}>
              <Text style={dynamicStyles.modalTitle}>{t('appearance')}</Text>
              <TouchableOpacity onPress={() => setAppearanceModalVisible(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {renderAppearanceSettings()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, normalize: any, factor: number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { marginRight: 20 },
  headerTitle: { fontSize: normalize(20, factor), fontWeight: 'bold', color: colors.text.primary },
  profileSection: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: colors.surface, marginTop: 10, elevation: 1 },
  profileImage: { width: normalize(60, factor), height: normalize(60, factor), borderRadius: normalize(30, factor) },
  profileInfo: { flex: 1, marginLeft: 15 },
  profileName: { fontSize: normalize(18, factor), fontWeight: 'bold', color: colors.text.primary },
  profileEmail: { fontSize: normalize(13, factor), color: colors.text.secondary },
  profileStatus: { fontSize: normalize(12, factor), color: colors.primary, marginTop: 2 },
  section: { marginTop: 20, backgroundColor: colors.surface, paddingHorizontal: 20, elevation: 1 },
  sectionTitle: { fontSize: normalize(13, factor), fontWeight: 'bold', color: colors.primary, marginTop: 15, marginBottom: 10, textTransform: 'uppercase' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.divider },
  menuText: { flex: 1, fontSize: normalize(15, factor), color: colors.text.primary, marginLeft: 15 },
  valueText: { fontSize: normalize(14, factor), color: colors.text.secondary, marginRight: 10 },
  colorPreview: { width: 24, height: 24, borderRadius: 12, marginRight: 10 },
  fontSizeContainer: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  fontBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  fontBtnDisabled: { opacity: 0.3 },
  fontSizePreview: { flex: 1, alignItems: 'center' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, marginTop: 30, padding: 15, elevation: 1 },
  logoutText: { fontSize: normalize(16, factor), color: colors.danger, fontWeight: 'bold', marginLeft: 10 },
  footer: { alignItems: 'center', padding: 30 },
  version: { fontSize: normalize(12, factor), color: colors.text.disabled },
  copyright: { fontSize: normalize(10, factor), color: colors.text.disabled, marginTop: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: normalize(18, factor), fontWeight: 'bold', color: colors.text.primary, marginBottom: 20, textAlign: 'center' },
  langItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, marginBottom: 10 },
  selectedLangItem: { backgroundColor: colors.primaryLight + '20' },
  langFlag: { fontSize: normalize(24, factor), marginRight: 15 },
  langName: { flex: 1, fontSize: normalize(16, factor), color: colors.text.primary },
  selectedLangText: { fontWeight: 'bold', color: colors.primary },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 },
  colorItem: { width: 50, height: 50, borderRadius: 25, margin: 10, justifyContent: 'center', alignItems: 'center' },
  selectedColorItem: { borderWidth: 3, borderColor: '#fff' },
  closeBtn: { marginTop: 10, padding: 15, alignItems: 'center' },
  closeBtnText: { fontSize: normalize(16, factor), color: colors.primary, fontWeight: 'bold' }
});
