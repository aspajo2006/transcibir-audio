# Voz a texto — Transcriptor con Whisper

Aplicación web estática para transcribir archivos de audio con modelos Whisper directamente en el navegador, mediante [Transformers.js](https://huggingface.co/docs/transformers.js). No requiere servidor propio ni clave de API.

## Funciones

- Transcribe audio en el navegador.
- Permite seleccionar un archivo o arrastrarlo a la página.
- Ofrece los modelos Whisper **Base**, **Small** y **Tiny**.
- Permite editar el resultado, copiarlo y descargarlo como archivo `.txt`.
- El audio seleccionado se procesa en el dispositivo y no se envía a un servidor de transcripción.

## Formatos

La página admite archivos `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac`, `.aac`, `.wma` y `.mpeg`. La decodificación depende de los códecs que admita el navegador y el sistema operativo. En particular, un archivo MPEG que contenga video o use un códec no compatible puede no poder decodificarse como audio.

## Ejecutar localmente

Abre `index.html` en un navegador moderno. Si el navegador bloquea los módulos al abrir el archivo directamente, inicia un servidor local sencillo desde esta carpeta, por ejemplo:

```bash
python -m http.server 8000
```

Luego abre <http://localhost:8000>.

La primera vez se necesita conexión a Internet para cargar Transformers.js y descargar el modelo elegido desde Hugging Face. Los modelos se guardan en la caché del navegador; los modelos más grandes pueden tardar más y requieren más memoria.


