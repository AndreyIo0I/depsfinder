/**
 * Конфигурация ts-dep для анализа самого себя
 */
export default {
  port: 8080,
  projectRoot: '.',
  packagesDir: 'src',  // Анализируем директорию src вместо packages
  excludePaths: ['node_modules', 'dist', 'build'],
  outputFormat: 'json' as const,
  outputFile: 'graph.json',
  openBrowser: true,
  logLevel: 'info' as const
};
