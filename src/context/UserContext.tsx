import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socket.service';

interface UserContextType {
  user: any;
  setUser: (user: any) => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const setUser = async (newUser: any) => {
    try {
      if (newUser) {
        const formattedUser = {
          ...newUser,
          id: newUser.id || newUser.userId,
          name: newUser.full_name || newUser.name || 'Utilisateur',
          avatar: newUser.avatar_url || newUser.avatar
        };
        setUserState(formattedUser);
        await AsyncStorage.setItem('user', JSON.stringify(formattedUser));
      } else {
        setUserState(null);
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('auth_token');
      }
    } catch (e) {
      console.error('UserContext: Error setting user', e);
    }
  };

  const refreshUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        setUserState(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to load user from storage', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    // Listener for real-time profile updates from Admin Dashboard
    const handleProfileUpdate = (data: any) => {
      setUserState((prevUser: any) => {
        if (prevUser && prevUser.id === data.userId) {
          const updated = {
            ...prevUser,
            full_name: data.full_name || prevUser.full_name,
            name: data.full_name || prevUser.full_name,
            avatar_url: data.avatar_url || prevUser.avatar_url,
            avatar: data.avatar_url || prevUser.avatar_url,
            username: data.username || prevUser.username
          };
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
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, refreshUser, loading }}>
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
