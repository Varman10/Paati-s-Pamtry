// API Base URL
const API_BASE = 'http://localhost:3000/api';

// Cart State (still using localStorage for cart, but orders go to database)
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let products = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    updateCartDisplay();
    loadSalesData();
});

// ========== PRODUCTS ==========

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        products = await response.json();
        displayProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products. Using default products.');
        // Fallback to default products
        products = [
            { id: 1, name: "Organic Health Mix", price: 299, image: "product.jpg", description: "Premium organic health mix" },
            { id: 2, name: "Organic Snacks Pack 1", price: 199, image: "product 1.jpg", description: "Delicious organic snacks" },
            { id: 3, name: "Organic Snacks Pack 2", price: 249, image: "product 2.jpg", description: "Premium organic snacks" }
        ];
        displayProducts();
    }
}

function displayProducts() {
    const productsGrid = document.getElementById('products-grid');
    productsGrid.innerHTML = '';

    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.onclick = () => addToCart(product.id);
        
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='logo.jpg'">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">₹${product.price}</p>
                <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart(${product.id})">
                    Add to Cart
                </button>
            </div>
        `;
        
        productsGrid.appendChild(productCard);
    });
}

// ========== CART FUNCTIONS ==========

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }
    
    saveCart();
    updateCartDisplay();
    showNotification(`${product.name} added to cart!`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartDisplay();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;

    item.quantity += change;
    
    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else {
        saveCart();
        updateCartDisplay();
    }
}

function clearCart() {
    if (cart.length === 0) {
        showNotification('Cart is already empty!');
        return;
    }
    
    if (confirm('Are you sure you want to clear the cart?')) {
        cart = [];
        saveCart();
        updateCartDisplay();
        showNotification('Cart cleared!');
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function getCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function updateCartDisplay() {
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartTotal.textContent = getCartTotal();
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image" onerror="this.src='logo.jpg'">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">₹${item.price} × ${item.quantity} = ₹${item.price * item.quantity}</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                        <button class="remove-item-btn" onclick="removeFromCart(${item.id})">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function toggleCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    cartSidebar.classList.toggle('open');
}

// ========== CHECKOUT FUNCTIONS ==========

async function openCheckout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty!');
        return;
    }
    
    const checkoutModal = document.getElementById('checkout-modal');
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total');
    
    checkoutItems.innerHTML = cart.map(item => `
        <div class="checkout-item">
            <span>${item.name} (${item.quantity})</span>
            <span>₹${item.price * item.quantity}</span>
        </div>
    `).join('');
    
    checkoutTotal.textContent = getCartTotal();
    checkoutModal.classList.add('open');
    
    // Set up payment change listeners
    setTimeout(() => {
        const paymentRadios = document.querySelectorAll('input[name="payment"]');
        paymentRadios.forEach(radio => {
            radio.removeEventListener('change', handlePaymentChange);
            radio.addEventListener('change', handlePaymentChange);
        });
    }, 100);
}

function closeCheckout() {
    const checkoutModal = document.getElementById('checkout-modal');
    checkoutModal.classList.remove('open');
    const upiQrContainer = document.getElementById('upi-qr-container');
    if (upiQrContainer) {
        upiQrContainer.style.display = 'none';
    }
}

async function handlePaymentChange(event) {
    if (event.target.value === 'upi') {
        await showUPIQRCode();
    } else {
        const upiQrContainer = document.getElementById('upi-qr-container');
        if (upiQrContainer) {
            upiQrContainer.style.display = 'none';
        }
    }
}

async function showUPIQRCode() {
    const total = getCartTotal();
    const upiQrContainer = document.getElementById('upi-qr-container');
    
    if (!upiQrContainer) {
        // Create UPI QR container if it doesn't exist
        const paymentSection = document.querySelector('.form-section:has(.payment-options)');
        const container = document.createElement('div');
        container.id = 'upi-qr-container';
        container.className = 'upi-qr-container';
        container.innerHTML = `
            <h4>Scan to Pay via UPI</h4>
            <div id="upi-qr-code" class="upi-qr-code"></div>
            <p class="upi-instruction">Scan this QR code with any UPI app to complete payment</p>
        `;
        paymentSection.appendChild(container);
    }
    
    upiQrContainer.style.display = 'block';
    const qrCodeDiv = document.getElementById('upi-qr-code');
    qrCodeDiv.innerHTML = '<p>Loading QR code...</p>';
    
    try {
        const response = await fetch(`${API_BASE}/upi/qrcode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: total,
                name: 'Paati\'s Pantry',
                transactionNote: 'Order Payment'
            })
        });
        
        const data = await response.json();
        if (data.qrCode) {
            qrCodeDiv.innerHTML = `<img src="${data.qrCode}" alt="UPI QR Code" style="max-width: 100%; height: auto;">`;
        } else {
            qrCodeDiv.innerHTML = '<p>Error generating QR code</p>';
        }
    } catch (error) {
        console.error('Error generating UPI QR code:', error);
        qrCodeDiv.innerHTML = '<p>Error loading QR code. Please try again.</p>';
    }
}

