
const UIModule = {

  formatCurrency(amount) {
    const num = Number(amount) || 0;
    return `₹${num.toLocaleString('en-IN')}`;
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none w-auto max-w-md';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '<svg class="w-4 h-4 text-[#c8a96e] shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    if (type === 'success') {
      iconSvg = '<svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg class="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    }

    const safeMessage = this.escapeHtml(message);

    toast.innerHTML = `
      <span class="inline-flex items-center shrink-0">${iconSvg}</span>
      <span class="text-xs sm:text-sm font-medium leading-normal text-[#f3ede4]">${safeMessage}</span>
      <button type="button" class="text-[#9a9188] hover:text-white text-xs ml-2 cursor-pointer transition-colors" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOutTop 0.25s ease forwards';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },

  renderRatingStars(rating = 0) {
    const score = Math.min(5, Math.max(0, Number(rating) || 0));
    const fullStars = Math.floor(score);
    let starsHtml = '';
    const goldStarSvg = '<svg class="w-3.5 h-3.5 fill-current text-[#c8a96e] inline" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>';
    const emptyStarSvg = '<svg class="w-3.5 h-3.5 fill-current text-[#4a4540] inline" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>';
    for (let i = 0; i < 5; i++) {
      starsHtml += (i < fullStars) ? goldStarSvg : emptyStarSvg;
    }
    return `<div class="flex items-center gap-0.5 text-sm">${starsHtml} <span class="text-xs font-bold text-[#c8a96e] ml-1">${score.toFixed(1)}</span></div>`;
  },

  renderHeader() {

    const isBuyer = DataStore.currentUser && DataStore.currentUserRole === 'buyer';
    const cartCount = isBuyer ? DataStore.getCartCount() : 0;
    const savedCount = isBuyer ? DataStore.getSavedProducts().length : 0;

    const cartBadge = document.getElementById('header-cart-badge');
    if (cartBadge) {
      cartBadge.innerText = cartCount;
      cartBadge.className = cartCount > 0 ? 'badge badge-gold text-[11px]' : 'badge badge-slate text-[11px]';
    }

    const savedBadge = document.getElementById('header-saved-badge');
    if (savedBadge) {
      savedBadge.innerText = savedCount;
      savedBadge.className = savedCount > 0 ? 'badge badge-gold text-[11px]' : 'badge badge-slate text-[11px]';
    }

    const guestAuth = document.getElementById('header-guest-auth');
    const userAuth = document.getElementById('header-user-auth');
    const userNameElem = document.getElementById('header-user-name');
    const dropdownItems = document.getElementById('auth-dropdown-items');

    if (DataStore.currentUser && DataStore.currentUserRole === 'buyer') {
      if (guestAuth) guestAuth.classList.add('hidden');
      if (userAuth) userAuth.classList.remove('hidden');
      if (userNameElem) userNameElem.innerText = DataStore.currentUser.FirstName || 'My Account';

      if (dropdownItems) {
        const safeFirst = this.escapeHtml(DataStore.currentUser.FirstName || '');
        const safeLast = this.escapeHtml(DataStore.currentUser.LastName || '');
        const safeEmail = this.escapeHtml(DataStore.currentUser.email || '');

        dropdownItems.innerHTML = `
          <div class="px-3.5 py-2.5 border-b border-[#2a2520] bg-[#161412]">
            <p class="font-bold text-[#e8e2d9] text-sm">${safeFirst} ${safeLast}</p>
            <p class="text-xs text-[#9a9188] truncate">${safeEmail}</p>
          </div>
          <div class="py-1">
            <a href="customer-profile.html" class="auth-dropdown-link flex items-center gap-2 px-3.5 py-2 text-xs text-[#e8e2d9] hover:bg-[#1f1b17] hover:text-[#c8a96e] rounded transition-colors">
              My Profile & Addresses
            </a>
            <a href="orders.html" class="auth-dropdown-link flex items-center gap-2 px-3.5 py-2 text-xs text-[#e8e2d9] hover:bg-[#1f1b17] hover:text-[#c8a96e] rounded transition-colors">
              <span>&#9679;</span> Track Orders & History
            </a>
            <a href="saved-products.html" class="auth-dropdown-link flex items-center gap-2 px-3.5 py-2 text-xs text-[#e8e2d9] hover:bg-[#1f1b17] hover:text-[#c8a96e] rounded transition-colors">
              Saved Wishlist (${savedCount})
            </a>
          </div>
          <div class="pt-1 border-t border-[#2a2520]">
            <button onclick="AuthModule.logout()" class="auth-dropdown-logout w-full text-left flex items-center gap-2 px-3.5 py-2 text-xs text-[#fca5a5] hover:bg-[#2d1212] rounded font-medium cursor-pointer transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>
              <span>Sign Out</span>
            </button>
          </div>
        `;
      }
    } else if (DataStore.currentSeller && DataStore.currentUserRole === 'seller') {
      if (guestAuth) guestAuth.classList.add('hidden');
      if (userAuth) userAuth.classList.remove('hidden');
      if (userNameElem) userNameElem.innerText = DataStore.currentSeller.CompanyName || 'Merchant';

      if (dropdownItems) {
        const safeCompany = this.escapeHtml(DataStore.currentSeller.CompanyName || 'Merchant Store');
        const safeGstin = this.escapeHtml(DataStore.currentSeller.gstin || 'Unregistered');

        dropdownItems.innerHTML = `
          <div class="px-3.5 py-2.5 border-b border-[#2a2520] bg-[#161412]">
            <p class="font-bold text-[#e8e2d9] text-sm">${safeCompany}</p>
            <p class="text-xs text-[#9a9188] truncate">GSTIN: ${safeGstin}</p>
          </div>
          <div class="py-1">
            <a href="seller-dashboard.html" class="auth-dropdown-link flex items-center gap-2 px-3.5 py-2 text-xs text-[#c8a96e] font-semibold hover:bg-[#1f1b17] rounded transition-colors">
              <span>&#9679;</span> Seller Dashboard
            </a>
            <a href="products.html?seller=${encodeURIComponent(DataStore.currentSeller.id)}" class="auth-dropdown-link flex items-center gap-2 px-3.5 py-2 text-xs text-[#e8e2d9] hover:bg-[#1f1b17] hover:text-[#c8a96e] rounded transition-colors">
              <span>&#9679;</span> View My Storefront
            </a>
            <a href="products.html" class="auth-dropdown-link flex items-center gap-2 px-3.5 py-2 text-xs text-[#9a9188] hover:bg-[#1f1b17] hover:text-[#e8e2d9] rounded transition-colors">
              <span>&#9679;</span> Global Catalog
            </a>
          </div>
          <div class="pt-1 border-t border-[#2a2520]">
            <button onclick="AuthModule.logout()" class="auth-dropdown-logout w-full text-left flex items-center gap-2 px-3.5 py-2 text-xs text-[#fca5a5] hover:bg-[#2d1212] rounded font-medium cursor-pointer transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>
              <span>Sign Out</span>
            </button>
          </div>
        `;
      }
    } else {
      if (guestAuth) guestAuth.classList.remove('hidden');
      if (userAuth) userAuth.classList.add('hidden');
    }

    const isSeller = (
      (DataStore.currentUserRole && String(DataStore.currentUserRole).toLowerCase() === 'seller') ||
      !!DataStore.currentSeller ||
      (localStorage.getItem('omnicart_role') || '').toLowerCase() === 'seller' ||
      (sessionStorage.getItem('omnicart_role') || '').toLowerCase() === 'seller' ||
      !!localStorage.getItem('omnicart_seller') ||
      !!sessionStorage.getItem('omnicart_seller') ||
      (DataStore.currentUser && (DataStore.currentUser.role === 'SELLER' || DataStore.currentUser.isSeller))
    );

    if (isSeller) {
      document.documentElement.setAttribute('data-user-role', 'seller');
      document.documentElement.classList.add('is-seller');
      if (document.body) {
        document.body.setAttribute('data-user-role', 'seller');
        document.body.classList.add('is-seller');
      }
    } else if (DataStore.currentUser && DataStore.currentUserRole === 'buyer') {
      document.documentElement.setAttribute('data-user-role', 'buyer');
      document.documentElement.classList.remove('is-seller');
      if (document.body) {
        document.body.setAttribute('data-user-role', 'buyer');
        document.body.classList.remove('is-seller');
      }
    } else {
      document.documentElement.removeAttribute('data-user-role');
      document.documentElement.classList.remove('is-seller');
      if (document.body) {
        document.body.removeAttribute('data-user-role');
        document.body.classList.remove('is-seller');
      }
    }

    if (window.BuyerModule && typeof window.BuyerModule.updateMerchantCtaVisibility === 'function') {
      window.BuyerModule.updateMerchantCtaVisibility();
    }

    const heroAuthBtn = document.getElementById('hero-auth-btn');
    if (heroAuthBtn) {
      const isLoggedIn = !!((DataStore.currentUser && DataStore.currentUserRole === 'buyer') || (DataStore.currentSeller && DataStore.currentUserRole === 'seller'));
      if (isLoggedIn) {
        heroAuthBtn.classList.add('hidden');
        heroAuthBtn.style.display = 'none';
      } else {
        heroAuthBtn.classList.remove('hidden');
        heroAuthBtn.style.display = '';
      }
    }

    const merchantCtaSection = document.getElementById('signup') || document.querySelector('.cta-section');
    if (merchantCtaSection) {
      const isMerchant = !!(DataStore.currentSeller && DataStore.currentUserRole === 'seller');
      if (isMerchant) {
        merchantCtaSection.classList.add('hidden');
        merchantCtaSection.style.display = 'none';
      } else {
        merchantCtaSection.classList.remove('hidden');
        merchantCtaSection.style.display = '';
      }
    }

    this.ensureThemeButton();
    this.updateThemeButton();
  },

  initTheme() {
    const savedTheme = localStorage.getItem('omnicart_theme') || 'light';
    this.applyTheme(savedTheme, false);
  },

  toggleTheme() {
    const isCurrentLight = document.documentElement.getAttribute('data-theme') === 'light' || document.body.classList.contains('light-theme');
    const newTheme = isCurrentLight ? 'dark' : 'light';
    this.applyTheme(newTheme, true);
  },

  applyTheme(theme, showToastNotification = false) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.remove('dark-theme');
      if (document.body) {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark');
        document.body.classList.remove('dark-theme');
      }
      localStorage.setItem('omnicart_theme', 'light');
      if (showToastNotification) {
        this.showToast('Light mode enabled', 'info', 2500);
      }
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.remove('light-theme');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.add('dark-theme');
      if (document.body) {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark');
        document.body.classList.add('dark-theme');
      }
      localStorage.setItem('omnicart_theme', 'dark');
      if (showToastNotification) {
        this.showToast('Dark Mode enabled', 'info', 2500);
      }
    }
    this.updateThemeButton();
  },

  updateThemeButton() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light' || (document.body && document.body.classList.contains('light-theme'));
    const buttons = document.querySelectorAll('.theme-toggle-btn');
    buttons.forEach(btn => {
      btn.innerHTML = isLight
        ? `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg><span class="hidden sm:inline font-semibold">Dark</span>`
        : `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg><span class="hidden sm:inline font-semibold">Light</span>`;
      btn.title = isLight ? 'Switch to Nocturne Dark Mode' : 'Switch to Editorial Light Mode';
      btn.setAttribute('aria-label', isLight ? 'Switch to Nocturne Dark Mode' : 'Switch to Editorial Light Mode');
    });
  },

  ensureThemeButton() {
    if (document.querySelector('.theme-toggle-btn')) {
      this.updateThemeButton();
      return;
    }

    const headerActions = document.getElementById('header-right-actions') ||
                          document.querySelector('header .max-w-7xl > div.flex.items-center.gap-3:last-of-type') ||
                          document.querySelector('header .max-w-7xl > div:last-child');

    if (headerActions && headerActions.tagName !== 'A') {
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'theme-toggle-btn';
      toggleBtn.onclick = () => UIModule.toggleTheme();
      toggleBtn.title = 'Switch Theme';

      const guestAuth = document.getElementById('header-guest-auth');
      const userAuth = document.getElementById('header-user-auth');
      const targetAnchor = guestAuth || userAuth;

      if (targetAnchor && targetAnchor.parentElement === headerActions) {
        headerActions.insertBefore(toggleBtn, targetAnchor);
      } else {
        headerActions.appendChild(toggleBtn);
      }
      this.updateThemeButton();
    }
  },

  openVisualSearchModal(mode = 'upload') {
    if (window.VisualSearchModule) {
      window.VisualSearchModule.openModal(mode);
    }
  },

  async openDynamicPricingModal(productId, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const prod = DataStore.getProductById(productId);
    if (!prod) return;

    let modal = document.getElementById('dynamic-pricing-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'dynamic-pricing-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md hidden transition-all duration-300';
      document.body.appendChild(modal);
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    let info = prod.dynamicPricing;
    if (!info) {
      info = await DataStore.calculateDynamicPrice(productId);
    }

    const safeName = this.escapeHtml(prod.name || 'Product');
    const safeCat = this.escapeHtml(prod.categoryName || 'General');
    const basePrice = info.basePrice || prod.basePrice || prod.currentPrice;
    const currentPrice = info.calculatedDynamicPrice || prod.currentPrice;
    const diff = currentPrice - basePrice;
    const diffSign = diff >= 0 ? '+' : '';
    const diffPercent = info.percentageAdjustment !== undefined ? info.percentageAdjustment : Math.round(((currentPrice - basePrice) / basePrice) * 1000) / 10;
    const isSurge = diff > 0;
    const isDiscount = diff < 0;

    const demandPercent = info.demandAdjustmentPercentage || 0;
    const temporalPercent = info.temporalAdjustmentPercentage || 0;
    const inventoryPercent = info.inventoryAdjustmentPercentage || 0;
    const segmentPercent = info.customerSegmentAdjustmentPercentage || 0;

    const formatPct = (val) => `${val >= 0 ? '+' : ''}${Number(val).toFixed(1)}%`;
    const formatBadgeClass = (val) => val > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : (val < 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-[#2a2520] text-[#9a9188] border-[#3a3530]');

    modal.innerHTML = `
      <div class="relative w-full max-w-xl bg-[#12100e] rounded-xl border border-[#2a2520] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <!-- Header -->
        <div class="p-5 sm:p-6 border-b border-[#241f1a] bg-[#171411] flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded bg-[#c8a96e]/10 border border-[#c8a96e]/40 flex items-center justify-center text-[#c8a96e]">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-serif font-bold text-white text-base tracking-wide">Marketplace Dynamic Pricing</span>
                <span class="text-[10px] uppercase font-bold tracking-widest text-[#c8a96e] px-1.5 py-0.5 rounded bg-[#c8a96e]/10 border border-[#c8a96e]/30">4-Signal Engine</span>
              </div>
              <p class="text-[11px] text-[#9a9188]">Real-time demand, temporal cycles, inventory metrics & customer tier</p>
            </div>
          </div>
          <button
            type="button"
            onclick="UIModule.closeDynamicPricingModal()"
            class="w-8 h-8 rounded-lg border border-[#2a2520] text-[#9a9188] hover:text-white hover:border-[#c8a96e] hover:bg-[#1f1b17] flex items-center justify-center transition-colors text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Product & Price Spotlight Ribbon -->
        <div class="p-5 bg-[#181512] border-b border-[#241f1a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1">
            <span class="text-[10px] text-[#c8a96e] tracking-wider uppercase font-semibold block">${safeCat}</span>
            <h3 class="font-bold text-[#e8e2d9] text-sm sm:text-base leading-snug line-clamp-1">${safeName}</h3>
            <span class="text-[11px] text-[#9a9188]">Baseline Price: <strong class="text-[#e8e2d9] line-through">${this.formatCurrency(basePrice)}</strong></span>
          </div>

          <div class="text-left sm:text-right shrink-0">
            <span class="text-[10px] uppercase tracking-wider text-[#9a9188] block font-semibold">Active Dynamic Price</span>
            <div class="flex items-baseline sm:justify-end gap-2">
              <span class="font-serif font-bold text-2xl text-[#c8a96e]">${this.formatCurrency(currentPrice)}</span>
              <span class="text-xs px-2 py-0.5 rounded border font-bold ${isSurge ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : (isDiscount ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-[#2a2520] text-[#9a9188] border-[#3a3530]')}">
                ${diffSign}${diffPercent}%
              </span>
            </div>
          </div>
        </div>

        <!-- 4 Factors Breakdown Body -->
        <div class="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <div class="text-xs text-[#9a9188] flex items-center justify-between">
            <span class="uppercase tracking-widest text-[10px] font-bold text-[#c8a96e]">Live Factor Deconstruction</span>
            <span>Algorithmic Equilibrium</span>
          </div>

          <!-- Factor 1: Real-Time Demand -->
          <div class="p-3.5 rounded-lg bg-[#141210] border border-[#241f1a] hover:border-[#38322b] transition-colors space-y-1.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded bg-[#2a2520] flex items-center justify-center text-[#c8a96e] text-xs font-bold">1</span>
                <strong class="text-[#e8e2d9] text-xs">Real-Time Demand Signals</strong>
              </div>
              <span class="text-xs px-2 py-0.5 rounded border font-semibold ${formatBadgeClass(demandPercent)}">
                ${formatPct(demandPercent)}
              </span>
            </div>
            <p class="text-[11px] text-[#9a9188] leading-relaxed">
              ${info.demandSignalName || 'Demand metrics based on recent marketplace order velocity and unit volume in last 24h.'}
            </p>
          </div>

          <!-- Factor 2: Temporal Signals -->
          <div class="p-3.5 rounded-lg bg-[#141210] border border-[#241f1a] hover:border-[#38322b] transition-colors space-y-1.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded bg-[#2a2520] flex items-center justify-center text-[#c8a96e] text-xs font-bold">2</span>
                <strong class="text-[#e8e2d9] text-xs">Temporal & Time-of-Day Signals</strong>
              </div>
              <span class="text-xs px-2 py-0.5 rounded border font-semibold ${formatBadgeClass(temporalPercent)}">
                ${formatPct(temporalPercent)}
              </span>
            </div>
            <p class="text-[11px] text-[#9a9188] leading-relaxed">
              ${info.temporalSignalName || 'Evaluates peak evening shopping traffic (18:00 - 22:00), lunch windows, and weekend retail volume surges.'}
            </p>
          </div>

          <!-- Factor 3: Supply & Inventory -->
          <div class="p-3.5 rounded-lg bg-[#141210] border border-[#241f1a] hover:border-[#38322b] transition-colors space-y-1.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded bg-[#2a2520] flex items-center justify-center text-[#c8a96e] text-xs font-bold">3</span>
                <strong class="text-[#e8e2d9] text-xs">Supply & Inventory Metrics</strong>
              </div>
              <span class="text-xs px-2 py-0.5 rounded border font-semibold ${formatBadgeClass(inventoryPercent)}">
                ${formatPct(inventoryPercent)}
              </span>
            </div>
            <p class="text-[11px] text-[#9a9188] leading-relaxed">
              ${info.inventorySignalName || 'Multi-seller aggregate stock evaluation: critical low stock applies scarcity protection; surplus inventory offers clearance markdowns.'}
            </p>
          </div>

          <!-- Factor 4: Customer Segmentation -->
          <div class="p-3.5 rounded-lg bg-[#141210] border border-[#241f1a] hover:border-[#38322b] transition-colors space-y-1.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded bg-[#2a2520] flex items-center justify-center text-[#c8a96e] text-xs font-bold">4</span>
                <strong class="text-[#e8e2d9] text-xs">Customer Segmentation & Loyalty Tier</strong>
              </div>
              <span class="text-xs px-2 py-0.5 rounded border font-semibold ${formatBadgeClass(segmentPercent)}">
                ${formatPct(segmentPercent)}
              </span>
            </div>
            <p class="text-[11px] text-[#9a9188] leading-relaxed">
              ${info.customerSegmentName || 'Recognizes customer tier: VIP frequent buyers receive 5% loyalty privilege; first-time buyers receive 4% welcome conversion incentive.'}
            </p>
          </div>

          <!-- Net Multiplier Bar -->
          <div class="p-3.5 rounded-lg bg-[#1a1713] border border-[#c8a96e]/20 text-[11px] text-[#9a9188] space-y-1">
            <div class="flex items-center justify-between text-xs font-semibold text-[#e8e2d9]">
              <span>Formula Multiplier</span>
              <span class="text-[#c8a96e] font-mono">${(1 + (diffPercent / 100)).toFixed(3)}x Base Price</span>
            </div>
            <p class="text-[10px] text-[#9a9188]">
              Floor & cap guardrails strictly bound price adjustments between 0.70x (-30%) and 1.40x (+40%) to protect both buyers and verified merchants.
            </p>
          </div>
        </div>

        <!-- Modal Footer Actions -->
        <div class="p-4 bg-[#0d0c0a] border-t border-[#241f1a] flex items-center justify-between gap-3">
          <button
            type="button"
            onclick="UIModule.closeDynamicPricingModal()"
            class="btn-secondary text-xs py-2 px-4 cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onclick="try { DataStore.addToCart(DataStore.products.find(p => p.id === ${prod.id}), 1); UIModule.closeDynamicPricingModal(); UIModule.showToast('Added to cart at dynamic price!', 'success'); } catch(e){ UIModule.showToast(e.message, 'error'); }"
            class="btn-primary text-xs py-2 px-5 font-bold cursor-pointer"
          >
            Add to Cart (${this.formatCurrency(currentPrice)})
          </button>
        </div>
      </div>
    `;
  },

  closeDynamicPricingModal() {
    const modal = document.getElementById('dynamic-pricing-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  },

  initStickyHeaders() {
    const header = document.querySelector('header');
    if (!header) return;

    const handleScroll = () => {
      const scrollPos = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (scrollPos > 15) {
        header.classList.add('header-scrolled');
      } else {
        header.classList.remove('header-scrolled');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  },

  initScrollProgressBar() {
    let progressBar = document.getElementById('scroll-progress-bar');
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.id = 'scroll-progress-bar';
      progressBar.className = 'scroll-progress-bar';
      progressBar.setAttribute('role', 'progressbar');
      progressBar.setAttribute('aria-valuemin', '0');
      progressBar.setAttribute('aria-valuemax', '100');
      document.body.prepend(progressBar);
    }

    const updateProgressBar = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      const scrollHeight = (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight;
      const progress = scrollHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100)) : 0;
      progressBar.style.width = `${progress}%`;
      progressBar.setAttribute('aria-valuenow', Math.round(progress));
    };

    window.addEventListener('scroll', updateProgressBar, { passive: true });
    window.addEventListener('resize', updateProgressBar, { passive: true });
    updateProgressBar();
  },

  getEyeSvg() {
    return `<svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`;
  },

  getEyeSlashSvg() {
    return `<svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>`;
  },

  initPasswordToggles(rootElement = document) {
    const passwordInputs = rootElement.querySelectorAll('input[type="password"], input[data-password-toggle="true"]');
    passwordInputs.forEach(input => {
      if (input.dataset.pwToggleAttached === 'true') return;

      input.dataset.pwToggleAttached = 'true';

      let wrapper = input.parentElement;
      if (!wrapper || !wrapper.classList.contains('password-toggle-wrapper')) {
        wrapper = document.createElement('div');
        wrapper.className = 'password-toggle-wrapper';
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
      }

      let toggleBtn = wrapper.querySelector('.password-toggle-btn');
      if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'password-toggle-btn';
        toggleBtn.setAttribute('aria-label', 'Toggle password visibility');
        toggleBtn.title = 'Show password';
        toggleBtn.innerHTML = this.getEyeSvg();

        toggleBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const isPassword = input.type === 'password';
          input.type = isPassword ? 'text' : 'password';
          toggleBtn.innerHTML = isPassword ? this.getEyeSlashSvg() : this.getEyeSvg();
          toggleBtn.title = isPassword ? 'Hide password' : 'Show password';
          toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
          input.focus();
        });

        wrapper.appendChild(toggleBtn);
      }
    });
  },

  setupPasswordObserver() {
    if (this._passwordObserver) return;
    this._passwordObserver = new MutationObserver((mutations) => {
      let hasNewElements = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          hasNewElements = true;
          break;
        }
      }
      if (hasNewElements) {
        this.initPasswordToggles();
        this.initCopyButtons();
      }
    });
    if (document.body) {
      this._passwordObserver.observe(document.body, { childList: true, subtree: true });
    }
  },

  startLoadingBar() {
    let bar = document.getElementById('top-loading-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'top-loading-bar';
      document.body.prepend(bar);
    }
    bar.style.opacity = '1';
    bar.style.width = '25%';
    clearTimeout(this._loadingBarTimeout);
    this._loadingBarTimeout = setTimeout(() => {
      if (bar.style.opacity === '1') {
        bar.style.width = '75%';
      }
    }, 200);
  },

  stopLoadingBar() {
    const bar = document.getElementById('top-loading-bar');
    if (!bar) return;
    clearTimeout(this._loadingBarTimeout);
    bar.style.width = '100%';
    setTimeout(() => {
      bar.style.opacity = '0';
      setTimeout(() => {
        bar.style.width = '0%';
      }, 300);
    }, 200);
  },

  setButtonLoading(btn, isLoading, loadingText = '') {
    if (!btn) return;
    if (isLoading) {
      btn.dataset.origHtml = btn.innerHTML;
      btn.classList.add('btn-loading');
      btn.disabled = true;
      if (loadingText) {
        btn.setAttribute('aria-label', loadingText);
      }
    } else {
      btn.classList.remove('btn-loading');
      if (btn.dataset.origHtml) {
        btn.innerHTML = btn.dataset.origHtml;
      }
      btn.disabled = false;
    }
  },

  async copyToClipboard(text, btnElement, successMsg = 'Copied!') {
    if (!text) return;
    const cleanText = String(text).trim();

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cleanText);
      } else {

        const textarea = document.createElement('textarea');
        textarea.value = cleanText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      if (btnElement) {
        const origContent = btnElement.innerHTML;
        btnElement.classList.add('copied');
        btnElement.innerHTML = `
          <svg class="w-3.5 h-3.5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>${this.escapeHtml(successMsg)}</span>
        `;
        setTimeout(() => {
          btnElement.classList.remove('copied');
          btnElement.innerHTML = origContent;
        }, 2200);
      }

      this.showToast(`${successMsg}: ${cleanText.substring(0, 30)}${cleanText.length > 30 ? '...' : ''}`, 'success', 2200);
    } catch (err) {
      console.error('[UIModule] Failed to copy text to clipboard:', err);
      this.showToast('Unable to copy to clipboard', 'error', 2000);
    }
  },

  initCopyButtons(rootElement = document) {
    const copyElements = rootElement.querySelectorAll('[data-copy], [data-copy-target]');
    copyElements.forEach(el => {
      if (el.dataset.copyInit === 'true') return;
      el.dataset.copyInit = 'true';

      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        let textToCopy = el.getAttribute('data-copy');
        if (!textToCopy && el.dataset.copyTarget) {
          const target = document.querySelector(el.dataset.copyTarget);
          if (target) {
            textToCopy = target.innerText || target.value || '';
          }
        }
        if (textToCopy) {
          const msg = el.getAttribute('data-copy-label') || 'Copied!';
          this.copyToClipboard(textToCopy, el, msg);
        }
      });
    });
  },

  getEmptyStateHtml({
    icon = 'cart',
    title = 'Nothing here yet',
    description = 'Items will appear here once you take action.',
    actionText = 'Start Shopping',
    actionUrl = 'products.html',
    actionOnClick = null
  } = {}) {
    const iconSvgs = {
      cart: `<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`,
      saved: `<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
      orders: `<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
      inventory: `<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>`,
      search: `<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
      generic: `<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
    };

    const actionBtn = actionText ? (
      actionOnClick
        ? `<button onclick="${actionOnClick}" class="btn-primary py-2.5 px-5 text-xs font-semibold cursor-pointer">${this.escapeHtml(actionText)}</button>`
        : `<a href="${actionUrl}" class="btn-primary py-2.5 px-5 text-xs font-semibold cursor-pointer">${this.escapeHtml(actionText)}</a>`
    ) : '';

    return `
      <div class="state-container animate-in fade-in zoom-in-95 duration-200">
        <div class="state-icon-wrapper state-icon-gold">
          ${iconSvgs[icon] || iconSvgs.generic}
        </div>
        <h3 class="state-title">${this.escapeHtml(title)}</h3>
        <p class="state-description">${this.escapeHtml(description)}</p>
        ${actionBtn ? `<div class="state-actions">${actionBtn}</div>` : ''}
      </div>
    `;
  },

  renderEmptyState(container, options) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (el) el.innerHTML = this.getEmptyStateHtml(options);
  },

  // 2. LOADING STATE (SPINNERS & SKELETONS)
  getLoadingSpinnerHtml(message = 'Loading...') {
    return `
      <div class="state-container py-12" role="status" aria-live="polite">
        <div class="state-icon-wrapper state-icon-gold">
          <span class="omni-spinner w-7 h-7 border-2 border-[#c8a96e] border-r-transparent"></span>
        </div>
        <p class="text-xs font-semibold uppercase tracking-wider text-[#c8a96e]">${this.escapeHtml(message)}</p>
      </div>
    `;
  },

  getSkeletonCardsHtml(count = 8) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-card">
          <div class="skeleton-box skeleton-img-box"></div>
          <div class="skeleton-box skeleton-text-sm"></div>
          <div class="skeleton-box skeleton-text-lg"></div>
          <div class="skeleton-box skeleton-text-sm" style="width: 35%"></div>
          <div class="skeleton-box skeleton-btn-box"></div>
        </div>
      `;
    }
    return html;
  },

  renderLoading(container, message = 'Loading...', type = 'spinner') {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    if (type === 'skeleton') {
      el.innerHTML = this.getSkeletonCardsHtml();
    } else {
      el.innerHTML = this.getLoadingSpinnerHtml(message);
    }
  },

  // 3. ERROR STATE
  getErrorStateHtml({
    title = 'Something went wrong',
    message = 'We encountered an error loading this data. Please try again.',
    onRetry = null,
    actionText = 'Retry',
    actionUrl = null
  } = {}) {
    const actionBtn = onRetry
      ? `<button onclick="${onRetry}" class="btn-secondary py-2.5 px-5 text-xs font-semibold cursor-pointer">${this.escapeHtml(actionText)}</button>`
      : (actionUrl ? `<a href="${actionUrl}" class="btn-secondary py-2.5 px-5 text-xs font-semibold cursor-pointer">${this.escapeHtml(actionText)}</a>` : '');

    return `
      <div class="state-container state-error-box animate-in fade-in duration-200">
        <div class="state-icon-wrapper state-icon-rose">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <h3 class="state-title text-rose-400">${this.escapeHtml(title)}</h3>
        <p class="state-description">${this.escapeHtml(message)}</p>
        <div class="state-actions">
          ${actionBtn}
          <a href="index.html" class="btn-primary py-2.5 px-5 text-xs font-semibold cursor-pointer">Return Home</a>
        </div>
      </div>
    `;
  },

  renderErrorState(container, options) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (el) el.innerHTML = this.getErrorStateHtml(options);
  },

  initNetworkStatusMonitor() {
    if (window._omnicartNetworkMonitored) return;
    window._omnicartNetworkMonitored = true;

    const showBanner = (type, message, duration = 0) => {
      let banner = document.getElementById('omnicart-network-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'omnicart-network-banner';
        document.body.appendChild(banner);
      }

      banner.className = `network-${type}`;
      const iconSvg = type === 'offline'
        ? '<svg class="w-4 h-4 text-rose-400 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-12.728-12.728m0 12.728a9 9 0 010-12.728"/></svg>'
        : (type === 'slow'
          ? '<svg class="w-4 h-4 text-amber-400 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>'
          : '<svg class="w-4 h-4 text-emerald-400 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>');
      banner.innerHTML = `
        <span class="shrink-0 text-sm">${iconSvg}</span>
        <span class="flex-1 text-center font-medium">${this.escapeHtml(message)}</span>
        <button type="button" class="ml-2 text-xs opacity-75 hover:opacity-100 cursor-pointer" onclick="this.parentElement.remove()">✕</button>
      `;

      if (duration > 0) {
        setTimeout(() => {
          if (banner && banner.parentElement) banner.remove();
        }, duration);
      }
    };

    window.addEventListener('offline', () => {
      showBanner('offline', 'You are currently offline. Check your internet connection. OmniCart is operating in offline cache mode.');
      this.showToast('Network disconnected. Offline cache mode active.', 'error', 4500);
    });

    window.addEventListener('online', () => {
      showBanner('online-restored', 'Internet connection restored! Syncing latest catalog data...', 3500);
      this.showToast('Back online! Reconnected to server.', 'success', 3000);
      if (window.DataStore && typeof window.DataStore.syncBackendCatalog === 'function') {
        window.DataStore.syncBackendCatalog();
      }
    });

    if (!navigator.onLine) {
      showBanner('offline', 'You are currently offline. Check your internet connection. OmniCart is operating in offline cache mode.');
    } else {

      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn && (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g' || conn.saveData || (conn.rtt && conn.rtt > 1500))) {
        showBanner('slow', 'Slow internet connection detected. Optimizing content for low bandwidth...', 5000);
      }
    }
  },

  notifySlowConnection() {
    let banner = document.getElementById('omnicart-network-banner');
    if (!banner && navigator.onLine) {
      banner = document.createElement('div');
      banner.id = 'omnicart-network-banner';
      banner.className = 'network-slow';
      banner.innerHTML = `
        <span class="shrink-0 text-sm"><svg class="w-4 h-4 text-amber-400 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></span>
        <span class="flex-1 text-center font-medium">Slow response from server. Still working on your request...</span>
        <button type="button" class="ml-2 text-xs opacity-75 hover:opacity-100 cursor-pointer" onclick="this.parentElement.remove()">✕</button>
      `;
      document.body.appendChild(banner);
      setTimeout(() => {
        if (banner && banner.parentElement) banner.remove();
      }, 4000);
    }
  },

  getNoSearchResultsHtml({
    query = '',
    onClear = 'window.location.href="products.html"',
    actionText = 'Clear Search & Filters'
  } = {}) {
    return `
      <div class="state-container animate-in fade-in duration-200">
        <div class="state-icon-wrapper state-icon-blue">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        </div>
        <h3 class="state-title">No products found</h3>
        <p class="state-description">
          We couldn't find any products matching <em>"${this.escapeHtml(query || 'your search')}"</em>.
          Try checking for spelling errors, using broader terms, or exploring our product categories.
        </p>
        <div class="state-actions">
          <button onclick="${onClear}" class="btn-primary py-2.5 px-5 text-xs font-semibold cursor-pointer">
            ${this.escapeHtml(actionText)}
          </button>
          <button onclick="VisualSearchModule.openModal('upload')" class="btn-secondary py-2.5 px-5 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-5-5L5 21"></path></svg> Try Visual Search
          </button>
        </div>
      </div>
    `;
  },

  renderNoSearchResults(container, options) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (el) el.innerHTML = this.getNoSearchResultsHtml(options);
  },

  getPermissionDeniedHtml({
    title = 'Access Restricted: 403 Forbidden',
    message = 'You do not have permission to access this portal. An authorized account is required.',
    requiredRole = 'seller',
    returnUrl = 'index.html',
    actionText = 'Sign In with Credentials'
  } = {}) {
    return `
      <div class="max-w-2xl mx-auto px-4 py-8">
        <div class="state-container state-error-box p-8 sm:p-10">
          <div class="state-icon-wrapper state-icon-rose">
            <svg class="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 class="state-title text-xl sm:text-2xl text-rose-400">${this.escapeHtml(title)}</h2>
          <p class="state-description text-sm mb-6">${this.escapeHtml(message)}</p>
          <div class="state-actions">
            <button onclick="AuthModule.openAuthModal('${requiredRole === 'seller' ? 'seller' : 'buyer'}', 'login')" class="btn-primary py-2.5 px-6 text-xs font-bold cursor-pointer">
              ${this.escapeHtml(actionText)}
            </button>
            <a href="${returnUrl}" class="btn-secondary py-2.5 px-6 text-xs font-semibold cursor-pointer">
              Return to Marketplace
            </a>
          </div>
        </div>
      </div>
    `;
  },

  renderPermissionDenied(options = {}) {
    const container = options.container || 'main';
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (el) el.innerHTML = this.getPermissionDeniedHtml(options);
  },

  showSessionExpiredModal(onReLogin = null) {
    if (document.getElementById('session-expired-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'session-expired-modal';
    modal.className = 'state-modal-backdrop';
    modal.innerHTML = `
      <div class="state-modal-card">
        <div class="state-icon-wrapper state-icon-amber mx-auto">
          <svg class="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <h3 class="state-title text-lg font-bold text-white mb-2">Session Expired</h3>
        <p class="state-description text-xs text-[#9a9188] mb-6">
          Your active session has expired for your security. Please sign in again to continue your order and account operations.
        </p>
        <div class="flex flex-col gap-3">
          <button
            id="btn-session-relogin"
            class="btn-primary w-full py-2.5 text-xs font-bold cursor-pointer"
          >
            Sign In Again
          </button>
          <button
            id="btn-session-guest"
            class="btn-secondary w-full py-2.5 text-xs font-semibold cursor-pointer"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#btn-session-relogin').onclick = () => {
      modal.remove();
      AuthModule.openAuthModal('buyer', 'login');
      if (typeof onReLogin === 'function') onReLogin();
    };

    modal.querySelector('#btn-session-guest').onclick = () => {
      modal.remove();
    };
  },

  setFieldValidation(inputEl, isValid, errorMessage = '') {
    if (!inputEl) return;
    inputEl.classList.remove('is-valid', 'is-invalid');

    const parent = inputEl.parentElement;
    const existingMsg = parent ? parent.querySelector('.field-error-msg') : null;
    if (existingMsg) existingMsg.remove();

    if (isValid) {
      inputEl.classList.add('is-valid');
    } else {
      inputEl.classList.add('is-invalid');
      if (errorMessage && parent) {
        const errorP = document.createElement('p');
        errorP.className = 'field-error-msg';
        errorP.innerHTML = `<svg class="w-3.5 h-3.5 text-rose-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg> <span>${this.escapeHtml(errorMessage)}</span>`;
        parent.appendChild(errorP);
      }
    }
  },

  clearFieldValidation(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove('is-valid', 'is-invalid');
    const parent = inputEl.parentElement;
    if (parent) {
      const existing = parent.querySelector('.field-error-msg');
      if (existing) existing.remove();
    }
  },

  getSuccessStateHtml({
    title = 'Action Completed Successfully',
    message = 'Your request has been processed and saved.',
    badgeText = 'Confirmed',
    primaryActionText = 'Continue Shopping',
    primaryActionUrl = 'products.html',
    primaryActionOnClick = null,
    secondaryActionText = null,
    secondaryActionUrl = null,
    secondaryActionOnClick = null,
    extraContent = ''
  } = {}) {
    const primBtn = primaryActionText ? (
      primaryActionOnClick
        ? `<button onclick="${primaryActionOnClick}" class="btn-primary py-2.5 px-6 text-xs font-bold cursor-pointer">${this.escapeHtml(primaryActionText)}</button>`
        : `<a href="${primaryActionUrl}" class="btn-primary py-2.5 px-6 text-xs font-bold cursor-pointer">${this.escapeHtml(primaryActionText)}</a>`
    ) : '';

    const secBtn = secondaryActionText ? (
      secondaryActionOnClick
        ? `<button onclick="${secondaryActionOnClick}" class="btn-secondary py-2.5 px-6 text-xs font-semibold cursor-pointer">${this.escapeHtml(secondaryActionText)}</button>`
        : `<a href="${secondaryActionUrl}" class="btn-secondary py-2.5 px-6 text-xs font-semibold cursor-pointer">${this.escapeHtml(secondaryActionText)}</a>`
    ) : '';

    return `
      <div class="state-container p-8 sm:p-12 animate-in fade-in duration-300">
        <div class="success-check-badge">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        ${badgeText ? `<span class="badge badge-gold text-[10px] font-bold uppercase tracking-wider mb-2">${this.escapeHtml(badgeText)}</span>` : ''}
        <h2 class="state-title text-2xl font-bold text-white mb-2">${this.escapeHtml(title)}</h2>
        <p class="state-description text-sm mb-6">${this.escapeHtml(message)}</p>
        ${extraContent}
        <div class="state-actions mt-4">
          ${primBtn}
          ${secBtn}
        </div>
      </div>
    `;
  },

  renderSuccessState(container, options) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (el) el.innerHTML = this.getSuccessStateHtml(options);
  },

  // -------------------------------------------------------------
  // MASTER INITIALIZATION
  // -------------------------------------------------------------
  init() {
    this.initTheme();
    this.ensureThemeButton();
    this.updateThemeButton();
    this.initStickyHeaders();
    this.initScrollProgressBar();
    this.initPasswordToggles();
    this.setupPasswordObserver();
    this.initCopyButtons();
    this.initNetworkStatusMonitor();
  }
};

window.UIModule = UIModule;

// Execute initial theme application immediately
try {
  const earlyTheme = localStorage.getItem('omnicart_theme') || 'light';
  document.documentElement.setAttribute('data-theme', earlyTheme);
  if (earlyTheme === 'light') {
    document.documentElement.classList.add('light-theme');
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.remove('dark-theme');
    if (document.body) {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark');
      document.body.classList.remove('dark-theme');
    }
  } else {
    document.documentElement.classList.remove('light-theme');
    document.documentElement.classList.add('dark');
    document.documentElement.classList.add('dark-theme');
    if (document.body) {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark');
      document.body.classList.add('dark-theme');
    }
  }
} catch (_) {}

// Run UIModule initialization when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    UIModule.init();
  });
} else {
  UIModule.init();
}
