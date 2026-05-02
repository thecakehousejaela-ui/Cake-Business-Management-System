/**
 * The Cake House Jaela - Business Management System
 * Modular JavaScript Application
 */

// ========================================
// DATA STORE (localStorage)
// ========================================
const Store = {
    get(key) {
        const data = localStorage.getItem(`cakehouse_${key}`);
        return data ? JSON.parse(data) : null;
    },
    set(key, value) {
        localStorage.setItem(`cakehouse_${key}`, JSON.stringify(value));
    },
    init() {
        if (!this.get('orders')) this.set('orders', []);
        if (!this.get('expenses')) this.set('expenses', []);
        if (!this.get('customers')) this.set('customers', []);
        if (!this.get('users')) this.set('users', [{ email: 'admin@cakehouse.lk', password: 'admin123', name: 'Admin' }]);
        if (!this.get('session')) this.set('session', null);
    }
};

// ========================================
// AUTH MODULE
// ========================================
const Auth = {
    login(email, password) {
        const users = Store.get('users');
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            Store.set('session', { email: user.email, name: user.name });
            return { success: true, user };
        }
        return { success: false, message: 'Invalid email or password' };
    },
    logout() {
        Store.set('session', null);
    },
    isLoggedIn() {
        return Store.get('session') !== null;
    },
    getUser() {
        return Store.get('session');
    }
};

// ========================================
// ORDERS MODULE
// ========================================
const Orders = {
    getAll() {
        return Store.get('orders') || [];
    },
    getById(id) {
        return this.getAll().find(o => o.id === id);
    },
    add(order) {
        const orders = this.getAll();
        order.id = Date.now().toString();
        order.createdAt = new Date().toISOString();
        orders.push(order);
        Store.set('orders', orders);
        // Auto-add/update customer
        Customers.upsertFromOrder(order);
        return order;
    },
    update(id, updates) {
        const orders = this.getAll();
        const idx = orders.findIndex(o => o.id === id);
        if (idx !== -1) {
            orders[idx] = { ...orders[idx], ...updates };
            Store.set('orders', orders);
            Customers.upsertFromOrder(orders[idx]);
            return orders[idx];
        }
        return null;
    },
    delete(id) {
        const orders = this.getAll().filter(o => o.id !== id);
        Store.set('orders', orders);
    },
    getByCustomer(phone) {
        return this.getAll().filter(o => o.phone === phone);
    },
    getStats() {
        const orders = this.getAll();
        const totalSales = orders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);
        const totalAdvance = orders.reduce((sum, o) => sum + (parseFloat(o.advance) || 0), 0);
        const completed = orders.filter(o => o.status === 'Completed').length;
        const pending = orders.filter(o => o.status === 'Pending').length;
        return { totalSales, totalAdvance, count: orders.length, completed, pending };
    }
};

// ========================================
// EXPENSES MODULE
// ========================================
const Expenses = {
    getAll() {
        return Store.get('expenses') || [];
    },
    add(expense) {
        const expenses = this.getAll();
        expense.id = Date.now().toString();
        expense.createdAt = new Date().toISOString();
        expenses.push(expense);
        Store.set('expenses', expenses);
        return expense;
    },
    update(id, updates) {
        const expenses = this.getAll();
        const idx = expenses.findIndex(e => e.id === id);
        if (idx !== -1) {
            expenses[idx] = { ...expenses[idx], ...updates };
            Store.set('expenses', expenses);
            return expenses[idx];
        }
        return null;
    },
    delete(id) {
        const expenses = this.getAll().filter(e => e.id !== id);
        Store.set('expenses', expenses);
    },
    getStats() {
        const expenses = this.getAll();
        const total = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        return { total, count: expenses.length };
    },
    getByDateRange(start, end) {
        return this.getAll().filter(e => {
            const d = new Date(e.date);
            return d >= new Date(start) && d <= new Date(end);
        });
    }
};