async function processOrder(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const customerData = {
        name: formData.get('name'),
        mobile: formData.get('mobile'),
        email: formData.get('email'),
        address: formData.get('address')
    };
    
    const paymentMethod = formData.get('payment');
    const total = getCartTotal();
    
    try {
        // Save/Update customer
        const customerResponse = await fetch(`${API_BASE}/customers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(customerData)
        });
        
        const customerResult = await customerResponse.json();
        const customerId = customerResult.id;
        
        // Create order
        const now = new Date();
        const orderData = {
            customer_id: customerId,
            order_date: now.toISOString().split('T')[0],
            order_time: now.toTimeString().split(' ')[0],
            payment_method: paymentMethod,
            total_amount: total,
            items: cart,
            status: 'pending'
        };
        
        const orderResponse = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const orderResult = await orderResponse.json();
        
        if (orderResult.id) {
            // Clear cart
            cart = [];
            saveCart();
            updateCartDisplay();
            
            // Close checkout
            closeCheckout();
            
            // Show success message
            alert(`Order placed successfully!\nOrder ID: ${orderResult.id}\nTotal: ₹${total}\nPayment: ${paymentMethod}\n\nThank you for your order!`);
            
            // Update sales display
            loadSalesData();
        } else {
            throw new Error('Failed to create order');
        }
    } catch (error) {
        console.error('Error processing order:', error);
        alert('Error placing order. Please try again.');
    }
}

// ========== SALES DASHBOARD ==========

async function openSalesDashboard() {
    const salesModal = document.getElementById('sales-modal');
    await loadSalesData();
    await loadOrdersList();
    await loadCustomersList();
    salesModal.classList.add('open');
}

function closeSalesDashboard() {
    const salesModal = document.getElementById('sales-modal');
    salesModal.classList.remove('open');
}

async function loadSalesData() {
    try {
        const response = await fetch(`${API_BASE}/sales/stats`);
        const stats = await response.json();
        
        document.getElementById('today-sales').textContent = stats.today.total;
        document.getElementById('monthly-sales').textContent = stats.monthly.total;
        document.getElementById('total-orders').textContent = stats.totalOrders;
        
        // Load daily breakdown
        const dailyResponse = await fetch(`${API_BASE}/sales/daily`);
        const dailyData = await dailyResponse.json();
        updateSalesTable(dailyData);
    } catch (error) {
        console.error('Error loading sales data:', error);
        // Fallback to showing zeros
        document.getElementById('today-sales').textContent = '0';
        document.getElementById('monthly-sales').textContent = '0';
        document.getElementById('total-orders').textContent = '0';
    }
}

function updateSalesTable(salesData) {
    const tableBody = document.getElementById('sales-table-body');
    
    if (salesData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem;">No sales data available</td></tr>';
    } else {
        tableBody.innerHTML = salesData.map(sale => `
            <tr>
                <td>${formatDate(sale.date)}</td>
                <td>${sale.orders}</td>
                <td>₹${sale.total}</td>
            </tr>
        `).join('');
    }
}

async function loadOrdersList() {
    try {
        const response = await fetch(`${API_BASE}/orders`);
        const orders = await response.json();
        displayOrdersList(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function displayOrdersList(orders) {
    const ordersContainer = document.getElementById('orders-list-container');
    if (!ordersContainer) return;
    
    if (orders.length === 0) {
        ordersContainer.innerHTML = '<p>No orders found</p>';
        return;
    }
    
    ordersContainer.innerHTML = `
        <h3>All Orders</h3>
        <div class="orders-list">
            ${orders.map(order => `
                <div class="order-card">
                    <div class="order-header">
                        <span><strong>Order #${order.id}</strong></span>
                        <span>${formatDate(order.order_date)} ${order.order_time}</span>
                    </div>
                    <div class="order-details">
                        <p><strong>Customer:</strong> ${order.customer_name || 'N/A'}</p>
                        <p><strong>Mobile:</strong> ${order.mobile || 'N/A'}</p>
                        <p><strong>Address:</strong> ${order.address || 'N/A'}</p>
                        <p><strong>Payment:</strong> ${order.payment_method}</p>
                        <p><strong>Total:</strong> ₹${order.total_amount}</p>
                        <p><strong>Status:</strong> <span class="order-status">${order.status}</span></p>
                    </div>
                    <div class="order-items">
                        <strong>Items:</strong>
                        ${JSON.parse(order.items).map(item => 
                            `<span>${item.name} (${item.quantity})</span>`
                        ).join(', ')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function loadCustomersList() {
    try {
        const response = await fetch(`${API_BASE}/customers`);
        const customers = await response.json();
        displayCustomersList(customers);
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

function displayCustomersList(customers) {
    const customersContainer = document.getElementById('customers-list-container');
    if (!customersContainer) return;
    
    if (customers.length === 0) {
        customersContainer.innerHTML = '<p>No customers found</p>';
        return;
    }
    
    customersContainer.innerHTML = `
        <h3>Customer Addresses</h3>
        <div class="customers-list">
            ${customers.map(customer => `
                <div class="customer-card">
                    <div class="customer-header">
                        <span><strong>${customer.name}</strong></span>
                        <span>ID: ${customer.id}</span>
                    </div>
                    <div class="customer-details">
                        <p><strong>Mobile:</strong> ${customer.mobile}</p>
                        <p><strong>Email:</strong> ${customer.email}</p>
                        <p><strong>Address:</strong> ${customer.address}</p>
                        <p><strong>Added:</strong> ${formatDate(customer.created_at)}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ========== UTILITY FUNCTIONS ==========

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 4000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Add CSS animations for notification
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Close modals when clicking outside
window.onclick = function(event) {
    const checkoutModal = document.getElementById('checkout-modal');
    const salesModal = document.getElementById('sales-modal');
    
    if (event.target === checkoutModal) {
        closeCheckout();
    }
    if (event.target === salesModal) {
        closeSalesDashboard();
    }
}

