# Capturas para el informe

El informe (`informe.html` y `Informe_Actividad_Integradora_2.pdf`) usa dos imágenes de esta carpeta.

## `01-app.png` — incluida

Render real de la aplicación con 14 tareas: 12 importadas de JSONPlaceholder y 2 creadas localmente.
No hace falta reemplazarla, aunque puedes sustituirla por una captura propia si lo prefieres.

## `02-localstorage.png` — pendiente

Es la evidencia que exige la actividad (panel **Application → Local Storage** de DevTools). Pasos:

1. Sirve el proyecto por HTTP y abre la aplicación:
   ```bash
   npx serve .
   ```
2. Crea o edita una tarea para que el JSON se actualice.
3. Abre DevTools con `F12` → pestaña **Application** → **Storage** → **Local Storage**.
4. Selecciona el origen `http://localhost:...` y haz clic en la clave `taskmanager.tasks.v1`.
5. Aumenta el zoom de DevTools con `Ctrl` + `+` hasta que el JSON se lea con claridad.
6. Captura la ventana ( `Win` + `Shift` + `S` ) y guarda la imagen en esta carpeta como
   `02-localstorage.png`.
7. Regenera el PDF (o pídele al agente que lo haga).

La captura debe mostrar la clave `taskmanager.tasks.v1` y el arreglo JSON con las tareas. Es la prueba
de que la aplicación usa `localStorage.setItem()` y `JSON.parse()`.
