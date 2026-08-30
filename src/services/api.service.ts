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
  isContact?: boolean;
  statusCode?: number;
}

class ApiService {
  private static instance: ApiService;
  private api: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000,
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
      // Configuration de timeout adaptée au réveil de Render
      config.timeout = 60000; // 60 secondes
      config.timeoutErrorMessage = 'Request timeout';
      
      // Ajouter des headers de sécurité
      config.headers['X-Request-ID'] = Date.now().toString(36) + Math.random().toString(36).substr(2);
      
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

        // Gestion des erreurs réseau avec retry
        if (!error.response && !originalRequest._retryCount) {
          originalRequest._retryCount = originalRequest._retryCount || 0;
          
          if (originalRequest._retryCount < 3) {
            originalRequest._retryCount++;
            
            // Backoff exponentiel
            const delay = 1000 * Math.pow(2, originalRequest._retryCount);
            console.log(`Retrying request (${originalRequest._retryCount}/3) in ${delay}ms`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.api(originalRequest);
          }
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
        
        // Loguer l'erreur pour le debugging
        console.error('API Error:', {
          url: originalRequest?.url,
          method: originalRequest?.method,
          status: error.response?.status,
          message: error.message,
          retryCount: originalRequest?._retryCount
        });
        
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async register(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/auth/register', data);
      if (res.data && res.data.success && res.data.data) {
        if (res.data.data.token) await this.setAuthToken(res.data.data.token);
        if (res.data.data.refreshToken) await this.setRefreshToken(res.data.data.refreshToken);
        if (res.data.data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(res.data.data.user));
        }
      }
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async login(credentials: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/auth/login', credentials);
      if (res.data && res.data.success && res.data.data) {
        if (res.data.data.token) await this.setAuthToken(res.data.data.token);
        if (res.data.data.refreshToken) await this.setRefreshToken(res.data.data.refreshToken);
        if (res.data.data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(res.data.data.user));
        }
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

  async forgotPassword(email: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/auth/forgot-password', { email });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async resetPassword(email: string, otp: string, newPassword: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/auth/reset-password', { email, otp, newPassword });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  // User
  async getMe(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/me');
      if (res.data && res.data.success && res.data.data) {
        const userData = res.data.data;
        const localUser = await this.getCurrentUser();
        const mergedUser = { ...(localUser || {}), ...(userData || {}) };
        await AsyncStorage.setItem('user', JSON.stringify(mergedUser));
      }
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async verifyToken(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/auth/verify');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async updateProfile(userData: any): Promise<ApiResponse> {
    try {
      const res = await this.api.put('/users/profile', userData);
      if (res.data && res.data.success && res.data.data) {
        const updatedData = res.data.data;
        const localUser = await this.getCurrentUser();
        const mergedUser = { ...(localUser || {}), ...(updatedData || {}) };
        await AsyncStorage.setItem('user', JSON.stringify(mergedUser));
      }
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    try {
      const res = await this.api.put('/auth/change-password', { currentPassword, newPassword });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async updatePrivacySettings(settings: any): Promise<ApiResponse> {
    try {
      const res = await this.api.put('/users/privacy-settings', { settings });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async deleteAccount(password: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/users/delete-account', { password });
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

  async blockUser(targetId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/users/block', { targetId });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async submitAppeal(reason: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/users/appeal', { reason });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async reportUser(targetId: string, reason: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/users/report', { targetId, reason });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async addContact(peerId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/users/contacts', { contactId: peerId });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async isContact(peerId: string): Promise<ApiResponse<{ isContact: boolean }>> {
    try {
      const res = await this.api.get(`/users/contacts/check/${peerId}`);
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

  async getChat(chatId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get(`/chats/${chatId}`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async createChat(participantIds: string[], type: 'private' | 'group' = 'private', name?: string, avatarUrl?: string, description?: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/chats', { participants: participantIds, type, name, avatarUrl, description });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async updateChat(chatId: string, data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/chats/${chatId}`, data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async changeMemberRole(chatId: string, userId: string, role: string): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/chats/${chatId}/members/${userId}/role`, { role });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async addGroupMembers(chatId: string, userIds: string[]): Promise<ApiResponse> {
    try {
      const res = await this.api.post(`/chats/${chatId}/members`, { userIds });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async removeGroupMember(chatId: string, userId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.delete(`/chats/${chatId}/members/${userId}`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async toggleArchiveChat(chatId: string, archive: boolean = true): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/chats/${chatId}/archive`, { archive });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async archiveChat(chatId: string): Promise<ApiResponse> {
    return this.toggleArchiveChat(chatId, true);
  }

  async toggleFavoriteChat(chatId: string, favorite: boolean = true): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/chats/${chatId}/favorite`, { favorite });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async togglePriorityChat(chatId: string, priority: boolean = true): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/chats/${chatId}/priority`, { priority });
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

  async sendMessage(chatId: string, content: string, type: string = 'text', fileUrl?: string, metadata?: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/messages', {
        chat: chatId,
        content,
        type,
        file_url: fileUrl,
        ...metadata
      });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async markMessagesAsRead(chatId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/messages/${chatId}/read`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async deleteMessage(messageId: string, deleteType: 'everyone' | 'me' = 'everyone'): Promise<ApiResponse> {
    try {
      const res = await this.api.delete(`/messages/${messageId}?deleteType=${deleteType}`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async translateMessage(messageId: string, targetLanguage: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post(`/messages/${messageId}/translate`, { targetLanguage });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async translateVoiceMessage(messageId: string, targetLanguage: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post(`/messages/${messageId}/translate-voice`, { targetLanguage });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async reactToMessage(messageId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/messages/${messageId}/react`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  // Upload
  async uploadFile(file: any, type: string = 'image', onProgress?: (progress: number) => void): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      let field = 'image';
      let endpoint = `/upload/${type}`;

      if (type === 'audio') {
        field = 'audio';
      } else if (type === 'document' || type === 'file') {
        field = 'document';
        endpoint = '/upload/document';
      } else if (type === 'video') {
        field = 'video';
      } else if (type === 'image') {
        field = 'image';
      } else {
        // Fallback générique
        field = 'file';
        endpoint = '/upload';
      }

      formData.append(field, {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name || 'upload'
      } as any);

      const res = await this.api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0,
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = progressEvent.loaded / progressEvent.total;
            onProgress(progress);
          }
        }
      });
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

  async createStatus(data: { content: string, type: 'text' | 'image', mediaUrl?: string | null, backgroundColor?: string }): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/statuses', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async markStatusAsViewed(statusId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post(`/statuses/${statusId}/view`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getStatusReactions(statusId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get(`/statuses/${statusId}/reactions`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async addStatusReaction(statusId: string, data: { content: string, type: 'emoji' | 'comment' | 'like' }): Promise<ApiResponse> {
    try {
      const res = await this.api.post(`/statuses/${statusId}/reactions`, data);
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

  async submitFeedback(data: { type: string, title: string, description: string, email?: string, deviceInfo?: any, context?: string }): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/support/feedback', data);
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

  // Calls
  async generateCallToken(channelName: string, role: string = 'publisher'): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/calls/generate-token', { channelName, role });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getCallHistory(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/calls/history');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  // Market
  async getMyBusiness(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/market/my-business');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async registerBusiness(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/market/register', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getMarketDashboard(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/market/dashboard');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async createMarketPost(data: { title: string, content: string, images?: string[], type?: string }): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/market/posts', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getMarketFeed(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/market/feed');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getMarketDiscovery(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/market/discovery');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async toggleMarketLike(postId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post(`/market/posts/${postId}/like`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async addMarketComment(postId: string, content: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post(`/market/posts/${postId}/comment`, { content });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getMarketComments(postId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get(`/market/posts/${postId}/comments`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async toggleMarketSubscription(businessId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post(`/market/business/${businessId}/subscribe`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getMarketOrders(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/market/orders');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async createMarketOrder(data: { customerName: string, items: any, totalAmount: number }): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/market/orders', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async updateMarketOrder(orderId: string, data: { status?: string, trackingNumber?: string, adminNotes?: string }): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/market/orders/${orderId}`, data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getMarketRequests(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/market/requests');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getMarketInventory(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/market/inventory');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getMarketInventoryLogs(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/market/inventory/logs');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async updateMarketInventory(data: { itemName: string, quantity: number, price?: number, action: 'add' | 'remove' | 'create', reason?: string }): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/market/inventory', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async deleteMarketInventoryItem(itemId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.delete(`/market/inventory/${itemId}`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getMarketChats(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/market/chats');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getMarketDocuments(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/market/documents');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async uploadMarketDocument(data: { name: string, fileUrl: string, fileSize?: string, mimeType?: string }): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/market/documents', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async createMarketQuote(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/market/quotes', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getBusinessById(id: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get(`/market/business/${id}`);
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
    const errorData = error.response?.data;
    const errorMessage = typeof errorData?.error === 'string'
      ? errorData.error
      : (errorData?.message || errorData?.error?.message || error.message || 'Server error');

    console.error('API Service Error:', {
      message: errorMessage,
      status: error.response?.status
    });
    
    if (error.response) {
      return {
        success: false,
        error: errorMessage,
        isLocked: errorData?.isLocked,
        message: errorData?.message,
        statusCode: error.response.status
      };
    }
    
    // Gestion spécifique des erreurs réseau
    if (error.message?.includes('timeout')) {
      return { 
        success: false, 
        error: 'Request timeout', 
        message: 'Le serveur met trop de temps à répondre' 
      };
    }
    
    if (error.message?.includes('Network Error')) {
      return { 
        success: false, 
        error: 'Network error', 
        message: 'Vérifiez votre connexion internet' 
      };
    }
    
    return { 
      success: false, 
      error: 'Unknown error', 
      message: 'Une erreur inattendue est survenue' 
    };
  }
}

export default ApiService.getInstance();
