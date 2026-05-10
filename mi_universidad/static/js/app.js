// ========== Helpers ==========
let asignaturaActual = null;

const $ = (id) => document.getElementById(id);

function showToast(message, type = 'info') {
    const container = $('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

async function apiRequest(url, options = {}) {
    try {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || `Error ${res.status}`);
        }
        return data;
    } catch (err) {
        showToast(err.message || 'Error de conexión', 'error');
        throw err;
    }
}

function setLoading(btn, isLoading, originalText) {
    btn.disabled = isLoading;
    btn.textContent = isLoading ? 'Procesando...' : originalText;
}

// ========== Asignaturas ==========
async function cargarAsignaturas() {
    try {
        const data = await apiRequest('/asignaturas');
        const select = $('selectAsignatura');
        select.innerHTML = '<option value="">Seleccionar...</option>';
        data.forEach(a => {
            select.innerHTML += `<option value="${a.id}">${a.nombre}</option>`;
        });
    } catch (err) { console.error(err); }
}

async function crearAsignatura() {
    const nombre = $('nuevaAsignatura').value.trim();
    if (!nombre) return showToast('Ingresa un nombre', 'error');
    try {
        await apiRequest('/asignatura', { method: 'POST', body: JSON.stringify({ nombre }) });
        cerrarModal();
        cargarAsignaturas();
        $('nuevaAsignatura').value = '';
        showToast('Asignatura creada', 'success');
    } catch (err) { console.error(err); }
}

// ========== Estudiantes ==========
async function crearEstudiante() {
    if (!asignaturaActual) return showToast('Selecciona una asignatura', 'error');
    const cedula = $('estCedula').value.trim();
    const nombre = $('estNombre').value.trim();
    
    if (!cedula || !nombre) {
        showToast('Completa cédula y nombre', 'error');
        return;
    }

    try {
        await apiRequest('/estudiante', {
            method: 'POST',
            body: JSON.stringify({ cedula, nombre, asignatura_id: asignaturaActual }),
        });
        showToast(`Estudiante "${nombre}" creado`, 'success');
        $('estCedula').value = '';
        $('estNombre').value = '';
        cargarEstudiantes();
    } catch (err) { console.error(err); }
}

async function cargarEstudiantes() {
    if (!asignaturaActual) return;
    try {
        const estudiantes = await apiRequest(`/estudiantes/${asignaturaActual}`);
        const tbody = document.querySelector('#tablaEstudiantes tbody');
        tbody.innerHTML = '';
        
        for (const e of estudiantes) {
            const promData = await apiRequest(`/promedio/${e.id}`);
            tbody.innerHTML += `
                <tr>
                    <td>${e.cedula}</td>
                    <td>${e.nombre}</td>
                    <td class="promedio">${promData.promedio}</td>
                    <td><button class="btn-danger" style="width:auto" onclick="eliminarEstudiante(${e.id})">Eliminar</button></td>
                </tr>
            `;
        }
    } catch (err) { console.error(err); }
}

// ========== Actividades (Tipos de Nota) ==========
async function cargarActividades() {
    if (!asignaturaActual) return;
    const actividades = await apiRequest(`/tipos_nota/${asignaturaActual}`);
    const tbody = document.querySelector('#tablaActividades tbody');
    tbody.innerHTML = '';
    let total = 0;
    actividades.forEach(a => {
        tbody.innerHTML += `
            <tr>
                <td>${a.nombre}</td>
                <td>${a.porcentaje}%</td>
                <td>
                    <button class="btn-success" style="width:auto; padding:5px 10px;" onclick="mostrarModalEditar(${a.id}, '${a.nombre}', ${a.porcentaje})">Editar</button>
                    <button class="btn-danger" style="width:auto; padding:5px 10px;" onclick="eliminarActividad(${a.id})">Eliminar</button>
                </td>
            </tr>
        `;
        total += a.porcentaje;
    });
    
    const totalMsg = $('totalPorcentajeMsg');
    if (total !== 100) {
        totalMsg.innerHTML = `<p style="color:var(--danger); font-weight:bold;">⚠️ Total: ${total}% (debe ser 100%)</p>`;
    } else {
        totalMsg.innerHTML = `<p style="color:var(--success); font-weight:bold;">✅ Total: 100%</p>`;
    }
}

