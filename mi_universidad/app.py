import os
import sqlite3
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

DB_PATH = os.environ.get('DB_PATH', 'estudiantes.db')

# ========== BASE DE DATOS ==========
def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''CREATE TABLE IF NOT EXISTS estudiantes
                 (cedula TEXT PRIMARY KEY, nombre TEXT)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS notas
                 (id INTEGER PRIMARY KEY, cedula TEXT, nota REAL)''')
    conn.close()

# Inicializa la BD también cuando se ejecuta bajo gunicorn/WSGI
init_db()

# ========== API ==========
@app.route('/')
def front():
    return render_template('index.html')

@app.route('/estudiante', methods=['POST'])
def crear_estudiante():
    data = request.json
    conn = sqlite3.connect(DB_PATH)
    conn.execute('INSERT INTO estudiantes VALUES (?, ?)',
                 (data['cedula'], data['nombre']))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})

@app.route('/nota', methods=['POST'])
def agregar_nota():
    data = request.json
    conn = sqlite3.connect(DB_PATH)
    conn.execute('INSERT INTO notas (cedula, nota) VALUES (?, ?)',
                 (data['cedula'], data['nota']))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})

@app.route('/nota/<cedula>', methods=['DELETE'])
def quitar_nota(cedula):
    conn = sqlite3.connect(DB_PATH)
    conn.execute('DELETE FROM notas WHERE id = (SELECT id FROM notas WHERE cedula = ? ORDER BY id DESC LIMIT 1)', (cedula,))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})

@app.route('/promedio/<cedula>')
def ver_promedio(cedula):
    conn = sqlite3.connect(DB_PATH)
    # Obtener estudiante
    est = conn.execute('SELECT * FROM estudiantes WHERE cedula = ?', (cedula,)).fetchone()
    if not est:
        conn.close()
        return jsonify({'error': 'No existe'}), 404

    # Obtener notas
    notas = conn.execute('SELECT nota FROM notas WHERE cedula = ?', (cedula,)).fetchall()
    conn.close()

    promedio = sum(n[0] for n in notas) / len(notas) if notas else 0

    return jsonify({
        'cedula': cedula,
        'nombre': est[1],
        'notas': [n[0] for n in notas],
        'promedio': round(promedio, 2)
    })

# ========== ESTO ES EL WSGI ==========
# Flask ya lo incluye, pero si necesitás explicitarlo:
application = app  # Para servidores como Apache/mod_wsgi

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '1') == '1'
    app.run(host='0.0.0.0', port=port, debug=debug)
