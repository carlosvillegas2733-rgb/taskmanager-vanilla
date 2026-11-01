import { saveTasks } from './storage.js';
import { validateTaskInput } from './validation.js';

/**
 * Single source of truth for tasks and view preferences.
 * Every mutation persists the full list and returns whether the write worked.
 */

const PRIORITY_WEIGHT = { alta: 3, media: 2, baja: 1 };
const FILTERS = ['all', 'pending', 'completed'];
const SORT_OPTIONS = ['date-desc', 'date-asc', 'priority'];

let tasks = [];
let filter = 'all';
let query = '';
let sortBy = 'date-desc';

/**
 * @param {Array<object>} storedTasks
 */
export function init(storedTasks = []) {
  tasks = Array.isArray(storedTasks) ? [...storedTasks] : [];
}

/** @returns {{ filter: string, query: string, sortBy: string }} */
export function getFilters() {
  return { filter, query, sortBy };
}

/** @param {string} nextFilter */
export function setFilter(nextFilter) {
  if (FILTERS.includes(nextFilter)) filter = nextFilter;
}

/** @param {string} nextQuery */
export function setQuery(nextQuery) {
  query = String(nextQuery ?? '');
}

/** @param {string} nextSort */
export function setSort(nextSort) {
  if (SORT_OPTIONS.includes(nextSort)) sortBy = nextSort;
}

/**
 * @param {string} id
 * @returns {object | null}
 */
export function getTaskById(id) {
  return tasks.find((task) => task.id === id) ?? null;
}

/**
 * @param {{ title: string, priority: string }} input
 * @returns {{ ok: boolean, task?: object, errors?: Record<string, string>, persisted?: boolean }}
 */
export function addTask(input) {
  const result = validateTaskInput(input);
  if (!result.valid) return { ok: false, errors: result.errors };

  const task = {
    id: createId(),
    title: result.value.title,
    priority: result.value.priority,
    completed: false,
    createdAt: new Date().toISOString(),
    source: 'local',
  };

  tasks = [...tasks, task];
  return { ok: true, task, persisted: saveTasks(tasks) };
}

/**
 * @param {string} id
 * @param {{ title: string, priority: string }} input
 * @returns {{ ok: boolean, task?: object, errors?: Record<string, string>, persisted?: boolean }}
 */
export function updateTask(id, input) {
  if (!getTaskById(id)) {
    return { ok: false, errors: { title: 'La tarea ya no existe.' } };
  }

  const result = validateTaskInput(input);
  if (!result.valid) return { ok: false, errors: result.errors };

  tasks = tasks.map((task) =>
    task.id === id
      ? { ...task, title: result.value.title, priority: result.value.priority }
      : task,
  );

  return { ok: true, task: getTaskById(id), persisted: saveTasks(tasks) };
}

/**
 * @param {string} id
 * @returns {{ ok: boolean, persisted?: boolean }}
 */
export function toggleTask(id) {
  if (!getTaskById(id)) return { ok: false };

  tasks = tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task,
  );

  return { ok: true, persisted: saveTasks(tasks) };
}

/**
 * @param {string} id
 * @returns {{ ok: boolean, persisted?: boolean }}
 */
export function removeTask(id) {
  const nextTasks = tasks.filter((task) => task.id !== id);
  if (nextTasks.length === tasks.length) return { ok: false };

  tasks = nextTasks;
  return { ok: true, persisted: saveTasks(tasks) };
}

/**
 * Merges remote tasks without duplicating records.
 * API tasks are identified by their numeric `apiId`; local tasks by their id.
 * @param {Array<object>} incoming
 * @returns {{ ok: boolean, added: number, skipped: number, persisted: boolean }}
 */
export function importTasks(incoming = []) {
  const candidates = Array.isArray(incoming) ? incoming.filter(isImportable) : [];
  const knownKeys = new Set(tasks.map((task) => task.apiId ?? task.id));
  const merged = [...tasks];
  let added = 0;

  for (const candidate of candidates) {
    const key = candidate.apiId ?? candidate.id;
    if (knownKeys.has(key)) continue;

    knownKeys.add(key);
    merged.push(candidate);
    added += 1;
  }

  tasks = merged;
  return {
    ok: true,
    added,
    skipped: candidates.length - added,
    persisted: saveTasks(tasks),
  };
}

/**
 * Applies state filter, live search and sorting.
 * @returns {Array<object>}
 */
export function getVisibleTasks() {
  const normalizedQuery = query.trim().toLowerCase();

  return tasks
    .filter((task) => {
      if (filter === 'pending') return !task.completed;
      if (filter === 'completed') return task.completed;
      return true;
    })
    .filter((task) => normalizedQuery === '' || task.title.toLowerCase().includes(normalizedQuery))
    .sort(compareTasks);
}

/**
 * Dashboard metrics, derived from the full list (not the filtered view).
 * @returns {{ total: number, pending: number, completed: number, progress: number }}
 */
export function getMetrics() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = total - completed;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { total, pending, completed, progress };
}

/**
 * @param {object} a
 * @param {object} b
 * @returns {number}
 */
function compareTasks(a, b) {
  if (sortBy === 'priority') {
    const byPriority = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    if (byPriority !== 0) return byPriority;
    return new Date(b.createdAt) - new Date(a.createdAt);
  }

  if (sortBy === 'date-asc') {
    return new Date(a.createdAt) - new Date(b.createdAt);
  }

  return new Date(b.createdAt) - new Date(a.createdAt);
}

/**
 * @param {unknown} task
 * @returns {boolean}
 */
function isImportable(task) {
  if (task === null || typeof task !== 'object') return false;

  const candidate = /** @type {Record<string, unknown>} */ (task);
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.title === 'string' &&
    candidate.title.trim().length > 0
  );
}

/**
 * @returns {string}
 */
function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
