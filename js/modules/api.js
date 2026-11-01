import { PRIORITIES } from './validation.js';

/**
 * JSONPlaceholder service.
 * The public endpoint does not model priority or creation date, so the
 * adapter maps every remote record into the app's own task shape.
 */

const API_URL = 'https://jsonplaceholder.typicode.com/todos?_limit=12';
const REQUEST_TIMEOUT_MS = 8000;
const DAY_IN_MS = 86_400_000;

/**
 * Fetches the remote tasks and maps them into local task objects.
 * Throws on network failures, timeouts and non-2xx responses so the caller
 * can show a friendly notification.
 * @returns {Promise<Array<object>>}
 */
export async function fetchTodos() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error('API returned an unexpected payload shape');
    }

    return payload.map(mapTodoToTask);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * @param {{ id: number, title: string, completed: boolean }} todo
 * @returns {object}
 */
function mapTodoToTask(todo) {
  return {
    id: `api-${todo.id}`,
    apiId: todo.id,
    title: normalizeTitle(todo.title),
    completed: Boolean(todo.completed),
    priority: PRIORITIES[todo.id % PRIORITIES.length],
    createdAt: new Date(Date.now() - todo.id * DAY_IN_MS).toISOString(),
    source: 'api',
  };
}

/**
 * JSONPlaceholder returns lowercase titles. Capitalizing the first letter
 * keeps the list readable without altering the user's own tasks.
 * @param {string} title
 * @returns {string}
 */
function normalizeTitle(title) {
  const text = String(title ?? '').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
