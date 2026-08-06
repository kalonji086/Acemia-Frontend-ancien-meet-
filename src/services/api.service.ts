import axios, { AxiosInstance } from 'axios';
import { API_BASE_URL } from '../utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  isLocked?: boolean;
  message?: string;
}

class ApiService {
  private static instance: ApiService;
  private api: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.setupInterceptors();
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) ApiService.instance = new ApiService();
    return ApiService.instance;
  }

  private async getAuthToken() { return await SecureStore.getItemAsync('auth_token'); }
  private async setAuthToken(t: string) { await SecureStore.setItemAsync('auth_token', t); }
  private async getRefreshToken() { return await SecureStore.getItemAsync('refresh_token'); }
  private async setRefreshToken(t: string) { await SecureStore.setItemAsync('refresh_token', t); }
  private async clearTokens() {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await AsyncStorage.removeItem('user');
  }

  private setupInterceptors(): void {
    this.api.interceptors.request.use(async (config) => {
      const token = await this.getAuthToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.api.interceptors.response.use(
      (res) => res,
      async (error) => {
        const originalRequest = error.config;

        // Gérer spécifiquement le bannissement (403)
        if (error.response?.status === 403 && error.response.data?.isLocked) {
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.api(originalRequest));
              });
            });
          }
          originalRequest._retry = true;
          this.isRefreshing = true;
          try {
            const rfToken = await this.getRefreshToken();
            if (!rfToken) throw new Error('Session expirée');

            const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: rfToken });

            if (res.data.success) {
              const newToken = res.data.data.token;
              await this.setAuthToken(newToken);
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              this.refreshSubscribers.forEach((cb) => cb(newToken));
              this.refreshSubscribers = [];
              return this.api(originalRequest);
            } else {
              throw new Error('Refresh failed');
            }
          } catch (e) {
            await this.clearTokens();
            return Promise.reject(e);
          } finally { this.isRefreshing = false; }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async register(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/auth/register', data);
      if (res.data.success) {
        await this.setAuthToken(res.data.data.token);
        await this.setRefreshToken(res.data.data.refreshToken);
        await AsyncStorage.setItem('user', JSON.stringify(res.data.data.user));
      }
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async login(credentials: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/auth/login', credentials);
      if (res.data.success) {
        await this.setAuthToken(res.data.data.token);
        await this.setRefreshToken(res.data.data.refreshToken);
        await AsyncStorage.setItem('user', JSON.stringify(res.data.data.user));
      }
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async logout(): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/auth/logout');
      await this.clearTokens();
      return res.data;
    } catch (e: any) { await this.clearTokens(); return this.handleError(e); }
  }

  async refreshAuthToken(refreshToken: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/auth/refresh', { refreshToken });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async checkAvailability(params: any): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/auth/check-availability', { params });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  // User
  async getMe(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/me');
      if (res.data.success) {
        const userData = res.data.data;
        const localUser = await this.getCurrentUser();
        await AsyncStorage.setItem('user', JSON.stringify({ ...localUser, ...userData }));
      }
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async updateProfile(userData: any): Promise<ApiResponse> {
    try {
      const res = await this.api.put('/users/profile', userData);
      if (res.data.success) {
        const updatedData = res.data.data;
        const localUser = await this.getCurrentUser();
        await AsyncStorage.setItem('user', JSON.stringify({ ...localUser, ...updatedData }));
      }
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async searchUsers(query: string, limit: number = 20): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/users/search', { params: { query, limit } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async syncContacts(phoneNumbers: string[]): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/users/sync-contacts', { phoneNumbers });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getBadges(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/users/badges');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getUserById(userId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get(`/users/${userId}`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async updatePushToken(pushToken: string | null): Promise<ApiResponse> {
    try {
      const res = await this.api.put('/users/push-token', { pushToken });
      if (res.data.success) {
        const localUser = await this.getCurrentUser();
        if (localUser) {
          await AsyncStorage.setItem('user', JSON.stringify({ ...localUser, push_token: pushToken }));
        }
      }
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  // Chats
  async getChats(page: number = 1, limit: number = 20, archived: boolean = false): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/chats', { params: { page, limit, archived: archived.toString() } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async createChat(participantIds: string[], type: 'private' | 'group' = 'private', name?: string, avatarUrl?: string, description?: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/chats', { participants: participantIds, type, name, avatarUrl, description });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async toggleArchiveChat(chatId: string, archive: boolean = true): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/chats/${chatId}/archive`, { archive });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async deleteChat(chatId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.delete(`/chats/${chatId}`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getMessages(chatId: string, page: number = 1, limit: number = 50): Promise<ApiResponse> {
    try {
      const res = await this.api.get(`/messages/${chatId}`, { params: { page, limit } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async sendMessage(chatId: string, content: string, type: string = 'text', fileUrl?: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/messages', { chat: chatId, content, type, file_url: fileUrl });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async markMessagesAsRead(chatId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/messages/${chatId}/read`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  // Calls (Agora)
  async generateAgoraToken(channelName: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/calls/generate-token', { channelName });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async deleteMessage(messageId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.delete(`/messages/${messageId}`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  // Upload
  async uploadFile(file: any, type: string = 'image'): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      const field = type === 'audio' ? 'audio' : 'image';
      formData.append(field, { uri: file.uri, type: file.type || 'image/jpeg', name: file.name || 'upload.jpg' } as any);
      const res = await this.api.post(`/upload/${type}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  // Status
  async getStatuses(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/statuses');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  // Helpdesk
  async submitHelpdesk(data: { category: string, reason: string, email?: string }): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/support/helpdesk', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  // Update & Config
  async checkUpdate(version: string, userId?: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/check-update', { params: { version, userId } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getLegalDocs(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/legal');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async submitVerification(documentUrl: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/users/verify', { documentUrl });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getCurrentUser(): Promise<any> {
    try {
      const userString = await AsyncStorage.getItem('user');
      return userString ? JSON.parse(userString) : null;
    } catch (error) { return null; }
  }

  private handleError(error: any): ApiResponse {
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'Server error',
        isLocked: error.response.data?.isLocked,
        message: error.response.data?.message
      };
    }
    return { success: false, error: 'Network error' };
  }
}

export default ApiService.getInstance();
