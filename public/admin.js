(() => {
  const api = '/api/v1';
  const tokenKey = 'shopsphere-admin-token';
  const userKey = 'shopsphere-admin-user';
  const state = { token: sessionStorage.getItem(tokenKey) || '', user: readUser(), products: [], categories: [], orders: [], reviews: [], view: 'overview', query: '', page: 1, pageSize: 10, productStock: 'ALL', productCategory: 'ALL', orderStatus: 'ALL', paymentStatus: 'ALL', customerSegment: 'ALL', orderCustomerId: null, orderDateFrom: '', orderDateTo: '', editing: null, customerHistoryId: null };
  const el = Object.fromEntries([
    'loginView','loginForm','loginMessage','dashboardView','profileName','profileEmail','profileAvatar','logoutButton','pageEyebrow','pageTitle','pageDescription','exportButton','createButton','createButtonLabel','statsGrid','statPrimaryLabel','statPrimaryHint','statSecondaryLabel','statSecondaryHint','statTertiaryIcon','statTertiaryLabel','statTertiaryHint','totalProducts','totalCategories','lowStock','overviewPanel','overviewUpdated','overviewPendingOrders','overviewProcessingOrders','overviewLowStock','overviewOutOfStock','overviewRecentOrders','dataTableCard','salesChartCard','salesChart','salesChartTitle','salesChartSubtitle','salesChartSummary','salesChartEmpty','topProductsCard','topProductsSubtitle','topProductsEmpty','topProductsTable','topProductsExportButton','tableTitle','tableSubtitle','tableSearch','tableFilters','productStockFilter','orderStatusFilter','paymentStatusFilter','customerSegmentFilter','orderDateFromLabel','orderDateToLabel','orderDateFrom','orderDateTo','tableState','tableWrap','tablePagination','previousPage','pageSummary','nextPage','printSheet','dashboardNotice','editorDialog','editorForm','dialogEyebrow','dialogTitle','productFields','categoryFields','editorMessage','saveButton','closeDialog','cancelDialog','customerHistoryDialog','customerHistoryTitle','customerHistorySubtitle','customerHistoryContent','closeCustomerHistory','closeCustomerHistoryFooter','viewCustomerOrders','shippingDialog','shippingForm','shippingOrderLabel','shippingMessage','saveShippingButton','closeShippingDialog','cancelShipping','restockDialog','restockForm','restockProductLabel','restockCurrentStock','restockMessage','saveRestockButton','closeRestockDialog','cancelRestock','toast','currentYear'
  ].map((id) => [id, document.getElementById(id)]));
  Object.assign(el, Object.fromEntries(
    ['stockHistoryDialog','stockHistoryTitle','stockHistoryProduct','stockHistoryContent','exportStockHistoryButton','closeStockHistory','closeStockHistoryFooter']
      .map((id) => [id, document.getElementById(id)]),
  ));
  let toastTimer;
  let stockHistoryRows = [];
  let stockHistoryProductName = '';
  el.productCategoryFilter = document.createElement('select');
  el.productCategoryFilter.id = 'productCategoryFilter';
  el.productCategoryFilter.className = 'status-select product-category-filter';
  el.productCategoryFilter.setAttribute('aria-label', 'Filter produk berdasarkan kategori');
  el.productCategoryFilter.hidden = true;
  el.productStockFilter.before(el.productCategoryFilter);

  function readUser() {
    try { return JSON.parse(sessionStorage.getItem(userKey) || 'null'); } catch { return null; }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function formatPrice(value) {
    const amount = Number(value);
    return Number.isFinite(amount) ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(amount) : '—';
  }

  function formatCompactPrice(value) {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(amount)
      : '—';
  }

  function setMessage(element, message = '') {
    element.textContent = message;
    element.hidden = !message;
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2600);
  }

  function authHeaders(json = false) {
    return { Accept: 'application/json', ...(json ? { 'Content-Type': 'application/json' } : {}), ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}) };
  }

  async function request(path, options = {}) {
    let response;
    try {
      response = await fetch(`${api}${path}`, { ...options, headers: { ...authHeaders(options.body !== undefined), ...(options.headers || {}) } });
    } catch {
      throw new Error('Tidak dapat terhubung ke API. Pastikan backend berjalan lalu coba lagi.');
    }

    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (response.status === 401 && state.token) {
      clearSession();
      if (el.editorDialog.open) el.editorDialog.close();
      if (el.shippingDialog.open) el.shippingDialog.close();
      if (el.restockDialog.open) el.restockDialog.close();
      if (el.stockHistoryDialog.open) el.stockHistoryDialog.close();
      setMessage(el.loginMessage, 'Sesi admin berakhir. Silakan masuk kembali.');
      throw new Error('Sesi admin berakhir. Silakan masuk kembali.');
    }
    if (!response.ok) {
      const detail = Array.isArray(data?.message) ? data.message.join(' ') : data?.message;
      throw new Error(detail || `Permintaan gagal (${response.status}).`);
    }
    return data;
  }

  function clearSession() {
    state.token = '';
    state.user = null;
    sessionStorage.removeItem(tokenKey);
    sessionStorage.removeItem(userKey);
    el.dashboardView.hidden = true;
    el.loginView.hidden = false;
  }

  function showDashboard() {
    el.loginView.hidden = true;
    el.dashboardView.hidden = false;
    const user = state.user || {};
    el.profileName.textContent = user.name || 'Admin ShopSphere';
    el.profileEmail.textContent = user.email || '';
    el.profileAvatar.textContent = (user.name || user.email || 'A').trim().slice(0, 1).toUpperCase();
    updateViewLabels();
    renderStats();
    renderOverview();
    loadData();
  }

  async function login(event) {
    event.preventDefault();
    const submit = el.loginForm.querySelector('button[type="submit"]');
    const fields = new FormData(el.loginForm);
    setMessage(el.loginMessage);
    submit.disabled = true;
    submit.querySelector('span:first-child').textContent = 'Memeriksa akun...';
    try {
      const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: fields.get('email'), password: fields.get('password') }) });
      if (result?.user?.role !== 'ADMIN') {
        setMessage(el.loginMessage, 'Akun ini bukan admin. Masuklah menggunakan akun admin toko.');
        return;
      }
      state.token = result.accessToken;
      state.user = result.user;
      sessionStorage.setItem(tokenKey, state.token);
      sessionStorage.setItem(userKey, JSON.stringify(state.user));
      el.loginForm.reset();
      showDashboard();
    } catch (error) {
      setMessage(el.loginMessage, error.message || 'Login gagal. Periksa email dan kata sandi.');
    } finally {
      submit.disabled = false;
      submit.querySelector('span:first-child').textContent = 'Masuk ke dashboard';
    }
  }

  async function loadData() {
    el.tableState.hidden = false;
    el.tableState.innerHTML = '<span class="spinner" aria-hidden="true"></span>Memuat data toko...';
    el.tableWrap.hidden = true;
    setMessage(el.dashboardNotice);
    try {
      const [products, categories, orders, reviews] = await Promise.all([request('/products'), request('/categories'), request('/orders'), request('/admin/reviews')]);
      if (!Array.isArray(products) || !Array.isArray(categories) || !Array.isArray(orders) || !Array.isArray(reviews)) throw new Error('Format data dari API tidak sesuai.');
      state.products = products;
      state.categories = categories;
      syncProductCategoryFilter();
      state.orders = orders;
      state.reviews = reviews;
      renderDashboard();
    } catch (error) {
      el.tableState.textContent = error.message;
      el.tableState.innerHTML = `${escapeHtml(error.message)} <button class="action-button" type="button" id="retryLoad">Coba lagi</button>`;
      if (!state.token) return;
      setMessage(el.dashboardNotice, error.message);
    }
  }

  function renderDashboard() {
    renderStats();
    renderOverview();
    renderSalesChart();
    renderTopProducts();
    updateViewLabels();
    if (state.view !== 'overview') renderCurrentTable();
  }

  function renderOverview() {
    const pendingOrders = state.orders.filter((order) => order.status === 'PENDING');
    const processingOrders = state.orders.filter((order) => order.status === 'PROCESSING');
    const lowStockProducts = state.products.filter((product) => Number(product.stock) > 0 && Number(product.stock) <= 5);
    const outOfStockProducts = state.products.filter((product) => Number(product.stock) === 0);
    el.overviewPendingOrders.textContent = String(pendingOrders.length);
    el.overviewProcessingOrders.textContent = String(processingOrders.length);
    el.overviewLowStock.textContent = String(lowStockProducts.length);
    el.overviewOutOfStock.textContent = String(outOfStockProducts.length);
    el.overviewUpdated.textContent = `Diperbarui ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

    const recentOrders = [...state.orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    el.overviewRecentOrders.innerHTML = recentOrders.length
      ? recentOrders.map((order) => {
          const createdAt = new Date(order.createdAt);
          const date = Number.isFinite(createdAt.getTime())
            ? createdAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
            : 'Tanggal tidak tersedia';
          return `<button class="overview-order" type="button" data-overview-order="${Number(order.id)}"><span class="overview-order-id">#${Number(order.id)}</span><span class="overview-order-customer"><strong>${escapeHtml(order.shippingName || order.user?.name || 'Pelanggan')}</strong><small>${escapeHtml(date)}</small></span><span class="stock-pill ${order.status === 'CANCELLED' ? 'out' : order.status === 'PENDING' ? 'low' : ''}">${escapeHtml(orderStatusLabel(order.status))}</span><strong class="overview-order-total">${escapeHtml(formatPrice(order.total))}</strong><span class="overview-arrow" aria-hidden="true">›</span></button>`;
        }).join('')
      : '<p class="overview-empty">Belum ada pesanan. Pesanan baru akan muncul di sini.</p>';
  }

  function renderSalesChart() {
    const today = new Date();
    const dateRangeActive = Boolean(state.orderDateFrom || state.orderDateTo);
    const parseDate = (value) => {
      if (!value) return null;
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    };
    const selectedStart = parseDate(state.orderDateFrom);
    const selectedEnd = parseDate(state.orderDateTo);
    const endDate = selectedEnd || (selectedStart && selectedStart > today ? selectedStart : today);
    const earliestOrderDate = selectedEnd
      ? state.orders.reduce((earliest, order) => {
          if (!order.createdAt) return earliest;
          const date = new Date(order.createdAt);
          if (!Number.isFinite(date.getTime())) return earliest;
          const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          if (day > selectedEnd) return earliest;
          return !earliest || day < earliest ? day : earliest;
        }, null)
      : null;
    const startDate = selectedStart || earliestOrderDate || new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 6);
    const rangeDays = Math.floor((Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) - Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())) / 86400000) + 1;
    const monthly = dateRangeActive && rangeDays > 31;
    const days = [];
    const cursor = monthly
      ? new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      : new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    while (cursor <= endDate) {
      const date = new Date(cursor);
      const key = monthly
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      days.push({ date, key, revenue: 0, orders: 0 });
      if (monthly) cursor.setMonth(cursor.getMonth() + 1);
      else cursor.setDate(cursor.getDate() + 1);
    }

    for (const order of state.orders) {
      if (order.paymentStatus !== 'PAID' || !order.createdAt) continue;
      const date = new Date(order.createdAt);
      if (!Number.isFinite(date.getTime())) continue;
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (dateRangeActive && ((state.orderDateFrom && dateKey < state.orderDateFrom) || (state.orderDateTo && dateKey > state.orderDateTo))) continue;
      const key = monthly ? dateKey.slice(0, 7) : dateKey;
      const day = days.find((item) => item.key === key);
      const amount = Number(order.total);
      if (day && Number.isFinite(amount)) {
        day.revenue += amount;
        day.orders += 1;
      }
    }

    const maxRevenue = Math.max(0, ...days.map((day) => day.revenue));
    const totalRevenue = days.reduce((sum, day) => sum + day.revenue, 0);
    const totalOrders = days.reduce((sum, day) => sum + day.orders, 0);
    el.salesChartTitle.textContent = dateRangeActive
      ? monthly ? 'Pembayaran lunas per bulan' : 'Pembayaran lunas per hari'
      : 'Pembayaran lunas 7 hari terakhir';
    el.salesChartSubtitle.textContent = dateRangeActive
      ? `Periode ${startDate.toLocaleDateString('id-ID', { dateStyle: 'medium' })} - ${endDate.toLocaleDateString('id-ID', { dateStyle: 'medium' })}`
      : 'Ringkasan total pesanan yang pembayarannya sudah dikonfirmasi.';
    el.salesChartSummary.innerHTML = `<strong>${escapeHtml(formatPrice(totalRevenue))}</strong><small>${totalOrders} pesanan lunas</small>`;
    el.salesChartEmpty.textContent = dateRangeActive
      ? 'Belum ada pembayaran lunas pada rentang tanggal ini.'
      : 'Belum ada pembayaran lunas dalam tujuh hari terakhir.';
    el.salesChartEmpty.hidden = totalOrders > 0;
    el.salesChart.style.gridTemplateColumns = `repeat(${days.length}, minmax(38px, 1fr))`;
    el.salesChart.innerHTML = days.map((day) => {
      const percent = maxRevenue > 0 ? Math.round((day.revenue / maxRevenue) * 100) : 0;
      const dayLabel = day.date.toLocaleDateString('id-ID', monthly ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' });
      const fullLabel = day.date.toLocaleDateString('id-ID', monthly ? { month: 'long', year: 'numeric' } : { dateStyle: 'full' });
      return `<div class="sales-chart-column" role="img" aria-label="${escapeHtml(fullLabel)}: ${escapeHtml(formatPrice(day.revenue))} dari ${day.orders} pesanan lunas"><span class="sales-chart-value">${day.revenue ? escapeHtml(formatCompactPrice(day.revenue)) : ''}</span><span class="sales-chart-track"><span class="sales-chart-bar" style="height:${percent}%"></span></span><span class="sales-chart-day">${escapeHtml(dayLabel)}</span></div>`;
    }).join('');
  }

  function getTopProducts() {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    const defaultStartKey = `${defaultStart.getFullYear()}-${String(defaultStart.getMonth() + 1).padStart(2, '0')}-${String(defaultStart.getDate()).padStart(2, '0')}`;
    const startKey = state.orderDateFrom || (state.orderDateTo ? '' : defaultStartKey);
    const endKey = state.orderDateTo || (state.orderDateFrom && state.orderDateFrom > todayKey ? state.orderDateFrom : todayKey);
    const products = new Map();

    for (const order of state.orders) {
      if (order.paymentStatus !== 'PAID' || !order.createdAt) continue;
      const date = new Date(order.createdAt);
      if (!Number.isFinite(date.getTime())) continue;
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if ((startKey && dateKey < startKey) || (endKey && dateKey > endKey)) continue;

      for (const item of order.items || []) {
        const quantity = Number(item.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) continue;
        const name = item.productName || 'Produk dihapus';
        const productId = item.productId == null ? null : Number(item.productId);
        const key = productId == null ? `name:${String(name).toLocaleLowerCase('id')}` : `id:${productId}`;
        let product = products.get(key);
        if (!product) {
          product = { id: productId, name, quantity: 0, orderIds: new Set(), paidRevenue: 0 };
          products.set(key, product);
        }
        product.quantity += quantity;
        product.orderIds.add(Number(order.id));
        const lineTotal = item.lineTotal == null || item.lineTotal === '' ? Number.NaN : Number(item.lineTotal);
        const unitPrice = Number(item.unitPrice);
        product.paidRevenue += Number.isFinite(lineTotal)
          ? lineTotal
          : Number.isFinite(unitPrice) ? unitPrice * quantity : 0;
      }
    }

    return [...products.values()]
      .map((product) => ({ ...product, orderCount: product.orderIds.size }))
      .sort((a, b) => b.quantity - a.quantity || b.paidRevenue - a.paidRevenue || a.name.localeCompare(b.name, 'id'));
  }

  function renderTopProducts() {
    const dateRangeActive = Boolean(state.orderDateFrom || state.orderDateTo);
    const rows = getTopProducts();
    el.topProductsCard.hidden = state.view !== 'orders';
    el.topProductsSubtitle.textContent = dateRangeActive
      ? `Berdasarkan pesanan lunas. ${el.salesChartSubtitle.textContent}`
      : 'Berdasarkan pesanan lunas dalam tujuh hari terakhir.';
    el.topProductsEmpty.hidden = rows.length > 0;
    el.topProductsTable.hidden = rows.length === 0;
    if (!rows.length) {
      el.topProductsTable.innerHTML = '';
      return;
    }
    const visibleRows = rows.slice(0, 5);
    el.topProductsTable.innerHTML = `<table class="data-table"><thead><tr><th>Produk</th><th>Unit terjual</th><th>Jumlah pesanan</th><th>Pendapatan lunas</th></tr></thead><tbody>${visibleRows.map((product) => `<tr><td><div class="customer-cell"><strong>${escapeHtml(product.name)}</strong><small>${product.id == null ? 'Produk dihapus' : `ID ${product.id}`}</small></div></td><td>${product.quantity}</td><td>${product.orderCount}</td><td class="price-cell">${formatPrice(product.paidRevenue)}</td></tr>`).join('')}</tbody></table>`;
  }

  function exportTopProducts() {
    const rows = getTopProducts();
    if (!rows.length) {
      showToast('Tidak ada penjualan lunas untuk diekspor.');
      return;
    }
    const headers = ['ID produk', 'Nama produk', 'Unit terjual', 'Jumlah pesanan lunas', 'Pendapatan lunas (Rp)'];
    const csv = `\uFEFF${[headers, ...rows.map((product) => [product.id ?? '', product.name, product.quantity, product.orderCount, product.paidRevenue])].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `produk-terlaris-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`${rows.length} produk berhasil diekspor.`);
  }

  function renderStats() {
    if (state.view === 'overview') {
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
      const startKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      const paidThisWeek = state.orders.filter((order) => {
        if (order.paymentStatus !== 'PAID' || !order.createdAt) return false;
        const date = new Date(order.createdAt);
        if (!Number.isFinite(date.getTime())) return false;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return key >= startKey && key <= todayKey;
      }).reduce((total, order) => {
        const amount = Number(order.total);
        return Number.isFinite(amount) ? total + amount : total;
      }, 0);
      el.statPrimaryLabel.textContent = 'Pesanan baru';
      el.totalProducts.textContent = String(state.orders.filter((order) => order.status === 'PENDING').length);
      el.statPrimaryHint.textContent = 'Menunggu ditinjau dan diproses';
      el.statSecondaryLabel.textContent = 'Perlu dikirim';
      el.totalCategories.textContent = String(state.orders.filter((order) => order.status === 'PROCESSING').length);
      el.statSecondaryHint.textContent = 'Pesanan yang sedang disiapkan';
      el.statTertiaryLabel.textContent = 'Penjualan lunas 7 hari';
      el.lowStock.textContent = formatCompactPrice(paidThisWeek);
      el.lowStock.title = formatPrice(paidThisWeek);
      el.statTertiaryHint.textContent = 'Total pesanan dengan pembayaran lunas';
      el.statTertiaryIcon.textContent = 'Rp';
      el.statTertiaryIcon.classList.remove('icon-red');
      el.statTertiaryIcon.classList.add('icon-green');
      return;
    }
    const ordersView = state.view === 'orders';
    if (ordersView) {
      const visibleOrders = filterOrders(state.query.toLocaleLowerCase('id'));
      const activeOrders = visibleOrders.filter(
        (order) => !['DELIVERED', 'CANCELLED'].includes(order.status),
      ).length;
      const confirmedRevenue = visibleOrders
        .filter((order) => order.paymentStatus === 'PAID')
        .reduce((total, order) => {
          const amount = Number(order.total);
          return Number.isFinite(amount) ? total + amount : total;
        }, 0);
      const hasActiveFilter = Boolean(
        state.query ||
        state.orderCustomerId ||
        state.orderStatus !== 'ALL' ||
        state.paymentStatus !== 'ALL' ||
        state.orderDateFrom ||
        state.orderDateTo,
      );
      const scopeHint = hasActiveFilter ? 'Sesuai pencarian dan filter aktif' : 'Semua pesanan';

      el.statPrimaryLabel.textContent = 'Pesanan ditampilkan';
      el.totalProducts.textContent = String(visibleOrders.length);
      el.statPrimaryHint.textContent = scopeHint;
      el.statSecondaryLabel.textContent = 'Pesanan aktif';
      el.totalCategories.textContent = String(activeOrders);
      el.statSecondaryHint.textContent = hasActiveFilter ? 'Aktif dalam hasil terfilter' : 'Menunggu, diproses, atau dikirim';
      el.statTertiaryLabel.textContent = 'Pembayaran lunas';
      el.lowStock.textContent = formatCompactPrice(confirmedRevenue);
      el.lowStock.title = formatPrice(confirmedRevenue);
      el.statTertiaryHint.textContent = hasActiveFilter ? 'Lunas dalam hasil terfilter' : 'Tidak termasuk pembayaran refund';
      el.statTertiaryIcon.textContent = 'Rp';
      el.statTertiaryIcon.classList.remove('icon-red');
      el.statTertiaryIcon.classList.add('icon-green');
      return;
    }

    el.statPrimaryLabel.textContent = 'Total produk';
    el.totalProducts.textContent = String(state.products.length);
    el.statPrimaryHint.textContent = 'Produk terdaftar di toko';
    el.statSecondaryLabel.textContent = 'Kategori';
    el.totalCategories.textContent = String(state.categories.length);
    el.statSecondaryHint.textContent = 'Kelompok produk aktif';
    el.statTertiaryLabel.textContent = 'Stok menipis';
    el.lowStock.textContent = String(state.products.filter((product) => Number(product.stock) > 0 && Number(product.stock) <= 5).length);
    el.lowStock.title = '';
    el.statTertiaryHint.textContent = 'Produk dengan sisa stok 1–5 unit';
    el.statTertiaryIcon.textContent = '!';
    el.statTertiaryIcon.classList.remove('icon-green');
    el.statTertiaryIcon.classList.add('icon-red');
  }

  function updateViewLabels() {
    const overviewView = state.view === 'overview';
    const productsView = state.view === 'products';
    const categoriesView = state.view === 'categories';
    const ordersView = state.view === 'orders';
    const reviewsView = state.view === 'reviews';
    const customersView = state.view === 'customers';
    document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === state.view));
    el.pageEyebrow.textContent = overviewView ? 'RINGKASAN TOKO' : productsView ? 'KELOLA KATALOG' : ordersView ? 'PENJUALAN TOKO' : reviewsView ? 'ULASAN PELANGGAN' : customersView ? 'PELANGGAN TOKO' : 'KELOLA TOKO';
    el.pageTitle.textContent = overviewView ? 'Ringkasan' : productsView ? 'Produk' : ordersView ? 'Pesanan' : reviewsView ? 'Ulasan' : customersView ? 'Pelanggan' : 'Kategori';
    el.pageDescription.textContent = overviewView ? 'Pantau aktivitas toko dan lanjutkan pekerjaan yang perlu ditangani.' : productsView ? 'Atur koleksi dan stok yang tampil di toko ShopSphere.' : ordersView ? 'Lihat pesanan pelanggan dan perbarui status pengiriman.' : reviewsView ? 'Tinjau ulasan yang dikirim pelanggan setelah pesanan selesai.' : customersView ? 'Lihat ringkasan pelanggan yang pernah membuat pesanan.' : 'Kelompokkan produk agar mudah ditemukan pelanggan.';
    el.createButtonLabel.textContent = productsView ? 'Tambah produk' : 'Tambah kategori';
    el.createButton.hidden = overviewView || ordersView || reviewsView || customersView;
    el.exportButton.hidden = overviewView;
    el.overviewPanel.hidden = !overviewView;
    el.dataTableCard.hidden = overviewView;
    el.tableTitle.textContent = productsView ? 'Semua produk' : ordersView ? 'Semua pesanan' : reviewsView ? 'Semua ulasan' : customersView ? 'Pelanggan yang pernah bertransaksi' : 'Semua kategori';
    el.tableSubtitle.textContent = productsView ? 'Daftar produk yang tersedia di toko.' : ordersView ? state.orderCustomerId ? `Pesanan pelanggan ID ${state.orderCustomerId}.` : 'Pesanan terbaru yang masuk dari pelanggan.' : reviewsView ? 'Ulasan terbaru untuk produk yang tersedia di toko.' : customersView ? 'Ringkasan dibuat dari akun pada data pesanan.' : 'Kategori yang digunakan untuk mengelompokkan produk.';
    el.tableSearch.placeholder = productsView ? 'Cari produk...' : ordersView ? 'Cari pesanan...' : reviewsView ? 'Cari ulasan...' : customersView ? 'Cari pelanggan...' : 'Cari kategori...';
    el.tableFilters.hidden = !productsView && !ordersView && !customersView;
    el.productStockFilter.hidden = !productsView;
    el.productCategoryFilter.hidden = !productsView;
    el.orderStatusFilter.hidden = !ordersView;
    el.paymentStatusFilter.hidden = !ordersView;
    el.customerSegmentFilter.hidden = !customersView;
    el.orderDateFromLabel.hidden = !ordersView;
    el.orderDateToLabel.hidden = !ordersView;
    el.salesChartCard.hidden = !ordersView;
    el.statsGrid.hidden = categoriesView || reviewsView || customersView;
  }

  function setDashboardView(view, options = {}) {
    state.view = view;
    state.query = options.query || '';
    state.page = 1;
    el.tableSearch.value = state.query;
    state.productStock = ['LOW', 'OUT'].includes(options.filter) ? options.filter : 'ALL';
    el.productStockFilter.value = state.productStock;
    state.productCategory = 'ALL';
    el.productCategoryFilter.value = 'ALL';
    state.customerSegment = 'ALL';
    el.customerSegmentFilter.value = 'ALL';
    state.orderStatus = ['PENDING', 'PROCESSING'].includes(options.filter) ? options.filter : 'ALL';
    el.orderStatusFilter.value = state.orderStatus;
    state.paymentStatus = 'ALL';
    el.paymentStatusFilter.value = 'ALL';
    state.orderCustomerId = null;
    state.orderDateFrom = '';
    state.orderDateTo = '';
    el.orderDateFrom.value = '';
    el.orderDateTo.value = '';
    el.orderDateFrom.setCustomValidity('');
    el.orderDateTo.setCustomValidity('');
    updateViewLabels();
    renderStats();
    renderSalesChart();
    renderTopProducts();
    if (view !== 'overview') renderCurrentTable();
  }

  function syncProductCategoryFilter() {
    const selected = state.productCategory;
    el.productCategoryFilter.innerHTML = '<option value="ALL">Semua kategori</option><option value="NONE">Tanpa kategori</option>' + state.categories.map((category) => `<option value="${Number(category.id)}">${escapeHtml(category.name)}</option>`).join('');
    const selectedExists = selected === 'ALL' || selected === 'NONE' || state.categories.some((category) => String(category.id) === selected);
    state.productCategory = selectedExists ? selected : 'ALL';
    el.productCategoryFilter.value = state.productCategory;
  }

  function renderCurrentTable() {
    const query = state.query.toLocaleLowerCase('id');
    const rows = state.view === 'products'
      ? filterProducts(query)
      : state.view === 'orders'
        ? filterOrders(query)
        : state.view === 'reviews'
          ? filterReviews(query)
          : state.view === 'customers'
            ? filterCustomers(query)
            : filterCategories(query);
    const pageCount = Math.max(1, Math.ceil(rows.length / state.pageSize));
    state.page = Math.min(state.page, pageCount);
    const start = (state.page - 1) * state.pageSize;
    const visibleRows = rows.slice(start, start + state.pageSize);
    const html = state.view === 'products'
      ? renderProductsTable(query, visibleRows)
      : state.view === 'orders'
        ? renderOrdersTable(query, visibleRows)
        : state.view === 'reviews'
          ? renderReviewsTable(query, visibleRows)
          : state.view === 'customers'
            ? renderCustomersTable(query, visibleRows)
            : renderCategoriesTable(query, visibleRows);
    el.tablePagination.hidden = rows.length <= state.pageSize;
    el.pageSummary.textContent = rows.length ? `${start + 1}-${Math.min(start + state.pageSize, rows.length)} dari ${rows.length}` : '';
    el.previousPage.disabled = state.page <= 1;
    el.nextPage.disabled = state.page >= pageCount;
    el.tableState.hidden = true;
    el.tableWrap.hidden = false;
    el.tableWrap.innerHTML = html;
  }

  function filterProducts(query) {
    return state.products.filter((product) => {
      const stock = Math.max(0, Number(product.stock) || 0);
      if (state.productStock === 'LOW' && (stock === 0 || stock > 5)) return false;
      if (state.productStock === 'OUT' && stock !== 0) return false;
      if (state.productStock === 'AVAILABLE' && stock <= 5) return false;
      if (state.productCategory === 'NONE' && product.categoryId != null) return false;
      if (state.productCategory !== 'ALL' && state.productCategory !== 'NONE' && Number(product.categoryId) !== Number(state.productCategory)) return false;
      const searchable = `${product.name || ''} ${product.description || ''} ${product.imageUrl || ''} ${product.category?.name || ''}`;
      return searchable.toLocaleLowerCase('id').includes(query);
    });
  }

  function filterOrders(query) {
    return state.orders.filter((order) => {
      if (state.orderCustomerId && Number(order.user?.id) !== state.orderCustomerId) return false;
      const orderDate = order.createdAt ? new Date(order.createdAt) : null;
      const orderDateKey = orderDate && Number.isFinite(orderDate.getTime())
        ? `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`
        : '';
      if ((state.orderDateFrom || state.orderDateTo) && !orderDateKey) return false;
      if (state.orderDateFrom && orderDateKey < state.orderDateFrom) return false;
      if (state.orderDateTo && orderDateKey > state.orderDateTo) return false;
      if (state.orderStatus !== 'ALL' && order.status !== state.orderStatus) return false;
      if (state.paymentStatus !== 'ALL' && order.paymentStatus !== state.paymentStatus) return false;
      const searchable = `${order.id} ${order.user?.id || ''} ${order.user?.name || ''} ${order.user?.email || ''} ${order.shippingName || ''} ${order.shippingPhone || ''} ${order.shippingCarrier || ''} ${order.trackingNumber || ''} ${paymentMethodLabel(order.paymentMethod)} ${paymentStatusLabel(order.paymentStatus, order.paymentMethod)} ${(order.items || []).map((item) => item.productName).join(' ')}`;
      return searchable.toLocaleLowerCase('id').includes(query);
    });
  }

  function filterReviews(query) {
    return state.reviews.filter((review) => `${review.id} ${review.product?.name || ''} ${review.product?.id || ''} ${review.user?.name || ''} ${review.user?.email || ''} ${review.rating} ${review.comment || ''}`.toLocaleLowerCase('id').includes(query));
  }

  function filterCustomers(query) {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 30);
    return getCustomers().filter((customer) => {
      if (state.customerSegment === 'REPEAT' && customer.orderCount < 2) return false;
      if (state.customerSegment === 'NEW' && customer.orderCount !== 1) return false;
      if (state.customerSegment === 'INACTIVE') {
        const lastOrder = customer.lastOrderAt ? new Date(customer.lastOrderAt) : null;
        if (!lastOrder) return false;
        lastOrder.setHours(0, 0, 0, 0);
        if (lastOrder > cutoff) return false;
      }
      return `${customer.id} ${customer.name} ${customer.email} ${customer.orderCount}`.toLocaleLowerCase('id').includes(query);
    });
  }

  function getCustomers() {
    const customers = new Map();
    for (const order of state.orders) {
      const user = order.user;
      const id = Number(user?.id);
      if (!Number.isInteger(id) || id < 1) continue;
      let customer = customers.get(id);
      if (!customer) {
        customer = { id, name: user.name || 'Pelanggan', email: user.email || '', orderCount: 0, paidTotal: 0, lastOrderAt: null };
        customers.set(id, customer);
      }
      customer.orderCount += 1;
      const total = Number(order.total);
      if (order.paymentStatus === 'PAID' && Number.isFinite(total)) customer.paidTotal += total;
      const createdAt = order.createdAt ? new Date(order.createdAt) : null;
      if (createdAt && Number.isFinite(createdAt.getTime()) && (!customer.lastOrderAt || createdAt > customer.lastOrderAt)) {
        customer.lastOrderAt = createdAt;
      }
    }
    return [...customers.values()].sort((a, b) => (b.lastOrderAt?.getTime() || 0) - (a.lastOrderAt?.getTime() || 0));
  }

  function filterCategories(query) {
    return state.categories.filter((category) => `${category.name || ''} ${category.slug || ''}`.toLocaleLowerCase('id').includes(query));
  }

  function csvCell(value) {
    let text = value == null ? '' : value instanceof Date ? value.toISOString() : String(value);
    if (typeof value !== 'number' && /^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportCurrentView() {
    const query = state.query.toLocaleLowerCase('id');
    let filename;
    let headers;
    let rows;

    if (state.view === 'products') {
      filename = 'produk';
      headers = ['ID', 'Nama produk', 'Deskripsi', 'Harga (Rp)', 'Stok', 'Kategori', 'URL gambar', 'Dibuat pada'];
      rows = filterProducts(query)
        .map((product) => [product.id, product.name, product.description, product.price, product.stock, product.category?.name || '', product.imageUrl, product.createdAt]);
    } else if (state.view === 'categories') {
      filename = 'kategori';
      headers = ['ID', 'Nama kategori', 'Slug', 'Jumlah produk', 'Dibuat pada'];
      rows = state.categories
        .filter((category) => `${category.name || ''} ${category.slug || ''}`.toLocaleLowerCase('id').includes(query))
        .map((category) => [category.id, category.name, category.slug, Number(category._count?.products) || 0, category.createdAt]);
    } else if (state.view === 'orders') {
      filename = 'pesanan';
      headers = ['ID pesanan', 'Waktu', 'Nama pelanggan', 'Email', 'Nama penerima', 'Telepon', 'Alamat', 'Produk', 'Subtotal (Rp)', 'Ongkir (Rp)', 'Total (Rp)', 'Metode pembayaran', 'Status pembayaran', 'Status pesanan', 'Kurir', 'Nomor resi', 'Catatan'];
      rows = filterOrders(query).map((order) => [
          order.id,
          order.createdAt ? new Date(order.createdAt).toLocaleString('id-ID') : '',
          order.user?.name || '',
          order.user?.email || '',
          order.shippingName,
          order.shippingPhone,
          order.shippingAddress,
          (order.items || []).map((item) => `${item.productName} x ${Number(item.quantity)}`).join('; '),
          order.subtotal ?? order.total,
          order.shippingFee ?? 0,
          order.total,
          paymentMethodLabel(order.paymentMethod),
          paymentStatusLabel(order.paymentStatus, order.paymentMethod),
          orderStatusLabel(order.status),
          order.shippingCarrier,
          order.trackingNumber,
          order.notes,
        ]);
    } else if (state.view === 'customers') {
      filename = 'pelanggan';
      headers = ['ID pelanggan', 'Nama', 'Email', 'Jumlah pesanan', 'Total pembayaran lunas (Rp)', 'Pesanan terakhir'];
      rows = filterCustomers(query).map((customer) => [
        customer.id,
        customer.name,
        customer.email,
        customer.orderCount,
        customer.paidTotal,
        customer.lastOrderAt ? customer.lastOrderAt.toLocaleString('id-ID') : '',
      ]);
    } else {
      filename = 'ulasan';
      headers = ['ID ulasan', 'ID produk', 'Produk', 'Nama pelanggan', 'Email', 'Rating', 'Komentar', 'Dibuat pada'];
      rows = filterReviews(query).map((review) => [review.id, review.product?.id, review.product?.name, review.user?.name, review.user?.email, review.rating, review.comment, review.createdAt]);
    }

    if (!rows.length) {
      showToast('Tidak ada data yang cocok untuk diekspor.');
      return;
    }

    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`${rows.length} baris berhasil diekspor.`);
  }

  function renderProductsTable(query, rows) {
    if (!rows.length) return `<div class="empty-state"><span class="empty-state-icon" aria-hidden="true">▦</span><strong>${query || state.productStock !== 'ALL' || state.productCategory !== 'ALL' ? 'Produk tidak ditemukan' : 'Belum ada produk'}</strong><p>${query || state.productStock !== 'ALL' || state.productCategory !== 'ALL' ? 'Ubah kata kunci atau filter produk.' : 'Tambahkan produk pertama untuk ditampilkan di toko.'}</p></div>`;
    return `<table class="data-table"><thead><tr><th>Produk</th><th>Harga</th><th>Stok</th><th>Kategori</th><th><span class="visually-hidden">Aksi</span></th></tr></thead><tbody>${rows.map((product) => {
      const stock = Math.max(0, Number(product.stock) || 0);
      const stockClass = stock === 0 ? 'out' : stock <= 5 ? 'low' : '';
      const image = product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-product-image />` : '✳';
      return `<tr><td><div class="product-cell"><span class="product-thumb" aria-hidden="true">${image}</span><span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.description || 'Tidak ada deskripsi')}</small></span></div></td><td class="price-cell">${formatPrice(product.price)}</td><td><span class="stock-pill ${stockClass}">${stock} unit</span></td><td>${escapeHtml(product.category?.name || 'Tanpa kategori')}</td><td><div class="row-actions"><button class="action-button" type="button" data-restock-product="${Number(product.id)}">Tambah stok</button><button class="action-button" type="button" data-stock-history="${Number(product.id)}">Riwayat</button><button class="action-button" type="button" data-edit-product="${Number(product.id)}">Edit</button><button class="action-button danger" type="button" data-delete-product="${Number(product.id)}">Hapus</button></div></td></tr>`;
    }).join('')}</tbody></table>`;
  }

  function renderCategoriesTable(query, rows) {
    if (!rows.length) return `<div class="empty-state"><span class="empty-state-icon" aria-hidden="true">◫</span><strong>${query ? 'Kategori tidak ditemukan' : 'Belum ada kategori'}</strong><p>${query ? 'Coba kata kunci lain.' : 'Buat kategori agar produk lebih teratur.'}</p></div>`;
    return `<table class="data-table"><thead><tr><th>Nama kategori</th><th>Slug</th><th>Produk</th><th><span class="visually-hidden">Aksi</span></th></tr></thead><tbody>${rows.map((category) => `<tr><td><div class="product-cell"><span class="product-thumb" aria-hidden="true">◫</span><span><strong>${escapeHtml(category.name)}</strong><small>Kategori toko</small></span></div></td><td>${escapeHtml(category.slug)}</td><td><span class="category-count">${Number(category._count?.products) || 0} produk</span></td><td><div class="row-actions"><button class="action-button" type="button" data-edit-category="${Number(category.id)}">Edit</button><button class="action-button danger" type="button" data-delete-category="${Number(category.id)}">Hapus</button></div></td></tr>`).join('')}</tbody></table>`;
  }

  function renderReviewsTable(query, rows) {
    if (!rows.length) return `<div class="empty-state"><strong>${query ? 'Ulasan tidak ditemukan' : 'Belum ada ulasan'}</strong><p>${query ? 'Coba kata kunci lain.' : 'Ulasan produk dari pelanggan akan muncul di sini.'}</p></div>`;
    return `<table class="data-table"><thead><tr><th>Produk</th><th>Pelanggan</th><th>Rating</th><th>Ulasan</th><th>Waktu</th><th><span class="visually-hidden">Aksi</span></th></tr></thead><tbody>${rows.map((review) => {
      const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
      const stars = `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
      const date = review.createdAt ? new Date(review.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
      return `<tr><td><div class="customer-cell"><strong>${escapeHtml(review.product?.name || 'Produk dihapus')}</strong><small>ID produk ${Number(review.product?.id) || '—'}</small></div></td><td><div class="customer-cell"><strong>${escapeHtml(review.user?.name || 'Pelanggan')}</strong><small>${escapeHtml(review.user?.email || '')}</small></div></td><td><span class="review-rating" aria-label="Rating ${rating} dari 5">${stars} <strong>${rating}/5</strong></span></td><td class="review-comment">${escapeHtml(review.comment || 'Tanpa komentar')}</td><td>${escapeHtml(date)}</td><td><button class="action-button danger" type="button" data-delete-review="${Number(review.id)}">Hapus</button></td></tr>`;
    }).join('')}</tbody></table>`;
  }

  function renderCustomersTable(query, rows) {
    const filtered = Boolean(query || state.customerSegment !== 'ALL');
    if (!rows.length) return `<div class="empty-state"><strong>${filtered ? 'Pelanggan tidak ditemukan' : 'Belum ada pelanggan dengan pesanan'}</strong><p>${filtered ? 'Ubah segmen atau kata kunci.' : 'Pelanggan akan muncul setelah membuat pesanan.'}</p></div>`;
    return `<table class="data-table"><thead><tr><th>Pelanggan</th><th>Jumlah pesanan</th><th>Total lunas</th><th>Pesanan terakhir</th></tr></thead><tbody>${rows.map((customer) => {
      const lastOrder = customer.lastOrderAt ? customer.lastOrderAt.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
      return `<tr><td><div class="customer-cell"><strong>${escapeHtml(customer.name)}</strong><small>${escapeHtml(customer.email)} · ID ${customer.id}</small></div></td><td>${customer.orderCount}</td><td class="price-cell">${formatPrice(customer.paidTotal)}</td><td>${escapeHtml(lastOrder)}<button class="action-button customer-history-button" type="button" data-customer-history="${customer.id}">Riwayat</button></td></tr>`;
    }).join('')}</tbody></table>`;
  }

  function printOrderSlip(id) {
    const order = state.orders.find((item) => Number(item.id) === id);
    if (!order) return;
    const items = (order.items || []).map((item) => `<li><span>${escapeHtml(item.productName)}</span><strong>${Number(item.quantity)} unit</strong></li>`).join('');
    const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
    const tracking = order.trackingNumber
      ? `<p><strong>Kurir:</strong> ${escapeHtml(order.shippingCarrier || '—')}<br /><strong>Nomor resi:</strong> ${escapeHtml(order.trackingNumber)}</p>`
      : '<p class="print-muted">Informasi kurir belum diisi.</p>';
    el.printSheet.innerHTML = `<article class="print-sheet"><header class="print-sheet-header"><div class="print-brand">ShopSphere</div><div class="print-document-label">SLIP PENGIRIMAN</div></header><div class="print-order-number"><strong>Pesanan #${Number(order.id)}</strong><span>${escapeHtml(createdAt)}</span></div><section class="print-recipient"><h2>Penerima</h2><strong>${escapeHtml(order.shippingName)}</strong><p>${escapeHtml(order.shippingPhone)}</p><p>${escapeHtml(order.shippingAddress)}</p></section><section class="print-items"><h2>Daftar barang (${(order.items || []).length})</h2><ul>${items || '<li><span>Tidak ada barang</span></li>'}</ul></section><section class="print-shipping"><h2>Pengiriman</h2>${tracking}</section>${order.notes ? `<section class="print-notes"><h2>Catatan pesanan</h2><p>${escapeHtml(order.notes)}</p></section>` : ''}<footer class="print-footer">Terima kasih telah berbelanja di ShopSphere.</footer></article>`;
    el.printSheet.hidden = false;
    window.print();
    el.printSheet.hidden = true;
  }
  function openCustomerHistory(id) {
    const customer = getCustomers().find((item) => item.id === id);
    if (!customer) return;
    state.customerHistoryId = id;
    const orders = state.orders
      .filter((order) => Number(order.user?.id) === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    el.customerHistoryTitle.textContent = customer.name;
    el.customerHistorySubtitle.textContent = `${customer.email} - ${customer.orderCount} pesanan - ${formatPrice(customer.paidTotal)} pembayaran lunas`;
    el.customerHistoryContent.innerHTML = orders.length
      ? `<div class="history-table-wrap"><table class="data-table"><thead><tr><th>Pesanan</th><th>Tanggal</th><th>Produk</th><th>Total</th><th>Pembayaran</th><th>Status</th></tr></thead><tbody>${orders.map((order) => {
          const date = order.createdAt ? new Date(order.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
          const items = (order.items || []).map((item) => `${escapeHtml(item.productName)} x ${Number(item.quantity)}`).join(', ');
          const statusClass = order.status === 'CANCELLED' ? 'out' : order.status === 'PENDING' ? 'low' : '';
          return `<tr><td><strong>#${Number(order.id)}</strong></td><td>${escapeHtml(date)}</td><td>${items || '-'}</td><td class="price-cell">${formatPrice(order.total)}</td><td>${escapeHtml(paymentStatusLabel(order.paymentStatus, order.paymentMethod))}</td><td><span class="stock-pill ${statusClass}">${escapeHtml(orderStatusLabel(order.status))}</span></td></tr>`;
        }).join('')}</tbody></table></div>`
      : '<p class="history-empty">Belum ada pesanan untuk pelanggan ini.</p>';
    el.customerHistoryDialog.showModal();
  }

  function showCustomerOrders() {
    if (!state.customerHistoryId) return;
    state.view = 'orders';
    state.query = '';
    state.orderCustomerId = state.customerHistoryId;
    state.page = 1;
    state.orderStatus = 'ALL';
    state.paymentStatus = 'ALL';
    state.orderDateFrom = '';
    state.orderDateTo = '';
    el.tableSearch.value = state.query;
    el.orderStatusFilter.value = 'ALL';
    el.paymentStatusFilter.value = 'ALL';
    el.orderDateFrom.value = '';
    el.orderDateTo.value = '';
    el.orderDateFrom.setCustomValidity('');
    el.orderDateTo.setCustomValidity('');
    el.customerHistoryDialog.close();
    updateViewLabels();
    renderStats();
    renderSalesChart();
    renderTopProducts();
    renderCurrentTable();
  }

  function orderStatusLabel(status) {
    return ({ PENDING: 'Menunggu', PROCESSING: 'Diproses', SHIPPED: 'Dikirim', DELIVERED: 'Terkirim', CANCELLED: 'Dibatalkan' })[status] || status;
  }

  function orderNextStatuses(order) {
    const next = ({ PENDING: ['PROCESSING', 'CANCELLED'], PROCESSING: ['CANCELLED'], SHIPPED: ['DELIVERED'], DELIVERED: [], CANCELLED: [] })[order.status] || [];
    if (order.paymentMethod === 'BANK_TRANSFER' && order.paymentStatus !== 'PAID') {
      return next.filter((status) => status === 'CANCELLED');
    }
    if (order.paymentStatus === 'PAID') return next.filter((status) => status !== 'CANCELLED');
    if (order.paymentStatus === 'REFUNDED') return next.filter((status) => status === 'CANCELLED');
    return next;
  }

  function paymentNextStatuses(order) {
    if (order.paymentStatus === 'PENDING') {
      return order.paymentMethod === 'BANK_TRANSFER' ? ['PAID', 'FAILED'] : ['PAID'];
    }
    if (order.paymentStatus === 'FAILED') return ['PENDING', 'PAID'];
    if (order.paymentStatus === 'PAID' && ['PENDING', 'PROCESSING'].includes(order.status)) return ['REFUNDED'];
    return [];
  }

  function paymentMethodLabel(method) {
    return ({ BANK_TRANSFER: 'Transfer bank', CASH_ON_DELIVERY: 'COD' })[method] || method;
  }

  function paymentStatusLabel(status, method) {
    if (status === 'PENDING' && method === 'CASH_ON_DELIVERY') return 'Bayar saat diterima';
    return ({ PENDING: 'Menunggu', PAID: 'Lunas', FAILED: 'Belum terverifikasi', REFUNDED: 'Dikembalikan' })[status] || status;
  }

  function paymentStatusClass(status) {
    return status === 'FAILED' ? 'out' : status === 'PENDING' ? 'low' : '';
  }

  function renderOrdersTable(query, rows) {
    if (!rows.length) return `<div class="empty-state"><strong>${query || state.orderStatus !== 'ALL' || state.paymentStatus !== 'ALL' || state.orderDateFrom || state.orderDateTo || state.orderCustomerId ? 'Pesanan tidak ditemukan' : 'Belum ada pesanan'}</strong><p>${query || state.orderStatus !== 'ALL' || state.paymentStatus !== 'ALL' || state.orderDateFrom || state.orderDateTo || state.orderCustomerId ? 'Ubah filter atau kata kunci.' : 'Pesanan pelanggan akan muncul di sini.'}</p></div>`;
    return `<table class="data-table"><thead><tr><th>Pesanan</th><th>Pelanggan</th><th>Produk</th><th>Rincian total</th><th>Pembayaran</th><th>Pengiriman</th><th>Status pesanan</th><th>Waktu</th><th>Perbarui pesanan</th><th>Perbarui pembayaran</th></tr></thead><tbody>${rows.map((order) => {
      const items = order.items.map((item) => `${escapeHtml(item.productName)} × ${Number(item.quantity)}`).join(', ');
      const next = orderNextStatuses(order);
      const nextPayment = paymentNextStatuses(order);
      const date = new Date(order.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
      const statusClass = order.status === 'CANCELLED' ? 'out' : order.status === 'PENDING' ? 'low' : '';
      const paymentStatus = paymentStatusLabel(order.paymentStatus, order.paymentMethod);
      const shipping = order.trackingNumber
        ? `<div class="shipping-cell"><strong>${escapeHtml(order.shippingCarrier || 'Kurir')}</strong><small>${escapeHtml(order.trackingNumber)}</small>${order.shippedAt ? `<small>${escapeHtml(new Date(order.shippedAt).toLocaleDateString('id-ID'))}</small>` : ''}</div>`
        : order.status === 'PROCESSING'
          ? `<button class="action-button shipping-button" type="button" data-shipping-order="${Number(order.id)}">Isi resi &amp; kirim</button>`
          : ['SHIPPED', 'DELIVERED'].includes(order.status)
            ? '<span class="category-count">Resi tidak tersedia</span>'
          : '<span class="category-count">Belum dikirim</span>';
      return `<tr><td><strong>#${Number(order.id)}</strong><button class="action-button print-order-button" type="button" data-print-order="${Number(order.id)}">Cetak slip</button></td><td><div class="customer-cell"><strong>${escapeHtml(order.shippingName)}</strong><small>${escapeHtml(order.user?.email || '')} · ${escapeHtml(order.shippingPhone)}</small></div></td><td class="order-items-cell" title="${items}">${items}</td><td><div class="price-breakdown"><small>Produk ${formatPrice(order.subtotal ?? order.total)}</small><small>Ongkir ${formatPrice(order.shippingFee ?? 0)}</small><strong>${formatPrice(order.total)}</strong></div></td><td><div class="payment-cell"><strong>${escapeHtml(paymentMethodLabel(order.paymentMethod))}</strong><span class="stock-pill ${paymentStatusClass(order.paymentStatus)}">${escapeHtml(paymentStatus)}</span></div></td><td>${shipping}</td><td><span class="stock-pill ${statusClass}">${escapeHtml(orderStatusLabel(order.status))}</span></td><td>${escapeHtml(date)}</td><td>${next.length ? `<select class="status-select" data-order-status="${Number(order.id)}" aria-label="Ubah status pesanan ${Number(order.id)}"><option value="">Pilih status</option>${next.map((status) => `<option value="${status}">${escapeHtml(orderStatusLabel(status))}</option>`).join('')}</select>` : '<span class="category-count">Selesai</span>'}</td><td>${nextPayment.length ? `<select class="status-select" data-payment-status="${Number(order.id)}" aria-label="Ubah status pembayaran pesanan ${Number(order.id)}"><option value="">Pilih status</option>${nextPayment.map((status) => `<option value="${status}">${escapeHtml(paymentStatusLabel(status, order.paymentMethod))}</option>`).join('')}</select>` : '<span class="category-count">Selesai</span>'}</td></tr>`;
    }).join('')}</tbody></table>`;
  }
  async function updateOrderStatus(id, status, select) {
    select.disabled = true;
    setMessage(el.dashboardNotice);
    try {
      await request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      showToast(`Status pesanan #${id} diperbarui.`);
      await loadData();
    } catch (error) {
      setMessage(el.dashboardNotice, error.message || 'Status pesanan belum dapat diubah.');
      select.disabled = false;
      select.value = '';
    }
  }

  async function updatePaymentStatus(id, status, select) {
    select.disabled = true;
    setMessage(el.dashboardNotice);
    try {
      await request(`/orders/${id}/payment-status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      showToast(`Pembayaran pesanan #${id} diperbarui.`);
      await loadData();
    } catch (error) {
      setMessage(el.dashboardNotice, error.message || 'Status pembayaran belum dapat diubah.');
      select.disabled = false;
      select.value = '';
    }
  }

  function openShippingDialog(id) {
    const order = state.orders.find((item) => Number(item.id) === id);
    if (!order || order.status !== 'PROCESSING') return;
    el.shippingForm.reset();
    el.shippingForm.elements.orderId.value = String(id);
    el.shippingOrderLabel.textContent = `Pesanan #${id}`;
    setMessage(el.shippingMessage);
    el.shippingDialog.showModal();
  }

  async function saveShipping(event) {
    event.preventDefault();
    const submit = el.saveShippingButton;
    const id = Number(el.shippingForm.elements.orderId.value);
    const carrier = el.shippingForm.elements.carrier.value.trim();
    const trackingNumber = el.shippingForm.elements.trackingNumber.value.trim();
    submit.disabled = true;
    setMessage(el.shippingMessage);
    try {
      await request(`/orders/${id}/shipping`, {
        method: 'PATCH',
        body: JSON.stringify({ carrier, trackingNumber }),
      });
      el.shippingDialog.close();
      showToast(`Pesanan #${id} ditandai dikirim.`);
      await loadData();
    } catch (error) {
      setMessage(el.shippingMessage, error.message || 'Data pengiriman belum dapat disimpan.');
    } finally {
      submit.disabled = false;
    }
  }

  function openRestockDialog(id) {
    const product = state.products.find((item) => Number(item.id) === id);
    if (!product) return;
    el.restockForm.reset();
    el.restockForm.elements.productId.value = String(id);
    el.restockForm.elements.quantity.value = '1';
    el.restockProductLabel.textContent = product.name;
    el.restockCurrentStock.textContent = `Stok saat ini: ${Number(product.stock) || 0} unit`;
    setMessage(el.restockMessage);
    el.restockDialog.showModal();
    el.restockForm.elements.quantity.focus();
  }

  async function saveRestock(event) {
    event.preventDefault();
    const id = Number(el.restockForm.elements.productId.value);
    const quantity = Number(el.restockForm.elements.quantity.value);
    const submit = el.saveRestockButton;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) {
      setMessage(el.restockMessage, 'Jumlah harus berupa bilangan bulat dari 1 sampai 1.000.000.');
      return;
    }
    submit.disabled = true;
    setMessage(el.restockMessage);
    try {
      const product = await request(`/products/${id}/restock`, {
        method: 'POST',
        body: JSON.stringify({ quantity }),
      });
      el.restockDialog.close();
      showToast(`Stok ${product.name} bertambah ${quantity} unit.`);
      await loadData();
    } catch (error) {
      setMessage(el.restockMessage, error.message || 'Stok belum dapat ditambahkan.');
    } finally {
      submit.disabled = false;
    }
  }

  function stockMovementReasonLabel(reason) {
    return ({
      INITIAL_STOCK: 'Stok awal',
      RESTOCK: 'Restok',
      MANUAL_ADJUSTMENT: 'Penyesuaian manual',
      ORDER_PLACED: 'Pesanan dibuat',
      ORDER_CANCELLED: 'Pesanan dibatalkan',
    })[reason] || 'Perubahan stok';
  }

  async function openStockHistory(id) {
    const product = state.products.find((item) => Number(item.id) === id);
    if (!product) return;
    stockHistoryRows = [];
    stockHistoryProductName = product.name;
    el.exportStockHistoryButton.disabled = true;
    el.stockHistoryTitle.textContent = 'Riwayat stok';
    el.stockHistoryProduct.textContent = product.name;
    el.stockHistoryContent.innerHTML = '<p class="history-empty">Memuat riwayat stok...</p>';
    el.stockHistoryDialog.showModal();
    try {
      const movements = await request(`/products/${id}/stock-movements`);
      if (!movements.length) {
        el.stockHistoryContent.innerHTML = '<p class="history-empty">Belum ada perubahan stok tercatat.</p>';
        return;
      }
      stockHistoryRows = movements;
      el.exportStockHistoryButton.disabled = false;
      el.stockHistoryContent.innerHTML = `<div class="history-table-wrap"><table class="data-table"><thead><tr><th>Waktu</th><th>Perubahan</th><th>Stok setelah</th><th>Sumber</th></tr></thead><tbody>${movements.map((movement) => {
        const createdAt = movement.createdAt ? new Date(movement.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
        const delta = Number(movement.delta) || 0;
        const change = `${delta > 0 ? '+' : ''}${delta} unit`;
        const source = movement.orderId ? `${stockMovementReasonLabel(movement.reason)} · #${Number(movement.orderId)}` : stockMovementReasonLabel(movement.reason);
        return `<tr><td>${escapeHtml(createdAt)}</td><td class="${delta > 0 ? 'stock-change-positive' : 'stock-change-negative'}">${escapeHtml(change)}</td><td>${Number(movement.stockAfter)} unit</td><td>${escapeHtml(source)}</td></tr>`;
      }).join('')}</tbody></table></div><p class="stock-history-note">Menampilkan maksimal 100 perubahan terbaru.</p>`;
    } catch (error) {
      el.stockHistoryContent.innerHTML = `<p class="history-empty">${escapeHtml(error.message || 'Riwayat stok belum dapat dimuat.')}</p>`;
    }
  }

  function exportStockHistory() {
    if (!stockHistoryRows.length) return;
    const headers = ['ID perubahan', 'Produk', 'Waktu', 'Jenis perubahan', 'Perubahan unit', 'Stok setelah', 'ID pesanan'];
    const rows = stockHistoryRows.map((movement) => [
      movement.id,
      movement.productName || stockHistoryProductName,
      movement.createdAt,
      stockMovementReasonLabel(movement.reason),
      movement.delta,
      movement.stockAfter,
      movement.orderId,
    ]);
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = stockHistoryProductName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'produk';
    link.href = url;
    link.download = `riwayat-stok-${safeName}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`${rows.length} catatan stok berhasil diekspor.`);
  }

  function populateCategorySelect(selected = '') {
    const select = el.editorForm.elements.categoryId;
    select.innerHTML = '<option value="">Tanpa kategori</option>' + state.categories.map((category) => `<option value="${Number(category.id)}">${escapeHtml(category.name)}</option>`).join('');
    select.value = selected ? String(selected) : '';
  }

  function openEditor(kind, record = null) {
    state.editing = record ? { kind, id: record.id } : { kind, id: null };
    el.editorForm.reset();
    setMessage(el.editorMessage);
    const productMode = kind === 'product';
    el.productFields.hidden = !productMode;
    el.categoryFields.hidden = productMode;
    el.productFields.querySelectorAll('input, select, textarea').forEach((field) => { field.disabled = !productMode; });
    el.categoryFields.querySelectorAll('input, select, textarea').forEach((field) => { field.disabled = productMode; });
    el.dialogEyebrow.textContent = record ? 'UBAH DATA' : 'DATA BARU';
    el.dialogTitle.textContent = `${record ? 'Edit' : 'Tambah'} ${productMode ? 'produk' : 'kategori'}`;
    el.saveButton.textContent = record ? 'Simpan perubahan' : 'Simpan';
    if (productMode) {
      populateCategorySelect(record?.categoryId ?? record?.category?.id ?? '');
      if (record) {
        el.editorForm.elements.name.value = record.name || '';
        el.editorForm.elements.price.value = record.price || '';
        el.editorForm.elements.imageUrl.value = record.imageUrl || '';
        el.editorForm.elements.stock.value = String(record.stock ?? 0);
        el.editorForm.elements.description.value = record.description || '';
      }
    } else if (record) {
      el.editorForm.elements.categoryName.value = record.name || '';
      el.editorForm.elements.slug.value = record.slug || '';
    }
    el.editorDialog.showModal();
  }

  function slugFromName(name) {
    return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  async function saveEditor(event) {
    event.preventDefault();
    if (!state.editing) return;
    setMessage(el.editorMessage);
    const submit = el.saveButton;
    submit.disabled = true;
    const { kind, id } = state.editing;
    try {
      let path;
      let method;
      let body;
      if (kind === 'product') {
        const form = el.editorForm.elements;
        const price = form.price.value;
        if (!/^\d+(?:\.\d{1,2})?$/.test(price)) throw new Error('Harga harus berupa angka dengan maksimal dua angka desimal.');
        path = `/products${id ? `/${id}` : ''}`;
        method = id ? 'PATCH' : 'POST';
        body = { name: form.name.value.trim(), price, imageUrl: form.imageUrl.value.trim() || null, stock: Number(form.stock.value), categoryId: form.categoryId.value ? Number(form.categoryId.value) : null, description: form.description.value.trim() || null };
      } else {
        const name = el.editorForm.elements.categoryName.value.trim();
        const slug = el.editorForm.elements.slug.value.trim() || slugFromName(name);
        if (!slug) throw new Error('Nama kategori perlu berisi huruf atau angka agar slug dapat dibuat.');
        path = `/categories${id ? `/${id}` : ''}`;
        method = id ? 'PATCH' : 'POST';
        body = { name, slug };
      }
      await request(path, { method, body: JSON.stringify(body) });
      el.editorDialog.close();
      showToast(`${kind === 'product' ? 'Produk' : 'Kategori'} berhasil ${id ? 'diperbarui' : 'ditambahkan'}.`);
      await loadData();
    } catch (error) {
      setMessage(el.editorMessage, error.message || 'Data belum dapat disimpan.');
    } finally {
      submit.disabled = false;
    }
  }

  async function removeRecord(kind, id) {
    const collection = kind === 'product' ? state.products : state.categories;
    const record = collection.find((item) => Number(item.id) === id);
    if (!record) return;
    const noun = kind === 'product' ? 'produk' : 'kategori';
    const warning = kind === 'category' ? '\nProduk dalam kategori ini tetap ada, tetapi kategorinya akan dilepas.' : '';
    if (!window.confirm(`Hapus ${noun} “${record.name}”?${warning}`)) return;
    try {
      await request(`/${kind === 'product' ? 'products' : 'categories'}/${id}`, { method: 'DELETE' });
      showToast(`${noun[0].toUpperCase()}${noun.slice(1)} berhasil dihapus.`);
      await loadData();
    } catch (error) {
      setMessage(el.dashboardNotice, error.message || `${noun} belum dapat dihapus.`);
    }
  }

  async function removeReview(id) {
    const review = state.reviews.find((item) => Number(item.id) === id);
    if (!review) return;
    const productName = review.product?.name || 'produk ini';
    if (!window.confirm(`Hapus ulasan untuk ${productName}? Ulasan ini akan hilang dari halaman produk.`)) return;
    try {
      await request(`/admin/reviews/${id}`, { method: 'DELETE' });
      showToast('Ulasan berhasil dihapus.');
      await loadData();
    } catch (error) {
      setMessage(el.dashboardNotice, error.message || 'Ulasan belum dapat dihapus.');
    }
  }

  el.loginForm.addEventListener('submit', login);
  el.logoutButton.addEventListener('click', () => {
    clearSession();
    setMessage(el.loginMessage);
    showToast('Kamu sudah keluar dari dashboard.');
  });
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => setDashboardView(button.dataset.view)));
  el.overviewPanel.addEventListener('click', (event) => {
    const action = event.target.closest('[data-overview-target]');
    const orderButton = event.target.closest('[data-overview-order]');
    if (orderButton) {
      setDashboardView('orders', { query: String(Number(orderButton.dataset.overviewOrder)) });
      return;
    }
    if (action) setDashboardView(action.dataset.overviewTarget, { filter: action.dataset.overviewFilter });
  });
  el.createButton.addEventListener('click', () => openEditor(state.view === 'products' ? 'product' : 'category'));
  el.exportButton.addEventListener('click', exportCurrentView);
  el.topProductsExportButton.addEventListener('click', exportTopProducts);
  el.tableSearch.addEventListener('input', () => {
    state.query = el.tableSearch.value.trim();
    if (state.orderCustomerId) {
      state.orderCustomerId = null;
      updateViewLabels();
    }
    state.page = 1;
    renderStats();
    renderCurrentTable();
  });
  el.productStockFilter.addEventListener('change', () => { state.productStock = el.productStockFilter.value; state.page = 1; renderCurrentTable(); });
  el.productCategoryFilter.addEventListener('change', () => { state.productCategory = el.productCategoryFilter.value; state.page = 1; renderCurrentTable(); });
  el.customerSegmentFilter.addEventListener('change', () => { state.customerSegment = el.customerSegmentFilter.value; state.page = 1; renderCurrentTable(); });
  el.orderStatusFilter.addEventListener('change', () => { state.orderStatus = el.orderStatusFilter.value; state.page = 1; renderStats(); renderCurrentTable(); });
  el.paymentStatusFilter.addEventListener('change', () => { state.paymentStatus = el.paymentStatusFilter.value; state.page = 1; renderStats(); renderCurrentTable(); });
  function applyOrderDateFilter() {
    const from = el.orderDateFrom.value;
    const to = el.orderDateTo.value;
    el.orderDateFrom.setCustomValidity('');
    el.orderDateTo.setCustomValidity('');
    if (from && to && from > to) {
      el.orderDateTo.setCustomValidity('Tanggal akhir harus sama atau setelah tanggal mulai.');
      el.orderDateTo.reportValidity();
      return;
    }
    state.orderDateFrom = from;
    state.orderDateTo = to;
    state.page = 1;
    renderStats();
    renderSalesChart();
    renderTopProducts();
    renderCurrentTable();
  }
  el.orderDateFrom.addEventListener('change', applyOrderDateFilter);
  el.orderDateTo.addEventListener('change', applyOrderDateFilter);
  el.previousPage.addEventListener('click', () => { state.page = Math.max(1, state.page - 1); renderCurrentTable(); });
  el.nextPage.addEventListener('click', () => { state.page += 1; renderCurrentTable(); });
  el.tableWrap.addEventListener('change', (event) => {
    const select = event.target.closest('[data-order-status]');
    const paymentSelect = event.target.closest('[data-payment-status]');
    if (select?.value) updateOrderStatus(Number(select.dataset.orderStatus), select.value, select);
    if (paymentSelect?.value) updatePaymentStatus(Number(paymentSelect.dataset.paymentStatus), paymentSelect.value, paymentSelect);
  });
  el.tableWrap.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.editProduct) openEditor('product', state.products.find((item) => Number(item.id) === Number(button.dataset.editProduct)));
    if (button.dataset.restockProduct) openRestockDialog(Number(button.dataset.restockProduct));
    if (button.dataset.stockHistory) openStockHistory(Number(button.dataset.stockHistory));
    if (button.dataset.editCategory) openEditor('category', state.categories.find((item) => Number(item.id) === Number(button.dataset.editCategory)));
    if (button.dataset.deleteProduct) removeRecord('product', Number(button.dataset.deleteProduct));
    if (button.dataset.deleteCategory) removeRecord('category', Number(button.dataset.deleteCategory));
    if (button.dataset.deleteReview) removeReview(Number(button.dataset.deleteReview));
    if (button.dataset.customerHistory) openCustomerHistory(Number(button.dataset.customerHistory));
    if (button.dataset.printOrder) printOrderSlip(Number(button.dataset.printOrder));
    if (button.dataset.shippingOrder) openShippingDialog(Number(button.dataset.shippingOrder));
    if (button.id === 'retryLoad') loadData();
  });
  el.tableWrap.addEventListener('error', (event) => {
    if (event.target.matches?.('img[data-product-image]')) {
      event.target.closest('.product-thumb')?.replaceChildren('✳');
      event.target.remove();
    }
  }, true);
  el.tableState.addEventListener('click', (event) => {
    if (event.target.closest('#retryLoad')) loadData();
  });
  el.editorForm.addEventListener('submit', saveEditor);
  el.closeDialog.addEventListener('click', () => el.editorDialog.close());
  el.cancelDialog.addEventListener('click', () => el.editorDialog.close());
  el.shippingForm.addEventListener('submit', saveShipping);
  el.restockForm.addEventListener('submit', saveRestock);
  el.closeRestockDialog.addEventListener('click', () => el.restockDialog.close());
  el.cancelRestock.addEventListener('click', () => el.restockDialog.close());
  el.closeStockHistory.addEventListener('click', () => el.stockHistoryDialog.close());
  el.closeStockHistoryFooter.addEventListener('click', () => el.stockHistoryDialog.close());
  el.exportStockHistoryButton.addEventListener('click', exportStockHistory);
  el.closeCustomerHistory.addEventListener('click', () => el.customerHistoryDialog.close());
  el.closeCustomerHistoryFooter.addEventListener('click', () => el.customerHistoryDialog.close());
  el.viewCustomerOrders.addEventListener('click', showCustomerOrders);
  el.closeShippingDialog.addEventListener('click', () => el.shippingDialog.close());
  el.cancelShipping.addEventListener('click', () => el.shippingDialog.close());
  el.currentYear.textContent = String(new Date().getFullYear());

    // ===== Upgrade v2: wawasan, detail pesanan, urutan, rentang cepat =====
  state.sort = 'default';
  const DAY = 864e5;
  const ago = (value) => {
    const diff = Date.now() - new Date(value).getTime();
    if (!Number.isFinite(diff)) return '';
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'baru saja';
    if (min < 60) return `${min} menit lalu`;
    if (min < 1440) return `${Math.floor(min / 60)} jam lalu`;
    return `${Math.floor(min / 1440)} hari lalu`;
  };
  const localKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const waLink = (phone, text) => {
    let digits = String(phone || '').replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
    else if (digits.startsWith('8')) digits = `62${digits}`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  };

  // --- Wawasan + perlu restock (di halaman Ringkasan) ---
  const insights = document.createElement('section');
  insights.className = 'insights';
  const restockCard = document.createElement('section');
  restockCard.className = 'content-card overview-restock-card';
  el.overviewPanel.prepend(insights);
  el.overviewPanel.append(restockCard);

  function renderInsights() {
    const paid = state.orders.filter((order) => order.paymentStatus === 'PAID');
    const paidTotal = paid.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const live = state.orders.filter((order) => order.status !== 'CANCELLED');
    const customers = getCustomers();
    const repeat = customers.filter((customer) => customer.orderCount >= 2).length;
    const now = Date.now();
    const sumRange = (from, to) => paid.reduce((sum, order) => {
      const time = new Date(order.createdAt).getTime();
      return time >= from && time < to ? sum + (Number(order.total) || 0) : sum;
    }, 0);
    const thisWeek = sumRange(now - 7 * DAY, now + DAY);
    const lastWeek = sumRange(now - 14 * DAY, now - 7 * DAY);
    let delta = '<small>Belum ada pembanding</small>';
    if (lastWeek > 0) {
      const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
      delta = `<small class="${pct >= 0 ? 'up' : 'down'}">${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}% dari minggu lalu</small>`;
    } else if (thisWeek > 0) delta = '<small class="up">▲ Minggu lalu belum ada penjualan</small>';
    const card = (label, value, hint) => `<article class="insight"><p>${label}</p><strong>${value}</strong>${hint}</article>`;
    insights.innerHTML =
      card('Pendapatan 7 hari', escapeHtml(formatCompactPrice(thisWeek)), delta) +
      card('Rata-rata nilai pesanan', paid.length ? escapeHtml(formatCompactPrice(paidTotal / paid.length)) : '—', `<small>${paid.length} pesanan lunas</small>`) +
      card('Pesanan terbayar', live.length ? `${Math.round((paid.length / live.length) * 100)}%` : '—', `<small>dari ${live.length} pesanan aktif</small>`) +
      card('Pelanggan berulang', customers.length ? `${Math.round((repeat / customers.length) * 100)}%` : '—', `<small>${repeat} dari ${customers.length} pelanggan</small>`);

    const low = state.products.filter((product) => Number(product.stock) <= 5).sort((a, b) => a.stock - b.stock).slice(0, 5);
    restockCard.innerHTML = `<div class="overview-section-heading"><div><p class="eyebrow">PERSEDIAAN</p><h2>Perlu restock</h2></div></div>` +
      (low.length
        ? low.map((product) => `<div class="restock-row"><span class="product-thumb" aria-hidden="true">${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : '✳'}</span><span class="restock-name"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category?.name || 'Tanpa kategori')}</small></span><span class="stock-pill ${Number(product.stock) === 0 ? 'out' : 'low'}">${Number(product.stock) === 0 ? 'Habis' : `Sisa ${Number(product.stock)}`}</span><button class="action-button" type="button" data-quick-restock="${Number(product.id)}">Tambah stok</button></div>`).join('')
        : '<p class="overview-empty">Semua stok aman 🎉</p>');
  }
  restockCard.addEventListener('click', (event) => {
    const button = event.target.closest('[data-quick-restock]');
    if (button) openRestockDialog(Number(button.dataset.quickRestock));
  });

  const prevRenderOverview = renderOverview;
  renderOverview = function () {
    prevRenderOverview();
    renderInsights();
    el.overviewRecentOrders.querySelectorAll('[data-overview-order]').forEach((button) => {
      const order = state.orders.find((item) => Number(item.id) === Number(button.dataset.overviewOrder));
      const small = button.querySelector('.overview-order-customer small');
      if (order && small) small.textContent = `${small.textContent} · ${ago(order.createdAt)}`;
    });
    const pending = state.orders.filter((order) => order.status === 'PENDING').length;
    document.title = `${pending ? `(${pending}) ` : ''}Admin ShopSphere`;
  };

  // --- Sapaan di Ringkasan ---
  const prevUpdateLabels = updateViewLabels;
  updateViewLabels = function () {
    prevUpdateLabels();
    if (state.view === 'overview') {
      const hour = new Date().getHours();
      const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
      const first = (state.user?.name || 'Admin').split(' ')[0];
      const pending = state.orders.filter((order) => order.status === 'PENDING').length;
      el.pageDescription.textContent = `${greet}, ${first}. ${pending ? `Ada ${pending} pesanan baru menunggu.` : 'Tidak ada pesanan yang menunggu.'}`;
    }
    syncSortOptions();
    quickRange.hidden = state.view !== 'orders';
  };

  // --- Pengurutan ---
  const sortOptions = {
    products: [['default', 'Urutan bawaan'], ['name', 'Nama A–Z'], ['priceAsc', 'Harga terendah'], ['priceDesc', 'Harga tertinggi'], ['stockAsc', 'Stok tersedikit']],
    orders: [['default', 'Terbaru'], ['oldest', 'Terlama'], ['totalDesc', 'Total terbesar']],
    customers: [['default', 'Terakhir memesan'], ['paidDesc', 'Total lunas terbesar'], ['countDesc', 'Pesanan terbanyak']],
  };
  const sorters = {
    products: { name: (a, b) => String(a.name).localeCompare(String(b.name), 'id'), priceAsc: (a, b) => Number(a.price) - Number(b.price), priceDesc: (a, b) => Number(b.price) - Number(a.price), stockAsc: (a, b) => Number(a.stock) - Number(b.stock) },
    orders: { oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt), totalDesc: (a, b) => Number(b.total) - Number(a.total) },
    customers: { paidDesc: (a, b) => b.paidTotal - a.paidTotal, countDesc: (a, b) => b.orderCount - a.orderCount },
  };
  const sortSelect = document.createElement('select');
  sortSelect.className = 'status-select sort-select';
  sortSelect.setAttribute('aria-label', 'Urutkan data');
  el.tableFilters.append(sortSelect);
  function syncSortOptions() {
    const options = sortOptions[state.view];
    sortSelect.hidden = !options;
    if (!options || sortSelect.dataset.view === state.view) return;
    sortSelect.dataset.view = state.view;
    sortSelect.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
    sortSelect.value = state.sort;
  }
  sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; state.page = 1; renderCurrentTable(); });
  const withSort = (view, rows) => { const fn = sorters[view]?.[state.sort]; return fn ? [...rows].sort(fn) : rows; };
  const baseFilterProducts = filterProducts;
  filterProducts = (query) => withSort('products', baseFilterProducts(query));
  const baseFilterOrders = filterOrders;
  filterOrders = (query) => withSort('orders', baseFilterOrders(query));
  const baseFilterCustomers = filterCustomers;
  filterCustomers = (query) => withSort('customers', baseFilterCustomers(query));
  const prevSetView = setDashboardView;
  setDashboardView = function (view, options) {
    state.sort = 'default';
    sortSelect.dataset.view = '';
    prevSetView(view, options);
  };

  // --- Rentang tanggal cepat (Pesanan) ---
  const quickRange = document.createElement('div');
  quickRange.className = 'quick-range';
  quickRange.hidden = true;
  quickRange.innerHTML = '<button type="button" data-range="0">Hari ini</button><button type="button" data-range="6">7 hari</button><button type="button" data-range="29">30 hari</button><button type="button" data-range="month">Bulan ini</button><button type="button" data-range="reset">Reset</button>';
  el.tableFilters.append(quickRange);
  quickRange.addEventListener('click', (event) => {
    const button = event.target.closest('[data-range]');
    if (!button) return;
    const today = new Date();
    const range = button.dataset.range;
    if (range === 'reset') { el.orderDateFrom.value = ''; el.orderDateTo.value = ''; }
    else {
      const start = range === 'month' ? new Date(today.getFullYear(), today.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), today.getDate() - Number(range));
      el.orderDateFrom.value = localKey(start);
      el.orderDateTo.value = localKey(today);
    }
    applyOrderDateFilter();
  });

  // --- Detail pesanan (dialog + timeline + WhatsApp) ---
  const orderDialog = document.createElement('dialog');
  orderDialog.className = 'editor-dialog order-detail-dialog';
  document.body.append(orderDialog);
  orderDialog.addEventListener('click', (event) => {
    if (event.target === orderDialog || event.target.closest('[data-close-order]')) orderDialog.close();
    const print = event.target.closest('[data-detail-print]');
    if (print) { orderDialog.close(); printOrderSlip(Number(print.dataset.detailPrint)); }
  });

  function openOrderDetail(id) {
    const order = state.orders.find((item) => Number(item.id) === id);
    if (!order) return;
    const fmt = (value) => value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '';
    const cancelled = order.status === 'CANCELLED';
    const steps = cancelled
      ? [['Pesanan dibuat', fmt(order.createdAt), true], ['Pesanan dibatalkan', '', true, 'bad']]
      : [['Pesanan dibuat', fmt(order.createdAt), true], ['Pembayaran lunas', '', order.paymentStatus === 'PAID'], ['Dikirim', fmt(order.shippedAt), ['SHIPPED', 'DELIVERED'].includes(order.status)], ['Diterima pelanggan', '', order.status === 'DELIVERED']];
    const timeline = steps.map(([label, time, done, tone]) => `<li class="${done ? 'done' : ''} ${tone || ''}"><span></span><div><strong>${label}</strong>${time ? `<small>${escapeHtml(time)}</small>` : ''}</div></li>`).join('');
    const items = (order.items || []).map((item) => {
      const line = item.lineTotal ?? (Number(item.unitPrice) * Number(item.quantity));
      return `<tr><td>${escapeHtml(item.productName)}</td><td>${Number(item.quantity)}</td><td class="price-cell">${Number.isFinite(Number(line)) ? formatPrice(line) : '—'}</td></tr>`;
    }).join('');
    const message = `Halo ${order.shippingName}, pesanan #${order.id} di ShopSphere berstatus "${orderStatusLabel(order.status)}".${order.trackingNumber ? ` Kurir ${order.shippingCarrier || ''}, nomor resi ${order.trackingNumber}.` : ''} Terima kasih sudah berbelanja!`;
    orderDialog.innerHTML = `<div class="editor-form"><div class="dialog-heading"><div><p class="eyebrow">DETAIL PESANAN</p><h2>Pesanan #${Number(order.id)}</h2><small>${escapeHtml(fmt(order.createdAt))} · ${escapeHtml(ago(order.createdAt))}</small></div><button class="close-button" type="button" data-close-order aria-label="Tutup">×</button></div>
      <div class="detail-grid"><section><h3>Status</h3><ol class="timeline">${timeline}</ol></section>
      <section><h3>Penerima</h3><p class="detail-text"><strong>${escapeHtml(order.shippingName)}</strong><br>${escapeHtml(order.shippingPhone)}<br>${escapeHtml(order.shippingAddress)}</p>${order.notes ? `<p class="detail-note">Catatan: ${escapeHtml(order.notes)}</p>` : ''}
      <h3>Pembayaran</h3><p class="detail-text">${escapeHtml(paymentMethodLabel(order.paymentMethod))} · <span class="stock-pill ${paymentStatusClass(order.paymentStatus)}">${escapeHtml(paymentStatusLabel(order.paymentStatus, order.paymentMethod))}</span></p>
      ${order.trackingNumber ? `<h3>Pengiriman</h3><p class="detail-text">${escapeHtml(order.shippingCarrier || 'Kurir')} · <strong>${escapeHtml(order.trackingNumber)}</strong></p>` : ''}</section></div>
      <div class="history-table-wrap"><table class="data-table"><thead><tr><th>Produk</th><th>Jumlah</th><th>Subtotal</th></tr></thead><tbody>${items}</tbody></table></div>
      <div class="detail-totals"><span>Produk <b>${formatPrice(order.subtotal ?? order.total)}</b></span><span>Ongkir <b>${formatPrice(order.shippingFee ?? 0)}</b></span><span class="grand">Total <b>${formatPrice(order.total)}</b></span></div>
      <div class="dialog-actions"><a class="button button-secondary" href="${escapeHtml(waLink(order.shippingPhone, message))}" target="_blank" rel="noopener noreferrer">Hubungi via WhatsApp</a><button class="button button-secondary" type="button" data-detail-print="${Number(order.id)}">Cetak slip</button><button class="button button-primary" type="button" data-close-order>Tutup</button></div></div>`;
    orderDialog.showModal();
  }

  const prevRenderOrdersTable = renderOrdersTable;
  renderOrdersTable = function (query, rows) {
    return prevRenderOrdersTable(query, rows).replace(/<td><strong>#(\d+)<\/strong>/g, '<td><button class="link-button" type="button" data-order-detail="$1">#$1</button>');
  };
  el.tableWrap.addEventListener('click', (event) => {
    const button = event.target.closest('[data-order-detail]');
    if (button) openOrderDetail(Number(button.dataset.orderDetail));
  });

  if (state.token && state.user?.role === 'ADMIN') showDashboard();

    // ===== Upgrade v3: pencarian cepat, aksi cepat, analitik, laporan =====
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* abaikan */ } },
  };
  state.orderSmart = '';

  // --- Tombol Segarkan & Laporan hari ini ---
  const refreshButton = document.createElement('button');
  refreshButton.type = 'button';
  refreshButton.className = 'button button-secondary';
  refreshButton.innerHTML = '<span aria-hidden="true">↻</span><span>Segarkan</span>';
  const reportButton = document.createElement('button');
  reportButton.type = 'button';
  reportButton.className = 'button button-secondary';
  reportButton.innerHTML = '<span aria-hidden="true">▤</span><span>Laporan hari ini</span>';
  el.exportButton.before(refreshButton, reportButton);
  refreshButton.addEventListener('click', async () => {
    refreshButton.disabled = true;
    state.audit = null;
    await loadData();
    refreshButton.disabled = false;
    showToast('Data diperbarui.');
  });
  reportButton.addEventListener('click', () => printDailyReport());

  // --- Kepadatan tabel ---
  const densityButton = document.createElement('button');
  densityButton.type = 'button';
  densityButton.className = 'icon-button';
  el.tableSearch.closest('.table-search').after(densityButton);
  function applyDensity(compact) {
    document.body.classList.toggle('compact', compact);
    densityButton.setAttribute('aria-pressed', String(compact));
    densityButton.textContent = compact ? 'Tabel nyaman' : 'Tabel ringkas';
    store.set('shopsphere-admin-density', compact ? 'compact' : 'comfort');
  }
  densityButton.addEventListener('click', () => applyDensity(!document.body.classList.contains('compact')));
  applyDensity(store.get('shopsphere-admin-density') === 'compact');

  // --- Topbar: pencarian cepat, jam, status API ---
  const topRight = document.querySelector('.topbar-right');
  const paletteTrigger = document.createElement('button');
  paletteTrigger.type = 'button';
  paletteTrigger.className = 'palette-trigger';
  paletteTrigger.hidden = true;
  paletteTrigger.innerHTML = '<span>Cari cepat</span><kbd>Ctrl K</kbd>';
  const clock = document.createElement('span');
  clock.className = 'clock';
  const apiStatus = document.createElement('span');
  apiStatus.className = 'api-status';
  apiStatus.innerHTML = '<i></i><span>API</span>';
  topRight.prepend(paletteTrigger, clock, apiStatus);

  async function pingApi() {
    let ok = false;
    try { ok = (await fetch(`${api}/health`, { cache: 'no-store' })).ok; } catch { ok = false; }
    apiStatus.classList.toggle('down', !ok);
    apiStatus.lastElementChild.textContent = ok ? 'API terhubung' : 'API terputus';
  }

  // --- Hitung mundur sesi (token berlaku 15 menit) ---
  const sessionLine = document.createElement('small');
  sessionLine.className = 'session-left';
  document.querySelector('.profile-copy').append(sessionLine);
  let sessionWarned = false;
  function tokenExpiry() {
    try {
      const part = state.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(part)).exp * 1000;
    } catch { return null; }
  }
  function tickSession() {
    const expiry = state.token ? tokenExpiry() : null;
    if (!expiry) { sessionLine.textContent = ''; return; }
    const left = expiry - Date.now();
    if (left <= 0) { sessionLine.textContent = 'Sesi berakhir'; return; }
    sessionLine.textContent = `Sesi: ${Math.max(1, Math.ceil(left / 60000))} mnt lagi`;
    sessionLine.classList.toggle('warn', left < 120000);
    if (left < 120000 && !sessionWarned) {
      sessionWarned = true;
      showToast('Sesi admin berakhir dalam 2 menit. Selesaikan pekerjaanmu lalu masuk lagi.');
    }
    if (left >= 120000) sessionWarned = false;
  }

  function tick() {
    clock.textContent = new Date().toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    paletteTrigger.hidden = el.dashboardView.hidden;
    tickSession();
  }
  setInterval(tick, 15000);
  setInterval(pingApi, 30000);
  pingApi();
  const prevShowDashboard = showDashboard;
  showDashboard = function () { prevShowDashboard(); tick(); };

  // --- Filter "Perlu tindakan" di Pesanan ---
  const smartFilters = {
    UNPAID: { label: 'Menunggu pembayaran', test: (o) => o.paymentMethod === 'BANK_TRANSFER' && o.paymentStatus === 'PENDING' && o.status !== 'CANCELLED' },
    LATE: { label: 'Transfer > 24 jam', test: (o) => o.paymentMethod === 'BANK_TRANSFER' && o.paymentStatus === 'PENDING' && o.status !== 'CANCELLED' && Date.now() - new Date(o.createdAt).getTime() > DAY },
    READY: { label: 'Siap dikirim', test: (o) => o.status === 'PROCESSING' && !o.trackingNumber },
    STUCK: { label: 'Dikirim > 3 hari', test: (o) => o.status === 'SHIPPED' && o.shippedAt && Date.now() - new Date(o.shippedAt).getTime() > 3 * DAY },
  };
  const smartBar = document.createElement('div');
  smartBar.className = 'smart-bar';
  smartBar.hidden = true;
  el.tableState.before(smartBar);
  function renderSmartBar() {
    smartBar.hidden = state.view !== 'orders';
    if (smartBar.hidden) return;
    smartBar.innerHTML = '<span class="smart-label">Perlu tindakan</span>' +
      Object.entries(smartFilters).map(([key, filter]) => `<button type="button" class="smart-chip${state.orderSmart === key ? ' on' : ''}" data-smart="${key}">${filter.label}<b>${state.orders.filter(filter.test).length}</b></button>`).join('') +
      '<button type="button" class="action-button smart-print" data-print-many>Cetak slip hasil filter</button>';
  }
  const v2FilterOrders = filterOrders;
  filterOrders = (query) => {
    const rows = v2FilterOrders(query);
    const test = smartFilters[state.orderSmart]?.test;
    return test ? rows.filter(test) : rows;
  };
  function printManySlips(orders) {
    const realPrint = window.print;
    const pages = [];
    window.print = () => {};
    try {
      for (const order of orders) { printOrderSlip(Number(order.id)); pages.push(el.printSheet.innerHTML); }
    } finally { window.print = realPrint; }
    el.printSheet.innerHTML = pages.map((page) => `<div class="print-page">${page}</div>`).join('');
    el.printSheet.hidden = false;
    window.print();
    el.printSheet.hidden = true;
  }
  smartBar.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-smart]');
    if (chip) {
      state.orderSmart = state.orderSmart === chip.dataset.smart ? '' : chip.dataset.smart;
      state.page = 1;
      renderStats();
      renderCurrentTable();
      renderSmartBar();
      return;
    }
    if (event.target.closest('[data-print-many]')) {
      const rows = filterOrders(state.query.toLocaleLowerCase('id'));
      if (!rows.length) { showToast('Tidak ada pesanan untuk dicetak.'); return; }
      if (rows.length > 40) showToast('Maksimal 40 slip per cetak. Mencetak 40 pesanan pertama.');
      printManySlips(rows.slice(0, 40));
    }
  });
  const v2SetDashboardView = setDashboardView;
  setDashboardView = function (view, options) { state.orderSmart = ''; v2SetDashboardView(view, options); };
  const v2UpdateViewLabels = updateViewLabels;
  updateViewLabels = function () {
    v2UpdateViewLabels();
    reportButton.hidden = state.view !== 'overview';
    renderSmartBar();
  };
  const v2RenderDashboard = renderDashboard;
  renderDashboard = function () { v2RenderDashboard(); renderSmartBar(); };

  // --- Analitik di Ringkasan ---
  const analytics = document.createElement('section');
  analytics.className = 'analytics';
  restockCard.before(analytics);
  function renderAnalytics() {
    const since = Date.now() - 30 * DAY;
    const categoryName = new Map(state.categories.map((category) => [Number(category.id), category.name]));
    const productCategory = new Map(state.products.map((product) => [Number(product.id), product.categoryId == null ? null : Number(product.categoryId)]));
    const totals = new Map();
    let grand = 0;
    for (const order of state.orders) {
      if (order.paymentStatus !== 'PAID' || new Date(order.createdAt).getTime() < since) continue;
      for (const item of order.items || []) {
        const quantity = Number(item.quantity) || 0;
        const line = item.lineTotal != null && item.lineTotal !== '' ? Number(item.lineTotal) : Number(item.unitPrice) * quantity;
        if (!Number.isFinite(line)) continue;
        const category = productCategory.get(Number(item.productId));
        const name = category == null ? 'Tanpa kategori' : (categoryName.get(category) || 'Tanpa kategori');
        totals.set(name, (totals.get(name) || 0) + line);
        grand += line;
      }
    }
    const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = rows[0]?.[1] || 1;
    const live = state.orders.filter((order) => order.status !== 'CANCELLED');
    const bank = live.filter((order) => order.paymentMethod === 'BANK_TRANSFER').length;
    const cod = live.length - bank;
    const bankPercent = live.length ? Math.round((bank / live.length) * 100) : 0;
    analytics.innerHTML =
      `<article class="content-card analytic"><div class="overview-section-heading"><div><p class="eyebrow">30 HARI TERAKHIR</p><h2>Penjualan per kategori</h2></div></div>${rows.length
        ? rows.map(([name, value]) => `<div class="cat-row"><span>${escapeHtml(name)}</span><div class="cat-track"><i style="width:${Math.max(3, Math.round((value / max) * 100))}%"></i></div><b>${escapeHtml(formatCompactPrice(value))}</b><small>${grand ? Math.round((value / grand) * 100) : 0}%</small></div>`).join('')
        : '<p class="overview-empty">Belum ada penjualan lunas dalam 30 hari terakhir.</p>'}</article>` +
      `<article class="content-card analytic"><div class="overview-section-heading"><div><p class="eyebrow">PESANAN AKTIF</p><h2>Metode pembayaran</h2></div></div><div class="donut-wrap"><div class="donut" style="--p:${bankPercent}" role="img" aria-label="Transfer bank ${bankPercent} persen"><span>${live.length}</span><small>pesanan</small></div><ul class="donut-legend"><li><i class="dot a"></i>Transfer bank <b>${bank}</b></li><li><i class="dot b"></i>Bayar di tempat (COD) <b>${cod}</b></li></ul></div></article>`;
  }
  const v2RenderOverview = renderOverview;
  renderOverview = function () { v2RenderOverview(); renderAnalytics(); };

  // --- Label pelanggan (VIP / Berulang / Baru / Tidur) ---
  const v2RenderCustomersTable = renderCustomersTable;
  renderCustomersTable = function (query, rows) {
    const html = v2RenderCustomersTable(query, rows);
    const all = getCustomers();
    const vipIds = new Set([...all].sort((a, b) => b.paidTotal - a.paidTotal).slice(0, Math.max(1, Math.ceil(all.length * 0.1))).filter((customer) => customer.paidTotal > 0).map((customer) => customer.id));
    const byId = new Map(all.map((customer) => [customer.id, customer]));
    return html.replace(/ ID (\d+)<\/small>/g, (match, id) => {
      const customer = byId.get(Number(id));
      if (!customer) return match;
      const tags = [];
      if (vipIds.has(customer.id)) tags.push('<span class="tag vip">★ VIP</span>');
      tags.push(customer.orderCount >= 2 ? '<span class="tag repeat">Berulang</span>' : '<span class="tag new">Baru</span>');
      if (customer.lastOrderAt && Date.now() - customer.lastOrderAt.getTime() > 30 * DAY) tags.push('<span class="tag idle">Tidur</span>');
      return `${match}<span class="tags">${tags.join('')}</span>`;
    });
  };

  // --- Aksi cepat & salin alamat di detail pesanan ---
  async function patchOrder(path, body, message) {
    try {
      await request(path, { method: 'PATCH', body: JSON.stringify(body) });
      orderDialog.close();
      showToast(message);
      await loadData();
    } catch (error) { showToast(error.message || 'Perubahan belum dapat disimpan.'); }
  }
  const v2OpenOrderDetail = openOrderDetail;
  openOrderDetail = function (id) {
    v2OpenOrderDetail(id);
    const order = state.orders.find((item) => Number(item.id) === id);
    const actions = orderDialog.querySelector('.dialog-actions');
    if (!order || !actions) return;
    const next = orderNextStatuses(order);
    const payNext = paymentNextStatuses(order);
    const make = (label, cls, run) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `button ${cls}`;
      button.textContent = label;
      button.addEventListener('click', run);
      return button;
    };
    const quick = document.createElement('div');
    quick.className = 'detail-quick';
    if (payNext.includes('PAID')) quick.append(make('Tandai lunas', 'button-primary', () => patchOrder(`/orders/${id}/payment-status`, { status: 'PAID' }, `Pesanan #${id} ditandai lunas.`)));
    if (next.includes('PROCESSING')) quick.append(make('Proses pesanan', 'button-primary', () => patchOrder(`/orders/${id}/status`, { status: 'PROCESSING' }, `Pesanan #${id} diproses.`)));
    if (order.status === 'PROCESSING' && !order.trackingNumber) quick.append(make('Isi resi & kirim', 'button-primary', () => { orderDialog.close(); openShippingDialog(id); }));
    if (next.includes('DELIVERED')) quick.append(make('Tandai terkirim', 'button-primary', () => patchOrder(`/orders/${id}/status`, { status: 'DELIVERED' }, `Pesanan #${id} terkirim.`)));
    if (next.includes('CANCELLED')) quick.append(make('Batalkan pesanan', 'button-danger', () => { if (confirm(`Batalkan pesanan #${id}? Stok akan dikembalikan.`)) patchOrder(`/orders/${id}/status`, { status: 'CANCELLED' }, `Pesanan #${id} dibatalkan.`); }));
    if (quick.children.length) actions.before(quick);
    actions.prepend(make('Salin alamat', 'button-secondary', async () => {
      try {
        await navigator.clipboard.writeText(`${order.shippingName}\n${order.shippingPhone}\n${order.shippingAddress}`);
        showToast('Alamat disalin.');
      } catch { showToast('Alamat belum dapat disalin.'); }
    }));
  };

  // --- Laporan harian (cetak) ---
  function printDailyReport() {
    const key = localKey(new Date());
    const today = state.orders.filter((order) => order.createdAt && localKey(new Date(order.createdAt)) === key);
    const paid = today.filter((order) => order.paymentStatus === 'PAID');
    const revenue = paid.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const sold = new Map();
    for (const order of paid) {
      for (const item of order.items || []) {
        const name = item.productName || 'Produk';
        const row = sold.get(name) || { quantity: 0, total: 0 };
        row.quantity += Number(item.quantity) || 0;
        row.total += Number(item.lineTotal ?? (Number(item.unitPrice) * Number(item.quantity))) || 0;
        sold.set(name, row);
      }
    }
    const top = [...sold.entries()].sort((a, b) => b[1].quantity - a[1].quantity).slice(0, 10);
    const low = state.products.filter((product) => Number(product.stock) <= 5);
    const stamp = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
    const table = (head, rows) => `<table class="report-table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${head.length}">Tidak ada data.</td></tr>`}</tbody></table>`;
    el.printSheet.innerHTML = `<article class="print-sheet report"><header class="print-sheet-header"><div class="print-brand">ShopSphere</div><div class="print-document-label">LAPORAN HARIAN</div></header><p>${escapeHtml(stamp)} · dicetak oleh ${escapeHtml(state.user?.name || 'Admin')}</p>
      <div class="report-kpi"><div><b>${today.length}</b><span>Pesanan masuk</span></div><div><b>${paid.length}</b><span>Pesanan lunas</span></div><div><b>${escapeHtml(formatPrice(revenue))}</b><span>Pendapatan lunas</span></div><div><b>${today.filter((order) => order.status === 'PENDING').length}</b><span>Menunggu</span></div></div>
      <h2>Produk terjual hari ini</h2>${table(['Produk', 'Unit', 'Pendapatan'], top.map(([name, row]) => `<tr><td>${escapeHtml(name)}</td><td>${row.quantity}</td><td>${escapeHtml(formatPrice(row.total))}</td></tr>`))}
      <h2>Daftar pesanan hari ini</h2>${table(['#', 'Pelanggan', 'Status', 'Pembayaran', 'Total'], today.map((order) => `<tr><td>${Number(order.id)}</td><td>${escapeHtml(order.shippingName)}</td><td>${escapeHtml(orderStatusLabel(order.status))}</td><td>${escapeHtml(paymentStatusLabel(order.paymentStatus, order.paymentMethod))}</td><td>${escapeHtml(formatPrice(order.total))}</td></tr>`))}
      <h2>Perlu restock (${low.length})</h2>${table(['Produk', 'Stok'], low.map((product) => `<tr><td>${escapeHtml(product.name)}</td><td>${Number(product.stock)}</td></tr>`))}</article>`;
    el.printSheet.hidden = false;
    window.print();
    el.printSheet.hidden = true;
  }

  // --- Form produk: pratinjau gambar, format harga, penghitung ---
  const imageInput = el.editorForm.elements.imageUrl;
  const imagePreview = document.createElement('div');
  imagePreview.className = 'image-preview';
  imagePreview.hidden = true;
  imagePreview.innerHTML = '<img alt="Pratinjau gambar produk" referrerpolicy="no-referrer"><span></span>';
  imageInput.closest('label').after(imagePreview);
  const previewImage = imagePreview.querySelector('img');
  const previewNote = imagePreview.querySelector('span');
  function updateImagePreview() {
    const value = imageInput.value.trim();
    imagePreview.hidden = !value;
    if (!value) return;
    previewNote.textContent = 'Memuat pratinjau…';
    previewImage.hidden = false;
    previewImage.src = value;
  }
  previewImage.addEventListener('load', () => { previewNote.textContent = 'Pratinjau gambar'; });
  previewImage.addEventListener('error', () => { previewImage.hidden = true; previewNote.textContent = 'Gambar tidak dapat dimuat. Pastikan URL bisa diakses publik.'; });
  imageInput.addEventListener('input', updateImagePreview);

  const priceInput = el.editorForm.elements.price;
  const priceHint = document.createElement('small');
  priceHint.className = 'price-hint';
  priceInput.closest('label').append(priceHint);
  function updatePriceHint() {
    const value = Number(priceInput.value);
    priceHint.textContent = priceInput.value && Number.isFinite(value) ? `= ${formatPrice(value)}` : '';
  }
  priceInput.addEventListener('input', updatePriceHint);

  const descriptionInput = el.editorForm.elements.description;
  const counter = document.createElement('small');
  counter.className = 'counter';
  descriptionInput.closest('label').append(counter);
  function updateCounter() { counter.textContent = `${descriptionInput.value.length} / ${descriptionInput.maxLength}`; }
  descriptionInput.addEventListener('input', updateCounter);

  const v2OpenEditor = openEditor;
  openEditor = function (kind, record) {
    v2OpenEditor(kind, record);
    updateImagePreview();
    updatePriceHint();
    updateCounter();
  };

  // --- Pencarian cepat (Ctrl+K) ---
  const palette = document.createElement('dialog');
  palette.className = 'palette';
  palette.innerHTML = '<div class="palette-box"><input type="search" placeholder="Cari pesanan, produk, pelanggan, atau perintah…" aria-label="Pencarian cepat" autocomplete="off"><ul class="palette-list" role="listbox"></ul><div class="palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> pilih</span><span><kbd>Enter</kbd> buka</span><span><kbd>Esc</kbd> tutup</span></div></div>';
  document.body.append(palette);
  const paletteInput = palette.querySelector('input');
  const paletteList = palette.querySelector('ul');
  let paletteItems = [];
  let paletteActive = 0;
  const commands = [
    ['Ringkasan', 'Halaman', () => setDashboardView('overview')],
    ['Produk', 'Halaman', () => setDashboardView('products')],
    ['Kategori', 'Halaman', () => setDashboardView('categories')],
    ['Pesanan', 'Halaman', () => setDashboardView('orders')],
    ['Pelanggan', 'Halaman', () => setDashboardView('customers')],
    ['Ulasan', 'Halaman', () => setDashboardView('reviews')],
    ['Log aktivitas', 'Halaman', () => setDashboardView('audit')],
    ['Tambah produk', 'Perintah', () => { setDashboardView('products'); openEditor('product'); }],
    ['Tambah kategori', 'Perintah', () => { setDashboardView('categories'); openEditor('category'); }],
    ['Segarkan data', 'Perintah', () => refreshButton.click()],
    ['Cetak laporan hari ini', 'Perintah', () => printDailyReport()],
  ];
  function buildPaletteItems(raw) {
    const q = raw.trim().toLocaleLowerCase('id').replace(/^#/, '');
    const items = [];
    for (const [label, hint, run] of commands) if (!q || label.toLocaleLowerCase('id').includes(q)) items.push({ label, hint, run });
    if (q) {
      state.orders.filter((o) => `${o.id} ${o.shippingName} ${o.shippingPhone} ${o.user?.email || ''}`.toLocaleLowerCase('id').includes(q)).slice(0, 5)
        .forEach((o) => items.push({ label: `Pesanan #${o.id} · ${o.shippingName}`, hint: `${orderStatusLabel(o.status)} · ${formatPrice(o.total)}`, run: () => { setDashboardView('orders', { query: String(o.id) }); openOrderDetail(Number(o.id)); } }));
      state.products.filter((p) => `${p.name} ${p.category?.name || ''}`.toLocaleLowerCase('id').includes(q)).slice(0, 4)
        .forEach((p) => items.push({ label: p.name, hint: `Produk · stok ${Number(p.stock)}`, run: () => setDashboardView('products', { query: p.name }) }));
      getCustomers().filter((c) => `${c.name} ${c.email}`.toLocaleLowerCase('id').includes(q)).slice(0, 4)
        .forEach((c) => items.push({ label: c.name, hint: `Pelanggan · ${c.orderCount} pesanan`, run: () => openCustomerHistory(c.id) }));
    }
    return items.slice(0, 12);
  }
  function renderPalette() {
    paletteItems = buildPaletteItems(paletteInput.value);
    paletteActive = Math.min(paletteActive, Math.max(0, paletteItems.length - 1));
    paletteList.innerHTML = paletteItems.length
      ? paletteItems.map((item, index) => `<li role="option" class="${index === paletteActive ? 'active' : ''}" data-i="${index}"><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.hint)}</small></li>`).join('')
      : '<li class="palette-empty">Tidak ada hasil.</li>';
    paletteList.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  }
  function runPaletteItem(index) {
    const item = paletteItems[index];
    if (!item) return;
    palette.close();
    item.run();
  }
  function openPalette() {
    if (el.dashboardView.hidden || palette.open || document.querySelector('dialog[open]')) return;
    paletteInput.value = '';
    paletteActive = 0;
    renderPalette();
    palette.showModal();
    paletteInput.focus();
  }
  paletteInput.addEventListener('input', () => { paletteActive = 0; renderPalette(); });
  paletteInput.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); paletteActive = Math.min(paletteItems.length - 1, paletteActive + 1); renderPalette(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); paletteActive = Math.max(0, paletteActive - 1); renderPalette(); }
    else if (event.key === 'Enter') { event.preventDefault(); runPaletteItem(paletteActive); }
  });
  paletteList.addEventListener('click', (event) => {
    const row = event.target.closest('[data-i]');
    if (row) runPaletteItem(Number(row.dataset.i));
  });
  palette.addEventListener('click', (event) => { if (event.target === palette) palette.close(); });
  paletteTrigger.addEventListener('click', openPalette);
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openPalette(); }
  });
  
})();
