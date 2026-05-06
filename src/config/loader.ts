/**
 * Configuration loader for ts-dep
 * Based on: openspec/changes/ts-dep-implementation/tasks.md (T004)
 * Related specs: openspec/specs/types.md, openspec/changes/ts-dep-implementation/design.md
 */

import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { DEFAULT_CONFIG, type TsDepConfig, type ConfigValidationResult, ConfigValidationError } from '../types/global.ts';

/**
 * Загружает конфигурацию из файла ts-dep.config.ts
 */
export async function loadConfig(configPath: string): Promise<ConfigValidationResult> {
  const errors: ConfigValidationError[] = [];
  
  // Проверяем существование файла конфигурации
  const absoluteConfigPath = resolve(configPath);
  
  if (!existsSync(absoluteConfigPath)) {
    console.log('[INFO] Config file not found, using defaults');
    return validateConfig(DEFAULT_CONFIG);
  }
  
  try {
    // Динамический импорт конфигурационного файла
    const configModule = await import(absoluteConfigPath);
    const userConfig: Partial<TsDepConfig> = configModule.default || configModule;
    
    // Merge с дефолтной конфигурацией
    const mergedConfig: TsDepConfig = {
      ...DEFAULT_CONFIG,
      ...userConfig
    };
    
    return validateConfig(mergedConfig);
  } catch (error) {
    errors.push(new ConfigValidationError(
      `Failed to load config file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      configPath
    ));
    return { success: false, errors };
  }
}

/**
 * Валидирует конфигурацию
 */
function validateConfig(config: TsDepConfig): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];
  
  // Validate port
  if (config.port < 1 || config.port > 65535) {
    errors.push(new ConfigValidationError('Port must be between 1 and 65535', 'port'));
  }
  
  // Validate projectRoot
  if (!config.projectRoot || typeof config.projectRoot !== 'string') {
    errors.push(new ConfigValidationError('projectRoot must be a non-empty string', 'projectRoot'));
  }
  
  // Validate packagesDir
  if (!config.packagesDir || typeof config.packagesDir !== 'string') {
    errors.push(new ConfigValidationError('packagesDir must be a non-empty string', 'packagesDir'));
  }
  
  // Validate excludePaths
  if (!Array.isArray(config.excludePaths)) {
    errors.push(new ConfigValidationError('excludePaths must be an array', 'excludePaths'));
  }
  
  // Validate outputFormat
  if (!['json', 'html'].includes(config.outputFormat)) {
    errors.push(new ConfigValidationError('outputFormat must be "json" or "html"', 'outputFormat'));
  }
  
  // Validate outputFile
  if (!config.outputFile || typeof config.outputFile !== 'string') {
    errors.push(new ConfigValidationError('outputFile must be a non-empty string', 'outputFile'));
  }
  
  // Validate openBrowser
  if (typeof config.openBrowser !== 'boolean') {
    errors.push(new ConfigValidationError('openBrowser must be a boolean', 'openBrowser'));
  }
  
  // Validate logLevel
  if (!['silent', 'error', 'warn', 'info', 'debug'].includes(config.logLevel)) {
    errors.push(new ConfigValidationError('logLevel must be one of: silent, error, warn, info, debug', 'logLevel'));
  }
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  return { success: true, config };
}
