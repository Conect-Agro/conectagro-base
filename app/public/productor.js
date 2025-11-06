// ===== GLOBAL STATE =====
let currentSection = 'dashboard';
let products = [];
let orders = [];
let notifications = [];
let uploadedImageBase64 = null; // Variable para almacenar la imagen en base64

// ===== UTILITY FUNCTIONS =====
// Formatear precio con separador de miles y decimales
function formatPrice(amount) {
    const num = Number(amount);
    if (isNaN(num)) return '$0';
    
    // Formato colombiano: punto para miles, coma para decimales
    return '$' + num.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeModals();
    initializeMenuToggle();
    initializeProductFilters(); // Inicializar filtros de productos
    initializeOrderFilters(); // Inicializar filtros de pedidos
    loadProducerData();
    loadDashboardData();
    loadReputationData(); // Cargar datos de reputación mock
    updateBadges(); // Actualizar badges al cargar
});

// ===== NAVIGATION =====
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    const linkButtons = document.querySelectorAll('.link-button[data-section]');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            navigateToSection(section);
        });
    });
    
    linkButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const section = button.dataset.section;
            navigateToSection(section);
        });
    });
}

function navigateToSection(sectionName) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.nav-item[data-section="${sectionName}"]`)?.classList.add('active');
    
    // Update content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionName)?.classList.add('active');
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard del Productor',
        'productos': 'Mis Productos',
        'pedidos': 'Gestión de Pedidos',
        'perfil': 'Mi Perfil',
        'notificaciones': 'Notificaciones'
    };
    document.querySelector('.page-title').textContent = titles[sectionName] || 'Dashboard';
    
    // Load section data
    currentSection = sectionName;
    loadSectionData(sectionName);
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('active');
    }
}

// ===== MENU TOGGLE (MOBILE) =====
function initializeMenuToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    
    menuToggle?.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
    
    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
}

// ===== LOAD PRODUCER DATA =====
async function loadProducerData() {
    try {
        const response = await fetch('/api/producer/profile');
        
        if (!response.ok) {
            throw new Error('Error al obtener perfil del productor');
        }
        
        const producerData = await response.json();
        
        // Update UI
        document.getElementById('userName').textContent = `${producerData.first_name} ${producerData.last_name}`;
        document.getElementById('farmName').textContent = producerData.farm_name;
        document.getElementById('productionType').textContent = producerData.production_type_name 
            ? `${producerData.production_type_category} - ${producerData.production_type_name}` 
            : 'No especificado';
        document.getElementById('profileFarmName').textContent = producerData.farm_name;
        document.getElementById('profileNit').textContent = producerData.nit || 'No especificado';
        document.getElementById('profileLocation').textContent = producerData.location || 'No especificado';
        document.getElementById('profileSize').textContent = producerData.farm_size 
            ? `${producerData.farm_size} m²` 
            : 'No especificado';
        document.getElementById('profileProductionType').textContent = producerData.production_type_name 
            ? `${producerData.production_type_category} - ${producerData.production_type_name}` 
            : 'No especificado';
        document.getElementById('profilePhone').textContent = producerData.contact_phone || 'No especificado';
        document.getElementById('profileEmail').textContent = producerData.contact_email || producerData.email;
        
        // Store producer data globally for form autofill
        window.producerData = producerData;
        
    } catch (error) {
        console.error('Error loading producer data:', error);
        alert('Error al cargar datos del productor');
    }
}

// ===== LOAD DASHBOARD DATA =====
async function loadDashboardData() {
    try {
        const response = await fetch('/api/producer/metrics');
        
        if (!response.ok) {
            throw new Error('Error al obtener métricas');
        }
        
        const metrics = await response.json();
        
        document.getElementById('activeProducts').textContent = metrics.active_products || 0;
        document.getElementById('totalSales').textContent = formatPrice(metrics.total_sales || 0);
        document.getElementById('pendingOrders').textContent = metrics.pending_orders || 0;
        document.getElementById('avgRating').textContent = (metrics.avg_rating || 0).toFixed(1);
        
        // Load recent products and orders
        loadRecentProducts();
        loadRecentOrders();
        
        // Actualizar badges con datos reales
        updateBadges();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Set defaults
        document.getElementById('activeProducts').textContent = '0';
        document.getElementById('totalSales').textContent = '$0';
        document.getElementById('pendingOrders').textContent = '0';
        document.getElementById('avgRating').textContent = '0.0';
    }
}

// ===== UPDATE BADGES =====
async function updateBadges() {
    try {
        // Actualizar badge de pedidos pendientes
        const ordersResponse = await fetch('/api/producer/orders');
        if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            const pendingOrders = ordersData.filter(order => order.status === 'pending').length;
            
            const ordersBadge = document.querySelector('.nav-item[data-section="pedidos"] .badge');
            if (ordersBadge) {
                if (pendingOrders > 0) {
                    ordersBadge.textContent = pendingOrders;
                    ordersBadge.style.display = 'inline-block';
                } else {
                    ordersBadge.style.display = 'none';
                }
            }
        }
        
        // Actualizar badge de notificaciones no leídas
        // Por ahora usamos mock data, pero puedes conectarlo a una API real más adelante
        const notificationsBadge = document.querySelector('.nav-item[data-section="notificaciones"] .badge');
        const headerNotificationBadge = document.querySelector('.notification-badge');
        
        // Mock: contar notificaciones no leídas
        const unreadCount = notifications.filter(n => !n.read).length;
        
        if (notificationsBadge) {
            if (unreadCount > 0) {
                notificationsBadge.textContent = unreadCount;
                notificationsBadge.style.display = 'inline-block';
            } else {
                notificationsBadge.style.display = 'none';
            }
        }
        
        if (headerNotificationBadge) {
            if (unreadCount > 0) {
                headerNotificationBadge.textContent = unreadCount;
                headerNotificationBadge.style.display = 'inline-block';
            } else {
                headerNotificationBadge.style.display = 'none';
            }
        }
        
    } catch (error) {
        console.error('Error updating badges:', error);
    }
}

// ===== LOAD SECTION DATA =====
function loadSectionData(section) {
    switch(section) {
        case 'productos':
            loadAllProducts();
            break;
        case 'pedidos':
            loadAllOrders();
            break;
        case 'notificaciones':
            loadNotifications();
            break;
        case 'perfil':
            loadReputationData();
            break;
    }
}

// ===== REPUTATION =====
function loadReputationData() {
    // Mock data - En producción vendría de la API
    const reputationData = {
        averageRating: 4.7,
        totalReviews: 48,
        ratingDistribution: {
            5: 32,
            4: 10,
            3: 4,
            2: 1,
            1: 1
        }
    };
    
    // Actualizar el número de rating
    const ratingNumberEl = document.getElementById('reputationRating');
    if (ratingNumberEl) {
        ratingNumberEl.textContent = reputationData.averageRating.toFixed(1);
    }
    
    // Generar las estrellas
    const starsContainer = document.getElementById('reputationStars');
    if (starsContainer) {
        const fullStars = Math.floor(reputationData.averageRating);
        const hasHalfStar = reputationData.averageRating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let starsHtml = '';
        
        // Estrellas llenas
        for (let i = 0; i < fullStars; i++) {
            starsHtml += '<i class="fas fa-star"></i>';
        }
        
        // Media estrella
        if (hasHalfStar) {
            starsHtml += '<i class="fas fa-star-half-alt"></i>';
        }
        
        // Estrellas vacías
        for (let i = 0; i < emptyStars; i++) {
            starsHtml += '<i class="far fa-star"></i>';
        }
        
        starsContainer.innerHTML = starsHtml;
    }
    
    // Actualizar el contador de reviews
    const countEl = document.getElementById('reputationCount');
    if (countEl) {
        countEl.textContent = `Basado en ${reputationData.totalReviews} calificaciones`;
    }
    
    // Generar las barras de distribución
    const barsContainer = document.getElementById('ratingBars');
    if (barsContainer) {
        let barsHtml = '';
        
        for (let stars = 5; stars >= 1; stars--) {
            const count = reputationData.ratingDistribution[stars] || 0;
            const percentage = (count / reputationData.totalReviews * 100).toFixed(0);
            
            barsHtml += `
                <div class="rating-bar-row">
                    <span class="rating-label">${stars} <i class="fas fa-star"></i></span>
                    <div class="rating-bar-container">
                        <div class="rating-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="rating-count">${count}</span>
                </div>
            `;
        }
        
        barsContainer.innerHTML = barsHtml;
    }
}

// ===== PRODUCTS =====
async function loadRecentProducts() {
    const container = document.getElementById('recentProducts');
    
    try {
        const response = await fetch('/api/producer/products');
        
        if (!response.ok) {
            throw new Error('Error al obtener productos');
        }
        
        const allProducts = await response.json();
        const recentProducts = allProducts.slice(0, 3); // Solo los 3 más recientes
        
        if (recentProducts.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay productos registrados aún</p>';
            return;
        }
        
        container.innerHTML = recentProducts.map(product => `
            <div class="product-preview-item">
                <strong>${product.product_name}</strong>
                <span class="status-${product.is_active ? 'disponible' : 'agotado'}">
                    ${product.is_active && product.stock > 0 ? 'Disponible' : 'Agotado'}
                </span>
                <span>${formatPrice(product.price)} / ${product.unit || 'kg'}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent products:', error);
        container.innerHTML = '<p class="empty-state">Error al cargar productos</p>';
    }
}

