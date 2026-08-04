import io, { Socket } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Types
interface SocketEvent {
  type: string;
  data: any;
}

interface SocketMessage {
  chatId: string;
  message: any;
}

interface SocketUserStatus {
  userId: string;
  status: string;
  lastSeen: Date;
}

interface SocketTyping {
  chatId: string;
  userId: string;
}

interface SocketReaction {
  messageId: string;
  reaction: {
    user: string;
    emoji: string;
  };
  reactions: any[];
}

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  // Initialize socket connection
  async initialize(): Promise<void> {
    if (this.socket && this.isConnected) {
      console.log('Socket already connected');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;

      if (!token || !user) {
        console.warn('No auth token or user found. Socket connection deferred.');
        return;
      }

      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        query: {
          token,
        },
      });

      this.setupEventListeners();
      this.setupSocketEvents();

    } catch (error) {
      console.error('Error initializing socket:', error);
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emitEvent('connected', { socketId: this.socket?.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      this.emitEvent('disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.emitEvent('connection_error', { error: error.message });
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Socket reconnect attempt ${attemptNumber}`);
      this.reconnectAttempts = attemptNumber;
      this.emitEvent('reconnect_attempt', { attemptNumber });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
      this.emitEvent('reconnected', { attemptNumber });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnect failed');
      this.emitEvent('reconnect_failed', {});
    });

    // Authentication events
    this.socket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data);
      this.emitEvent('authenticated', data);
    });

    this.socket.on('authentication_error', (error) => {
      console.error('Socket authentication error:', error);
      this.emitEvent('authentication_error', error);
    });

    // Chat events
    this.socket.on('new_message', (data: SocketMessage) => {
      console.log('New message received:', data);
      this.emitEvent('new_message', data);
    });

    this.socket.on('message_read', (data) => {
      console.log('Message read:', data);
      this.emitEvent('message_read', data);
    });

    this.socket.on('message_delivered', (data) => {
      console.log('Message delivered:', data);
      this.emitEvent('message_delivered', data);
    });

    this.socket.on('message_edited', (data) => {
      console.log('Message edited:', data);
      this.emitEvent('message_edited', data);
    });

    this.socket.on('message_deleted', (data) => {
      console.log('Message deleted:', data);
      this.emitEvent('message_deleted', data);
    });

    this.socket.on('message_reaction', (data: SocketReaction) => {
      console.log('Message reaction:', data);
      this.emitEvent('message_reaction', data);
    });

    // User events
    this.socket.on('user_status_changed', (data: SocketUserStatus) => {
      console.log('User status changed:', data);
      this.emitEvent('user_status_changed', data);
    });

    this.socket.on('user_typing', (data: SocketTyping) => {
      console.log('User typing:', data);
      this.emitEvent('user_typing', data);
    });

    this.socket.on('user_stopped_typing', (data: SocketTyping) => {
      console.log('User stopped typing:', data);
      this.emitEvent('user_stopped_typing', data);
    });

    // Notification events
    this.socket.on('push_notification', (data) => {
      console.log('Push notification:', data);
      this.emitEvent('push_notification', data);
      
      // Show alert for important notifications
      if (data.title && data.body) {
        Alert.alert(data.title, data.body);
      }
    });

    this.socket.on('user_chats', (data) => {
      console.log('User chats updated:', data);
      this.emitEvent('user_chats', data);
    });

    // Error events
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emitEvent('error', error);
    });
  }

  private setupSocketEvents(): void {
    // Nothing to do here for now
  }

  // Public methods
  async connect(): Promise<void> {
    if (this.socket && !this.isConnected) {
      this.socket.connect();
    } else if (!this.socket) {
      await this.initialize();
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.emitEvent('disconnected', { reason: 'manual' });
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Authentication
  async authenticate(): Promise<void> {
    if (!this.socket) {
      await this.initialize();
      return;
    }

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;

      if (!token || !user) {
        throw new Error('No authentication data available');
      }

      this.socket.emit('authenticate', {
        userId: user.id,
        token,
      });
    } catch (error) {
      console.error('Error authenticating socket:', error);
      this.emitEvent('authentication_error', { error: error.message });
    }
  }

  // Chat operations
  joinChat(chatId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_chat', chatId);
      console.log(`Joined chat: ${chatId}`);
    }
  }

  leaveChat(chatId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_chat', chatId);
      console.log(`Left chat: ${chatId}`);
    }
  }

  sendMessage(data: {
    chatId: string;
    content: string;
    type: string;
    replyTo?: string;
    audioDuration?: number;
    fileName?: string;
    fileSize?: number;
  }): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('send_message', data);
      console.log('Message sent:', data);
    } else {
      console.error('Cannot send message: socket not connected');
    }
  }

  markAsRead(messageId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('mark_as_read', { messageId });
      console.log('Marked as read:', messageId);
    }
  }

  markAsDelivered(messageId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('mark_as_delivered', { messageId });
      console.log('Marked as delivered:', messageId);
    }
  }

  reactToMessage(messageId: string, emoji: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('react_to_message', { messageId, emoji });
      console.log('Reaction sent:', { messageId, emoji });
    }
  }

  editMessage(messageId: string, newContent: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('edit_message', { messageId, newContent });
      console.log('Message edit sent:', { messageId, newContent });
    }
  }

  deleteMessage(messageId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('delete_message', { messageId });
      console.log('Delete message sent:', messageId);
    }
  }

  // User status
  updateStatus(status: 'online' | 'offline' | 'away' | 'busy'): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('update_status', { status });
      console.log('Status updated:', status);
    }
  }

  // Typing indicators
  startTyping(chatId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing', { chatId });
      console.log('Typing started in chat:', chatId);
    }
  }

  stopTyping(chatId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('stop_typing', { chatId });
      console.log('Typing stopped in chat:', chatId);
    }
  }

  // Event handling
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Cleanup
  cleanup(): void {
    this.eventListeners.clear();
    this.disconnect();
  }

  // Reconnection
  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    console.log('Attempting to reconnect socket...');
    this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.initialize();
  }

  // Get connection stats
  getConnectionStats(): {
    connected: boolean;
    socketId?: string;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

export default SocketService.getInstance();