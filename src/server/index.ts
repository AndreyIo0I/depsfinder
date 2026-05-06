/**
 * HTTP server for serving the visualization frontend
 * Based on: openspec/changes/ts-dep-implementation/tasks.md (T014)
 * Related specs: openspec/specs/architecture.md, openspec/changes/ts-dep-implementation/design.md
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve, relative } from 'path';
import open from 'open';
import type { Graph, Node } from '../types/global.ts';
import { graphToJson } from '../exporter/json.ts';

// Пути к файлам фронтенда
const FRONTEND_DIR = join(dirname(import.meta.path), '..', 'frontend');

/**
 * Преобразует относительные пути в графе обратно в абсолютные
 */
function convertToAbsolutePaths(graph: Graph, baseDir: string): Graph {
  return {
    ...graph,
    nodes: graph.nodes.map(node => {
      const newNode = { ...node };
      
      // Преобразуем filePath из относительного в абсолютный
      if (newNode.filePath && !newNode.filePath.startsWith('/')) {
        newNode.filePath = resolve(baseDir, newNode.filePath);
      }
      
      // Преобразуем id для file узлов
      if (newNode.id.startsWith('file:') && !newNode.id.substring(5).startsWith('/')) {
        const relativePath = node.id.substring(5);
        const absolutePath = resolve(baseDir, relativePath);
        newNode.id = `file:${absolutePath}`;
      }
      
      return newNode;
    }),
    edges: graph.edges.map(edge => {
      const newEdge = { ...edge };
      
      // Преобразуем source если это file узел
      if (newEdge.source.startsWith('file:') && !newEdge.source.substring(5).startsWith('/')) {
        const relativePath = edge.source.substring(5);
        const absolutePath = resolve(baseDir, relativePath);
        newEdge.source = `file:${absolutePath}`;
      }
      
      // Преобразуем target если это file узел
      if (newEdge.target.startsWith('file:') && !newEdge.target.substring(5).startsWith('/')) {
        const relativePath = edge.target.substring(5);
        const absolutePath = resolve(baseDir, relativePath);
        newEdge.target = `file:${absolutePath}`;
      }
      
      return newEdge;
    })
  };
}

/**
 * Запускает HTTP сервер для обслуживания веб-интерфейса
 */
export async function startServer(port: number, graph: Graph, openBrowser = true, baseDir?: string): Promise<any> {
  // Преобразуем граф с относительными путями обратно в абсолютные для frontend
  const graphWithAbsolutePaths = convertToAbsolutePaths(graph, baseDir || process.cwd());
  const jsonContent = graphToJson(graphWithAbsolutePaths);
  
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
      
      // Обработка запроса на bundled app.js с cytoscape
      if (pathname === '/app.bundle.js') {
        const bundlePath = join(dirname(import.meta.path), '..', '..', 'dist', 'app.bundle.js');
        if (existsSync(bundlePath)) {
          const bundledCode = readFileSync(bundlePath, 'utf-8');
          return new Response(bundledCode, {
            headers: {
              'Content-Type': 'application/javascript',
              'Access-Control-Allow-Origin': '*'
            }
          });
        } else {
          return new Response('Bundle not found. Run "bun build" first.', { 
            status: 404,
            headers: { 'Content-Type': 'text/plain' }
          });
        }
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
