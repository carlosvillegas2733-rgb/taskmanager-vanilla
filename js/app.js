import { fetchTodos } from './modules/api.js';
import { loadTasks } from './modules/storage.js';
import * as store from './modules/taskStore.js';
import {
  initUI,
  render,
  setNetworkStatus,
  setSyncLoading,
  showToast,
} from './modules/ui.js';

/**
 * Application entry point.
 * Boots the UI with persisted data and imports the remote tasks only when
 * there is nothing stored yet, so a reload never duplicates records.
 */

const OFFLINE_WORK_MESSAGE =
  'No pudimos cargar las tareas de la API. Revisa tu conexión: puedes crear tareas y se guardarán en este dispositivo.';

async function boot() {
  const storedTasks = loadTasks();
  store.init(storedTasks);

  initUI({ onSync: () => syncTasks({ initial: false }) });

  setNetworkStatus(navigator.onLine);
  window.addEventListener('online', () => {
    setNetworkStatus(true);
    showToast('Conexión restablecida.', 'success');
  });
  window.addEventListener('offline', () => {
    setNetworkStatus(false);
    showToast('Sin conexión. Sigues trabajando con tus tareas guardadas.', 'warning');
  });

  if (storedTasks.length === 0) {
    await syncTasks({ initial: true });
  }
}

/**
 * Fetches JSONPlaceholder and merges the result without duplicating records.
 * @param {{ initial: boolean }} options
 */
async function syncTasks({ initial }) {
  setSyncLoading(true);

  try {
    const remoteTasks = await fetchTodos();
    const result = store.importTasks(remoteTasks);

    render();

    if (result.persisted === false) {
      showToast(
        'Las tareas se cargaron en pantalla, pero no se pudo escribir en localStorage.',
        'warning',
      );
      return;
    }

    if (result.added === 0) {
      showToast('No hay tareas nuevas: todo está sincronizado.', 'info');
      return;
    }

    if (initial) {
      showToast(`Importamos ${result.added} tareas desde JSONPlaceholder.`, 'success');
    } else {
      showToast(
        `Sincronización completa: ${result.added} nuevas, ${result.skipped} ya existían.`,
        'success',
      );
    }
  } catch (error) {
    console.error('[app] Sync failed:', error);
    showToast(
      initial ? OFFLINE_WORK_MESSAGE : 'La sincronización falló. Tus tareas locales siguen intactas.',
      'error',
    );
  } finally {
    setSyncLoading(false);
  }
}

boot();