async function agregarActividad() {
    const nombre = $('actNombre').value.trim();
    const porcentaje = parseFloat($('actPorcentaje').value);
    if (!nombre || isNaN(porcentaje)) return showToast('Completa los campos', 'error');
    
    await apiRequest('/tipo_nota', {
        method: 'POST',
        body: JSON.stringify({ nombre, porcentaje, asignatura_id: asignaturaActual })
    });
    $('actNombre').value = '';
    $('actPorcentaje').value = '';
    cargarActividades();
    showToast('Actividad agregada', 'success');
}

async function eliminarActividad(id) {
    if (!confirm('¿Eliminar actividad? Se borrarán las notas asociadas.')) return;
    await apiRequest(`/tipo_nota/${id}`, { method: 'DELETE' });
    cargarActividades();
    cargarEstudiantes();
    showToast('Actividad eliminada', 'info');
}

// ========== Notas (Calificaciones) ==========
async function cargarEstudiantesParaNotas() {
    if (!asignaturaActual) return;
    const estudiantes = await apiRequest(`/estudiantes/${asignaturaActual}`);
    const select = $('selectEstudianteNota');
    select.innerHTML = '<option value="">Seleccionar estudiante...</option>';
    estudiantes.forEach(e => {
        select.innerHTML += `<option value="${e.id}">${e.nombre} (${e.cedula})</option>`;
    });
}

async function cargarNotasEstudiante() {
    const estudianteId = $('selectEstudianteNota').value;
    if (!estudianteId) return;
    
    const actividades = await apiRequest(`/todas_notas/${estudianteId}`);
    const div = $('actividadesNotas');
    div.innerHTML = '<h4 style="margin:10px 0;">Calificaciones:</h4>';
    
    actividades.forEach(act => {
        div.innerHTML += `
            <div class="field" style="display:flex; align-items:center; gap:10px; background:white; padding:10px; border-radius:8px; margin-bottom:5px;">
                <label style="flex:1; margin:0;">${act.nombre} (${act.porcentaje}%):</label>
                <input type="number" style="width:80px;" id="nota_${act.tipo_id}" value="${act.valor || ''}" step="0.1" min="0" max="5">
                <button class="btn-success" style="width:auto;" onclick="guardarNota(${estudianteId}, ${act.tipo_id})">Guardar</button>
            </div>
        `;
    });

    const promData = await apiRequest(`/promedio/${estudianteId}`);
    div.innerHTML += `<div class="promedio-big" style="margin-top:15px;"><div class="label">Promedio Ponderado</div><div class="value">${promData.promedio}</div></div>`;
}

async function guardarNota(estudianteId, tipoId) {
    const valor = parseFloat($(`nota_${tipoId}`).value);
    if (isNaN(valor)) return showToast('Ingresa una nota válida', 'error');
    
    await apiRequest('/nota', {
        method: 'POST',
        body: JSON.stringify({ estudiante_id: estudianteId, tipo_nota_id: tipoId, valor })
    });
    cargarNotasEstudiante();
    cargarEstudiantes();
    showToast('Nota guardada', 'success');
}

async function eliminarEstudiante(id) {
    if (!confirm('¿Eliminar estudiante?')) return;
    try {
        await apiRequest(`/estudiante/${id}`, { method: 'DELETE' });
        showToast('Estudiante eliminado', 'info');
        cargarEstudiantes();
    } catch (err) { console.error(err); }
}

// ========== Init ==========
document.addEventListener('DOMContentLoaded', () => {
    cargarAsignaturas();
    $('selectAsignatura').addEventListener('change', (e) => {
        asignaturaActual = e.target.value;
        if (asignaturaActual) {
            cargarEstudiantes();
            cargarActividades();
            cargarEstudiantesParaNotas();
        }
    });
    $('selectEstudianteNota').addEventListener('change', cargarNotasEstudiante);
});

function cambiarPestana(panelId) {
    document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if($(panelId)) $(panelId).style.display = 'block';
    event.currentTarget.classList.add('active');
}

function mostrarModal() { $('modalAsignatura').style.display = 'flex'; }
function cerrarModal() { $('modalAsignatura').style.display = 'none'; }
