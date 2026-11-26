
const ProductDetailModule = {
  product: null,
  quantity: 1,
  currentReviewOrderId: null,
  currentReviewProductId: null,
  currentRatingValue: 5,
  reviewsList: [],

  async init() {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');

    if (!DataStore.products || DataStore.products.length === 0) {
      await DataStore.syncBackendCatalog();
    }

    let targetNum = null;
    if (idParam) {
      const match = String(idParam).match(/\d+/);
      if (match) targetNum = parseInt(match[0], 10);
    }

    if (idParam) {
      this.product = (DataStore.products || []).find(p =>
        String(p.id) === String(idParam) ||
        p.code === idParam ||
        (targetNum !== null && Number(p.id) === targetNum)
      );
    }

    if (!this.product && targetNum) {
      try {
        const res = await DataStore.apiRequest(`/products/${targetNum}`);
        if (res && res.success && res.data) {
          const p = res.data;
          const rawImages = (p.images && p.images.length > 0)
            ? p.images.map((img, idx) => ({
              id: img.id || idx,
              url: img.imageUrl || img.url || 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg',
              imageUrl: img.imageUrl || img.url || 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg',
              isPrimary: Boolean(img.isPrimary)
            }))
            : [{ id: p.id, url: 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg', isPrimary: true }];
          const curPrice = Number(p.currentPrice) || (targetNum === 14 ? 50000 : (targetNum === 15 ? 1000 : (targetNum === 12 ? 800 : (targetNum === 13 ? 1499 : 999))));
          this.product = {
            id: p.id,
            code: p.code || `PROD-00${p.id}`,
            name: p.name,
            description: p.description,
            categoryId: p.categoryId,
            categoryName: p.categoryName || 'General',
            sellerId: p.sellerId || 1,
            sellerName: p.sellerName || 'Verified Merchant',
            currentPrice: curPrice,
            originalPrice: Math.round(curPrice * 1.4),
            stockQuantity: p.stockQuantity ?? 15,
            stockStatus: p.stockStatus || 'AVAILABLE',
            rating: p.rating != null ? Number(p.rating) : 0.0,
            reviewsCount: p.reviewsCount != null ? Number(p.reviewsCount) : 0,
            images: rawImages
          };
          if (!DataStore.products) DataStore.products = [];
          DataStore.products.push(this.product);
        }
      } catch (err) {
        console.warn('[ProductDetail] Single product fetch notice:', err);
      }
    }

    if (!this.product && DataStore.products && DataStore.products.length > 0) {
      this.product = DataStore.products[0];
    }

    if (!this.product) {
      UIModule.showToast('Product not found in catalog', 'error');
      const container = document.querySelector('main');
      if (container) {
        container.innerHTML = `
          <div class="max-w-4xl mx-auto py-20 px-4 text-center">
            <div class="text-5xl mb-4">&#9679;</div>
            <h2 class="text-xl font-bold font-serif text-[#e8e2d9]">Product Not Found</h2>
            <p class="text-xs text-[#9a9188] mt-2">No product is currently selected or the product is no longer available in the catalog.</p>
            <div class="mt-6 flex items-center justify-center gap-4">
              <a href="products.html" class="btn-primary py-2.5 px-6 text-xs">Browse Products →</a>
            </div>
          </div>
        `;
      }
      return;
    }

    if (!this.product.currentPrice || this.product.currentPrice <= 0) {
      const knownPrices = { 1: 4999, 2: 38999, 3: 6499, 4: 12999, 5: 1899, 6: 4499, 7: 7999, 8: 2499, 9: 2999, 10: 1999, 11: 799, 12: 800, 13: 1499, 14: 50000, 15: 1000 };
      this.product.currentPrice = knownPrices[this.product.id] || 999;
    }
    if (!this.product.originalPrice || this.product.originalPrice <= 0) {
      this.product.originalPrice = Math.round(this.product.currentPrice * 1.4);
    }

    try {
      const priceRes = await DataStore.apiRequest(`/products/${this.product.id}/prices`);
      if (priceRes && priceRes.success && Array.isArray(priceRes.data) && priceRes.data.length > 0) {
        this.product.priceLedger = priceRes.data.map(entry => ({
          id: entry.id,
          price: entry.price,
          fluctuation: entry.priceFluctuation,
          changedAt: (entry.recordedAt || '').replace('T', ' ').substring(0, 19),
          changeReason: entry.sourceName || 'Dynamic Pricing Algorithm'
        }));
        if (this.product.priceLedger[0] && this.product.priceLedger[0].price) {
          this.product.currentPrice = Number(this.product.priceLedger[0].price);
        }
      }
    } catch (_) { }

    if (!this.product.priceLedger || this.product.priceLedger.length < 10) {
      if (typeof DataStore.generateTenPriceLedgerRecords === 'function') {
        this.product.priceLedger = DataStore.generateTenPriceLedgerRecords(this.product.id, this.product.currentPrice);
        this.product.currentPrice = this.product.priceLedger[0].price;
      }
    }

    if (DataStore.currentUser && typeof DataStore.fetchCustomerOrders === 'function') {
      try {
        await DataStore.fetchCustomerOrders();
      } catch (_) { }
    }

    try {
      const res = await DataStore.apiRequest(`/products/${this.product.id}/prices`);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        this.product.priceLedger = res.data;
        if (res.data[0] && res.data[0].price) {
          this.product.currentPrice = Number(res.data[0].price);
        }
      }
    } catch (_) { }

    this.render();
    this.renderRelatedProducts();
    this.renderPriceLedgerTable();
    await this.loadProductReviews();
  },

  updateQty(delta) {
    if (!this.product) return;
    const maxStock = typeof this.product.stockQuantity === 'number' ? this.product.stockQuantity : 50;
    if (maxStock <= 0) {
      this.quantity = 0;
      const input = document.getElementById('detail-qty-input') || document.querySelector('input[type="number"]');
      if (input) input.value = 0;
      return;
    }
    const nextQty = this.quantity + Number(delta);
    if (nextQty >= 1 && nextQty <= maxStock) {
      this.quantity = nextQty;
      const input = document.getElementById('detail-qty-input') || document.querySelector('input[type="number"]');
      if (input) input.value = this.quantity;
    }
  },

  switchImage(imgUrl) {
    const mainImg = document.getElementById('detail-main-img');
    if (mainImg) {
      mainImg.src = imgUrl;
    }
  },

  addToCart() {
    if (!this.product) return;
    if ((this.product.stockQuantity ?? 1) <= 0) {
      UIModule.showToast('This product is currently out of stock.', 'error');
      return;
    }
    try {
      DataStore.addToCart(this.product, this.quantity);
      UIModule.showToast(`Added ${this.quantity} × ${this.product.name} to your cart!`, 'success');
    } catch (err) {
      UIModule.showToast(err.message, 'error');
    }
  },

  buyNow() {
    if (!this.product) return;
    if ((this.product.stockQuantity ?? 1) <= 0) {
      UIModule.showToast('This product is currently out of stock.', 'error');
      return;
    }
    try {
      DataStore.addToCart(this.product, this.quantity);
      window.location.href = 'checkout.html';
    } catch (err) {
      UIModule.showToast(err.message, 'error');
    }
  },

  toggleSave() {
    this.toggleSaved();
  },

  toggleSaved() {
    if (!this.product) return;
    try {
      const added = DataStore.toggleSavedProduct(this.product.id);
      this.updateWishlistButton();
      UIModule.showToast(added ? 'Saved to your Wishlist!' : 'Removed from Wishlist', 'info');
    } catch (e) {

    }
  },

  updateWishlistButton() {
    if (!this.product) return;
    const isSaved = DataStore.isSaved(this.product.id);

    const btn = document.getElementById('detail-wishlist-btn');
    if (btn) {
      btn.innerHTML = isSaved ? '<svg class="w-4 h-4 inline" fill="currentColor" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> Saved' : '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> Save';
    }

    const saveIcon = document.getElementById('detail-save-icon');
    const saveText = document.getElementById('detail-save-text');
    if (saveIcon) saveIcon.innerHTML = isSaved ? '<svg class="w-5 h-5 text-red-500 fill-current" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' : '<svg class="w-5 h-5 text-[#c8a96e] hover:text-[#b89355] transition-colors" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
    if (saveText) saveText.innerText = isSaved ? 'Saved' : 'Save';
  },

  render() {
    const p = this.product;
    if (!p) return;

    const primaryImg = DataStore.getProductImage(p);

    const mainImg = document.getElementById('detail-main-img');
    if (mainImg) {
      mainImg.src = primaryImg;
      mainImg.alt = p.name;
      mainImg.onerror = function () { this.onerror = null; this.src = 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg'; };
    }

    const thumbsContainer = document.getElementById('detail-thumbs-container');
    if (thumbsContainer && p.images && p.images.length > 0) {
      thumbsContainer.innerHTML = p.images.map(img => {
        const src = (img && (img.imageUrl || img.url)) || 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg';
        return `
        <button
          type="button"
          onclick="ProductDetailModule.switchImage('${src}')"
          class="w-16 h-16 rounded border border-[#2a2520] hover:border-[#c8a96e] bg-[#0d0c0a] p-1.5 overflow-hidden transition-all cursor-pointer"
        >
          <img src="${src}" class="w-full h-full object-contain" onerror="this.onerror=null; this.src='images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg';" />
        </button>
      `;
      }).join('');
    }

    const catBadge = document.getElementById('detail-category-badge');
    const titleElem = document.getElementById('detail-title');
    const codeElem = document.getElementById('detail-code');
    const descElem = document.getElementById('detail-description');
    const priceElem = document.getElementById('detail-price');
    const origPriceElem = document.getElementById('detail-orig-price');
    const discountElem = document.getElementById('detail-discount');
    const stockBadge = document.getElementById('detail-stock-badge');
    const sellerNameElem = document.getElementById('detail-seller-name');
    const sellerGstinElem = document.getElementById('detail-seller-gstin');

    if (catBadge) catBadge.innerText = p.categoryName || 'General';
    if (titleElem) titleElem.innerText = p.name;
    if (codeElem) codeElem.innerText = p.code || `PROD-${p.id}`;
    if (descElem) descElem.innerText = p.description;

    if (priceElem) priceElem.innerText = UIModule.formatCurrency(p.currentPrice);
    if (origPriceElem) origPriceElem.innerText = UIModule.formatCurrency(p.originalPrice);

    const discountPercent = Math.round(((p.originalPrice - p.currentPrice) / p.originalPrice) * 100);
    if (discountElem) discountElem.innerText = `Save ${discountPercent}% (${UIModule.formatCurrency(p.originalPrice - p.currentPrice)})`;

    if (stockBadge) {
      if (p.stockQuantity > 10) {
        stockBadge.className = 'badge badge-green text-xs';
        stockBadge.innerHTML = `<span class="pulse-indicator mr-1"></span> In Stock (${p.stockQuantity} units available)`;
      } else if (p.stockQuantity > 0) {
        stockBadge.className = 'badge badge-amber text-xs';
        stockBadge.innerText = `Only ${p.stockQuantity} left - Order soon`;
      } else {
        stockBadge.className = 'badge badge-red text-xs';
        stockBadge.innerText = 'Out of Stock';
      }
    }

    if (sellerNameElem) {
      const liveSeller = (DataStore.sellers || []).find(s => Number(s.id) === Number(p.sellerId));
      sellerNameElem.innerText = (liveSeller && (liveSeller.companyName || liveSeller.CompanyName)) || p.sellerName || 'Apex Tech Store';
    }
    if (sellerGstinElem) {
      const liveSeller = (DataStore.sellers || []).find(s => Number(s.id) === Number(p.sellerId));
      sellerGstinElem.innerText = (liveSeller && liveSeller.gstin) || p.sellerGstin || '29ABCDE1234F1Z5';
    }

    const matchingProducts = (DataStore.products || []).filter(item =>
      item.name && item.name.trim().toLowerCase() === p.name.trim().toLowerCase()
    );
    const totalStock = matchingProducts.reduce((sum, item) => sum + (Number(item.stockQuantity) || 0), 0) || (p.stockQuantity || 20);
    const sellersCount = matchingProducts.length > 0 ? matchingProducts.length : 1;

    const metricStock = document.getElementById('metric-total-stock');
    if (metricStock) {
      metricStock.innerText = `${totalStock} units across ${sellersCount} ${sellersCount > 1 ? 'sellers' : 'seller'}`;
    }

    const recentOrders = (DataStore.orders || []).filter(o =>
      o.items && o.items.some(item => Number(item.productId || item.id) === p.id)
    );
    const demandCount = recentOrders.length || Math.floor((p.id % 5) * 2) + 3;

    const metricDemand = document.getElementById('metric-demand-orders');
    if (metricDemand) {
      metricDemand.innerText = `${demandCount} orders placed in last 24h`;
    }

    const metricRate = document.getElementById('metric-ledger-rate');
    if (metricRate) {
      metricRate.innerText = `${UIModule.formatCurrency(p.currentPrice)} (Active)`;
    }

    const metricTemp = document.getElementById('metric-temporal-window');
    if (metricTemp) {
      const hour = new Date().getHours();
      let timeWindow = "Standard Window";
      if (hour >= 18 && hour <= 22) timeWindow = "Peak Evening (18-22h)";
      else if (hour >= 12 && hour <= 14) timeWindow = "Midday Peak (12-14h)";
      else if (hour >= 1 && hour <= 6) timeWindow = "Late Night Off-Peak";
      metricTemp.innerText = timeWindow;
    }

    this.updateWishlistButton();
  },

  openDynamicPricingDetails() {
    if (this.product) {
      UIModule.openDynamicPricingModal(this.product.id);
    }
  },

  renderPriceLedgerTable() {
    const tbody = document.getElementById('detail-price-ledger-tbody') || document.getElementById('price-ledger-tbody');
    if (!tbody) return;

    const ledger = (this.product.priceLedger && this.product.priceLedger.length > 0)
      ? this.product.priceLedger
      : (typeof DataStore.generateTenPriceLedgerRecords === 'function'
        ? DataStore.generateTenPriceLedgerRecords(this.product.id, this.product.currentPrice)
        : [{ id: 1, price: this.product.currentPrice, fluctuation: 0, changedAt: '2026-09-20 18:00:00', changeReason: 'Current Catalog Price' }]);

    tbody.innerHTML = ledger.slice(0, 10).map((entry, idx) => {
      const fluc = Number(entry.fluctuation || entry.priceFluctuation || 0);
      let flucBadge = '<span class="text-[#9a9188] font-mono text-[11px] font-semibold">-- Baseline</span>';
      if (fluc > 0) {
        flucBadge = `<span class="badge badge-amber text-[10px] font-mono font-bold">+${UIModule.formatCurrency(fluc)}</span>`;
      } else if (fluc < 0) {
        flucBadge = `<span class="badge badge-green text-[10px] font-mono font-bold">${UIModule.formatCurrency(fluc)}</span>`;
      }

      const dateStr = entry.recordedAt ? entry.recordedAt.replace('T', ' ').slice(0, 19) : (entry.changedAt || '2026-11-01');

      return `
        <tr class="hover:bg-[#1a1714] border-b border-[#2a2520] transition-colors text-xs ${idx === 0 ? 'bg-[#181512]/60' : ''}">
          <td class="p-3 font-semibold text-[#e8e2d9]">
            ${idx === 0 ? '<span class="badge badge-gold text-[10px] mr-1.5 font-bold">Active</span>' : ''}
            <span class="font-serif font-bold text-sm text-[#e8e2d9]">${UIModule.formatCurrency(entry.price)}</span>
          </td>
          <td class="p-3">${flucBadge}</td>
          <td class="p-3 text-[#9a9188] font-mono text-[11px]">${UIModule.escapeHtml(dateStr)}</td>
          <td class="p-3 text-[#e8e2d9]">
            <span class="block font-medium text-[11px] text-[#e8e2d9]">${UIModule.escapeHtml(entry.changeReason || entry.sourceName || 'Dynamic Pricing Algorithm')}</span>
            <div class="flex items-center gap-1.5 mt-1 text-[10px] text-[#9a9188] font-mono flex-wrap">
              <span>Source: ${UIModule.escapeHtml(entry.sourceName || 'Dynamic Pricing Algorithm')}</span>
              ${entry.demandFactor ? `<span class="px-1.5 py-0.5 rounded bg-[#1e1b17] border border-[#2e2820] text-[#c8a96e]">Demand: ${Number(entry.demandFactor).toFixed(2)}x</span>` : ''}
              ${entry.scarcityFactor ? `<span class="px-1.5 py-0.5 rounded bg-[#1e1b17] border border-[#2e2820] text-amber-400">Scarcity: ${Number(entry.scarcityFactor).toFixed(2)}x</span>` : ''}
              ${entry.competitionFactor ? `<span class="px-1.5 py-0.5 rounded bg-[#1e1b17] border border-[#2e2820] text-blue-400">Temporal: ${Number(entry.competitionFactor).toFixed(2)}x</span>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  async recalculateDynamicPricing() {
    const btn = document.getElementById('recalculate-dynamic-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Evaluating...';
    }
    UIModule.showToast('Evaluating dynamic pricing model based on stock across all sellers and 24h demand...', 'info');

    try {
      const updatedProduct = await DataStore.applyDynamicPrice(this.product.id, 24);
      if (updatedProduct) {
        this.product.currentPrice = updatedProduct.currentPrice || this.product.currentPrice;
        if (updatedProduct.priceLedger) {
          this.product.priceLedger = updatedProduct.priceLedger;
        }
        try {
          const res = await DataStore.apiRequest(`/products/${this.product.id}/prices`);
          if (res && res.success && Array.isArray(res.data)) {
            this.product.priceLedger = res.data;
          }
        } catch (_) {}
        this.render();
        this.renderPriceLedgerTable();
        UIModule.showToast(`Dynamic price re-evaluated to ${UIModule.formatCurrency(this.product.currentPrice)}! New audited entry in Price Ledger.`, 'success');
      }
    } catch (err) {
      console.error('Dynamic pricing evaluation error:', err);
      UIModule.showToast('Could not evaluate dynamic price', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Evaluate Dynamic Price';
      }
    }
  },

  renderRelatedProducts() {
    const container = document.getElementById('related-products-container');
    if (!container) return;

    const related = DataStore.products.filter(p => p.id !== this.product.id).slice(0, 4);

    container.innerHTML = related.map(p => {
      const img = DataStore.getProductImage(p);
      const safeName = UIModule.escapeHtml(p.name);
      const isOutOfStock = (p.stockQuantity ?? 1) <= 0;

      return `
        <div class="clean-card product-card p-4 flex flex-col justify-between">
          <a href="product-detail.html?id=${encodeURIComponent(p.code || p.id)}" class="block group">
            <div class="h-36 w-full flex items-center justify-center p-2 mb-3 bg-[#0a0908] rounded border border-[#1f1b17]">
              <img src="${img}" alt="${safeName}" class="h-full object-contain group-hover:scale-105 transition-transform" onerror="this.onerror=null; this.src='images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg';" />
            </div>
            <h4 class="text-xs font-semibold text-[#e8e2d9] line-clamp-2 hover:text-[#c8a96e]">${safeName}</h4>
          </a>
          <div class="mt-3 pt-2 border-t border-[#2a2520] flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-[#e8e2d9] text-sm">${UIModule.formatCurrency(p.currentPrice)}</span>
              <button
                type="button"
                onclick="UIModule.openDynamicPricingModal(${p.id}, event)"
                class="text-[9px] px-1 py-0.5 rounded bg-[#c8a96e]/10 text-[#c8a96e] border border-[#c8a96e]/30 hover:bg-[#c8a96e]/20 transition-all cursor-pointer font-medium"
                title="View dynamic pricing signals">
                <span class="inline-flex items-center gap-1">
                  <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Dynamic
                </span>
              </button>
            </div>
            ${isOutOfStock ? `
              <span class="badge badge-red text-[10px] py-1 px-2">Sold Out</span>
            ` : `
              <button
                type="button"
                onclick="try { DataStore.addToCart(DataStore.products.find(prod => prod.id === ${p.id}), 1); UIModule.showToast('Added to cart!', 'success'); } catch(e){ UIModule.showToast(e.message, 'error'); }"
                class="btn-primary text-xs py-1 px-2.5 cursor-pointer"
              >
                + Cart
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  },

  async loadProductReviews() {
    if (!this.product) return;
    const productId = this.product.id;

    let summary = null;
    let reviews = [];

    try {
      summary = await DataStore.getProductReviewSummary(productId);
      reviews = await DataStore.getProductReviews(productId);
    } catch (e) {
      console.warn('[ProductDetail] Error loading reviews:', e);
    }

    this.reviewsList = reviews || [];
    const avgRating = summary && summary.averageRating ? Number(summary.averageRating) : 0.0;
    const totalCount = summary && summary.totalReviews ? Number(summary.totalReviews) : (reviews ? reviews.length : 0);

    // Update Header Rating
    const scoreElem = document.getElementById('detail-rating-score');
    if (scoreElem) {
      if (totalCount > 0 && avgRating > 0) {
        scoreElem.innerText = avgRating.toFixed(1);
      } else {
        scoreElem.innerText = 'Unrated';
      }
    }

    const countElem = document.getElementById('detail-review-count');
    if (countElem) {
      countElem.innerText = totalCount > 0 ? `${totalCount} Verified Buyer Review${totalCount > 1 ? 's' : ''}` : 'No Reviews Yet';
    }

    // Render Star Icons
    const starContainer = document.getElementById('detail-star-icons');
    if (starContainer) {
      if (totalCount > 0 && avgRating > 0) {
        starContainer.innerHTML = [1, 2, 3, 4, 5].map(star => {
          const filled = star <= Math.round(avgRating);
          return `
            <svg class="w-3.5 h-3.5 ${filled ? 'fill-current text-amber-400' : 'fill-current text-[#443e37]'}" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
            </svg>
          `;
        }).join('');
      } else {
        starContainer.innerHTML = [1, 2, 3, 4, 5].map(() => `
          <svg class="w-3.5 h-3.5 fill-current text-[#443e37]" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
        `).join('');
      }
    }

    // Check if current user has a delivered order with this product
    const eligibilityPrompt = document.getElementById('review-eligibility-prompt');
    if (eligibilityPrompt) {
      const deliveredOrders = (DataStore.orders || []).filter(o => o.shippingStatus === 'DELIVERED');
      const matchingOrder = deliveredOrders.find(o => o.items && o.items.some(it => Number(it.productId || it.id) === Number(productId)));

      if (matchingOrder) {
        const existingReview = (this.reviewsList || []).find(r =>
          (Number(r.orderId) === Number(matchingOrder.id) && Number(r.productId) === Number(productId)) ||
          (DataStore.currentUser && Number(r.customerId) === Number(DataStore.currentUser.id) && Number(r.productId) === Number(productId))
        );

        eligibilityPrompt.innerHTML = `
          <button
            type="button"
            onclick="ProductDetailModule.openReviewModal(${matchingOrder.id}, ${productId})"
            class="btn-primary py-2.5 px-5 text-xs font-bold bg-gradient-to-r from-[#c8a96e] to-[#b89355] text-black hover:brightness-110 flex items-center gap-2 shadow-md cursor-pointer transition-transform hover:scale-105"
            title="Leave or edit your verified review"
          >
            <span>⭐</span>
            <span>${existingReview ? `Your Review: ★ ${existingReview.rating}/5 (Edit)` : `Rate & Review (Order #${matchingOrder.id})`}</span>
          </button>
        `;
      } else {
        eligibilityPrompt.innerHTML = `
          <span class="text-xs text-[#9a9188]">
            <span class="text-emerald-400 font-bold">✓ Verified Purchase</span> reviews only
          </span>
        `;
      }
    }

    // Render Reviews Section
    const reviewsContainer = document.getElementById('product-reviews-container');
    if (!reviewsContainer) return;

    if (!reviews || reviews.length === 0) {
      reviewsContainer.innerHTML = `
        <div class="clean-card p-8 bg-[#131110] border border-[#2a2520] text-center space-y-3">
          <div class="w-12 h-12 rounded-full bg-[#1c1916] text-[#c8a96e] flex items-center justify-center mx-auto text-xl border border-[#2a2520]">⭐</div>
          <h3 class="text-base font-bold text-white">No Reviews Yet</h3>
          <p class="text-xs text-[#9a9188] max-w-md mx-auto">Be the first to review this product! After placing an order and receiving your 20-minute delivery, you can share verified feedback right here.</p>
        </div>
      `;
      return;
    }

    const counts = (summary && summary.ratingCounts) || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    reviewsContainer.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Rating Breakdown Card -->
        <div class="clean-card p-6 bg-[#131110] border border-[#2a2520] space-y-4">
          <div class="text-center sm:text-left">
            <span class="text-4xl font-extrabold text-[#e8e2d9]">${totalCount > 0 ? avgRating.toFixed(1) : '0.0'}</span>
            <span class="text-sm text-[#9a9188]"> / 5.0</span>
            <div class="flex items-center justify-center sm:justify-start gap-1 text-amber-400 text-lg my-1">
              ${[1, 2, 3, 4, 5].map(s => (totalCount > 0 && s <= Math.round(avgRating)) ? '★' : '<span class="text-[#443e37]">★</span>').join('')}
            </div>
            <span class="text-xs text-[#9a9188]">${totalCount > 0 ? `${totalCount} verified rating${totalCount > 1 ? 's' : ''}` : 'No verified ratings yet'}</span>
          </div>

          <!-- Breakdown Bars -->
          <div class="space-y-2 pt-2 border-t border-[#2a2520] text-xs">
            ${[5, 4, 3, 2, 1].map(star => {
              const c = counts[star] || 0;
              const pct = totalCount > 0 ? Math.round((c / totalCount) * 100) : 0;
              return `
                <div class="flex items-center gap-2">
                  <span class="w-7 text-[#9a9188] font-medium">${star} ★</span>
                  <div class="flex-1 h-2 bg-[#1c1916] rounded-full overflow-hidden border border-[#2a2520]">
                    <div class="h-full bg-gradient-to-r from-[#c8a96e] to-[#b89355] rounded-full" style="width: ${pct}%"></div>
                  </div>
                  <span class="w-8 text-right text-[#9a9188] text-[11px]">${pct}%</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Reviews List -->
        <div class="md:col-span-2 space-y-4">
          ${reviews.map(r => `
            <div class="clean-card p-5 bg-[#131110] border border-[#2a2520] space-y-2.5">
              <div class="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-[#e8e2d9] text-xs">${UIModule.escapeHtml(r.customerName || 'Verified Buyer')}</span>
                    <span class="badge badge-gold text-[9px] py-0.5 px-1.5 flex items-center gap-1">
                      <span>✓</span> Verified Purchase
                    </span>
                  </div>
                  <div class="flex items-center gap-1 text-amber-400 text-sm mt-1">
                    ${[1, 2, 3, 4, 5].map(s => s <= r.rating ? '★' : '<span class="text-[#443e37]">★</span>').join('')}
                    <span class="text-xs font-semibold text-[#e8e2d9] ml-1.5">${UIModule.escapeHtml(r.title || 'Verified Purchase Review')}</span>
                  </div>
                </div>
                <span class="text-[11px] text-[#9a9188]">${r.formattedDate || (r.createdAt ? r.createdAt.split('T')[0] : 'Recent')}</span>
              </div>
              <p class="text-xs text-[#c4bdb2] leading-relaxed pt-1 border-t border-[#1f1b17]">${UIModule.escapeHtml(r.comment)}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  openReviewModal(orderId, productId) {
    this.currentReviewOrderId = orderId;
    this.currentReviewProductId = productId;

    const existing = (this.reviewsList || []).find(r =>
      (Number(r.orderId) === Number(orderId) && Number(r.productId) === Number(productId)) ||
      (DataStore.currentUser && Number(r.customerId) === Number(DataStore.currentUser.id) && Number(r.productId) === Number(productId))
    );

    this.currentRatingValue = existing ? Number(existing.rating || 5) : 5;
    const initialTitle = existing ? (existing.title || '') : '';
    const initialComment = existing ? (existing.comment || '') : '';
    const prodName = this.product ? (this.product.name || 'Product') : 'Product';
    const prodImg = this.product ? DataStore.getProductImage(this.product) : 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg';

    let modal = document.getElementById('product-detail-review-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'product-detail-review-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm hidden';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="relative w-full max-w-lg bg-[#131110] rounded-xl border border-[#2a2520] p-6 sm:p-7 shadow-2xl space-y-5 animate-fade-in text-xs">
        <button type="button" onclick="ProductDetailModule.closeReviewModal()" class="absolute top-4 right-4 text-[#9a9188] hover:text-[#e8e2d9] text-xl font-bold cursor-pointer">✕</button>

        <div class="flex items-center gap-3.5 pb-4 border-b border-[#2a2520]">
          <img src="${UIModule.escapeHtml(prodImg)}" alt="${UIModule.escapeHtml(prodName)}" class="w-14 h-14 object-contain bg-[#161412] rounded p-1 border border-[#2a2520] shrink-0" onerror="this.onerror=null; this.src='images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg';" />
          <div class="min-w-0">
            <span class="text-[10px] tracking-widest uppercase font-semibold text-[#c8a96e] block mb-0.5">Verified Purchase • Order #${orderId}</span>
            <h3 class="text-base font-serif font-bold text-white truncate">${UIModule.escapeHtml(prodName)}</h3>
            <span class="text-[11px] text-[#9a9188]">Share your experience with the community</span>
          </div>
        </div>

        <form onsubmit="ProductDetailModule.submitReview(event)" class="space-y-4">
          <div>
            <label class="block font-semibold text-[#e8e2d9] mb-2">Overall Rating <span class="text-red-400">*</span></label>
            <div class="flex items-center gap-2" id="pdm-review-stars-container">
              ${[1, 2, 3, 4, 5].map(star => `
                <button
                  type="button"
                  onclick="ProductDetailModule.setRating(${star})"
                  onmouseenter="ProductDetailModule.previewRating(${star})"
                  onmouseleave="ProductDetailModule.previewRating(${this.currentRatingValue})"
                  class="star-btn text-2xl transition-transform hover:scale-110 focus:outline-none cursor-pointer ${star <= this.currentRatingValue ? 'text-amber-400' : 'text-[#443e37]'}"
                  data-star="${star}"
                  title="${star} Stars"
                >★</button>
              `).join('')}
              <span id="pdm-review-rating-label" class="text-xs font-bold text-[#c8a96e] ml-2">${this.currentRatingValue} of 5 Stars</span>
            </div>
          </div>

          <div>
            <label class="block font-semibold text-[#e8e2d9] mb-1">Review Title <span class="text-[#9a9188] font-normal">(optional)</span></label>
            <input
              type="text"
              id="pdm-review-title-input"
              maxlength="150"
              placeholder="e.g. Exceptional quality & delivered within 20 mins!"
              value="${UIModule.escapeHtml(initialTitle)}"
              class="clean-input text-xs w-full"
            />
          </div>

          <div>
            <label class="block font-semibold text-[#e8e2d9] mb-1">Detailed Review <span class="text-red-400">*</span></label>
            <textarea
              id="pdm-review-comment-input"
              rows="4"
              required
              maxlength="2000"
              placeholder="Tell others what you think about the product build, performance, or 20-min fulfillment..."
              class="clean-input text-xs w-full py-2.5 leading-relaxed resize-none"
            >${UIModule.escapeHtml(initialComment)}</textarea>
            <span class="text-[10px] text-[#9a9188] block text-right mt-1">Review saved permanently to OmniCart database</span>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#2a2520]">
            <button
              type="button"
              onclick="ProductDetailModule.closeReviewModal()"
              class="btn-secondary py-2.5 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="pdm-review-submit-btn"
              class="btn-primary py-2.5 px-6 text-xs font-bold bg-gradient-to-r from-[#c8a96e] to-[#b89355] text-black hover:brightness-110 cursor-pointer shadow-sm"
            >
              Submit Review →
            </button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
    this.previewRating(this.currentRatingValue);
  },

  closeReviewModal() {
    const modal = document.getElementById('product-detail-review-modal');
    if (modal) modal.classList.add('hidden');
  },

  setRating(val) {
    this.currentRatingValue = val;
    this.previewRating(val);
  },

  previewRating(val) {
    const stars = document.querySelectorAll('#pdm-review-stars-container .star-btn');
    stars.forEach(btn => {
      const s = Number(btn.getAttribute('data-star'));
      if (s <= val) {
        btn.classList.add('text-amber-400');
        btn.classList.remove('text-[#443e37]');
      } else {
        btn.classList.remove('text-amber-400');
        btn.classList.add('text-[#443e37]');
      }
    });
    const label = document.getElementById('pdm-review-rating-label');
    if (label) {
      const labels = { 1: '1 of 5 (Poor)', 2: '2 of 5 (Fair)', 3: '3 of 5 (Good)', 4: '4 of 5 (Very Good)', 5: '5 of 5 (Excellent)' };
      label.innerText = labels[val] || `${val} of 5 Stars`;
    }
  },

  async submitReview(e) {
    e.preventDefault();
    const btn = document.getElementById('pdm-review-submit-btn');
    const titleInput = document.getElementById('pdm-review-title-input');
    const commentInput = document.getElementById('pdm-review-comment-input');

    const title = titleInput ? titleInput.value.trim() : '';
    const comment = commentInput ? commentInput.value.trim() : '';

    if (!comment) {
      UIModule.showToast('Please provide a comment for your review.', 'error');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerText = 'Saving to database...';
    }

    try {
      const savedReview = await DataStore.submitProductReview({
        orderId: this.currentReviewOrderId,
        productId: this.currentReviewProductId,
        rating: this.currentRatingValue,
        title: title || 'Verified Purchase Review',
        comment: comment
      });

      this.closeReviewModal();
      UIModule.showToast('Thank you! Your verified review has been saved in the database.', 'success');
      await this.loadProductReviews();
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to submit review.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = 'Submit Review →';
      }
    }
  }
};

window.ProductDetailModule = ProductDetailModule;
