const API = '/api';
let state = {
  products: [],
  categories: [],
  cart: JSON.parse(localStorage.getItem('cart') || '[]'),
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  authMode: 'login'
};

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function headers(json = true) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  if (state.token) h['Authorization'] = `Bearer ${state.token}`;
  return h;
}

async function loadProducts() {
  const search = document.getElementById('search-input').value;
  const category = document.getElementById('category-select').value;
  const sort = document.getElementById('sort-select').value;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  if (sort) params.set('sort', sort);

  const res = await fetch(`${API}/products?${params}`);
  const data = await res.json();
  state.products = data.products;
  state.categories = data.categories;
  renderCategories();
  renderProducts();
}

function renderCategories() {
  const sel = document.getElementById('category-select');
  const current = sel.value;
  sel.innerHTML = '<option value="">All Categories</option>' +
    state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  sel.value = current;
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (state.products.length === 0) {
    grid.innerHTML = `<div class="empty-state">No products found.</div>`;
    return;
  }
  grid.innerHTML = state.products.map(p => `
    <div class="card">
      <img src="${p.image}" alt="${p.name}">
      <div class="body">
        <h3>${p.name}</h3>
        <div class="desc">${p.description}</div>
        <div class="price">$${p.price.toFixed(2)}</div>
        <div class="stock">${p.stock > 0 ? p.stock + ' in stock' : 'Out of stock'}</div>
        <button class="btn" ${p.stock === 0 ? 'disabled' : ''} onclick="addToCart('${p.id}')">Add to Cart</button>
      </div>
    </div>
  `).join('');
}

function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  const existing = state.cart.find(i => i.productId === productId);
  if (existing) {
    if (existing.quantity < product.stock) existing.quantity++;
    else return toast('No more stock available');
  } else {
    state.cart.push({ productId, quantity: 1 });
  }
  saveCart();
  toast(`${product.name} added to cart`);
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(state.cart));
  document.getElementById('cart-count').textContent = state.cart.reduce((s, i) => s + i.quantity, 0);
}

function openCart() {
  renderCart();
  document.getElementById('cart-modal').classList.add('open');
}

function renderCart() {
  const container = document.getElementById('cart-items');
  if (state.cart.length === 0) {
    container.innerHTML = `<div class="empty-state">Your cart is empty.</div>`;
    document.getElementById('cart-total').textContent = '$0.00';
    return;
  }
  let total = 0;
  container.innerHTML = state.cart.map(item => {
    const product = state.products.find(p => p.id === item.productId) || { name: 'Unknown', price: 0 };
    total += product.price * item.quantity;
    return `
      <div class="cart-item">
        <span>${product.name}</span>
        <div class="qty-controls">
          <button onclick="changeQty('${item.productId}', -1)">-</button>
          <span style="margin:0 8px">${item.quantity}</span>
          <button onclick="changeQty('${item.productId}', 1)">+</button>
        </div>
        <span>$${(product.price * item.quantity).toFixed(2)}</span>
      </div>`;
  }).join('');
  document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;
}

function changeQty(productId, delta) {
  const item = state.cart.find(i => i.productId === productId);
  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter(i => i.productId !== productId);
  }
  saveCart();
  renderCart();
}

async function checkout() {
  if (!state.token) {
    closeModal('cart-modal');
    openAuth('login');
    return toast('Please login to checkout');
  }
  if (state.cart.length === 0) return toast('Cart is empty');

  const shippingAddress = document.getElementById('shipping-address').value;
  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ items: state.cart, shippingAddress })
  });
  const data = await res.json();
  if (!res.ok) return toast(data.error || 'Checkout failed');

  state.cart = [];
  saveCart();
  closeModal('cart-modal');
  toast('Order placed successfully!');
  loadProducts();
  showSection('orders');
}

async function loadOrders() {
  if (!state.token) {
    document.getElementById('orders-list').innerHTML = `<div class="empty-state">Login to view your orders.</div>`;
    return;
  }
  const res = await fetch(`${API}/orders`, { headers: headers() });
  const data = await res.json();
  const list = document.getElementById('orders-list');
  if (!data.orders || data.orders.length === 0) {
    list.innerHTML = `<div class="empty-state">You have no orders yet.</div>`;
    return;
  }
  list.innerHTML = data.orders.reverse().map(o => `
    <div class="card" style="margin-bottom:14px">
      <div class="body">
        <div style="display:flex;justify-content:space-between">
          <strong>Order #${o.id.slice(0, 8)}</strong>
          <span class="badge ${o.status}">${o.status}</span>
        </div>
        <div class="desc">${o.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</div>
        <div class="price">$${o.total.toFixed(2)}</div>
        <div class="stock">${new Date(o.createdAt).toLocaleString()}</div>
      </div>
    </div>
  `).join('');
}

function showSection(section) {
  document.getElementById('home-section').style.display = section === 'home' ? 'block' : 'none';
  document.getElementById('orders-section').style.display = section === 'orders' ? 'block' : 'none';
  document.getElementById('hero').style.display = section === 'home' ? 'block' : 'none';
  if (section === 'orders') loadOrders();
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function openAuth(mode) {
  state.authMode = mode;
  document.getElementById('auth-title').textContent = mode === 'login' ? 'Login' : 'Register';
  document.getElementById('register-fields').style.display = mode === 'login' ? 'none' : 'block';
  document.getElementById('auth-toggle-text').textContent =
    mode === 'login' ? 'Need an account? Register' : 'Already have an account? Login';
  document.getElementById('auth-modal').classList.add('open');
}

function toggleAuthMode() {
  openAuth(state.authMode === 'login' ? 'register' : 'login');
}

async function submitAuth() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('reg-name').value;
  const endpoint = state.authMode === 'login' ? 'login' : 'register';
  const body = state.authMode === 'login' ? { email, password } : { name, email, password };

  const res = await fetch(`${API}/auth/${endpoint}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) return toast(data.error || 'Authentication failed');

  state.token = data.token;
  state.user = data.user;
  localStorage.setItem('token', state.token);
  localStorage.setItem('user', JSON.stringify(state.user));
  closeModal('auth-modal');
  renderAuthArea();
  toast(`Welcome, ${data.user.name}!`);
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  renderAuthArea();
  toast('Logged out');
}

function renderAuthArea() {
  const el = document.getElementById('auth-area');
  if (state.user) {
    el.innerHTML = `
      <span style="margin-right:10px;font-size:14px">Hi, ${state.user.name}</span>
      ${state.user.role === 'admin' ? '<a href="/admin" class="btn small secondary" style="margin-right:8px">Admin Panel</a>' : ''}
      <button class="btn small" onclick="logout()">Logout</button>`;
  } else {
    el.innerHTML = `<button class="btn small" onclick="openAuth('login')">Login</button>`;
  }
}

document.getElementById('search-input').addEventListener('input', debounce(loadProducts, 300));
document.getElementById('category-select').addEventListener('change', loadProducts);
document.getElementById('sort-select').addEventListener('change', loadProducts);

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// init
renderAuthArea();
saveCart();
loadProducts();
