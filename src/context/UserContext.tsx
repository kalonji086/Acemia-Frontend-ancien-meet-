import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socket.service';
import apiService from '../services/api.service';

interface UserContextType {
  user: any;
  setUser: (user: any) => Promise<void>;
  locationSharingEnabled: boolean;
  setLocationSharingEnabled: (enabled: boolean) => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(false);

  const normalizeUser = useCallback((newUser: any) => {
    if (!newUser) return null;

    const fullName = newUser.full_name || newUser.name || newUser.fullName || 'Utilisateur';
    const avatarUrl = newUser.avatar_url || newUser.avatar || newUser.avatarUrl || null;

    return {
      ...newUser,
      id: newUser.id || newUser.userId || newUser.user_id,
      full_name: newUser.full_name || fullName,
      name: fullName,
      avatar_url: avatarUrl,
      avatar: avatarUrl,
      username: newUser.username || newUser.pseudo || null,
      phone_number: newUser.phone_number || newUser.phone || null,
      email: newUser.email || null,
      status: newUser.status || 'Disponible',
      gender: newUser.gender ?? null,
      country: newUser.country ?? null,
      province: newUser.province ?? null,
      city: newUser.city ?? null,
      commune: newUser.commune ?? null,
      birth_date: newUser.birth_date ?? null,
      preferred_language: newUser.preferred_language ?? 'fr',
      auto_translate: newUser.auto_translate ?? false,
    };
  }, []);

  const setUser = useCallback(async (newUser: any) => {
    try {
      if (newUser) {
        const formattedUser = normalizeUser(newUser);
        setUserState(formattedUser);
        await AsyncStorage.setItem('user', JSON.stringify(formattedUser));
      } else {
        setUserState(null);
        setLocationSharingEnabled(false);
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('auth_token');
      }
    } catch (e) {
      console.error('UserContext: Error setting user', e);
    }
  }, [normalizeUser]);

  useEffect(() => {
    if (loading) return undefined;
    if (!user?.id) {
      setLocationSharingEnabled(false);
      return undefined;
    }

    let active = true;
    void apiService.getLocationSharing().then((response) => {
      if (!response.success) throw new Error(response.error || 'Impossible de vérifier le partage de position.');
      if (active) setLocationSharingEnabled(Boolean(response.enabled));
    }).catch((error) => {
      console.error('Unable to load location-sharing consent:', error);
      if (active) setLocationSharingEnabled(false);
    });

    return () => {
      active = false;
    };
  }, [loading, user?.id]);

  const refreshUser = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUserState(normalizeUser(parsedUser));
      }
    } catch (e) {
      console.error('Failed to load user from storage', e);
    } finally {
      setLoading(false);
    }
  }, [normalizeUser]);

  useEffect(() => {
    refreshUser();

    // Listener for real-time profile updates from Admin Dashboard
    const handleProfileUpdate = (data: any) => {
      setUserState((prevUser: any) => {
        if (prevUser && prevUser.id === data.userId) {
          const updated = normalizeUser({
            ...prevUser,
            full_name: data.full_name || prevUser.full_name,
            name: data.full_name || prevUser.name,
            avatar_url: data.avatar_url || prevUser.avatar_url,
            avatar: data.avatar_url || prevUser.avatar,
            username: data.username || prevUser.username,
            gender: data.gender ?? prevUser.gender,
            country: data.country ?? prevUser.country,
            province: data.province ?? prevUser.province,
            city: data.city ?? prevUser.city,
            commune: data.commune ?? prevUser.commune,
            birth_date: data.birth_date ?? prevUser.birth_date,
          });
          AsyncStorage.setItem('user', JSON.stringify(updated));
          return updated;
        }
        return prevUser;
      });
    };

    socketService.on('admin_user_profile_updated', handleProfileUpdate);

    return () => {
      socketService.off('admin_user_profile_updated', handleProfileUpdate);
    };
  }, [normalizeUser, refreshUser]);

  return (
    <UserContext.Provider value={{
      user,
      setUser,
      locationSharingEnabled,
      setLocationSharingEnabled,
      refreshUser,
      loading,
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
