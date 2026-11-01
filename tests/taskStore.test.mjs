import assert from 'node:assert/strict';

/**
 * Logic tests for the store, validation and storage modules.
 * They run on Node with a localStorage stub, so no browser is required.
 *
 *   npm test
 */

const memory = new Map();

globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => {
    memory.set(key, String(value));
  },
  removeItem: (key) => {
    memory.delete(key);
  },
  clear: () => {
    memory.clear();
  },
};

const store = await import('../js/modules/taskStore.js');
const storage = await import('../js/modules/storage.js');
const { validateTaskInput } = await import('../js/modules/validation.js');

const results = { passed: 0, failed: 0 };

async function test(name, fn) {
  try {
    await fn();
    results.passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (error) {
    results.failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${error.message}`);
  }
}

function reset() {
  memory.clear();
  store.init([]);
  store.setFilter('all');
  store.setQuery('');
  store.setSort('date-desc');
}

function apiTask(id, title, completed, priority, daysAgo) {
  return {
    id: `api-${id}`,
    apiId: id,
    title,
    completed,
    priority,
    createdAt: new Date(Date.UTC(2026, 9, 20) - daysAgo * 86_400_000).toISOString(),
    source: 'api',
  };
}

function validStoredTask(overrides = {}) {
  return {
    id: 'stored-1',
    title: 'Tarea almacenada',
    completed: false,
    priority: 'media',
    createdAt: new Date().toISOString(),
    source: 'local',
    ...overrides,
  };
}

console.log('Validation');

await test('rejects an empty title', () => {
  const result = validateTaskInput({ title: '   ', priority: 'alta' });
  assert.equal(result.valid, false);
  assert.match(result.errors.title, /obligatorio/i);
});

await test('rejects a title shorter than three characters', () => {
  const result = validateTaskInput({ title: 'ab', priority: 'alta' });
  assert.equal(result.valid, false);
  assert.match(result.errors.title, /al menos 3/i);
});

await test('requires a known priority', () => {
  assert.equal(validateTaskInput({ title: 'Tarea válida', priority: '' }).valid, false);
  assert.equal(validateTaskInput({ title: 'Tarea válida', priority: 'urgente' }).valid, false);
});

await test('trims the title and accepts valid input', () => {
  const result = validateTaskInput({ title: '  Estudiar ES6  ', priority: 'alta' });
  assert.equal(result.valid, true);
  assert.equal(result.value.title, 'Estudiar ES6');
});

console.log('\nCRUD and persistence');

await test('creates a task and serializes it into localStorage', () => {
  reset();
  const result = store.addTask({ title: 'Estudiar ES6', priority: 'alta' });

  assert.equal(result.ok, true);
  assert.equal(result.persisted, true);

  const raw = localStorage.getItem(storage.STORAGE_KEY);
  const stored = JSON.parse(raw);

  assert.equal(stored.length, 1);
  assert.equal(stored[0].title, 'Estudiar ES6');
  assert.equal(stored[0].completed, false);
});

await test('toggles completion and persists the change', () => {
  reset();
  const created = store.addTask({ title: 'Regar plantas', priority: 'baja' });

  store.toggleTask(created.task.id);

  assert.equal(store.getTaskById(created.task.id).completed, true);
  assert.equal(JSON.parse(localStorage.getItem(storage.STORAGE_KEY))[0].completed, true);
});

await test('updates title and priority without touching createdAt', () => {
  reset();
  const created = store.addTask({ title: 'Borrador', priority: 'baja' });
  const originalDate = created.task.createdAt;

  const result = store.updateTask(created.task.id, {
    title: 'Versión final',
    priority: 'alta',
  });

  assert.equal(result.ok, true);
  assert.equal(result.task.title, 'Versión final');
  assert.equal(result.task.priority, 'alta');
  assert.equal(result.task.createdAt, originalDate);
});

await test('deletes a task', () => {
  reset();
  const created = store.addTask({ title: 'Temporal', priority: 'media' });

  const result = store.removeTask(created.task.id);

  assert.equal(result.ok, true);
  assert.equal(store.getMetrics().total, 0);
  assert.deepEqual(JSON.parse(localStorage.getItem(storage.STORAGE_KEY)), []);
});

console.log('\nFilters and search');

await test('filters pending and completed tasks', () => {
  reset();
  store.addTask({ title: 'Pendiente', priority: 'alta' });
  const done = store.addTask({ title: 'Completada', priority: 'media' });
  store.toggleTask(done.task.id);

  store.setFilter('pending');
  assert.deepEqual(store.getVisibleTasks().map((task) => task.title), ['Pendiente']);

  store.setFilter('completed');
  assert.deepEqual(store.getVisibleTasks().map((task) => task.title), ['Completada']);

  store.setFilter('all');
  assert.equal(store.getVisibleTasks().length, 2);
});

await test('searches by title ignoring case', () => {
  reset();
  store.addTask({ title: 'Comprar Pan', priority: 'baja' });

  store.setQuery('pan');
  assert.equal(store.getVisibleTasks().length, 1);

  store.setQuery('PAN');
  assert.equal(store.getVisibleTasks().length, 1);

  store.setQuery('leche');
  assert.equal(store.getVisibleTasks().length, 0);
});

await test('combines search with the active filter', () => {
  reset();
  store.addTask({ title: 'Informe final', priority: 'alta' });
  const second = store.addTask({ title: 'Informe borrador', priority: 'baja' });
  store.toggleTask(second.task.id);

  store.setFilter('pending');
  store.setQuery('informe');

  assert.deepEqual(store.getVisibleTasks().map((task) => task.title), ['Informe final']);
});

console.log('\nSorting');

await test('sorts by priority from high to low', () => {
  reset();
  store.addTask({ title: 'Baja', priority: 'baja' });
  store.addTask({ title: 'Alta', priority: 'alta' });
  store.addTask({ title: 'Media', priority: 'media' });

  store.setSort('priority');

  assert.deepEqual(
    store.getVisibleTasks().map((task) => task.priority),
    ['alta', 'media', 'baja'],
  );
});

await test('sorts by creation date in both directions', () => {
  reset();
  store.importTasks([
    apiTask(1, 'Antigua', false, 'baja', 5),
    apiTask(2, 'Reciente', false, 'media', 1),
  ]);

  store.setSort('date-desc');
  assert.deepEqual(store.getVisibleTasks().map((task) => task.title), ['Reciente', 'Antigua']);

  store.setSort('date-asc');
  assert.deepEqual(store.getVisibleTasks().map((task) => task.title), ['Antigua', 'Reciente']);
});

console.log('\nMetrics');

await test('computes total, pending, completed and progress', () => {
  reset();
  store.addTask({ title: 'Uno', priority: 'alta' });
  const second = store.addTask({ title: 'Dos', priority: 'alta' });
  store.addTask({ title: 'Tres', priority: 'alta' });
  store.toggleTask(second.task.id);

  assert.deepEqual(store.getMetrics(), {
    total: 3,
    pending: 2,
    completed: 1,
    progress: 33,
  });
});

await test('reports zero progress for an empty list', () => {
  reset();
  assert.deepEqual(store.getMetrics(), {
    total: 0,
    pending: 0,
    completed: 0,
    progress: 0,
  });
});

console.log('\nAPI import deduplication');

await test('imports remote tasks only once', () => {
  reset();
  const incoming = [
    apiTask(1, 'Delectus aut autem', false, 'alta', 3),
    apiTask(2, 'Quis ut nam facilis', true, 'media', 4),
  ];

  const first = store.importTasks(incoming);
  const second = store.importTasks(incoming);

  assert.equal(first.added, 2);
  assert.equal(second.added, 0);
  assert.equal(second.skipped, 2);
  assert.equal(store.getMetrics().total, 2);
});

await test('ignores malformed remote records', () => {
  reset();
  const result = store.importTasks([{ id: 'broken' }, null, apiTask(3, 'Válida', false, 'baja', 1)]);

  assert.equal(result.added, 1);
  assert.equal(store.getMetrics().total, 1);
});

console.log('\nStorage resilience');

await test('returns an empty list for corrupted JSON', () => {
  memory.clear();
  localStorage.setItem(storage.STORAGE_KEY, '{not-json');

  assert.deepEqual(storage.loadTasks(), []);
});

await test('discards entries that do not match the task shape', () => {
  memory.clear();
  localStorage.setItem(
    storage.STORAGE_KEY,
    JSON.stringify([{ id: 'broken' }, validStoredTask()]),
  );

  const loaded = storage.loadTasks();

  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].title, 'Tarea almacenada');
});

console.log(`\n${results.passed} passed, ${results.failed} failed`);

if (results.failed > 0) {
  process.exitCode = 1;
}
