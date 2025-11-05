let selectedPlan = null;
let selectedProducts = new Map();
let productSelectionModal;

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', () => {
    productSelectionModal = new bootstrap.Modal(document.getElementById('productSelectionModal'));
    loadActiveSubscription();
    initializeDeliveryDays();
});

// Inicializar select de días de entrega
function initializeDeliveryDays() {
    const select = document.getElementById('deliveryDaySelect');
    for(let i = 1; i <= 28; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Día ${i}`;
        select.appendChild(option);
    }
}

// Cargar suscripción activa
async function loadActiveSubscription() {
  try {
        const response = await fetch('/api/subscriptions/active');
        const subscription = await response.json();
        console.log('Datos completos de la suscripción:', subscription);

        if (subscription) {
            document.getElementById('activeSubscription').style.display = 'block';
            document.getElementById('subscriptionPlans').style.display = 'none';

            document.getElementById('subscriptionType').textContent = getSubscriptionTypeText(subscription.subscription_type);
            document.getElementById('startDate').textContent = new Date(subscription.start_date).toLocaleDateString();
            document.getElementById('endDate').textContent = new Date(subscription.end_date).toLocaleDateString();
            document.getElementById('deliveryDay').textContent = `Día ${subscription.delivery_day}`;

            const productsContainer = document.getElementById('subscribedProducts');
            const products = Array.isArray(subscription.products) ? subscription.products : [];

            if (products.length > 0) {
                productsContainer.innerHTML = products.map(product => {
                    const name = product.product_name || product.name || 'Producto sin nombre';
                    const image = product.image_url || product.imageUrl || null;
                    const price = parseFloat(product.price) || 0;
                    const quantity = product.quantity || 0;
                    const productId = product.product_id || product.productId;

                    return `
                        <div class="col-md-3 col-6" id="product-container-${productId}">
                            <div class="card product-card h-100 position-relative">
                                <button type="button" 
                                        class="btn-close position-absolute top-0 end-0 m-2 bg-white" 
                                        style="z-index: 1;" 
                                        onclick="removeProductFromSubscription(${productId})"
                                        aria-label="Eliminar producto">
                                </button>
                                ${image ? `<img src="${image}" class="card-img-top product-img" alt="${name}">` : ''}
                                <div class="card-body">
                                    <h5 class="card-title">${name}</h5>
                                    <p class="card-text text-success fw-bold">$${price.toFixed(2)}</p>
                                    <p class="card-text">
                                        <small class="text-muted">Cantidad: ${quantity}</small>
                                    </p>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                productsContainer.innerHTML = `<p>No hay productos asociados a esta suscripción.</p>`;
            }
        }
    } catch (error) {
        console.error('Error loading subscription:', error);
    }
}