// ========================================
// CUSTOMERS MODULE
// ========================================
const Customers = {
    getAll() {
        return Store.get('customers') || [];
    },
    add(customer) {
        const customers = this.getAll();
        customer.id = Date.now().toString();
        customer.createdAt = new Date().toISOString();
        customers.push(customer);
        Store.set('customers', customers);
        return customer;
    },
    update(id, updates) {
        const customers = this.getAll();
        const idx = customers.findIndex(c => c.id === id);
        if (idx !== -1) {
            customers[idx] = { ...customers[idx], ...updates };
            Store.set('customers', customers);
            return customers[idx];
        }
        return null;
    },
    delete(id) {
        const customers = this.getAll().filter(c => c.id !== id);
        Store.set('customers', customers);
    },
    upsertFromOrder(order) {
        const customers = this.getAll();
        const existing = customers.find(c => c.phone === order.phone);
        if (existing) {
            existing.name = order.customer;
            existing.lastOrder = order.createdAt;
            Store.set('customers', customers);
        } else {
            this.add({
                name: order.customer,
                phone: order.phone,
                email: '',
                address: '',
                lastOrder: order.createdAt
            });
        }
    },
    getOrderHistory(phone) {
        return Orders.getByCustomer(phone);
    }
};

// ========================================
// UI HELPERS
// ========================================
const UI = {
    toast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const msg = document.getElementById('toast-message');
        const icon = toast.querySelector('i');
        msg.textContent = message;
        icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
        icon.style.color = type === 'success' ? '#4caf50' : '#f44336';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    },
    formatCurrency(amount) {
        return 'LKR ' + parseFloat(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    formatDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' });
    },
    getStatusBadge(status) {
        const map = {
            'Pending': 'badge-pending',
            'In Progress': 'badge-progress',
            'Completed': 'badge-completed',
            'Cancelled': 'badge-cancelled'
        };
        const cls = map[status] || 'badge-pending';
        return `<span class="badge ${cls}"><i class="fas fa-circle" style="font-size:6px;"></i> ${status}</span>`;
    }
};