async function loadAllProducts() {
    const grid = document.getElementById('productsGrid');
    
    try {
        const response = await fetch('/api/producer/products');
        
        if (!response.ok) {
            throw new Error('Error al obtener productos');
        }
        
        products = await response.json();
        
        if (products.length === 0) {
            grid.innerHTML = '<p class="empty-state" style="grid-column: 1 / -1;">No hay productos registrados. Haz clic en "Agregar Producto" para comenzar.</p>';
            return;
        }
        
        grid.innerHTML = products.map(product => createProductCard(product)).join('');
        attachProductListeners();
    } catch (error) {
        console.error('Error loading products:', error);
        grid.innerHTML = '<p class="empty-state" style="grid-column: 1 / -1;">Error al cargar productos</p>';
    }
}

function createProductCard(product) {
    const status = product.is_active && product.stock > 0 ? 'disponible' : 'agotado';
    const statusText = status === 'disponible' ? 'Disponible' : 'Agotado';
    
    // Usar imagen de ConectAgro como placeholder si no hay imagen
    const defaultImage = '/img/ConectAgro.png';
    
    return `
        <div class="product-card" data-product-id="${product.product_id}">
            <img src="${product.image_url || defaultImage}" alt="${product.product_name}" class="product-image" onerror="this.src='${defaultImage}'">
            <div class="product-info">
                <div class="product-header">
                    <h3 class="product-name">${product.product_name}</h3>
                    <span class="product-status status-${status}">
                        ${statusText}
                    </span>
                </div>
                <p class="product-category">${product.category_name}</p>
                <div class="product-details">
                    <span class="product-price">${formatPrice(product.price)}</span>
                    <span class="product-quantity">${product.stock} ${product.unit || 'kg'}</span>
                </div>
                <div class="product-actions">
                    <button class="btn btn-secondary btn-edit-product" data-id="${product.product_id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-delete-product" data-id="${product.product_id}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        </div>
    `;
}

