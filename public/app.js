(() => {
  const productsUrl = '/api/v1/products';
  const categoriesUrl = '/api/v1/categories';
  const ordersUrl = '/api/v1/orders';
  const favoritesUrl = '/api/v1/favorites';
  const storeConfigUrl = '/api/v1/store-config';
  const cartStorageKey = 'shopsphere-cart-v1';
  const recentProductsStorageKey = 'shopsphere-recent-products-v1';
  const guestFavoritesStorageKey = 'shopsphere-favorites-v1';
  const accountFavoritesStoragePrefix = 'shopsphere-favorites-user-';
  const customerTokenKey = 'shopsphere-customer-token';
  const customerUserKey = 'shopsphere-customer-user';
  const checkoutRequestStorageKey = 'shopsphere-checkout-request-v1';
  const customerOrdersPerPage = 5;
  const catalogProductsPerPage = 8;
  const customerOrdersRequestTimeoutMs = 15_000;
  const palettes = ['palette-sage', 'palette-peach', 'palette-blue', 'palette-lilac', 'palette-yellow', 'palette-rose'];
  const reviewSaveTimers = new Map();
  const reviewSaveRequests = new Map();

  const elements = {
    searchForm: document.querySelector('#searchForm'),
    searchInput: document.querySelector('#searchInput'),
    searchSuggestions: document.querySelector('#searchSuggestions'),
    sortSelect: document.querySelector('#sortSelect'),
    categoryFilters: document.querySelector('#categoryFilters'),
    homeCategoriesSection: document.querySelector('#homeCategoriesSection'),
    homeCategoryGrid: document.querySelector('#homeCategoryGrid'),
    favoritesFilter: document.querySelector('#favoritesFilter'),
    minPriceFilter: document.querySelector('#minPriceFilter'),
    maxPriceFilter: document.querySelector('#maxPriceFilter'),
    availableOnlyFilter: document.querySelector('#availableOnlyFilter'),
    minimumRatingFilter: document.querySelector('#minimumRatingFilter'),
    clearCatalogFilters: document.querySelector('#clearCatalogFilters'),
    resultCount: document.querySelector('#resultCount'),
    catalogState: document.querySelector('#catalogState'),
    productGrid: document.querySelector('#productGrid'),
    catalogPagination: document.querySelector('#catalogPagination'),
    recentProductsSection: document.querySelector('#recentProductsSection'),
    recentProductsList: document.querySelector('#recentProductsList'),
    clearRecentProducts: document.querySelector('#clearRecentProducts'),
    productDialog: document.querySelector('#productDialog'),
    closeProductDialog: document.querySelector('#closeProductDialog'),
    productDetailVisual: document.querySelector('#productDetailVisual'),
    productDetailCategory: document.querySelector('#productDetailCategory'),
    productDetailName: document.querySelector('#productDetailName'),
    productDetailRating: document.querySelector('#productDetailRating'),
    productDetailPrice: document.querySelector('#productDetailPrice'),
    productDetailStock: document.querySelector('#productDetailStock'),
    productDetailDescription: document.querySelector('#productDetailDescription'),
    productDetailAdd: document.querySelector('#productDetailAdd'),
    productDetailFavorite: document.querySelector('#productDetailFavorite'),
    productDetailShare: document.querySelector('#productDetailShare'),
    productDetailReviews: document.querySelector('#productDetailReviews'),
    customerOrdersTrigger: document.querySelector('#customerOrdersTrigger'),
    cartTrigger: document.querySelector('#cartTrigger'),
    cartCount: document.querySelector('#cartCount'),
    cartBackdrop: document.querySelector('#cartBackdrop'),
    cartDrawer: document.querySelector('#cartDrawer'),
    closeCart: document.querySelector('#closeCart'),
    cartItems: document.querySelector('#cartItems'),
    cartSubtotal: document.querySelector('#cartSubtotal'),
    cartShippingFee: document.querySelector('#cartShippingFee'),
    cartTotal: document.querySelector('#cartTotal'),
    checkoutButton: document.querySelector('#checkoutButton'),
    checkoutDialog: document.querySelector('#checkoutDialog'),
    checkoutEyebrow: document.querySelector('#checkoutEyebrow'),
    checkoutTitle: document.querySelector('#checkoutTitle'),
    closeCheckout: document.querySelector('#closeCheckout'),
    customerAuthStep: document.querySelector('#customerAuthStep'),
    customerAuthForm: document.querySelector('#customerAuthForm'),
    customerNameField: document.querySelector('#customerNameField'),
    customerPasswordHint: document.querySelector('#customerPasswordHint'),
    customerAuthMessage: document.querySelector('#customerAuthMessage'),
    customerAuthSubmit: document.querySelector('#customerAuthSubmit'),
    shippingForm: document.querySelector('#shippingForm'),
    customerIdentity: document.querySelector('#customerIdentity'),
    paymentMethod: document.querySelector('#paymentMethod'),
    paymentMethodHint: document.querySelector('#paymentMethodHint'),
    checkoutSubtotal: document.querySelector('#checkoutSubtotal'),
    checkoutShippingFee: document.querySelector('#checkoutShippingFee'),
    checkoutTotal: document.querySelector('#checkoutTotal'),
    shippingMessage: document.querySelector('#shippingMessage'),
    placeOrderButton: document.querySelector('#placeOrderButton'),
    backToCustomerAuth: document.querySelector('#backToCustomerAuth'),
    orderSuccessStep: document.querySelector('#orderSuccessStep'),
    orderSuccessCopy: document.querySelector('#orderSuccessCopy'),
    viewOrdersAfterCheckout: document.querySelector('#viewOrdersAfterCheckout'),
    orderHistoryStep: document.querySelector('#orderHistoryStep'),
    orderHistoryIdentity: document.querySelector('#orderHistoryIdentity'),
    orderHistoryList: document.querySelector('#orderHistoryList'),
    orderHistoryFilter: document.querySelector('#orderHistoryFilter'),
    customerOrderSearch: document.querySelector('#customerOrderSearch'),
    customerOrderStatusFilter: document.querySelector('#customerOrderStatusFilter'),
    customerOrderPaymentFilter: document.querySelector('#customerOrderPaymentFilter'),
    customerOrderPaymentStatusFilter: document.querySelector('#customerOrderPaymentStatusFilter'),
    customerOrderSort: document.querySelector('#customerOrderSort'),
    customerOrderDateFrom: document.querySelector('#customerOrderDateFrom'),
    customerOrderDateTo: document.querySelector('#customerOrderDateTo'),
    clearCustomerOrderFilters: document.querySelector('#clearCustomerOrderFilters'),
    exportCustomerOrders: document.querySelector('#exportCustomerOrders'),
    customerOrderCount: document.querySelector('#customerOrderCount'),
    orderRefreshStatus: document.querySelector('#orderRefreshStatus'),
    refreshCustomerOrders: document.querySelector('#refreshCustomerOrders'),
    editSavedAddress: document.querySelector('#editSavedAddress'),
    savedShippingForm: document.querySelector('#savedShippingForm'),
    savedShippingMessage: document.querySelector('#savedShippingMessage'),
    saveShippingAddress: document.querySelector('#saveShippingAddress'),
    reviewDialog: document.querySelector('#reviewDialog'),
    reviewProductName: document.querySelector('#reviewProductName'),
    reviewSummary: document.querySelector('#reviewSummary'),
    reviewList: document.querySelector('#reviewList'),
    reviewForm: document.querySelector('#reviewForm'),
    reviewMessage: document.querySelector('#reviewMessage'),
    reviewLoginNote: document.querySelector('#reviewLoginNote'),
    closeReviewDialog: document.querySelector('#closeReviewDialog'),
    customerLogout: document.querySelector('#customerLogout'),
    finishCheckout: document.querySelector('#finishCheckout'),
    toast: document.querySelector('#toast'),
  };

  let products = [];
  let recentlyViewedProductIds = readRecentlyViewedProductIds();
  let categories = [];
  let customerOrders = [];
  let visibleCustomerOrders = [];
  let activeCustomerOrderStatus = 'ALL';
  let activeCustomerOrderPaymentMethod = 'ALL';
  let activeCustomerOrderPaymentStatus = 'ALL';
  let customerOrderSort = 'newest';
  let customerOrderSearchTerm = '';
  let customerOrderDateFrom = '';
  let customerOrderDateTo = '';
  let customerOrdersPage = 1;
  let shippingFee = null;
  let bankTransfer = null;
  let activeCategory = 'all';
  let catalogPage = 1;
  let favoritesOnly = false;
  let searchTerm = '';
  let searchSuggestionProducts = [];
  let activeSearchSuggestion = -1;
  let toastTimer;
  let authMode = 'login';
  let checkoutIntent = 'checkout';
  let customerOrdersRefreshTimer = null;
  let customerOrdersLoadInProgress = false;
  let customerOrdersLoaded = false;
  let customerToken = sessionStorage.getItem(customerTokenKey) || '';
  let customerUser = readCustomerUser();
  let cart = readCart();
  let favorites = readFavorites();
  let favoriteWriteQueue = Promise.resolve();

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character]);
  }

  function formatPrice(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 'Harga belum tersedia';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 2,
    }).format(amount);
  }

  function readCart() {
    try {
      const stored = JSON.parse(localStorage.getItem(cartStorageKey) || '{}');
      if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
      return Object.fromEntries(Object.entries(stored).filter(([id, quantity]) => (
        /^\d+$/.test(id) && Number.isSafeInteger(quantity) && quantity > 0
      )));
    } catch {
      return {};
    }
  }

  function readRecentlyViewedProductIds() {
    try {
      const stored = JSON.parse(localStorage.getItem(recentProductsStorageKey) || '[]');
      if (!Array.isArray(stored)) return [];
      return [...new Set(stored.filter((id) => /^\d+$/.test(String(id))))].slice(0, 4);
    } catch {
      return [];
    }
  }

  function renderRecentlyViewedProducts() {
    const recentProducts = recentlyViewedProductIds
      .map((id) => products.find((product) => String(product.id) === id))
      .filter(Boolean);
    elements.recentProductsSection.hidden = recentProducts.length === 0;
    elements.recentProductsList.innerHTML = recentProducts.map((product) => {
      const name = escapeHtml(product.name || 'Produk ShopSphere');
      const image = product.imageUrl
        ? `<img src="${escapeHtml(product.imageUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-product-image />`
        : '<span aria-hidden="true">✳</span>';
      const stock = productStock(product);
      return `
        <article class="recent-product-card">
          <button class="recent-product-main" type="button" data-recent-view="${Number(product.id)}" aria-label="Lihat detail ${name}">
            <span class="recent-product-image">${image}</span>
            <span class="recent-product-copy">
              <small>${escapeHtml(productCategoryName(product))}</small>
              <strong>${name}</strong>
              <span>${formatPrice(product.price)}</span>
            </span>
          </button>
          <button class="recent-product-add" type="button" data-recent-add="${Number(product.id)}" ${stock > 0 ? '' : 'disabled'} aria-label="${stock > 0 ? `Tambah ${name} ke keranjang` : `${name} sedang habis`}">${stock > 0 ? 'Tambah +' : 'Stok habis'}</button>
        </article>
      `;
    }).join('');
  }

  function currentFavoritesStorageKey() {
    return customerUser?.role === 'CUSTOMER' && Number.isSafeInteger(customerUser.id)
      ? `${accountFavoritesStoragePrefix}${customerUser.id}`
      : guestFavoritesStorageKey;
  }

  function readFavorites(storageKey = currentFavoritesStorageKey()) {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(stored)) return new Set();
      return new Set(stored.map(String).filter((id) => /^\d+$/.test(id)));
    } catch {
      return new Set();
    }
  }

  function readCustomerUser() {
    try {
      return JSON.parse(sessionStorage.getItem(customerUserKey) || 'null');
    } catch {
      return null;
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } catch {
      showToast('Keranjang tidak bisa disimpan di browser ini.');
    }
    renderCart();
    updateCartCount();
  }

  function toggleFavorite(productId) {
    const id = String(productId);
    if (favorites.has(id)) favorites.delete(id);
    else favorites.add(id);
    let saved = true;
    try {
      localStorage.setItem(currentFavoritesStorageKey(), JSON.stringify([...favorites]));
    } catch {
      saved = false;
    }
    renderProducts();
    showToast(!saved
      ? 'Favorit hanya tersimpan sementara di halaman ini.'
      : favorites.has(id) ? 'Produk disimpan ke favorit.' : 'Produk dihapus dari favorit.');
    if (customerToken && customerUser?.role === 'CUSTOMER') {
      queueFavoriteWrite(customerToken, id, favorites.has(id));
    }
  }

  function productCategoryId(product) {
    return String(product.categoryId ?? product.category?.id ?? '');
  }

  function productCategoryName(product) {
    return product.category?.name || 'Pilihan harian';
  }

  function productStock(product) {
    const stock = Number(product.stock);
    return Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
  }

  function reconcileCartWithCatalog() {
    let changed = false;
    Object.entries(cart).forEach(([id, quantity]) => {
      const product = products.find((item) => String(item.id) === id);
      if (!product || productStock(product) === 0) {
        delete cart[id];
        changed = true;
      } else if (quantity > productStock(product)) {
        cart[id] = productStock(product);
        changed = true;
      }
    });
    if (changed) {
      try { localStorage.setItem(cartStorageKey, JSON.stringify(cart)); } catch { /* Keep the reconciled cart in memory. */ }
      showToast('Keranjang disesuaikan dengan stok produk terbaru.');
    }
  }

  function showCatalogMessage(message, options = {}) {
    elements.catalogState.hidden = false;
    elements.productGrid.innerHTML = '';
    elements.catalogState.innerHTML = options.loading
      ? '<span class="loading-spinner" aria-hidden="true"></span><span></span>'
      : `<span>${escapeHtml(message)}</span>${options.retry ? '<button class="retry-button" id="retryLoad" type="button">Coba lagi</button>' : ''}`;
    if (options.loading) elements.catalogState.querySelector('span:last-child').textContent = message;
  }

  function renderFilters() {
    const productCounts = new Map();
    products.forEach((product) => {
      const id = productCategoryId(product);
      if (id) productCounts.set(id, (productCounts.get(id) || 0) + 1);
    });

    const filters = [{ id: 'all', name: 'Semua', count: products.length }]
      .concat(categories.map((category) => ({
        id: String(category.id),
        name: category.name,
        count: productCounts.get(String(category.id)) || 0,
      })));

    elements.categoryFilters.innerHTML = filters.map((filter) => `
      <button
        class="filter-chip${activeCategory === filter.id ? ' active' : ''}"
        type="button"
        data-category="${escapeHtml(filter.id)}"
        aria-pressed="${activeCategory === filter.id}"
      >${escapeHtml(filter.name)}<span class="filter-chip-count">${filter.count}</span></button>
    `).join('');
    const favoriteCount = products.filter((product) => favorites.has(String(product.id))).length;
    elements.favoritesFilter.classList.toggle('active', favoritesOnly);
    elements.favoritesFilter.setAttribute('aria-pressed', String(favoritesOnly));
    elements.favoritesFilter.querySelector('[data-favorite-count]').textContent = String(favoriteCount);
  }

  function renderHomeCategories() {
    const categoryById = new Map(categories.map((category) => [String(category.id), category.name]));
    const categoryCounts = new Map();
    products.forEach((product) => {
      const id = productCategoryId(product);
      if (!id) return;
      if (!categoryById.has(id) && product.category?.name) categoryById.set(id, product.category.name);
      categoryCounts.set(id, (categoryCounts.get(id) || 0) + 1);
    });

    const homeCategories = [...categoryCounts.entries()]
      .map(([id, count]) => ({ id, count, name: categoryById.get(id) || 'Pilihan harian' }))
      .sort((left, right) => left.name.localeCompare(right.name, 'id'));
    elements.homeCategoriesSection.hidden = homeCategories.length === 0;
    if (homeCategories.length === 0) return;

    const icons = ['✳', '⌁', '◒', '✦', '◇'];
    const allButton = `
      <button class="home-category-card home-category-all" type="button" data-home-category="all" aria-pressed="${activeCategory === 'all'}">
        <span class="home-category-icon" aria-hidden="true">↗</span>
        <span class="home-category-copy"><strong>Semua produk</strong><small>${products.length} produk untuk dijelajahi</small></span>
        <span class="home-category-arrow" aria-hidden="true">→</span>
      </button>
    `;
    const categoryButtons = homeCategories.map((category, index) => `
      <button class="home-category-card${activeCategory === category.id ? ' active' : ''}" type="button" data-home-category="${escapeHtml(category.id)}" aria-pressed="${activeCategory === category.id}">
        <span class="home-category-icon" aria-hidden="true">${icons[index % icons.length]}</span>
        <span class="home-category-copy"><strong>${escapeHtml(category.name)}</strong><small>${category.count} produk tersedia</small></span>
        <span class="home-category-arrow" aria-hidden="true">→</span>
      </button>
    `).join('');
    elements.homeCategoryGrid.innerHTML = `${allButton}${categoryButtons}`;
  }

  function filteredProducts() {
    const minPrice = elements.minPriceFilter.value === '' ? null : Number(elements.minPriceFilter.value);
    const maxPrice = elements.maxPriceFilter.value === '' ? null : Number(elements.maxPriceFilter.value);
    const invalidPriceRange = (minPrice !== null && (!Number.isFinite(minPrice) || minPrice < 0))
      || (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0))
      || (minPrice !== null && maxPrice !== null && minPrice > maxPrice);
    elements.minPriceFilter.setAttribute('aria-invalid', String(invalidPriceRange));
    elements.maxPriceFilter.setAttribute('aria-invalid', String(invalidPriceRange));
    if (invalidPriceRange) return [];
    const minimumRating = Number(elements.minimumRatingFilter.value) || 0;

    let visible = products.filter((product) => {
      const categoryMatches = activeCategory === 'all' || productCategoryId(product) === activeCategory;
      const favoriteMatches = !favoritesOnly || favorites.has(String(product.id));
      const price = Number(product.price);
      const priceMatches = Number.isFinite(price)
        && (minPrice === null || price >= minPrice)
        && (maxPrice === null || price <= maxPrice);
      const stockMatches = !elements.availableOnlyFilter.checked || productStock(product) > 0;
      const ratingMatches = minimumRating === 0
        || (Number(product.reviewCount) > 0 && Number(product.averageRating) >= minimumRating);
      const searchable = `${product.name || ''} ${product.description || ''} ${productCategoryName(product)}`.toLowerCase();
      return categoryMatches && favoriteMatches && priceMatches && stockMatches && ratingMatches
        && searchable.includes(searchTerm);
    });

    const sort = elements.sortSelect.value;
    if (sort === 'price-low') visible = visible.slice().sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === 'price-high') visible = visible.slice().sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === 'name') visible = visible.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'id'));
    if (sort === 'rating') {
      visible = visible.slice().sort((a, b) => (
        (Number(b.averageRating) || 0) - (Number(a.averageRating) || 0)
        || (Number(b.reviewCount) || 0) - (Number(a.reviewCount) || 0)
      ));
    }
    if (sort === 'newest') {
      visible = visible.slice().sort((a, b) => {
        const dateDifference = Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '');
        return Number.isFinite(dateDifference) && dateDifference !== 0
          ? dateDifference
          : Number(b.id) - Number(a.id);
      });
    }
    return visible;
  }

  function closeSearchSuggestions() {
    activeSearchSuggestion = -1;
    elements.searchSuggestions.hidden = true;
    elements.searchInput.setAttribute('aria-expanded', 'false');
    elements.searchInput.removeAttribute('aria-activedescendant');
  }

  function renderSearchSuggestions() {
    const query = elements.searchInput.value.trim().toLocaleLowerCase('id');
    if (!query) {
      searchSuggestionProducts = [];
      closeSearchSuggestions();
      return;
    }

    searchSuggestionProducts = products
      .filter((product) => `${product.name || ''} ${productCategoryName(product)} ${product.description || ''}`
        .toLocaleLowerCase('id')
        .includes(query))
      .sort((left, right) => {
        const leftPrefix = String(left.name || '').toLocaleLowerCase('id').startsWith(query) ? 0 : 1;
        const rightPrefix = String(right.name || '').toLocaleLowerCase('id').startsWith(query) ? 0 : 1;
        return leftPrefix - rightPrefix || String(left.name || '').localeCompare(String(right.name || ''), 'id');
      })
      .slice(0, 5);
    activeSearchSuggestion = -1;
    elements.searchSuggestions.replaceChildren();
    if (searchSuggestionProducts.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'search-suggestions-empty';
      empty.textContent = 'Produk tidak ditemukan';
      elements.searchSuggestions.append(empty);
    } else {
      searchSuggestionProducts.forEach((product, index) => {
        const option = document.createElement('button');
        option.className = 'search-suggestion';
        option.id = `searchSuggestion-${index}`;
        option.type = 'button';
        option.role = 'option';
        option.setAttribute('aria-selected', 'false');
        option.dataset.searchProduct = String(product.id);

        const image = document.createElement('span');
        image.className = 'search-suggestion-image';
        image.setAttribute('aria-hidden', 'true');
        if (product.imageUrl) {
          const thumbnail = document.createElement('img');
          thumbnail.src = product.imageUrl;
          thumbnail.alt = '';
          thumbnail.loading = 'lazy';
          thumbnail.referrerPolicy = 'no-referrer';
          thumbnail.addEventListener('error', () => thumbnail.remove(), { once: true });
          image.append(thumbnail);
        } else {
          image.textContent = '✳';
        }

        const details = document.createElement('span');
        details.className = 'search-suggestion-details';
        const name = document.createElement('strong');
        name.textContent = product.name || 'Produk ShopSphere';
        const category = document.createElement('small');
        category.textContent = productCategoryName(product);
        details.append(name, category);

        const price = document.createElement('span');
        price.className = 'search-suggestion-price';
        price.textContent = formatPrice(product.price);
        option.append(image, details, price);
        elements.searchSuggestions.append(option);
      });
    }
    elements.searchSuggestions.hidden = false;
    elements.searchInput.setAttribute('aria-expanded', 'true');
    elements.searchInput.removeAttribute('aria-activedescendant');
  }

  function selectSearchSuggestion(index) {
    const product = searchSuggestionProducts[index];
    if (!product) return;
    elements.searchInput.value = product.name || '';
    searchTerm = elements.searchInput.value.trim().toLocaleLowerCase('id');
    catalogPage = 1;
    closeSearchSuggestions();
    renderProducts();
    openProductDetails(Number(product.id));
  }

  function updateProductUrl(productId = '') {
    const nextUrl = new URL(window.location.href);
    if (productId) nextUrl.searchParams.set('product', productId);
    else nextUrl.searchParams.delete('product');
    window.history.replaceState(null, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }

  function getProductShareUrl(productId) {
    const shareUrl = new URL(window.location.pathname, window.location.origin);
    shareUrl.searchParams.set('product', String(productId));
    return shareUrl.toString();
  }

  async function shareProduct(productId) {
    const product = products.find((item) => Number(item.id) === productId);
    if (!product) return;
    const url = getProductShareUrl(product.id);
    const title = product.name || 'Produk ShopSphere';
    const shareData = { title, text: `Lihat ${title} di ShopSphere`, url };

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        showToast('Produk berhasil dibagikan.');
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (!navigator.clipboard?.writeText) {
          showToast('Produk belum dapat dibagikan. Silakan coba lagi.');
          return;
        }
      }
    }

    if (!navigator.clipboard?.writeText) {
      showToast('Fitur salin tautan tidak tersedia di browser ini.');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Tautan produk berhasil disalin.');
    } catch {
      showToast('Tautan produk belum dapat disalin. Periksa izin clipboard browser.');
    }
  }

  function renderProducts() {
    renderFilters();
    renderHomeCategories();
    const visible = filteredProducts();
    const pageCount = Math.ceil(visible.length / catalogProductsPerPage);
    catalogPage = Math.min(catalogPage, Math.max(pageCount, 1));
    const invalidPriceRange = elements.minPriceFilter.getAttribute('aria-invalid') === 'true';
    elements.resultCount.textContent = invalidPriceRange
      ? 'Periksa rentang harga'
      : `${visible.length} produk`;
    elements.clearCatalogFilters.hidden = activeCategory === 'all'
      && !favoritesOnly
      && !searchTerm
      && !elements.minPriceFilter.value
      && !elements.maxPriceFilter.value
      && !elements.availableOnlyFilter.checked
      && elements.minimumRatingFilter.value === '0';
    elements.catalogState.hidden = true;
    elements.catalogPagination.hidden = pageCount <= 1;

    if (pageCount > 1) {
      const firstPage = Math.max(1, Math.min(catalogPage - 2, pageCount - 4));
      const lastPage = Math.min(pageCount, firstPage + 4);
      const pageButton = (page, label = String(page)) => `
        <button type="button" data-catalog-page="${page}" aria-label="Halaman ${page}"${page === catalogPage ? ' aria-current="page"' : ''}>${label}</button>
      `;
      elements.catalogPagination.innerHTML = `
        <button type="button" data-catalog-page="${catalogPage - 1}" aria-label="Halaman sebelumnya" ${catalogPage === 1 ? 'disabled' : ''}>←</button>
        ${firstPage > 1 ? `${pageButton(1)}${firstPage > 2 ? '<span aria-hidden="true">…</span>' : ''}` : ''}
        ${Array.from({ length: lastPage - firstPage + 1 }, (_, index) => pageButton(firstPage + index)).join('')}
        ${lastPage < pageCount ? `${lastPage < pageCount - 1 ? '<span aria-hidden="true">…</span>' : ''}${pageButton(pageCount)}` : ''}
        <button type="button" data-catalog-page="${catalogPage + 1}" aria-label="Halaman berikutnya" ${catalogPage === pageCount ? 'disabled' : ''}>→</button>
        <span class="catalog-page-status">Halaman ${catalogPage} dari ${pageCount}</span>
      `;
    } else {
      elements.catalogPagination.replaceChildren();
    }

    if (visible.length === 0) {
      const hasSavedProducts = products.some((product) => favorites.has(String(product.id)));
      const emptyTitle = invalidPriceRange
        ? 'Rentang harga tidak valid'
        : favoritesOnly && !hasSavedProducts ? 'Belum ada produk favorit' : 'Belum ada yang cocok';
      const emptyCopy = invalidPriceRange
        ? 'Harga tidak boleh negatif dan harga minimum tidak boleh melebihi harga maksimum.'
        : favoritesOnly && !hasSavedProducts
        ? 'Tekan ikon hati pada produk untuk menyimpannya di sini.'
        : 'Coba kata kunci lain atau pilih kategori berbeda untuk melihat koleksi kami.';
      elements.productGrid.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon" aria-hidden="true">⌕</span>
          <h3>${emptyTitle}</h3>
          <p>${emptyCopy}</p>
          <button class="empty-state-reset" type="button" data-reset-catalog>Hapus semua filter</button>
        </div>
      `;
      return;
    }

    const pageProducts = visible.slice(
      (catalogPage - 1) * catalogProductsPerPage,
      catalogPage * catalogProductsPerPage,
    );
    elements.productGrid.innerHTML = pageProducts.map((product, index) => {
      const stock = productStock(product);
      const inStock = stock > 0;
      const name = escapeHtml(product.name || 'Produk ShopSphere');
      const description = escapeHtml(product.description || 'Pilihan sederhana untuk menemani keseharianmu.');
      const palette = palettes[((catalogPage - 1) * catalogProductsPerPage + index) % palettes.length];
      const quantityInCart = Number(cart[String(product.id)] || 0);
      const isFavorite = favorites.has(String(product.id));
      const stockLabel = inStock ? `${stock} tersedia` : 'Stok habis';
      const reviewCount = Number(product.reviewCount) || 0;
      const ratingText = reviewCount
        ? `${Number(product.averageRating).toFixed(1)} dari 5 · ${reviewCount} ulasan`
        : 'Belum ada ulasan';
      const roundedRating = Math.min(5, Math.max(0, Math.round(Number(product.averageRating) || 0)));
      const ratingStars = `${'★'.repeat(roundedRating)}${'☆'.repeat(5 - roundedRating)}`;

      return `
        <article class="product-card">
          <div class="product-visual ${palette}">
            ${product.imageUrl ? `<img class="product-image" src="${escapeHtml(product.imageUrl)}" alt="${name}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-product-image />` : ''}
            <span class="product-badge">${quantityInCart ? 'Ada di keranjang' : 'Pilihan harian'}</span>
            <button class="favorite-button${isFavorite ? ' active' : ''}" type="button" data-favorite="${Number(product.id)}" aria-label="${isFavorite ? `Hapus ${name} dari favorit` : `Simpan ${name} ke favorit`}" aria-pressed="${isFavorite}" title="${isFavorite ? 'Hapus dari favorit' : 'Simpan ke favorit'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11a4.7 4.7 0 0 1 8.8-2.1 4.7 4.7 0 0 1 8.8 2.1Z" /></svg></button>
            <div class="visual-object" aria-hidden="true"><span class="visual-object-mark">✳</span></div>
            <span class="product-stock${inStock ? '' : ' sold-out'}">${stockLabel}</span>
            <button class="product-quick-view" type="button" data-product-view="${Number(product.id)}" aria-label="Lihat detail ${name}">Lihat detail <span aria-hidden="true">↗</span></button>
          </div>
          <div class="product-info">
            <p class="product-category">${escapeHtml(productCategoryName(product))}</p>
            <h3 class="product-name">${name}</h3>
            <p class="product-description">${description}</p>
              <button
                class="compare-product-button"
                type="button"
                data-compare-product="${Number(product.id)}"
                aria-pressed="false"
              >
                <span class="compare-product-icon" aria-hidden="true">＋</span>
                <span class="compare-product-label">Bandingkan</span>
              </button>
            <div class="product-rating"><span aria-hidden="true">${ratingStars}</span><small>${escapeHtml(ratingText)}</small><button type="button" data-product-reviews="${Number(product.id)}" data-review-name="${name}">Lihat ulasan</button></div>
            <div class="product-card-bottom">
              <strong class="product-price">${formatPrice(product.price)}</strong>
              <button class="add-button" type="button" data-add="${Number(product.id)}" ${inStock ? '' : 'disabled'} aria-label="${inStock ? `Tambah ${name} ke keranjang` : `${name} sedang habis`}" title="${inStock ? 'Tambah ke keranjang' : 'Stok produk sedang habis'}">
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg>
                <span>${inStock ? 'Tambah' : 'Habis'}</span>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
    updateCartCount();
  }

  function openProductDetails(productId) {
    const product = products.find((item) => Number(item.id) === productId);
    if (!product) return;
    const productIdString = String(product.id);
    recentlyViewedProductIds = [
      productIdString,
      ...recentlyViewedProductIds.filter((id) => id !== productIdString),
    ].slice(0, 4);
    try {
      localStorage.setItem(recentProductsStorageKey, JSON.stringify(recentlyViewedProductIds));
    } catch {
      showToast('Riwayat produk tidak dapat disimpan di browser ini.');
    }
    renderRecentlyViewedProducts();

    const stock = productStock(product);
    const reviewCount = Number(product.reviewCount) || 0;
    const rating = Number(product.averageRating) || 0;
    const favorite = favorites.has(String(product.id));
    const palette = palettes[(Number(product.id) || 0) % palettes.length];

    elements.productDetailVisual.className = `product-detail-visual ${palette}`;
    elements.productDetailVisual.innerHTML = product.imageUrl
      ? `<span class="product-detail-placeholder" aria-hidden="true">✳</span><img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name || 'Produk ShopSphere')}" decoding="async" referrerpolicy="no-referrer" data-product-image />`
      : '<span class="product-detail-placeholder" aria-hidden="true">✳</span>';
    elements.productDetailCategory.textContent = productCategoryName(product);
    elements.productDetailName.textContent = product.name || 'Produk ShopSphere';
    elements.productDetailRating.textContent = reviewCount
      ? `${'★'.repeat(Math.min(5, Math.max(0, Math.round(rating)))).padEnd(5, '☆')}  ${rating.toFixed(1)} dari 5 · ${reviewCount} ulasan`
      : 'Belum ada ulasan';
    elements.productDetailPrice.textContent = formatPrice(product.price);
    elements.productDetailStock.textContent = stock > 0 ? `${stock} tersedia` : 'Stok sedang habis';
    elements.productDetailDescription.textContent = product.description || 'Pilihan sederhana untuk menemani keseharianmu.';
    elements.productDetailAdd.disabled = stock <= 0;
    elements.productDetailAdd.dataset.productId = String(product.id);
    elements.productDetailAdd.textContent = stock > 0 ? 'Tambah ke keranjang' : 'Stok habis';
    elements.productDetailFavorite.dataset.productId = String(product.id);
    elements.productDetailFavorite.setAttribute('aria-pressed', String(favorite));
    elements.productDetailFavorite.textContent = favorite ? '♥ Tersimpan di favorit' : '♡ Simpan favorit';
    elements.productDetailReviews.dataset.productId = String(product.id);
    elements.productDetailReviews.textContent = reviewCount ? `Lihat ${reviewCount} ulasan` : 'Jadilah yang pertama memberi ulasan';
    elements.productDetailShare.dataset.productId = String(product.id);
    updateProductUrl(productIdString);
    if (!elements.productDialog.open) elements.productDialog.showModal();
  }

  function addProductToCart(product) {
    const id = String(product.id);
    const currentQuantity = Number(cart[id] || 0);
    if (currentQuantity >= productStock(product)) {
      showToast('Jumlah sudah mencapai stok yang tersedia.');
      return;
    }
    cart[id] = currentQuantity + 1;
    saveCart();
    renderProducts();
    showToast(`${product.name} ditambahkan ke keranjang.`);
  }

  function cartEntries() {
    return Object.entries(cart).map(([id, quantity]) => ({
      product: products.find((product) => String(product.id) === id),
      quantity,
    })).filter((entry) => entry.product);
  }

  function updateCartCount() {
    const count = Object.values(cart).reduce((total, quantity) => total + quantity, 0);
    elements.cartCount.textContent = String(count);
    elements.cartTrigger.setAttribute('aria-label', `Buka keranjang, ${count} barang`);
    elements.checkoutButton.disabled = cartEntries().length === 0 || shippingFee === null;
  }

  function renderCart() {
    const entries = cartEntries();
    if (entries.length === 0) {
      elements.cartItems.innerHTML = `
        <div class="cart-empty">
          <span class="cart-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M3.5 4.5h2l2.1 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.5l1.3-6.3H7"/><circle cx="10" cy="20" r="1.2"/><circle cx="17" cy="20" r="1.2"/></svg>
          </span>
          <strong>Keranjangmu masih kosong</strong>
          <span>Temukan pilihan yang cocok dan tambahkan ke keranjang.</span>
        </div>
      `;
      elements.cartSubtotal.textContent = formatPrice(0);
      elements.cartShippingFee.textContent = formatPrice(0);
      elements.cartTotal.textContent = formatPrice(0);
      return;
    }

    let subtotal = 0;
    elements.cartItems.innerHTML = entries.map(({ product, quantity }) => {
      subtotal += Number(product.price) * quantity;
      const palette = palettes[(Number(product.id) || 0) % palettes.length];
      const name = escapeHtml(product.name || 'Produk ShopSphere');
      return `
        <div class="cart-line">
          <div class="cart-line-art ${palette}"><span aria-hidden="true">&#10033;</span>${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-product-image />` : ''}</div>
          <div class="cart-line-copy">
            <strong>${name}</strong>
            <small>${formatPrice(product.price)} / item</small>
            <div class="quantity-control" aria-label="Jumlah ${name}">
              <button type="button" data-quantity="${Number(product.id)}" data-delta="-1" aria-label="Kurangi jumlah">−</button>
              <span>${quantity}</span>
              <button type="button" data-quantity="${Number(product.id)}" data-delta="1" aria-label="Tambah jumlah" ${quantity >= productStock(product) ? 'disabled' : ''}>+</button>
            </div>
            <button class="cart-remove-button" type="button" data-remove-cart-item="${Number(product.id)}" aria-label="Hapus ${name} dari keranjang">Hapus</button>
          </div>
          <strong class="cart-line-price">${formatPrice(Number(product.price) * quantity)}</strong>
        </div>
      `;
    }).join('');
    elements.cartSubtotal.textContent = formatPrice(subtotal);
    elements.cartShippingFee.textContent = shippingFee === null ? 'Memuat...' : formatPrice(shippingFee);
    elements.cartTotal.textContent = shippingFee === null ? 'Memuat...' : formatPrice(subtotal + shippingFee);
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 2400);
  }

  function setCartOpen(open) {
    document.body.classList.toggle('cart-open', open);
    elements.cartDrawer.setAttribute('aria-hidden', String(!open));
    elements.cartDrawer.inert = !open;
    elements.cartBackdrop.hidden = !open;
    if (open) {
      renderCart();
      elements.cartDrawer.focus();
    } else {
      elements.cartTrigger.focus();
    }
  }

  function setCheckoutMessage(element, message = '') {
    element.textContent = message;
    element.hidden = !message;
  }

  async function sendJson(url, body, token = '', method = 'POST', extraHeaders = {}) {
    let response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          ...extraHeaders,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error('Tidak dapat terhubung ke API. Pastikan backend berjalan lalu coba lagi.');
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = Array.isArray(data?.message) ? data.message.join(' ') : data?.message;
      const error = new Error(message || `Permintaan gagal (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function getCheckoutIdempotencyKey(body) {
    const payload = JSON.stringify(body);
    try {
      const saved = JSON.parse(sessionStorage.getItem(checkoutRequestStorageKey) || 'null');
      if (saved?.payload === payload && typeof saved.key === 'string') return saved.key;
      const key = crypto.randomUUID();
      sessionStorage.setItem(checkoutRequestStorageKey, JSON.stringify({ key, payload }));
      return key;
    } catch {
      throw new Error('Sesi browser tidak dapat menyimpan kunci checkout. Aktifkan penyimpanan sesi lalu coba lagi.');
    }
  }

  function normalizeFavoriteIds(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))];
  }

  async function syncAccountFavorites(token, guestFavoriteIds = [], notifyOnFailure = false) {
    const accountStorageKey = currentFavoritesStorageKey();
    const availableProducts = new Set(products.map((product) => Number(product.id)));
    const guestIds = normalizeFavoriteIds(guestFavoriteIds);
    const localIds = new Set([
      ...[...readFavorites(accountStorageKey)].map(Number),
      ...[...favorites].map(Number),
      ...guestIds,
    ].filter((id) => availableProducts.has(id)));
    let remoteIds = [];

    try {
      const response = await fetch(favoritesUrl, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray(data?.message) ? data.message.join(' ') : data?.message;
        throw new Error(message || `Permintaan gagal (${response.status}).`);
      }
      remoteIds = normalizeFavoriteIds(data?.productIds);
      const mergedIds = [...new Set([...localIds, ...remoteIds])]
        .filter((id) => availableProducts.has(id));
      const synced = await sendJson(`${favoritesUrl}/sync`, { productIds: mergedIds }, token);
      favorites = new Set(normalizeFavoriteIds(synced?.productIds).map(String));
      try {
        localStorage.setItem(accountStorageKey, JSON.stringify([...favorites]));
        if (guestIds.length) localStorage.removeItem(guestFavoritesStorageKey);
      } catch { /* The account remains the source of truth if browser storage is unavailable. */ }
      renderProducts();
      return true;
    } catch {
      favorites = new Set([...localIds, ...remoteIds].map(String));
      try {
        localStorage.setItem(accountStorageKey, JSON.stringify([...favorites]));
        if (guestIds.length) localStorage.removeItem(guestFavoritesStorageKey);
      } catch { /* Keep the merged favorites in memory for this session. */ }
      renderProducts();
      if (notifyOnFailure) showToast('Favorit tersimpan di perangkat, tetapi belum tersinkron ke akun.');
      return false;
    }
  }

  function queueFavoriteWrite(token, productId, isFavorite) {
    favoriteWriteQueue = favoriteWriteQueue.catch(() => {}).then(async () => {
      let response;
      try {
        response = await fetch(`${favoritesUrl}/${productId}`, {
          method: isFavorite ? 'POST' : 'DELETE',
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });
      } catch {
        throw new Error('Tidak dapat terhubung ke API.');
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray(data?.message) ? data.message.join(' ') : data?.message;
        throw new Error(message || `Permintaan gagal (${response.status}).`);
      }
    }).catch(() => {
      showToast('Favorit tersimpan di browser, tetapi belum tersinkron ke akun.');
    });
  }

  function setAuthMode(mode) {
    authMode = mode;
    const registering = mode === 'register';
    const nameInput = elements.customerNameField.querySelector('input');
    elements.customerNameField.hidden = !registering;
    nameInput.disabled = !registering;
    nameInput.required = registering;
    elements.customerAuthForm.elements.password.autocomplete = registering ? 'new-password' : 'current-password';
    elements.customerAuthForm.elements.password.placeholder = registering
      ? 'Buat kata sandi akun'
      : 'Masukkan kata sandi akun';
    elements.customerPasswordHint.textContent = registering
      ? 'Gunakan minimal 8 karakter.'
      : 'Gunakan kata sandi yang kamu pakai saat mendaftar.';
    elements.customerAuthSubmit.textContent = registering
      ? (checkoutIntent === 'orders' ? 'Daftar dan lihat pesanan' : 'Buat akun dan lanjutkan')
      : (checkoutIntent === 'orders' ? 'Masuk ke akun' : 'Masuk dan lanjutkan');
    elements.checkoutEyebrow.textContent = checkoutIntent === 'orders' ? 'AKUN PELANGGAN' : 'LANGKAH 1 DARI 2';
    elements.checkoutTitle.textContent = checkoutIntent === 'orders'
      ? registering ? 'Buat akun pelanggan' : 'Masuk ke akun'
      : 'Masuk untuk checkout';
    elements.customerAuthStep.querySelector('.customer-auth-intro').textContent = checkoutIntent === 'orders'
      ? registering
        ? 'Belum punya akun? Isi nama, email, dan kata sandi untuk mulai menyimpan serta melacak pesananmu.'
        : 'Masuk dengan akun pelanggan untuk melihat status dan riwayat pesananmu.'
      : 'Pesananmu akan tersimpan di akun supaya mudah dilacak.';
    document.querySelectorAll('[data-auth-mode]').forEach((button) => {
      const active = button.dataset.authMode === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    setCheckoutMessage(elements.customerAuthMessage);
  }

  function showCustomerAuth(message = '') {
    stopCustomerOrdersAutoRefresh();
    elements.checkoutDialog.classList.remove('order-history-open');
    elements.checkoutDialog.classList.add('customer-auth-open');
    setAuthMode('login');
    elements.customerAuthStep.hidden = false;
    elements.shippingForm.hidden = true;
    elements.orderSuccessStep.hidden = true;
    elements.orderHistoryStep.hidden = true;
    elements.checkoutEyebrow.textContent = checkoutIntent === 'orders' ? 'AKUN PELANGGAN' : 'LANGKAH 1 DARI 2';
    elements.checkoutTitle.textContent = checkoutIntent === 'orders' ? 'Masuk ke akun' : 'Masuk untuk checkout';
    elements.customerAuthStep.querySelector('.customer-auth-intro').textContent = checkoutIntent === 'orders'
      ? 'Masuk dengan akun pelanggan untuk melihat status dan riwayat pesananmu.'
      : 'Pesananmu akan tersimpan di akun supaya mudah dilacak.';
    setCheckoutMessage(elements.customerAuthMessage, message);
    setCheckoutMessage(elements.shippingMessage);
  }

  function showShippingForm() {
    stopCustomerOrdersAutoRefresh();
    elements.checkoutDialog.classList.remove('order-history-open');
    elements.checkoutDialog.classList.remove('customer-auth-open');
    elements.customerAuthStep.hidden = true;
    elements.shippingForm.hidden = false;
    elements.orderSuccessStep.hidden = true;
    elements.orderHistoryStep.hidden = true;
    elements.checkoutEyebrow.textContent = 'LANGKAH 2 DARI 2';
    elements.checkoutTitle.textContent = 'Alamat pengiriman';
    elements.customerIdentity.textContent = customerUser?.email || 'akun pelanggan';
    const nameInput = elements.shippingForm.elements.shippingName;
    if (!nameInput.value) nameInput.value = customerUser?.shippingName || customerUser?.name || '';
    if (!elements.shippingForm.elements.shippingPhone.value) {
      elements.shippingForm.elements.shippingPhone.value = customerUser?.shippingPhone || '';
    }
    if (!elements.shippingForm.elements.shippingAddress.value) {
      elements.shippingForm.elements.shippingAddress.value = customerUser?.shippingAddress || '';
    }
    const subtotal = cartEntries().reduce((sum, entry) => sum + Number(entry.product.price) * entry.quantity, 0);
    elements.checkoutSubtotal.textContent = formatPrice(subtotal);
    elements.checkoutShippingFee.textContent = formatPrice(shippingFee ?? 0);
    elements.checkoutTotal.textContent = formatPrice(subtotal + (shippingFee ?? 0));
    updatePaymentHint();
    setCheckoutMessage(elements.shippingMessage);
  }

  function updatePaymentHint() {
    if (elements.paymentMethod.value === 'CASH_ON_DELIVERY') {
      elements.paymentMethodHint.textContent = 'Bayar pesanan saat barang diterima. Admin akan mencatat pembayaran setelah konfirmasi.';
      return;
    }

    const transferAmount = cartEntries().reduce((sum, entry) => sum + Number(entry.product.price) * entry.quantity, 0)
      + (shippingFee ?? 0);
    elements.paymentMethodHint.textContent = bankTransfer
      ? `Transfer ${formatPrice(transferAmount)} ke ${bankTransfer.bankName}, nomor rekening ${bankTransfer.accountNumber}, atas nama ${bankTransfer.accountName}. Pesanan diproses setelah admin mengonfirmasi pembayaran.`
      : 'Untuk transfer bank, hubungi admin toko untuk instruksi. Pesanan diproses setelah admin mengonfirmasi pembayaran.';
  }

  function openCheckout() {
    if (cartEntries().length === 0 || shippingFee === null) {
      showToast('Tambahkan produk yang tersedia sebelum checkout.');
      return;
    }
    checkoutIntent = 'checkout';
    setCartOpen(false);
    elements.customerAuthForm.reset();
    elements.shippingForm.reset();
    setAuthMode('login');
    if (customerToken && customerUser?.role === 'CUSTOMER') showShippingForm();
    else {
      clearCustomerSession();
      showCustomerAuth();
    }
    elements.checkoutDialog.showModal();
  }

  async function authenticateCustomer(event) {
    event.preventDefault();
    setCheckoutMessage(elements.customerAuthMessage);
    const submit = elements.customerAuthSubmit;
    submit.disabled = true;
    const form = elements.customerAuthForm.elements;
    const body = {
      email: form.email.value.trim(),
      password: form.password.value,
    };
    if (authMode === 'register') body.name = form.name.value.trim();

    try {
      const endpoint = authMode === 'register' ? '/api/v1/auth/register' : '/api/v1/auth/login';
      const result = await sendJson(endpoint, body);
      if (result?.user?.role !== 'CUSTOMER') {
        throw new Error('Checkout hanya tersedia untuk akun pelanggan. Silakan gunakan akun pelanggan.');
      }
      const guestFavoriteIds = [...favorites];
      customerToken = result.accessToken;
      customerUser = result.user;
      sessionStorage.setItem(customerTokenKey, customerToken);
      sessionStorage.setItem(customerUserKey, JSON.stringify(customerUser));
      await syncAccountFavorites(customerToken, guestFavoriteIds, true);
      elements.customerAuthForm.reset();
      setAuthMode('login');
      if (checkoutIntent === 'orders') {
        await loadCustomerOrders();
        return;
      }
      elements.shippingForm.reset();
      showShippingForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const status = error instanceof Error ? error.status : undefined;
      const authErrorMessage = status === 401
        ? 'Email atau kata sandi tidak sesuai. Periksa kembali, atau buat akun jika belum terdaftar.'
        : status === 409
          ? 'Email ini sudah terdaftar. Silakan masuk dengan akun tersebut.'
          : status === 429
            ? 'Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.'
            : status === 400
              ? 'Data akun belum sesuai. Periksa kembali email dan kata sandi yang dimasukkan.'
              : message === 'Tidak dapat terhubung ke API. Pastikan backend berjalan lalu coba lagi.'
                ? message
                : message.startsWith('Checkout hanya tersedia untuk akun pelanggan.')
                  ? message
                  : 'Akun belum dapat diverifikasi. Coba lagi beberapa saat.';
      setCheckoutMessage(elements.customerAuthMessage, authErrorMessage);
    } finally {
      submit.disabled = false;
    }
  }

  async function placeOrder(event) {
    event.preventDefault();
    setCheckoutMessage(elements.shippingMessage);
    const entries = cartEntries();
    if (!entries.length) {
      setCheckoutMessage(elements.shippingMessage, 'Keranjangmu kosong. Tambahkan produk sebelum membuat pesanan.');
      return;
    }
    const form = elements.shippingForm.elements;
    const body = {
      items: entries.map(({ product, quantity }) => ({ productId: Number(product.id), quantity })),
      paymentMethod: form.paymentMethod.value,
      shippingName: form.shippingName.value.trim(),
      shippingPhone: form.shippingPhone.value.trim(),
      shippingAddress: form.shippingAddress.value.trim(),
      notes: form.notes.value.trim() || null,
    };
    const submit = elements.placeOrderButton;
    submit.disabled = true;
    submit.textContent = 'Menyimpan pesanan...';

    try {
      const idempotencyKey = getCheckoutIdempotencyKey(body);
      const order = await sendJson(ordersUrl, body, customerToken, 'POST', {
        'Idempotency-Key': idempotencyKey,
      });
      sessionStorage.removeItem(checkoutRequestStorageKey);
      customerUser = {
        ...customerUser,
        shippingName: body.shippingName,
        shippingPhone: body.shippingPhone,
        shippingAddress: body.shippingAddress,
      };
      sessionStorage.setItem(customerUserKey, JSON.stringify(customerUser));
      cart = {};
      try { localStorage.setItem(cartStorageKey, '{}'); } catch { /* Keep the in-memory cart cleared. */ }
      renderProducts();
      renderCart();
      await loadStore();
      elements.customerAuthStep.hidden = true;
      elements.shippingForm.hidden = true;
      elements.orderSuccessStep.hidden = false;
      elements.checkoutDialog.classList.remove('order-history-open');
      elements.checkoutDialog.classList.remove('customer-auth-open');
      elements.checkoutEyebrow.textContent = 'PESANAN TERCATAT';
      elements.checkoutTitle.textContent = 'Pesanan berhasil dibuat';
      const paymentMessage = order.paymentMethod === 'CASH_ON_DELIVERY'
        ? 'Pembayaran dilakukan saat barang diterima.'
        : bankTransfer
          ? `Silakan transfer ke ${bankTransfer.bankName}, nomor rekening ${bankTransfer.accountNumber}, atas nama ${bankTransfer.accountName}. Pesanan diproses setelah pembayaran dikonfirmasi admin.`
          : 'Hubungi admin toko untuk instruksi transfer; pesanan diproses setelah pembayaran dikonfirmasi.';
      elements.orderSuccessCopy.textContent = `Pesanan #${order.id} tercatat. Subtotal produk ${formatPrice(order.subtotal)}, ongkos kirim ${formatPrice(order.shippingFee)}, total ${formatPrice(order.total)}. ${paymentMessage}`;
      elements.finishCheckout.focus();
    } catch (error) {
      if (error.status === 401) {
        customerToken = '';
        customerUser = null;
        sessionStorage.removeItem(customerTokenKey);
        sessionStorage.removeItem(customerUserKey);
        showCustomerAuth('Sesi berakhir. Masuk kembali untuk melanjutkan checkout.');
      } else {
        setCheckoutMessage(elements.shippingMessage, error.message || 'Pesanan belum dapat dibuat.');
        if (/stock|stok/i.test(error.message || '')) await loadStore();
      }
    } finally {
      submit.disabled = false;
      submit.textContent = 'Buat pesanan';
    }
  }

  async function loadStore() {
    showCatalogMessage('Memuat koleksi pilihan...', { loading: true });
    try {
      const [productResponse, categoryResponse, storeConfigResponse] = await Promise.all([
        fetch(productsUrl, { headers: { Accept: 'application/json' } }),
        fetch(categoriesUrl, { headers: { Accept: 'application/json' } }),
        fetch(storeConfigUrl, { headers: { Accept: 'application/json' } }),
      ]);

      if (!productResponse.ok) throw new Error('Produk belum bisa dimuat dari API.');
      if (!storeConfigResponse.ok) throw new Error('Tarif pengiriman belum bisa dimuat dari API.');
      const productData = await productResponse.json();
      const categoryData = categoryResponse.ok ? await categoryResponse.json() : [];
      const storeConfig = await storeConfigResponse.json();
      const configuredShippingFee = Number(storeConfig?.shippingFee);
      if (!Array.isArray(productData)) throw new Error('Format data produk dari API tidak sesuai.');
      if (!Number.isSafeInteger(configuredShippingFee) || configuredShippingFee < 0) {
        throw new Error('Format tarif pengiriman dari API tidak sesuai.');
      }
      const configuredBankTransfer = storeConfig?.bankTransfer ?? null;
      if (configuredBankTransfer !== null && (
        typeof configuredBankTransfer !== 'object'
        || typeof configuredBankTransfer.bankName !== 'string'
        || !configuredBankTransfer.bankName.trim()
        || typeof configuredBankTransfer.accountName !== 'string'
        || !configuredBankTransfer.accountName.trim()
        || typeof configuredBankTransfer.accountNumber !== 'string'
        || !configuredBankTransfer.accountNumber.trim()
      )) {
        throw new Error('Format instruksi transfer bank dari API tidak sesuai.');
      }

      products = productData;
      recentlyViewedProductIds = recentlyViewedProductIds.filter((id) =>
        products.some((product) => String(product.id) === id));
      categories = Array.isArray(categoryData) ? categoryData : [];
      shippingFee = configuredShippingFee;
      bankTransfer = configuredBankTransfer;
      if (customerToken && customerUser?.role === 'CUSTOMER') {
        await syncAccountFavorites(customerToken);
      }
      reconcileCartWithCatalog();
      renderProducts();
      renderRecentlyViewedProducts();
      renderCart();
      const sharedProductId = new URL(window.location.href).searchParams.get('product');
      if (sharedProductId && /^\d+$/.test(sharedProductId)) {
        const sharedProduct = products.find((product) => String(product.id) === sharedProductId);
        if (sharedProduct) openProductDetails(Number(sharedProduct.id));
        else {
          updateProductUrl();
          showToast('Produk dari tautan ini sudah tidak tersedia.');
        }
      }
    } catch (error) {
      const message = error instanceof TypeError
        ? 'Tidak dapat terhubung ke API. Pastikan backend berjalan lalu coba lagi.'
        : error.message || 'Koleksi produk belum dapat dimuat.';
      showCatalogMessage(message, { retry: true });
    }
  }

  function clearCustomerSession() {
    customerToken = '';
    customerUser = null;
    sessionStorage.removeItem(customerTokenKey);
    sessionStorage.removeItem(customerUserKey);
    favorites = readFavorites(guestFavoritesStorageKey);
    renderProducts();
  }

  function showOrderHistory() {
    elements.checkoutDialog.classList.add('order-history-open');
    elements.checkoutDialog.classList.remove('customer-auth-open');
    elements.customerAuthStep.hidden = true;
    elements.shippingForm.hidden = true;
    elements.orderSuccessStep.hidden = true;
    elements.orderHistoryStep.hidden = false;
    elements.checkoutEyebrow.textContent = 'AKUN PELANGGAN';
    elements.checkoutTitle.textContent = 'Pesanan saya';
    elements.orderHistoryIdentity.textContent = customerUser?.email || 'akun pelanggan';
    elements.orderRefreshStatus.textContent = '';
    if (customerOrdersRefreshTimer === null) {
      customerOrdersRefreshTimer = window.setInterval(() => {
        if (
          document.visibilityState === 'visible'
          && elements.checkoutDialog.open
          && !elements.orderHistoryStep.hidden
        ) {
          void refreshCustomerOrders();
        }
      }, 45_000);
    }
    elements.savedShippingForm.hidden = true;
    elements.editSavedAddress.setAttribute('aria-expanded', 'false');
    elements.savedShippingForm.elements.shippingName.value = customerUser?.shippingName || '';
    elements.savedShippingForm.elements.shippingPhone.value = customerUser?.shippingPhone || '';
    elements.savedShippingForm.elements.shippingAddress.value = customerUser?.shippingAddress || '';
    setCheckoutMessage(elements.savedShippingMessage);
  }

  function stopCustomerOrdersAutoRefresh() {
    if (customerOrdersRefreshTimer !== null) {
      window.clearInterval(customerOrdersRefreshTimer);
      customerOrdersRefreshTimer = null;
    }
  }

  async function saveCustomerShippingAddress(event) {
    event.preventDefault();
    setCheckoutMessage(elements.savedShippingMessage);
    const form = elements.savedShippingForm.elements;
    const submit = elements.saveShippingAddress;
    submit.disabled = true;
    submit.textContent = 'Menyimpan alamat...';
    try {
      const updatedUser = await sendJson('/api/v1/auth/shipping-address', {
        shippingName: form.shippingName.value.trim(),
        shippingPhone: form.shippingPhone.value.trim(),
        shippingAddress: form.shippingAddress.value.trim(),
      }, customerToken, 'PATCH');
      customerUser = { ...customerUser, ...updatedUser };
      sessionStorage.setItem(customerUserKey, JSON.stringify(customerUser));
      setCheckoutMessage(elements.savedShippingMessage, 'Alamat tersimpan dan akan digunakan pada checkout berikutnya.');
      showToast('Alamat pengiriman berhasil disimpan.');
    } catch (error) {
      if (error.status === 401) {
        clearCustomerSession();
        showCustomerAuth('Sesi berakhir. Masuk kembali untuk mengubah alamat.');
      } else {
        setCheckoutMessage(elements.savedShippingMessage, error.message || 'Alamat belum dapat disimpan.');
      }
    } finally {
      submit.disabled = false;
      submit.textContent = 'Simpan alamat';
    }
  }

  function formatOrderDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Tanggal tidak tersedia';
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  function orderDateInputValue(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function openCustomerInvoice(order) {
    const orderId = Number(order.id);
    const methodLabels = { BANK_TRANSFER: 'Transfer bank', CASH_ON_DELIVERY: 'COD' };
    const orderStatusLabels = {
      PENDING: 'Menunggu diproses',
      PROCESSING: 'Sedang disiapkan',
      SHIPPED: 'Dalam pengiriman',
      DELIVERED: 'Selesai',
      CANCELLED: 'Dibatalkan',
    };
    const paymentStatusLabels = {
      PENDING: order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Bayar saat diterima' : 'Menunggu pembayaran',
      PAID: 'Lunas',
      FAILED: 'Transfer belum terverifikasi',
      REFUNDED: 'Dana dikembalikan',
    };
    const itemsMarkup = (Array.isArray(order.items) ? order.items : []).map((item) => `
      <tr>
        <td>${escapeHtml(item.productName)}</td>
        <td>${Number(item.quantity) || 0}</td>
        <td>${escapeHtml(formatPrice(item.unitPrice))}</td>
        <td>${escapeHtml(formatPrice(item.lineTotal))}</td>
      </tr>
    `).join('');
    const transferMarkup = order.paymentMethod === 'BANK_TRANSFER'
      && ['PENDING', 'FAILED'].includes(order.paymentStatus)
      && bankTransfer
      ? `<section class="transfer"><strong>Instruksi transfer</strong><span>${escapeHtml(bankTransfer.bankName)} · ${escapeHtml(bankTransfer.accountNumber)}</span><small>Transfer ${escapeHtml(formatPrice(order.total))} atas nama ${escapeHtml(bankTransfer.accountName)}.</small></section>`
      : '';
    const shippingMarkup = order.shippingCarrier || order.trackingNumber || order.shippedAt
      ? `<section class="shipping"><h2>Informasi pengiriman</h2>${order.shippingCarrier ? `<p><span>Kurir</span><strong>${escapeHtml(order.shippingCarrier)}</strong></p>` : ''}${order.trackingNumber ? `<p><span>Nomor resi</span><strong>${escapeHtml(order.trackingNumber)}</strong></p>` : ''}${order.shippedAt ? `<p><span>Tanggal dikirim</span><strong>${escapeHtml(formatOrderDate(order.shippedAt))}</strong></p>` : ''}</section>`
      : '';
    const notesMarkup = typeof order.notes === 'string' && order.notes.trim()
      ? `<section class="order-notes"><h2>Catatan pesanan</h2><p>${escapeHtml(order.notes)}</p></section>`
      : '';
    const invoiceHtml = `<!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Invoice ShopSphere #${escapeHtml(orderId)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 36px; color: #293b30; font: 14px/1.5 Arial, sans-serif; background: #f4f5f1; }
            .invoice { max-width: 820px; margin: 0 auto; padding: 42px; background: #fff; }
            .toolbar { display: flex; justify-content: flex-end; margin-bottom: 24px; }
            button { padding: 10px 16px; border: 0; border-radius: 6px; color: #fff; background: #365b42; cursor: pointer; font: inherit; }
            header { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 24px; border-bottom: 2px solid #e8ece5; }
            .brand { color: #31533b; font-size: 24px; font-weight: 700; letter-spacing: -.04em; }
            h1 { margin: 0; font-size: 24px; text-align: right; }
            header p, header time { color: #79847b; }
            header p { margin: 3px 0 0; }
            header time { display: block; margin-top: 6px; text-align: right; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 28px 0; }
            .details h2, .transfer strong { display: block; margin: 0 0 7px; color: #788379; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
            .details p { margin: 2px 0; overflow-wrap: anywhere; }
            .status { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 14px; color: #69776d; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 11px 8px; border-bottom: 1px solid #e8ece5; text-align: left; }
            th { color: #788379; font-size: 11px; font-weight: 600; }
            td:nth-child(n+2), th:nth-child(n+2) { text-align: right; white-space: nowrap; }
            .totals { width: min(320px, 100%); margin: 18px 0 0 auto; }
            .totals p { display: flex; justify-content: space-between; gap: 16px; margin: 7px 0; color: #69776d; }
            .totals .grand { padding-top: 10px; border-top: 1px solid #dfe6dc; color: #293b30; font-size: 17px; font-weight: 700; }
            .transfer { display: grid; gap: 4px; margin-top: 26px; padding: 14px; border: 1px solid #eadfc6; border-radius: 7px; background: #fcf8ef; }
            .transfer strong { margin: 0; color: #8e7951; }
            .transfer span { font-weight: 700; overflow-wrap: anywhere; }
            .transfer small, footer { color: #879188; }
            .shipping { display: grid; gap: 6px; margin-top: 26px; padding: 14px; border: 1px solid #e6ede1; border-radius: 7px; background: #f7faf4; }
            .shipping h2 { margin: 0; color: #788379; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
            .shipping p { display: flex; justify-content: space-between; gap: 12px; margin: 0; }
            .shipping p span { color: #79847b; }
            .shipping p strong { overflow-wrap: anywhere; text-align: right; }
            .order-notes { margin-top: 18px; padding: 14px; border: 1px solid #e8ece5; border-radius: 7px; }
            .order-notes h2 { margin: 0 0 6px; color: #788379; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
            .order-notes p { margin: 0; color: #526257; white-space: pre-wrap; overflow-wrap: anywhere; }
            footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e8ece5; font-size: 11px; }
            @media (max-width: 600px) { body { padding: 12px; } .invoice { padding: 22px 16px; } .details { gap: 16px; } }
            @media print { body { padding: 0; background: #fff; } .invoice { max-width: none; padding: 0; } .toolbar { display: none; } }
          </style>
        </head>
        <body>
          <main class="invoice">
            <div class="toolbar"><button id="printInvoice" type="button">Cetak / Simpan PDF</button></div>
            <header>
              <div><div class="brand">ShopSphere</div><p>Invoice pesanan</p></div>
              <div><h1>#${escapeHtml(orderId)}</h1><time>${escapeHtml(formatOrderDate(order.createdAt))}</time></div>
            </header>
            <section class="details">
              <div><h2>Pelanggan</h2><p>${escapeHtml(customerUser?.name || order.shippingName || 'Nama tidak tersedia')}</p><p>${escapeHtml(customerUser?.email || '')}</p></div>
              <div><h2>Tujuan pengiriman</h2><p>${escapeHtml(order.shippingName || 'Penerima tidak tersedia')}</p><p>${escapeHtml(order.shippingPhone || 'Nomor telepon tidak tersedia')}</p><p>${escapeHtml(order.shippingAddress || 'Alamat tidak tersedia')}</p></div>
            </section>
            <div class="status"><span>${escapeHtml(methodLabels[order.paymentMethod] || order.paymentMethod)}</span><span>${escapeHtml(paymentStatusLabels[order.paymentStatus] || order.paymentStatus)} · ${escapeHtml(orderStatusLabels[order.status] || order.status)}</span></div>
            <table><thead><tr><th>Produk</th><th>Jumlah</th><th>Harga satuan</th><th>Total</th></tr></thead><tbody>${itemsMarkup}</tbody></table>
            <section class="totals">
              <p><span>Subtotal produk</span><strong>${escapeHtml(formatPrice(order.subtotal ?? order.total))}</strong></p>
              <p><span>Ongkos kirim</span><strong>${escapeHtml(formatPrice(order.shippingFee ?? 0))}</strong></p>
              <p class="grand"><span>Total</span><strong>${escapeHtml(formatPrice(order.total))}</strong></p>
            </section>
            ${transferMarkup}
            ${shippingMarkup}
            ${notesMarkup}
            <footer>Invoice ini dibuat dari toko ShopSphere. Simpan invoice ini sebagai referensi pesanan.</footer>
          </main>
          <script>document.getElementById('printInvoice').addEventListener('click', () => window.print());</script>
        </body>
      </html>`;
    const invoiceUrl = URL.createObjectURL(new Blob([invoiceHtml], { type: 'text/html;charset=utf-8' }));
    const invoiceWindow = window.open(invoiceUrl, '_blank');
    if (!invoiceWindow) {
      URL.revokeObjectURL(invoiceUrl);
      showToast('Izinkan pop-up browser untuk membuka invoice.');
      return;
    }
    invoiceWindow.opener = null;
    window.setTimeout(() => URL.revokeObjectURL(invoiceUrl), 60_000);
  }

  // =========================================================
  // CUSTOMER ORDER OVERVIEW
  // Ringkasan statistik pesanan pelanggan
  // =========================================================

  function renderCustomerOrderOverview(orders) {
    const host = elements.orderHistoryStep;

    if (!host) return;

    let overview = host.querySelector('#customerOrderOverview');

    // Buat container ringkasan jika belum tersedia.
    if (!overview) {
      overview = document.createElement('section');
      overview.id = 'customerOrderOverview';
      overview.className = 'customer-order-overview';
      overview.setAttribute('aria-label', 'Ringkasan pesanan');

      const anchor =
        elements.orderHistoryFilter ||
        elements.orderHistoryList;

      host.insertBefore(
        overview,
        anchor || host.firstChild
      );
    }

    const safeOrders = Array.isArray(orders)
      ? orders
      : [];

    // Hitung statistik pesanan.
    const inProgress = safeOrders.filter((order) =>
      ['PENDING', 'PROCESSING', 'SHIPPED'].includes(
        order.status
      )
    ).length;

    const completed = safeOrders.filter(
      (order) => order.status === 'DELIVERED'
    ).length;

    const cancelled = safeOrders.filter(
      (order) => order.status === 'CANCELLED'
    ).length;

    // Pesanan yang dibatalkan tidak masuk ke nilai transaksi.
    const totalValue = safeOrders
      .filter((order) => order.status !== 'CANCELLED')
      .reduce((sum, order) => {
        const total = Number(order.total);

        return sum + (
          Number.isFinite(total) ? total : 0
        );
      }, 0);

    const cards = [
      {
        label: 'Total pesanan',
        value: String(safeOrders.length),
        note: 'Semua riwayat pesanan',
      },
      {
        label: 'Dalam proses',
        value: String(inProgress),
        note: 'Menunggu hingga dikirim',
      },
      {
        label: 'Selesai',
        value: String(completed),
        note: cancelled
          ? `${cancelled} pesanan dibatalkan`
          : 'Pesanan telah diterima',
      },
      {
        label: 'Nilai pesanan',
        value: formatPrice(totalValue),
        note: 'Tidak termasuk pembatalan',
      },
    ];

    // Gunakan textContent agar teks tidak ditafsirkan sebagai HTML.
    overview.replaceChildren(
      ...cards.map((card, index) => {
        const item = document.createElement('article');

        item.className =
          `customer-order-overview-card customer-order-overview-card-${index + 1}`;

        const label = document.createElement('span');
        label.className = 'customer-order-overview-label';
        label.textContent = card.label;

        const value = document.createElement('strong');
        value.className = 'customer-order-overview-value';
        value.textContent = card.value;

        const note = document.createElement('small');
        note.textContent = card.note;

        item.append(label, value, note);

        return item;
      })
    );
  }

  function renderCustomerOrders(orders) {
    elements.orderHistoryList.setAttribute('aria-busy', 'false');
    customerOrders = Array.isArray(orders) ? orders : [];
    renderCustomerOrderOverview(customerOrders);
    visibleCustomerOrders = [];
    elements.exportCustomerOrders.disabled = true;
    elements.orderHistoryFilter.hidden = customerOrders.length === 0;
    if (customerOrders.length === 0) {
      customerOrdersPage = 1;
      elements.customerOrderCount.textContent = '';
      elements.orderHistoryList.innerHTML = `
        <div class="order-history-empty">
          <span aria-hidden="true">▤</span>
          <strong>Belum ada pesanan</strong>
          <p>Pesanan yang kamu buat akan muncul di sini.</p>
          <button class="button button-dark" type="button" data-order-browse>Mulai belanja</button>
        </div>
      `;
      return;
    }

    const statusLabels = {
      PENDING: 'Menunggu diproses',
      PROCESSING: 'Sedang disiapkan',
      SHIPPED: 'Dalam pengiriman',
      DELIVERED: 'Selesai',
      CANCELLED: 'Dibatalkan',
    };
    const paymentMethodLabels = {
      BANK_TRANSFER: 'Transfer bank',
      CASH_ON_DELIVERY: 'COD',
    };
    const paymentStatusLabels = {
      PENDING: 'Menunggu pembayaran',
      PAID: 'Lunas',
      FAILED: 'Transfer belum terverifikasi',
      REFUNDED: 'Dana dikembalikan',
    };
    const invalidCustomerOrderDateRange = Boolean(
      customerOrderDateFrom
      && customerOrderDateTo
      && customerOrderDateFrom > customerOrderDateTo,
    );
    const visibleOrders = customerOrders.filter((order) => {
      if (invalidCustomerOrderDateRange) return false;
      if (activeCustomerOrderStatus !== 'ALL' && order.status !== activeCustomerOrderStatus) {
        return false;
      }
      if (
        activeCustomerOrderPaymentMethod !== 'ALL'
        && order.paymentMethod !== activeCustomerOrderPaymentMethod
      ) {
        return false;
      }
      if (
        activeCustomerOrderPaymentStatus !== 'ALL'
        && order.paymentStatus !== activeCustomerOrderPaymentStatus
      ) {
        return false;
      }
      const orderDate = orderDateInputValue(order.createdAt);
      if (customerOrderDateFrom && (!orderDate || orderDate < customerOrderDateFrom)) {
        return false;
      }
      if (customerOrderDateTo && (!orderDate || orderDate > customerOrderDateTo)) {
        return false;
      }
      if (!customerOrderSearchTerm) return true;
      const searchableText = [
        order.id,
        `#${order.id}`,
        order.trackingNumber,
        order.shippingCarrier,
        order.shippingName,
        order.shippingPhone,
        order.shippingAddress,
        order.notes,
        order.status,
        statusLabels[order.status],
        order.paymentMethod,
        paymentMethodLabels[order.paymentMethod],
        order.paymentStatus,
        paymentStatusLabels[order.paymentStatus],
        order.paymentMethod === 'CASH_ON_DELIVERY' && order.paymentStatus === 'PENDING'
          ? 'Bayar saat diterima'
          : '',
        ...(Array.isArray(order.items) ? order.items.map((item) => item.productName) : []),
      ].join(' ').toLocaleLowerCase('id');
      return searchableText.includes(customerOrderSearchTerm);
    });
    const sortDirection = customerOrderSort === 'oldest' ? 1 : -1;
    visibleOrders.sort((left, right) => {
      const leftTime = Date.parse(left.createdAt);
      const rightTime = Date.parse(right.createdAt);
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
        return (leftTime - rightTime) * sortDirection;
      }
      return (Number(left.id) - Number(right.id)) * sortDirection;
    });
    visibleCustomerOrders = visibleOrders;
    elements.exportCustomerOrders.disabled = visibleCustomerOrders.length === 0;
    const pageCount = Math.ceil(visibleOrders.length / customerOrdersPerPage);
    customerOrdersPage = Math.min(customerOrdersPage, Math.max(pageCount, 1));
    elements.customerOrderStatusFilter.value = activeCustomerOrderStatus;
    elements.customerOrderPaymentFilter.value = activeCustomerOrderPaymentMethod;
    elements.customerOrderPaymentStatusFilter.value = activeCustomerOrderPaymentStatus;
    elements.customerOrderSort.value = customerOrderSort;
    elements.customerOrderDateFrom.value = customerOrderDateFrom;
    elements.customerOrderDateTo.value = customerOrderDateTo;
    elements.customerOrderDateFrom.setAttribute('aria-invalid', String(invalidCustomerOrderDateRange));
    elements.customerOrderDateTo.setAttribute('aria-invalid', String(invalidCustomerOrderDateRange));
    elements.customerOrderCount.setAttribute('aria-invalid', String(invalidCustomerOrderDateRange));
    const presetToday = new Date();
    const presetEndDate = orderDateInputValue(presetToday);
    const previousMonthStart = new Date(presetToday.getFullYear(), presetToday.getMonth() - 1, 1);
    const previousMonthEnd = new Date(presetToday.getFullYear(), presetToday.getMonth(), 0);
    const currentQuarterMonth = Math.floor(presetToday.getMonth() / 3) * 3;
    const previousQuarterStart = new Date(presetToday.getFullYear(), currentQuarterMonth - 3, 1);
    const previousQuarterEnd = new Date(presetToday.getFullYear(), currentQuarterMonth, 0);
    elements.orderHistoryFilter.querySelectorAll('[data-order-date-preset]').forEach((button) => {
      let isActive = false;
      if (button.dataset.orderDatePreset === 'yesterday') {
        const yesterday = new Date(presetToday);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayValue = orderDateInputValue(yesterday);
        isActive = !invalidCustomerOrderDateRange
          && customerOrderDateFrom === yesterdayValue
          && customerOrderDateTo === yesterdayValue;
      } else if (button.dataset.orderDatePreset === 'all') {
        isActive = !customerOrderDateFrom && !customerOrderDateTo;
      } else if (button.dataset.orderDatePreset === 'year') {
        const yearStart = new Date(presetToday.getFullYear(), 0, 1);
        isActive = !invalidCustomerOrderDateRange
          && customerOrderDateTo === presetEndDate
          && customerOrderDateFrom === orderDateInputValue(yearStart);
      } else if (button.dataset.orderDatePreset === 'quarter') {
        const quarterStart = new Date(presetToday.getFullYear(), currentQuarterMonth, 1);
        isActive = !invalidCustomerOrderDateRange
          && customerOrderDateTo === presetEndDate
          && customerOrderDateFrom === orderDateInputValue(quarterStart);
      } else if (button.dataset.orderDatePreset === 'previous-quarter') {
        isActive = !invalidCustomerOrderDateRange
          && customerOrderDateFrom === orderDateInputValue(previousQuarterStart)
          && customerOrderDateTo === orderDateInputValue(previousQuarterEnd);
      } else if (button.dataset.orderDatePreset === 'week') {
        const weekStart = new Date(presetToday);
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
        isActive = !invalidCustomerOrderDateRange
          && customerOrderDateTo === presetEndDate
          && customerOrderDateFrom === orderDateInputValue(weekStart);
      } else if (button.dataset.orderDatePreset === 'previous-week') {
        const previousWeekEnd = new Date(presetToday);
        previousWeekEnd.setDate(previousWeekEnd.getDate() - ((previousWeekEnd.getDay() + 6) % 7) - 1);
        const previousWeekStart = new Date(previousWeekEnd);
        previousWeekStart.setDate(previousWeekStart.getDate() - 6);
        isActive = !invalidCustomerOrderDateRange
          && customerOrderDateFrom === orderDateInputValue(previousWeekStart)
          && customerOrderDateTo === orderDateInputValue(previousWeekEnd);
      } else if (button.dataset.orderDatePreset === 'month') {
        const monthStart = new Date(presetToday.getFullYear(), presetToday.getMonth(), 1);
        isActive = !invalidCustomerOrderDateRange
          && customerOrderDateTo === presetEndDate
          && customerOrderDateFrom === orderDateInputValue(monthStart);
      } else if (button.dataset.orderDatePreset === 'previous-month') {
        isActive = !invalidCustomerOrderDateRange
          && customerOrderDateFrom === orderDateInputValue(previousMonthStart)
          && customerOrderDateTo === orderDateInputValue(previousMonthEnd);
      } else {
        const presetDays = button.dataset.orderDatePreset === 'today'
          ? 1
          : Number(button.dataset.orderDatePreset);
        const presetStart = new Date(presetToday);
        presetStart.setDate(presetStart.getDate() - (presetDays - 1));
        isActive = !invalidCustomerOrderDateRange
          && customerOrderDateTo === presetEndDate
          && customerOrderDateFrom === orderDateInputValue(presetStart);
      }
      button.setAttribute('aria-pressed', String(isActive));
    });
    elements.customerOrderSearch.value = customerOrderSearchTerm;
    elements.clearCustomerOrderFilters.hidden = activeCustomerOrderStatus === 'ALL'
      && activeCustomerOrderPaymentMethod === 'ALL'
      && activeCustomerOrderPaymentStatus === 'ALL'
      && customerOrderSort === 'newest'
      && !customerOrderSearchTerm
      && !customerOrderDateFrom
      && !customerOrderDateTo;
    const orderCountLabel = visibleOrders.length === customerOrders.length
      ? `${customerOrders.length} pesanan`
      : `${visibleOrders.length} dari ${customerOrders.length} pesanan`;
    elements.customerOrderCount.textContent = invalidCustomerOrderDateRange
      ? 'Tanggal awal harus sama atau sebelum tanggal akhir.'
      : pageCount > 1
        ? `${orderCountLabel} · halaman ${customerOrdersPage} dari ${pageCount}`
        : orderCountLabel;
    if (visibleOrders.length === 0) {
      const hasFilters = activeCustomerOrderStatus !== 'ALL'
        || activeCustomerOrderPaymentMethod !== 'ALL'
        || activeCustomerOrderPaymentStatus !== 'ALL'
        || customerOrderDateFrom
        || customerOrderDateTo
        || customerOrderSearchTerm;
      elements.orderHistoryList.innerHTML = `
        <div class="order-history-empty">
          <span aria-hidden="true">▤</span>
          <strong>${invalidCustomerOrderDateRange ? 'Rentang tanggal tidak valid' : customerOrderSearchTerm ? 'Pesanan tidak ditemukan' : 'Tidak ada pesanan yang cocok'}</strong>
          <p>${invalidCustomerOrderDateRange ? 'Pilih tanggal awal yang sama dengan atau lebih awal dari tanggal akhir.' : hasFilters ? 'Coba ubah kata pencarian atau filter pesanan.' : 'Pesanan yang kamu buat akan muncul di sini.'}</p>
        </div>
      `;
      return;
    }
    const pageOrders = visibleOrders.slice(
      (customerOrdersPage - 1) * customerOrdersPerPage,
      customerOrdersPage * customerOrdersPerPage,
    );

    const progressSteps = [
      { status: 'PENDING', label: 'Pesanan diterima' },
      { status: 'PROCESSING', label: 'Sedang disiapkan' },
      { status: 'SHIPPED', label: 'Dalam pengiriman' },
      { status: 'DELIVERED', label: 'Selesai' },
    ];
    const cardsMarkup = pageOrders.map((order) => {
      const statusLabel = statusLabels[order.status] || order.status || 'Status tidak tersedia';
      const paymentStatusLabel = order.paymentMethod === 'CASH_ON_DELIVERY' && order.paymentStatus === 'PENDING'
        ? 'Bayar saat diterima'
        : paymentStatusLabels[order.paymentStatus] || order.paymentStatus || 'Status tidak tersedia';
      const currentProgressIndex = progressSteps.findIndex((step) => step.status === order.status);
      const progressMarkup = order.status === 'CANCELLED'
        ? `<ol class="customer-order-progress" aria-label="Status pesanan"><li class="progress-cancelled" aria-current="step"><span class="progress-marker" aria-hidden="true"></span><span><strong>Dibatalkan</strong></span></li></ol>`
        : `<ol class="customer-order-progress" aria-label="Progres pesanan ${escapeHtml(order.id)}">${progressSteps.map((step, index) => {
          const reached = currentProgressIndex >= index;
          const current = currentProgressIndex === index;
          const timestamp = step.status === 'PENDING'
            ? order.createdAt
            : step.status === 'SHIPPED'
              ? order.shippedAt
              : null;
          return `<li class="${reached ? 'progress-complete' : ''}${current ? ' progress-current' : ''}"${current ? ' aria-current="step"' : ''}><span class="progress-marker" aria-hidden="true"></span><span><strong>${step.label}</strong>${timestamp && reached ? `<small>${escapeHtml(formatOrderDate(timestamp))}</small>` : ''}</span></li>`;
        }).join('')}</ol>`;
      const items = Array.isArray(order.items) ? order.items : [];
      const itemMarkup = items.map((item) => `
        <li><span>${escapeHtml(item.productName)} <small>× ${Number(item.quantity) || 0}</small>${order.status === 'DELIVERED' && item.productId ? `<button class="review-action" type="button" data-review-product="${Number(item.productId)}" data-review-name="${escapeHtml(item.productName)}">Tulis atau ubah ulasan</button>` : ''}</span><strong>${formatPrice(item.lineTotal)}</strong></li>
      `).join('');
      const trackingMarkup = order.trackingNumber ? `
        <div class="customer-order-tracking">
          <span>Informasi pengiriman</span>
          <strong>${escapeHtml(order.shippingCarrier || 'Kurir')} · Resi ${escapeHtml(order.trackingNumber)}</strong>
          ${order.shippedAt ? `<small>Dikirim ${escapeHtml(formatOrderDate(order.shippedAt))}</small>` : ''}
          <button class="copy-tracking-button" type="button" data-copy-tracking="${Number(order.id)}">Salin nomor resi</button>
        </div>
      ` : '';
      const transferInstructionsMarkup = order.paymentMethod === 'BANK_TRANSFER'
        && order.status === 'PENDING'
        && ['PENDING', 'FAILED'].includes(order.paymentStatus)
        && bankTransfer
        ? `
          <div class="customer-order-transfer">
            <span>Instruksi pembayaran</span>
            <strong>${escapeHtml(bankTransfer.bankName)} · ${escapeHtml(bankTransfer.accountNumber)}</strong>
            <small>Transfer sebesar ${formatPrice(order.total)} atas nama ${escapeHtml(bankTransfer.accountName)}. Pesanan diproses setelah pembayaran dikonfirmasi admin.</small>
            <button class="copy-transfer-account-button" type="button" data-copy-bank-account="${Number(order.id)}">Salin instruksi transfer</button>
          </div>
        `
        : '';
      const cancelMarkup = order.status === 'PENDING' && order.paymentStatus !== 'PAID'
        ? `<button class="cancel-order-button" type="button" data-order-cancel="${Number(order.id)}">Batalkan pesanan</button>`
        : '';
      const reorderMarkup = items.length
        ? `<button class="reorder-button" type="button" data-order-reorder="${Number(order.id)}">Beli lagi</button>`
        : '';
      const actionsMarkup = `<div class="customer-order-actions"><button class="copy-order-summary-button" type="button" data-copy-order-summary="${Number(order.id)}">Salin ringkasan</button>${reorderMarkup}<button class="order-invoice-button" type="button" data-order-invoice="${Number(order.id)}">Cetak invoice</button>${cancelMarkup}</div>`;
      const isoDate = new Date(order.createdAt);
      const dateTime = Number.isNaN(isoDate.getTime()) ? '' : isoDate.toISOString();
      return `
        <article class="customer-order-card">
          <header class="customer-order-header">
            <div><strong>Pesanan #${escapeHtml(order.id)}</strong><time${dateTime ? ` datetime="${dateTime}"` : ''}>${escapeHtml(formatOrderDate(order.createdAt))}</time></div>
            <span class="order-status-badge status-${escapeHtml(order.status)}">${escapeHtml(statusLabel)}</span>
          </header>
          <p class="customer-order-payment"><span>${escapeHtml(paymentMethodLabels[order.paymentMethod] || order.paymentMethod || 'Metode tidak tersedia')}</span><strong class="payment-status-${escapeHtml(order.paymentStatus)}">${escapeHtml(paymentStatusLabel)}</strong></p>
          ${progressMarkup}
          ${transferInstructionsMarkup}
          ${trackingMarkup}
          ${typeof order.notes === 'string' && order.notes.trim() ? `<div class="customer-order-notes"><strong>Catatan pesanan</strong><p>${escapeHtml(order.notes)}</p></div>` : ''}
          <ul class="customer-order-items">${itemMarkup}</ul>
          <div class="customer-order-footer">
            <div class="customer-order-destination">
              <strong>${escapeHtml(order.shippingName || 'Penerima tidak tersedia')}</strong>
              <span>${escapeHtml(order.shippingPhone || 'Nomor telepon tidak tersedia')}</span>
              <p>${escapeHtml(order.shippingAddress || 'Alamat tidak tersedia')}</p>
              <button class="copy-shipping-details-button" type="button" data-copy-shipping="${Number(order.id)}">Salin detail pengiriman</button>
            </div>
            <div class="customer-order-totals">
              <p><span>Subtotal produk</span><strong>${formatPrice(order.subtotal ?? order.total)}</strong></p>
              <p><span>Ongkos kirim</span><strong>${formatPrice(order.shippingFee ?? 0)}</strong></p>
              <p class="customer-order-grand-total"><span>Total</span><strong>${formatPrice(order.total)}</strong></p>
            </div>
            ${actionsMarkup}
          </div>
        </article>
      `;
    }).join('');
    const paginationMarkup = pageCount > 1
      ? `<nav class="customer-order-pagination" aria-label="Halaman riwayat pesanan"><button type="button" data-order-page="${customerOrdersPage - 1}" ${customerOrdersPage === 1 ? 'disabled' : ''}>Sebelumnya</button><span>Halaman ${customerOrdersPage} dari ${pageCount}</span><button type="button" data-order-page="${customerOrdersPage + 1}" ${customerOrdersPage === pageCount ? 'disabled' : ''}>Berikutnya</button></nav>`
      : '';
    elements.orderHistoryList.innerHTML = `${cardsMarkup}${paginationMarkup}`;
  }

  async function loadCustomerOrders({ preserveAddressEditor = false, background = false } = {}) {
    if (customerOrdersLoadInProgress) return;
    customerOrdersLoadInProgress = true;
    try {
    if (!preserveAddressEditor) showOrderHistory();
    if (!background || !customerOrdersLoaded) {
      elements.orderHistoryList.setAttribute('aria-busy', 'true');
      elements.orderHistoryList.innerHTML = '<div class="order-history-loading"><span class="loading-spinner" aria-hidden="true"></span>Memuat riwayat pesanan...</div>';
    }
    let response;
    try {
      response = await fetch(`${ordersUrl}/mine`, {
        signal: AbortSignal.timeout(customerOrdersRequestTimeoutMs),
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
      });
    } catch {
      elements.orderHistoryList.setAttribute('aria-busy', 'false');
      if (background && customerOrdersLoaded) {
        elements.orderRefreshStatus.textContent = 'Tidak dapat memperbarui karena jaringan terputus atau terlalu lambat. Menampilkan informasi terakhir yang berhasil dimuat.';
      } else {
        elements.orderHistoryList.innerHTML = '<div class="order-history-error"><p>Tidak dapat terhubung ke API atau permintaan melewati batas waktu.</p><button class="button button-light" type="button" data-order-retry>Coba lagi</button></div>';
      }
      return;
    }

    const data = await response.json().catch(() => null);
    if (response.status === 401) {
      clearCustomerSession();
      showCustomerAuth('Sesi berakhir. Masuk kembali untuk melihat pesananmu.');
      return;
    }
    if (!response.ok || !Array.isArray(data)) {
      const message = Array.isArray(data?.message) ? data.message.join(' ') : data?.message;
      elements.orderHistoryList.setAttribute('aria-busy', 'false');
      if (background && customerOrdersLoaded) {
        elements.orderRefreshStatus.textContent = `${message || 'Pembaruan belum berhasil.'} Status pesanan terakhir tetap ditampilkan.`;
      } else {
        elements.orderHistoryList.innerHTML = `<div class="order-history-error"><p>${escapeHtml(message || 'Riwayat pesanan belum dapat dimuat.')}</p><button class="button button-light" type="button" data-order-retry>Coba lagi</button></div>`;
      }
      return;
    }
    customerOrdersLoaded = true;
    renderCustomerOrders(data);
    elements.orderRefreshStatus.textContent = `Terakhir diperbarui ${new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date())}.`;
    } finally {
      customerOrdersLoadInProgress = false;
    }
  }

  async function refreshCustomerOrders() {
    const button = elements.refreshCustomerOrders;
    if (button.disabled) return;

    button.disabled = true;
    button.textContent = 'Memuat...';
    try {
      await loadCustomerOrders({ preserveAddressEditor: true, background: true });
    } finally {
      button.disabled = false;
      button.textContent = 'Perbarui';
    }
  }

  async function cancelCustomerOrder(orderId, button) {
    button.disabled = true;
    button.textContent = 'Membatalkan...';
    try {
      await sendJson(`${ordersUrl}/${orderId}/cancel`, {}, customerToken);
      showToast(`Pesanan #${orderId} dibatalkan dan stok dikembalikan.`);
      await Promise.all([loadCustomerOrders(), loadStore()]);
    } catch (error) {
      if (error.status === 401) {
        clearCustomerSession();
        showCustomerAuth('Sesi berakhir. Masuk kembali untuk mengelola pesanan.');
        return;
      }
      showToast(error.message || 'Pesanan belum dapat dibatalkan.');
      button.disabled = false;
      button.textContent = 'Batalkan pesanan';
    }
  }

  function reorderCustomerOrder(orderId) {
    const order = customerOrders.find((item) => Number(item.id) === orderId);
    if (!order || !Array.isArray(order.items)) {
      showToast('Detail pesanan tidak tersedia. Perbarui riwayat pesanan lalu coba lagi.');
      return;
    }

    let addedUnits = 0;
    let addedProducts = 0;
    let unavailableProducts = 0;
    for (const item of order.items) {
      const product = products.find((entry) => Number(entry.id) === Number(item.productId));
      const stock = product ? productStock(product) : 0;
      const currentQuantity = Number(cart[String(item.productId)] || 0);
      const requestedQuantity = Number(item.quantity);
      if (!product || !Number.isSafeInteger(requestedQuantity) || requestedQuantity < 1 || stock === 0) {
        unavailableProducts += 1;
        continue;
      }

      const nextQuantity = Math.min(stock, currentQuantity + requestedQuantity);
      const quantityAdded = Math.max(0, nextQuantity - currentQuantity);
      if (quantityAdded === 0) {
        unavailableProducts += 1;
        continue;
      }

      cart[String(product.id)] = nextQuantity;
      addedUnits += quantityAdded;
      addedProducts += 1;
      if (quantityAdded < requestedQuantity) unavailableProducts += 1;
    }

    if (addedUnits === 0) {
      showToast('Tidak ada produk dari pesanan ini yang tersedia untuk ditambahkan.');
      return;
    }

    saveCart();
    renderProducts();
    elements.checkoutDialog.close();
    setCartOpen(true);
    showToast(unavailableProducts
      ? `${addedUnits} barang dari ${addedProducts} produk ditambahkan. Sebagian stok tidak tersedia.`
      : `${addedUnits} barang dari ${addedProducts} produk ditambahkan ke keranjang.`);
  }

  async function copyOrderTrackingNumber(orderId, button) {
    const order = customerOrders.find((item) => Number(item.id) === orderId);
    if (!order?.trackingNumber) {
      showToast('Nomor resi tidak tersedia. Perbarui informasi pesanan lalu coba lagi.');
      return;
    }

    if (!navigator.clipboard?.writeText) {
      showToast('Clipboard tidak tersedia di browser ini. Silakan salin nomor resi secara manual.');
      return;
    }

    button.disabled = true;
    try {
      await navigator.clipboard.writeText(order.trackingNumber);
      button.textContent = 'Resi tersalin';
      showToast('Nomor resi berhasil disalin.');
      window.setTimeout(() => {
        if (button.isConnected) {
          button.disabled = false;
          button.textContent = 'Salin nomor resi';
        }
      }, 1800);
    } catch {
      button.disabled = false;
      showToast('Nomor resi belum dapat disalin. Silakan salin secara manual.');
    }
  }

  async function copyBankTransferInstructions(orderId, button) {
    const order = customerOrders.find((item) => Number(item.id) === orderId);
    if (
      !order
      || order.paymentMethod !== 'BANK_TRANSFER'
      || order.status !== 'PENDING'
      || !['PENDING', 'FAILED'].includes(order.paymentStatus)
      || !bankTransfer?.accountNumber
    ) {
      showToast('Instruksi transfer tidak tersedia. Perbarui informasi pesanan lalu coba lagi.');
      return;
    }

    if (!navigator.clipboard?.writeText) {
      showToast('Clipboard tidak tersedia di browser ini. Silakan salin instruksi transfer secara manual.');
      return;
    }

    const instructions = [
      `Pesanan #${order.id}`,
      `Bank: ${bankTransfer.bankName}`,
      `Nomor rekening: ${bankTransfer.accountNumber}`,
      `Atas nama: ${bankTransfer.accountName}`,
      `Jumlah transfer: ${formatPrice(order.total)}`,
    ].join('\n');
    button.disabled = true;
    try {
      await navigator.clipboard.writeText(instructions);
      button.textContent = 'Instruksi tersalin';
      showToast(`Instruksi transfer pesanan #${orderId} berhasil disalin.`);
      window.setTimeout(() => {
        if (button.isConnected) {
          button.disabled = false;
          button.textContent = 'Salin instruksi transfer';
        }
      }, 1800);
    } catch {
      button.disabled = false;
      showToast('Instruksi transfer belum dapat disalin. Silakan salin secara manual.');
    }
  }

  async function copyOrderShippingDetails(orderId, button) {
    const order = customerOrders.find((item) => Number(item.id) === orderId);
    if (!order) {
      showToast('Detail pengiriman tidak tersedia. Perbarui riwayat pesanan lalu coba lagi.');
      return;
    }

    const details = [
      `Penerima: ${order.shippingName || 'Tidak tersedia'}`,
      `Telepon: ${order.shippingPhone || 'Tidak tersedia'}`,
      `Alamat: ${order.shippingAddress || 'Tidak tersedia'}`,
    ].join('\n');
    if (!navigator.clipboard?.writeText) {
      showToast('Clipboard tidak tersedia di browser ini. Silakan salin detail pengiriman secara manual.');
      return;
    }

    button.disabled = true;
    try {
      await navigator.clipboard.writeText(details);
      button.textContent = 'Detail pengiriman tersalin';
      showToast('Detail pengiriman berhasil disalin.');
      window.setTimeout(() => {
        if (button.isConnected) {
          button.disabled = false;
          button.textContent = 'Salin detail pengiriman';
        }
      }, 1800);
    } catch {
      button.disabled = false;
      showToast('Detail pengiriman belum dapat disalin. Silakan salin secara manual.');
    }
  }

  async function copyCustomerOrderSummary(orderId, button) {
    const order = customerOrders.find((item) => Number(item.id) === orderId);
    if (!order) {
      showToast('Ringkasan pesanan tidak tersedia. Perbarui riwayat pesanan lalu coba lagi.');
      return;
    }

    if (!navigator.clipboard?.writeText) {
      showToast('Clipboard tidak tersedia di browser ini. Silakan salin ringkasan pesanan secara manual.');
      return;
    }

    const orderStatusLabels = {
      PENDING: 'Menunggu diproses',
      PROCESSING: 'Sedang disiapkan',
      SHIPPED: 'Dalam pengiriman',
      DELIVERED: 'Selesai',
      CANCELLED: 'Dibatalkan',
    };
    const summary = [
      `Pesanan #${order.id}`,
      `Tanggal: ${formatOrderDate(order.createdAt)}`,
      `Status: ${orderStatusLabels[order.status] || order.status || 'Tidak tersedia'}`,
      `Total: ${formatPrice(order.total)}`,
      `Penerima: ${order.shippingName || 'Tidak tersedia'}`,
      `Telepon: ${order.shippingPhone || 'Tidak tersedia'}`,
      `Alamat: ${order.shippingAddress || 'Tidak tersedia'}`,
      ...(order.shippingCarrier ? [`Kurir: ${order.shippingCarrier}`] : []),
      ...(order.trackingNumber ? [`Nomor resi: ${order.trackingNumber}`] : []),
    ].join('\n');
    button.disabled = true;
    try {
      await navigator.clipboard.writeText(summary);
      button.textContent = 'Ringkasan tersalin';
      showToast(`Ringkasan pesanan #${orderId} berhasil disalin.`);
      window.setTimeout(() => {
        if (button.isConnected) {
          button.disabled = false;
          button.textContent = 'Salin ringkasan';
        }
      }, 1800);
    } catch {
      button.disabled = false;
      showToast('Ringkasan pesanan belum dapat disalin. Silakan salin secara manual.');
    }
  }

  function setReviewMessage(message = '') {
    elements.reviewMessage.textContent = message;
    elements.reviewMessage.hidden = !message;
  }

  function renderReviewList(data) {
    const reviews = Array.isArray(data?.reviews) ? data.reviews : [];
    const average = Number(data?.averageRating);
    elements.reviewSummary.textContent = reviews.length
      ? `${average.toFixed(1)} dari 5 · ${reviews.length} ulasan`
      : 'Belum ada ulasan untuk produk ini.';
    elements.reviewList.setAttribute('aria-busy', 'false');
    elements.reviewList.innerHTML = reviews.length ? reviews.map((review) => {
      const rating = Math.min(5, Math.max(0, Number(review.rating) || 0));
      return `
        <article class="review-entry">
          <div class="review-entry-heading"><strong>${escapeHtml(review.user?.name || 'Pelanggan')}</strong><span aria-label="Rating ${rating} dari 5">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</span></div>
          <small>Pembeli terverifikasi · ${escapeHtml(formatOrderDate(review.createdAt))}</small>
          ${review.comment ? `<p>${escapeHtml(review.comment)}</p>` : ''}
        </article>
      `;
    }).join('') : '<p class="review-empty">Jadilah yang pertama memberi ulasan setelah pesananmu diterima.</p>';
  }

  async function loadProductReviews(productId) {
    elements.reviewList.setAttribute('aria-busy', 'true');
    elements.reviewList.innerHTML = '<p class="review-empty">Memuat ulasan...</p>';
    try {
      const response = await fetch(`${productsUrl}/${productId}/reviews`, {
        headers: { Accept: 'application/json' },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Ulasan belum dapat dimuat.');
      const product = products.find((item) => Number(item.id) === productId);
      if (product) {
        product.reviewCount = data.reviewCount;
        product.averageRating = data.averageRating;
      }
      renderProducts();
      renderReviewList(data);
    } catch (error) {
      elements.reviewList.setAttribute('aria-busy', 'false');
      elements.reviewList.innerHTML = `<p class="review-empty">${escapeHtml(error.message || 'Ulasan belum dapat dimuat.')}</p>`;
    }
  }

  function openReviewDialog(productId, productName, canWrite = false) {
    elements.reviewForm.reset();
    elements.reviewForm.elements.productId.value = String(productId);
    elements.reviewProductName.textContent = productName;
    elements.reviewForm.hidden = !canWrite;
    elements.reviewLoginNote.hidden = canWrite;
    setReviewMessage();
    elements.reviewDialog.showModal();
    void loadProductReviews(productId);
  }

  async function submitReview(event) {
    event.preventDefault();
    const form = elements.reviewForm;
    const productId = Number(form.elements.productId.value);
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    setReviewMessage();
    try {
      const response = await fetch(`${productsUrl}/${productId}/reviews`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          rating: Number(form.elements.rating.value),
          comment: form.elements.comment.value.trim(),
        }),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 401) {
        clearCustomerSession();
        throw new Error('Sesi akun berakhir. Masuk kembali untuk mengirim ulasan.');
      }
      if (!response.ok) {
        const detail = Array.isArray(data?.message) ? data.message.join(' ') : data?.message;
        throw new Error(detail || 'Ulasan belum dapat disimpan.');
      }

      setReviewMessage('Ulasan berhasil disimpan. Kamu bisa mengubahnya kapan saja.');
      await loadProductReviews(productId);
      showToast('Ulasan produk berhasil disimpan.');
    } catch (error) {
      setReviewMessage(error.message || 'Ulasan belum dapat disimpan.');
    } finally {
      submit.disabled = false;
    }
  }

  async function openCustomerOrders() {
    checkoutIntent = 'orders';
    elements.customerAuthForm.reset();
    elements.shippingForm.reset();
    if (customerToken && customerUser?.role === 'CUSTOMER') {
      showOrderHistory();
      elements.checkoutDialog.showModal();
      await loadCustomerOrders();
      return;
    }
    clearCustomerSession();
    showCustomerAuth();
    elements.checkoutDialog.showModal();
  }

  elements.searchForm.addEventListener('submit', (event) => event.preventDefault());
  elements.searchInput.addEventListener('input', () => {
    searchTerm = elements.searchInput.value.trim().toLocaleLowerCase('id');
    catalogPage = 1;
    renderProducts();
    renderSearchSuggestions();
  });
  elements.searchInput.addEventListener('focus', renderSearchSuggestions);
  elements.searchInput.addEventListener('keydown', (event) => {
    if (elements.searchSuggestions.hidden) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const optionCount = searchSuggestionProducts.length;
      if (optionCount === 0) return;
      activeSearchSuggestion = activeSearchSuggestion < 0
        ? direction === 1 ? 0 : optionCount - 1
        : (activeSearchSuggestion + direction + optionCount) % optionCount;
      elements.searchSuggestions.querySelectorAll('[role="option"]').forEach((option, index) => {
        const isActive = index === activeSearchSuggestion;
        option.setAttribute('aria-selected', String(isActive));
        if (isActive) {
          elements.searchInput.setAttribute('aria-activedescendant', option.id);
          option.scrollIntoView({ block: 'nearest' });
        }
      });
    } else if (event.key === 'Enter' && activeSearchSuggestion >= 0) {
      event.preventDefault();
      selectSearchSuggestion(activeSearchSuggestion);
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      closeSearchSuggestions();
    }
  });
  elements.searchSuggestions.addEventListener('click', (event) => {
    const option = event.target.closest('[data-search-product]');
    if (!option) return;
    const index = searchSuggestionProducts.findIndex((product) => String(product.id) === option.dataset.searchProduct);
    selectSearchSuggestion(index);
  });
  document.addEventListener('click', (event) => {
    if (!elements.searchForm.contains(event.target)) closeSearchSuggestions();
  });
  elements.sortSelect.addEventListener('change', () => {
    catalogPage = 1;
    renderProducts();
  });
  [elements.minPriceFilter, elements.maxPriceFilter].forEach((input) => {
    input.addEventListener('input', () => {
      catalogPage = 1;
      renderProducts();
    });
  });
  [elements.availableOnlyFilter, elements.minimumRatingFilter].forEach((control) => {
    control.addEventListener('change', () => {
      catalogPage = 1;
      renderProducts();
    });
  });
  const clearCatalogFilters = () => {
    activeCategory = 'all';
    catalogPage = 1;
    favoritesOnly = false;
    searchTerm = '';
    elements.searchInput.value = '';
    elements.sortSelect.value = 'featured';
    elements.minPriceFilter.value = '';
    elements.maxPriceFilter.value = '';
    elements.availableOnlyFilter.checked = false;
    elements.minimumRatingFilter.value = '0';
    renderProducts();
  };
  elements.clearCatalogFilters.addEventListener('click', clearCatalogFilters);
  elements.categoryFilters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    activeCategory = button.dataset.category;
    catalogPage = 1;
    renderProducts();
  });
  elements.homeCategoryGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-home-category]');
    if (!button) return;
    activeCategory = button.dataset.homeCategory || 'all';
    catalogPage = 1;
    renderProducts();
    document.querySelector('#catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  elements.favoritesFilter.addEventListener('click', () => {
    favoritesOnly = !favoritesOnly;
    catalogPage = 1;
    renderProducts();
  });
  elements.catalogPagination.addEventListener('click', (event) => {
    const button = event.target.closest('[data-catalog-page]');
    if (!button || button.disabled) return;
    const nextPage = Number(button.dataset.catalogPage);
    if (!Number.isInteger(nextPage) || nextPage < 1) return;
    catalogPage = nextPage;
    renderProducts();
  });
  elements.productGrid.addEventListener('error', (event) => {
    if (event.target.matches?.('img[data-product-image]')) event.target.remove();
  }, true);
  elements.productDialog.addEventListener('error', (event) => {
    if (event.target.matches?.('img[data-product-image]')) event.target.remove();
  }, true);
  elements.productGrid.addEventListener('click', (event) => {
    if (event.target.closest('[data-reset-catalog]')) {
      clearCatalogFilters();
      return;
    }
    const favoriteButton = event.target.closest('[data-favorite]');
    if (favoriteButton) {
      toggleFavorite(Number(favoriteButton.dataset.favorite));
      return;
    }
    const detailButton = event.target.closest('[data-product-view]');
    if (detailButton) {
      openProductDetails(Number(detailButton.dataset.productView));
      return;
    }
    const reviewButton = event.target.closest('[data-product-reviews]');
    if (reviewButton) {
      openReviewDialog(Number(reviewButton.dataset.productReviews), reviewButton.dataset.reviewName);
      return;
    }
    const button = event.target.closest('[data-add]');
    if (!button) return;
    const product = products.find((item) => String(item.id) === button.dataset.add);
    if (!product) return;
    addProductToCart(product);
  });
  elements.recentProductsList.addEventListener('error', (event) => {
    if (event.target.matches?.('img[data-product-image]')) event.target.remove();
  }, true);
  elements.recentProductsList.addEventListener('click', (event) => {
    const viewButton = event.target.closest('[data-recent-view]');
    if (viewButton) {
      openProductDetails(Number(viewButton.dataset.recentView));
      return;
    }
    const addButton = event.target.closest('[data-recent-add]');
    if (!addButton) return;
    const product = products.find((item) => Number(item.id) === Number(addButton.dataset.recentAdd));
    if (product) addProductToCart(product);
  });
  elements.clearRecentProducts.addEventListener('click', () => {
    recentlyViewedProductIds = [];
    try {
      localStorage.removeItem(recentProductsStorageKey);
    } catch {
      showToast('Riwayat produk tidak dapat dihapus dari browser ini.');
    }
    renderRecentlyViewedProducts();
  });
  elements.closeProductDialog.addEventListener('click', () => elements.productDialog.close());
  elements.productDialog.addEventListener('click', (event) => {
    if (event.target === elements.productDialog) elements.productDialog.close();
  });
  elements.productDialog.addEventListener('close', () => {
    if (new URL(window.location.href).searchParams.has('product')) updateProductUrl();
  });
  elements.productDetailAdd.addEventListener('click', () => {
    const product = products.find((item) => String(item.id) === elements.productDetailAdd.dataset.productId);
    if (product) addProductToCart(product);
  });
  elements.productDetailFavorite.addEventListener('click', () => {
    const productId = Number(elements.productDetailFavorite.dataset.productId);
    toggleFavorite(productId);
    const saved = favorites.has(String(productId));
    elements.productDetailFavorite.setAttribute('aria-pressed', String(saved));
    elements.productDetailFavorite.textContent = saved ? '♥ Tersimpan di favorit' : '♡ Simpan favorit';
  });
  elements.productDetailShare.addEventListener('click', () => {
    void shareProduct(Number(elements.productDetailShare.dataset.productId));
  });
  elements.productDetailReviews.addEventListener('click', () => {
    const productId = Number(elements.productDetailReviews.dataset.productId);
    const product = products.find((item) => Number(item.id) === productId);
    if (!product) return;
    elements.productDialog.close();
    openReviewDialog(productId, product.name);
  });
  elements.cartItems.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-cart-item]');
    if (removeButton) {
      const productId = Number(removeButton.dataset.removeCartItem);
      const product = products.find((item) => Number(item.id) === productId);
      if (!product || !Object.hasOwn(cart, String(productId))) return;
      delete cart[String(productId)];
      saveCart();
      renderProducts();
      showToast(`${product.name} dihapus dari keranjang.`);
      return;
    }
    const button = event.target.closest('[data-quantity]');
    if (!button) return;
    const id = button.dataset.quantity;
    const delta = Number(button.dataset.delta);
    const product = products.find((item) => String(item.id) === id);
    const nextQuantity = Number(cart[id] || 0) + delta;
    if (nextQuantity <= 0) delete cart[id];
    else if (product && nextQuantity <= productStock(product)) cart[id] = nextQuantity;
    saveCart();
  });
  elements.cartItems.addEventListener('error', (event) => {
    if (event.target.matches?.('img[data-product-image]')) event.target.remove();
  }, true);
  elements.cartTrigger.addEventListener('click', () => setCartOpen(true));
  elements.customerOrdersTrigger.addEventListener('click', openCustomerOrders);
  elements.closeCart.addEventListener('click', () => setCartOpen(false));
  elements.cartBackdrop.addEventListener('click', () => setCartOpen(false));
  elements.checkoutButton.addEventListener('click', openCheckout);
  elements.paymentMethod.addEventListener('change', updatePaymentHint);
  elements.customerAuthForm.addEventListener('submit', authenticateCustomer);
  elements.shippingForm.addEventListener('submit', placeOrder);
  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.addEventListener('click', () => setAuthMode(button.dataset.authMode));
  });
  elements.backToCustomerAuth.addEventListener('click', () => showCustomerAuth());
  elements.customerLogout.addEventListener('click', () => {
    clearCustomerSession();
    showCustomerAuth('Kamu sudah keluar dari akun. Masuk kembali untuk melihat pesanan.');
  });
  elements.refreshCustomerOrders.addEventListener('click', refreshCustomerOrders);
  elements.customerOrderSearch.addEventListener('input', () => {
    customerOrderSearchTerm = elements.customerOrderSearch.value.trim().toLocaleLowerCase('id');
    customerOrdersPage = 1;
    renderCustomerOrders(customerOrders);
  });
  elements.customerOrderStatusFilter.addEventListener('change', () => {
    activeCustomerOrderStatus = elements.customerOrderStatusFilter.value;
    customerOrdersPage = 1;
    renderCustomerOrders(customerOrders);
  });
  elements.customerOrderPaymentFilter.addEventListener('change', () => {
    activeCustomerOrderPaymentMethod = elements.customerOrderPaymentFilter.value;
    customerOrdersPage = 1;
    renderCustomerOrders(customerOrders);
  });
  elements.customerOrderPaymentStatusFilter.addEventListener('change', () => {
    activeCustomerOrderPaymentStatus = elements.customerOrderPaymentStatusFilter.value;
    customerOrdersPage = 1;
    renderCustomerOrders(customerOrders);
  });
  elements.customerOrderSort.addEventListener('change', () => {
    customerOrderSort = elements.customerOrderSort.value;
    customerOrdersPage = 1;
    renderCustomerOrders(customerOrders);
  });
  const filterCustomerOrdersByDate = () => {
    customerOrderDateFrom = elements.customerOrderDateFrom.value;
    customerOrderDateTo = elements.customerOrderDateTo.value;
    customerOrdersPage = 1;
    renderCustomerOrders(customerOrders);
  };
  elements.orderHistoryFilter.addEventListener('click', (event) => {
    const presetButton = event.target.closest('[data-order-date-preset]');
    if (!presetButton) return;
    const endDate = new Date();
    const startDate = new Date(endDate);
    const preset = presetButton.dataset.orderDatePreset;
    if (preset === 'all') {
      customerOrderDateFrom = '';
      customerOrderDateTo = '';
      customerOrdersPage = 1;
      renderCustomerOrders(customerOrders);
      return;
    }
    if (preset === 'yesterday') {
      startDate.setDate(startDate.getDate() - 1);
      endDate.setDate(endDate.getDate() - 1);
    } else if (preset === 'week') {
      startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));
    } else if (preset === 'previous-week') {
      startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));
      endDate.setTime(startDate.getTime());
      endDate.setDate(endDate.getDate() - 1);
      startDate.setDate(startDate.getDate() - 7);
    } else if (preset === 'quarter') {
      startDate.setMonth(currentQuarterMonth, 1);
    } else if (preset === 'previous-quarter') {
      startDate.setMonth(currentQuarterMonth - 3, 1);
      endDate.setMonth(currentQuarterMonth, 0);
    } else if (preset === 'year') {
      startDate.setMonth(0, 1);
    } else if (preset === 'month') {
      startDate.setDate(1);
    } else if (preset === 'previous-month') {
      startDate.setDate(1);
      startDate.setMonth(startDate.getMonth() - 1);
      endDate.setDate(0);
    } else if (preset !== 'today') {
      startDate.setDate(startDate.getDate() - (Number(preset) - 1));
    }
    customerOrderDateFrom = orderDateInputValue(startDate);
    customerOrderDateTo = orderDateInputValue(endDate);
    customerOrdersPage = 1;
    renderCustomerOrders(customerOrders);
  });
  elements.customerOrderDateFrom.addEventListener('change', filterCustomerOrdersByDate);
  elements.customerOrderDateTo.addEventListener('change', filterCustomerOrdersByDate);
  elements.clearCustomerOrderFilters.addEventListener('click', () => {
    activeCustomerOrderStatus = 'ALL';
    activeCustomerOrderPaymentMethod = 'ALL';
    activeCustomerOrderPaymentStatus = 'ALL';
    customerOrderSort = 'newest';
    customerOrderSearchTerm = '';
    customerOrderDateFrom = '';
    customerOrderDateTo = '';
    customerOrdersPage = 1;
    renderCustomerOrders(customerOrders);
    elements.customerOrderSearch.focus();
  });
  elements.exportCustomerOrders.addEventListener('click', () => {
    const csvCell = (value) => {
      let text = String(value ?? '');
      if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const statusLabels = {
      PENDING: 'Menunggu diproses',
      PROCESSING: 'Sedang disiapkan',
      SHIPPED: 'Dalam pengiriman',
      DELIVERED: 'Selesai',
      CANCELLED: 'Dibatalkan',
    };
    const paymentMethodLabels = {
      BANK_TRANSFER: 'Transfer bank',
      CASH_ON_DELIVERY: 'COD',
    };
    const paymentStatusLabels = {
      PENDING: 'Menunggu pembayaran',
      PAID: 'Lunas',
      FAILED: 'Transfer belum terverifikasi',
      REFUNDED: 'Dana dikembalikan',
    };
    const rows = [
      ['Nomor pesanan', 'Tanggal', 'Status pesanan', 'Metode pembayaran', 'Status pembayaran', 'Nama penerima', 'Nomor telepon', 'Alamat pengiriman', 'Catatan pesanan', 'Kurir', 'Nomor resi', 'Produk', 'Subtotal', 'Ongkos kirim', 'Total'],
      ...visibleCustomerOrders.map((order) => [
        order.id,
        order.createdAt,
        statusLabels[order.status] || order.status,
        paymentMethodLabels[order.paymentMethod] || order.paymentMethod,
        paymentStatusLabels[order.paymentStatus] || order.paymentStatus,
        order.shippingName,
        order.shippingPhone,
        order.shippingAddress,
        order.notes,
        order.shippingCarrier,
        order.trackingNumber,
        (Array.isArray(order.items) ? order.items : [])
          .map((item) => `${item.productName} × ${Number(item.quantity) || 0}`)
          .join('; '),
        order.subtotal ?? order.total,
        order.shippingFee ?? 0,
        order.total,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    const csvUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const downloadLink = document.createElement('a');
    downloadLink.href = csvUrl;
    downloadLink.download = `riwayat-pesanan-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadLink.click();
    window.setTimeout(() => URL.revokeObjectURL(csvUrl), 60_000);
    showToast(`${visibleCustomerOrders.length} pesanan diunduh sebagai CSV.`);
  });
  elements.editSavedAddress.addEventListener('click', () => {
    const expanded = elements.editSavedAddress.getAttribute('aria-expanded') === 'true';
    elements.editSavedAddress.setAttribute('aria-expanded', String(!expanded));
    elements.savedShippingForm.hidden = expanded;
    if (!expanded) elements.savedShippingForm.elements.shippingName.focus();
  });
  elements.savedShippingForm.addEventListener('submit', saveCustomerShippingAddress);
  elements.viewOrdersAfterCheckout.addEventListener('click', async () => {
    checkoutIntent = 'orders';
    showOrderHistory();
    await loadCustomerOrders();
  });
  elements.orderHistoryList.addEventListener('click', (event) => {
    const reorderButton = event.target.closest('[data-order-reorder]');
    if (reorderButton) {
      reorderCustomerOrder(Number(reorderButton.dataset.orderReorder));
      return;
    }
    const pageButton = event.target.closest('[data-order-page]');
    if (pageButton && !pageButton.disabled) {
      customerOrdersPage = Number(pageButton.dataset.orderPage);
      renderCustomerOrders(customerOrders);
      elements.orderHistoryList.querySelector('.customer-order-pagination')?.scrollIntoView({ block: 'nearest' });
      return;
    }
    const copyTrackingButton = event.target.closest('[data-copy-tracking]');
    if (copyTrackingButton) {
      void copyOrderTrackingNumber(Number(copyTrackingButton.dataset.copyTracking), copyTrackingButton);
      return;
    }
    const copyBankAccountButton = event.target.closest('[data-copy-bank-account]');
    if (copyBankAccountButton) {
      void copyBankTransferInstructions(
        Number(copyBankAccountButton.dataset.copyBankAccount),
        copyBankAccountButton,
      );
      return;
    }
    const copyShippingButton = event.target.closest('[data-copy-shipping]');
    if (copyShippingButton) {
      void copyOrderShippingDetails(
        Number(copyShippingButton.dataset.copyShipping),
        copyShippingButton,
      );
      return;
    }
    const copyOrderSummaryButton = event.target.closest('[data-copy-order-summary]');
    if (copyOrderSummaryButton) {
      void copyCustomerOrderSummary(
        Number(copyOrderSummaryButton.dataset.copyOrderSummary),
        copyOrderSummaryButton,
      );
      return;
    }
    const invoiceButton = event.target.closest('[data-order-invoice]');
    if (invoiceButton) {
      const orderId = Number(invoiceButton.dataset.orderInvoice);
      const order = customerOrders.find((item) => Number(item.id) === orderId);
      if (order) openCustomerInvoice(order);
      return;
    }
    const cancelButton = event.target.closest('[data-order-cancel]');
    if (cancelButton) {
      const orderId = Number(cancelButton.dataset.orderCancel);
      if (Number.isSafeInteger(orderId) && window.confirm(`Batalkan pesanan #${orderId}? Stok akan dikembalikan ke toko.`)) {
        void cancelCustomerOrder(orderId, cancelButton);
      }
      return;
    }
    const reviewButton = event.target.closest('[data-review-product]');
    if (reviewButton) {
      openReviewDialog(
        Number(reviewButton.dataset.reviewProduct),
        reviewButton.dataset.reviewName,
        Boolean(customerToken && customerUser?.role === 'CUSTOMER'),
      );
    }
    if (event.target.closest('[data-order-retry]')) loadCustomerOrders();
    if (event.target.closest('[data-order-browse]')) {
      elements.checkoutDialog.close();
      document.querySelector('#catalog').scrollIntoView({ behavior: 'smooth' });
    }
  });
  elements.reviewForm.addEventListener('submit', submitReview);
  elements.closeReviewDialog.addEventListener('click', () => elements.reviewDialog.close());
  elements.reviewDialog.addEventListener('click', (event) => {
    if (event.target === elements.reviewDialog) elements.reviewDialog.close();
  });
  elements.closeCheckout.addEventListener('click', () => elements.checkoutDialog.close());
  elements.finishCheckout.addEventListener('click', () => elements.checkoutDialog.close());
  elements.checkoutDialog.addEventListener('click', (event) => {
    if (event.target === elements.checkoutDialog) elements.checkoutDialog.close();
  });
  elements.checkoutDialog.addEventListener('close', () => {
    stopCustomerOrdersAutoRefresh();
    elements.customerAuthForm.reset();
    elements.shippingForm.reset();
    setAuthMode('login');
  });
  elements.catalogState.addEventListener('click', (event) => {
    if (event.target.closest('#retryLoad')) loadStore();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.cartDrawer.getAttribute('aria-hidden') === 'false') {
      setCartOpen(false);
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      elements.searchInput.focus();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (
      document.visibilityState === 'visible'
      && elements.checkoutDialog.open
      && !elements.orderHistoryStep.hidden
    ) {
      void refreshCustomerOrders();
    }
  });

  document.querySelector('#currentYear').textContent = String(new Date().getFullYear());
  updateCartCount();
  renderCart();
  loadStore();

  // =========================================================
  // CUSTOMER EXPERIENCE ENHANCEMENTS
  // Gratis ongkir, rekomendasi produk, dan navigasi
  // =========================================================

  const CUSTOMER_FREE_SHIPPING_THRESHOLD = 250000;

  function initializeCustomerEnhancements() {
    const drawer = elements.cartDrawer;
    const cartItemsElement = elements.cartItems;

    if (!drawer || !cartItemsElement) return;

    // Hindari memasang komponen dua kali.
    if (document.querySelector('#customerCartEnhancements')) {
      return;
    }

    // -------------------------------------------------------
    // 1. FREE SHIPPING PROGRESS
    // -------------------------------------------------------

    const enhancements = document.createElement('section');
    enhancements.id = 'customerCartEnhancements';
    enhancements.className = 'customer-cart-enhancements';

    enhancements.innerHTML = `
      <section
        class="shipping-progress-card"
        aria-live="polite"
        aria-atomic="true"
      >
        <div class="shipping-progress-heading">
          <span class="shipping-progress-icon" aria-hidden="true">✦</span>

          <div>
            <strong class="shipping-progress-title">
              Kejar gratis ongkir
            </strong>

            <p class="shipping-progress-message"></p>
          </div>
        </div>

        <div
          class="shipping-progress-track"
          role="progressbar"
          aria-label="Progres menuju gratis ongkir"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="0"
        >
          <span class="shipping-progress-fill"></span>
        </div>

        <div class="shipping-progress-footer">
          <span class="shipping-progress-current"></span>
          <span class="shipping-progress-target"></span>
        </div>
      </section>
    `;

    drawer.insertBefore(enhancements, cartItemsElement);

    // -------------------------------------------------------
    // 2. PRODUCT RECOMMENDATIONS
    // -------------------------------------------------------

    const recommendations = document.createElement('section');
    recommendations.id = 'customerCartRecommendations';
    recommendations.className = 'customer-cart-recommendations';

    recommendations.innerHTML = `
      <div class="cart-recommendations-heading">
        <div>
          <span class="cart-recommendations-eyebrow">
            MUNGKIN KAMU SUKA
          </span>

          <h3>Lengkapi belanjamu</h3>
        </div>

        <span class="cart-recommendations-count"></span>
      </div>

      <div class="cart-recommendations-list"></div>
    `;

    cartItemsElement.insertAdjacentElement(
      'afterend',
      recommendations
    );

    // -------------------------------------------------------
    // 3. UPDATE SHIPPING PROGRESS
    // -------------------------------------------------------

    function updateShippingProgress() {
      const progressCard = enhancements.querySelector(
        '.shipping-progress-card'
      );

      const message = enhancements.querySelector(
        '.shipping-progress-message'
      );

      const fill = enhancements.querySelector(
        '.shipping-progress-fill'
      );

      const track = enhancements.querySelector(
        '.shipping-progress-track'
      );

      const current = enhancements.querySelector(
        '.shipping-progress-current'
      );

      const target = enhancements.querySelector(
        '.shipping-progress-target'
      );

      const entries = cartEntries();

      const subtotal = entries.reduce(
        (sum, entry) => (
          sum +
          Number(entry.product.price) * entry.quantity
        ),
        0
      );

      if (entries.length === 0) {
        progressCard.hidden = true;
        return;
      }

      progressCard.hidden = false;

      const threshold = CUSTOMER_FREE_SHIPPING_THRESHOLD;

      const percentage = Math.min(
        100,
        Math.round((subtotal / threshold) * 100)
      );

      const remaining = Math.max(
        0,
        threshold - subtotal
      );

      fill.style.width = `${percentage}%`;

      track.setAttribute(
        'aria-valuenow',
        String(percentage)
      );

      current.textContent = formatPrice(subtotal);
      target.textContent = formatPrice(threshold);

      if (subtotal >= threshold) {
        progressCard.classList.add('is-qualified');

        message.textContent =
          'Kamu sudah mencapai ambang gratis ongkir!';

        fill.style.width = '100%';
      } else {
        progressCard.classList.remove('is-qualified');

        message.textContent =
          `Belanja ${formatPrice(remaining)} lagi untuk mencapai ambang gratis ongkir.`;
      }
    }

    // -------------------------------------------------------
    // 4. RENDER PRODUCT RECOMMENDATIONS
    // -------------------------------------------------------

    function renderCartRecommendations() {
      const list = recommendations.querySelector(
        '.cart-recommendations-list'
      );

      const count = recommendations.querySelector(
        '.cart-recommendations-count'
      );

      const entries = cartEntries();

      if (entries.length === 0 || products.length === 0) {
        recommendations.hidden = true;
        return;
      }

      const cartIds = new Set(
        entries.map(({ product }) => String(product.id))
      );

      const cartCategoryIds = new Set(
        entries
          .map(({ product }) => productCategoryId(product))
          .filter(Boolean)
      );

      const availableProducts = products.filter(
        (product) =>
          !cartIds.has(String(product.id)) &&
          productStock(product) > 0
      );

      // Prioritaskan kategori yang sama, lalu rating.
      const suggested = availableProducts
        .map((product) => ({
          product,
          sameCategory: cartCategoryIds.has(
            productCategoryId(product)
          ),
          rating: Number(product.averageRating) || 0,
          reviews: Number(product.reviewCount) || 0,
        }))
        .sort((a, b) => (
          Number(b.sameCategory) - Number(a.sameCategory) ||
          b.rating - a.rating ||
          b.reviews - a.reviews
        ))
        .slice(0, 3)
        .map((entry) => entry.product);

      if (suggested.length === 0) {
        recommendations.hidden = true;
        return;
      }

      recommendations.hidden = false;

      count.textContent = `${suggested.length} pilihan`;

      list.replaceChildren();

      suggested.forEach((product) => {
        const card = document.createElement('article');

        card.className = 'cart-recommendation-item';

        const imageContainer = document.createElement('div');
        imageContainer.className = 'cart-recommendation-image';

        if (product.imageUrl) {
          const image = document.createElement('img');

          image.src = product.imageUrl;
          image.alt = product.name || 'Produk';
          image.loading = 'lazy';
          image.decoding = 'async';
          image.referrerPolicy = 'no-referrer';

          image.addEventListener(
            'error',
            () => image.remove(),
            { once: true }
          );

          imageContainer.append(image);
        } else {
          imageContainer.textContent = '✳';
          imageContainer.setAttribute('aria-hidden', 'true');
        }

        const details = document.createElement('div');
        details.className = 'cart-recommendation-details';

        const category = document.createElement('small');
        category.textContent = productCategoryName(product);

        const name = document.createElement('strong');
        name.textContent = product.name || 'Produk ShopSphere';

        const price = document.createElement('span');
        price.textContent = formatPrice(product.price);

        details.append(category, name, price);

        const addButton = document.createElement('button');

        addButton.type = 'button';
        addButton.className = 'cart-recommendation-add';
        addButton.textContent = '+';
        addButton.dataset.cartRecommendation =
          String(product.id);

        addButton.setAttribute(
          'aria-label',
          `Tambahkan ${product.name || 'produk'} ke keranjang`
        );

        card.append(imageContainer, details, addButton);
        list.append(card);
      });
    }

    // -------------------------------------------------------
    // 5. EVENTS
    // -------------------------------------------------------

    recommendations.addEventListener('click', (event) => {
      const button = event.target.closest(
        '[data-cart-recommendation]'
      );

      if (!button) return;

      const product = products.find(
        (item) =>
          String(item.id) === button.dataset.cartRecommendation
      );

      if (!product) {
        showToast('Produk tidak ditemukan.');
        return;
      }

      if (productStock(product) <= 0) {
        showToast('Stok produk sedang habis.');
        return;
      }

      addProductToCart(product);

      // Render keranjang asli akan berjalan melalui saveCart().
      // Perbarui rekomendasi juga untuk memastikan isinya aktual.
      renderCartRecommendations();
      updateShippingProgress();
    });

    // Pantau perubahan daftar keranjang dari renderCart().
    const cartObserver = new MutationObserver(() => {
      updateShippingProgress();
      renderCartRecommendations();
    });

    cartObserver.observe(cartItemsElement, {
      childList: true,
      subtree: true,
    });

    // Simpan observer di elemen agar bisa dilepas bila diperlukan.
    enhancements._cartObserver = cartObserver;

    updateShippingProgress();
    renderCartRecommendations();
  }

  // =========================================================
  // BACK TO TOP
  // =========================================================

  function initializeBackToTop() {
    if (document.querySelector('#customerBackToTop')) {
      return;
    }

    const button = document.createElement('button');

    button.id = 'customerBackToTop';
    button.className = 'customer-back-to-top';
    button.type = 'button';
    button.textContent = '↑';

    button.setAttribute('aria-label', 'Kembali ke bagian atas');
    button.title = 'Kembali ke atas';

    document.body.append(button);

    function updateVisibility() {
      button.classList.toggle(
        'is-visible',
        window.scrollY > 450
      );
    }

    window.addEventListener(
      'scroll',
      updateVisibility,
      { passive: true }
    );

    button.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia(
          '(prefers-reduced-motion: reduce)'
        ).matches
          ? 'auto'
          : 'smooth',
      });
    });

    updateVisibility();
  }

  const customerCompareIds = new Set();
  let customerCatalogView = 'grid';
  
  // =========================================================
  // INITIALIZE CUSTOMER EXPERIENCE
  // =========================================================

  initializeBackToTop();

  
  
  function ensureCustomerEnhancementStylesAndUi() {
    // Ambil UI yang sudah ada agar tidak membuat elemen duplikat.
    let ui = document.querySelector('#customerEnhancementUi');

    if (!ui) {
      ui = document.createElement('div');
      ui.id = 'customerEnhancementUi';

      ui.innerHTML = `
        <div class="customer-reading-progress" aria-hidden="true">
          <span></span>
        </div>

        <button
          class="customer-help-launcher"
          type="button"
          aria-expanded="false"
          aria-controls="customerHelpPanel"
        >
          <span aria-hidden="true">?</span>
          <span>Bantuan</span>
        </button>

        <section
          class="customer-help-panel"
          id="customerHelpPanel"
          aria-label="Pusat bantuan"
          hidden
        >
          <header>
            <div>
              <small>SHOPSPHERE CARE</small>
              <h2>Butuh bantuan?</h2>
              <p>Pilih topik untuk menemukan langkah berikutnya.</p>
            </div>
            <button type="button" data-help-close aria-label="Tutup bantuan">
              ×
            </button>
          </header>

          <label class="customer-help-search-label" for="customerHelpSearch">
            Cari bantuan
          </label>

          <input
            id="customerHelpSearch"
            type="search"
            placeholder="Contoh: pesanan, keranjang…"
            autocomplete="off"
          />

          <div class="customer-help-links">
            <button type="button" data-help-topic="order">
              <span>▤</span>
              <span>
                <strong>Pesanan saya</strong>
                <small>Lihat status dan riwayat pesanan</small>
              </span>
              <b>↗</b>
            </button>

            <button type="button" data-help-topic="cart">
              <span>♧</span>
              <span>
                <strong>Keranjang belanja</strong>
                <small>Periksa barang sebelum checkout</small>
              </span>
              <b>↗</b>
            </button>

            <button type="button" data-help-topic="search">
              <span>⌕</span>
              <span>
                <strong>Cari produk</strong>
                <small>Temukan produk dengan cepat</small>
              </span>
              <b>↗</b>
            </button>
          </div>

          <div class="customer-help-answer" aria-live="polite">
            Pilih salah satu topik di atas atau cari kata kunci bantuan.
          </div>

          <p class="customer-help-footnote">
            Bantuan ini menampilkan panduan navigasi. Untuk informasi pesanan
            terbaru, cek langsung di akunmu.
          </p>
        </section>

        <div class="customer-compare-dock" hidden aria-live="polite">
          <span>
            <strong class="customer-compare-count">0</strong>
            produk dipilih
          </span>
          <button type="button" data-compare-open>Bandingkan</button>
          <button
            type="button"
            data-compare-clear
            aria-label="Kosongkan pilihan"
          >
            Hapus
          </button>
        </div>

        <dialog
          class="customer-compare-dialog"
          id="customerCompareDialog"
          aria-labelledby="customerCompareTitle"
        >
          <div class="customer-compare-dialog-head">
            <div>
              <small>SHOP SMARTER</small>
              <h2 id="customerCompareTitle">Bandingkan produk</h2>
              <p>Periksa perbedaan sebelum menentukan pilihan.</p>
            </div>
            <button
              type="button"
              data-compare-close
              aria-label="Tutup"
            >
              ×
            </button>
          </div>

          <div
            class="customer-compare-table-wrap"
            data-compare-table
          ></div>

          <div class="customer-compare-dialog-foot">
            <span>Harga dan stok dapat berubah mengikuti data toko.</span>
            <button type="button" data-compare-close>Selesai</button>
          </div>
        </dialog>
      `;
    }

    // Pastikan UI menjadi anak langsung dari body.
    // Ini juga memperbaiki UI lama yang terlanjur berada di dalam elemen lain.
    if (ui.parentElement !== document.body) {
      document.body.appendChild(ui);
    }

    // Buat toolbar katalog hanya jika belum ada.
    if (
      !document.querySelector('#customerCatalogToolbar') &&
      elements.productGrid &&
      elements.productGrid.parentNode
    ) {
      const toolbar = document.createElement('div');
      toolbar.id = 'customerCatalogToolbar';
      toolbar.className = 'customer-catalog-toolbar';

      toolbar.innerHTML = `
        <div class="catalog-toolbar-info">
          <span class="catalog-toolbar-icon" aria-hidden="true">▦</span>
          <div class="catalog-toolbar-text">
            <strong>Tampilan produk</strong>
            <span>Pilih cara melihat katalog</span>
          </div>
        </div>

        <div
          class="catalog-view-switch"
          role="group"
          aria-label="Tampilan katalog"
        >
          <button
            type="button"
            class="catalog-view-button is-active"
            data-catalog-view="grid"
            aria-pressed="true"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/>
              <rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/>
              <rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/>
              <rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>
            </svg>
            <span>Grid</span>
          </button>

          <button
            type="button"
            class="catalog-view-button"
            data-catalog-view="list"
            aria-pressed="false"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 6h11M9 12h11M9 18h11"/>
              <circle cx="4.5" cy="6" r="1"/>
              <circle cx="4.5" cy="12" r="1"/>
              <circle cx="4.5" cy="18" r="1"/>
            </svg>
            <span>Daftar</span>
          </button>
        </div>
      `;

      elements.productGrid.parentNode.insertBefore(
        toolbar,
        elements.productGrid
      );
    }
  }


  
  
  function updateCustomerCompareUi() {
    const dock = document.querySelector(
      '#customerEnhancementUi .customer-compare-dock'
    );

    if (!dock) return;

    // Perbarui jumlah produk yang dipilih.
    const count = dock.querySelector('.customer-compare-count');

    if (count) {
      count.textContent = String(customerCompareIds.size);
    }

    // Sembunyikan dock jika belum ada produk yang dipilih.
    dock.hidden = customerCompareIds.size === 0;

    // Perbarui status tombol bandingkan pada setiap kartu produk.
    document.querySelectorAll('[data-compare-product]').forEach((button) => {
      const id = String(button.dataset.compareProduct);
      const selected = customerCompareIds.has(id);

      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-selected', selected);

      button.innerHTML = selected
        ? `
          <span class="compare-product-icon" aria-hidden="true">✓</span>
          <span class="compare-product-label">Dipilih</span>
        `
        : `
          <span class="compare-product-icon" aria-hidden="true">＋</span>
          <span class="compare-product-label">Bandingkan</span>
        `;
    });
  }


  function renderCustomerComparison() {
    const dialog = document.querySelector('#customerCompareDialog');
    const target = dialog?.querySelector('[data-compare-table]');
    if (!target) return;

    const selected = [...customerCompareIds]
      .map((id) => products.find((product) => String(product.id) === id))
      .filter(Boolean);

    if (selected.length < 2) {
      target.innerHTML = `
        <div class="customer-compare-empty">
          <strong>Pilih minimal 2 produk</strong>
          <p>Tambahkan produk dari katalog untuk melihat perbandingannya.</p>
        </div>`;
      return;
    }

    const rows = [
      ['Kategori', (p) => productCategoryName(p) || '—'],
      ['Harga', (p) => formatPrice(p.price)],
      ['Ketersediaan', (p) =>
        productStock(p) > 0 ? `${productStock(p)} tersedia` : 'Stok habis'],
      ['Rating', (p) =>
        Number(p.reviewCount) > 0
          ? `${(Number(p.averageRating) || 0).toFixed(1)} / 5`
          : 'Belum ada ulasan'],
      ['Jumlah ulasan', (p) => String(Number(p.reviewCount) || 0)],
      ['Deskripsi', (p) => p.description || 'Tidak ada deskripsi']
    ];

    target.innerHTML = `
      <table class="customer-compare-table">
        <thead>
          <tr>
            <th>Detail</th>
            ${selected.map((p) => `
              <th>
                <div class="customer-compare-product-name">
                  ${escapeHtml(p.name || 'Produk')}
                </div>
                <strong>${formatPrice(p.price)}</strong>
                <button type="button" data-compare-remove="${Number(p.id)}">
                  Hapus
                </button>
              </th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(([label, getter]) => `
            <tr>
              <th scope="row">${label}</th>
              ${selected.map((p) => `
                <td>${escapeHtml(String(getter(p)))}</td>`).join('')}
            </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function toggleCustomerCompare(id) {
    const key = String(id);

    if (customerCompareIds.has(key)) {
      customerCompareIds.delete(key);
    } else if (customerCompareIds.size >= 3) {
      showToast('Maksimal 3 produk dapat dibandingkan sekaligus.');
      return;
    } else {
      customerCompareIds.add(key);
    }

    updateCustomerCompareUi();
  }

  function initializeCustomerHelp() {
    const launcher = document.querySelector('.customer-help-launcher');
    const panel = document.querySelector('.customer-help-panel');
    const search = document.querySelector('#customerHelpSearch');
    const answer = document.querySelector('.customer-help-answer');

    if (!launcher || !panel || !search || !answer) {
      return;
    }
    const helpContent = [
      {
        keys: ['pesanan', 'order', 'status', 'riwayat'],
        title: 'Pesanan saya',
        text: 'Gunakan menu riwayat pesanan untuk memeriksa detail, status, invoice, dan tindakan yang tersedia untuk pesananmu.'
      },
      {
        keys: ['keranjang', 'cart', 'checkout', 'bayar'],
        title: 'Keranjang dan checkout',
        text: 'Buka keranjang untuk mengubah jumlah atau menghapus barang. Periksa alamat dan ringkasan pesanan sebelum checkout.'
      },
      {
        keys: ['cari', 'produk', 'search', 'kategori'],
        title: 'Mencari produk',
        text: 'Gunakan kolom pencarian, filter kategori, rentang harga, rating, atau urutan produk.'
      },
      {
        keys: ['favorit', 'wishlist', 'simpan'],
        title: 'Produk favorit',
        text: 'Tekan ikon hati pada kartu produk untuk menyimpan atau menghapusnya dari daftar favorit.'
      },
      {
        keys: ['akun', 'login', 'masuk', 'daftar'],
        title: 'Akun pelanggan',
        text: 'Masuk atau buat akun melalui proses autentikasi toko. Jangan bagikan kata sandi atau kode autentikasi.'
      }
    ];

    const setHelpOpen = (open) => {
      panel.hidden = !open;
      launcher.setAttribute('aria-expanded', String(open));
      launcher.classList.toggle('is-open', open);
      if (open) search.focus();
    };

    launcher.addEventListener('click', () => setHelpOpen(panel.hidden));
    panel.querySelector('[data-help-close]').addEventListener('click', () => setHelpOpen(false));

    panel.querySelectorAll('[data-help-topic]').forEach((button) => {
      button.addEventListener('click', () => {
        const topic = button.dataset.helpTopic;

        if (topic === 'order') {
          elements.customerOrdersTrigger?.click();
          answer.textContent = 'Riwayat pesanan dibuka jika fitur tersedia di akunmu.';
        } else if (topic === 'cart') {
          elements.cartTrigger?.click();
          answer.textContent = 'Periksa jumlah, subtotal, biaya pengiriman, dan total keranjang.';
        } else {
          elements.searchInput?.focus();
          document.querySelector('#catalog')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          answer.textContent = 'Kolom pencarian siap digunakan.';
        }

        setHelpOpen(false);
      });
    });

    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase();

      if (!query) {
        answer.textContent = 'Pilih salah satu topik atau cari kata kunci bantuan.';
        panel.querySelectorAll('[data-help-topic]').forEach((button) => {
          button.hidden = false;
        });
        return;
      }

      const match = helpContent.find((item) =>
        item.keys.some((key) => key.includes(query) || query.includes(key)) ||
        item.title.toLowerCase().includes(query)
      );

      panel.querySelectorAll('[data-help-topic]').forEach((button) => {
        const topic = button.dataset.helpTopic;
        button.hidden = !(
          (topic === 'order' && /pesanan|order|status|riwayat/.test(query)) ||
          (topic === 'cart' && /keranjang|cart|checkout|bayar/.test(query)) ||
          (topic === 'search' && /cari|produk|search|kategori/.test(query))
        );
      });

      answer.textContent = match
        ? `${match.title}: ${match.text}`
        : 'Belum ada panduan yang cocok. Coba “pesanan”, “keranjang”, “produk”, “favorit”, atau “akun”.';
    });
  }

  
  function initializeCustomerScrollHelpers() {
    const progress = document.querySelector(
      '#customerEnhancementUi .customer-reading-progress span'
    );

    if (!progress) return;

    // Hindari mendaftarkan listener yang sama berulang kali.
    if (initializeCustomerScrollHelpers.initialized) {
      updateProgress();
      return;
    }

    function updateProgress() {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;

      const ratio =
        scrollable > 0
          ? window.scrollY / scrollable
          : 0;

      progress.style.width = `${Math.min(
        100,
        Math.max(0, ratio * 100)
      )}%`;
    }

    window.addEventListener('scroll', updateProgress, {
      passive: true
    });

    window.addEventListener('resize', updateProgress, {
      passive: true
    });

    initializeCustomerScrollHelpers.initialized = true;

    updateProgress();
  }


  function initializeCustomerComparison() {
    const dialog = document.querySelector('#customerCompareDialog');

    elements.productGrid.addEventListener('click', (event) => {
      const button = event.target.closest('[data-compare-product]');
      if (button) toggleCustomerCompare(button.dataset.compareProduct);
    });

    document.querySelector('#customerEnhancementUi').addEventListener('click', (event) => {
      const remove = event.target.closest('[data-compare-remove]');

      if (remove) {
        customerCompareIds.delete(String(remove.dataset.compareRemove));
        updateCustomerCompareUi();
        renderCustomerComparison();
      }

      if (event.target.closest('[data-compare-open]')) {
        if (customerCompareIds.size < 2) {
          showToast('Pilih minimal 2 produk untuk membandingkan.');
          return;
        }

        renderCustomerComparison();
        dialog.showModal();
      }

      if (event.target.closest('[data-compare-clear]')) {
        customerCompareIds.clear();
        updateCustomerCompareUi();
      }

      if (event.target.closest('[data-compare-close]')) {
        dialog.close();
      }
    });

    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });

    document.querySelector('#customerCatalogToolbar')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-catalog-view]');
      if (!button) return;

      customerCatalogView = button.dataset.catalogView;
      elements.productGrid.classList.toggle(
        'customer-product-list-view',
        customerCatalogView === 'list'
      );

      document.querySelectorAll('[data-catalog-view]').forEach((item) => {
        const isActive = item === button;

        item.setAttribute('aria-pressed', String(isActive));
        item.classList.toggle('is-active', isActive);
      });
    });

    updateCustomerCompareUi();
  }

  function initializeCustomerEnhancements() {
    ensureCustomerEnhancementStylesAndUi();

    initializeCustomerHelp();
    initializeCustomerScrollHelpers();
    initializeCustomerComparison();

    document.addEventListener('keydown', (event) => {
      const tag = document.activeElement?.tagName || '';
      const typing = /INPUT|TEXTAREA|SELECT/.test(tag) ||
        document.activeElement?.isContentEditable;

      if (typing || event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === '?') {
        event.preventDefault();
        document.querySelector('.customer-help-launcher')?.click();
      } else if (event.key === '/') {
        event.preventDefault();
        elements.searchInput?.focus();
      }
    });
  }

  initializeCustomerEnhancements();

  function scheduleReviewSave({
  productId,
  rating,
  comment,
  token,
  endpoint,
  statusElement,
}) {
  const key = String(productId);

  // Batalkan timer sebelumnya agar tidak menyimpan setiap karakter.
  clearTimeout(reviewSaveTimers.get(key));

  if (statusElement) {
    statusElement.textContent = 'Perubahan belum disimpan';
  }

  reviewSaveTimers.set(
    key,
    setTimeout(async () => {
      // Ambil nilai terbaru setelah pengguna berhenti mengetik.
      const payload = {
        rating: Number(rating),
        comment: comment.trim(),
      };

      if (!Number.isInteger(payload.rating) ||
          payload.rating < 1 ||
          payload.rating > 5) {
        if (statusElement) {
          statusElement.textContent = 'Pilih rating 1–5 terlebih dahulu';
        }
        return;
      }

      try {
        if (statusElement) {
          statusElement.textContent = 'Menyimpan...';
        }

        const previousRequest = reviewSaveRequests.get(key);
        if (previousRequest) {
          previousRequest.abort();
        }

        const controller = new AbortController();
        reviewSaveRequests.set(key, controller);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(
            error.message || 'Ulasan gagal disimpan.',
          );
        }

        if (statusElement) {
          statusElement.textContent = 'Ulasan tersimpan otomatis';
        }
      } catch (error) {
        if (error.name === 'AbortError') return;

        if (statusElement) {
          statusElement.textContent =
            error.message || 'Gagal menyimpan ulasan';
        }
      }
    }, 800),
  );
}

commentInput.addEventListener('input', () => {
  scheduleReviewSave({
    productId,
    rating: ratingInput.value,
    comment: commentInput.value,
    token,
    endpoint: reviewEndpoint,
    statusElement: reviewStatus,
  });
});

ratingInput.addEventListener('change', () => {
  scheduleReviewSave({
    productId,
    rating: ratingInput.value,
    comment: commentInput.value,
    token,
    endpoint: reviewEndpoint,
    statusElement: reviewStatus,
  });
});

})();
