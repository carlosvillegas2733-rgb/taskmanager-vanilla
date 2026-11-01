# Capturas del proyecto

## `01-app.png`

Vista principal de la aplicación con 13 tareas (12 de JSONPlaceholder y la creada localmente).
Se usa como vista previa en el `README.md` y en la portada del informe.

## `02-localstorage.png`

Evidencia del informe: panel **Application → Local Storage** de DevTools con la clave
`taskmanager.tasks.v1` y el arreglo JSON de 13 tareas (12 de JSONPlaceholder y 1 creada localmente
con la interfaz). La imagen está recortada al panel de DevTools para excluir el escritorio y las
pestañas del navegador.

Para reproducirla:

1. Abre la aplicación servida por HTTP (GitHub Pages o `npx serve .`).
2. Crea o edita una tarea.
3. `F12` → **Application** → **Storage** → **Local Storage** → origen de la aplicación.
4. Clic en la clave `taskmanager.tasks.v1`, sube el zoom con `Ctrl` + `+` y captura el panel.
