import { PRIORITIES } from './validation.js';

/**
 * localStorage adapter.
 * Only this module touches the Web Storage API; the rest of the app works
 * with plain JavaScript objects.
 */

export const STORAGE_KEY = 'taskmanager.tasks.v1';

/**
 * Guards against corrupted or hand-edited storage entries.
 * @param {unknown} value
 * @returns {boolean}
 */
function isValidTask(value) {
  if (value === null || typeof value !== 'object') return false;

  const task = /** @type {Record<string, unknown>} */ (value);

  return (
    typeof task.id === 'string' &&
    task.id.length > 0 &&
    typeof task.title === 'string' &&
    task.title.trim().length > 0 &&
    typeof task.completed === 'boolean' &&
    typeof task.priority === 'string' &&
    PRIORITIES.includes(task.priority) &&
    typeof task.createdAt === 'string' &&
    !Number.isNaN(Date.parse(task.createdAt))
  );
}

/**
 * Reads and validates the persisted task list.
 * @returns {Array<object>} An empty array when there is nothing valid to restore.
 */
export function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isValidTask);
  } catch (error) {
    console.error('[storage] Could not read localStorage:', error);
    return [];
  }
}

/**
 * Serializes the full task list into localStorage.
 * @param {Array<object>} tasks
 * @returns {boolean} Whether the write succeeded.
 */
export function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error('[storage] Could not write to localStorage:', error);
    return false;
  }
}
