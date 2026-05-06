/**
 * HTTP server for serving the visualization frontend
 * Based on: openspec/changes/ts-dep-implementation/tasks.md (T014)
 * Related specs: openspec/specs/architecture.md, openspec/changes/ts-dep-implementation/design.md
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import open from 'open';
import type { Graph } from '../types/global.ts';
import { graphToJson } from '../exporter/json.ts';

// Пути к файлам фронтенда
const FRONTEND_DIR = join(dirname(import.meta.path), '..', 'frontend');

/**
 * Запускает HTTP сервер для обслуживания веб-интерфейса
 */
export async function startServer(port: number, graph: Graph, openBrowser = true): Promise<any> {
  const jsonContent = graphToJson(graph);
  
  const server = Bun.serve({
    port,
    fetch(req) {
      const url = new URL(req.url);
      const pathname = url.pathname;
      
      // Обработка запросов
      if (pathname === '/' || pathname === '/index.html') {
        return serveFile('index.html', 'text/html');
      }
      
      if (pathname === '/styles.css') {
        return serveFile('styles.css', 'text/css');
      }
      
      if (pathname === '/app.js' || pathname === '/app.ts') {
        return serveFile('app.ts', 'application/typescript');
      }
      
      if (pathname === '/graph.json') {
        return new Response(jsonContent, {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // Favicon
      if (pathname === '/favicon.ico') {
        return new Response('', { status: 204 });
      }
      
      // 404
      return new Response('Not Found', { status: 404 });
    }
  });
  
  console.log(`[INFO] Server running at http://localhost:${port}`);
  
  // Открываем браузер только если флаг установлен
  if (openBrowser) {
    setTimeout(() => {
      open(`http://localhost:${port}`).catch(err => {
        console.log(`[WARN] Failed to open browser: ${err.message}`);
      });
    }, 500);
  }
  
  return server;
}

/**
 * Вспомогательная функция для обслуживания файлов
 */
function serveFile(filename: string, contentType: string): Response {
  const filePath = join(FRONTEND_DIR, filename);
  
  if (!existsSync(filePath)) {
    return new Response(`File not found: ${filename}`, { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Останавливает сервер
 */
export async function stopServer(server: any): Promise<void> {
  server.stop();
  console.log('[INFO] Server stopped');
}
