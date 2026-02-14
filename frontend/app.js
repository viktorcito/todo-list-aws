// API Configuration
const API_URLS = {
    staging: 'https://jvqejb8c64.execute-api.us-east-1.amazonaws.com/Prod',
    production: 'https://zzdyawev6k.execute-api.us-east-1.amazonaws.com/Prod'
};

let currentEnv = 'staging';
let currentApiUrl = API_URLS.staging;
let allTodos = [];
let currentFilter = 'all';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
    updateApiDisplay();
    loadTodos();

    document.querySelectorAll('input[name="environment"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentEnv = e.target.value;
            currentApiUrl = API_URLS[currentEnv];
            updateApiDisplay();
            loadTodos();
        });
    });

    document.getElementById('add-btn').addEventListener('click', addTodo);
    document.getElementById('new-todo-text').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderTodos();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.dataset.filter;
            renderTodos();
        });
    });
});

function updateApiDisplay() {
    document.getElementById('current-api').textContent = currentApiUrl;
}

function updateStats() {
    const total = allTodos.length;
    const completed = allTodos.filter(t => t.checked === true || t.checked === 'true').length;
    const pending = total - completed;
    animateNumber('stat-total', total);
    animateNumber('stat-completed', completed);
    animateNumber('stat-pending', pending);
}

