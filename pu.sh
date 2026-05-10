#!/bin/bash

: <<'EOF'
Este script fue creado para realizar
- git add .
- git commit -m ""
- git push
EOF

# Configura la shell para que salga tan pronto como se encuentre el primer error
set -e

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

# Realizar el push al repositorio remoto
git push