function attachProductListeners() {
    document.querySelectorAll('.btn-edit-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(e.currentTarget.dataset.id);
            editProduct(productId);
        });
    });
    
    document.querySelectorAll('.btn-delete-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(e.currentTarget.dataset.id);
            deleteProduct(productId);
        });
    });
}

// ===== PRODUCT FILTERS =====
function initializeProductFilters() {
    const searchInput = document.getElementById('searchProducts');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterProducts);
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterProducts);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', filterProducts);
    }
}

function filterProducts() {
    const searchTerm = document.getElementById('searchProducts')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    const grid = document.getElementById('productsGrid');
    
    const filteredProducts = products.filter(product => {
        // Filtro de búsqueda
        const matchesSearch = product.product_name.toLowerCase().includes(searchTerm) ||
                            product.category_name.toLowerCase().includes(searchTerm);
        
        // Filtro de categoría
        const matchesCategory = !categoryFilter || product.category_id == categoryFilter;
        
        // Filtro de estado
        let matchesStatus = true;
        if (statusFilter === 'disponible') {
            matchesStatus = product.is_active && product.stock > 0;
        } else if (statusFilter === 'agotado') {
            matchesStatus = !product.is_active || product.stock === 0;
        }
        
        return matchesSearch && matchesCategory && matchesStatus;
    });
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = '<p class="empty-state" style="grid-column: 1 / -1;">No se encontraron productos con los filtros seleccionados.</p>';
        return;
    }
    
    grid.innerHTML = filteredProducts.map(product => createProductCard(product)).join('');
    attachProductListeners();
}

