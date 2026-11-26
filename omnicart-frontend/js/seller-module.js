
const SellerModule = {
  authMode: 'login',
  currentTab: 'inventory',
  orderFilter: 'all',

  async init() {
    const hash = window.location.hash.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (hash === '#manifest' || tabParam === 'manifest' || hash === '#orders' || tabParam === 'orders') {
      this.currentTab = 'manifest';
    } else {
      this.currentTab = 'inventory';
    }
    if (DataStore.currentSeller) {
      if (DataStore.currentUserRole !== 'seller') {
        DataStore.currentUserRole = 'seller';
        localStorage.setItem('omnicart_role', 'seller');
      }
      try {
        await Promise.all([
          DataStore.syncBackendCatalog(),
          DataStore.syncSellerProfile(),
          DataStore.fetchSellerOrders()
        ]);
      } catch (_) { }
    }
    this.render();
  },

  setAuthMode(mode) {
    this.authMode = mode;
    this.renderAuthForm();
  },

  switchTab(tabName) {
    this.currentTab = tabName;
    const invBtn = document.getElementById('tab-btn-inventory');
    const manBtn = document.getElementById('tab-btn-manifest');
    const invPane = document.getElementById('pane-inventory');
    const manPane = document.getElementById('pane-manifest');

    if (tabName === 'inventory') {
      if (invPane) invPane.classList.remove('hidden');
      if (manPane) manPane.classList.add('hidden');
      if (invBtn) {
        invBtn.classList.add('active');
        const svg = invBtn.querySelector('svg');
        if (svg) svg.setAttribute('class', 'w-4 h-4 text-[#c8a96e]');
      }
      if (manBtn) {
        manBtn.classList.remove('active');
        const svg = manBtn.querySelector('svg');
        if (svg) svg.setAttribute('class', 'w-4 h-4 text-[#9a9188]');
      }
    } else {
      if (manPane) manPane.classList.remove('hidden');
      if (invPane) invPane.classList.add('hidden');
      if (manBtn) {
        manBtn.classList.add('active');
        const svg = manBtn.querySelector('svg');
        if (svg) svg.setAttribute('class', 'w-4 h-4 text-[#c8a96e]');
      }
      if (invBtn) {
        invBtn.classList.remove('active');
        const svg = invBtn.querySelector('svg');
        if (svg) svg.setAttribute('class', 'w-4 h-4 text-[#9a9188]');
      }
      this.renderSellerOrders();
    }
  },

  setOrderFilter(filter) {
    this.orderFilter = filter;
    ['all', 'active', 'pending-payment', 'delivered', 'cancelled'].forEach(f => {
      const btn = document.getElementById(`order-filter-${f}`);
      if (btn) {
        if (f === filter) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });
    this.renderSellerOrders();
  },

  async render() {
    const authContainer = document.getElementById('seller-auth-container');
    const dashboardContainer = document.getElementById('seller-dashboard-container');

    if (!DataStore.currentSeller) {
      if (authContainer) authContainer.classList.remove('hidden');
      if (dashboardContainer) dashboardContainer.classList.add('hidden');
      this.renderAuthForm();
      return;
    }

    if (DataStore.currentUserRole !== 'seller') {
      DataStore.currentUserRole = 'seller';
      localStorage.setItem('omnicart_role', 'seller');
    }

    if (authContainer) authContainer.classList.add('hidden');
    if (dashboardContainer) dashboardContainer.classList.remove('hidden');

    const seller = DataStore.currentSeller;
    const nameElem = document.getElementById('seller-company-title') || document.getElementById('seller-store-name');
    const gstinElem = document.getElementById('seller-gstin-badge') || document.getElementById('seller-store-gstin');
    const emailElem = document.getElementById('seller-email-badge');
    const phoneElem = document.getElementById('seller-phone-badge');

    if (nameElem) nameElem.innerText = seller.CompanyName || 'Merchant Partner';
    if (gstinElem) gstinElem.innerText = `GSTIN: ${seller.gstin || '29ABCDE1234F1Z5'}`;
    if (emailElem) emailElem.innerText = seller.email || 'partner@omnicart.luxury';
    if (phoneElem) phoneElem.innerText = seller.phone || '+91 800 555 1010';

    this.renderKPIMetrics();
    this.renderInventoryTable();
    this.renderSellerOrders();
    this.switchTab(this.currentTab);
  },

  renderAuthForm() {
    const box = document.getElementById('seller-auth-form-box');
    const loginTab = document.getElementById('seller-tab-login');
    const regTab = document.getElementById('seller-tab-register');

    if (this.authMode === 'login') {
      if (loginTab) loginTab.className = 'py-2 rounded font-semibold transition-all bg-[#1a1714] text-[#c8a96e] border border-[#c8a96e]/30';
      if (regTab) regTab.className = 'py-2 rounded font-medium transition-all text-[#9a9188] hover:text-[#e8e2d9]';

      if (box) {
        box.innerHTML = `
          <form onsubmit="SellerModule.handleLogin(event)" class="space-y-4 text-xs" autocomplete="off" autocorrect="off" autocapitalize="off">
            <div>
              <label class="block font-semibold text-[#9a9188] mb-1">Merchant Store Email or Phone</label>
              <input
                type="text"
                id="sell-login-id"
                required
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                data-lpignore="true"
                placeholder="seller@store.in or +91 98765 43210"
                class="clean-input text-xs"
              />
            </div>
            <div>
              <label class="block font-semibold text-[#9a9188] mb-1">Merchant Password</label>
              <input
                type="password"
                id="sell-login-pw"
                required
                autocomplete="new-password"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                data-lpignore="true"
                placeholder="••••••••"
                class="clean-input text-xs"
              />
            </div>
            <div class="flex items-center justify-between pt-1">
              <label class="flex items-center gap-2 text-[11px] text-[#9a9188] cursor-pointer select-none">
                <input type="checkbox" id="sell-remember" class="accent-[#c8a96e] w-3.5 h-3.5 cursor-pointer" />
                <span>Save login details on this device</span>
              </label>
            </div>
            <button type="submit" class="btn-primary w-full py-2.5 text-xs justify-center font-bold cursor-pointer">
              Access Merchant Center →
            </button>
          </form>
        `;
      }
    } else {
      if (regTab) regTab.className = 'py-2 rounded font-semibold transition-all bg-[#1a1714] text-[#c8a96e] border border-[#c8a96e]/30';
      if (loginTab) loginTab.className = 'py-2 rounded font-medium transition-all text-[#9a9188] hover:text-[#e8e2d9]';

      if (box) {
        box.innerHTML = `
          <form onsubmit="SellerModule.handleRegister(event)" class="space-y-3 text-xs" autocomplete="off" autocorrect="off" autocapitalize="off">
            <div>
              <label class="block font-semibold text-[#9a9188] mb-1">Enterprise / Store Name</label>
              <input type="text" id="sell-reg-name" required autocomplete="off" placeholder="e.g. Apex Hardware Pvt Ltd" class="clean-input text-xs" />
            </div>
            <div>
              <label class="block font-semibold text-[#9a9188] mb-1">GSTIN Number (15-digit)</label>
              <input type="text" id="sell-reg-gstin" required autocomplete="off" placeholder="29ABCDE1234F1Z5" class="clean-input text-xs uppercase" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold text-[#9a9188] mb-1">Official Business Email</label>
                <input type="email" id="sell-reg-email" required autocomplete="off" placeholder="orders@company.in" class="clean-input text-xs" />
              </div>
              <div>
                <label class="block font-semibold text-[#9a9188] mb-1">Contact Phone</label>
                <input type="tel" id="sell-reg-phone" required autocomplete="off" placeholder="+91 800 555 1010" class="clean-input text-xs" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold text-[#9a9188] mb-1">City</label>
                <input type="text" id="sell-reg-city" required autocomplete="off" placeholder="e.g. Bengaluru" class="clean-input text-xs" />
              </div>
              <div>
                <label class="block font-semibold text-[#9a9188] mb-1">State</label>
                <input type="text" id="sell-reg-state" required autocomplete="off" placeholder="e.g. Karnataka" class="clean-input text-xs" />
              </div>
            </div>
            <div>
              <label class="block font-semibold text-[#9a9188] mb-1">Password</label>
              <input type="password" id="sell-reg-pw" required autocomplete="new-password" placeholder="Set merchant password" class="clean-input text-xs" />
            </div>
            <button type="submit" class="btn-primary w-full py-2.5 text-xs justify-center font-bold cursor-pointer">
              Register Merchant Store →
            </button>
          </form>
        `;
      }
    }

    if (box && window.UIModule && typeof window.UIModule.initPasswordToggles === 'function') {
      window.UIModule.initPasswordToggles(box);
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const idInput = document.getElementById('sell-login-id');
    const pwInput = document.getElementById('sell-login-pw');
    const remember = document.getElementById('sell-remember')?.checked || false;
    const id = idInput ? idInput.value.trim() : '';
    const pw = pwInput ? pwInput.value : '';

    if (window.UIModule && window.UIModule.setButtonLoading) {
      window.UIModule.setButtonLoading(submitBtn, true, 'Signing in...');
    }

    try {
      const seller = await DataStore.loginSeller(id, pw, remember);
      try {
        await DataStore.fetchSellerOrders();
      } catch (_) { }
      if (pwInput) pwInput.value = '';
      if (idInput && !remember) idInput.value = '';
      UIModule.showToast(`Authenticated: ${seller.CompanyName}`, 'success');
      UIModule.renderHeader();
      this.render();
    } catch (err) {
      if (pwInput) pwInput.value = '';
      UIModule.showToast(err.message || 'Invalid merchant credentials.', 'error');
    } finally {
      if (window.UIModule && window.UIModule.setButtonLoading) {
        window.UIModule.setButtonLoading(submitBtn, false);
      }
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const name = document.getElementById('sell-reg-name').value.trim();
    const gstin = document.getElementById('sell-reg-gstin').value.trim();
    const email = document.getElementById('sell-reg-email').value.trim();
    const phone = document.getElementById('sell-reg-phone')?.value.trim() || '+91 800 555 1010';
    const city = document.getElementById('sell-reg-city')?.value.trim() || 'Bengaluru';
    const state = document.getElementById('sell-reg-state')?.value.trim() || 'Karnataka';
    const pw = document.getElementById('sell-reg-pw').value;

    if (window.UIModule && window.UIModule.setButtonLoading) {
      window.UIModule.setButtonLoading(submitBtn, true, 'Registering store...');
    }

    try {
      const seller = await DataStore.registerSeller({
        companyName: name,
        gstin: gstin,
        email: email,
        phone: phone,
        city: city,
        state: state,
        password: pw
      });

      UIModule.showToast(`Merchant Store Registered: ${seller.CompanyName}`, 'success');
      UIModule.renderHeader();
      this.render();
    } catch (err) {
      UIModule.showToast(err.message || 'Merchant registration failed.', 'error');
    } finally {
      if (window.UIModule && window.UIModule.setButtonLoading) {
        window.UIModule.setButtonLoading(submitBtn, false);
      }
    }
  },

  getSellerProducts() {
    const seller = DataStore.currentSeller;
    if (!seller) return [];
    const sellerId = Number(seller.id);

    return DataStore.products.filter(p => {
      if (Number(p.sellerId) === sellerId) return true;
      if (Array.isArray(p.sellerIds) && p.sellerIds.map(Number).includes(sellerId)) return true;
      if (p.sellerStock && p.sellerStock[sellerId] !== undefined) return true;
      return false;
    });
  },

  getSellerOrderStatus(order, sellerId) {
    if (!order) return 'ORDER_PLACED';
    const sId = Number(sellerId);
    const allItems = Array.isArray(order.items) ? order.items : [];
    const myItems = allItems.filter(item => {
      const prod = (DataStore.products || []).find(p => Number(p.id) === Number(item.productId || item.id) || p.name === item.name);
      const itemSellerId = (item.sellerId !== undefined && item.sellerId !== null)
        ? Number(item.sellerId)
        : (prod ? Number(prod.sellerId) : null);
      return itemSellerId === sId;
    });

    if (myItems.length === 0) {
      return String(order.shippingStatus || 'ORDER_PLACED').toUpperCase();
    }

    const myStatuses = myItems.map(it => String(it.status || order.shippingStatus || 'ORDER_PLACED').toUpperCase());
    const allCancelled = myStatuses.every(s => s === 'CANCELLED');
    if (allCancelled) return 'CANCELLED';

    const nonCancelled = myStatuses.filter(s => s !== 'CANCELLED');
    if (nonCancelled.length === 0) return 'CANCELLED';

    const allDelivered = nonCancelled.every(s => s === 'DELIVERED');
    if (allDelivered) return 'DELIVERED';

    if (nonCancelled.some(s => s === 'OUT_FOR_DELIVERY' || s === 'IN TRANSIT')) return 'OUT_FOR_DELIVERY';
    if (nonCancelled.some(s => s === 'SHIPPED')) return 'SHIPPED';
    if (nonCancelled.some(s => s === 'PROCESSING')) return 'PROCESSING';

    return 'ORDER_PLACED';
  },

  getSellerOrders() {
    const seller = DataStore.currentSeller;
    if (!seller) return [];
    const sellerId = Number(seller.id);

    const baseOrders = (Array.isArray(DataStore.sellerOrders) && DataStore.sellerOrders.length > 0)
      ? DataStore.sellerOrders
      : (DataStore.orders || []);

    return baseOrders.filter(o => {
      if (!Array.isArray(o.items) || o.items.length === 0) return false;
      return o.items.some(item => {
        const prod = (DataStore.products || []).find(p => Number(p.id) === Number(item.productId || item.id) || p.name === item.name);
        const itemSellerId = (item.sellerId !== undefined && item.sellerId !== null)
          ? Number(item.sellerId)
          : (prod ? Number(prod.sellerId) : null);
        return itemSellerId === sellerId;
      });
    });
  },

  renderKPIMetrics() {
    const revElem = document.getElementById('seller-kpi-revenue');
    const pendingElem = document.getElementById('seller-kpi-pending-payment');
    const pendingCountElem = document.getElementById('seller-kpi-pending-count');
    const unitsElem = document.getElementById('seller-kpi-units');
    const skusElem = document.getElementById('seller-kpi-skus');
    const alertsElem = document.getElementById('seller-kpi-alerts');

    const seller = DataStore.currentSeller;
    if (!seller) return;
    const sellerId = Number(seller.id);

    const myProducts = this.getSellerProducts();
    const myOrders = this.getSellerOrders();

    let receivedRevenue = 0;
    let pendingPaymentAmount = 0;
    let pendingOrdersCount = 0;
    let totalUnitsSold = 0;

    myOrders.forEach(o => {
      const rawStatus = this.getSellerOrderStatus(o, sellerId);
      if (rawStatus === 'CANCELLED') return;

      const isCod = String(o.paymentMethod || '').toLowerCase().includes('cash') || String(o.paymentMethod || '').toLowerCase().includes('cod');
      const isDelivered = rawStatus === 'DELIVERED';

      const myItems = (o.items || []).filter(item => {
        const prod = (DataStore.products || []).find(p => Number(p.id) === Number(item.productId || item.id) || p.name === item.name);
        const itemSellerId = (item.sellerId !== undefined && item.sellerId !== null)
          ? Number(item.sellerId)
          : (prod ? Number(prod.sellerId) : null);
        return itemSellerId === sellerId;
      });

      const storeSubtotal = myItems.reduce((acc, it) => {
        const price = Number(it.price || it.exactLedgerPrice || 0);
        const qty = Number(it.quantity || 1);
        return acc + (Number(it.lineTotal) || (price * qty));
      }, 0);

      myItems.forEach(item => {
        totalUnitsSold += (item.quantity || 1);
      });

      if (isCod && !isDelivered) {
        pendingPaymentAmount += storeSubtotal;
        pendingOrdersCount++;
      } else {
        receivedRevenue += storeSubtotal;
      }
    });

    let lowStockCount = myProducts.filter(p => {
      const stock = (p.sellerStock && p.sellerStock[sellerId] !== undefined) ? p.sellerStock[sellerId] : p.stockQuantity;
      return stock <= 10;
    }).length;

    if (revElem) revElem.innerText = UIModule.formatCurrency(receivedRevenue);
    if (pendingElem) pendingElem.innerText = UIModule.formatCurrency(pendingPaymentAmount);
    if (pendingCountElem) pendingCountElem.innerText = `${pendingOrdersCount} order${pendingOrdersCount === 1 ? '' : 's'}`;
    if (unitsElem) unitsElem.innerText = `${totalUnitsSold} units`;
    if (skusElem) skusElem.innerText = `${myProducts.length} pieces`;
    if (alertsElem) alertsElem.innerText = `${lowStockCount} items`;
  },

  renderInventoryTable() {
    const tbody = document.getElementById('seller-inventory-tbody');
    const filterInput = document.getElementById('inventory-filter-input');
    if (!tbody) return;

    const seller = DataStore.currentSeller;
    if (!seller) return;
    const sellerId = Number(seller.id);

    const filterVal = filterInput ? filterInput.value.toLowerCase().trim() : '';

    const allProducts = this.getSellerProducts();
    const invCountEl = document.getElementById('tab-inventory-count');
    if (invCountEl) invCountEl.innerText = allProducts.length;

    const myProducts = allProducts.filter(p => {
      if (!filterVal) return true;
      return `${p.name} ${p.code} ${p.categoryName}`.toLowerCase().includes(filterVal);
    });

    if (myProducts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="p-6">
            ${UIModule.getEmptyStateHtml({
        icon: 'inventory',
        title: 'Merchant Inventory Empty',
        description: 'Publish luxury pieces or replenish store inventory to activate your merchant storefront on OmniCart.',
        actionText: '+ Publish First Piece',
        actionCallback: 'SellerModule.openAddProductModal()'
      })}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = myProducts.map(p => {
      const myStock = (p.sellerStock && p.sellerStock[sellerId] !== undefined) ? p.sellerStock[sellerId] : p.stockQuantity;
      const isShared = Array.isArray(p.sellerIds) && p.sellerIds.length > 1;
      const isLowStock = myStock <= 10;
      const isOutOfStock = myStock <= 0;
      const safeName = UIModule.escapeHtml(p.name);
      const safeCode = UIModule.escapeHtml(p.code || `PROD-${p.id}`);
      const safeCategory = UIModule.escapeHtml(p.categoryName || 'Curated');

      let statusBadge = '<span class="badge badge-green text-[10px]">In Stock</span>';
      if (isOutOfStock) {
        statusBadge = '<span class="badge badge-red text-[10px]">Sold Out</span>';
      } else if (isLowStock) {
        statusBadge = '<span class="badge badge-amber text-[10px]">Low Reserve</span>';
      }

      const stockHtml = isShared
        ? `<div><span class="font-bold text-[#e8e2d9] text-xs">${myStock} units</span><span class="text-[10px] text-[#c8a96e] block font-mono">(Catalog: ${p.stockQuantity})</span></div>`
        : `<span class="font-semibold text-[#e8e2d9] text-xs">${myStock} units</span>`;

      return `
        <tr class="hover:bg-[#1a1714] border-b border-[#2a2520] transition-colors">
          <td class="p-3">
            <span class="font-bold text-[#e8e2d9] block text-xs">${safeName}</span>
          </td>
          <td class="p-3 text-[#9a9188] text-xs">${safeCategory}</td>
          <td class="p-3 font-serif font-bold text-[#c8a96e] text-sm">${UIModule.formatCurrency(p.currentPrice)}</td>
          <td class="p-3">${stockHtml}</td>
          <td class="p-3">${statusBadge}</td>
          <td class="p-3 text-right">
            <div class="flex items-center justify-end gap-2 flex-wrap">
              <button
                onclick="SellerModule.promptUpdateStock(${p.id}, ${myStock})"
                class="btn-secondary py-1 px-2.5 text-[11px] cursor-pointer"
                title="Update inventory stock"
              >
                Stock
              </button>
              <button
                onclick="SellerModule.promptUpdatePrice(${p.id}, ${p.currentPrice})"
                class="btn-secondary py-1 px-2.5 text-[11px] text-[#c8a96e] hover:border-[#c8a96e] cursor-pointer"
                title="Update product price"
              >
                Price
              </button>
              <button
                onclick="SellerModule.runDynamicPricingForProduct(${p.id})"
                class="btn-secondary py-1 px-2.5 text-[11px] text-[#52c41a] hover:border-[#52c41a] border-[#52c41a]/40 bg-[#1a2517]/50 hover:bg-[#1a2517] cursor-pointer flex items-center gap-1"
                title="Run dynamic pricing for this product based on real-time demand and stock"
              >
                <span>⚡ Dynamic Price</span>
              </button>
              <button
                onclick="SellerModule.confirmDeleteProduct(${p.id})"
                class="py-1 px-2.5 text-[11px] font-semibold rounded border border-red-500/50 text-red-400 bg-red-950/30 hover:bg-red-900/50 hover:border-red-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Remove this product from your catalog"
              >
                <svg class="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                <span>Remove</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderSellerOrders() {
    const container = document.getElementById('seller-orders-container');
    if (!container) return;

    const seller = DataStore.currentSeller;
    if (!seller) return;
    const sellerId = Number(seller.id);

    const allOrders = this.getSellerOrders();
    const manCountEl = document.getElementById('tab-manifest-count');
    if (manCountEl) manCountEl.innerText = allOrders.length;

    let orders = allOrders;
    if (this.orderFilter === 'active') {
      orders = allOrders.filter(o => {
        const s = this.getSellerOrderStatus(o, sellerId);
        return s !== 'DELIVERED' && s !== 'CANCELLED';
      });
    } else if (this.orderFilter === 'pending-payment') {
      orders = allOrders.filter(o => {
        const s = this.getSellerOrderStatus(o, sellerId);
        const isCod = String(o.paymentMethod || '').toLowerCase().includes('cash') || String(o.paymentMethod || '').toLowerCase().includes('cod');
        return s !== 'CANCELLED' && isCod && s !== 'DELIVERED';
      });
    } else if (this.orderFilter === 'delivered') {
      orders = allOrders.filter(o => this.getSellerOrderStatus(o, sellerId) === 'DELIVERED');
    } else if (this.orderFilter === 'cancelled') {
      orders = allOrders.filter(o => this.getSellerOrderStatus(o, sellerId) === 'CANCELLED');
    }

    if (orders.length === 0) {
      container.innerHTML = `<div class="col-span-full">${UIModule.getEmptyStateHtml({
        icon: 'orders',
        title: this.orderFilter === 'all' ? 'No Merchant Orders Yet' : (this.orderFilter === 'pending-payment' ? 'No Pending COD Payments' : `No ${this.orderFilter.charAt(0).toUpperCase() + this.orderFilter.slice(1)} Orders`),
        description: this.orderFilter === 'pending-payment' ? 'All Cash on Delivery payments have either been delivered & collected, or are settled prepaid orders.' : 'Customer orders for your storefront products and SKU dispatch assignments will appear here.',
        actionText: null
      })}</div>`;
      return;
    }

    container.innerHTML = orders.map(o => {
      const safeOrderNum = UIModule.escapeHtml(o.orderNumber || `ORD-${o.id}`);
      const rawStatus = this.getSellerOrderStatus(o, sellerId);
      const isCancelled = rawStatus === 'CANCELLED';
      const isDelivered = rawStatus === 'DELIVERED';
      const safeBuyer = UIModule.escapeHtml(o.recipientName || o.clientName || o.customerName || 'Customer');
      const orderDate = o.orderDate ? UIModule.escapeHtml(o.orderDate) : '';
      const isCod = String(o.paymentMethod || '').toLowerCase().includes('cash') || String(o.paymentMethod || '').toLowerCase().includes('cod');

      let badgeHtml = '';
      if (isCancelled) {
        badgeHtml = '<span class="badge text-[10px] bg-red-950/70 text-red-400 border border-red-500/40 font-bold">Cancelled</span>';
      } else if (isDelivered) {
        badgeHtml = '<span class="badge badge-green text-[10px]">Delivered</span>';
      } else {
        badgeHtml = `<span class="badge badge-gold text-[10px]">${UIModule.escapeHtml(o.shippingStatus)}</span>`;
      }

      let paymentBadgeHtml = '';
      if (isCancelled) {
        paymentBadgeHtml = '<span class="badge text-[10px] bg-red-950/30 text-red-400 border border-red-500/30 font-semibold">Cancelled (No Payment)</span>';
      } else if (isCod && !isDelivered) {
        paymentBadgeHtml = `
          <span class="badge text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-1" title="Payment pending: Cash will be collected from buyer upon 20-min delivery">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>COD • Payment Pending</span>
          </span>
        `;
      } else if (isCod && isDelivered) {
        paymentBadgeHtml = `
          <span class="badge text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1" title="Cash collected upon delivery and credited to realized revenue">
            <span>✓</span>
            <span>COD • Cash Collected</span>
          </span>
        `;
      } else {
        paymentBadgeHtml = `
          <span class="badge text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold flex items-center gap-1">
            <span>✓</span>
            <span>Prepaid • Settled (${UIModule.escapeHtml(o.paymentMethod || 'Online')})</span>
          </span>
        `;
      }

      let actionHtml = '';
      if (isCancelled) {
        actionHtml = `
          <div class="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/40 px-2.5 py-1 rounded border border-red-500/20">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            <span class="font-semibold text-[11px]">Cancelled by Customer</span>
          </div>
        `;
      } else if (isDelivered) {
        actionHtml = `
          <div class="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-500/20">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
            <span class="font-semibold text-[11px]">Delivered (Completed)</span>
          </div>
        `;
      } else {
        actionHtml = `
          <div class="flex items-center gap-2">
            <span class="text-[10px] text-[#9a9188]">Update:</span>
            <select
              onchange="SellerModule.updateOrderStatus(${o.id}, this.value)"
              class="text-[11px] py-1.5 px-2.5 rounded-md border border-[#2a2520] bg-[#1a1714] font-medium text-[#e8e2d9] cursor-pointer focus:border-[#c8a96e] outline-none shadow-xs"
            >
              <option value="ORDER_PLACED" ${rawStatus === 'ORDER_PLACED' || rawStatus === 'PENDING' ? 'selected' : ''}>Order Placed</option>
              <option value="PROCESSING" ${rawStatus === 'PROCESSING' ? 'selected' : ''}>Processing</option>
              <option value="SHIPPED" ${rawStatus === 'SHIPPED' ? 'selected' : ''}>Shipped</option>
              <option value="OUT_FOR_DELIVERY" ${rawStatus === 'OUT_FOR_DELIVERY' || rawStatus === 'IN TRANSIT' ? 'selected' : ''}>Out for Delivery</option>
              <option value="DELIVERED" ${rawStatus === 'DELIVERED' ? 'selected' : ''}>Delivered</option>
            </select>
          </div>
        `;
      }

      const allItems = Array.isArray(o.items) ? o.items : [];
      const myItems = allItems.filter(item => {
        const prod = (DataStore.products || []).find(p => Number(p.id) === Number(item.productId || item.id) || p.name === item.name);
        const itemSellerId = (item.sellerId !== undefined && item.sellerId !== null)
          ? Number(item.sellerId)
          : (prod ? Number(prod.sellerId) : null);
        return itemSellerId === sellerId;
      });

      if (myItems.length === 0) return '';

      const storeOrderValue = myItems.reduce((acc, it) => {
        const price = Number(it.price || it.exactLedgerPrice || 0);
        const qty = Number(it.quantity || 1);
        return acc + (Number(it.lineTotal) || (price * qty));
      }, 0);

      const itemsHtml = myItems.map(item => {
        const prod = (DataStore.products || []).find(p => p.id == item.productId || p.id == item.id || p.name === item.name);
        const name = item.name || item.productName || (prod ? prod.name : `Product #${item.productId || item.id}`);
        const code = item.code || (prod ? prod.code : `SKU-${item.productId || item.id}`);
        const qty = item.quantity || 1;
        const price = Number(item.price || item.exactLedgerPrice || (prod ? prod.currentPrice : 0));
        const lineTotal = Number(item.lineTotal || (price * qty));
        const img = item.image || item.imageUrl || (prod ? DataStore.getProductImage(prod) : 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg');

        return `
          <div class="seller-manifest-item-tile">
            <div class="w-10 h-10 rounded bg-[#161412] border border-[#2a2520] flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
              <img src="${img}" alt="${UIModule.escapeHtml(name)}" class="w-full h-full object-contain" onerror="this.onerror=null; this.src='images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg';" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1">
                <span class="font-medium text-[11px] text-[#e8e2d9] truncate" title="${UIModule.escapeHtml(name)}">${UIModule.escapeHtml(name)}</span>
                <span class="font-mono text-[10px] text-[#c8a96e] font-bold shrink-0">${UIModule.formatCurrency(lineTotal)}</span>
              </div>
              <div class="flex items-center justify-between text-[10px] text-[#9a9188] mt-0.5">
                <div class="flex items-center gap-1.5">
                  <span class="font-mono text-[9px] text-[#78716c] uppercase">${UIModule.escapeHtml(code)}</span>
                  ${item.status ? `<span class="text-[9px] px-1 py-0.2 rounded font-semibold ${String(item.status).toUpperCase() === 'DELIVERED' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' : (String(item.status).toUpperCase() === 'CANCELLED' ? 'bg-red-950/60 text-red-400 border border-red-500/30' : 'bg-[#221e1a] text-[#c8a96e] border border-[#332c24]')}">${UIModule.escapeHtml(item.status)}</span>` : ''}
                </div>
                <span>Qty: <strong class="text-[#e8e2d9] font-bold">${qty}</strong> × ${UIModule.formatCurrency(price)}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');

      const safeDelivery = o.deliveryAddress ? UIModule.escapeHtml(o.deliveryAddress) : '';

      return `
      <div class="seller-order-card ${isCancelled ? 'is-cancelled' : ''}">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold ${isCancelled ? 'text-[#a8a29e]' : 'text-[#e8e2d9]'}">${safeOrderNum}</span>
            ${orderDate ? `<span class="text-[9px] font-mono text-[#78716c]">${orderDate}</span>` : ''}
          </div>
          <div class="flex items-center gap-1.5 flex-wrap">
            ${badgeHtml}
            ${paymentBadgeHtml}
          </div>
        </div>

        <div class="flex items-center justify-between text-[#9a9188] text-[11px] pb-1 border-b border-[#221e1a]">
          <span>Client: <strong class="text-[#e8e2d9]">${safeBuyer}</strong></span>
          <span>Store Value: <strong class="font-serif font-bold ${isCancelled ? 'text-[#9a9188] line-through' : 'text-[#c8a96e]'}">${UIModule.formatCurrency(storeOrderValue)}</strong></span>
        </div>

        <div class="space-y-1.5">
          <div class="text-[10px] uppercase font-semibold text-[#8a8178] tracking-wider flex items-center justify-between">
            <span>Manifest Items (${myItems.length})</span>
            <span class="text-[10px] text-[#9a9188] font-mono">${myItems.reduce((s, it) => s + (it.quantity || 1), 0)} total units</span>
          </div>
          <div class="seller-manifest-items-box space-y-1.5 max-h-48 overflow-y-auto pr-0.5 no-scrollbar">
            ${itemsHtml || '<p class="text-[10px] text-[#78716c]">No items found in order.</p>'}
          </div>
        </div>

                <div class="p-2.5 rounded-lg bg-[#0e0c0a] border border-[#221e1a] text-xs space-y-1 mt-1">
          <div class="flex items-center justify-between text-[10px] uppercase font-semibold text-[#8a8178] tracking-wider">
            <span class="flex items-center gap-1.5 text-[#c8a96e]">
              <svg class="w-3.5 h-3.5 text-[#c8a96e] shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              Delivery Destination
            </span>
            <span class="text-[10px] text-emerald-500 font-mono font-medium">Ready for Dispatch</span>
          </div>
          <div class="text-[#e8e2d9] font-medium text-xs leading-relaxed break-words">
            ${safeDelivery || 'Flat 402, Cyber Heights, 100 Feet Rd, Bengaluru - 560038'}
          </div>
        </div>

        <div class="pt-2 flex items-center justify-end border-t border-[#221e1a]">
          ${actionHtml}
        </div>
      </div>
    `;
    }).join('');
  },

  openAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    const catSelect = document.getElementById('new-prod-cat') || document.getElementById('prod-category');
    if (catSelect && DataStore.categories && DataStore.categories.length > 0) {
      catSelect.innerHTML = DataStore.categories.map(c => `
        <option value="${c.id}">${UIModule.escapeHtml(c.name)}</option>
      `).join('');
    }
    if (modal) modal.classList.remove('hidden');
  },

  closeAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    if (modal) modal.classList.add('hidden');
  },

  async handleAddProductSubmit(e) {
    e.preventDefault();
    const nameInput = document.getElementById('new-prod-name') || document.getElementById('prod-name');
    const catInput = document.getElementById('new-prod-cat') || document.getElementById('prod-category');
    const priceInput = document.getElementById('new-prod-price') || document.getElementById('prod-price');
    const stockInput = document.getElementById('new-prod-stock') || document.getElementById('prod-stock');
    const descInput = document.getElementById('new-prod-desc') || document.getElementById('prod-desc');
    const imgInput = document.getElementById('new-prod-img') || document.getElementById('prod-img-url');

    const name = nameInput ? nameInput.value.trim() : '';
    const catId = catInput ? catInput.value : '';
    const priceVal = priceInput ? priceInput.value : '';
    const stockVal = stockInput ? stockInput.value : '';
    const desc = descInput ? descInput.value.trim() : '';
    const imgUrl = imgInput ? imgInput.value.trim() : '';

    [nameInput, priceInput, stockInput].forEach(inp => {
      if (inp) {
        UIModule.clearFieldValidation(inp);
        inp.oninput = () => UIModule.clearFieldValidation(inp);
      }
    });

    let hasError = false;

    if (!name) {
      UIModule.setFieldValidation(nameInput, false, 'Product title is required');
      if (nameInput) nameInput.focus();
      hasError = true;
    } else {
      UIModule.setFieldValidation(nameInput, true);
    }

    const price = parseFloat(priceVal);
    if (isNaN(price) || price <= 0) {
      UIModule.setFieldValidation(priceInput, false, 'Enter a valid positive price in ₹ (INR)');
      if (priceInput) priceInput.focus();
      hasError = true;
    } else {
      UIModule.setFieldValidation(priceInput, true);
    }

    const stock = parseInt(stockVal, 10);
    if (isNaN(stock) || stock < 0) {
      UIModule.setFieldValidation(stockInput, false, 'Enter a non-negative stock quantity');
      if (stockInput) stockInput.focus();
      hasError = true;
    } else {
      UIModule.setFieldValidation(stockInput, true);
    }

    if (hasError) {
      UIModule.showToast('Please fix highlighted inputs in the listing form', 'error');
      return;
    }

    const categoryObj = DataStore.categories.find(c => String(c.id) === String(catId));

    try {
      const res = await DataStore.addProduct({
        name: name,
        categoryId: catId,
        categoryName: categoryObj ? (categoryObj.name || categoryObj.categoryName) : 'Curated Products',
        currentPrice: price,
        initialPrice: price,
        stockQuantity: stock,
        description: desc,
        imageUrl: imgUrl || 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg'
      });

      this.closeAddProductModal();
      e.target.reset();

      if (res && res.isReplenished) {
        UIModule.showToast(`Product "${name}" already existed! Total catalog inventory increased from ${res.oldStock} to ${res.newTotal} units (+${res.addedStock}).`, 'success');
      } else {
        UIModule.showToast(`Product "${name}" published to catalog and Price Ledger initialized!`, 'success');
      }
      this.render();
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to add product.', 'error');
    }
  },

  async promptUpdateStock(productId, currentStock) {
    const input = prompt(`Update Warehouse Stock for Product #${productId}:`, currentStock);
    if (input !== null && input.trim() !== '') {
      const newQty = parseInt(input, 10);
      if (!isNaN(newQty) && newQty >= 0) {
        try {
          await DataStore.updateStock(productId, newQty);
          const seller = DataStore.currentSeller;
          if (seller) {
            const prod = DataStore.products.find(p => p.id == productId);
            if (prod) {
              if (!prod.sellerStock) prod.sellerStock = {};
              prod.sellerStock[Number(seller.id)] = newQty;
              localStorage.setItem('omnicart_products', JSON.stringify(DataStore.products));
            }
          }
          UIModule.showToast(`Stock updated to ${newQty} units`, 'success');
          this.render();
        } catch (err) {
          UIModule.showToast(err.message || 'Failed to update stock.', 'error');
        }
      } else {
        UIModule.showToast('Invalid stock quantity entered. Must be 0 or greater.', 'error');
      }
    }
  },

  async promptUpdatePrice(productId, currentPrice) {
    const input = prompt(`Append new Price Ledger entry in Rupees (₹) for Product #${productId}:`, currentPrice);
    if (input !== null && input.trim() !== '') {
      const newPrice = parseFloat(input);
      if (!isNaN(newPrice) && newPrice > 0) {
        const rawReason = prompt('Reason for price adjustment (Audit Trail):', 'Competitive Market Update') || 'Price Adjustment';
        const safeReason = rawReason.trim().substring(0, 200);
        try {
          await DataStore.updatePrice(productId, newPrice, safeReason);
          UIModule.showToast(`Price updated to ${UIModule.formatCurrency(newPrice)} and logged in Price Ledger`, 'success');
          await DataStore.syncBackendCatalog();
          this.render();
        } catch (err) {
          UIModule.showToast(err.message || 'Failed to update price.', 'error');
        }
      } else {
        UIModule.showToast('Invalid price entered. Must be a positive amount in INR (₹).', 'error');
      }
    }
  },

  async updateOrderStatus(orderId, newStatus) {
    const seller = DataStore.currentSeller;
    const sellerId = seller ? Number(seller.id) : null;
    const targetOrder = (DataStore.orders || []).find(o => Number(o.id) === Number(orderId));
    const currentStatus = this.getSellerOrderStatus(targetOrder, sellerId);
    if (currentStatus === 'CANCELLED') {
      UIModule.showToast('This order has been cancelled by the customer and cannot be modified.', 'error');
      this.render();
      return;
    }

    try {
      await DataStore.updateOrderStatus(orderId, newStatus, sellerId);
      UIModule.showToast(`Order #${orderId} storefront items updated to ${newStatus}`, 'success');
      this.render();
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to update order status.', 'error');
      this.render();
    }
  },

  async runDynamicPricingForProduct(productId) {
    try {
      UIModule.showToast('Evaluating dynamic price based on total stock across sellers & recent demand...', 'info');
      const updated = await DataStore.applyDynamicPrice(productId, 24);
      if (updated) {
        UIModule.showToast(`Dynamic price applied: ${UIModule.formatCurrency(updated.currentPrice)} (New ledger record created)`, 'success');
        this.render();
      }
    } catch (err) {
      console.error(err);
      UIModule.showToast('Failed to apply dynamic price.', 'error');
    }
  },

  async runAllDynamicPricing() {
    const btn = document.getElementById('btn-recalculate-all-dynamic');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Recalculating...';
    }

    try {
      UIModule.showToast('Recalculating dynamic pricing for all products across warehouse stocks & orders...', 'info');
      const results = await DataStore.recalculateAllDynamicPrices(24);
      UIModule.showToast(`Dynamic pricing successfully applied across ${results.length || 'all'} pieces! New ledger entries appended.`, 'success');
      this.render();
    } catch (err) {
      console.error(err);
      UIModule.showToast('Batch dynamic pricing calculation failed.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Run Dynamic Pricing Now';
      }
    }
  },

  async confirmDeleteProduct(productId) {
    const prod = DataStore.products.find(p => Number(p.id) === Number(productId));
    const name = prod ? prod.name : `Product #${productId}`;

    const confirmed = confirm(`Are you sure you want to remove "${name}" from your catalog?\n\nThis will permanently delete the piece, its price ledger history, and images from the store database.`);
    if (!confirmed) return;

    try {
      UIModule.showToast(`Removing "${name}" from catalog...`, 'info');
      await DataStore.deleteProduct(productId);
      UIModule.showToast(`Product "${name}" has been successfully removed from your catalog.`, 'success');
      this.render();
    } catch (err) {
      console.error('[SellerModule] Remove product failed:', err);
      UIModule.showToast(err.message || 'Failed to remove product.', 'error');
    }
  },

  async deleteAccount() {
    const confirmed = confirm('Are you sure you want to permanently delete your seller account? This action cannot be undone. All your store data will be removed from the database.');
    if (!confirmed) return;

    const doubleConfirm = confirm('This is your final confirmation. Your seller account and all associated data will be permanently deleted. Continue?');
    if (!doubleConfirm) return;

    try {
      await DataStore.deleteSellerAccount();
      UIModule.showToast('Your seller account has been permanently deleted.', 'success');
      setTimeout(() => {
        window.location.href = 'seller-dashboard.html';
      }, 1500);
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to delete account. Please try again.', 'error');
    }
  },

  openEditProfileModal() {
    const modal = document.getElementById('edit-seller-modal');
    if (!modal) return;

    const seller = DataStore.currentSeller;
    if (!seller) return;

    const nameInput = document.getElementById('edit-seller-name');
    const gstinInput = document.getElementById('edit-seller-gstin');
    const emailInput = document.getElementById('edit-seller-email');
    const phoneInput = document.getElementById('edit-seller-phone');
    const cityInput = document.getElementById('edit-seller-city');
    const stateInput = document.getElementById('edit-seller-state');
    const pwInput = document.getElementById('edit-seller-password');

    if (nameInput) nameInput.value = seller.CompanyName || '';
    if (gstinInput) gstinInput.value = seller.gstin || '';
    if (emailInput) emailInput.value = seller.email || '';
    if (phoneInput) phoneInput.value = seller.phone || '';
    if (cityInput) cityInput.value = seller.city || '';
    if (stateInput) stateInput.value = seller.state || '';
    if (pwInput) pwInput.value = '';

    modal.classList.remove('hidden');

    if (window.UIModule && typeof window.UIModule.initPasswordToggles === 'function') {
      window.UIModule.initPasswordToggles(modal);
    }
  },

  closeEditProfileModal() {
    const modal = document.getElementById('edit-seller-modal');
    if (modal) modal.classList.add('hidden');
  },

  async handleUpdateProfile(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const companyName = (document.getElementById('edit-seller-name')?.value || '').trim();
    const email = (document.getElementById('edit-seller-email')?.value || '').trim();
    const phone = (document.getElementById('edit-seller-phone')?.value || '').trim();
    const city = (document.getElementById('edit-seller-city')?.value || '').trim();
    const state = (document.getElementById('edit-seller-state')?.value || '').trim();
    const password = (document.getElementById('edit-seller-password')?.value || '').trim();

    if (!companyName) {
      UIModule.showToast('Company name is required.', 'error');
      return;
    }
    if (!email || !email.includes('@')) {
      UIModule.showToast('A valid contact email is required.', 'error');
      return;
    }
    if (!phone || phone.length < 8) {
      UIModule.showToast('A valid contact phone is required.', 'error');
      return;
    }
    if (password && password.length < 6) {
      UIModule.showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    if (window.UIModule && window.UIModule.setButtonLoading) {
      window.UIModule.setButtonLoading(submitBtn, true, 'Saving...');
    }

    try {
      await DataStore.updateSellerProfile({
        companyName,
        email,
        phone,
        city,
        state,
        password: password || undefined
      });

      this.closeEditProfileModal();
      this.render();
      UIModule.showToast('Store profile updated successfully!', 'success');
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to update store profile.', 'error');
    } finally {
      if (window.UIModule && window.UIModule.setButtonLoading) {
        window.UIModule.setButtonLoading(submitBtn, false);
      }
    }
  }
};

window.addEventListener('omnicart:dynamic-pricing-updated', (event) => {
  if (document.getElementById('inventory-table-body')) {
    console.log('[SellerModule] Auto dynamic pricing update detected. Refreshing inventory table...');
    SellerModule.renderInventoryTable();
  }
});

window.SellerModule = SellerModule;
