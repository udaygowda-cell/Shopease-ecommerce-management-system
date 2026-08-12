const API = '/api';
let adminState = {
  token: localStorage.getItem('adminToken') || null,
  user: JSON.parse(localStorage.getItem('adminUser') || 'null'),
  products: [],
  categories: [],
  orders: []
};

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminState.token}`
  };
}

async function adminLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) return toast(data.error || 'Login failed');
  if (data.user.role !== 'admin') return toast('This account is not an admin');

  adminState.token = data.token;
  adminState.user = data.user;
  localStorage.setItem('adminToken', data.token);
  localStorage.setItem('adminUser', JSON.stringify(data.user));
  showAdminScreen();
}

function adminLogout() {
  adminState.token = null;
  adminState.user = null;
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  document.getElementById('admin-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

function showAdminScreen() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-screen').style.display = 'block';
  switchTab('dashboard');
}

function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.getElementById(`tab-${tab}`).style.display = 'block';
  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
  document.querySelector(`.nav-link[data-tab="${tab}"]`).classList.add('active');

  if (tab === 'dashboard') loadDashboard();
  if (tab === 'products') loadProducts();
  if (tab === 'orders') loadOrders();
  if (tab === 'categories') loadCategories();
}

async function loadDashboard() {
  const res = await fetch(`${API}/dashboard/stats`, { headers: headers() });
  if (res.status === 401 || res.status === 403) return adminLogout();
  const s = await res.json();

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><div class="label">Total Revenue</div><div class="value">$${s.totalRevenue.toFixed(2)}</div></div>
    <div class="stat-card"><div class="label">Total Orders</div><div class="value">${s.totalOrders}</div></div>
    <div class="stat-card"><div class="label">Total Products</div><div class="value">${s.totalProducts}</div></div>
    <div class="stat-card"><div class="label">Customers</div><div class="value">${s.totalCustomers}</div></div>
    <div class="stat-card"><div class="label">Low Stock Items</div><div class="value">${s.lowStock.length}</div></div>
  `;

  document.getElementById('recent-orders-body').innerHTML = s.recentOrders.map(o => `
    <tr>
      <td>#${o.id.slice(0, 8)}</td>
      <td>${o.customerName}</td>
      <td>$${o.total.toFixed(2)}</td>
      <td><span class="badge ${o.status}">${o.status}</span></td>
      <td>${new Date(o.createdAt).toLocaleDateString()}</td>
    </tr>
  `).join('') || `<tr><td colspan="5">No orders yet</td></tr>`;
}

async function loadProducts() {
  const res = await fetch(`${API}/products`);
  const data = await res.json();
  adminState.products = data.products;
  adminState.categories = data.categories;

  document.getElementById('products-body').innerHTML = adminState.products.map(p => `
    <tr>
      <td><img src="${p.image}" style="width:50px;height:40px;object-fit:cover;border-radius:6px"></td>
      <td>${p.name}</td>
      <td>${p.sku}</td>
      <td>$${p.price.toFixed(2)}</td>
      <td>${p.stock}</td>
      <td>${categoryName(p.categoryId)}</td>
      <td>
        <button class="btn small secondary" onclick="editProduct('${p.id}')">Edit</button>
        <button class="btn small danger" onclick="deleteProduct('${p.id}')">Delete</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7">No products yet</td></tr>`;
}

function categoryName(id) {
  const c = adminState.categories.find(c => c.id === id);
  return c ? c.name : '—';
}

function openProductModal(product = null) {
  document.getElementById('product-modal-title').textContent = product ? 'Edit Product' : 'Add Product';
  document.getElementById('product-id').value = product ? product.id : '';
  document.getElementById('product-name').value = product ? product.name : '';
  document.getElementById('product-description').value = product ? product.description : '';
  document.getElementById('product-price').value = product ? product.price : '';
  document.getElementById('product-stock').value = product ? product.stock : '';
  document.getElementById('product-sku').value = product ? product.sku : '';
  document.getElementById('product-image').value = product ? product.image : '';

  const catSelect = document.getElementById('product-category');
  catSelect.innerHTML = adminState.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  if (product) catSelect.value = product.categoryId;

  document.getElementById('product-modal').classList.add('open');
}

function editProduct(id) {
  const product = adminState.products.find(p => p.id === id);
  openProductModal(product);
}

async function saveProduct() {
  const id = document.getElementById('product-id').value;
  const body = {
    name: document.getElementById('product-name').value,
    description: document.getElementById('product-description').value,
    price: parseFloat(document.getElementById('product-price').value),
    stock: parseInt(document.getElementById('product-stock').value || '0'),
    sku: document.getElementById('product-sku').value,
    categoryId: document.getElementById('product-category').value,
    image: document.getElementById('product-image').value || 'https://picsum.photos/400/300'
  };
  if (!body.name || isNaN(body.price)) return toast('Name and price are required');

  const url = id ? `${API}/products/${id}` : `${API}/products`;
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) return toast(data.error || 'Failed to save product');

  closeModal('product-modal');
  toast('Product saved');
  loadProducts();
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  const res = await fetch(`${API}/products/${id}`, { method: 'DELETE', headers: headers() });
  if (!res.ok) return toast('Failed to delete');
  toast('Product deleted');
  loadProducts();
}

async function loadOrders() {
  const res = await fetch(`${API}/orders`, { headers: headers() });
  const data = await res.json();
  adminState.orders = data.orders || [];

  const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  document.getElementById('orders-body').innerHTML = adminState.orders.slice().reverse().map(o => `
    <tr>
      <td>#${o.id.slice(0, 8)}</td>
      <td>${o.customerName}</td>
      <td>${o.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</td>
      <td>$${o.total.toFixed(2)}</td>
      <td><span class="badge ${o.status}">${o.status}</span></td>
      <td>${new Date(o.createdAt).toLocaleDateString()}</td>
      <td>
        <select onchange="updateOrderStatus('${o.id}', this.value)">
          ${statuses.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7">No orders yet</td></tr>`;
}

async function updateOrderStatus(id, status) {
  const res = await fetch(`${API}/orders/${id}/status`, {
    method: 'PUT', headers: headers(), body: JSON.stringify({ status })
  });
  if (!res.ok) return toast('Failed to update status');
  toast('Order status updated');
  loadOrders();
}

async function loadCategories() {
  const res = await fetch(`${API}/categories`);
  const data = await res.json();
  adminState.categories = data.categories;

  document.getElementById('categories-body').innerHTML = adminState.categories.map(c => `
    <tr>
      <td>${c.name}</td>
      <td><button class="btn small danger" onclick="deleteCategory('${c.id}')">Delete</button></td>
    </tr>
  `).join('') || `<tr><td colspan="2">No categories yet</td></tr>`;
}

function openCategoryModal() {
  document.getElementById('category-name').value = '';
  document.getElementById('category-modal').classList.add('open');
}

async function saveCategory() {
  const name = document.getElementById('category-name').value;
  if (!name) return toast('Name is required');
  const res = await fetch(`${API}/categories`, { method: 'POST', headers: headers(), body: JSON.stringify({ name }) });
  if (!res.ok) return toast('Failed to save category');
  closeModal('category-modal');
  toast('Category added');
  loadCategories();
}

async function deleteCategory(id) {
  if (!confirm('Delete this category?')) return;
  const res = await fetch(`${API}/categories/${id}`, { method: 'DELETE', headers: headers() });
  if (!res.ok) return toast('Failed to delete');
  toast('Category deleted');
  loadCategories();
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// init
if (adminState.token && adminState.user && adminState.user.role === 'admin') {
  showAdminScreen();
}
