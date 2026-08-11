# js/vendor/ — librerías de terceros auto-hospedadas

Estos archivos **no son código nuestro**. Están aquí a propósito, copiados sin
modificar ni un byte, para que la aplicación no dependa de un servidor ajeno
para arrancar.

## Por qué están aquí (Sprint 2 — SEC-05 y SEC-06)

Antes, los 9 HTML cargaban estas librerías desde `cdn.jsdelivr.net`. Eso
significaba tres cosas:

1. **Sin control de integridad.** Ninguna etiqueta `<script>` tenía
   `integrity=`. Si ese CDN sirviera código alterado, se ejecutaría dentro de
   la aplicación con la sesión del usuario abierta.
2. **Sin versión fija.** `@supabase/supabase-js@2` significa "la última v2 que
   haya hoy". El código que corría en la app podía cambiar sin que nadie
   tocara el repositorio.
3. **Sin internet, la app no arranca.** Relevante si algún día esto vive en la
   intranet del hospital sin salida a internet.

Auto-hospedarlas cierra los tres: el archivo es el que es, no cambia solo, y
se sirve desde el mismo sitio que el resto de la aplicación.

## Qué hay aquí

| Archivo | Versión | Origen | Bytes | SHA-384 (base64) |
|---|---|---|---|---|
| `xlsx.full.min.js` | 0.20.3 | `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js` | 951 904 | `EnyY0/GSHQGSxSgMwaIPzSESbqoOLSexfnSMN2AP+39Ckmn92stwABZynq1JyzdT` |
| `supabase-js.js` | 2.112.2 | npm `@supabase/supabase-js@2.112.2` → `dist/umd/supabase.js` | 211 412 | `OUpie84zd1LdwNlK9uJJQRwab0BLqo3eKYKFh7hSVL58FSk7wPp2l0kfUMIIoaQd` |

Descargados y verificados el **2026-08-07**.

Para comprobar que un archivo no ha cambiado:

```bash
openssl dgst -sha384 -binary js/vendor/xlsx.full.min.js | openssl base64 -A
```

## SheetJS: por qué viene de cdn.sheetjs.com y no de npm

La versión publicada en npm (y por tanto en jsDelivr) se quedó congelada en la
**0.18.5**, que arrastra el **CVE-2023-30533** (prototype pollution). Desde la
0.19, SheetJS solo se distribuye desde su propio servidor, `cdn.sheetjs.com`.
No hay forma de conseguir una versión corregida por la vía de npm.

> [!note] El CVE no era alcanzable desde esta aplicación
> Se verificó el 2026-08-07: el fallo se dispara al **leer** un Excel
> malicioso, y esta app solo **escribe** (`XLSX.writeFile` en
> `hist_exportarExcel`, `js/script.js`). Nunca llama a `XLSX.read` ni a
> `XLSX.readFile`. La actualización se hizo igual —defensa en profundidad y
> los otros dos motivos de arriba—, no por una vulnerabilidad explotable.

## supabase-js: qué archivo exactamente

Es `dist/umd/supabase.js` del paquete npm, que es **el mismo archivo** que
jsDelivr servía antes (el `package.json` del paquete declara
`"jsdelivr": "dist/umd/supabase.js"`). Expone el global `supabase`, que es lo
que espera `js/supabase.js` con `const { createClient } = supabase;`.

El paquete quedó anotado como `devDependency` en `package.json`, así que
`package-lock.json` guarda el hash del tarball y la versión es reproducible
con `npm install`.

## ⚠️ Las rutas van SIEMPRE absolutas

En los HTML: `src="/js/vendor/…"`, con barra inicial. Nunca `src="js/vendor/…"`.

`_redirects` sirve `proceso-detalle.html` desde `/proceso/:codigo`, que tiene
**dos segmentos**: una ruta relativa se resuelve contra `/proceso/` y da 404,
lo que deja la ficha de proceso sin `supabaseClient` y en blanco. Pasó de
verdad el 2026-08-07 — ver la sección 6.6 de
[[../../_Segundo_Cerebro/Auditoria_360_Y_Blindaje]].

Lo mismo vale para `_cargarSheetJS()` en `js/script.js`, que inyecta el
`<script>` a mano.

## SheetJS no se carga al abrir la página

Desde el Sprint 5 no hay ningún `<script>` de SheetJS en los HTML: se
descarga la primera vez que se pulsa "Exportar Excel", desde
`_cargarSheetJS()` en `js/script.js`. Si se vuelve a poner una etiqueta fija
en el `<head>`, se pierden los 930 KB de mejora en `index.html` e
`historial.html`.

## Cómo actualizar

**supabase-js:**

```bash
npm install --save-dev @supabase/supabase-js@<version>
```

Luego copiar `node_modules/@supabase/supabase-js/dist/umd/supabase.js` a
`js/vendor/supabase-js.js` y actualizar la tabla de arriba.

**SheetJS:** descargar de `https://cdn.sheetjs.com/xlsx-<version>/package/dist/xlsx.full.min.js`
y actualizar la tabla.

Después de cualquier actualización: `npm run build` y revisar `dist/` con
`npm run preview:dist`.

## Lo que NO está auto-hospedado todavía

`js/juriskills-engine.js` sigue cargando **tres librerías más** bajo demanda
desde `cdnjs.cloudflare.com`, sin `integrity=`:

| Librería | Versión | Para qué |
|---|---|---|
| `mammoth` | 1.6.0 | Extraer texto de `.docx` |
| `pdf.js` | 3.11.174 | Extraer texto de PDF (+ su `pdf.worker.min.js`) |
| `tesseract.js` | 5.1.0 | OCR de PDF escaneado e imágenes |

Quedaron fuera del Sprint 2 a propósito: el sprint cubría las dos librerías de
los `<script>` de los HTML. Ver la sección de preguntas abiertas de
[[../../_Segundo_Cerebro/Auditoria_360_Y_Blindaje]] — Tesseract en particular
no se resuelve copiando un archivo: descarga además su núcleo WebAssembly y
los datos de idioma en tiempo de ejecución.

## Reglas para esta carpeta

- **No editar estos archivos.** Si hay que parchear algo, se documenta aquí y
  se prefiere subir de versión.
- **`build.js` los copia tal cual, sin ofuscar** (ver `DIR_VENDOR`). No son
  nuestra propiedad intelectual, ya vienen minificados, y ofuscarlos podría
  romperlos.
- **Este `LEEME.md` no se publica**: el paso de copia de `build.js` filtra por
  `.js`.
