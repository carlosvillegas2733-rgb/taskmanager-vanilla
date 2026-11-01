# Declaración de uso de Inteligencia Artificial

**Estudiante:** Carlos Villegas  
**Asignatura:** Programación de Sistemas Web — ECOTEC  
**Actividad:** Actividad Integradora 2 — TaskManager  
**Fecha:** 1 de noviembre de 2026

## 1. Herramientas de IA utilizadas y momentos

| Herramienta | Modelo | Momento de uso |
| --- | --- | --- |
| OpenCode (agente de código en terminal) | DeepSeek V4.1 Flash | Estructura del proyecto, implementación de los módulos ES6, revisión de errores de integración y redacción de la documentación |

La IA se usó como apoyo de implementación y revisión, no como sustituto de las decisiones del proyecto. Las decisiones de alcance, la arquitectura modular, la verificación en el navegador y la elaboración de las evidencias se hicieron sobre el código ejecutado, no sobre una propuesta teórica.

## 2. Prompts clave utilizados

### Prompt 1 — Planteamiento del proyecto

> Resumen del prompt: se pidió construir un TaskManager en JavaScript Vanilla con CRUD, validación de campos vacíos, filtros por estado, búsqueda en tiempo real, ordenamiento por fecha y prioridad, dashboard de métricas, consumo de JSONPlaceholder con `fetch`/`async await`, manejo de errores visible y persistencia en `localStorage`, usando módulos ES6.

**Resultado:** una primera estructura de archivos y el esqueleto de los módulos.

**Uso que se dio:** se mantuvo la separación por responsabilidades que exige la Opción A, con seis módulos y una única dirección de dependencias.

### Prompt 2 — Decisión de arquitectura

> Resumen del prompt: se consultó qué opción de investigación técnica convenía implementar y cómo debía organizarse el código para que la separación entre interfaz, API y almacenamiento fuera real y no solo de nombres.

**Resultado:** comparación entre arquitectura modular ES6 (Opción A) y eventos personalizados (Opción B).

**Uso que se dio:** se eligió la **Opción A**. Se definieron seis módulos con una única dirección de dependencias y se dejó `storage.js` como el único punto de acceso a `localStorage`.

### Prompt 3 — Revisión de integración

> Resumen del prompt: se pidió ejecutar la aplicación, probar creación, edición, completado, búsqueda, filtros, ordenamiento y eliminación, y corregir cualquier fallo de renderizado o de persistencia detectado en la ejecución.

**Resultado:** se detectaron y corrigieron dos errores reales de interfaz (ver sección 3) y se validó el flujo completo con una prueba automatizada del navegador.

## 3. Errores o ajustes manuales necesarios

Estas fueron las partes donde la propuesta de la IA no encajó tal cual y requirieron ajuste:

1. **El estado vacío se mostraba debajo de la lista con tareas cargadas.** El atributo `hidden` no tenía efecto porque la regla `.empty { display: grid }` lo sobrescribía. Se corrigió agregando una regla global `[hidden] { display: none !important; }` y se verificó que el bloque desapareciera al renderizar tareas.
2. **El texto del buscador se solapaba con el ícono de lupa.** La regla genérica `input[type="search"]` pisaba el `padding-left` del campo de búsqueda por orden de aparición. Se corrigió aumentando la especificidad del selector a `.field--search input[type="search"]`.
3. **JSONPlaceholder no devuelve prioridad ni fecha de creación.** El modelo de la actividad las exige para ordenar. Se agregó un mapeo en `api.js`: prioridad determinista según el `id` y fecha relativa a la importación.
4. **Los `id` numéricos de la API chocaban con los `id` locales.** Se separó `id` (identificador interno, UUID para tareas locales) de `apiId` (clave remota), y la deduplicación usa `apiId` cuando existe.
5. **Los módulos ES6 no cargan con `file://`.** El navegador bloquea los `import` por CORS. Se documentó la necesidad de servir el proyecto por HTTP (Live Server o `python -m http.server`) y se publicó en GitHub Pages.
6. **Un JSON corrupto en `localStorage` rompía la carga.** Se agregó validación estructural en `storage.js` para descartar entradas inválidas en lugar de fallar.

## 4. Reflexión

La IA aceleró la escritura del código y la documentación, pero no reemplazó la verificación: los dos errores de interfaz de la sección 3 solo aparecieron al ejecutar la aplicación en el navegador y comparar el resultado con lo esperado. El valor del trabajo estuvo en dirigir la implementación, probar el flujo completo y entender por qué cada módulo existe y qué responsabilidad tiene.

Las capturas del informe se tomaron del navegador al ejecutar la aplicación y corresponden al estado real de `localStorage` en el panel **Application → Local Storage** de DevTools.

## 5. Declaración

Declaro que la información anterior describe el uso real de herramientas de IA durante la elaboración de esta actividad y que el código entregado fue ejecutado y verificado antes de su publicación.

**Firma:** Carlos Villegas  
**Fecha:** 1 de noviembre de 2026
