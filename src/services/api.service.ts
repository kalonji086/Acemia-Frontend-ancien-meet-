import axios, { AxiosInstance } from 'axios';
import { API_BASE_URL } from '../utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Types
export interface ApiResponse<T = any> {
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

  private async getAuthToken() {
    if (Platform.OS === 'web') return await AsyncStorage.getItem('auth_token');
    return await SecureStore.getItemAsync('auth_token');
  }

  private async setAuthToken(t: string) {
    if (Platform.OS === 'web') await AsyncStorage.setItem('auth_token', t);
    else await SecureStore.setItemAsync('auth_token', t);
  }

  private async getRefreshToken() {
    if (Platform.OS === 'web') return await AsyncStorage.getItem('refresh_token');
    return await SecureStore.getItemAsync('refresh_token');
  }

  private async setRefreshToken(t: string) {
    if (Platform.OS === 'web') await AsyncStorage.setItem('refresh_token', t);
    else await SecureStore.setItemAsync('refresh_token', t);
  }

  private async clearTokens() {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('refresh_token');
    } else {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('refresh_token');
    }
    await AsyncStorage.removeItem('user');
  }

  private setupInterceptors(): void {
    this.api.interceptors.request.use(async (config) => {
      config.timeout = 60000;
      config.timeoutErrorMessage = 'Request timeout';
      config.headers['X-Request-ID'] = Date.now().toString(36) + Math.random().toString(36).substr(2);
      
      const token = await this.getAuthToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.api.interceptors.response.use(
      (res) => res,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 403 && error.response.data?.isLocked) {
          return Promise.reject(error);
        }

        if (!error.response && !originalRequest._retryCount) {
          originalRequest._retryCount = originalRequest._retryCount || 0;
          if (originalRequest._retryCount < 3) {
            originalRequest._retryCount++;
            const delay = 1000 * Math.pow(2, originalRequest._retryCount);
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
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async register(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/auth/register', data);
      if (res.data?.success && res.data.data) {
        if (res.data.data.token) await this.setAuthToken(res.data.data.token);
        if (res.data.data.refreshToken) await this.setRefreshToken(res.data.data.refreshToken);
        if (res.data.data.user) await AsyncStorage.setItem('user', JSON.stringify(res.data.data.user));
      }
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async login(credentials: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/auth/login', credentials);
      if (res.data?.success && res.data.data) {
        if (res.data.data.token) await this.setAuthToken(res.data.data.token);
        if (res.data.data.refreshToken) await this.setRefreshToken(res.data.data.refreshToken);
        if (res.data.data.user) await AsyncStorage.setItem('user', JSON.stringify(res.data.data.user));
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

  async forgotPassword(email: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/auth/forgot-password', { email });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async verifyOTP(email: string, otp: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/auth/verify-otp', { email, otp });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async resetPassword(email: string, otp: string, newPassword: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/auth/reset-password', { email, otp, newPassword });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async checkAvailability(params: any): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/auth/check-availability', { params });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async verifyToken(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/auth/verify');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  // User
  async getMe(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/me');
      if (res.data?.success && res.data.data) {
        const localUser = await this.getCurrentUser();
        await AsyncStorage.setItem('user', JSON.stringify({ ...(localUser || {}), ...res.data.data }));
      }
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async updateProfile(userData: any): Promise<ApiResponse> {
    try {
      const res = await this.api.put('/users/profile', userData);
      if (res.data?.success && res.data.data) {
        const localUser = await this.getCurrentUser();
        await AsyncStorage.setItem('user', JSON.stringify({ ...(localUser || {}), ...res.data.data }));
      }
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async searchUsers(query: string, limit: number = 20, onlyContacts: boolean = false): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/users/search', { params: { query, limit, onlyContacts: onlyContacts.toString() } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async searchTalents(search?: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/employer/talents', { params: { search } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getUserById(userId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get(`/users/${userId}`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async addContact(peerId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/users/contacts', { contactId: peerId });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async checkUserByPhone(phone: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get(`/users/check-phone/${encodeURIComponent(phone)}`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async isContact(peerId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get(`/users/contacts/check/${peerId}`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async syncContacts(phoneNumbers: string[]): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/users/sync-contacts', { phoneNumbers });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async blockUser(targetId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/users/block', { targetId });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async reportUser(targetId: string, reason: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/users/report', { targetId, reason });
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

  async submitVerification(documentUrl: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/users/verify', { documentUrl });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async submitAppeal(reason: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/users/appeal', { reason });
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
      const res = await this.api.post('/messages', { chat: chatId, content, type, file_url: fileUrl, ...metadata });
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

  // School Module
  async getSchoolOverview(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/school/overview');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async linkSchoolStudent(data: { schoolId: string; firstName: string; lastName: string }): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/school/link-student', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getSchoolWorld(country?: string, city?: string, type?: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/school/world', { params: { country, city, type } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getSchoolDashboard(schoolId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/school/dashboard', { params: { schoolId } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getSchoolProfile(id: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get(`/school/profile/${id}`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async enrollInSchool(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/school/enroll', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async handleEnrollment(id: string, data: { status: 'approved' | 'rejected', classId?: string }): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/school/enroll/${id}`, data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getEnrollmentRequests(schoolId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get(`/school/enroll/requests`, { params: { schoolId } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getSchoolClasses(schoolId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get(`/school/classes`, { params: { schoolId } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getSchoolSchedules(schoolId: string, classId?: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/school/schedules', { params: { schoolId, classId } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getSchoolStats(schoolId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/school/stats', { params: { schoolId } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getSchoolFees(schoolId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/school/fees', { params: { schoolId } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async createSchoolFee(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/school/fees', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getSchoolTeachers(schoolId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/school/teachers', { params: { schoolId } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async createSchoolSchedule(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/school/schedules', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async deleteSchoolSchedule(id: string): Promise<ApiResponse> {
    try {
      const res = await this.api.delete(`/school/schedules/${id}`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async createSchoolAnnouncement(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/school/announcements', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async deleteSchoolAnnouncement(id: string): Promise<ApiResponse> {
    try {
      const res = await this.api.delete(`/school/announcements/${id}`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async createSchool(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/school/create', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async createSchoolStudent(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/school/students', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async createSchoolClass(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/school/classes', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async updateSchoolClass(id: string, data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/school/classes/${id}`, data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async deleteSchoolClass(id: string): Promise<ApiResponse> {
    try {
      const res = await this.api.delete(`/school/classes/${id}`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async createSchoolTeacher(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/school/teachers', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async assignSchoolTeacherToClass(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/school/teacher-classes', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async createSchoolAssignment(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/school/assignments', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async submitAssignment(data: { assignmentId: string, content: string, fileUrl?: string }): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/school/submissions', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async createSchoolGrade(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/school/grades', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async createSchoolPayment(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/school/payments', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getSchoolPayments(schoolId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/school/payments', { params: { schoolId } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async sendSchoolMessage(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/school/messages', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async requestSchoolStaff(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/school/staff-request', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  // Employer & Jobs
  async submitEmployerRequest(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/employer/request', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getEmployerStatus(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/employer/status');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async postJob(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/employer/jobs', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getAllJobs(category?: string, search?: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/employer/jobs', { params: { category, search } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getJobById(id: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get(`/employer/jobs/${id}`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async addJobComment(jobId: string, content: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post(`/employer/jobs/${jobId}/comments`, { content });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getJobComments(jobId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get(`/employer/jobs/${jobId}/comments`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getMyJobs(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/employer/me/jobs');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getEmployerAnalytics(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/employer/analytics');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async exportEmployerData(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/employer/export');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async updateEmployerSettings(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.put('/employer/settings', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getEmployerSchedules(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/employer/schedules');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async createEmployerSchedule(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/employer/schedules', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async deleteEmployerSchedule(id: string): Promise<ApiResponse> {
    try {
      const res = await this.api.delete(`/employer/schedules/${id}`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async applyForJob(jobId: string, coverLetter: string, resumeUrl?: string): Promise<ApiResponse> {
    try {
      const res = await this.api.post(`/employer/jobs/${jobId}/apply`, { coverLetter, resumeUrl });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getApplications(jobId?: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/employer/applications', { params: { jobId } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async updateApplicationStatus(id: string, status: string): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/employer/applications/${id}/status`, { status });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getEmployerRecentChats(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/employer/recent-chats');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  // Admin
  async getPendingSchools(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/admin/schools/pending');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async approveSchool(id: string): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/admin/schools/${id}/approve`);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async blockSchool(id: string, reason: string): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/admin/schools/${id}/block`, { reason });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getModerationFeed(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/admin/moderation/feed');
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async moderateContent(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/admin/moderation/action', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getLegalDocs(): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/legal');
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

  async submitFeedback(data: any): Promise<ApiResponse> {
    try {
      const res = await this.api.post('/support/feedback', data);
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  // General
  async checkUpdate(version: string, userId?: string): Promise<ApiResponse> {
    try {
      const res = await this.api.get('/check-update', { params: { version, userId } });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  async getCurrentUser(): Promise<any> {
    try {
      const userString = await AsyncStorage.getItem('user');
      return userString ? JSON.parse(userString) : null;
    } catch (error) { return null; }
  }

  // Helper pour obtenir les infos de l'appareil de manière sécurisée (Web/Mobile)
  async getDeviceInfo() {
    if (Platform.OS === 'web') {
      return {
        brand: 'Browser',
        model: window.navigator.userAgent.split(' ')[0],
        os: 'Web',
        version: window.navigator.userAgent
      };
    }
    const Device = require('expo-device');
    return {
      brand: Device.brand || 'Unknown',
      model: Device.modelName || 'Unknown',
      os: Device.osName || 'Unknown',
      version: Device.osVersion || 'Unknown'
    };
  }

  async uploadFile(file: any, type: string = 'image'): Promise<ApiResponse> {
    try {
      const formData = new FormData();

      // Adaptation pour Expo ImagePicker et DocumentPicker
      const fieldName = type === 'audio' ? 'audio' : (type === 'image' ? 'image' : (type === 'video' ? 'video' : (type === 'document' ? 'document' : 'file')));

      if (Platform.OS === 'web') {
        // Sur Web, on doit convertir l'URI en Blob/File
        const response = await fetch(file.uri);
        const blob = await response.blob();
        formData.append(fieldName, blob, file.name || `upload_${Date.now()}`);
      } else {
        formData.append(fieldName, {
          uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
          type: file.mimeType || file.type || (type === 'image' ? 'image/jpeg' : 'application/octet-stream'),
          name: file.fileName || file.name || `upload_${Date.now()}${type === 'image' ? '.jpg' : ''}`
        } as any);
      }

      // Route spécifique ou générique
      const uploadRoute = (['image', 'audio', 'video', 'document'].includes(type)) ? `/upload/${type}` : '/upload';

      const res = await this.api.post(uploadRoute, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch (e: any) { return this.handleError(e); }
  }

  private handleError(error: any): ApiResponse {
    const errorData = error.response?.data;
    const errorMessage = typeof errorData?.error === 'string'
      ? errorData.error
      : (errorData?.message || errorData?.error?.message || error.message || 'Server error');

    if (error.response) {
      return { success: false, error: errorMessage, statusCode: error.response.status };
    }
    return { success: false, error: errorMessage, message: 'Erreur réseau' };
  }
}

export default ApiService.getInstance();
