// Se a API estiver em outro endereço, altere esta constante.
const API_BASE_URL = 'http://localhost:3000';

const itemForm = document.querySelector('#itemForm');
const itemNameInput = document.querySelector('#itemName');
const itemsList = document.querySelector('#itemsList');
const formTitle = document.querySelector('#formTitle');
const submitButton = document.querySelector('#submitButton');
const cancelEditButton = document.querySelector('#cancelEditButton');
const formStatus = document.querySelector('#formStatus');
const listStatus = document.querySelector('#listStatus');
const connectionStatus = document.querySelector('#connectionStatus');

let editingId = null;

document.querySelector('#apiAddress').textContent = API_BASE_URL;

function showStatus(element, message = '', type = '') {
    element.textContent = message;
    element.className = `status ${type}`.trim();
}

// Faz requisições HTTP e interpreta as respostas JSON da API.
async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });

    if (response.status === 204) return null;

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Erro HTTP ${response.status}`);
    }

    return data;
}

async function checkApi() {
    showStatus(connectionStatus, 'Verificando conexão...');

    try {
        const result = await apiRequest('/');
        showStatus(connectionStatus, result.message || 'API respondeu corretamente.', 'success');
        
    } catch (error) {
        showStatus(connectionStatus, `Não foi possível acessar a API: ${error.message}`, 'error');
    }
}

async function loadItems() {
    itemsList.innerHTML = '<li class="empty">Carregando itens...</li>';
    showStatus(listStatus);

    try {
        const items = await apiRequest('/items');
        renderItems(items);

    } catch (error) {
        itemsList.innerHTML = '<li class="empty">Não foi possível carregar os itens.</li>';
        showStatus(listStatus, error.message, 'error');
    }
}

function renderItems(items) {
    itemsList.replaceChildren();

    if (!items.length) {
        const empty = document.createElement('li');
        
        empty.className = 'empty';
        empty.textContent = 'Nenhum item cadastrado.';
        
        itemsList.appendChild(empty);
        return;
    }

    for (const item of items) {
        const li = document.createElement('li');
        const description = document.createElement('div');
        const id = document.createElement('span');

        id.className = 'item-id';
        id.textContent = `#${item.id}`;

        const name = document.createElement('span');

        name.className = 'item-name';
        name.textContent = item.name;
        description.append(id, name);

        const actions = document.createElement('div');
        actions.className = 'actions';

        const detailButton = document.createElement('button');

        detailButton.type = 'button';
        detailButton.className = 'secondary';
        detailButton.textContent = 'Detalhes';
        detailButton.addEventListener('click', () => getItem(item.id));
        
        const editButton = document.createElement('button');

        editButton.type = 'button';
        editButton.className = 'secondary';
        editButton.textContent = 'Editar';
        editButton.addEventListener('click', () => startEditing(item));

        const deleteButton = document.createElement('button');

        deleteButton.type = 'button';
        deleteButton.className = 'danger';
        deleteButton.textContent = 'Excluir';
        deleteButton.addEventListener('click', () => deleteItem(item.id));

        actions.append(detailButton, editButton, deleteButton);
        li.append(description, actions);
        itemsList.appendChild(li);
    }
}

// GET /items/:id
async function getItem(id) {
    try {
        const item = await apiRequest(`/items/${id}`);
        alert(`Item #${item.id}\\nNome: ${item.name}`);

    } catch (error) {
        showStatus(listStatus, error.message, 'error');
    }
}

function startEditing(item) {
  editingId = item.id;
  itemNameInput.value = item.name;
  formTitle.textContent = `Editar item #${item.id}`;
  submitButton.textContent = 'Salvar alterações';
  cancelEditButton.hidden = false;

  showStatus(formStatus, 'Altere o nome e clique em "Salvar alterações".');
  itemNameInput.focus();
}

function resetForm() {
  editingId = null;
  itemForm.reset();

  formTitle.textContent = 'Cadastrar item';
  submitButton.textContent = 'Cadastrar';
  cancelEditButton.hidden = true;

  showStatus(formStatus);
}

// POST /items para cadastro e PUT /items/:id para edição.
itemForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = itemNameInput.value.trim();
    
    if (!name) {
        showStatus(formStatus, 'Informe o nome do item.', 'error');
        itemNameInput.focus();
        return;
    }

    submitButton.disabled = true;

    try {
        if (editingId === null) {
            await apiRequest('/items', {
                method: 'POST',
                body: JSON.stringify({ name })
            });

            showStatus(formStatus, 'Item cadastrado com sucesso.', 'success');
        } else {
            await apiRequest(`/items/${editingId}`, {
                method: 'PUT',
                body: JSON.stringify({ name })
            });

            showStatus(formStatus, 'Item atualizado com sucesso.', 'success');
        }

        resetForm();
        await loadItems();

    } catch (error) {
        showStatus(formStatus, error.message, 'error');
    } finally {
        submitButton.disabled = false;
    }
});

// DELETE /items/:id
async function deleteItem(id) {
    if (!confirm(`Deseja realmente excluir o item #${id}?`)) return;
    
    try {
        await apiRequest(`/items/${id}`, { method: 'DELETE' });
        showStatus(listStatus, 'Item excluído com sucesso.', 'success');
        
        if (editingId === id) resetForm();
        await loadItems();

    } catch (error) {
        showStatus(listStatus, error.message, 'error');
    }
}

cancelEditButton.addEventListener('click', resetForm);

document.querySelector('#reloadButton').addEventListener('click', loadItems);
document.querySelector('#checkApiButton').addEventListener('click', checkApi);

// Carrega os dados ao abrir a página.
checkApi();
loadItems();