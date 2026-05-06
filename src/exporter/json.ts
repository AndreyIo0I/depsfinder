/**
 * JSON exporter - exports graph to JSON file
 * Based on: openspec/changes/ts-dep-implementation/tasks.md (T009)
 * Related specs: openspec/specs/types.md, openspec/changes/ts-dep-implementation/design.md
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve, relative } from 'path';
import type { Graph, Node } from '../types/global.ts';

/**
 * Экспортирует граф в JSON файл с относительными путями
 */
export async function exportGraph(graph: Graph, outputFile: string, baseDir?: string): Promise<void> {
  const absolutePath = resolve(outputFile);
  
  // Создаём директории если они не существуют
  const dir = dirname(absolutePath);
  try {
    mkdirSync(dir, { recursive: true });
  } catch (error) {
    // Директория уже существует или ошибка создания
  }
  
  // Преобразуем абсолютные пути в относительные
  const graphWithRelativePaths = convertToRelativePaths(graph, baseDir || process.cwd());
  
  // Сортируем узлы и рёбра для стабильного порядка
  const sortedGraph = sortGraph(graphWithRelativePaths);
  
  // Сериализуем граф в JSON
  const jsonContent = JSON.stringify(sortedGraph, (key, value) => {
    // Специальная обработка Date объектов
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }, 2);
  
  // Записываем в файл
  writeFileSync(absolutePath, jsonContent, 'utf-8');
}

/**
 * Преобразует абсолютные пути в графе в относительные
 */
function convertToRelativePaths(graph: Graph, baseDir: string): Graph {
  return {
    ...graph,
    nodes: graph.nodes.map(node => {
      const newNode = { ...node };
      
      // Преобразуем filePath в относительный
      if (newNode.filePath) {
        newNode.filePath = relative(baseDir, newNode.filePath);
      }
      
      // Преобразуем id для file узлов (они содержат путь)
      if (newNode.id.startsWith('file:')) {
        const absolutePath = node.id.substring(5); // убираем 'file:'
        const relativePath = relative(baseDir, absolutePath);
        newNode.id = `file:${relativePath}`;
      }
      
      return newNode;
    }),
    edges: graph.edges.map(edge => {
      const newEdge = { ...edge };
      
      // Преобразуем source если это file узел
      if (newEdge.source.startsWith('file:')) {
        const absolutePath = edge.source.substring(5);
        const relativePath = relative(baseDir, absolutePath);
        newEdge.source = `file:${relativePath}`;
      }
      
      // Преобразуем target если это file узел
      if (newEdge.target.startsWith('file:')) {
        const absolutePath = edge.target.substring(5);
        const relativePath = relative(baseDir, absolutePath);
        newEdge.target = `file:${relativePath}`;
      }
      
      // Также нужно обновить id ребра если он содержит пути
      if (newEdge.id.includes('file:')) {
        // Заменяем все вхождения file:... на relative paths
        // Паттерн: file: за которым следует путь до пробела, : или конца строки
        newEdge.id = newEdge.id.replace(/file:[^\s:>]+/g, (match) => {
          const absolutePath = match.substring(5);
          const relativePath = relative(baseDir, absolutePath);
          return `file:${relativePath}`;
        });
      }
      
      return newEdge;
    })
  };
}

/**
 * Сортирует узлы и рёбра для стабильного порядка в JSON
 */
function sortGraph(graph: Graph): Graph {
  return {
    ...graph,
    nodes: [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...graph.edges].sort((a, b) => a.id.localeCompare(b.id))
  };
}

/**
 * Экспортирует граф как JSON строку
 */
export function graphToJson(graph: Graph): string {
  return JSON.stringify(graph, (key, value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }, 2);
}

/**
 * Загружает граф из JSON файла
 */
export function importGraph(jsonContent: string): Graph {
  const parsed = JSON.parse(jsonContent);
  
  // Восстанавливаем Date объекты
  if (parsed.metadata && parsed.metadata.createdAt) {
    parsed.metadata.createdAt = new Date(parsed.metadata.createdAt);
  }
  
  return parsed as Graph;
}
