import { validatePluginConfig, applyConfigDefaults } from '../validation';

describe('Telebirr Plugin Integration', () => {
  it('should validate configuration before applying plugin', () => {
    const validConfig = {
      appId: 'test-app-id',
      shortCode: '1234',
      environment: 'uat' as const,
    };

    const validation = validatePluginConfig(validConfig);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should reject invalid configuration', () => {
    const invalidConfig = {
      appId: '', // Invalid: empty string
      shortCode: '1234',
      environment: 'uat' as const,
    };

    const validation = validatePluginConfig(invalidConfig);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('appId is required and must be a non-empty string');
  });

  it('should apply defaults to configuration', () => {
    const pluginConfig = {
      appId: 'test-app-id',
      shortCode: '1234',
      environment: 'production' as const,
    };

    const result = applyConfigDefaults(pluginConfig);
    
    expect(result.enableLogging).toBe(false);
    expect(result.timeout).toBe(120);
    expect(result.customScheme).toBe('');
  });

  it('should preserve provided optional values', () => {
    const pluginConfig = {
      appId: 'test-app-id',
      shortCode: '1234',
      environment: 'uat' as const,
      enableLogging: true,
      timeout: 60,
      customScheme: 'myapp',
    };

    const result = applyConfigDefaults(pluginConfig);
    
    expect(result.enableLogging).toBe(true);
    expect(result.timeout).toBe(60);
    expect(result.customScheme).toBe('myapp');
  });
});