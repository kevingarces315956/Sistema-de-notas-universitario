#!/bin/bash

: <<'EOF'
Este script fue creado para realizar
- git add .
- git commit -m ""
- git push
EOF

# Configura la shell para que salga tan pronto como se encuentre el primer error
set -e

# Asegurarse de que el script se ejecute en la carpeta donde reside
cd "$(dirname "$0")"

# Agregar cambios en la ruta
git add .

# Pedir al usuario que ingrese el mensaje del commit
echo "Ingresa el mensaje del commit: "
read mensaje

# Validar que el mensaje no esté vacío
if [ -z "$mensaje" ]; then
    echo "Error: El mensaje del commit es obligatorio. Inténtalo de nuevo."
    exit 1
fi

# Realizar el commit con el mensaje proporcionado por el usuario
git commit -m "$mensaje"

# Obtener el nombre de la rama actual dinámicamente
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Realizar el push a la rama actual en el servidor remoto
echo "Subiendo cambios a la rama $BRANCH en GitHub..."
git push -u origin "$BRANCH"

echo "----------------------------------------"
echo "¡Listo! Tu código ya está en la nube (GitHub)."
