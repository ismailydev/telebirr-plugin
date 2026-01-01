import { TelebirrPluginConfig, ValidationResult, PaymentRequest } from './types';

/**
 * Validates the plugin configuration
 */
export function validatePluginConfig(config: TelebirrPluginConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field validation
  if (!config.appId || typeof config.appId !== 'string') {
    errors.push('appId is required and must be a non-empty string');
  } else if (config.appId.trim().length === 0) {
    errors.push('appId cannot be empty or whitespace only');
  }

  if (!config.shortCode || typeof config.shortCode !== 'string') {
    errors.push('shortCode is required and must be a non-empty string');
  } else if (config.shortCode.trim().length === 0) {
    errors.push('shortCode cannot be empty or whitespace only');
  }

  if (!config.environment) {
    errors.push('environment is required');
  } else if (!['uat', 'production'].includes(config.environment)) {
    errors.push('environment must be either "uat" or "production"');
  }

  // Optional field validation
  if (config.enableLogging !== undefined && typeof config.enableLogging !== 'boolean') {
    errors.push('enableLogging must be a boolean if provided');
  }

  if (config.customScheme !== undefined) {
    if (typeof config.customScheme !== 'string') {
      errors.push('customScheme must be a string if provided');
    } else if (config.customScheme.trim().length === 0) {
      errors.push('customScheme cannot be empty if provided');
    }
  }

  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number' || config.timeout <= 0) {
      errors.push('timeout must be a positive number if provided');
    } else if (config.timeout < 30) {
      warnings.push('timeout less than 30 seconds may cause payment failures');
    } else if (config.timeout > 300) {
      warnings.push('timeout greater than 5 minutes may provide poor user experience');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates payment request parameters
 */
export function validatePaymentRequest(request: PaymentRequest): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!request.appId || typeof request.appId !== 'string' || request.appId.trim().length === 0) {
    errors.push('appId is required and must be a non-empty string');
  }

  if (!request.shortCode || typeof request.shortCode !== 'string' || request.shortCode.trim().length === 0) {
    errors.push('shortCode is required and must be a non-empty string');
  }

  if (!request.receiveCode || typeof request.receiveCode !== 'string' || request.receiveCode.trim().length === 0) {
    errors.push('receiveCode is required and must be a non-empty string');
  } else {
    // Validate receiveCode format: TELEBIRR$BUYGOODS$merch_code$total_amount$prepay_id$timeout_express
    const receiveCodeParts = request.receiveCode.split('$');
    if (receiveCodeParts.length !== 6) {
      errors.push('receiveCode must follow format: TELEBIRR$BUYGOODS$merch_code$total_amount$prepay_id$timeout_express');
    } else {
      if (receiveCodeParts[0] !== 'TELEBIRR') {
        errors.push('receiveCode must start with "TELEBIRR"');
      }
      if (receiveCodeParts[1] !== 'BUYGOODS') {
        errors.push('receiveCode must have "BUYGOODS" as second component');
      }
      // Validate amount is a number
      const amount = parseFloat(receiveCodeParts[3]);
      if (isNaN(amount) || amount <= 0) {
        errors.push('receiveCode amount must be a positive number');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Provides sensible defaults for optional configuration parameters
 */
export function applyConfigDefaults(config: TelebirrPluginConfig): Required<TelebirrPluginConfig> {
  return {
    ...config,
    enableLogging: config.enableLogging ?? false,
    customScheme: config.customScheme ?? '',
    timeout: config.timeout ?? 120,
  };
}