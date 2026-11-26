
const SavedProductsModule = {
  init() {
    this.render();
  },

  render() {
    const authPrompt = document.getElementById('saved-products-auth-prompt');
    const listWrapper = document.getElementById('saved-products-list-wrapper');
    const container = document.getElementById('saved-products-container');
    const countBadge = document.getElementById('saved-total-count');

    if (!DataStore.currentUser || DataStore.currentUserRole !== 'buyer') {
      if (authPrompt) {
        authPrompt.innerHTML = UIModule.getPermissionDeniedHtml({
          title: 'Authentication Required: Access Restricted',
          message: 'Saved pieces and personalized wishlist curation require an active customer session. Please sign in to view your collection.',
          requiredRole: 'buyer',
          returnUrl: 'products.html',
          actionText: 'Sign In to Access Wishlist'
        });
        authPrompt.classList.remove('hidden');
      }
      if (listWrapper) listWrapper.classList.add('hidden');
      return;
    }

    if (authPrompt) authPrompt.classList.add('hidden');
    if (listWrapper) listWrapper.classList.remove('hidden');

    const savedIds = DataStore.getSavedProducts();
    const savedItems = DataStore.products.filter(p => savedIds.includes(Number(p.id)));

    if (countBadge) {
      countBadge.innerText = `${savedItems.length} curated item${savedItems.length === 1 ? '' : 's'}`;
    }

    if (!container) return;

    if (savedItems.length === 0) {
      container.innerHTML = `
        <div class="col-span-full">
          ${UIModule.getEmptyStateHtml({
            icon: 'saved',
            title: 'Your Curated Wishlist is Empty',
            description: 'Click the bookmark icon on any piece in our catalog to track availability and reserve units.',
            actionText: 'Explore Curated Marketplace →',
            actionUrl: 'products.html'
          })}
        </div>
      `;
      return;
    }

    container.innerHTML = savedItems.map(p => {
      const img = DataStore.getProductImage(p);
      const safeName = UIModule.escapeHtml(p.name);
      const safeCat = UIModule.escapeHtml(p.categoryName || 'Curated');
      const safeImg = UIModule.escapeHtml(img);
      const isOutOfStock = p.stockQuantity <= 0;

      return `
        <div class="clean-card group flex flex-col justify-between relative overflow-hidden p-5 transition-all duration-300 hover:border-[#c8a96e]/40">
          <div>
            <div class="h-48 w-full flex items-center justify-center p-3 mb-4 bg-[#0a0908] rounded border border-[#2a2520] relative overflow-hidden">
              <a href="product-detail.html?id=${encodeURIComponent(p.code || p.id)}" class="w-full h-full flex items-center justify-center">
                <img src="${safeImg}" alt="${safeName}" class="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform duration-500" onerror="this.onerror=null; this.src='images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg';" />
              </a>
              <button
                onclick="SavedProductsModule.removeFromSaved(${p.id})"
                class="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-[#131110]/85 border border-[#2a2520] text-[#9a9188] hover:text-white flex items-center justify-center text-xs transition-colors"
                title="Remove from saved"
              >
                ✕
              </button>
            </div>

            <span class="text-[10px] uppercase tracking-[0.15em] text-[#c8a96e] block font-mono mb-1">${safeCat}</span>
            <a href="product-detail.html?id=${encodeURIComponent(p.code || p.id)}" class="font-serif font-bold text-white text-base hover:text-[#c8a96e] block line-clamp-2 transition-colors">
              ${safeName}
            </a>
          </div>

          <div class="pt-4 border-t border-[#2a2520] mt-4 flex items-center justify-between">
            <span class="font-serif font-bold text-[#c8a96e] text-lg">${UIModule.formatCurrency(p.currentPrice)}</span>
            ${isOutOfStock ? `
              <span class="badge badge-red text-[10px] py-1 px-2.5">Sold Out</span>
            ` : `
              <button
                onclick="SavedProductsModule.moveToCart(${p.id})"
                class="btn-primary text-xs py-1.5 px-3.5"
              >
                Move to Bag
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  },

  removeFromSaved(productId) {
    DataStore.toggleSavedProduct(productId);
    this.render();
    UIModule.renderHeader();
    UIModule.showToast('Item removed from wishlist', 'info');
  },

  moveToCart(productId) {
    const prod = DataStore.products.find(p => Number(p.id) === Number(productId));
    if (!prod) {
      UIModule.showToast('Product not found in catalog', 'error');
      return;
    }
    if (prod.stockQuantity <= 0) {
      UIModule.showToast(`"${prod.name}" is currently out of stock.`, 'error');
      return;
    }
    try {
      DataStore.addToCart(prod, 1);
      DataStore.toggleSavedProduct(productId);
      this.render();
      UIModule.renderHeader();
      UIModule.showToast(`Moved "${prod.name}" to your shopping bag!`, 'success');
    } catch (err) {
      UIModule.showToast(err.message || 'Could not move item to cart.', 'error');
    }
  }
};

window.SavedProductsModule = SavedProductsModule;
