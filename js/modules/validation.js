/**
 * Input validation rules shared by the task store and the UI.
 * Keeping them in a leaf module avoids duplicating business rules.
 */

export const PRIORITIES = ['alta', 'media', 'baja'];
export const TITLE_MIN_LENGTH = 3;
export const TITLE_MAX_LENGTH = 80;

/**
 * Validates a task form payload.
 * @param {{ title?: string, priority?: string }} input
 * @returns {{ valid: boolean, errors: Record<string, string>, value: { title: string, priority: string } }}
 */
export function validateTaskInput(input) {
  const errors = {};
  const title = String(input?.title ?? '').trim();
  const priority = String(input?.priority ?? '').trim();

  if (title.length === 0) {
    errors.title = 'El título es obligatorio.';
  } else if (title.length < TITLE_MIN_LENGTH) {
    errors.title = `Escribe al menos ${TITLE_MIN_LENGTH} caracteres.`;
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `El título no puede superar los ${TITLE_MAX_LENGTH} caracteres.`;
  }

  if (priority.length === 0) {
    errors.priority = 'Selecciona una prioridad.';
  } else if (!PRIORITIES.includes(priority)) {
    errors.priority = 'La prioridad seleccionada no es válida.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: { title, priority },
  };
}
