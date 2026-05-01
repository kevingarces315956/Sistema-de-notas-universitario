// ========== Helpers ==========
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

// ========== Acciones ==========
async function crearEstudiante() {
    const cedula = $('cedula').value.trim();
    const nombre = $('nombre').value.trim();
    if (!cedula || !nombre) {
        showToast('Completa cédula y nombre', 'error');
        return;
    }
    const btn = $('btn-crear');
    setLoading(btn, true, 'Crear estudiante');
    try {
        await apiRequest('/estudiante', {
            method: 'POST',
            body: JSON.stringify({ cedula, nombre }),
        });
        showToast(`Estudiante "${nombre}" creado`, 'success');
        $('cedula').value = '';
        $('nombre').value = '';
    } catch {} finally {
        setLoading(btn, false, 'Crear estudiante');
    }
}

async function agregarNota() {
    const cedula = $('notaCedula').value.trim();
    const nota = parseFloat($('notaValor').value);
    if (!cedula || isNaN(nota)) {
        showToast('Completa cédula y nota válida', 'error');
        return;
    }
    if (nota < 0 || nota > 10) {
        showToast('La nota debe estar entre 0 y 10', 'error');
        return;
    }
    const btn = $('btn-agregar-nota');
    setLoading(btn, true, 'Agregar nota');
    try {
        await apiRequest('/nota', {
            method: 'POST',
            body: JSON.stringify({ cedula, nota }),
        });
        showToast(`Nota ${nota} agregada`, 'success');
        $('notaValor').value = '';
    } catch {} finally {
        setLoading(btn, false, 'Agregar nota');
    }
}

async function quitarNota() {
    const cedula = $('quitarCedula').value.trim();
    if (!cedula) {
        showToast('Ingresa la cédula', 'error');
        return;
    }
    const btn = $('btn-quitar');
    setLoading(btn, true, 'Quitar última nota');
    try {
        await apiRequest(`/nota/${encodeURIComponent(cedula)}`, { method: 'DELETE' });
        showToast('Última nota eliminada', 'success');
    } catch {} finally {
        setLoading(btn, false, 'Quitar última nota');
    }
}

async function verPromedio() {
    const cedula = $('verCedula').value.trim();
    if (!cedula) {
        showToast('Ingresa la cédula', 'error');
        return;
    }
    const btn = $('btn-ver');
    setLoading(btn, true, 'Ver promedio');
    try {
        const data = await apiRequest(`/promedio/${encodeURIComponent(cedula)}`);
        renderResultado(data);
    } catch {
        renderEmpty('No se pudo cargar la información del estudiante.');
    } finally {
        setLoading(btn, false, 'Ver promedio');
    }
}

// ========== Render del resultado ==========
function renderEmpty(msg = 'Esperando acción...') {
    $('resultado').innerHTML = `<div class="result-empty">${msg}</div>`;
}

function renderResultado(data) {
    const { cedula, nombre, notas, promedio } = data;
    const claseProm = promedio < 3 ? 'bajo' : promedio < 7 ? 'medio' : '';
    const notasHtml = notas.length
        ? notas.map(n => `<span class="nota-pill">${n}</span>`).join('')
        : '<span class="result-empty">Sin notas registradas</span>';

    $('resultado').innerHTML = `
        <div class="student-info">
            <div class="row"><span class="label">Cédula</span><span>${cedula}</span></div>
            <div class="row"><span class="label">Nombre</span><span>${nombre}</span></div>
            <div class="row" style="flex-direction:column;align-items:flex-start;">
                <span class="label">Notas (${notas.length})</span>
                <div class="notas-list">${notasHtml}</div>
            </div>
            <div class="promedio-big ${claseProm}">
                <div class="label">Promedio</div>
                <div class="value">${promedio}</div>
            </div>
        </div>
    `;
}

// ========== Init ==========
document.addEventListener('DOMContentLoaded', () => {
    renderEmpty();
    $('btn-crear').addEventListener('click', crearEstudiante);
    $('btn-agregar-nota').addEventListener('click', agregarNota);
    $('btn-quitar').addEventListener('click', quitarNota);
    $('btn-ver').addEventListener('click', verPromedio);

    // Enter key support
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const card = input.closest('.card');
                const btn = card?.querySelector('button');
                btn?.click();
            }
        });
    });
});
