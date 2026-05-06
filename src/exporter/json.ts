/**
 * JSON exporter - exports graph to JSON file
 * Based on: openspec/changes/ts-dep-implementation/tasks.md (T009)
 * Related specs: openspec/specs/types.md, openspec/changes/ts-dep-implementation/design.md
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import type { Graph } from '../types/global.ts';

/**
 * Экспортирует граф в JSON файл
 */
export async function exportGraph(graph: Graph, outputFile: string): Promise<void> {
  const absolutePath = resolve(outputFile);
  
  // Создаём директории если они не существуют
  const dir = dirname(absolutePath);
  try {
    mkdirSync(dir, { recursive: true });
  } catch (error) {
    // Директория уже существует или ошибка создания
  }
  
  // Сериализуем граф в JSON
  const jsonContent = JSON.stringify(graph, (key, value) => {
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
