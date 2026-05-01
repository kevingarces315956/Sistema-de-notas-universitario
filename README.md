
# 📘 Sistema de Notas Universitario - Versión 1.0

## 📖 Descripción del proyecto
Aplicación web que permite gestionar notas de estudiantes universitarios.  
Desarrollada con **Python** usando **Flask** como framework backend (incluye servidor WSGI Werkzeug), **SQLite** como base de datos, y **HTML/CSS/JavaScript** para el frontend.  

Permite:
- Crear estudiantes con cédula y nombre  
- Agregar notas del 0 al 10  
- Quitar la última nota  
- Calcular el promedio automáticamente  

La base de datos se guarda en un archivo local llamado `estudiantes.db`, el cual persiste entre ejecuciones.

---

## 🗂️ Estructura del proyecto

```bash
mi_universidad/
├── app.py              # Backend con Flask y SQLite
├── templates/
│   └── index.html     # Frontend con HTML/CSS/JS
└── estudiantes.db     # Base de datos (se crea automáticamente)ç

