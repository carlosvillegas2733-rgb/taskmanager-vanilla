import * as store from './taskStore.js';

/**
 * DOM layer. Renders state from the store and translates user gestures into
 * store operations. It never talks to the API or to localStorage directly.
 */

const PRIORITY_LABELS = { alta: 'Alta', media: 'Media', baja: 'Baja' };
const SVG_OPEN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';

const ICONS = {
  check: `${SVG_OPEN}<path d="M20 6 9 17l-5-5"/></svg>`,
  edit: `${SVG_OPEN}<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  trash: `${SVG_OPEN}<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>`,
  success: `${SVG_OPEN}<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="M22 4 12 14.01l-3-3"/></svg>`,
  error: `${SVG_OPEN}<circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,
  warning: `${SVG_OPEN}<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  info: `${SVG_OPEN}<circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
};

const dateFormatter = new Intl.DateTimeFormat('es-EC', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

let els = null;
let editingId = null;
let pendingDeleteId = null;

/**
 * Wires the DOM once and performs the first render.
 * @param {{ onSync?: () => void }} options
 */
export function initUI({ onSync } = {}) {
  els = cacheElements();
  bindEvents(onSync);
  syncControls();
  render();
}

/** Re-renders every derived section from the current store state. */
export function render() {
  if (!els) return;

  const metrics = store.getMetrics();
  const visibleTasks = store.getVisibleTasks();

  updateMetrics(metrics);
  renderList(visibleTasks);
  updateResultCount(visibleTasks.length, metrics.total);
  updateFilterButtons();

  els.storageBadge.textContent = `${metrics.total} tareas en localStorage`;
}

/** @param {boolean} isOnline */
export function setNetworkStatus(isOnline) {
  if (!els) return;

  els.networkStatus.dataset.state = isOnline ? 'online' : 'offline';
  els.networkStatus.querySelector('.status__label').textContent = isOnline
    ? 'En línea'
    : 'Sin conexión';
}

/** @param {boolean} isLoading */
export function setSyncLoading(isLoading) {
  if (!els) return;

  els.syncButton.disabled = isLoading;
  els.syncButton.classList.toggle('is-loading', isLoading);
  els.syncButton.querySelector('.btn__label').textContent = isLoading
    ? 'Sincronizando...'
    : 'Sincronizar API';
}

/**
 * Shows a transient notification.
 * @param {string} message
 * @param {'success' | 'error' | 'warning' | 'info'} type
 */
export function showToast(message, type = 'info') {
  if (!els) return;

  while (els.toasts.children.length >= 4) {
    els.toasts.firstElementChild.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const icon = document.createElement('span');
  icon.className = 'toast__icon';
  icon.innerHTML = ICONS[type] ?? ICONS.info;

  const text = document.createElement('p');
  text.className = 'toast__text';
  text.textContent = message;

  toast.append(icon, text);
  els.toasts.append(toast);

  window.requestAnimationFrame(() => toast.classList.add('is-visible'));

  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 240);
  }, type === 'error' ? 6000 : 4200);
}

/* -------------------------------------------------------------------------- */
/* Rendering                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * @param {{ total: number, pending: number, completed: number, progress: number }} metrics
 */
function updateMetrics(metrics) {
  els.metricTotal.textContent = String(metrics.total);
  els.metricPending.textContent = String(metrics.pending);
  els.metricCompleted.textContent = String(metrics.completed);
  els.metricProgress.textContent = `${metrics.progress}%`;
  els.progressFill.style.width = `${metrics.progress}%`;
  els.progressBar.setAttribute('aria-valuenow', String(metrics.progress));
}

/**
 * @param {Array<object>} visibleTasks
 */
function renderList(visibleTasks) {
  els.list.replaceChildren();

  const isEmpty = visibleTasks.length === 0;
  updateEmptyState(isEmpty);

  if (isEmpty) return;

  const fragment = document.createDocumentFragment();
  for (const task of visibleTasks) {
    fragment.append(createTaskItem(task));
  }
  els.list.append(fragment);
}

