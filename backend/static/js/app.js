let allProducts = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    
    // Listeners para barra de búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', filtrarTabla);

    // Listener para el formulario del modal
    const productoForm = document.getElementById('productoForm');
    if (productoForm) {
        productoForm.addEventListener('submit', guardarProducto);
    }
    
    // Inicializar lógica de Custom Dropdowns
    document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
        const selected = dropdown.querySelector('.dropdown-selected');
        const optionsContainer = dropdown.querySelector('.dropdown-options');
        const hiddenInput = dropdown.querySelector('input[type="hidden"]');
        
        selected.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que el listener global lo cierre
            // Cerrar otros abiertos
            document.querySelectorAll('.custom-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.remove('active');
            });
            dropdown.classList.toggle('active');
        });
        
        optionsContainer.addEventListener('click', (e) => {
            const option = e.target.closest('.dropdown-option');
            if (option) {
                const value = option.dataset.value;
                const text = option.textContent;
                
                selected.textContent = text;
                hiddenInput.value = value;
                
                // Actualizar clases selected
                optionsContainer.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                dropdown.classList.remove('active');
                
                // Disparar filtrado si es el filtro de categorías
                if (hiddenInput.id === 'categoryFilter') {
                    filtrarTabla();
                }
            }
        });
    });

    // Cerrar dropdowns si se hace clic afuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) {
            document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('active'));
        }
    });
});

// --- COMUNICACIÓN CON LA API ---

async function cargarProductos() {
    try {
        const response = await fetch('/productos');
        if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
        
        allProducts = await response.json();
        poblarFiltroCategorias(allProducts);
        renderTabla(allProducts);
    } catch (error) {
        console.error('Error fetching products:', error);
        mostrarToast('Error al cargar los productos', 'error');
        document.getElementById('tableBody').innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: #f87171;">
                    Ocurrió un error al cargar el inventario.
                </td>
            </tr>
        `;
    }
}

async function guardarProducto(event) {
    event.preventDefault();
    
    const id = document.getElementById('productoId').value;
    const isEdit = id !== "";
    
    // Validación extra para asegurar que hay una categoría
    const categoria = document.getElementById('categoria').value;
    if (!categoria) {
        mostrarToast('Por favor, selecciona una categoría válida', 'error');
        return;
    }
    
    const productoData = {
        nombre: document.getElementById('nombre').value,
        precio: parseFloat(document.getElementById('precio').value) || 0,
        costo: parseFloat(document.getElementById('costo').value) || 0,
        stock: parseInt(document.getElementById('stock').value) || 0,
        categoria: categoria
    };

    const url = isEdit ? `/productos/${id}` : '/productos';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productoData)
        });

        if (!response.ok) throw new Error('Error al guardar el producto');

        mostrarToast(isEdit ? 'Producto actualizado con éxito' : 'Producto creado con éxito', 'success');
        cerrarModal();
        cargarProductos(); // Refrescar la tabla automáticamente
        
    } catch (error) {
        console.error('Error saving product:', error);
        mostrarToast('Ocurrió un error al guardar', 'error');
    }
}

let productoAEliminar = null;

function eliminarProducto(id, nombre) {
    productoAEliminar = id;
    document.getElementById('deleteMessage').innerHTML = `¿Estás seguro que deseas eliminar <strong>"${nombre}"</strong> del inventario?`;
    document.getElementById('deleteModal').classList.add('active');
}

function cerrarModalDelete() {
    document.getElementById('deleteModal').classList.remove('active');
    productoAEliminar = null;
}

document.getElementById('btnConfirmDelete')?.addEventListener('click', async () => {
    if (!productoAEliminar) return;
    const id = productoAEliminar;
    cerrarModalDelete();

    try {
        const response = await fetch(`/productos/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Error al eliminar');

        mostrarToast('Producto eliminado exitosamente', 'success');
        cargarProductos(); // Refrescar tabla
    } catch (error) {
        console.error('Error deleting product:', error);
        mostrarToast('Error al eliminar el producto', 'error');
    }
});

// --- RENDERIZADO Y LÓGICA DE UI ---

