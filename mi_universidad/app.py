import os
import sqlite3
from contextlib import contextmanager
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

DB_PATH = os.environ.get('DB_PATH', 'universidad.db')

# ========== BASE DE DATOS ==========
@contextmanager
def get_db():
    """Maneja la conexión de forma segura para Docker y entorno local."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    """Crea el esquema avanzado de la universidad."""
    with get_db() as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS asignaturas
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE)''')
       
        conn.execute('''CREATE TABLE IF NOT EXISTS estudiantes
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      cedula TEXT, nombre TEXT,
                      asignatura_id INTEGER,
                      FOREIGN KEY(asignatura_id) REFERENCES asignaturas(id))''')
       
        conn.execute('''CREATE TABLE IF NOT EXISTS tipos_nota
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      nombre TEXT, porcentaje REAL,
                      asignatura_id INTEGER,
                      FOREIGN KEY(asignatura_id) REFERENCES asignaturas(id))''')
       
        conn.execute('''CREATE TABLE IF NOT EXISTS notas
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      estudiante_id INTEGER, tipo_nota_id INTEGER, valor REAL,
                      FOREIGN KEY(estudiante_id) REFERENCES estudiantes(id),
                      FOREIGN KEY(tipo_nota_id) REFERENCES tipos_nota(id))''')
        conn.commit()

init_db()

# ========== API ==========
@app.route('/')
def index():
    return render_template('index.html')

# --- ASIGNATURAS ---
@app.route('/asignaturas', methods=['GET'])
def get_asignaturas():
    with get_db() as db:
        asignaturas = db.execute('SELECT * FROM asignaturas').fetchall()
    return jsonify([dict(a) for a in asignaturas])

@app.route('/asignatura', methods=['POST'])
def crear_asignatura():
    data = request.json
    try:
        with get_db() as db:
            db.execute('INSERT INTO asignaturas (nombre) VALUES (?)', (data['nombre'],))
            db.commit()
        return jsonify({'ok': True})
    except sqlite3.IntegrityError:
        return jsonify({'error': 'La asignatura ya existe'}), 400

# --- TIPOS DE NOTA ---
@app.route('/tipos_nota/<int:asignatura_id>', methods=['GET'])
def get_tipos_nota(asignatura_id):
    with get_db() as db:
        tipos = db.execute('SELECT * FROM tipos_nota WHERE asignatura_id = ?', (asignatura_id,)).fetchall()
    return jsonify([dict(t) for t in tipos])

@app.route('/tipo_nota', methods=['POST'])
def crear_tipo_nota():
    data = request.json
    with get_db() as db:
        db.execute('INSERT INTO tipos_nota (nombre, porcentaje, asignatura_id) VALUES (?, ?, ?)',
                   (data['nombre'], data['porcentaje'], data['asignatura_id']))
        db.commit()
    return jsonify({'ok': True})

# NUEVO: Editar tipo de nota (porcentaje)
@app.route('/tipo_nota/<int:tipo_id>', methods=['PUT'])
def editar_tipo_nota(tipo_id):
    data = request.json
    with get_db() as db:
        db.execute('UPDATE tipos_nota SET nombre = ?, porcentaje = ? WHERE id = ?',
                   (data['nombre'], data['porcentaje'], tipo_id))
        db.commit()
    return jsonify({'ok': True})

# NUEVO: Eliminar tipo de nota
@app.route('/tipo_nota/<int:tipo_id>', methods=['DELETE'])
def eliminar_tipo_nota(tipo_id):
    with get_db() as db:
        # Primero eliminar las notas asociadas por integridad
        db.execute('DELETE FROM notas WHERE tipo_nota_id = ?', (tipo_id,))
        # Luego eliminar el tipo de nota
        db.execute('DELETE FROM tipos_nota WHERE id = ?', (tipo_id,))
        db.commit()
    return jsonify({'ok': True})

# --- ESTUDIANTES ---
@app.route('/estudiantes/<int:asignatura_id>', methods=['GET'])
def get_estudiantes(asignatura_id):
    with get_db() as db:
        est = db.execute('SELECT * FROM estudiantes WHERE asignatura_id = ?', (asignatura_id,)).fetchall()
    return jsonify([dict(e) for e in est])

@app.route('/estudiante', methods=['POST'])
def crear_estudiante():
    data = request.json
    try:
        with get_db() as db:
            db.execute('INSERT INTO estudiantes (cedula, nombre, asignatura_id) VALUES (?, ?, ?)',
                       (data['cedula'], data['nombre'], data['asignatura_id']))
            db.commit()
        return jsonify({'ok': True})
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Error de integridad en los datos'}), 400

@app.route('/estudiante/<int:estudiante_id>', methods=['DELETE'])
def eliminar_estudiante(estudiante_id):
    with get_db() as db:
        db.execute('DELETE FROM notas WHERE estudiante_id = ?', (estudiante_id,))
        db.execute('DELETE FROM estudiantes WHERE id = ?', (estudiante_id,))
        db.commit()
    return jsonify({'ok': True})

# --- NOTAS Y PROMEDIOS ---
@app.route('/nota', methods=['POST'])
def guardar_nota():
    data = request.json
    with get_db() as db:
        existe = db.execute('SELECT id FROM notas WHERE estudiante_id = ? AND tipo_nota_id = ?',
                            (data['estudiante_id'], data['tipo_nota_id'])).fetchone()
        if existe:
            db.execute('UPDATE notas SET valor = ? WHERE id = ?', (data['valor'], existe['id']))
        else:
            db.execute('INSERT INTO notas (estudiante_id, tipo_nota_id, valor) VALUES (?, ?, ?)',
                       (data['estudiante_id'], data['tipo_nota_id'], data['valor']))
        db.commit()
    return jsonify({'ok': True})

@app.route('/promedio/<int:estudiante_id>', methods=['GET'])
def get_promedio(estudiante_id):
    with get_db() as db:
        notas = db.execute('''
            SELECT n.valor, t.porcentaje
            FROM notas n
            JOIN tipos_nota t ON n.tipo_nota_id = t.id
            WHERE n.estudiante_id = ?
        ''', (estudiante_id,)).fetchall()
    
    if not notas:
        return jsonify({'promedio': 0})
   
    suma_ponderada = sum((float(n['valor'] or 0)) * (n['porcentaje']/100) for n in notas)
    return jsonify({'promedio': round(suma_ponderada, 2)})

@app.route('/todas_notas/<int:estudiante_id>', methods=['GET'])
def get_todas_notas(estudiante_id):
    with get_db() as db:
        notas = db.execute('''
            SELECT t.nombre, t.porcentaje, n.valor, t.id as tipo_id
            FROM tipos_nota t
            LEFT JOIN notas n ON n.tipo_nota_id = t.id AND n.estudiante_id = ?
            WHERE t.asignatura_id = (SELECT asignatura_id FROM estudiantes WHERE id = ?)
        ''', (estudiante_id, estudiante_id)).fetchall()
    return jsonify([dict(n) for n in notas])

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '1') == '1'
    app.run(host='0.0.0.0', port=port, debug=debug)