/**
 * @param {object} task
 * @returns {HTMLLIElement}
 */
function createTaskItem(task) {
  const item = document.createElement('li');
  item.className = 'task';
  item.dataset.id = task.id;
  if (task.completed) item.classList.add('is-completed');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'task__toggle';
  toggle.dataset.action = 'toggle';
  toggle.setAttribute('role', 'checkbox');
  toggle.setAttribute('aria-checked', String(task.completed));
  toggle.setAttribute(
    'aria-label',
    task.completed
      ? `Marcar «${task.title}» como pendiente`
      : `Marcar «${task.title}» como completada`,
  );
  toggle.innerHTML = task.completed ? ICONS.check : '';

  const body = document.createElement('div');
  body.className = 'task__body';

  const title = document.createElement('h3');
  title.className = 'task__title';
  title.textContent = task.title;

  const meta = document.createElement('div');
  meta.className = 'task__meta';

  const badge = document.createElement('span');
  badge.className = `badge badge--${task.priority}`;
  badge.textContent = PRIORITY_LABELS[task.priority] ?? task.priority;

  const date = document.createElement('span');
  date.className = 'task__date';
  date.textContent = formatDate(task.createdAt);

  const origin = document.createElement('span');
  origin.className = 'task__origin';
  origin.textContent = task.source === 'api' ? 'Importada de la API' : 'Creada localmente';

  meta.append(badge, date, origin);
  body.append(title, meta);

  const actions = document.createElement('div');
  actions.className = 'task__actions';
  actions.append(
    createIconButton('edit', 'Editar tarea', task),
    createIconButton('delete', 'Eliminar tarea', task),
  );

  item.append(toggle, body, actions);
  return item;
}

/**
 * @param {'edit' | 'delete'} action
 * @param {string} label
 * @param {object} task
 * @returns {HTMLButtonElement}
 */
function createIconButton(action, label, task) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-btn';
  button.dataset.action = action;
  button.title = label;
  button.setAttribute('aria-label', `${label}: «${task.title}»`);
  button.innerHTML = action === 'edit' ? ICONS.edit : ICONS.trash;
  return button;
}

/**
 * @param {number} visibleCount
 * @param {number} totalCount
 */
function updateResultCount(visibleCount, totalCount) {
  if (visibleCount === totalCount) {
    els.resultCount.textContent = `${totalCount} ${totalCount === 1 ? 'tarea' : 'tareas'}`;
    return;
  }
  els.resultCount.textContent = `${visibleCount} de ${totalCount} tareas`;
}

/** @param {boolean} isEmpty */
function updateEmptyState(isEmpty) {
  els.list.hidden = isEmpty;
  els.emptyState.hidden = !isEmpty;

  if (!isEmpty) return;

  const { filter, query } = store.getFilters();
  const term = query.trim();

  if (term.length > 0) {
    els.emptyTitle.textContent = 'Sin coincidencias';
    els.emptyDescription.textContent = `No encontramos tareas que contengan «${term}». Prueba con otra búsqueda.`;
    return;
  }

  if (filter === 'pending') {
    els.emptyTitle.textContent = 'Nada pendiente';
    els.emptyDescription.textContent = 'No tienes tareas pendientes. Buen trabajo.';
    return;
  }

  if (filter === 'completed') {
    els.emptyTitle.textContent = 'Aún nada completado';
    els.emptyDescription.textContent =
      'Marca una tarea con el círculo de la izquierda para verla aquí.';
    return;
  }

  els.emptyTitle.textContent = 'Sin tareas por aquí';
  els.emptyDescription.textContent =
    'Crea tu primera tarea o sincroniza con la API para empezar.';
}

function updateFilterButtons() {
  const { filter } = store.getFilters();

  for (const button of els.filterButtons) {
    const isActive = button.dataset.filter === filter;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  }
}

/**
 * @param {string} isoDate
 * @returns {string}
 */
