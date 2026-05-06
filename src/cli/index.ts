#!/usr/bin/env bun
/**
 * CLI entry point for ts-dep
 * Based on: openspec/changes/ts-dep-implementation/tasks.md (T003)
 * Related specs: openspec/specs/architecture.md, openspec/changes/ts-dep-implementation/design.md
 */

import { Command } from 'commander';
import { loadConfig } from '../config/loader.ts';
import { scanNxPackages } from '../scanner/nx.ts';
import { analyzePackages } from '../analyzer/parser.ts';
import { buildGraph } from '../graph/builder.ts';
import { exportGraph } from '../exporter/json.ts';
import { startServer } from '../server/index.ts';
import type { TsDepConfig } from '../types/global.ts';

const program = new Command();

program
  .name('ts-dep')
  .description('CLI-библиотека для статического анализа зависимостей в TypeScript-проектах')
  .version('1.0.0')
  .option('-c, --config <path>', 'Путь к конфигурационному файлу', 'ts-dep.config.ts')
  .option('-p, --port <number>', 'Порт для HTTP-сервера')
  .option('--no-open', 'Не открывать браузер автоматически')
  .option('-v, --verbose', 'Включить подробное логирование')
  .action(async (options) => {
    try {
      console.log('[INFO] Starting ts-dep analysis...');
      
      // Load configuration
      const configResult = await loadConfig(options.config);
      if (!configResult.success) {
        console.error('[ERROR] Configuration validation failed:');
        configResult.errors.forEach(err => console.error(`  - ${err.message}`));
        process.exit(1);
      }
      
      const config: TsDepConfig = {
        ...configResult.config,
        ...(options.port && { port: parseInt(options.port) }),
        ...(options.open === false && { openBrowser: false }),
        ...(options.verbose && { logLevel: 'debug' as const })
      };
      
      console.log(`[INFO] Configuration loaded: port=${config.port}, root=${config.projectRoot}`);
      
      // Scan packages
      console.log('[INFO] Scanning NX packages...');
      const scannerResult = await scanNxPackages(config);
      console.log(`[INFO] Found ${scannerResult.packages.length} packages`);
      
      if (scannerResult.skippedPaths.length > 0) {
        console.log(`[WARN] Skipped ${scannerResult.skippedPaths.length} paths`);
      }
      
      // Analyze packages
      console.log('[INFO] Analyzing TypeScript files...');
      const analyzedFiles = await analyzePackages(scannerResult.packages, config);
      console.log(`[INFO] Analyzed ${analyzedFiles.length} files`);
      
      // Build graph
      console.log('[INFO] Building dependency graph...');
      const graph = await buildGraph(analyzedFiles, scannerResult.packages);
      console.log(`[INFO] Graph built: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
      
      // Export graph
      console.log('[INFO] Exporting graph...');
      await exportGraph(graph, config.outputFile);
      console.log(`[INFO] Graph exported to ${config.outputFile}`);
      
      // Start server
      console.log(`[INFO] Starting HTTP server on port ${config.port}...`);
      await startServer(config.port, graph, config.openBrowser);
      
      if (config.openBrowser) {
        console.log('[INFO] Opening browser...');
        // Browser opening will be handled by server module
      }
      
      console.log('[INFO] Analysis complete!');
    } catch (error) {
      console.error('[ERROR] Fatal error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse(process.argv);
