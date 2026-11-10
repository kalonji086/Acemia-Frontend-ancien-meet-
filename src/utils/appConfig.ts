/**
 * Application Configuration
 * Centralized configuration for better stability and maintainability
 */

export const APP_CONFIG = {
  // Version management
  version: '96.0.0',
  buildNumber: 96,

  // Network configuration
  network: {
    // Timeouts in milliseconds
    defaultTimeout: 30000,       // 30 seconds for regular requests
    splashTimeout: 4000,          // 4 seconds for splash screen checks
    updateCheckTimeout: 8000,     // 8 seconds for update checks
    userCheckTimeout: 10000,      // 10 seconds for user validation (Render cold start)
    legalCheckTimeout: 4000,      // 4 seconds for legal docs check

    // Retry configuration
    maxRetries: 3,
    retryDelay: 1000,             // 1 second base delay (exponential backoff)

    // Socket configuration
    socketReconnectAttempts: 5,
    socketReconnectDelay: 1000,
    socketTimeout: 15000,
  },

  // Cache configuration
  cache: {
    // How long to keep user data locally (milliseconds)
    userSessionDuration: 10 * 24 * 60 * 60 * 1000, // 10 days
    passwordRequiredAfter: 2 * 24 * 60 * 60 * 1000, // 2 days
  },

  // Feature flags
  features: {
    enableSocketOnStartup: false,  // Socket initialized only when needed
    enableNetworkCheckOnStartup: false,  // Skip network check to speed up startup
    enableProGuard: false,         // Disabled for stability
    enableResourceShrinking: false, // Disabled for stability
  },

  // Error handling
  errorHandling: {
    enableGlobalErrorHandler: true,
    enableCrashReporting: false,   // Enable when Crashlytics is set up
    logErrorsToConsole: __DEV__,
  },

  // UI configuration
  ui: {
    splashScreenDelay: 300,        // Minimum time to show splash (ms)
    fallbackTimeout: 8000,         // Max time before forcing navigation (ms)
    animationDuration: 1000,       // Default animation duration (ms)
  },
};

/**
 * Get timeout with exponential backoff
 */
export function getTimeoutWithRetry(baseTimeout: number, retryCount: number): number {
  const multiplier = Math.pow(2, retryCount);
  return Math.min(baseTimeout * multiplier, 60000); // Max 60 seconds
}

/**
 * Check if the app should use cached data
 */
export function shouldUseCache(lastUpdate: number, maxAge: number = APP_CONFIG.cache.userSessionDuration): boolean {
  const now = Date.now();
  return (now - lastUpdate) < maxAge;
}

/**
 * Log error with context
 */
export function logError(context: string, error: any): void {
  if (APP_CONFIG.errorHandling.logErrorsToConsole) {
    console.error(`[${context}]`, error);
  }

  // TODO: Send to crash reporting service when enabled
  if (APP_CONFIG.errorHandling.enableCrashReporting) {
    // crashlytics().recordError(error);
  }
}
