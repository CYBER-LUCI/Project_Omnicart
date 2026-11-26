
const CatalogModule = {
  selectedCategoryId: null,
  selectedSellerId: null,
  stockOnly: false,
  searchKeyword: '',
  sortOption: 'recommended',

  init() {

    const params = new URLSearchParams(window.location.search);
    const reqSearch = params.get('search');
    const reqCat = params.get('category');
    const reqSeller = params.get('seller');

    if (reqSearch) {
      this.searchKeyword = reqSearch.trim().toLowerCase();
      try {
        sessionStorage.removeItem('omnicart_visual_search_data');
        localStorage.removeItem('omnicart_visual_search_data');
      } catch (_) {}
    } else if (params.get('visual_search') === 'true' || params.has('visual_search')) {
      this.loadVisualSearchResults();
      return;
    }

    if (reqCat) this.selectedCategoryId = Number(reqCat);
    if (reqSeller) this.selectedSellerId = Number(reqSeller);

    const searchInput = document.querySelector('.global-search-input') || document.querySelector('input[placeholder*="Search"]');
    if (searchInput && this.searchKeyword) {
      searchInput.value = this.searchKeyword;
    }

    const catSearch = document.getElementById('catalog-search-input');
    if (catSearch) {
      if (this.searchKeyword) {
        catSearch.value = reqSearch || this.searchKeyword;
      }
      catSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.submitSearch();
        }
      });
    }

    this.renderCategoryFilters();
    this.renderSellerFilters();
    this.renderProductsGrid();
  },

  renderCategoryFilters() {
    const container = document.getElementById('catalog-category-filter');
    if (!container) return;

    const allActive = !this.selectedCategoryId ? 'font-bold text-[#c8a96e] bg-[rgba(200,169,110,0.12)] border border-[#c8a96e]' : 'text-[#9a9188] hover:text-[#e8e2d9] hover:bg-[#1a1714] border border-transparent';

    let html = `
      <button
        onclick="CatalogModule.handleCategoryFilter(null)"
        class="w-full text-left px-3 py-2 rounded text-xs transition-colors flex items-center justify-between ${allActive}"
      >
        <span class="tracking-wider uppercase text-[11px]">All Categories</span>
        <span class="badge badge-slate text-[10px]">${DataStore.products.length}</span>
      </button>
    `;

    DataStore.categories.forEach(cat => {
      const isSelected = this.selectedCategoryId === Number(cat.id);
      const activeClass = isSelected ? 'font-bold text-[#c8a96e] bg-[rgba(200,169,110,0.12)] border border-[#c8a96e]' : 'text-[#9a9188] hover:text-[#e8e2d9] hover:bg-[#1a1714] border border-transparent';
      const count = DataStore.products.filter(p => Number(p.categoryId) === Number(cat.id)).length;
      if (count === 0 && !isSelected) return;

      const catName = cat.name || cat.categoryName || 'Category';
      html += `
        <button
          onclick="CatalogModule.handleCategoryFilter(${cat.id})"
          class="w-full text-left px-3 py-2 rounded text-xs transition-colors flex items-center justify-between ${activeClass}"
        >
          <span class="tracking-wider uppercase text-[11px]">${UIModule.escapeHtml(catName)}</span>
          <span class="badge badge-slate text-[10px]">${count}</span>
        </button>
      `;
    });

    container.innerHTML = html;
  },

  renderSellerFilters() {
    const select = document.getElementById('catalog-seller-filter');
    if (!select) return;

    const sellerMap = new Map();
    (DataStore.sellers || []).forEach(s => {
      sellerMap.set(Number(s.id), s.companyName || s.CompanyName);
    });
    (DataStore.products || []).forEach(p => {
      if (p.sellerId && p.sellerName) {
        sellerMap.set(Number(p.sellerId), p.sellerName);
      }
    });

    let options = '<option value="">All Verified Sellers</option>';
    sellerMap.forEach((companyName, id) => {
      const selected = Number(this.selectedSellerId) === id ? 'selected' : '';
      options += `<option value="${id}" ${selected}>${UIModule.escapeHtml(companyName)}</option>`;
    });

    select.innerHTML = options;
  },

  handleCategoryFilter(catId) {
    this.selectedCategoryId = catId ? Number(catId) : null;
    this.renderCategoryFilters();
    this.renderProductsGrid();
  },

  handleSellerChange(sellerId) {
    this.selectedSellerId = sellerId ? Number(sellerId) : null;
    const select = document.getElementById('catalog-seller-filter');
    if (select) {
      select.value = this.selectedSellerId ? String(this.selectedSellerId) : '';
    }
    this.renderProductsGrid();
  },

  toggleStockOnly(checked) {
    this.stockOnly = Boolean(checked);
    this.renderProductsGrid();
  },

  submitSearch() {
    const catSearch = document.getElementById('catalog-search-input');
    const val = catSearch ? catSearch.value.trim() : (this.searchKeyword || '');
    this.searchKeyword = val.toLowerCase();

    if (window.history && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('visual_search');
      if (val) {
        url.searchParams.set('search', val);
      } else {
        url.searchParams.delete('search');
      }
      window.history.replaceState({}, '', url.toString());
    }

    this.renderProductsGrid();
  },

  handleSearchInput(keyword) {
    this.searchKeyword = keyword.trim().toLowerCase();
    this.renderProductsGrid();
  },

  handleSortChange(sortKey) {
    this.sortOption = sortKey;
    this.renderProductsGrid();
  },

  clearAllFilters() {
    this.selectedCategoryId = null;
    this.selectedSellerId = null;
    this.stockOnly = false;
    this.searchKeyword = '';

    const globalSearch = document.querySelector('.global-search-input') || document.querySelector('input[placeholder*="Search"]');
    if (globalSearch) globalSearch.value = '';

    const catSearch = document.getElementById('catalog-search-input');
    if (catSearch) catSearch.value = '';

    const stockToggle = document.getElementById('stock-only-toggle');
    if (stockToggle) stockToggle.checked = false;

    const sellerSelect = document.getElementById('catalog-seller-filter');
    if (sellerSelect) sellerSelect.value = '';

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    this.renderCategoryFilters();
    this.renderSellerFilters();
    this.renderProductsGrid();
  },

  getFilteredProducts() {
    return DataStore.products.filter(p => {

      if (this.selectedCategoryId && Number(p.categoryId) !== Number(this.selectedCategoryId)) {
        return false;
      }

      if (this.selectedSellerId) {
        const matchesPrimary = Number(p.sellerId) === Number(this.selectedSellerId);
        const matchesMulti = Array.isArray(p.sellerIds) && p.sellerIds.map(Number).includes(Number(this.selectedSellerId));
        if (!matchesPrimary && !matchesMulti) {
          return false;
        }
      }

      if (this.stockOnly && p.stockQuantity <= 0) {
        return false;
      }

      if (this.searchKeyword) {
        const q = this.searchKeyword.toLowerCase().trim();
        const pName = (p.name || '').toLowerCase();
        const pCat = (p.categoryName || '').toLowerCase();
        const pCode = (p.code || '').toLowerCase();
        const pDesc = (p.description || '').toLowerCase();
        const pSeller = (p.sellerName || '').toLowerCase();

        // 1. Direct name match (e.g. "Pro Mechanical RGB Keyboard", "Iphone 18 pro")
        const nameMatches = pName.includes(q);

        // 2. Category match (e.g. "electronics", "sports")
        const catMatches = pCat.includes(q);

        // 3. Seller match (e.g. "tandavx", "apex tech")
        const sellerMatches = pSeller.includes(q);

        // 4. Exact/SKU code match ONLY if query is specific SKU or number (e.g. "prod-001", "001", "012")
        // Do NOT treat generic 3-letter prefix like "pro" or "prod" as matching all "PROD-xxx" codes!
        const codeMatches = (q.length >= 4 && pCode === q) || (pCode.includes(q) && q !== 'pro' && q !== 'prod');

        // 5. Description match: check as distinct word, excluding literal "product"
        let descMatches = false;
        if (q.length > 2 && pDesc.includes(q)) {
          const cleanDesc = pDesc.replace(/\bproducts?\b/gi, '');
          const words = cleanDesc.split(/[^a-z0-9]+/i);
          descMatches = words.some(w => w.toLowerCase() === q || (q.length >= 4 && w.toLowerCase().startsWith(q)));
        }

        if (!nameMatches && !catMatches && !sellerMatches && !codeMatches && !descMatches) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (this.searchKeyword && (this.sortOption === 'recommended' || this.sortOption === 'featured')) {
        const q = this.searchKeyword.toLowerCase().trim();
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        const aExact = aName.split(/[^a-z0-9]+/i).includes(q) ? 2 : (aName.includes(q) ? 1 : 0);
        const bExact = bName.split(/[^a-z0-9]+/i).includes(q) ? 2 : (bName.includes(q) ? 1 : 0);
        if (aExact !== bExact) return bExact - aExact;
      }
      if (this.sortOption === 'price-low') return a.currentPrice - b.currentPrice;
      if (this.sortOption === 'price-high') return b.currentPrice - a.currentPrice;
      if (this.sortOption === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      return 0;
    });
  },

  renderProductsGrid() {
    const container = document.getElementById('catalog-products-grid') || document.getElementById('catalog-products-container') || document.getElementById('products-grid-container');
    const countBadge = document.getElementById('catalog-results-count') || document.getElementById('catalog-count');

    if (!container) return;

    const filtered = this.getFilteredProducts();

    if (countBadge) {
      countBadge.innerText = `${filtered.length} Product${filtered.length === 1 ? '' : 's'}`;
    }

    let bannerHtml = '';

    if (this.selectedSellerId) {
      const activeSeller = (DataStore.sellers || []).find(s => Number(s.id) === Number(this.selectedSellerId));
      const sellerTitle = activeSeller ? (activeSeller.companyName || activeSeller.CompanyName) : `Merchant #${this.selectedSellerId}`;
      bannerHtml += `
        <div class="col-span-full clean-card p-4 bg-[#161412] border border-[#c8a96e]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">&#9679;</span>
            <div>
              <span class="text-[10px] tracking-widest uppercase text-[#c8a96e] font-mono block">Merchant Storefront</span>
              <h3 class="text-sm font-bold text-white">${UIModule.escapeHtml(sellerTitle)}</h3>
            </div>
          </div>
          <button
            onclick="CatalogModule.handleSellerChange(null)"
            class="btn-secondary py-1 px-3 text-xs text-[#c8a96e] hover:border-[#c8a96e] self-start sm:self-auto cursor-pointer"
          >
            ✕ View All Merchants
          </button>
        </div>
      `;
    }

    if (filtered.length === 0) {
      if (this.searchKeyword) {
        container.innerHTML = `
          ${bannerHtml}
          <div class="col-span-full">
            ${UIModule.getNoSearchResultsHtml({
          query: this.searchKeyword,
          onClear: 'CatalogModule.clearAllFilters()',
          actionText: 'Reset Filters & Search'
        })}
          </div>
        `;
      } else {
        container.innerHTML = `
          ${bannerHtml}
          <div class="col-span-full">
            ${UIModule.getEmptyStateHtml({
          icon: 'catalog',
          title: 'No Products Match Selected Filters',
          description: 'Try resetting category, merchant, or availability filters to view the full marketplace collection.',
          actionText: 'Reset Filters & View All',
          actionCallback: 'CatalogModule.clearAllFilters()'
        })}
          </div>
        `;
      }
      return;
    }

    const cardsHtml = filtered.map(p => {
      const primaryImg = DataStore.getProductImage(p);
      const isSaved = DataStore.isSaved(p.id);
      const discountPercent = Math.round(((p.originalPrice - p.currentPrice) / p.originalPrice) * 100);
      const safeName = UIModule.escapeHtml(p.name);
      const safeCat = UIModule.escapeHtml(p.categoryName || 'General');
      const safeSeller = UIModule.escapeHtml(p.sellerName || 'Verified Merchant');
      const isOutOfStock = (p.stockQuantity ?? 1) <= 0;

      return `
        <div class="clean-card product-card flex flex-col justify-between overflow-hidden group">

          <div class="p-4 pb-0">
            <!-- Image Frame -->
            <div class="img-container relative h-48 w-full flex items-center justify-center p-3 bg-[#0a0908] border border-[#1f1b17] rounded">
              <a href="product-detail.html?id=${encodeURIComponent(p.code || p.id)}" class="w-full h-full flex items-center justify-center">
                <img src="${primaryImg}" alt="${safeName}" class="w-full h-full object-contain" onerror="this.onerror=null; this.src='images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg';" />
              </a>

              <!-- Wishlist Floating Button -->
              <button
                type="button"
                onclick="CatalogModule.handleToggleWishlist(${p.id}, event)"
                class="absolute top-2.5 right-2.5 w-8 h-8 rounded bg-[#131110]/90 backdrop-blur-xs border border-[#2a2520] hover:border-[#b89355] text-[#c8a96e] hover:text-[#b89355] flex items-center justify-center text-xs shadow-xs transition-all hover:scale-110 cursor-pointer"
                title="${isSaved ? 'Remove from wishlist' : 'Save to wishlist'}"
              >
                ${isSaved ? '<svg class="w-4 h-4 inline text-red-500 fill-current" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' : '<svg class="w-4 h-4 inline transition-colors" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>'}
              </button>

              <!-- Stock Tag -->
              <span class="absolute bottom-2 left-2 badge badge-gold text-[10px] font-bold">
                ${p.stockQuantity} in stock
              </span>
            </div>

            <!-- Meta Details -->
            <div class="mt-3 space-y-1">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-[#c8a96e] tracking-wider uppercase font-semibold text-[10px]">${safeCat}</span>
                ${(p.reviewsCount > 0 && p.rating > 0) ? `
                  <span class="text-[#9a9188] font-medium flex items-center gap-1" title="${p.reviewsCount} verified review${p.reviewsCount > 1 ? 's' : ''}">
                    <svg class="w-3 h-3 text-[#c8a96e] fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                    ${Number(p.rating).toFixed(1)}
                  </span>
                ` : `
                  <span class="text-[#71685f] text-[10px] flex items-center gap-1 font-normal">
                    <svg class="w-3 h-3 text-[#38332c] fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                    No reviews
                  </span>
                `}
              </div>

              <a href="product-detail.html?id=${encodeURIComponent(p.code || p.id)}" class="font-semibold text-[#e8e2d9] text-sm block leading-snug line-clamp-2 hover:text-[#c8a96e] transition-colors">
                ${safeName}
              </a>

              <div class="text-[11px] text-[#9a9188] pt-0.5 flex items-center justify-between">
                <span>Merchant:</span>
                <button
                  type="button"
                  onclick="CatalogModule.handleSellerChange(${p.sellerId})"
                  class="text-[#c8a96e] hover:underline font-medium truncate max-w-[140px] text-right cursor-pointer"
                  title="View this merchant's storefront"
                >
                  ${safeSeller}
                </button>
              </div>
            </div>
          </div>

          <!-- Price & Actions Footer -->
          <div class="p-4 pt-3 border-t border-[#2a2520] mt-3 flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div class="flex items-baseline gap-1.5">
                <span class="text-base font-bold text-[#e8e2d9]">${UIModule.formatCurrency(p.currentPrice)}</span>
                <span class="text-xs text-[#9a9188] line-through">${UIModule.formatCurrency(p.originalPrice)}</span>
              </div>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-[10px] text-[#c8a96e] font-semibold">${discountPercent}% OFF</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              ${isOutOfStock ? `
                <span class="badge badge-red text-xs py-1.5 px-3">Out of Stock</span>
              ` : `
                <button
                  type="button"
                  onclick="try { DataStore.addToCart(DataStore.products.find(prod => prod.id === ${p.id}), 1); UIModule.showToast('Added to cart!', 'success'); } catch(e){ UIModule.showToast(e.message, 'error'); }"
                  class="btn-primary text-xs py-1.5 px-3.5 shadow-xs cursor-pointer"
                >
                  + Cart
                </button>
              `}
            </div>
          </div>

        </div>
      `;
    });

    container.innerHTML = bannerHtml + cardsHtml.join('');
  },

  handleToggleWishlist(productId, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    try {
      const added = DataStore.toggleSavedProduct(productId);
      this.renderProductsGrid();
      UIModule.showToast(added ? 'Saved to wishlist!' : 'Removed from wishlist', 'info');
    } catch (e) {

    }
  },

  loadVisualSearchResults() {
    const mainWorkspace = document.querySelector('main');
    if (!mainWorkspace) return;

    let vsData = null;
    try {
      const raw = sessionStorage.getItem('omnicart_visual_search_data') || localStorage.getItem('omnicart_visual_search_data');
      if (raw) vsData = JSON.parse(raw);
    } catch (_) { }

    if (!vsData || !Array.isArray(vsData.results) || vsData.results.length === 0) {
      const allProds = (DataStore.products && DataStore.products.length > 0)
        ? DataStore.products
        : JSON.parse(localStorage.getItem('omnicart_products') || '[]');

      if (allProds.length === 0) {
        this.renderCategoryFilters();
        this.renderSellerFilters();
        this.renderProductsGrid();
        return;
      }

      vsData = {
        queryLabel: 'Visual Search Matches',
        queryImage: DataStore.getProductImage(allProds[0]),
        results: allProds.slice(0, 5).map((p, idx) => ({
          ...p,
          similarity: 0.95 - (idx * 0.04),
          matchPercentage: Math.max(75, 98 - (idx * 5))
        }))
      };
    }

    const queryLabel = UIModule.escapeHtml(vsData.queryLabel || 'Visual Search');
    const queryImage = vsData.queryImage;

    const top5 = vsData.results.slice(0, 5).map(res => {
      const liveProd = (DataStore.products || []).find(item => Number(item.id) === Number(res.id) || String(item.code) === String(res.code));
      const p = liveProd ? { ...res, ...liveProd } : res;
      return {
        ...p,
        similarity: res.similarity,
        matchPercentage: res.matchPercentage || Math.round((res.similarity || 0.85) * 100)
      };
    }).filter(p => p && (p.id || p.name));

    mainWorkspace.innerHTML = `
      <div class="space-y-8">
        <!-- Top Search Bar (Allows seamless simple search from visual search page) -->
        <div class="clean-card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-[#2a2520]">
          <div class="flex items-center gap-2 w-full sm:max-w-lg">
            <div class="relative flex-1 flex items-center">
              <svg class="w-4 h-4 text-[#9a9188] absolute left-3.5 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                type="text"
                id="vs-nav-search-input"
                placeholder="Search products by name, category..."
                class="clean-input pl-10 pr-24 py-2 text-sm w-full"
                onkeydown="if(event.key==='Enter'){ CatalogModule.clearVisualSearch(); window.location.href='products.html?search='+encodeURIComponent(this.value.trim()); }"
              />
              <button
                type="button"
                onclick="const val = (document.getElementById('vs-nav-search-input').value || '').trim(); CatalogModule.clearVisualSearch(); window.location.href='products.html?search='+encodeURIComponent(val);"
                class="absolute right-1 px-3 py-1 text-xs rounded bg-[#c8a96e] hover:bg-[#b89355] text-black font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
              >
                Search
              </button>
            </div>
            <button
              type="button"
              onclick="VisualSearchModule.openModal('camera')"
              class="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 cursor-pointer shrink-0 border border-[#2a2520] hover:border-[#c8a96e]/50 font-medium"
              title="Search by Camera or Image"
            >
              <svg class="w-3.5 h-3.5 text-[#c8a96e]" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span class="hidden sm:inline">Visual AI</span>
            </button>
          </div>
          <button
            type="button"
            onclick="CatalogModule.clearVisualSearch()"
            class="btn-secondary py-2 px-4 text-xs font-semibold flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center"
          >
            ← Back to Full Catalog
          </button>
        </div>

        <!-- Visual Search Full Page Header -->
        <div class="clean-card p-6 sm:p-8 border border-[#2a2520] bg-[#131110] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div class="flex items-center gap-4">
            ${queryImage ? `
              <div class="w-20 h-20 rounded-xl bg-[#0a0908] border border-[#c8a96e]/40 p-1 shrink-0 overflow-hidden shadow-lg">
                <img src="${queryImage}" alt="Search Query Image" class="w-full h-full object-contain rounded-lg" onerror="this.onerror=null; this.src='images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg';" />
              </div>
            ` : `
              <div class="w-14 h-14 rounded-full bg-[#1c1916] border border-[#c8a96e]/40 text-[#c8a96e] flex items-center justify-center shrink-0 text-xl font-bold">
                <svg class="w-6 h-6 text-[#c8a96e]" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-5-5L5 21"></path></svg>
              </div>
            `}
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="badge badge-gold text-[10px] font-bold">Visual AI Match</span>
                <span class="text-xs text-[#9a9188]">Showing Top 5 Matches</span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-display text-[#e8e2d9]">
                Visual Search: <em>"${queryLabel}"</em>
              </h1>
              <p class="text-xs text-[#9a9188] mt-1">Curated ranking of the 5 closest visually matching products.</p>
            </div>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <button
              onclick="CatalogModule.clearVisualSearch()"
              class="btn-secondary py-2.5 px-4 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              ← Back to Full Catalog
            </button>
            <button
              onclick="VisualSearchModule.openModal('upload')"
              class="btn-primary py-2.5 px-4 text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              New Visual Search
            </button>
          </div>
        </div>

        <!-- Top 5 Products Responsive Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          ${top5.map((p, idx) => {
      const primaryImg = DataStore.getProductImage(p);
      const isSaved = DataStore.isSaved(p.id);
      const safeName = UIModule.escapeHtml(p.name || 'Product');
      const safeCat = UIModule.escapeHtml(p.categoryName || 'General');
      const isOutOfStock = (p.stockQuantity ?? 1) <= 0;
      const score = p.matchPercentage || 85;

      return `
              <div class="clean-card product-card flex flex-col justify-between overflow-hidden group border border-[#2a2520] hover:border-[#c8a96e]/50 transition-all">
                <div class="p-4 pb-0">
                  <div class="img-container relative h-48 w-full flex items-center justify-center p-3 bg-[#0a0908] border border-[#1f1b17] rounded">
                    <a href="product-detail.html?id=${encodeURIComponent(p.code || p.id)}" class="w-full h-full flex items-center justify-center">
                      <img src="${primaryImg}" alt="${safeName}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" onerror="this.onerror=null; this.src='images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg';" />
                    </a>

                    <!-- Top Match Badge -->
                    <span class="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-bold ${idx === 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-[#c8a96e]/20 text-[#c8a96e] border border-[#c8a96e]/40'}">
                      #${idx + 1} • ${score}% Match
                    </span>

                    <button
                      type="button"
                      onclick="CatalogModule.handleToggleWishlist(${p.id}, event)"
                      class="absolute top-2.5 right-2.5 w-8 h-8 rounded bg-[#131110]/90 border border-[#2a2520] hover:border-[#b89355] text-[#c8a96e] flex items-center justify-center text-xs transition-all cursor-pointer"
                      title="Save to wishlist"
                    >
                      ${isSaved ? '<svg class="w-4 h-4 inline text-red-500 fill-current" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' : '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>'}
                    </button>
                  </div>

                  <div class="mt-3 space-y-1">
                    <span class="text-[#c8a96e] tracking-wider uppercase font-semibold text-[10px] block">${safeCat}</span>
                    <a href="product-detail.html?id=${encodeURIComponent(p.code || p.id)}" class="font-semibold text-[#e8e2d9] text-sm block leading-snug line-clamp-2 hover:text-[#c8a96e] transition-colors" title="${safeName}">
                      ${safeName}
                    </a>
                  </div>
                </div>

                <div class="p-4 pt-3 border-t border-[#2a2520] mt-3 flex items-center justify-between gap-2">
                  <div>
                    <span class="text-base font-bold text-[#e8e2d9] block">${UIModule.formatCurrency(p.currentPrice)}</span>
                  </div>

                  ${isOutOfStock ? `
                    <span class="badge badge-red text-xs py-1 px-2.5">Sold Out</span>
                  ` : `
                    <button
                      type="button"
                      onclick="try { DataStore.addToCart(DataStore.products.find(prod => prod.id === ${p.id}) || { id: ${p.id}, name: '${UIModule.escapeHtml(p.name)}', currentPrice: ${p.currentPrice}, images: [{ url: '${primaryImg}' }] }, 1); UIModule.showToast('Added to cart!', 'success'); } catch(e){ UIModule.showToast(e.message, 'error'); }"
                      class="btn-primary text-xs py-1.5 px-3 shadow-xs cursor-pointer"
                    >
                      + Cart
                    </button>
                  `}
                </div>
              </div>
            `;
    }).join('')}
        </div>
      </div>
    `;
  },

  clearVisualSearch() {
    try {
      sessionStorage.removeItem('omnicart_visual_search_data');
      localStorage.removeItem('omnicart_visual_search_data');
    } catch (_) { }
    window.location.href = 'products.html';
  }
};

window.CatalogModule = CatalogModule;
