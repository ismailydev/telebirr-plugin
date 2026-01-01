/**
 * Configuration interface for the Telebirr Expo Config Plugin
 */
export interface TelebirrPluginConfig {
  /** Telebirr provided app ID */
  appId: string;
  /** Telebirr provided short code */
  shortCode: string;
  /** SDK environment - determines which SDK variant to use */
  environment: 'uat' | 'production';
  /** Enable detailed logging for development */
  enableLogging?: boolean;
  /** Custom URL scheme for iOS (optional, defaults to bundle identifier) */
  customScheme?: string;
  /** Payment timeout in seconds (optional, defaults to 120) */
  timeout?: number;
}

/**
 * Payment request interface
 */
export interface PaymentRequest {
  /** Must match plugin configuration appId */
  appId: string;
  /** Must match plugin configuration shortCode */
  shortCode: string;
  /** Receive code from Telebirr createOrder API response */
  receiveCode: string;
}

/**
 * Payment response interface
 */
export interface PaymentResponse {
  /** Payment result code */
  code: number;
  /** Human readable message */
  message: string;
  /** Transaction ID if available */
  transactionId?: string;
  /** Response timestamp */
  timestamp: number;
}

/**
 * Payment error codes based on Telebirr SDK documentation
 */
export enum PaymentErrorCode {
  /** Parameter error - missing or invalid parameters */
  PARAMETER_ERROR = -2,
  /** User cancelled the payment */
  USER_CANCELLED = -3,
  /** Telebirr app is not installed */
  APP_NOT_INSTALLED = -10,
  /** Network error */
  NETWORK_ERROR = -20,
  /** Validation error */
  VALIDATION_ERROR = -30,
  /** System error */
  SYSTEM_ERROR = -40,
}

/**
 * Error classification types
 */
export type ErrorType = 'validation' | 'network' | 'payment' | 'system';

/**
 * Structured error interface
 */
export interface TelebirrError {
  code: number;
  message: string;
  type: ErrorType;
  details?: Record<string, any>;
  suggestions?: string[];
}

/**
 * Plugin validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}