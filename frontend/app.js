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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateApiDisplay();
    loadTodos();

    // Event Listeners
    document.getElementById('add-btn').addEventListener('click', addTodo);
    document.getElementById('new-todo-text').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    document.querySelectorAll('input[name="environment"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentEnv = e.target.value;
            currentApiUrl = API_URLS[currentEnv];
            updateApiDisplay();
            loadTodos();
        });
    });

    // Search
    document.getElementById('search-input').addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderTodos();
    });

    // Filters
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

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-pending').textContent = pending;
}

async function loadTodos() {
    const container = document.getElementById('todos-container');
    container.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-3 text-muted fw-bold">Cargando tareas desde ${currentEnv}...</p>
        </div>
    `;

    try {
        const response = await fetch(`${currentApiUrl}/todos`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        allTodos = await response.json();
        updateStats();
        renderTodos();
    } catch (error) {
        container.innerHTML = `
            <div class="alert alert-danger border-0 shadow-sm">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <strong>Error al cargar tareas:</strong> ${error.message}
                <br><small class="mt-2 d-block">Verifica que la API esté desplegada y accesible.</small>
            </div>
        `;
        updateStats();
    }
}

function renderTodos() {
    const container = document.getElementById('todos-container');

    let filteredTodos = allTodos.filter(todo => {
        const matchesFilter =
            currentFilter === 'all' ||
            (currentFilter === 'completed' && (todo.checked === true || todo.checked === 'true')) ||
            (currentFilter === 'pending' && (todo.checked === false || todo.checked === 'false' || !todo.checked));

        const matchesSearch = !searchQuery ||
            todo.text.toLowerCase().includes(searchQuery);

        return matchesFilter && matchesSearch;
    });

    if (filteredTodos.length === 0) {
        const message = searchQuery ? 'No se encontraron tareas con ese criterio' :
                       currentFilter === 'completed' ? 'No hay tareas completadas' :
                       currentFilter === 'pending' ? 'No hay tareas pendientes' :
                       '¡No hay tareas! Añade una nueva';

        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-inbox"></i>
                <h5 class="mt-3 mb-2">${message}</h5>
                ${searchQuery ? '<button class="btn btn-sm btn-outline-secondary mt-2" onclick="clearSearch()">Limpiar búsqueda</button>' : ''}
            </div>
        `;
        return;
    }

    container.innerHTML = filteredTodos.map(todo => {
        const isChecked = todo.checked === true || todo.checked === 'true';
        return `
            <div class="card mb-3 todo-item ${isChecked ? 'completed' : ''}" data-id="${todo.id}">
                <div class="card-body">
                    <div class="d-flex align-items-start justify-content-between">
                        <div class="form-check flex-grow-1">
                            <input class="form-check-input" type="checkbox"
                                   ${isChecked ? 'checked' : ''}
                                   onchange="toggleTodo('${todo.id}', this.checked)"
                                   style="transform: scale(1.3); margin-top: 0.35rem;">
                            <label class="form-check-label ms-2 ${isChecked ? 'text-decoration-line-through' : ''}"
                                   style="font-size: 1.1rem;">
                                <strong>${escapeHtml(todo.text)}</strong>
                            </label>
                        </div>
                        <div class="d-flex gap-2 align-items-center">
                            ${isChecked ?
                                '<span class="badge bg-success"><i class="bi bi-check-circle-fill"></i> Completada</span>' :
                                '<span class="badge bg-warning text-dark"><i class="bi bi-hourglass-split"></i> Pendiente</span>'}
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteTodo('${todo.id}')">
                                <i class="bi bi-trash-fill"></i>
                            </button>
                        </div>
                    </div>
                    <div class="mt-3 pt-2 border-top">
                        <small class="text-muted d-block">
                            <i class="bi bi-calendar-plus"></i> Creada: ${formatDate(todo.createdAt)}
                            ${todo.updatedAt !== todo.createdAt ? ` | <i class="bi bi-pencil"></i> Actualizada: ${formatDate(todo.updatedAt)}` : ''}
                        </small>
                    </div>
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
        input.focus();
        input.classList.add('is-invalid');
        setTimeout(() => input.classList.remove('is-invalid'), 2000);
        return;
    }

    const btn = document.getElementById('add-btn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Añadiendo...';

    try {
        const response = await fetch(`${currentApiUrl}/todos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        input.value = '';
        await loadTodos();

        // Success feedback
        btn.classList.add('btn-success');
        btn.classList.remove('btn-primary');
        btn.innerHTML = '<i class="bi bi-check-lg"></i> ¡Añadida!';
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.remove('btn-success');
            btn.classList.add('btn-primary');
            btn.disabled = false;
        }, 1500);
    } catch (error) {
        showError(`Error al añadir tarea: ${error.message}`);
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
}

async function toggleTodo(id, checked) {
    const card = document.querySelector(`[data-id="${id}"]`);
    const originalClass = card.className;

    try {
        const response = await fetch(`${currentApiUrl}/todos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checked: checked.toString() })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        await loadTodos();
    } catch (error) {
        showError(`Error al actualizar tarea: ${error.message}`);
        card.className = originalClass;
        await loadTodos();
    }
}

async function deleteTodo(id) {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;

    const card = document.querySelector(`[data-id="${id}"]`);
    card.classList.add('hiding');

    try {
        const response = await fetch(`${currentApiUrl}/todos/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        setTimeout(async () => {
            await loadTodos();
        }, 300);
    } catch (error) {
        card.classList.remove('hiding');
        showError(`Error al eliminar tarea: ${error.message}`);
    }
}

function formatDate(timestamp) {
    const date = new Date(parseFloat(timestamp) * 1000);
    return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    alert.style.zIndex = '9999';
    alert.innerHTML = `
        <i class="bi bi-exclamation-triangle-fill"></i> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}