function formatDate(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return dateFormatter.format(date);
}

/* -------------------------------------------------------------------------- */
/* Events                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * @param {() => void} [onSync]
 */
function bindEvents(onSync) {
  els.newTaskButton.addEventListener('click', () => openTaskDialog());
  els.dialogClose.addEventListener('click', closeTaskDialog);
  els.dialogCancel.addEventListener('click', closeTaskDialog);
  els.taskForm.addEventListener('submit', handleSubmit);
  els.list.addEventListener('click', handleListClick);

  els.searchInput.addEventListener('input', (event) => {
    store.setQuery(event.target.value);
    render();
  });

  els.sortSelect.addEventListener('change', (event) => {
    store.setSort(event.target.value);
    render();
  });

  for (const button of els.filterButtons) {
    button.addEventListener('click', () => {
      store.setFilter(button.dataset.filter);
      render();
    });
  }

  els.taskTitle.addEventListener('input', () => clearFieldError('title'));
  els.taskPriority.addEventListener('change', () => clearFieldError('priority'));

  els.taskDialog.addEventListener('close', () => {
    editingId = null;
  });

  els.confirmCancel.addEventListener('click', () => els.confirmDialog.close());
  els.confirmAccept.addEventListener('click', confirmDelete);
  els.confirmDialog.addEventListener('close', () => {
    pendingDeleteId = null;
  });

  if (typeof onSync === 'function') {
    els.syncButton.addEventListener('click', () => onSync());
  }
}

/**
 * @param {SubmitEvent} event
 */
function handleSubmit(event) {
  event.preventDefault();

  const isEditing = editingId !== null;
  const input = {
    title: els.taskTitle.value,
    priority: els.taskPriority.value,
  };

  const result = isEditing
    ? store.updateTask(editingId, input)
    : store.addTask(input);

  if (!result.ok) {
    showFieldErrors(result.errors ?? {});
    return;
  }

  closeTaskDialog();
  render();

  if (result.persisted === false) {
    showToast(
      'La tarea se aplicó en pantalla, pero no se pudo escribir en localStorage. Revisa el espacio disponible.',
      'error',
    );
    return;
  }

  showToast(
    isEditing ? 'Tarea actualizada correctamente.' : 'Tarea creada correctamente.',
    'success',
  );
}

/**
 * @param {MouseEvent} event
 */
function handleListClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const item = button.closest('.task');
  const id = item?.dataset.id;
  if (!id) return;

  if (button.dataset.action === 'toggle') {
    const result = store.toggleTask(id);
    render();

    if (result.persisted === false) {
      showToast('No se pudo guardar el cambio en localStorage.', 'error');
    }
    return;
  }

  if (button.dataset.action === 'edit') {
    const task = store.getTaskById(id);
    if (task) openTaskDialog(task);
    return;
  }

  if (button.dataset.action === 'delete') {
    openConfirmDialog(id);
  }
}

/**
 * @param {object | null} task
 */
function openTaskDialog(task = null) {
  editingId = task?.id ?? null;

  els.dialogTitle.textContent = task ? 'Editar tarea' : 'Nueva tarea';
  els.dialogSubmit.textContent = task ? 'Guardar cambios' : 'Crear tarea';
  els.taskTitle.value = task?.title ?? '';
  els.taskPriority.value = task?.priority ?? '';
  clearFieldErrors();

  if (!els.taskDialog.open) {
    els.taskDialog.showModal();
  }
  els.taskTitle.focus();
}

function closeTaskDialog() {
  if (els.taskDialog.open) {
    els.taskDialog.close();
  }
}

/**
 * @param {string} id
 */
function openConfirmDialog(id) {
  const task = store.getTaskById(id);
  if (!task) return;

  pendingDeleteId = id;
  els.confirmMessage.textContent = `¿Seguro que quieres eliminar «${task.title}»? Esta acción no se puede deshacer.`;
  els.confirmDialog.showModal();
}