function poblarFiltroCategorias(productos) {
    const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))].sort();
    
    const hiddenInput = document.getElementById('categoryFilter');
    const optionsContainer = document.getElementById('filterOptions');
    
    const currentVal = hiddenInput.value; 
    
    let html = '<div class="dropdown-option" data-value="">Todas las categorías</div>';
    categorias.forEach(cat => {
        html += `<div class="dropdown-option" data-value="${cat}">${cat}</div>`;
    });
    
    optionsContainer.innerHTML = html;
    
    // Restaurar UI del dropdown seleccionado
    const selectedOpt = optionsContainer.querySelector(`[data-value="${currentVal}"]`) || optionsContainer.firstElementChild;
    selectedOpt.classList.add('selected');
    document.getElementById('filterSelected').textContent = selectedOpt.textContent;
}

function filtrarTabla() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const categoria = document.getElementById('categoryFilter').value;
    
    const filtrados = allProducts.filter(p => {
        const matchSearch = p.nombre.toLowerCase().includes(searchTerm);
        const matchCat = categoria === "" || p.categoria === categoria;
        return matchSearch && matchCat;
    });
    
    renderTabla(filtrados);
}

function renderTabla(productos) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    if (productos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #94a3b8;">No se encontraron productos.</td></tr>`;
        return;
    }
    
    productos.forEach((p, index) => {
        const tr = document.createElement('tr');
        tr.style.animationDelay = `${index * 0.03}s`;
        
        let stockClass = 'stock-low';
        if (p.stock > 10) stockClass = 'stock-high';
        else if (p.stock > 0 && p.stock <= 10) stockClass = 'stock-med';
        
        tr.innerHTML = `
            <td style="font-weight: 500;">${p.nombre}</td>
            <td style="color: #94a3b8;">${p.categoria}</td>
            <td style="font-weight: 600;">$ ${p.precio.toLocaleString('es-CO')}</td>
            <td>
                <span class="stock-badge ${stockClass}">${p.stock}</span>
            </td>
            <td>
                <button class="action-btn btn-edit" title="Editar" onclick="abrirModalEditar(${p.id})">✏️</button>
                <button class="action-btn btn-delete" title="Eliminar" onclick="eliminarProducto(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- MODALES Y TOASTS ---

function abrirModal() {
    document.getElementById('productoForm').reset();
    document.getElementById('productoId').value = "";
    document.getElementById('modalTitle').textContent = "Nuevo Producto";
    
    // Reset dropdown UI
    document.getElementById('categoria').value = "";
    const formSelected = document.getElementById('formSelected');
    const formOptions = document.getElementById('formOptions');
    formOptions.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('selected'));
    const defaultOpt = formOptions.querySelector(`[data-value=""]`);
    if(defaultOpt) {
        defaultOpt.classList.add('selected');
        formSelected.textContent = defaultOpt.textContent;
    }
    
    document.getElementById('productoModal').classList.add('active');
}

function abrirModalEditar(id) {
    const producto = allProducts.find(p => p.id === id);
    if (!producto) return;
    
    document.getElementById('productoId').value = producto.id;
    document.getElementById('nombre').value = producto.nombre;
    document.getElementById('precio').value = producto.precio;
    document.getElementById('costo').value = producto.costo || 0;
    document.getElementById('stock').value = producto.stock || 0;
    
    // Actualizar Dropdown UI
    document.getElementById('categoria').value = producto.categoria;
    const formSelected = document.getElementById('formSelected');
    const formOptions = document.getElementById('formOptions');
    formOptions.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('selected'));
    
    const targetOpt = formOptions.querySelector(`[data-value="${producto.categoria}"]`);
    if(targetOpt) {
        targetOpt.classList.add('selected');
        formSelected.textContent = targetOpt.textContent;
    }
    
    document.getElementById('modalTitle').textContent = "Editar Producto";
    document.getElementById('productoModal').classList.add('active');
}

function cerrarModal() {
    document.getElementById('productoModal').classList.remove('active');
}

function mostrarToast(mensaje, tipo = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    
    const icon = tipo === 'success' ? '✅' : '❌';
    toast.innerHTML = `<span>${icon}</span> <span>${mensaje}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
