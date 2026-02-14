// API Configuration
const API_URLS = {
    staging: 'https://jvqejb8c64.execute-api.us-east-1.amazonaws.com/Prod',
    production: 'https://zzdyawev6k.execute-api.us-east-1.amazonaws.com/Prod'
};

let currentEnv = 'staging';
let currentApiUrl = API_URLS.staging;

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
});

function updateApiDisplay() {
    document.getElementById('current-api').textContent = currentApiUrl;
}

async function loadTodos() {
    const container = document.getElementById('todos-container');
    container.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-2 text-muted">Cargando tareas...</p>
        </div>
    `;

    try {
        const response = await fetch(`${currentApiUrl}/todos`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const todos = await response.json();

        if (todos.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info text-center">
                    <i class="bi bi-inbox"></i> No hay tareas. ¡Añade una nueva!
                </div>
            `;
            return;
        }

        container.innerHTML = todos.map(todo => `
            <div class="card mb-3 todo-item ${todo.checked ? 'checked' : ''}" data-id="${todo.id}">
                <div class="card-body">
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="form-check flex-grow-1">
                            <input class="form-check-input" type="checkbox" ${todo.checked ? 'checked' : ''}
                                   onchange="toggleTodo('${todo.id}', this.checked)">
                            <label class="form-check-label ${todo.checked ? 'text-decoration-line-through' : ''}">
                                <strong>${escapeHtml(todo.text)}</strong>
                            </label>
                        </div>
                        <div>
                            ${todo.checked ? '<span class="badge bg-success me-2"><i class="bi bi-check-lg"></i> Completada</span>' :
                                            '<span class="badge bg-warning text-dark me-2"><i class="bi bi-hourglass-split"></i> Pendiente</span>'}
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteTodo('${todo.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                    <small class="text-muted mt-2 d-block">
                        <i class="bi bi-clock"></i> Creada: ${formatDate(todo.createdAt)} |
                        Actualizada: ${formatDate(todo.updatedAt)}
                    </small>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i>
                <strong>Error al cargar tareas:</strong> ${error.message}
            </div>
        `;
    }
}

async function addTodo() {
    const input = document.getElementById('new-todo-text');
    const text = input.value.trim();

    if (!text) {
        alert('Por favor, escribe una tarea');
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

        // Success animation
        btn.innerHTML = '<i class="bi bi-check-lg"></i> ¡Añadida!';
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }, 1000);
    } catch (error) {
        alert(`Error al añadir tarea: ${error.message}`);
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
        alert(`Error al actualizar tarea: ${error.message}`);
        card.className = originalClass;
        await loadTodos();
    }
}

async function deleteTodo(id) {
    if (!confirm('¿Seguro que quieres eliminar esta tarea?')) return;

    const card = document.querySelector(`[data-id="${id}"]`);
    card.style.opacity = '0.5';

    try {
        const response = await fetch(`${currentApiUrl}/todos/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        await loadTodos();
    } catch (error) {
        alert(`Error al eliminar tarea: ${error.message}`);
        card.style.opacity = '1';
    }
}

function formatDate(timestamp) {
    const date = new Date(parseFloat(timestamp) * 1000);
    return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
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