// ===== ORDER FILTERS =====
function initializeOrderFilters() {
    const statusFilter = document.getElementById('orderStatusFilter');
    const dateFilter = document.getElementById('orderDateFilter');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', filterOrders);
    }
    
    if (dateFilter) {
        dateFilter.addEventListener('change', filterOrders);
    }
}

function filterOrders() {
    const statusFilter = document.getElementById('orderStatusFilter')?.value || '';
    const dateFilter = document.getElementById('orderDateFilter')?.value || '';
    
    const tbody = document.querySelector('#ordersTable tbody');
    
    if (!tbody || orders.length === 0) return;
    
    const filteredOrders = orders.filter(order => {
        // Filtro de estado
        const matchesStatus = !statusFilter || order.status === statusFilter;
        
        // Filtro de fecha
        let matchesDate = true;
        if (dateFilter) {
            // Extraer solo la parte de la fecha (YYYY-MM-DD) del order_date
            const orderDateStr = order.order_date.split('T')[0]; // Si viene como ISO
            const orderDateOnly = orderDateStr.split(' ')[0]; // Si viene con espacio
            
            matchesDate = orderDateOnly === dateFilter;
        }
        
        return matchesStatus && matchesDate;
    });
    
    if (filteredOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No se encontraron pedidos con los filtros seleccionados</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredOrders.map(order => `
        <tr>
            <td><strong>#${order.order_id}</strong></td>
            <td>${order.customer_first_name} ${order.customer_last_name}</td>
            <td>${order.products || 'Ver detalles'}</td>
            <td><strong>${formatPrice(order.total)}</strong></td>
            <td>${new Date(order.order_date).toLocaleDateString()}</td>
            <td><span class="order-status status-${order.status}">${getStatusText(order.status)}</span></td>
            <td class="action-buttons">
                <button class="icon-btn" onclick="viewOrderDetails(${order.order_id})" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="icon-btn" onclick="updateOrderStatus(${order.order_id})" title="Actualizar estado">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ===== ORDERS =====
async function loadRecentOrders() {
    const container = document.getElementById('recentOrders');
    
    try {
        const response = await fetch('/api/producer/orders');
        
        if (!response.ok) {
            throw new Error('Error al obtener pedidos');
        }
        
        const allOrders = await response.json();
        const recentOrders = allOrders.slice(0, 3); // Solo los 3 más recientes
        
        if (recentOrders.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay pedidos recientes</p>';
            return;
        }
        
        container.innerHTML = recentOrders.map(order => `
            <div class="order-preview-item">
                <strong>Pedido #${order.order_id}</strong>
                <span>${order.customer_first_name} ${order.customer_last_name}</span>
                <span class="status-${order.status}">${getStatusText(order.status)}</span>
                <span>${formatPrice(order.total)}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent orders:', error);
        container.innerHTML = '<p class="empty-state">Error al cargar pedidos</p>';
    }
}

async function loadAllOrders() {
    const tbody = document.querySelector('#ordersTable tbody');
    
    try {
        const response = await fetch('/api/producer/orders');
        
        if (!response.ok) {
            throw new Error('Error al obtener pedidos');
        }
        
        orders = await response.json();
        
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No hay pedidos registrados</td></tr>';
            updateBadges(); // Actualizar badges cuando no hay pedidos
            return;
        }
        
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td><strong>#${order.order_id}</strong></td>
                <td>${order.customer_first_name} ${order.customer_last_name}</td>
                <td>${order.products || 'Ver detalles'}</td>
                <td><strong>${formatPrice(order.total)}</strong></td>
                <td>${new Date(order.order_date).toLocaleDateString()}</td>
                <td><span class="order-status status-${order.status}">${getStatusText(order.status)}</span></td>
                <td class="action-buttons">
                    <button class="icon-btn" onclick="viewOrderDetails(${order.order_id})" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="icon-btn" onclick="updateOrderStatus(${order.order_id})" title="Actualizar estado">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Actualizar badges después de cargar pedidos
        updateBadges();
    } catch (error) {
        console.error('Error loading orders:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">Error al cargar pedidos</td></tr>';
    }
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Pendiente',
        'shipped': 'Enviado',
        'delivered': 'Entregado',
        'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
}

function viewOrderDetails(orderId) {
    // Implementation for viewing order details
    alert(`Ver detalles del pedido #${orderId}`);
}

function updateOrderStatus(orderId) {
    // Implementation for updating order status
    alert(`Actualizar estado del pedido #${orderId}`);
}

// ===== NOTIFICATIONS =====
async function loadNotifications() {
    const container = document.getElementById('notificationsList');
    
    try {
        const response = await fetch('/api/producer/notifications');
        
        if (!response.ok) {
            throw new Error('Error al obtener notificaciones');
        }
        
        notifications = await response.json();
        
        if (notifications.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay notificaciones</p>';
            updateBadges();
            return;
        }
        
        container.innerHTML = notifications.map(notif => `
            <div class="notification-item ${notif.read ? '' : 'unread'}" data-notification-id="${notif.id}">
                <div class="notification-icon-circle" style="background: ${notif.color}20; color: ${notif.color}">
                    <i class="fas ${notif.icon}"></i>
                </div>
                <div class="notification-content">
                    <h4 class="notification-title">${notif.title}</h4>
                    <p class="notification-text">${notif.text}</p>
                    <span class="notification-time">${notif.time}</span>
                </div>
            </div>
        `).join('');
        
        // Agregar event listeners para marcar como leído al hacer clic
        document.querySelectorAll('.notification-item.unread').forEach(item => {
            item.addEventListener('click', function() {
                const notifId = parseInt(this.dataset.notificationId);
                markNotificationAsRead(notifId);
            });
        });
        
        updateBadges();
    } catch (error) {
        console.error('Error loading notifications:', error);
        container.innerHTML = '<p class="empty-state">Error al cargar notificaciones</p>';
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        const response = await fetch('/api/producer/notifications/read', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notificationIds: [notificationId] })
        });
        
        if (response.ok) {
            // Actualizar el estado local
            const notif = notifications.find(n => n.id === notificationId);
            if (notif) {
                notif.read = true;
            }
            
            // Actualizar la UI
            const notifElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (notifElement) {
                notifElement.classList.remove('unread');
            }
            
            updateBadges();
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// ===== MODALS =====
function initializeModals() {
    const productModal = document.getElementById('productModal');
    const addProductBtns = document.querySelectorAll('#addProductBtn, #addProductBtn2');
    const closeProductModal = document.getElementById('closeProductModal');
    const cancelProductBtn = document.getElementById('cancelProductBtn');
    const productForm = document.getElementById('productForm');
    const imageUploadArea = document.getElementById('imageUploadArea');
    const productImages = document.getElementById('productImages');
    
    // Load categories for the form
    loadCategories();
    
    // Open modal
    addProductBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            productModal.classList.add('active');
            document.getElementById('modalTitle').textContent = 'Agregar Producto';
            productForm.reset();
            delete productForm.dataset.productId; // Clear edit mode
            
            // Limpiar imagen al abrir modal para nuevo producto
            uploadedImageBase64 = null;
            document.getElementById('imagePreview').innerHTML = '';
            document.getElementById('productImages').value = '';
            
            // Autofill origin if available
            if (window.producerData?.location) {
                document.getElementById('productOrigin').value = window.producerData.location;
            }
        });
    });
    
    // Close modal
    const closeModal = () => {
        productModal.classList.remove('active');
        delete productForm.dataset.productId;
        
        // Limpiar imagen al cerrar modal
        uploadedImageBase64 = null;
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('productImages').value = '';
    };
    
    closeProductModal.addEventListener('click', closeModal);
    cancelProductBtn.addEventListener('click', closeModal);
    
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) {
            closeModal();
        }
    });
    
    // Image upload
    imageUploadArea.addEventListener('click', () => {
        productImages.click();
    });
    
    productImages.addEventListener('change', handleImageUpload);
    
    // Form submit
    productForm.addEventListener('submit', handleProductSubmit);
    
    // Mark all notifications as read
    document.getElementById('markAllReadBtn')?.addEventListener('click', () => {
        notifications.forEach(n => n.read = true);
        loadNotifications();
    });
    
    // Initialize profile edit modal
    initializeProfileModal();
}

