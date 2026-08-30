import io, { Socket } from 'socket.io-client';
import { SOCKET_URL, APP_VERSION } from '../utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

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
      // Vérifier que l'URL socket est configurée
      if (!SOCKET_URL || SOCKET_URL.includes('YOUR_SOCKET_URL') || SOCKET_URL.includes('localhost')) {
        console.warn('Socket URL not properly configured:', SOCKET_URL);
        return;
      }

      const token = await AsyncStorage.getItem('auth_token');
      const userString = await AsyncStorage.getItem('user');

      if (!token || !userString) {
        console.warn('No auth token or user found. Socket connection deferred.');
        return;
      }

      let user = null;
      try {
        user = JSON.parse(userString);
      } catch (e) {
        console.error('Error parsing user for socket:', e);
        return;
      }

      if (!user || !user.id) {
        console.warn('Invalid user object for socket connection.');
        return;
      }

      // Valider le token
      if (token.length < 10) {
        console.warn('Invalid token length for socket.');
        return;
      }

      // Configuration sécurisée du socket
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'], // Fallback sur polling
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 30000,
        query: {
          token,
          userId: user.id,
          platform: Platform.OS,
          version: APP_VERSION
        },
        auth: {
          token
        },
        forceNew: true,
        multiplex: false
      });

      this.setupEventListeners();
      this.setupSocketEvents();

      // Timeout de connexion
      const connectionTimeout = setTimeout(() => {
        if (!this.isConnected) {
          console.warn('Socket connection timeout');
          this.disconnect();
        }
      }, 15000);

      // Nettoyer le timeout
      this.socket.on('connect', () => {
        clearTimeout(connectionTimeout);
      });

    } catch (error) {
      console.error('Error initializing socket:', error);
      // Réinitialiser l'état en cas d'erreur
      this.socket = null;
      this.isConnected = false;
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

    // Notification events (Désactivés sans Firebase)
    /*
    this.socket.on('push_notification', (data) => {
      console.log('Push notification:', data);
      this.emitEvent('push_notification', data);
      
      // Show alert for important notifications
      if (data.title && data.body) {
        Alert.alert(data.title, data.body);
      }
    });
    */

    this.socket.on('user_chats', (data) => {
      console.log('User chats updated:', data);
      this.emitEvent('user_chats', data);
    });

    // Legal & System updates
    this.socket.on('legal_update', (data) => {
      console.log('Legal update received:', data);
      this.emitEvent('legal_update', data);
    });

    this.socket.on('app_config_update', (data) => {
      console.log('App config update received:', data);
      this.emitEvent('app_config_update', data);
    });

    // Call signaling & history
    this.socket.on('call:history_update', (data) => {
      console.log('Call history update received:', data);
      this.emitEvent('call:history_update', data);
    });

    this.socket.on('call:ring', (data) => {
      console.log('Call ring received:', data);
      this.emitEvent('call:ring', data);
    });

    this.socket.on('call:accepted', (data) => {
      console.log('Call accepted received:', data);
      this.emitEvent('call:accepted', data);
    });

    this.socket.on('call:rejected', (data) => {
      console.log('Call rejected received:', data);
      this.emitEvent('call:rejected', data);
    });

    this.socket.on('call:hangup', (data) => {
      console.log('Call hangup received:', data);
      this.emitEvent('call:hangup', data);
    });

    this.socket.on('call:timeout', (data) => {
      console.log('Call timeout received:', data);
      this.emitEvent('call:timeout', data);
    });

    this.socket.on('call:busy', (data) => {
      console.log('Call busy received:', data);
      this.emitEvent('call:busy', data);
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
    try {
      if (this.socket && !this.isConnected) {
        this.socket.connect();
      } else if (!this.socket) {
        await this.initialize();
      }
    } catch (error) {
      console.error('Socket connect error:', error);
      throw error;
    }
  }

  disconnect(): void {
    try {
      if (this.socket) {
        // Supprimer tous les listeners pour éviter les memory leaks
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
        this.isConnected = false;
        this.emitEvent('disconnected', { reason: 'manual' });
      }
    } catch (error) {
      console.error('Socket disconnect error:', error);
      // Forcer la réinitialisation même en cas d'erreur
      this.socket = null;
      this.isConnected = false;
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
    try {
      if (!this.socket) {
        await this.initialize();
        // Attendre que le socket soit prêt
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!this.socket || !this.isConnected) {
        // Tentative de connexion si pas connecté
        if (this.socket && !this.isConnected) {
          this.socket.connect();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (!this.isConnected) {
          throw new Error('Socket not connected for authentication');
        }
      }

      const token = await AsyncStorage.getItem('auth_token');
      const userString = await AsyncStorage.getItem('user');

      if (!token || !userString) {
        throw new Error('No authentication data available');
      }

      const user = JSON.parse(userString);

      // Valider les données avant envoi
      if (!user || !user.id || typeof user.id !== 'string') {
        throw new Error('Invalid user data for authentication');
      }

      (this.socket as any).emit('authenticate', {
        userId: user.id,
        token,
        timestamp: Date.now()
      });
      
      // Timeout pour l'authentification
      setTimeout(() => {
        if (!this.isConnected) {
          console.warn('Authentication timeout');
        }
      }, 10000);
      
    } catch (error) {
      console.error('Error authenticating socket:', error);
      this.emitEvent('authentication_error', { 
        error: (error as any).message || error,
        timestamp: Date.now() 
      });
      
      // Tentative de reconnexion après erreur d'authentification
      setTimeout(() => {
        this.reconnect();
      }, 5000);
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

  emit(event: string, data: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.error(`Cannot emit ${event}: socket not connected`);
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