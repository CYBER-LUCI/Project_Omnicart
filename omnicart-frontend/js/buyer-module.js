
const BuyerModule = {
  currentDealProduct: null,
  timerInterval: null,

  init() {
    this.renderCategoryPills();
    this.renderDealOfTheDay();
    this.renderRecommendedProducts();
    this.renderFastDeliveryProducts();
    this.startDealTimer();
    this.initGlobalSearch();
    this.updateMerchantCtaVisibility();
  },

  updateMerchantCtaVisibility() {
    const isMerchant = (
      (DataStore.currentUserRole && String(DataStore.currentUserRole).toLowerCase() === 'seller') ||
      !!DataStore.currentSeller ||
      (localStorage.getItem('omnicart_role') || '').toLowerCase() === 'seller' ||
      (sessionStorage.getItem('omnicart_role') || '').toLowerCase() === 'seller' ||
      !!localStorage.getItem('omnicart_seller') ||
      !!sessionStorage.getItem('omnicart_seller') ||
      (DataStore.currentUser && (DataStore.currentUser.role === 'SELLER' || DataStore.currentUser.isSeller))
    );

    const merchantCta = document.getElementById('signup') || document.querySelector('.cta-section');
    if (isMerchant) {
      document.documentElement.setAttribute('data-user-role', 'seller');
      document.documentElement.classList.add('is-seller');
      if (document.body) {
        document.body.setAttribute('data-user-role', 'seller');
        document.body.classList.add('is-seller');
      }
      if (merchantCta) {
        merchantCta.classList.add('hidden');
        merchantCta.style.setProperty('display', 'none', 'important');
      }
    } else {
      if (document.documentElement.getAttribute('data-user-role') === 'seller') {
        document.documentElement.removeAttribute('data-user-role');
        document.documentElement.classList.remove('is-seller');
      }
      if (document.body && document.body.getAttribute('data-user-role') === 'seller') {
        document.body.removeAttribute('data-user-role');
        document.body.classList.remove('is-seller');
      }
      if (merchantCta) {
        merchantCta.classList.remove('hidden');
        merchantCta.style.display = '';
      }
    }
  },

  renderCategoryPills() {
    const container = document.getElementById('category-pills-container');
    if (!container) return;

    const categoryIcons = {
      1: '<svg class="w-4 h-4 text-[#c8a96e]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
      2: '<svg class="w-4 h-4 text-[#c8a96e]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>',
      3: '<svg class="w-4 h-4 text-[#c8a96e]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.5a2 2 0 001.24 1.55L6 11.5V20a2 2 0 002 2h8a2 2 0 002-2v-8.5l1.9-0.76a2 2 0 001.24-1.55l.58-3.5a2 2 0 00-1.34-2.23z"></path></svg>',
      4: '<svg class="w-4 h-4 text-[#c8a96e]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M6 4v16M18 4v16M2 8h4M18 8h4M2 16h4M18 16h4M6 12h12"></path></svg>',
      5: '<svg class="w-4 h-4 text-[#c8a96e]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M3 12h18M3 12a9 9 0 0 0 18 0M3 12a9 9 0 0 1 18 0"></path></svg>',
      9: '<svg class="w-4 h-4 text-[#c8a96e]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M3 12h18M3 12a9 9 0 0 0 18 0M3 12a9 9 0 0 1 18 0"></path></svg>'
    };

    container.innerHTML = DataStore.categories.map(cat => {
      const catName = cat.name || cat.categoryName || 'Category';
      return `
      <a
        href="products.html?category=${cat.id}"
        class="flex items-center gap-2 px-4 py-2.5 rounded border border-[#2a2520] bg-[#131110] hover:border-[#c8a96e] hover:bg-[#1a1714] text-[#e8e2d9] text-xs font-semibold whitespace-nowrap transition-all shadow-sm shrink-0"
      >
        <span class="flex items-center">${categoryIcons[cat.id] || '<span class="w-2 h-2 rounded-full bg-[#c8a96e]"></span>'}</span>
        <span class="tracking-wider uppercase text-[11px]">${UIModule.escapeHtml(catName)}</span>
      </a>
    `;
    }).join('');
  },

  renderDealOfTheDay() {
    const dealSection = document.getElementById('featured-deal-section');
    const dealProduct = DataStore.products.find(p => p.isDealOfTheDay) || DataStore.products[0];
    if (!dealProduct) {
      if (dealSection) dealSection.classList.add('hidden');
      return;
    }
    if (dealSection) dealSection.classList.remove('hidden');

    this.currentDealProduct = dealProduct;

    const imgElem = document.getElementById('featured-img');
    const thumbsContainer = document.getElementById('featured-thumbs-container');
    const catElem = document.getElementById('featured-category');
    const titleElem = document.getElementById('featured-title');
    const descElem = document.getElementById('featured-desc');
    const priceElem = document.getElementById('featured-price');
    const origPriceElem = document.getElementById('featured-orig-price');
    const discountElem = document.getElementById('featured-discount');
    const stockElem = document.getElementById('featured-stock');
    const link1 = document.getElementById('featured-detail-link');
    const link2 = document.getElementById('featured-detail-link-2');

    const primaryImg = DataStore.getProductImage(dealProduct);

    if (imgElem) {
      imgElem.src = primaryImg;
      imgElem.alt = dealProduct.name;
      imgElem.onerror = function () { this.onerror = null; this.src = 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg'; };
    }

    if (thumbsContainer && dealProduct.images && dealProduct.images.length > 1) {
      thumbsContainer.innerHTML = dealProduct.images.map((img, idx) => {
        const src = (img && (img.imageUrl || img.url)) || 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg';
        return `
        <button
          onclick="document.getElementById('featured-img').src = '${src}'"
          class="w-12 h-12 rounded border border-[#2a2520] hover:border-[#c8a96e] overflow-hidden p-1 bg-[#0d0c0a] cursor-pointer"
        >
          <img src="${src}" class="w-full h-full object-contain" onerror="this.onerror=null; this.src='images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg';" />
        </button>
      `;
      }).join('');
    }

    if (catElem) catElem.innerText = dealProduct.categoryName;
    if (titleElem) titleElem.innerText = dealProduct.name;
    if (descElem) descElem.innerText = dealProduct.description;
    if (priceElem) priceElem.innerText = UIModule.formatCurrency(dealProduct.currentPrice);
    if (origPriceElem) origPriceElem.innerText = UIModule.formatCurrency(dealProduct.originalPrice);

    const discountPercent = Math.round(((dealProduct.originalPrice - dealProduct.currentPrice) / dealProduct.originalPrice) * 100);
    if (discountElem) discountElem.innerText = `-${discountPercent}% OFF`;

    if (stockElem) {
      stockElem.innerHTML = `
        <span class="inline-flex items-center gap-1.5 font-bold ${dealProduct.stockQuantity <= 10 ? 'text-amber-400' : 'text-[#c8a96e]'}">
          <span class="pulse-indicator"></span>
          ${dealProduct.stockQuantity} units available in local distribution hub
        </span>
      `;
    }

    const detailUrl = `product-detail.html?id=${dealProduct.code || dealProduct.id}`;
    if (link1) link1.href = detailUrl;
    if (link2) link2.href = detailUrl;
  },

  startDealTimer() {
    const timerElem = document.getElementById('deal-timer');
    if (!timerElem) return;

    let totalSeconds = 3 * 3600 + 42 * 60 + 15;

    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      totalSeconds--;
      if (totalSeconds < 0) totalSeconds = 4 * 3600;

      const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
      const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
      const secs = (totalSeconds % 60).toString().padStart(2, '0');

      timerElem.innerText = `${hrs}:${mins}:${secs}`;
    }, 1000);
  },

  addCurrentDealToCart() {
    if (!this.currentDealProduct) return;
    try {
      DataStore.addToCart(this.currentDealProduct, 1);
      UIModule.showToast(`Added ${this.currentDealProduct.name} to cart!`, 'success');
    } catch (err) {
      UIModule.showToast(err.message, 'error');
    }
  },

  renderRecommendedProducts() {
    const container = document.getElementById('recommended-products-container');
    if (!container) return;

    const recommended = DataStore.products.slice(0, 3);
    if (recommended.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-[#9a9188] bg-[#131110] rounded border border-dashed border-[#2a2520]">
          <p class="text-xs">No products listed yet. Products will appear here shortly.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = recommended.map(p => {
      const img = DataStore.getProductImage(p);
      const isSaved = DataStore.isSaved(p.id);
      const safeName = UIModule.escapeHtml(p.name);
      const safeCat = UIModule.escapeHtml(p.categoryName || 'General');
      const isOutOfStock = (p.stockQuantity ?? 1) <= 0;

      return `
        <div class="flex items-center justify-between gap-4 p-3 rounded border border-[#2a2520] hover:border-[#c8a96e] bg-[#131110] transition-all">
          <a href="product-detail.html?id=${encodeURIComponent(p.code || p.id)}" class="flex items-center gap-3 min-w-0 flex-1">
            <img src="${img}" alt="${safeName}" class="w-14 h-14 object-contain rounded bg-[#0a0908] p-1 shrink-0 border border-[#1f1b17]" onerror="this.onerror=null; this.src='images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg';" />
            <div class="min-w-0">
              <span class="text-[11px] text-[#c8a96e] tracking-wider uppercase font-semibold block">${safeCat}</span>
              <h4 class="text-xs font-semibold text-[#e8e2d9] truncate hover:text-[#c8a96e]">${safeName}</h4>
              <div class="flex items-baseline gap-2 mt-0.5">
                <span class="text-sm font-bold text-[#e8e2d9]">${UIModule.formatCurrency(p.currentPrice)}</span>
                <span class="text-xs text-[#9a9188] line-through">${UIModule.formatCurrency(p.originalPrice)}</span>
                <button
                  type="button"
                  onclick="UIModule.openDynamicPricingModal(${p.id}, event)"
                  class="text-[9px] px-1.5 py-0.5 rounded bg-[#c8a96e]/10 text-[#c8a96e] border border-[#c8a96e]/30 hover:bg-[#c8a96e]/20 transition-all cursor-pointer font-medium">
                  <span class="inline-flex items-center gap-1">
                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    Dynamic
                  </span>
                </button>
              </div>
            </div>
          </a>

          <div class="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onclick="BuyerModule.handleToggleSaved(${p.id})"
              class="w-8 h-8 rounded border border-[#2a2520] hover:border-[#b89355] bg-[#161412] hover:bg-[#1f1b17] text-[#c8a96e] hover:text-[#b89355] flex items-center justify-center text-xs transition-colors cursor-pointer"
              title="Save to wishlist"
            >
              ${isSaved ? '<svg class="w-4 h-4 inline text-red-500 fill-current" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' : '<svg class="w-4 h-4 inline transition-colors" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>'}
            </button>
            ${isOutOfStock ? `
              <span class="badge badge-red text-[11px] py-1.5 px-2.5">Sold Out</span>
            ` : `
              <button
                type="button"
                onclick="try { DataStore.addToCart(DataStore.products.find(prod => prod.id === ${p.id}), 1); UIModule.showToast('Added to cart!', 'success'); } catch(e){ UIModule.showToast(e.message, 'error'); }"
                class="btn-primary text-xs py-1.5 px-3 cursor-pointer"
              >
                + Add
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  },

  renderFastDeliveryProducts() {
    const container = document.getElementById('fast-delivery-container');
    if (!container) return;

    const fastList = DataStore.products.filter(p => p.fastDeliveryAvailable).slice(0, 3);
    if (fastList.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-[#9a9188] bg-[#131110] rounded border border-dashed border-[#2a2520]">
          <p class="text-xs">No express delivery items available right now.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = fastList.map(p => {
      const img = DataStore.getProductImage(p);
      const safeName = UIModule.escapeHtml(p.name);
      const isOutOfStock = (p.stockQuantity ?? 1) <= 0;

      return `
        <div class="flex items-center justify-between gap-4 p-3 rounded border border-[#2a2520] hover:border-[#c8a96e] bg-[#131110] transition-all">
          <a href="product-detail.html?id=${encodeURIComponent(p.code || p.id)}" class="flex items-center gap-3 min-w-0 flex-1">
            <img src="${img}" alt="${safeName}" class="w-14 h-14 object-contain rounded bg-[#0a0908] p-1 shrink-0 border border-[#1f1b17]" onerror="this.onerror=null; this.src='images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg';" />
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 text-[11px] text-[#c8a96e] font-semibold">
                <span class="pulse-indicator"></span> 20-min Express Hub
              </div>
              <h4 class="text-xs font-semibold text-[#e8e2d9] truncate hover:text-[#c8a96e] mt-0.5">${safeName}</h4>
              <div class="flex items-baseline gap-2 mt-0.5">
                <span class="text-sm font-bold text-[#e8e2d9]">${UIModule.formatCurrency(p.currentPrice)}</span>
                <button
                  type="button"
                  onclick="UIModule.openDynamicPricingModal(${p.id}, event)"
                  class="text-[9px] px-1.5 py-0.5 rounded bg-[#c8a96e]/10 text-[#c8a96e] border border-[#c8a96e]/30 hover:bg-[#c8a96e]/20 transition-all cursor-pointer font-medium">
                  <span class="inline-flex items-center gap-1">
                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    Dynamic
                  </span>
                </button>
              </div>
            </div>
          </a>

          <div class="shrink-0">
            ${isOutOfStock ? `
              <span class="badge badge-red text-[11px] py-1.5 px-2.5">Sold Out</span>
            ` : `
              <button
                type="button"
                onclick="try { DataStore.addToCart(DataStore.products.find(prod => prod.id === ${p.id}), 1); UIModule.showToast('Added for 20-min delivery!', 'success'); } catch(e){ UIModule.showToast(e.message, 'error'); }"
                class="btn-primary text-xs py-1.5 px-3 font-semibold cursor-pointer"
              >
                Order
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  },

  initGlobalSearch() {
    const inputs = document.querySelectorAll('.global-search-input');
    inputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = e.target.value.trim();
          if (val) {
            if (window.location.pathname.endsWith('products.html') && window.CatalogModule) {
              const catSearch = document.getElementById('catalog-search-input');
              if (catSearch) catSearch.value = val;
              window.CatalogModule.submitSearch();
            } else {
              window.location.href = 'products.html?search=' + encodeURIComponent(val);
            }
          }
        }
      });
    });
  },

  handleToggleSaved(productId) {
    try {
      const added = DataStore.toggleSavedProduct(productId);
      this.renderRecommendedProducts();
      UIModule.showToast(added ? 'Saved to wishlist!' : 'Removed from wishlist', 'info');
    } catch (_) { }
  }
};

window.BuyerModule = BuyerModule;
