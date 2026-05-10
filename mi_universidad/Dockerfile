# ========== Imagen base slim ==========
FROM python:3.12-slim

# ========== Variables de entorno ==========
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=5000 \
    DB_PATH=/data/universidad.db

# ========== Directorio de trabajo ==========
WORKDIR /app

# ========== Dependencias del sistema mínimas ==========
# (curl se usa solo para el HEALTHCHECK; eliminamos caché de apt)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# ========== Dependencias de Python ==========
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ========== Código de la aplicación ==========
COPY app.py .
COPY templates/ ./templates/
COPY static/ ./static/

# ========== Volumen para persistencia de la BD ==========
RUN mkdir -p /data
VOLUME ["/data"]

# ========== Usuario no root ==========
RUN useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app /data
USER appuser

# ========== Healthcheck ==========
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:${PORT}/ > /dev/null || exit 1

EXPOSE 5000

# ========== Servidor de producción (gunicorn) ==========
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT} --workers 2 --access-logfile - app:app"]