// ===== PROFILE MODAL =====
function initializeProfileModal() {
    const profileModal = document.getElementById('profileModal');
    const editFarmBtn = document.getElementById('editFarmBtn');
    const editContactBtn = document.getElementById('editContactBtn');
    const closeProfileModal = document.getElementById('closeProfileModal');
    const cancelProfileBtn = document.getElementById('cancelProfileBtn');
    const profileForm = document.getElementById('profileForm');
    const farmSection = document.getElementById('farmSection');
    const contactSection = document.getElementById('contactSection');
    
    console.log('Initializing profile modal...'); // Debug
    console.log('Elements found:', {
        profileModal: !!profileModal,
        editFarmBtn: !!editFarmBtn,
        editContactBtn: !!editContactBtn,
        profileForm: !!profileForm
    }); // Debug
    
    if (!profileModal || !profileForm) {
        console.error('Profile modal elements not found!');
        return;
    }
    
    // Open modal for farm info
    editFarmBtn?.addEventListener('click', () => {
        console.log('Edit farm button clicked'); // Debug
        profileModal.classList.add('active');
        document.getElementById('profileModalTitle').textContent = 'Editar Información de la Finca';
        
        // Show farm section, hide contact section
        farmSection.style.display = 'block';
        contactSection.style.display = 'none';
        
        // Enable required validation for farm fields
        document.getElementById('editFarmName').required = true;
        // Disable required validation for contact fields
        document.getElementById('editPhone').required = false;
        document.getElementById('editEmail').required = false;
        
        // Fill form with current data
        if (window.producerData) {
            document.getElementById('editFarmName').value = window.producerData.farm_name || '';
            document.getElementById('editNit').value = window.producerData.nit || '';
            document.getElementById('editLocation').value = window.producerData.location || '';
            document.getElementById('editFarmSize').value = window.producerData.farm_size || '';
        }
        
        profileForm.dataset.editMode = 'farm';
        console.log('Edit mode set to:', profileForm.dataset.editMode); // Debug
    });
    
    // Open modal for contact info
    editContactBtn?.addEventListener('click', () => {
        console.log('Edit contact button clicked'); // Debug
        profileModal.classList.add('active');
        document.getElementById('profileModalTitle').textContent = 'Editar Información de Contacto';
        
        // Show contact section, hide farm section
        farmSection.style.display = 'none';
        contactSection.style.display = 'block';
        
        // Disable required validation for farm fields
        document.getElementById('editFarmName').required = false;
        // Enable required validation for contact fields
        document.getElementById('editPhone').required = true;
        document.getElementById('editEmail').required = true;
        
        // Fill form with current data
        if (window.producerData) {
            document.getElementById('editPhone').value = window.producerData.contact_phone || '';
            document.getElementById('editEmail').value = window.producerData.contact_email || window.producerData.email || '';
        }
        
        profileForm.dataset.editMode = 'contact';
        console.log('Edit mode set to:', profileForm.dataset.editMode); // Debug
    });
    
    // Close modal
    const closeModal = () => {
        profileModal.classList.remove('active');
        profileForm.reset();
        delete profileForm.dataset.editMode;
    };
    
    closeProfileModal?.addEventListener('click', closeModal);
    cancelProfileBtn?.addEventListener('click', closeModal);
    
    profileModal?.addEventListener('click', (e) => {
        if (e.target === profileModal) {
            closeModal();
        }
    });
    
    // Form submit
    console.log('Adding submit listener to form'); // Debug
    profileForm.addEventListener('submit', handleProfileSubmit);
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    
    console.log('Form submitted'); // Debug
    
    const editMode = document.getElementById('profileForm').dataset.editMode;
    console.log('Edit mode:', editMode); // Debug
    
    let updateData = {};
    
    if (editMode === 'farm') {
        updateData = {
            farm_name: document.getElementById('editFarmName').value,
            nit: document.getElementById('editNit').value,
            location: document.getElementById('editLocation').value,
            farm_size: parseFloat(document.getElementById('editFarmSize').value) || null
        };
    } else if (editMode === 'contact') {
        updateData = {
            contact_phone: document.getElementById('editPhone').value,
            contact_email: document.getElementById('editEmail').value
        };
    }
    
    console.log('Update data:', updateData); // Debug
    
    try {
        const response = await fetch('/api/producer/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        console.log('Response status:', response.status); // Debug
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar perfil');
        }
        
        const result = await response.json();
        console.log('Success:', result); // Debug
        
        alert('Perfil actualizado exitosamente');
        document.getElementById('profileModal').classList.remove('active');
        
        // Reload producer data
        loadProducerData();
        
    } catch (error) {
        console.error('Error updating profile:', error);
        alert(error.message || 'Error al actualizar perfil');
    }
}

