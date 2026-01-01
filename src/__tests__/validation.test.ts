import { validatePluginConfig, validatePaymentRequest, applyConfigDefaults } from '../validation';
import { TelebirrPluginConfig, PaymentRequest } from '../types';

describe('Plugin Configuration Validation', () => {
  describe('validatePluginConfig', () => {
    it('should validate a correct configuration', () => {
      const config: TelebirrPluginConfig = {
        appId: 'test-app-id',
        shortCode: '1234',
        environment: 'uat',
      };

      const result = validatePluginConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing required fields', () => {
      const config = {} as TelebirrPluginConfig;

      const result = validatePluginConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('appId is required and must be a non-empty string');
      expect(result.errors).toContain('shortCode is required and must be a non-empty string');
      expect(result.errors).toContain('environment is required');
    });

    it('should reject invalid environment values', () => {
      const config: TelebirrPluginConfig = {
        appId: 'test-app-id',
        shortCode: '1234',
        environment: 'invalid' as any,
      };

      const result = validatePluginConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('environment must be either "uat" or "production"');
    });

    it('should warn about extreme timeout values', () => {
      const config: TelebirrPluginConfig = {
        appId: 'test-app-id',
        shortCode: '1234',
        environment: 'uat',
        timeout: 10, // Too low
      };

      const result = validatePluginConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('timeout less than 30 seconds may cause payment failures');
    });
  });

  describe('validatePaymentRequest', () => {
    it('should validate a correct payment request', () => {
      const request: PaymentRequest = {
        appId: 'test-app-id',
        shortCode: '1234',
        receiveCode: 'TELEBIRR$BUYGOODS$5510$0.05$10527506c5822051eae86ffbeba60036387009$120m',
      };

      const result = validatePaymentRequest(request);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid receiveCode format', () => {
      const request: PaymentRequest = {
        appId: 'test-app-id',
        shortCode: '1234',
        receiveCode: 'invalid-format',
      };

      const result = validatePaymentRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('receiveCode must follow format: TELEBIRR$BUYGOODS$merch_code$total_amount$prepay_id$timeout_express');
    });

    it('should reject receiveCode with invalid amount', () => {
      const request: PaymentRequest = {
        appId: 'test-app-id',
        shortCode: '1234',
        receiveCode: 'TELEBIRR$BUYGOODS$5510$invalid$10527506c5822051eae86ffbeba60036387009$120m',
      };

      const result = validatePaymentRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('receiveCode amount must be a positive number');
    });
  });

  describe('applyConfigDefaults', () => {
    it('should apply sensible defaults', () => {
      const config: TelebirrPluginConfig = {
        appId: 'test-app-id',
        shortCode: '1234',
        environment: 'uat',
      };

      const result = applyConfigDefaults(config);
      expect(result.enableLogging).toBe(false);
      expect(result.customScheme).toBe('');
      expect(result.timeout).toBe(120);
    });

    it('should preserve provided optional values', () => {
      const config: TelebirrPluginConfig = {
        appId: 'test-app-id',
        shortCode: '1234',
        environment: 'uat',
        enableLogging: true,
        customScheme: 'myapp',
        timeout: 60,
      };

      const result = applyConfigDefaults(config);
      expect(result.enableLogging).toBe(true);
      expect(result.customScheme).toBe('myapp');
      expect(result.timeout).toBe(60);
    });
  });
});