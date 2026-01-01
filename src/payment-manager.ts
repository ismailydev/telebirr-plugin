import { NativeModules, Platform } from 'react-native';
import { PaymentRequest, PaymentResponse, TelebirrError, PaymentErrorCode } from './types';
import { validatePaymentRequest } from './validation';

// Native module interface
interface TelebirrNativeModule {
  startPayment(appId: string, shortCode: string, receiveCode: string): Promise<PaymentResponse>;
  isAppInstalled(): Promise<{ isInstalled: boolean }>;
}

// Error message for linking issues
const LINKING_ERROR =
  `The Expo Telebirr Plugin doesn't seem to be properly configured. Make sure:\n\n` +
  Platform.select({ 
    ios: "- You have run 'npx expo prebuild' and 'pod install'\n", 
    default: '' 
  }) +
  '- You have rebuilt the app after adding the plugin\n' +
  '- The plugin is properly configured in your app.config.js\n' +
  '- You are not using Expo Go (use a development build instead)\n';

// Get the native module with proper error handling
const TelebirrNative: TelebirrNativeModule = NativeModules.ExpoTelebirrPayment
  ? NativeModules.ExpoTelebirrPayment
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    ) as TelebirrNativeModule;

/**
 * Main payment manager class for Telebirr integration
 */
export class TelebirrPaymentManager {
  /**
   * Initiates a payment using Telebirr
   * 
   * @param request Payment request parameters
   * @returns Promise that resolves with payment result
   */
  static async startPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Validate request parameters
      const validation = validatePaymentRequest(request);
      if (!validation.isValid) {
        throw new TelebirrPaymentError(
          PaymentErrorCode.VALIDATION_ERROR,
          `Validation failed: ${validation.errors.join(', ')}`,
          'validation',
          { 
            details: { errors: validation.errors }
          }
        );
      }

      // Call native module
      const result = await TelebirrNative.startPayment(
        request.appId,
        request.shortCode,
        request.receiveCode
      );

      // Ensure timestamp is present
      if (!result.timestamp) {
        result.timestamp = Date.now();
      }

      return result;
    } catch (error) {
      // Handle and standardize errors
      throw TelebirrPaymentManager.handleError(error);
    }
  }

  /**
   * Checks if the Telebirr app is installed on the device
   * 
   * @returns Promise that resolves with installation status
   */
  static async isAppInstalled(): Promise<boolean> {
    try {
      const result = await TelebirrNative.isAppInstalled();
      return result.isInstalled;
    } catch (error) {
      // If we can't check, assume it's not installed
      console.warn('Could not check Telebirr app installation status:', error);
      return false;
    }
  }

  /**
   * Validates the plugin configuration
   * 
   * @returns Promise that resolves with validation status
   */
  static async validateConfiguration(): Promise<boolean> {
    try {
      // Try to call a native method to see if the module is properly linked
      await TelebirrNative.isAppInstalled();
      return true;
    } catch (error) {
      console.error('Telebirr plugin configuration validation failed:', error);
      return false;
    }
  }

  /**
   * Handles and standardizes errors from the native module
   */
  private static handleError(error: any): TelebirrError {
    if (error instanceof TelebirrPaymentError) {
      return error;
    }

    // Handle native module errors
    if (error?.code && error?.message) {
      const errorType = TelebirrPaymentManager.classifyError(error.code);
      return new TelebirrPaymentError(
        error.code,
        error.message,
        errorType,
        { details: { originalError: error } }
      );
    }

    // Handle generic errors
    const message = error?.message || String(error);
    
    if (message.includes('LINKING_ERROR') || message.includes('not properly configured')) {
      return new TelebirrPaymentError(
        PaymentErrorCode.SYSTEM_ERROR,
        'Plugin not properly configured. Please check your setup.',
        'system',
        { 
          details: { originalError: error },
          suggestions: [
            'Run npx expo prebuild',
            'Rebuild your app',
            'Check plugin configuration in app.config.js'
          ]
        }
      );
    }

    if (message.includes('network') || message.includes('connection')) {
      return new TelebirrPaymentError(
        PaymentErrorCode.NETWORK_ERROR,
        'Network error occurred during payment',
        'network',
        { details: { originalError: error } }
      );
    }

    // Default system error
    return new TelebirrPaymentError(
      PaymentErrorCode.SYSTEM_ERROR,
      message,
      'system',
      { details: { originalError: error } }
    );
  }

  /**
   * Classifies error codes into error types
   */
  private static classifyError(code: number): 'validation' | 'network' | 'payment' | 'system' {
    switch (code) {
      case PaymentErrorCode.PARAMETER_ERROR:
      case PaymentErrorCode.VALIDATION_ERROR:
        return 'validation';
      case PaymentErrorCode.NETWORK_ERROR:
        return 'network';
      case PaymentErrorCode.USER_CANCELLED:
      case PaymentErrorCode.APP_NOT_INSTALLED:
        return 'payment';
      default:
        return 'system';
    }
  }
}

/**
 * Custom error class for Telebirr payment errors
 */
export class TelebirrPaymentError extends Error implements TelebirrError {
  public readonly code: number;
  public readonly type: 'validation' | 'network' | 'payment' | 'system';
  public readonly details?: Record<string, any>;
  public readonly suggestions?: string[];

  constructor(
    code: number,
    message: string,
    type: 'validation' | 'network' | 'payment' | 'system',
    options?: {
      details?: Record<string, any>;
      suggestions?: string[];
    }
  ) {
    super(message);
    this.name = 'TelebirrPaymentError';
    this.code = code;
    this.type = type;
    this.details = options?.details;
    this.suggestions = options?.suggestions;
  }
}

// Export the payment manager as default
export default TelebirrPaymentManager;