// Load categories from API
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) return;
        
        const categories = await response.json();
        
        // Cargar categorías en el select del modal de productos
        const select = document.getElementById('productCategory');
        if (select) {
            // Keep the first option (placeholder)
            select.innerHTML = '<option value="">Seleccionar categoría</option>';
            
            // Add categories from database
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.category_id;
                option.textContent = cat.category_name;
                select.appendChild(option);
            });
        }
        
        // Cargar categorías en el filtro de la sección de productos
        const filterSelect = document.getElementById('categoryFilter');
        if (filterSelect) {
            // Keep the first option (placeholder)
            filterSelect.innerHTML = '<option value="">Todas las categorías</option>';
            
            // Add categories from database
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.category_id;
                option.textContent = cat.category_name;
                filterSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function handleImageUpload(e) {
    const files = Array.from(e.target.files);
    const preview = document.getElementById('imagePreview');
    
    preview.innerHTML = '';
    
    if (files.length === 0) {
        uploadedImageBase64 = null;
        return;
    }
    
    // Tomar solo la primera imagen
    const file = files[0];
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido');
        return;
    }
    
    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Por favor selecciona una imagen menor a 5MB');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        // Comprimir la imagen antes de guardarla
        compressImage(e.target.result, (compressedBase64) => {
            // Guardar la imagen comprimida en base64 en la variable global
            uploadedImageBase64 = compressedBase64;
            
            const div = document.createElement('div');
            div.className = 'preview-image';
            div.innerHTML = `
                <img src="${compressedBase64}" alt="Preview">
                <button type="button" class="remove-image" onclick="removeImage()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            preview.appendChild(div);
        });
    };
    
    reader.readAsDataURL(file);
}

// Función para comprimir imagen
function compressImage(base64, callback, maxWidth = 800, quality = 0.7) {
    const img = new Image();
    img.src = base64;
    
    img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Redimensionar si es muy grande
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a Base64 comprimido
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        callback(compressedBase64);
    };
}

function removeImage() {
    // Limpiar la imagen
    uploadedImageBase64 = null;
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    document.getElementById('productImages').value = '';
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const productId = document.getElementById('productForm').dataset.productId;
    const isEdit = !!productId;
    
    // Si hay imagen cargada, usarla; si no, usar la imagen por defecto
    const imageUrl = uploadedImageBase64 || '/img/ConectAgro.png';
    
    const formData = {
        product_name: document.getElementById('productName').value,
        category_id: parseInt(document.getElementById('productCategory').value),
        description: document.getElementById('productDescription').value,
        unit: document.getElementById('productUnit').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productQuantity').value),
        origin: document.getElementById('productOrigin').value || window.producerData?.location,
        is_active: document.getElementById('productStatus').value === 'disponible' ? 1 : 0,
        image_url: imageUrl
    };
    
    try {
        const url = isEdit 
            ? `/api/producer/products/${productId}` 
            : '/api/producer/products';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar producto');
        }
        
        alert(isEdit ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente');
        document.getElementById('productModal').classList.remove('active');
        
        // Limpiar imagen después de guardar
        uploadedImageBase64 = null;
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('productImages').value = '';
        
        // Reload products
        if (currentSection === 'productos') {
            loadAllProducts();
        } else {
            loadDashboardData();
        }
    } catch (error) {
        console.error('Error saving product:', error);
        alert(error.message || 'Error al guardar producto');
    }
}

function editProduct(productId) {
    const product = products.find(p => p.product_id === productId);
    if (!product) return;
    
    // Fill form with product data
    document.getElementById('modalTitle').textContent = 'Editar Producto';
    document.getElementById('productName').value = product.product_name;
    document.getElementById('productCategory').value = product.category_id;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productUnit').value = product.unit || 'kg';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productQuantity').value = product.stock;
    document.getElementById('productOrigin').value = product.origin || '';
    document.getElementById('productStatus').value = product.is_active && product.stock > 0 ? 'disponible' : 'agotado';
    
    // Cargar imagen existente si la hay
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    
    if (product.image_url && product.image_url !== '/img/ConectAgro.png') {
        // Guardar la URL de la imagen existente
        uploadedImageBase64 = product.image_url;
        
        // Mostrar preview de la imagen existente
        preview.innerHTML = `
            <div class="preview-image">
                <img src="${product.image_url}" alt="Imagen actual">
                <button type="button" class="remove-image" onclick="removeImage()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    } else {
        uploadedImageBase64 = null;
    }
    
    // Store product ID for editing
    document.getElementById('productForm').dataset.productId = productId;
    
    // Open modal
    document.getElementById('productModal').classList.add('active');
}

async function deleteProduct(productId) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/producer/products/${productId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar producto');
        }
        
        alert('Producto eliminado exitosamente');
        loadAllProducts();
        
        // Reload dashboard if we're there
        if (currentSection === 'dashboard') {
            loadDashboardData();
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        alert(error.message || 'Error al eliminar producto');
    }
}