// ========================================
// CHARTS MODULE
// ========================================
const Charts = {
    mainChart: null,
    statusChart: null,
    salesChart: null,
    expenseChart: null,

    initDashboard() {
        this.renderMainChart();
        this.renderStatusChart();
    },

    renderMainChart() {
        const ctx = document.getElementById('main-chart');
        if (!ctx) return;

        const orders = Orders.getAll();
        const expenses = Expenses.getAll();

        // Group by month
        const months = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        orders.forEach(o => {
            const d = new Date(o.createdAt);
            const key = monthNames[d.getMonth()];
            if (!months[key]) months[key] = { sales: 0, expenses: 0 };
            months[key].sales += parseFloat(o.price) || 0;
        });

        expenses.forEach(e => {
            const d = new Date(e.date);
            const key = monthNames[d.getMonth()];
            if (!months[key]) months[key] = { sales: 0, expenses: 0 };
            months[key].expenses += parseFloat(e.amount) || 0;
        });

        const labels = Object.keys(months);
        const salesData = labels.map(k => months[k].sales);
        const expenseData = labels.map(k => months[k].expenses);

        if (this.mainChart) this.mainChart.destroy();

        this.mainChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Sales',
                        data: salesData,
                        backgroundColor: 'rgba(233, 30, 99, 0.7)',
                        borderColor: '#e91e63',
                        borderWidth: 1,
                        borderRadius: 6
                    },
                    {
                        label: 'Expenses',
                        data: expenseData,
                        backgroundColor: 'rgba(244, 67, 54, 0.7)',
                        borderColor: '#f44336',
                        borderWidth: 1,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    },

    renderStatusChart() {
        const ctx = document.getElementById('status-chart');
        if (!ctx) return;

        const orders = Orders.getAll();
        const counts = { Pending: 0, 'In Progress': 0, Completed: 0, Cancelled: 0 };
        orders.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });

        if (this.statusChart) this.statusChart.destroy();

        this.statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    data: Object.values(counts),
                    backgroundColor: ['#ff9800', '#2196f3', '#4caf50', '#f44336'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                },
                cutout: '65%'
            }
        });
    },

    renderReportCharts(orders, expenses) {
        // Sales trend
        const salesCtx = document.getElementById('report-sales-chart');
        if (salesCtx) {
            const daily = {};
            orders.forEach(o => {
                const d = o.createdAt.split('T')[0];
                daily[d] = (daily[d] || 0) + parseFloat(o.price);
            });
            const labels = Object.keys(daily).sort();
            if (this.salesChart) this.salesChart.destroy();
            this.salesChart = new Chart(salesCtx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Sales',
                        data: labels.map(l => daily[l]),
                        borderColor: '#e91e63',
                        backgroundColor: 'rgba(233, 30, 99, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // Expense breakdown
        const expCtx = document.getElementById('report-expense-chart');
        if (expCtx) {
            const items = {};
            expenses.forEach(e => {
                items[e.item] = (items[e.item] || 0) + parseFloat(e.amount);
            });
            if (this.expenseChart) this.expenseChart.destroy();
            this.expenseChart = new Chart(expCtx, {
                type: 'pie',
                data: {
                    labels: Object.keys(items),
                    datasets: [{
                        data: Object.values(items),
                        backgroundColor: ['#e91e63', '#f48fb1', '#f8bbd9', '#fce4ec', '#c2185b', '#880e4f']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }
    }
};

// ========================================
// PAGE RENDERERS
// ========================================
const Pages = {
    dashboard() {
        const orderStats = Orders.getStats();
        const expenseStats = Expenses.getStats();
        const profit = orderStats.totalSales - expenseStats.total;

        document.getElementById('dash-sales').textContent = UI.formatCurrency(orderStats.totalSales);
        document.getElementById('dash-expenses').textContent = UI.formatCurrency(expenseStats.total);
        document.getElementById('dash-profit').textContent = UI.formatCurrency(profit);
        document.getElementById('dash-orders').textContent = orderStats.count;

        // Recent orders
        const recent = Orders.getAll().slice(-5).reverse();
        const tbody = document.querySelector('#recent-orders-table tbody');
        tbody.innerHTML = recent.length ? recent.map(o => `
            <tr>
                <td><strong>${o.customer}</strong></td>
                <td>${o.cakeType}</td>
                <td>${UI.formatCurrency(o.price)}</td>
                <td>${UI.getStatusBadge(o.status)}</td>
                <td>${UI.formatDate(o.deliveryDate)}</td>
            </tr>
        `).join('') : '<tr><td colspan="5" class="empty-state"><i class="fas fa-inbox"></i><p>No orders yet</p></td></tr>';

        Charts.initDashboard();
    },

    orders() {
        const orders = Orders.getAll().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const tbody = document.querySelector('#orders-table tbody');
        tbody.innerHTML = orders.length ? orders.map(o => `
            <tr>
                <td>#${o.id.slice(-4)}</td>
                <td><strong>${o.customer}</strong></td>
                <td>${o.phone}</td>
                <td>${o.cakeType}</td>
                <td>${o.size}</td>
                <td>${UI.formatCurrency(o.price)}</td>
                <td>${UI.formatCurrency(o.advance)}</td>
                <td>${UI.formatCurrency(o.balance)}</td>
                <td>${UI.formatDate(o.deliveryDate)}</td>
                <td>${UI.getStatusBadge(o.status)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-action btn-whatsapp" onclick="App.sendWhatsApp('${o.phone}', '${o.customer}')" title="Send WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="btn-action btn-edit" onclick="App.editOrder('${o.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="App.deleteOrder('${o.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="11" class="empty-state"><i class="fas fa-inbox"></i><p>No orders yet. Click "New Order" to add one.</p></td></tr>';
    },

    expenses() {
        const expenses = Expenses.getAll().sort((a, b) => new Date(b.date) - new Date(a.date));
        const tbody = document.querySelector('#expenses-table tbody');
        tbody.innerHTML = expenses.length ? expenses.map(e => `
            <tr>
                <td>${UI.formatDate(e.date)}</td>
                <td><strong>${e.item}</strong></td>
                <td>${UI.formatCurrency(e.amount)}</td>
                <td>${e.note || '-'}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-action btn-edit" onclick="App.editExpense('${e.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="App.deleteExpense('${e.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="5" class="empty-state"><i class="fas fa-inbox"></i><p>No expenses yet. Click "Add Expense" to add one.</p></td></tr>';
    },

    customers() {
        const customers = Customers.getAll();
        const tbody = document.querySelector('#customers-table tbody');
        tbody.innerHTML = customers.length ? customers.map(c => {
            const history = Customers.getOrderHistory(c.phone);
            const totalSpent = history.reduce((s, o) => s + parseFloat(o.price), 0);
            return `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.phone}</td>
                <td>${c.email || '-'}</td>
                <td><span class="badge badge-completed">${history.length}</span></td>
                <td>${UI.formatCurrency(totalSpent)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-action btn-edit" onclick="App.viewHistory('${c.phone}', '${c.name}')" title="View History">
                            <i class="fas fa-history"></i>
                        </button>
                        <button class="btn-action btn-edit" onclick="App.editCustomer('${c.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="App.deleteCustomer('${c.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;}).join('') : '<tr><td colspan="6" class="empty-state"><i class="fas fa-inbox"></i><p>No customers yet. Add orders to auto-create customers.</p></td></tr>';
    },

    invoices() {
        const orders = Orders.getAll().filter(o => o.status !== 'Cancelled');
        const select = document.getElementById('invoice-order-select');
        select.innerHTML = '<option value="">-- Select an Order --</option>' + 
            orders.map(o => `<option value="${o.id}">${o.customer} - ${o.cakeType} (${UI.formatCurrency(o.price)})</option>`).join('');
        document.getElementById('invoice-date').valueAsDate = new Date();
    },

    reports() {
        // Set default dates
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        document.getElementById('report-start').valueAsDate = firstDay;
        document.getElementById('report-end').valueAsDate = today;
        this.generateReport();
    },

    generateReport() {
        const start = document.getElementById('report-start').value;
        const end = document.getElementById('report-end').value;
        if (!start || !end) return;

        const orders = Orders.getAll().filter(o => {
            const d = new Date(o.createdAt);
            return d >= new Date(start) && d <= new Date(end + 'T23:59:59');
        });
        const expenses = Expenses.getByDateRange(start, end);

        const sales = orders.reduce((s, o) => s + parseFloat(o.price), 0);
        const expTotal = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
        const profit = sales - expTotal;

        document.getElementById('report-sales').textContent = UI.formatCurrency(sales);
        document.getElementById('report-expenses').textContent = UI.formatCurrency(expTotal);
        document.getElementById('report-profit').textContent = UI.formatCurrency(profit);
        document.getElementById('report-orders').textContent = orders.length;

        Charts.renderReportCharts(orders, expenses);
    }
};

// ========================================
// MODAL HANDLERS
// ========================================
const Modals = {
    open(id) {
        document.getElementById(id).classList.add('active');
    },
    close(id) {
        document.getElementById(id).classList.remove('active');
    },
    closeAll() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    }
};

// ========================================
// MAIN APP
// ========================================
const App = {
    currentPage: 'dashboard',
    editingOrderId: null,
    editingExpenseId: null,
    editingCustomerId: null,

    init() {
        Store.init();
        this.bindEvents();

        if (Auth.isLoggedIn()) {
            this.showApp();
        } else {
            document.getElementById('login-screen').classList.remove('hidden');
            document.getElementById('app').classList.add('hidden');
        }
    },

    showApp() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        const user = Auth.getUser();
        if (user) document.getElementById('user-name').textContent = user.name;
        this.navigate('dashboard');
    },

    bindEvents() {
        // Login
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const result = Auth.login(email, password);
            if (result.success) {
                this.showApp();
                UI.toast('Welcome back!');
            } else {
                UI.toast(result.message, 'error');
            }
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            Auth.logout();
            location.reload();
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigate(page);
                // Close mobile sidebar
                document.getElementById('sidebar').classList.remove('active');
                document.getElementById('mobile-overlay').classList.remove('active');
            });
        });

        // Mobile menu
        document.getElementById('menu-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
            document.getElementById('mobile-overlay').classList.toggle('active');
        });
        document.getElementById('mobile-overlay').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('active');
            document.getElementById('mobile-overlay').classList.remove('active');
        });

        // Modal closes
        document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => Modals.closeAll());
        });
        document.querySelectorAll('.modal').forEach(m => {
            m.addEventListener('click', (e) => { if (e.target === m) Modals.closeAll(); });
        });

        // Order modal
        document.getElementById('btn-add-order').addEventListener('click', () => {
            this.editingOrderId = null;
            document.getElementById('order-modal-title').innerHTML = '<i class="fas fa-shopping-bag"></i> New Order';
            document.getElementById('order-form').reset();
            document.getElementById('order-date').valueAsDate = new Date();
            document.getElementById('order-balance').value = '';
            Modals.open('order-modal');
        });

        document.getElementById('btn-save-order').addEventListener('click', () => this.saveOrder());

        // Auto-calculate balance
        ['order-price', 'order-advance'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                const price = parseFloat(document.getElementById('order-price').value) || 0;
                const advance = parseFloat(document.getElementById('order-advance').value) || 0;
                document.getElementById('order-balance').value = (price - advance).toFixed(2);
            });
        });

        // Expense modal
        document.getElementById('btn-add-expense').addEventListener('click', () => {
            this.editingExpenseId = null;
            document.getElementById('expense-modal-title').innerHTML = '<i class="fas fa-wallet"></i> Add Expense';
            document.getElementById('expense-form').reset();
            document.getElementById('expense-date').valueAsDate = new Date();
            Modals.open('expense-modal');
        });

        document.getElementById('btn-save-expense').addEventListener('click', () => this.saveExpense());

        // Customer modal
        document.getElementById('btn-add-customer').addEventListener('click', () => {
            this.editingCustomerId = null;
            document.getElementById('customer-modal-title').innerHTML = '<i class="fas fa-user"></i> Add Customer';
            document.getElementById('customer-form').reset();
            Modals.open('customer-modal');
        });

        document.getElementById('btn-save-customer').addEventListener('click', () => this.saveCustomer());

        // Invoice
        document.getElementById('btn-generate-invoice').addEventListener('click', () => this.generateInvoice());
        document.getElementById('btn-download-pdf').addEventListener('click', () => this.downloadInvoicePDF());
        document.getElementById('btn-send-whatsapp').addEventListener('click', () => this.sendInvoiceWhatsApp());

        // Report
        document.getElementById('btn-generate-report').addEventListener('click', () => Pages.generateReport());

        // Search
        document.getElementById('order-search').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#orders-table tbody tr').forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });

        document.getElementById('customer-search').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#customers-table tbody tr').forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    },

    navigate(page) {
        this.currentPage = page;
        document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.page === page));
        document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`));
        document.getElementById('page-title').textContent = page.charAt(0).toUpperCase() + page.slice(1);

        // Render page content
        if (Pages[page]) Pages[page]();
    },

    // Order operations
    saveOrder() {
        const customer = document.getElementById('order-customer').value.trim();
        const phone = document.getElementById('order-phone').value.trim();
        const cakeType = document.getElementById('order-cake-type').value;
        const size = document.getElementById('order-size').value;
        const price = document.getElementById('order-price').value;
        const advance = document.getElementById('order-advance').value || 0;
        const balance = document.getElementById('order-balance').value;
        const deliveryDate = document.getElementById('order-date').value;
        const status = document.getElementById('order-status').value;
        const notes = document.getElementById('order-notes').value;

        if (!customer || !phone || !cakeType || !size || !price || !deliveryDate) {
            UI.toast('Please fill all required fields', 'error');
            return;
        }

        const data = { customer, phone, cakeType, size, price, advance, balance, deliveryDate, status, notes };

        if (this.editingOrderId) {
            Orders.update(this.editingOrderId, data);
            UI.toast('Order updated successfully');
        } else {
            Orders.add(data);
            UI.toast('Order added successfully');
        }

        Modals.close('order-modal');
        this.navigate('orders');
        if (this.currentPage === 'dashboard') Pages.dashboard();
    },

    editOrder(id) {
        const order = Orders.getById(id);
        if (!order) return;
        this.editingOrderId = id;
        document.getElementById('order-modal-title').innerHTML = '<i class="fas fa-shopping-bag"></i> Edit Order';
        document.getElementById('order-customer').value = order.customer;
        document.getElementById('order-phone').value = order.phone;
        document.getElementById('order-cake-type').value = order.cakeType;
        document.getElementById('order-size').value = order.size;
        document.getElementById('order-price').value = order.price;
        document.getElementById('order-advance').value = order.advance;
        document.getElementById('order-balance').value = order.balance;
        document.getElementById('order-date').value = order.deliveryDate;
        document.getElementById('order-status').value = order.status;
        document.getElementById('order-notes').value = order.notes || '';
        Modals.open('order-modal');
    },

    deleteOrder(id) {
        if (confirm('Are you sure you want to delete this order?')) {
            Orders.delete(id);
            UI.toast('Order deleted');
            this.navigate('orders');
        }
    },

    // Expense operations
    saveExpense() {
        const date = document.getElementById('expense-date').value;
        const item = document.getElementById('expense-item').value.trim();
        const amount = document.getElementById('expense-amount').value;
        const note = document.getElementById('expense-note').value;

        if (!date || !item || !amount) {
            UI.toast('Please fill all required fields', 'error');
            return;
        }

        const data = { date, item, amount, note };

        if (this.editingExpenseId) {
            Expenses.update(this.editingExpenseId, data);
            UI.toast('Expense updated successfully');
        } else {
            Expenses.add(data);
            UI.toast('Expense added successfully');
        }

        Modals.close('expense-modal');
        this.navigate('expenses');
        if (this.currentPage === 'dashboard') Pages.dashboard();
    },

    editExpense(id) {
        const expense = Expenses.getAll().find(e => e.id === id);
        if (!expense) return;
        this.editingExpenseId = id;
        document.getElementById('expense-modal-title').innerHTML = '<i class="fas fa-wallet"></i> Edit Expense';
        document.getElementById('expense-date').value = expense.date;
        document.getElementById('expense-item').value = expense.item;
        document.getElementById('expense-amount').value = expense.amount;
        document.getElementById('expense-note').value = expense.note || '';
        Modals.open('expense-modal');
    },

    deleteExpense(id) {
        if (confirm('Are you sure you want to delete this expense?')) {
            Expenses.delete(id);
            UI.toast('Expense deleted');
            this.navigate('expenses');
        }
    },

    // Customer operations
    saveCustomer() {
        const name = document.getElementById('customer-name').value.trim();
        const phone = document.getElementById('customer-phone').value.trim();
        const email = document.getElementById('customer-email').value.trim();
        const address = document.getElementById('customer-address').value.trim();

        if (!name || !phone) {
            UI.toast('Please fill required fields', 'error');
            return;
        }

        const data = { name, phone, email, address };

        if (this.editingCustomerId) {
            Customers.update(this.editingCustomerId, data);
            UI.toast('Customer updated successfully');
        } else {
            Customers.add(data);
            UI.toast('Customer added successfully');
        }

        Modals.close('customer-modal');
        this.navigate('customers');
    },

    editCustomer(id) {
        const customer = Customers.getAll().find(c => c.id === id);
        if (!customer) return;
        this.editingCustomerId = id;
        document.getElementById('customer-modal-title').innerHTML = '<i class="fas fa-user"></i> Edit Customer';
        document.getElementById('customer-name').value = customer.name;
        document.getElementById('customer-phone').value = customer.phone;
        document.getElementById('customer-email').value = customer.email || '';
        document.getElementById('customer-address').value = customer.address || '';
        Modals.open('customer-modal');
    },

    deleteCustomer(id) {
        if (confirm('Are you sure you want to delete this customer?')) {
            Customers.delete(id);
            UI.toast('Customer deleted');
            this.navigate('customers');
        }
    },

    viewHistory(phone, name) {
        const history = Customers.getOrderHistory(phone);
        const content = document.getElementById('customer-history-content');
        content.innerHTML = `
            <h4 style="margin-bottom:16px;color:var(--primary-dark);"><i class="fas fa-user"></i> ${name}</h4>
            ${history.length ? `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr><th>Date</th><th>Cake</th><th>Size</th><th>Price</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                        ${history.map(o => `
                            <tr>
                                <td>${UI.formatDate(o.deliveryDate)}</td>
                                <td>${o.cakeType}</td>
                                <td>${o.size}</td>
                                <td>${UI.formatCurrency(o.price)}</td>
                                <td>${UI.getStatusBadge(o.status)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div style="margin-top:16px;padding:16px;background:var(--accent);border-radius:var(--radius-sm);">
                <strong>Total Spent:</strong> ${UI.formatCurrency(history.reduce((s, o) => s + parseFloat(o.price), 0))}
            </div>
            ` : '<p class="empty-state"><i class="fas fa-inbox"></i>No order history found.</p>'}
        `;
        Modals.open('history-modal');
    },

    // Invoice
    generateInvoice() {
        const orderId = document.getElementById('invoice-order-select').value;
        if (!orderId) {
            UI.toast('Please select an order', 'error');
            return;
        }
        const order = Orders.getById(orderId);
        if (!order) return;

        document.getElementById('inv-number').textContent = 'INV-' + order.id.slice(-6).toUpperCase();
        document.getElementById('inv-date').textContent = document.getElementById('invoice-date').value || UI.formatDate(new Date());
        document.getElementById('inv-customer').textContent = order.customer;
        document.getElementById('inv-phone').textContent = order.phone;
        document.getElementById('inv-cake').textContent = order.cakeType + (order.notes ? ' - ' + order.notes : '');
        document.getElementById('inv-size').textContent = order.size;
        document.getElementById('inv-price').textContent = UI.formatCurrency(order.price);
        document.getElementById('inv-total').textContent = UI.formatCurrency(order.price);
        document.getElementById('inv-advance').textContent = UI.formatCurrency(order.advance);
        document.getElementById('inv-balance').textContent = UI.formatCurrency(order.balance);

        document.getElementById('invoice-preview').classList.remove('hidden');
    },

    downloadInvoicePDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const orderId = document.getElementById('invoice-order-select').value;
        const order = Orders.getById(orderId);

        doc.setFontSize(22);
        doc.setTextColor(233, 30, 99);
        doc.text('The Cake House Jaela', 20, 25);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Homemade Cakes & Bakes', 20, 32);
        doc.text('Contact: 0766555687', 20, 38);

        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        doc.text('Invoice #: INV-' + order.id.slice(-6).toUpperCase(), 140, 25);
        doc.text('Date: ' + document.getElementById('invoice-date').value, 140, 32);

        doc.setDrawColor(233, 30, 99);
        doc.setLineWidth(0.5);
        doc.line(20, 45, 190, 45);

        doc.setFontSize(11);
        doc.text('Bill To:', 20, 55);
        doc.setFontSize(12);
        doc.setTextColor(30, 30, 30);
        doc.text(order.customer, 20, 63);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(order.phone, 20, 69);

        doc.setFillColor(252, 228, 236);
        doc.rect(20, 80, 170, 10, 'F');
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text('Description', 25, 87);
        doc.text('Size', 100, 87);
        doc.text('Amount', 160, 87);

        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);
        doc.text(order.cakeType, 25, 100);
        doc.text(order.size, 100, 100);
        doc.text('LKR ' + parseFloat(order.price).toFixed(2), 160, 100);

        doc.line(20, 110, 190, 110);

        doc.setFontSize(11);
        doc.text('Total:', 130, 120);
        doc.text('LKR ' + parseFloat(order.price).toFixed(2), 160, 120);
        doc.text('Advance Paid:', 130, 128);
        doc.text('LKR ' + parseFloat(order.advance).toFixed(2), 160, 128);

        doc.setFontSize(12);
        doc.setTextColor(233, 30, 99);
        doc.text('Balance Due:', 130, 140);
        doc.text('LKR ' + parseFloat(order.balance).toFixed(2), 160, 140);

        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('Thank you for choosing The Cake House Jaela!', 55, 270);

        doc.save('Invoice_' + order.customer.replace(/\s+/g, '_') + '_' + order.id.slice(-4) + '.pdf');
        UI.toast('Invoice downloaded!');
    },

    sendInvoiceWhatsApp() {
        const orderId = document.getElementById('invoice-order-select').value;
        const order = Orders.getById(orderId);
        const phone = order.phone.replace(/\D/g, '');
        const msg = encodeURIComponent(
            `*The Cake House Jaela*\n\n` +
            `Hello ${order.customer},\n\n` +
            `Here is your invoice details:\n` +
            `Cake: ${order.cakeType} (${order.size})\n` +
            `Total: LKR ${parseFloat(order.price).toFixed(2)}\n` +
            `Advance: LKR ${parseFloat(order.advance).toFixed(2)}\n` +
            `Balance: LKR ${parseFloat(order.balance).toFixed(2)}\n\n` +
            `Thank you for your order!\nContact: 0766555687`
        );
        window.open(`https://wa.me/94${phone.replace(/^0/, '')}?text=${msg}`, '_blank');
    },

    // WhatsApp quick send
    sendWhatsApp(phone, name) {
        const cleanPhone = phone.replace(/\D/g, '');
        const msg = encodeURIComponent(
            `Hello ${name}, your cake order is ready. - The Cake House Jaela`
        );
        window.open(`https://wa.me/94${cleanPhone.replace(/^0/, '')}?text=${msg}`, '_blank');
    }
};

// ========================================
// INITIALIZE
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