// Reemplazar la función removeProductFromSubscription
async function removeProductFromSubscription(productId) {
    try {
        const response = await fetch(`/api/subscriptions/products/${productId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Error removing product');

        const productContainer = document.getElementById(`product-container-${productId}`);
        if (productContainer) {
            productContainer.remove();
        }

        const productsContainer = document.getElementById('subscribedProducts');
        if (!productsContainer.children.length) {
            productsContainer.innerHTML = `<p>No hay productos asociados a esta suscripción.</p>`;
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

// Seleccionar plan
async function selectPlan(plan) {
    selectedPlan = plan;
    try {
        await loadProducts();
        productSelectionModal.show();
    } catch (error) {
        console.error('Error al cargar el plan:', error);
        alert('Error al cargar los productos. Por favor, intenta nuevamente.');
    }
}

// Cargar productos disponibles en el modal
async function loadProducts() {
    const productGrid = document.getElementById('productGrid');
    productGrid.innerHTML = '<div class="text-center w-100"><div class="spinner-border text-success" role="status"></div></div>';

    try {
        // Cargar productos específicos del plan seleccionado
        const response = await fetch(`/api/products?plan=${selectedPlan}`);
        if (!response.ok) throw new Error('Error al cargar productos');
        const products = await response.json();
        
        if (products.length === 0) {
            productGrid.innerHTML = '<p class="text-center text-muted">No hay productos disponibles</p>';
            return;
        }

        productGrid.innerHTML = products.map(product => {
            // Asegurarnos de que el precio sea un número
            const price = parseFloat(product.price) || 0;
            
            return `
            <div class="col-md-3 col-6">
                <div class="card product-card h-100">
                    <img src="${product.image_url || '/img/placeholder.jpg'}" 
                         class="card-img-top product-img" 
                         alt="${product.product_name}">
                    <div class="card-body">
                        <h5 class="card-title">${product.product_name}</h5>
                        <p class="card-text text-success fw-bold">$${price.toFixed(2)}</p>
                        <div class="d-flex align-items-center justify-content-between">
                            <div class="input-group input-group-sm" style="max-width: 100px;">
                                <button class="btn btn-outline-secondary" type="button" 
                                        onclick="updateQuantity(${product.product_id}, -1)">-</button>
                                <input type="text" class="form-control text-center" 
                                       id="quantity-${product.product_id}" value="0" readonly>
                                <button class="btn btn-outline-secondary" type="button"
                                        onclick="updateQuantity(${product.product_id}, 1)">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error:', error);
        productGrid.innerHTML = '<div class="alert alert-danger">Error al cargar los productos</div>';
    }
}

// Actualizar cantidad de producto
function updateQuantity(productId, change) {
    const currentQuantity = selectedProducts.get(productId) || 0;
    const newQuantity = Math.max(0, currentQuantity + change);
    
    if (newQuantity === 0) {
        selectedProducts.delete(productId);
    } else {
        selectedProducts.set(productId, newQuantity);
    }
    
    document.getElementById(`quantity-${productId}`).value = newQuantity;
}

// Validar selección de productos antes de crear suscripción
async function createSubscription() {
    if (selectedProducts.size === 0 || !document.getElementById('deliveryDaySelect').value) return;

    const deliveryDay = document.getElementById('deliveryDaySelect').value;
    const products = Array.from(selectedProducts.entries()).map(([productId, quantity]) => ({
        productId,
        quantity
    }));
    
    try {
        const response = await fetch('/api/subscriptions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subscriptionType: selectedPlan,
                deliveryDay,
                products
            })
        });
        
        if (!response.ok) throw new Error('Error creating subscription');
        
        productSelectionModal.hide();
        loadActiveSubscription();
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Reemplazar la función updateSubscriptionProducts
async function updateSubscriptionProducts() {
    if (selectedProducts.size === 0) return;

    const products = Array.from(selectedProducts.entries()).map(([productId, quantity]) => ({
        productId,
        quantity
    }));
    
    try {
        const response = await fetch('/api/subscriptions/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ products })
        });
        
        if (!response.ok) {
            throw new Error('Error al actualizar productos');
        }
        
        productSelectionModal.hide();
        await loadActiveSubscription();
        selectedProducts.clear();
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Reemplazar la función cancelSubscription
async function cancelSubscription() {
    try {
        const response = await fetch('/api/subscriptions/cancel', {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Error canceling subscription');
        
        document.getElementById('activeSubscription').style.display = 'none';
        document.getElementById('subscriptionPlans').style.display = 'block';
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Funciones auxiliares
function getSubscriptionTypeText(type) {
    const types = {
        'monthly': 'Mensual',
        'biannual': 'Semestral',
        'annual': 'Anual'
    };
    return types[type] || type;
}

// Función para agregar más productos
async function addMoreProducts() {
    selectedProducts = new Map(); // Resetear productos seleccionados
    
    // Obtener el tipo de suscripción actual
    const subscriptionType = document.getElementById('subscriptionType').textContent;
    switch(subscriptionType) {
        case 'Mensual':
            selectedPlan = 'monthly';
            break;
        case 'Semestral':
            selectedPlan = 'biannual';
            break;
        case 'Anual':
            selectedPlan = 'annual';
            break;
        default:
            selectedPlan = 'monthly';
    }
    
    try {
        await loadProducts();
        
        // Ocultar el select de día de entrega ya que ya está establecido
        const deliveryDaySelect = document.getElementById('deliveryDaySelect');
        if (deliveryDaySelect) {
            deliveryDaySelect.closest('.mb-5').style.display = 'none';
        }
        
        // Cambiar el título y texto del botón del modal
        const modalTitle = document.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Agregar Productos a tu Suscripción';
        }
        
        const confirmButton = document.querySelector('.modal-footer .btn-success');
        if (confirmButton) {
            confirmButton.textContent = 'Agregar Productos';
            confirmButton.onclick = updateSubscriptionProducts;
        }
        
        productSelectionModal.show();
    } catch (error) {
        console.error('Error al preparar la adición de productos:', error);
        alert('Error al cargar los productos. Por favor, intenta nuevamente.');
    }
}

// Modificar la función createSubscription existente para restaurar el comportamiento original del modal
function createSubscription() {
    // ... código existente ...
    
    // Restaurar el texto del botón después de crear la suscripción
    const confirmButton = document.querySelector('.modal-footer .btn-success');
    if (confirmButton) {
        confirmButton.textContent = 'Confirmar Suscripción';
        confirmButton.onclick = createSubscription;
    }
}