function confirmDelete() {
  if (!pendingDeleteId) return;

  const id = pendingDeleteId;
  pendingDeleteId = null;
  const result = store.removeTask(id);

  els.confirmDialog.close();
  render();

  if (result.persisted === false) {
    showToast('La tarea se eliminó en pantalla, pero localStorage no pudo actualizarse.', 'error');
    return;
  }

  showToast('Tarea eliminada.', 'info');
}

/* -------------------------------------------------------------------------- */
/* Form helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * @param {Record<string, string>} errors
 */
function showFieldErrors(errors) {
  if (errors.title) {
    els.titleError.textContent = errors.title;
    els.taskTitle.classList.add('is-invalid');
    els.taskTitle.setAttribute('aria-invalid', 'true');
  }

  if (errors.priority) {
    els.priorityError.textContent = errors.priority;
    els.taskPriority.classList.add('is-invalid');
    els.taskPriority.setAttribute('aria-invalid', 'true');
  }

  const firstInvalid = errors.title
    ? els.taskTitle
    : errors.priority
      ? els.taskPriority
      : null;

  if (firstInvalid) firstInvalid.focus();
}

/** @param {'title' | 'priority'} field */
function clearFieldError(field) {
  if (field === 'title') {
    els.titleError.textContent = '';
    els.taskTitle.classList.remove('is-invalid');
    els.taskTitle.removeAttribute('aria-invalid');
    return;
  }

  els.priorityError.textContent = '';
  els.taskPriority.classList.remove('is-invalid');
  els.taskPriority.removeAttribute('aria-invalid');
}

function clearFieldErrors() {
  clearFieldError('title');
  clearFieldError('priority');
}

/* -------------------------------------------------------------------------- */
/* DOM cache                                                                  */
/* -------------------------------------------------------------------------- */

function cacheElements() {
  return {
    metricTotal: document.getElementById('metric-total'),
    metricPending: document.getElementById('metric-pending'),
    metricCompleted: document.getElementById('metric-completed'),
    metricProgress: document.getElementById('metric-progress'),
    progressFill: document.getElementById('progress-fill'),
    progressBar: document.getElementById('progress-bar'),
    networkStatus: document.getElementById('network-status'),
    syncButton: document.getElementById('sync-button'),
    searchInput: document.getElementById('search-input'),
    sortSelect: document.getElementById('sort-select'),
    filterButtons: Array.from(document.querySelectorAll('[data-filter]')),
    newTaskButton: document.getElementById('new-task-button'),
    resultCount: document.getElementById('result-count'),
    list: document.getElementById('task-list'),
    emptyState: document.getElementById('empty-state'),
    emptyTitle: document.getElementById('empty-title'),
    emptyDescription: document.getElementById('empty-description'),
    storageBadge: document.getElementById('storage-badge'),
    taskDialog: document.getElementById('task-dialog'),
    taskForm: document.getElementById('task-form'),
    dialogTitle: document.getElementById('dialog-title'),
    dialogClose: document.getElementById('dialog-close'),
    dialogCancel: document.getElementById('dialog-cancel'),
    dialogSubmit: document.getElementById('dialog-submit'),
    taskTitle: document.getElementById('task-title'),
    taskPriority: document.getElementById('task-priority'),
    titleError: document.getElementById('title-error'),
    priorityError: document.getElementById('priority-error'),
    confirmDialog: document.getElementById('confirm-dialog'),
    confirmMessage: document.getElementById('confirm-message'),
    confirmCancel: document.getElementById('confirm-cancel'),
    confirmAccept: document.getElementById('confirm-accept'),
    toasts: document.getElementById('toasts'),
  };
}

/** Aligns the controls with the store defaults (single source of truth). */
function syncControls() {
  const { filter, query, sortBy } = store.getFilters();

  els.searchInput.value = query;
  els.sortSelect.value = sortBy;

  for (const button of els.filterButtons) {
    button.classList.toggle('is-active', button.dataset.filter === filter);
    button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
  }
}