function animateNumber(elementId, target) {
    const el = document.getElementById(elementId);
    const current = parseInt(el.textContent) || 0;
    if (current === target) return;
    const duration = 400;
    const start = performance.now();
    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(current + (target - current) * eased);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

async function loadTodos() {
    const container = document.getElementById('todos-container');
    container.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border" style="color: var(--primary); width: 2.5rem; height: 2.5rem;" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-3" style="color: var(--text-muted); font-weight: 500;">Conectando con ${currentEnv}...</p>
        </div>
    `;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(`${currentApiUrl}/todos`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        allTodos = await response.json();
        updateStats();
        renderTodos();
    } catch (error) {
        allTodos = [];
        updateStats();
        let errorMsg = error.message;
        let helpMsg = '';

        if (error.name === 'AbortError' || error.message === 'Failed to fetch') {
            errorMsg = 'No se pudo conectar con la API';
            helpMsg = `
                <div style="background: var(--border-light); border: 1px solid var(--border); border-radius: 14px; padding: 1.2rem; margin-top: 1rem; text-align: left;">
                    <p style="color: var(--warning); font-weight: 700; margin-bottom: 0.5rem; font-size: 0.88rem;">
                        <i class="bi bi-info-circle-fill"></i> Posibles causas:
                    </p>
                    <ul style="color: var(--text-secondary); margin: 0; padding-left: 1.2rem; font-size: 0.85rem; line-height: 1.7;">
                        <li>La API necesita ser redesplegada con CORS habilitado</li>
                        <li>El laboratorio de AWS Academy no esta activo</li>
                        <li>Los stacks de CloudFormation no estan desplegados</li>
                    </ul>
                    <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.75rem; margin-bottom: 0;">
                        <i class="bi bi-terminal"></i> Ejecuta el pipeline CI en Jenkins para redesplegar con CORS.
                    </p>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-wifi-off" style="color: var(--danger); opacity: 0.5;"></i>
                <h5 class="mt-3">${errorMsg}</h5>
                ${helpMsg}
                <button class="filter-btn mt-3" onclick="loadTodos()" style="cursor: pointer;">
                    <i class="bi bi-arrow-clockwise"></i> Reintentar
                </button>
            </div>
        `;
    }
}

function renderTodos() {
    const container = document.getElementById('todos-container');

    let filteredTodos = allTodos.filter(todo => {
        const isChecked = todo.checked === true || todo.checked === 'true';
        const matchesFilter =
            currentFilter === 'all' ||
            (currentFilter === 'completed' && isChecked) ||
            (currentFilter === 'pending' && !isChecked);
        const matchesSearch = !searchQuery || todo.text.toLowerCase().includes(searchQuery);
        return matchesFilter && matchesSearch;
    });

    if (filteredTodos.length === 0) {
        const message = searchQuery ? 'No hay resultados para esta busqueda' :
                       currentFilter === 'completed' ? 'No hay tareas completadas' :
                       currentFilter === 'pending' ? 'Todas las tareas estan completadas' :
                       'No hay tareas. Crea una nueva';
        const icon = searchQuery ? 'bi-search' :
                    currentFilter === 'completed' ? 'bi-check-circle' :
                    currentFilter === 'pending' ? 'bi-trophy' : 'bi-inbox';

        container.innerHTML = `
            <div class="empty-state">
                <i class="bi ${icon}"></i>
                <h5 class="mt-3">${message}</h5>
                ${searchQuery ? `<button class="filter-btn mt-2" onclick="clearSearch()"><i class="bi bi-x-lg"></i> Limpiar</button>` : ''}
            </div>
        `;
        return;
    }

    container.innerHTML = filteredTodos.map((todo, index) => {
        const isChecked = todo.checked === true || todo.checked === 'true';
        return `
            <div class="todo-item ${isChecked ? 'completed' : ''}" data-id="${todo.id}" style="animation-delay: ${index * 0.04}s;">
                <div class="d-flex align-items-start justify-content-between">
                    <div class="form-check d-flex align-items-start flex-grow-1">
                        <input class="form-check-input mt-1" type="checkbox"
                               ${isChecked ? 'checked' : ''}
                               onchange="toggleTodo('${todo.id}', this.checked)">
                        <span class="todo-text ms-3">${escapeHtml(todo.text)}</span>
                    </div>
                    <div class="d-flex gap-2 align-items-center ms-3">
                        <span class="badge-status ${isChecked ? 'badge-done' : 'badge-pending'}">
                            ${isChecked ? '<i class="bi bi-check2"></i> Hecha' : '<i class="bi bi-clock"></i> Pendiente'}
                        </span>
                        <button class="btn-delete" onclick="deleteTodo('${todo.id}')" title="Eliminar">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                </div>
                <div class="todo-meta">
                    <i class="bi bi-calendar3"></i> ${formatDate(todo.createdAt)}
                    ${todo.updatedAt && todo.updatedAt !== todo.createdAt ?
                        ` &middot; <i class="bi bi-pencil"></i> ${formatDate(todo.updatedAt)}` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    searchQuery = '';
    renderTodos();
}

async function addTodo() {
    const input = document.getElementById('new-todo-text');
    const text = input.value.trim();
    if (!text) {
        input.style.borderColor = 'var(--danger)';
        input.focus();
        setTimeout(() => input.style.borderColor = '', 2000);
        return;
    }

    const btn = document.getElementById('add-btn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    try {
        const response = await fetch(`${currentApiUrl}/todos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        input.value = '';
        await loadTodos();
        btn.classList.add('success');
        btn.innerHTML = '<i class="bi bi-check-lg"></i> Creada';
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.remove('success');
            btn.disabled = false;
        }, 1500);
    } catch (error) {
        showToast(`Error al crear: ${error.message}`, 'danger');
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
}

async function toggleTodo(id, checked) {
    try {
        const response = await fetch(`${currentApiUrl}/todos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checked: checked.toString() })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await loadTodos();
    } catch (error) {
        showToast(`Error al actualizar: ${error.message}`, 'danger');
        await loadTodos();
    }
}

async function deleteTodo(id) {
    if (!confirm('Eliminar esta tarea?')) return;
    const card = document.querySelector(`[data-id="${id}"]`);
    card.classList.add('hiding');
    try {
        const response = await fetch(`${currentApiUrl}/todos/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setTimeout(() => loadTodos(), 300);
    } catch (error) {
        card.classList.remove('hiding');
        showToast(`Error al eliminar: ${error.message}`, 'danger');
    }
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const ts = typeof timestamp === 'number' && timestamp > 1e12 ? timestamp / 1000 : parseFloat(timestamp);
    const date = new Date(ts * 1000);
    return date.toLocaleString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        z-index: 9999; padding: 0.85rem 1.4rem; border-radius: 12px;
        background: ${type === 'danger' ? '#dc2626' : '#059669'};
        color: white; font-weight: 600; font-size: 0.88rem;
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
    `;
    toast.innerHTML = `<i class="bi bi-${type === 'danger' ? 'exclamation-triangle' : 'check-circle'}-fill"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
