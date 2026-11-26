
const CheckoutModule = {
  razorpayKeyId: 'rzp_test_Tpn2AxYduinPwW',
  appliedVoucher: localStorage.getItem('omnicart_voucher') || null,
  voucherDiscount: Number(localStorage.getItem('omnicart_discount') || 0),
  selectedAddressId: null,
  selectedPaymentMethod: 'Pay via Razorpay',
  selectedPaymentMethodId: 3,
  activeGatewayTab: 'upi',
  useSavedDetails: false,

  async init() {
    const isCartPage = window.location.pathname.includes('cart.html');
    const isCheckoutPage = window.location.pathname.includes('checkout.html');

    if (isCartPage) {
      this.renderCartPage();
    } else if (isCheckoutPage) {
      if (DataStore.currentUser && DataStore.currentUserRole === 'buyer') {
        try {
          await DataStore.fetchCustomerAddresses();
        } catch (_) {}
      }
      if (DataStore.addresses && DataStore.addresses.length > 0) {
        this.useSavedDetails = true;
        if (!this.selectedAddressId) {
          const defaultA = DataStore.addresses.find(a => a.isDefault) || DataStore.addresses[0];
          this.selectedAddressId = defaultA ? defaultA.id : DataStore.addresses[0].id;
        }
      }
      this.renderCheckoutPage();
      this.updatePaymentRailUI();
    }
  },

  renderCartPage() {
    const emptyMsg = document.getElementById('cart-empty-message');
    const tableWrapper = document.getElementById('cart-table-wrapper');
    const tbody = document.getElementById('cart-page-tbody');
    const subtotalElem = document.getElementById('summary-subtotal');
    const discountElem = document.getElementById('summary-discount');
    const finalTotalElem = document.getElementById('summary-final-total') || document.getElementById('summary-total');
    const checkoutBtn = document.getElementById('checkout-action-btn');

    const cart = DataStore.getCart();

    if (cart.length === 0) {
      if (emptyMsg) {
        emptyMsg.innerHTML = UIModule.getEmptyStateHtml({
          icon: 'cart',
          title: 'Your Shopping Bag is Empty',
          description: 'Explore verified authentic pieces from certified luxury merchants across our marketplace catalog.',
          actionText: 'Explore Marketplace Catalog →',
          actionUrl: 'products.html'
        });
        emptyMsg.classList.remove('hidden');
      }
      if (tableWrapper) tableWrapper.classList.add('hidden');
      if (subtotalElem) subtotalElem.innerText = '₹0';
      if (finalTotalElem) finalTotalElem.innerText = '₹0';
      if (checkoutBtn) {
        checkoutBtn.classList.add('opacity-50', 'pointer-events-none');
      }
      return;
    }

    if (emptyMsg) emptyMsg.classList.add('hidden');
    if (tableWrapper) tableWrapper.classList.remove('hidden');
    if (checkoutBtn) {
      checkoutBtn.classList.remove('opacity-50', 'pointer-events-none');
    }

    if (tbody) {
      tbody.innerHTML = cart.map(item => {
        const liveProd = (DataStore.products || []).find(p => p.id === item.id);
        const availableStock = liveProd ? liveProd.stockQuantity : 99;
        const isExceedingStock = item.quantity > availableStock;
        const safeName = UIModule.escapeHtml(item.name || 'Product');
        const safeCat = UIModule.escapeHtml(item.categoryName || 'General');
        const safeCode = UIModule.escapeHtml(item.code || `PROD-${item.id}`);
        const safeImg = UIModule.escapeHtml(item.image || DataStore.getProductImage(item));

        return `
        <tr class="hover:bg-[#1a1714] border-b border-[#2a2520] transition-colors">
          <!-- Product Name & Image -->
          <td class="py-4 px-2">
            <div class="flex items-center gap-3">
              <img src="${safeImg}" alt="${safeName}" class="w-14 h-14 object-contain rounded bg-[#0a0908] p-1 border border-[#2a2520] shrink-0" onerror="this.onerror=null; this.src='images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg';" />
              <div>
                <span class="text-[10px] text-[#c8a96e] tracking-wider uppercase font-semibold block">${safeCat}</span>
                <a href="product-detail.html?id=${encodeURIComponent(item.code || item.id)}" class="font-semibold text-[#e8e2d9] text-xs sm:text-sm hover:text-[#c8a96e] block line-clamp-1">
                  ${safeName}
                </a>
                <span class="text-[11px] text-[#9a9188] font-mono">${safeCode}</span>
                ${isExceedingStock ? `<span class="text-[10px] text-red-400 font-semibold block mt-0.5">Only ${availableStock} in stock</span>` : ''}
              </div>
            </div>
          </td>

          <!-- Unit Price -->
          <td class="py-4 px-2 font-semibold text-[#e8e2d9] text-xs sm:text-sm">
            ${UIModule.formatCurrency(item.price)}
          </td>

          <!-- Quantity Stepper -->
          <td class="py-4 px-2">
            <div class="flex items-center border border-[#2a2520] rounded overflow-hidden w-24 bg-[#0a0908]">
              <button
                onclick="CheckoutModule.updateCartItemQty(${item.id}, ${item.quantity - 1})"
                class="w-7 h-7 flex items-center justify-center hover:bg-[#1a1714] hover:text-[#c8a96e] text-[#e8e2d9] font-bold cursor-pointer"
              >
                -
              </button>
              <span class="flex-1 text-center font-bold text-xs text-[#e8e2d9]">${item.quantity}</span>
              <button
                onclick="CheckoutModule.updateCartItemQty(${item.id}, ${item.quantity + 1})"
                class="w-7 h-7 flex items-center justify-center hover:bg-[#1a1714] hover:text-[#c8a96e] text-[#e8e2d9] font-bold cursor-pointer"
              >
                +
              </button>
            </div>
          </td>

          <!-- Line Subtotal -->
          <td class="py-4 px-2 font-bold text-[#e8e2d9] text-xs sm:text-sm">
            ${UIModule.formatCurrency(Math.round(item.price * item.quantity * 100) / 100)}
          </td>

          <!-- Remove Action -->
          <td class="py-4 px-2 text-right">
            <button
              onclick="CheckoutModule.removeCartItem(${item.id})"
              class="w-7 h-7 rounded hover:bg-[#2d1212] text-[#fca5a5] hover:text-red-400 text-xs inline-flex items-center justify-center transition-colors cursor-pointer"
              title="Remove item"
            >
              ✕
            </button>
          </td>
        </tr>
      `;
      }).join('');
    }

    const subtotal = DataStore.getCartSubtotal();
    const discount = Math.min(this.voucherDiscount, subtotal);
    const finalTotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

    if (subtotalElem) subtotalElem.innerText = UIModule.formatCurrency(subtotal);
    if (discountElem) discountElem.innerText = discount > 0 ? `-${UIModule.formatCurrency(discount)}` : '₹0';
    if (finalTotalElem) finalTotalElem.innerText = UIModule.formatCurrency(finalTotal);
  },

  updateCartItemQty(productId, newQty) {
    DataStore.updateCartQty(productId, newQty);
    this.renderCartPage();
    UIModule.renderHeader();
  },

  removeCartItem(productId) {
    DataStore.removeFromCart(productId);
    this.renderCartPage();
    UIModule.renderHeader();
    UIModule.showToast('Item removed from cart', 'info');
  },

  applyPromoCode() {
    const input = document.getElementById('cart-promo-input');
    if (!input) return;

    const code = input.value.trim().toUpperCase();
    if (code === 'FESTIVE-LIGHT') {
      this.appliedVoucher = 'FESTIVE-LIGHT';
      this.voucherDiscount = 250;
      localStorage.setItem('omnicart_voucher', 'FESTIVE-LIGHT');
      localStorage.setItem('omnicart_discount', '250');
      UIModule.showToast('Voucher applied: ₹250 discount deducted!', 'success');
      this.renderCartPage();
    } else if (code === 'FIRST50') {
      this.appliedVoucher = 'FIRST50';
      this.voucherDiscount = 50;
      localStorage.setItem('omnicart_voucher', 'FIRST50');
      localStorage.setItem('omnicart_discount', '50');
      UIModule.showToast('Voucher applied: ₹50 discount deducted!', 'success');
      this.renderCartPage();
    } else {
      UIModule.showToast('Invalid promo code. Try "FESTIVE-LIGHT"', 'error');
    }
  },

  // -------------------------------------------------------------
  // CHEC  useSavedDetails: false, // Default is false: don't autofill saved details automatically!

  setUseSavedDetails(enable) {
    this.useSavedDetails = Boolean(enable);
    this.renderCheckoutPage();
  },

  fillFromSavedProfile() {
    const user = DataStore.currentUser;
    if (!user) {
      UIModule.showToast('No logged in customer profile found.', 'error');
      return;
    }
    const nameInput = document.getElementById('checkout-manual-name');
    const phoneInput = document.getElementById('checkout-manual-phone');
    const emailInput = document.getElementById('checkout-manual-email');
    const streetInput = document.getElementById('checkout-manual-street');
    const cityInput = document.getElementById('checkout-manual-city');
    const stateInput = document.getElementById('checkout-manual-state');
    const pinInput = document.getElementById('checkout-manual-pincode');

    if (nameInput) nameInput.value = `${user.FirstName || ''} ${user.LastName || ''}`.trim() || 'Jane Doe';
    if (phoneInput) phoneInput.value = user.phone || '+91 98765 43210';
    if (emailInput) emailInput.value = user.email || '';

    const defaultAddr = (DataStore.addresses && DataStore.addresses.find(a => a.isDefault)) || (DataStore.addresses && DataStore.addresses[0]);
    if (defaultAddr) {
      if (streetInput) streetInput.value = defaultAddr.street || '';
      if (cityInput) cityInput.value = defaultAddr.city || 'Bengaluru';
      if (stateInput) stateInput.value = defaultAddr.state || '';
      if (pinInput) pinInput.value = defaultAddr.pincode || '560001';
    }

    UIModule.showToast('Autofilled fields using your saved profile details!', 'success');
  },

  // -------------------------------------------------------------
  // CHECKOUT.HTML METHODS
  // -------------------------------------------------------------
  renderCheckoutPage() {
    const customerBox = document.getElementById('checkout-customer-box');
    const addressesList = document.getElementById('checkout-addresses-list');
    const miniItemsContainer = document.getElementById('checkout-mini-items');
    const subtotalElem = document.getElementById('summary-subtotal');
    const discountElem = document.getElementById('summary-discount');
    const totalElem = document.getElementById('summary-total');
    const step1Title = document.getElementById('checkout-step1-title');
    const step1Action = document.getElementById('checkout-step1-action');

    if (!DataStore.currentUser || DataStore.currentUserRole !== 'buyer') {
      window.location.href = 'login.html?redirect=checkout.html';
      return;
    }

    const user = DataStore.currentUser;
    const defaultAddr = (DataStore.addresses && DataStore.addresses.find(a => a.isDefault)) || (DataStore.addresses && DataStore.addresses[0]);

    // Update Preference Banner Buttons State
    const btnManual = document.getElementById('btn-mode-manual');
    const btnSaved = document.getElementById('btn-mode-saved');
    if (btnManual && btnSaved) {
      if (!this.useSavedDetails) {
        btnManual.className = 'px-3.5 py-2 rounded text-xs font-bold bg-[#c8a96e] text-[#0a0908] transition-all cursor-pointer shadow-sm';
        btnSaved.className = 'px-3.5 py-2 rounded text-xs font-bold bg-[#1a1714] text-[#9a9188] hover:text-[#e8e2d9] border border-[#2a2520] transition-all cursor-pointer';
      } else {
        btnSaved.className = 'px-3.5 py-2 rounded text-xs font-bold bg-[#c8a96e] text-[#0a0908] transition-all cursor-pointer shadow-sm';
        btnManual.className = 'px-3.5 py-2 rounded text-xs font-bold bg-[#1a1714] text-[#9a9188] hover:text-[#e8e2d9] border border-[#2a2520] transition-all cursor-pointer';
      }
    }

    // MODE 1: MANUAL ENTRY - Let user enter or edit details manually
    if (!this.useSavedDetails) {
      if (step1Title) step1Title.innerText = 'Client Contact (Manual Entry)';
      if (step1Action) {
        step1Action.innerHTML = `
          <button type="button" onclick="CheckoutModule.fillFromSavedProfile()" class="text-xs text-[#8a6828] dark:text-[#c8a96e] hover:underline font-semibold flex items-center gap-1 cursor-pointer transition-colors">
            Fill from Saved Profile
          </button>
        `;
      }

      if (customerBox) {
        const existingName = document.getElementById('checkout-manual-name')
          ? document.getElementById('checkout-manual-name').value
          : (user ? `${user.FirstName || ''} ${user.LastName || ''}`.trim() : '');
        const existingPhone = document.getElementById('checkout-manual-phone')
          ? document.getElementById('checkout-manual-phone').value
          : (user ? (user.phone || '') : '');
        const existingEmail = document.getElementById('checkout-manual-email')
          ? document.getElementById('checkout-manual-email').value
          : (user ? (user.email || '') : '');

        customerBox.className = 'grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs';
        customerBox.innerHTML = `
          <div>
            <label class="block text-[11px] text-slate-600 dark:text-[#9a9188] font-semibold mb-1">Full Name *</label>
            <input id="checkout-manual-name" type="text" value="${UIModule.escapeHtml(existingName)}" placeholder="e.g. Ritik Yadav" class="clean-input text-xs w-full" />
          </div>
          <div>
            <label class="block text-[11px] text-slate-600 dark:text-[#9a9188] font-semibold mb-1">Mobile Contact *</label>
            <input id="checkout-manual-phone" type="tel" value="${UIModule.escapeHtml(existingPhone)}" placeholder="e.g. 9876543210" class="clean-input text-xs w-full" />
          </div>
          <div>
            <label class="block text-[11px] text-slate-600 dark:text-[#9a9188] font-semibold mb-1">Email Address</label>
            <input id="checkout-manual-email" type="email" value="${UIModule.escapeHtml(existingEmail)}" placeholder="e.g. ritik@example.com" class="clean-input text-xs w-full" />
          </div>
        `;
      }

      if (addressesList) {
        const existingStreet = document.getElementById('checkout-manual-street')
          ? document.getElementById('checkout-manual-street').value
          : (defaultAddr ? (defaultAddr.street || '') : '');
        const existingCity = document.getElementById('checkout-manual-city')
          ? document.getElementById('checkout-manual-city').value
          : (defaultAddr ? (defaultAddr.city || '') : '');
        const existingState = document.getElementById('checkout-manual-state')
          ? document.getElementById('checkout-manual-state').value
          : (defaultAddr ? (defaultAddr.state || '') : '');
        const existingPin = document.getElementById('checkout-manual-pincode')
          ? document.getElementById('checkout-manual-pincode').value
          : (defaultAddr ? (defaultAddr.pincode || defaultAddr.pinCode || '') : '');

        addressesList.className = 'col-span-full space-y-3 text-xs';
        addressesList.innerHTML = `
          <div class="space-y-3 w-full">
            <div>
              <label class="block text-[11px] text-slate-600 dark:text-[#9a9188] font-semibold mb-1">Delivery Street / Flat / Landmark *</label>
              <input id="checkout-manual-street" type="text" value="${UIModule.escapeHtml(existingStreet)}" placeholder="Flat 402, Cyber Heights, 100 Feet Road" class="clean-input text-xs w-full" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-[11px] text-slate-600 dark:text-[#9a9188] font-semibold mb-1">City *</label>
                <input id="checkout-manual-city" type="text" value="${UIModule.escapeHtml(existingCity)}" placeholder="e.g. Varanasi" class="clean-input text-xs w-full" />
              </div>
              <div>
                <label class="block text-[11px] text-slate-600 dark:text-[#9a9188] font-semibold mb-1">State *</label>
                <input id="checkout-manual-state" type="text" value="${UIModule.escapeHtml(existingState)}" placeholder="e.g. Uttar Pradesh" class="clean-input text-xs w-full" />
              </div>
              <div>
                <label class="block text-[11px] text-slate-600 dark:text-[#9a9188] font-semibold mb-1">PIN Code *</label>
                <input id="checkout-manual-pincode" type="text" maxlength="6" value="${UIModule.escapeHtml(existingPin)}" placeholder="e.g. 221005" class="clean-input text-xs w-full" />
              </div>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#2a2520]/60">
              <label class="flex items-center gap-2 text-xs text-slate-600 dark:text-[#9a9188] cursor-pointer">
                <input type="checkbox" id="checkout-manual-save-checkbox" class="accent-[#c8a96e] w-3.5 h-3.5 cursor-pointer" />
                <span>Save this address to my profile for future orders</span>
              </label>
              ${(DataStore.addresses && DataStore.addresses.length > 0) ? `
              <button type="button" onclick="CheckoutModule.setUseSavedDetails(true)" class="text-xs text-[#8a6828] dark:text-[#c8a96e] hover:underline font-semibold transition-colors cursor-pointer">
                Pick Saved Address Instead →
              </button>` : ''}
            </div>
          </div>
        `;
      }
    } else {
      // MODE 2: SAVED DETAILS - Render saved customer contact & address cards
      if (step1Title) step1Title.innerText = 'Client Details (From Saved Profile)';
      if (step1Action) {
        step1Action.innerHTML = `
          <button type="button" onclick="CheckoutModule.setUseSavedDetails(false)" class="text-xs text-[#c8a96e] hover:text-[#e8c98e] font-semibold flex items-center gap-1 cursor-pointer transition-colors">
            Switch to Manual Entry
          </button>
        `;
      }

      if (customerBox) {
        const safeName = UIModule.escapeHtml(`${user.FirstName || 'Customer'} ${user.LastName || ''}`.trim());
        const safeEmail = UIModule.escapeHtml(user.email || '');
        const safePhone = UIModule.escapeHtml(user.phone || '+91 98765 00000');

        customerBox.className = 'grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs';
        customerBox.innerHTML = `
          <div class="p-3.5 bg-slate-50 dark:bg-[#131110] rounded-xl border border-slate-200 dark:border-[#2a2520]">
            <span class="text-[11px] text-slate-500 dark:text-[#9a9188] font-semibold block">Full Name</span>
            <strong class="text-slate-900 dark:text-[#e8e2d9] text-xs block truncate">${safeName}</strong>
          </div>
          <div class="p-3.5 bg-slate-50 dark:bg-[#131110] rounded-xl border border-slate-200 dark:border-[#2a2520]">
            <span class="text-[11px] text-slate-500 dark:text-[#9a9188] font-semibold block">Email Address</span>
            <strong class="text-slate-900 dark:text-[#e8e2d9] text-xs block truncate">${safeEmail}</strong>
          </div>
          <div class="p-3.5 bg-slate-50 dark:bg-[#131110] rounded-xl border border-slate-200 dark:border-[#2a2520]">
            <span class="text-[11px] text-slate-500 dark:text-[#9a9188] font-semibold block">Mobile Contact</span>
            <strong class="text-slate-900 dark:text-[#e8e2d9] text-xs block truncate">${safePhone}</strong>
          </div>
        `;
      }

      // Saved Addresses List
      const addresses = DataStore.addresses || [];
      if (addressesList) {
        addressesList.className = 'grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs';

        if (addresses.length === 0) {
          addressesList.innerHTML = `
            <div class="col-span-full p-6 text-center text-[#9a9188] bg-[#131110] rounded-xl border border-dashed border-[#2a2520] space-y-3">
              <p class="text-xs">No delivery address saved in your profile yet.</p>
              <div class="flex items-center justify-center gap-3">
                <button onclick="CheckoutModule.promptQuickAddAddress()" class="btn-primary py-1.5 px-4 text-xs font-bold cursor-pointer">
                  + Add Address Here
                </button>
                <button onclick="CheckoutModule.setUseSavedDetails(false)" class="text-xs text-[#c8a96e] hover:underline font-semibold cursor-pointer">
                  Enter Details Manually →
                </button>
              </div>
            </div>
          `;
        } else {
          // If none chosen yet, default to first address when switching to saved mode
          if (!this.selectedAddressId && addresses.length > 0) {
            this.selectedAddressId = addresses[0].id;
          }

          addressesList.innerHTML = addresses.map(addr => {
            const isSelected = this.selectedAddressId === addr.id;
            const activeClass = isSelected
              ? 'border-2 border-[#c8a96e] bg-[#fcf9f2] dark:bg-[rgba(200,169,110,0.08)] ring-1 ring-[#c8a96e]'
              : 'border border-slate-200 dark:border-[#2a2520] bg-white dark:bg-[#131110] hover:border-[#c8a96e]/60';
            const safeType = UIModule.escapeHtml(addr.type || 'Home');
            const safeStreet = UIModule.escapeHtml(addr.street || '');
            let cityName = addr.city || '';
            let stateName = addr.state || '';
            if (cityName.toLowerCase().includes('varanasi') && (!stateName || stateName.toLowerCase().includes('karnataka'))) {
              stateName = 'Uttar Pradesh';
              addr.state = 'Uttar Pradesh';
            }
            const safeCity = UIModule.escapeHtml(cityName);
            const safeState = stateName ? `, ${UIModule.escapeHtml(stateName)}` : '';
            const safePin = UIModule.escapeHtml(addr.pincode || addr.pinCode || '');

            return `
              <label class="p-4 rounded-xl ${activeClass} flex items-start gap-3 cursor-pointer transition-all">
                <input
                  type="radio"
                  name="shipping-address"
                  ${isSelected ? 'checked' : ''}
                  onchange="CheckoutModule.selectAddress(${addr.id})"
                  class="mt-1 text-[#c8a96e] accent-[#c8a96e] focus:ring-[#c8a96e] w-4 h-4 cursor-pointer"
                />
                <div class="text-xs space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="badge badge-slate font-bold text-[10px]">${safeType}</span>
                    ${addr.isDefault ? '<span class="badge badge-gold text-[10px]">Default</span>' : ''}
                  </div>
                  <p class="font-bold text-slate-900 dark:text-[#e8e2d9] leading-snug">${safeStreet}</p>
                  <p class="text-slate-600 dark:text-[#9a9188]">${safeCity}${safeState} - ${safePin}</p>
                </div>
              </label>
            `;
          }).join('') + `
            <div class="col-span-full pt-2 flex items-center justify-between">
              <button type="button" onclick="CheckoutModule.promptQuickAddAddress()" class="text-xs text-[#c8a96e] hover:underline font-semibold flex items-center gap-1 cursor-pointer">
                + Add Another Delivery Address
              </button>
              <button type="button" onclick="CheckoutModule.setUseSavedDetails(false)" class="text-xs text-[#9a9188] hover:text-[#e8e2d9] transition-colors cursor-pointer">
                Prefer manual entry? Click here
              </button>
            </div>
          `;
        }
      }
    }

    // Step 3: Mini Cart Items
    const cart = DataStore.getCart();
    if (miniItemsContainer) {
      if (cart.length === 0) {
        miniItemsContainer.innerHTML = '<p class="text-xs text-[#9a9188] py-3 text-center">Your cart is empty.</p>';
      } else {
        miniItemsContainer.innerHTML = cart.map(item => {
          const safeItemName = UIModule.escapeHtml(item.name || 'Product');
          const lineTotal = Math.round(item.price * item.quantity * 100) / 100;
          return `
          <div class="flex items-center justify-between gap-3 text-xs py-2 border-b border-slate-100 dark:border-[#2a2520]/50 last:border-b-0">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span class="text-slate-500 dark:text-[#9a9188] font-bold font-mono text-[11px]">${item.quantity}×</span>
              <span class="text-slate-900 dark:text-[#e8e2d9] font-medium truncate">${safeItemName}</span>
            </div>
            <strong class="text-slate-900 dark:text-[#e8e2d9] shrink-0">${UIModule.formatCurrency(lineTotal)}</strong>
          </div>
        `;
        }).join('');
      }
    }

    const subtotal = DataStore.getCartSubtotal();
    const discount = Math.min(this.voucherDiscount, subtotal);
    const finalTotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

    if (subtotalElem) subtotalElem.innerText = UIModule.formatCurrency(subtotal);
    if (discountElem) discountElem.innerText = discount > 0 ? `-${UIModule.formatCurrency(discount)}` : '-₹0';
    if (totalElem) totalElem.innerText = UIModule.formatCurrency(finalTotal);

    this.updatePaymentRailUI();
  },

  selectAddress(addressId) {
    this.selectedAddressId = Number(addressId);
    this.renderCheckoutPage();
  },

  promptQuickAddAddress() {
    const street = prompt('Enter delivery street / flat / locality:', 'IIT BHU, Lanka');
    if (!street) return;
    const city = prompt('Enter City:', 'Varanasi') || '';
    const state = prompt('Enter State:', 'Uttar Pradesh') || '';
    const pin = prompt('Enter 6-digit PIN code:', '221005') || '';

    try {
      const newAddr = DataStore.addCustomerAddress({
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pin.trim(),
        type: 'Home',
        isDefault: true
      });
      this.selectedAddressId = newAddr.id;
      this.useSavedDetails = true;
      this.renderCheckoutPage();
      UIModule.showToast('Delivery address saved to profile!', 'success');
    } catch (err) {
      UIModule.showToast(err.message || 'Could not save address.', 'error');
    }
  },

  selectPaymentMethod(methodName) {
    this.selectedPaymentMethod = methodName;
    if (methodName.toLowerCase().includes('cash') || methodName.toLowerCase().includes('delivery') || methodName.toLowerCase().includes('cod') || methodName.toLowerCase().includes('pod')) {
      this.selectedPaymentMethodId = 5; // Cash on Delivery (COD)
    } else {
      this.selectedPaymentMethodId = 3; // Pay via Razorpay
    }
    this.updatePaymentRailUI();
  },

  updatePaymentRailUI() {
    const isCod = this.selectedPaymentMethodId === 5;
    const subtotal = DataStore.getCartSubtotal();
    const discount = Math.min(this.voucherDiscount, subtotal);
    const finalTotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

    const razorpayRail = document.getElementById('rail-option-razorpay') || document.getElementById('rail-option-upi');
    const codRail = document.getElementById('rail-option-cod');

    const radioRazorpay = document.getElementById('radio-method-razorpay') || document.getElementById('radio-method-upi');
    const radioCod = document.getElementById('radio-method-cod');

    if (razorpayRail) {
      if (isCod) razorpayRail.classList.remove('active');
      else razorpayRail.classList.add('active');
    }
    if (codRail) {
      if (isCod) codRail.classList.add('active');
      else codRail.classList.remove('active');
    }

    if (radioRazorpay) radioRazorpay.checked = !isCod;
    if (radioCod) radioCod.checked = isCod;

    const noticeElem = document.getElementById('checkout-payment-notice');
    const noticeText = document.getElementById('checkout-payment-notice-text');
    const actionBtn = document.getElementById('checkout-action-btn');
    const totalLabel = document.getElementById('summary-total-label');
    const summaryTotal = document.getElementById('summary-total');

    if (summaryTotal) {
      summaryTotal.innerText = UIModule.formatCurrency(finalTotal);
    }

    if (isCod) {
      if (totalLabel) totalLabel.innerText = 'Payable on Delivery:';
      if (noticeElem) {
        noticeElem.className = 'payment-notice-cod p-3.5 rounded-xl text-xs flex items-start gap-2.5 mt-3 transition-colors';
      }
      if (noticeText) {
        noticeText.innerHTML = `<strong class="text-amber-800 dark:text-[#c8a96e] font-semibold">Cash on Delivery (COD) Active:</strong> Zero advance payment required now. Pay the exact total of <strong class="text-slate-900 dark:text-[#e8e2d9]">${UIModule.formatCurrency(finalTotal)}</strong> in cash or UPI directly to courier upon verified doorstep delivery.`;
      }
      if (actionBtn) {
        actionBtn.innerText = `PLACE ORDER (COD ${UIModule.formatCurrency(finalTotal)}) →`;
      }
    } else {
      if (totalLabel) totalLabel.innerText = 'Total to Pay:';
      if (noticeElem) {
        noticeElem.className = 'payment-notice-razorpay p-3.5 rounded-xl text-xs flex items-start gap-2.5 mt-3 transition-colors';
      }
      if (noticeText) {
        noticeText.innerHTML = `<strong class="font-semibold text-[#8a6828] dark:text-[#c8a96e]">Razorpay Gateway Active:</strong> Clicking below will open the official Razorpay checkout portal for instant UPI, Cards, and Net Banking payment.`;
      }
      if (actionBtn) {
        actionBtn.innerText = `PROCEED TO RAZORPAY (${UIModule.formatCurrency(finalTotal)}) →`;
      }
    }
  },

  validateAndGetAddress() {
    let addressStr = '';

    if (this.useSavedDetails) {
      if (!this.selectedAddressId) {
        UIModule.showToast('Please choose a delivery address from your saved list, or enter manually.', 'error');
        return null;
      }
      const selectedAddr = (DataStore.addresses || []).find(a => a.id === this.selectedAddressId);
      if (!selectedAddr) {
        UIModule.showToast('Selected address not found. Please pick an address or enter manually.', 'error');
        return null;
      }
      const statePart = selectedAddr.state ? `, ${selectedAddr.state}` : ''; addressStr = `${selectedAddr.street || ''}, ${selectedAddr.city || ''}${statePart} - ${selectedAddr.pincode || ''}`;
    } else {
      // Validate Manual Fields
      const nameInput = document.getElementById('checkout-manual-name');
      const phoneInput = document.getElementById('checkout-manual-phone');
      const streetInput = document.getElementById('checkout-manual-street');
      const cityInput = document.getElementById('checkout-manual-city');
      const stateInput = document.getElementById('checkout-manual-state');
      const pinInput = document.getElementById('checkout-manual-pincode');

      const nameVal = nameInput ? nameInput.value.trim() : '';
      const phoneVal = phoneInput ? phoneInput.value.trim() : '';
      const streetVal = streetInput ? streetInput.value.trim() : '';
      const cityVal = cityInput ? cityInput.value.trim() : '';
      const stateVal = stateInput ? stateInput.value.trim() : '';
      const pinVal = pinInput ? pinInput.value.trim() : '';

      // Clear previous validation highlights
      [nameInput, phoneInput, streetInput, cityInput, pinInput].forEach(inp => {
        if (inp) {
          UIModule.clearFieldValidation(inp);
          inp.oninput = () => UIModule.clearFieldValidation(inp);
        }
      });

      let hasFormError = false;

      if (!pinVal || pinVal.length < 6 || !/^\d{6}$/.test(pinVal)) {
        UIModule.setFieldValidation(pinInput, false, 'Enter a valid 6-digit postal PIN code');
        if (pinInput) pinInput.focus();
        hasFormError = true;
      } else {
        UIModule.setFieldValidation(pinInput, true);
      }

      if (!cityVal) {
        UIModule.setFieldValidation(cityInput, false, 'City name is required for delivery routing');
        if (cityInput) cityInput.focus();
        hasFormError = true;
      } else {
        UIModule.setFieldValidation(cityInput, true);
      }

      if (!streetVal) {
        UIModule.setFieldValidation(streetInput, false, 'Street, building, or locality address is required');
        if (streetInput) streetInput.focus();
        hasFormError = true;
      } else {
        UIModule.setFieldValidation(streetInput, true);
      }

      if (!phoneVal || phoneVal.length < 10) {
        UIModule.setFieldValidation(phoneInput, false, 'Enter a valid 10-digit mobile contact number');
        if (phoneInput) phoneInput.focus();
        hasFormError = true;
      } else {
        UIModule.setFieldValidation(phoneInput, true);
      }

      if (!nameVal) {
        UIModule.setFieldValidation(nameInput, false, 'Recipient full name is required');
        if (nameInput) nameInput.focus();
        hasFormError = true;
      } else {
        UIModule.setFieldValidation(nameInput, true);
      }

      if (hasFormError) {
        UIModule.showToast('Please fix highlighted fields in your delivery address form', 'error');
        return null;
      }

      addressStr = `${streetVal}, ${cityVal}, ${stateVal} - ${pinVal}`;

      // Save to profile if requested
      const saveCheck = document.getElementById('checkout-manual-save-checkbox');
      if (saveCheck && saveCheck.checked) {
        try {
          DataStore.addCustomerAddress({
            street: streetVal,
            city: cityVal,
            state: stateVal,
            pincode: pinVal,
            type: 'Home',
            isDefault: false
          });
        } catch (_) {}
      }
    }
    return addressStr;
  },

  async placeOrder(e) {
    if (e) e.preventDefault();

    if (!DataStore.currentUser || DataStore.currentUserRole !== 'buyer') {
      UIModule.showToast('Please sign in to your customer account to place an order.', 'error');
      if (window.AuthModule) {
        AuthModule.pendingRedirect = 'checkout.html';
        AuthModule.openAuthModal('buyer', 'login');
      } else {
        window.location.href = 'login.html?role=buyer&redirect=checkout.html';
      }
      return;
    }

    const cart = DataStore.getCart();
    if (cart.length === 0) {
      UIModule.showToast('Your cart is empty!', 'error');
      return;
    }

    // Pre-order stock validation: verify every item has sufficient inventory
    for (const item of cart) {
      const liveProd = (DataStore.products || []).find(p => p.id === item.id);
      if (liveProd && liveProd.stockQuantity < item.quantity) {
        UIModule.showToast(`Insufficient stock for "${liveProd.name}". Available units: ${liveProd.stockQuantity}`, 'error');
        return;
      }
    }

        const addressStr = this.validateAndGetAddress();
    if (!addressStr) return;

    const manualName = document.getElementById('checkout-manual-name');
    const manualPhone = document.getElementById('checkout-manual-phone');
    const user = DataStore.currentUser;

    const recipientName = (manualName && manualName.value.trim())
      ? manualName.value.trim()
      : ((user ? `${user.FirstName || ''} ${user.LastName || ''}`.trim() : '') || 'Customer');

    const recipientPhone = (manualPhone && manualPhone.value.trim())
      ? manualPhone.value.trim()
      : ((user && user.phone) || '');

    // Check payment rail
    const isCod = this.selectedPaymentMethodId === 5;

    if (isCod) {
      // Cash on Delivery (POD): Skip the payment popup completely and confirm order directly!
      await this.finalizeOrder({ isCod: true, paymentChannel: 'Cash on Delivery (POD)', recipientName, recipientPhone, address: addressStr });
    } else {
      // Online payment via Razorpay!
      this.pendingOrderData = { recipientName, recipientPhone, address: addressStr };
      const subtotal = DataStore.getCartSubtotal();
      const discount = Math.min(this.voucherDiscount, subtotal);
      const finalTotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

      await this.initiateRazorpayPayment();
    }
  },

  async initiateRazorpayPayment() {
    const addressStr = (this.pendingOrderData && this.pendingOrderData.address) || this.validateAndGetAddress();
    if (!addressStr) return;

    const cart = DataStore.getCart();
    if (cart.length === 0) {
      UIModule.showToast('Your shopping cart is empty!', 'error');
      return;
    }

    const subtotal = DataStore.getCartSubtotal();
    const discount = Math.min(this.voucherDiscount, subtotal);
    const finalTotal = Math.max(1, Math.round((subtotal - discount) * 100) / 100);
    const amountInPaise = Math.round(finalTotal * 100);

    const user = DataStore.currentUser;
    const manualName = document.getElementById('checkout-manual-name');
    const manualPhone = document.getElementById('checkout-manual-phone');
    const manualEmail = document.getElementById('checkout-manual-email');

    const customerName = (this.pendingOrderData && this.pendingOrderData.recipientName) ||
      (manualName && manualName.value.trim()) ||
      (user ? `${user.FirstName || ''} ${user.LastName || ''}`.trim() : '') || 'Customer';
    const customerPhone = (this.pendingOrderData && this.pendingOrderData.recipientPhone) ||
      (manualPhone && manualPhone.value.trim()) ||
      (user && user.phone) || '9876543210';
    const customerEmail = (manualEmail && manualEmail.value.trim()) ||
      (user && user.email) || 'customer@omnicart.com';

    const isUpi = this.selectedPaymentMethodId === 3;
    const isCard = this.selectedPaymentMethodId === 1 || this.selectedPaymentMethodId === 2;
    const isNetBanking = this.selectedPaymentMethodId === 4;

    let connectingText = 'Connecting Razorpay...';
    if (isUpi) connectingText = 'Opening Razorpay UPI...';
    else if (isCard) connectingText = 'Opening Razorpay Card Gateway...';
    else if (isNetBanking) connectingText = 'Opening Razorpay Net Banking...';

    const btn = document.getElementById('checkout-action-btn');
    if (btn && window.UIModule && window.UIModule.setButtonLoading) {
      window.UIModule.setButtonLoading(btn, true, connectingText);
    } else if (btn) {
      btn.innerText = connectingText;
      btn.disabled = true;
    }

    // Ensure Razorpay SDK script is available
    if (typeof window.Razorpay === 'undefined') {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = () => {
            const fallbackScript = document.createElement('script');
            fallbackScript.src = 'js/razorpay-checkout.js';
            fallbackScript.onload = resolve;
            fallbackScript.onerror = reject;
            document.head.appendChild(fallbackScript);
          };
          document.head.appendChild(script);
        });
      } catch (cdnErr) {
        console.warn('Razorpay SDK failed to load. Falling back to local payment modal.', cdnErr);
        if (btn) {
          if (window.UIModule && window.UIModule.setButtonLoading) window.UIModule.setButtonLoading(btn, false);
          else btn.disabled = false;
        }
        this.openPaymentModal();
        return;
      }
    }

    const self = this;

    const options = {
      key: this.razorpayKeyId,
      amount: amountInPaise,
      currency: 'INR',
      name: 'OmniCart Marketplace',
      description: `Secure Checkout (${cart.length} item${cart.length > 1 ? 's' : ''}) • Instant Settlement`,
      image: 'images/maroon_organza_saree.jpg',
      prefill: {
        name: customerName,
        email: customerEmail,
        contact: customerPhone
      },
      notes: {
        address: addressStr,
        merchant: 'OmniCart Marketplace',
        platform: 'OmniCart Next-Gen E-Commerce'
      },
      theme: {
        color: '#c8a96e',
        backdrop_color: 'rgba(15, 23, 42, 0.75)'
      },
      modal: {
        backdropclose: false,
        escape: true,
        handleback: true,
        confirm_close: true,
        ondismiss: function () {
          if (btn) {
            if (window.UIModule && window.UIModule.setButtonLoading) {
              window.UIModule.setButtonLoading(btn, false);
            } else {
              btn.disabled = false;
            }
            self.updatePaymentRailUI();
          }
          UIModule.showToast('Razorpay payment cancelled. Order was not placed.', 'info');
        }
      },
      handler: async function (response) {
        const payId = response.razorpay_payment_id || `RZP-${Date.now()}`;
        const channelLabel = isUpi
          ? `Razorpay UPI (${payId})`
          : (isCard
            ? `Razorpay Card (${payId})`
            : (isNetBanking ? `Razorpay NetBanking (${payId})` : `Razorpay Online (${payId})`));

        UIModule.showToast(`Razorpay Payment Authorized! [${payId}]`, 'success', 4000);

        await self.finalizeOrder({
          isCod: false,
          paymentChannel: channelLabel,
          recipientName: customerName,
          recipientPhone: customerPhone,
          address: addressStr,
          razorpayPaymentId: payId,
          razorpayOrderId: response.razorpay_order_id || null,
          razorpaySignature: response.razorpay_signature || null
        });
      }
    };

    try {
      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', function (failRes) {
        const errDesc = (failRes.error && failRes.error.description) || 'Payment authorization was declined.';
        UIModule.showToast(`Payment Declined: ${errDesc}`, 'error', 6000);
        if (btn) {
          if (window.UIModule && window.UIModule.setButtonLoading) window.UIModule.setButtonLoading(btn, false);
          else btn.disabled = false;
          self.updatePaymentRailUI();
        }
      });
      rzpInstance.open();
    } catch (launchErr) {
      console.error('Failed to open Razorpay modal:', launchErr);
      UIModule.showToast(`Could not open Razorpay window: ${launchErr.message}. Opening backup secure modal...`, 'info');
      if (btn) {
        if (window.UIModule && window.UIModule.setButtonLoading) window.UIModule.setButtonLoading(btn, false);
        else btn.disabled = false;
        this.updatePaymentRailUI();
      }
      this.openPaymentModal();
    }
  },

  openRazorpayCheckout(args) {
    return this.initiateRazorpayPayment();
  },

  openPaymentModal() {
    let modal = document.getElementById('payment-gateway-modal');
    if (!modal) {
      this.injectPaymentModalHtml();
      modal = document.getElementById('payment-gateway-modal');
    }

    const subtotal = DataStore.getCartSubtotal();
    const discount = Math.min(this.voucherDiscount, subtotal);
    const finalTotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

    const amountElem = document.getElementById('payment-modal-amount');
    if (amountElem) amountElem.innerText = UIModule.formatCurrency(finalTotal);

    const manualName = document.getElementById('checkout-manual-name');
    const user = DataStore.currentUser;
    const recipientName = (this.pendingOrderData && this.pendingOrderData.recipientName) ||
      (manualName && manualName.value.trim()) ||
      (user ? `${user.FirstName || ''} ${user.LastName || ''}`.trim() : '') ||
      (user && user.email) || 'Customer';

    const recipientElem = document.getElementById('payment-modal-recipient');
    if (recipientElem) {
      recipientElem.innerText = recipientName;
    }

    // Set recipient name on card preview and UPI handle
    const cardName = document.getElementById('gateway-card-name');
    const cardPrevName = document.getElementById('card-preview-name');
    if (cardName) {
      cardName.value = recipientName;
      if (cardPrevName) cardPrevName.innerText = recipientName.toUpperCase();
    }

    const upiInput = document.getElementById('gateway-upi-id');
    if (upiInput) {
      const cleanHandle = recipientName.toLowerCase().replace(/[^a-z0-9]/g, '');
      upiInput.value = `${cleanHandle || 'buyer'}@okhdfcbank`;
    }

    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

    // Switch to active tab (or 'upi' by default)
    this.switchGatewayTab(this.activeGatewayTab || 'upi');

    // Reset processing overlay
    const overlay = document.getElementById('gateway-processing-overlay');
    if (overlay) overlay.classList.add('hidden');
  },

  closePaymentModal() {
    const modal = document.getElementById('payment-gateway-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
    const overlay = document.getElementById('gateway-processing-overlay');
    if (overlay) overlay.classList.add('hidden');
  },

  switchGatewayTab(tabKey) {
    this.activeGatewayTab = tabKey;
    const tabUpi = document.getElementById('pm-tab-upi');
    const tabCard = document.getElementById('pm-tab-card');
    const tabNb = document.getElementById('pm-tab-netbanking');

    const paneUpi = document.getElementById('gateway-pane-upi');
    const paneCard = document.getElementById('gateway-pane-card');
    const paneNb = document.getElementById('gateway-pane-netbanking');

    const activeTabClass = 'py-2.5 px-3 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-2 bg-white text-slate-900 border border-slate-200 shadow-sm font-bold';
    const inactiveTabClass = 'py-2.5 px-3 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900 border border-transparent hover:bg-white/50';

    if (tabUpi) tabUpi.className = (tabKey === 'upi') ? activeTabClass : inactiveTabClass;
    if (tabCard) tabCard.className = (tabKey === 'card') ? activeTabClass : inactiveTabClass;
    if (tabNb) tabNb.className = (tabKey === 'netbanking') ? activeTabClass : inactiveTabClass;

    if (paneUpi) paneUpi.classList.toggle('hidden', tabKey !== 'upi');
    if (paneCard) paneCard.classList.toggle('hidden', tabKey !== 'card');
    if (paneNb) paneNb.classList.toggle('hidden', tabKey !== 'netbanking');
  },

  autofillTestUpi(handle) {
    const input = document.getElementById('gateway-upi-id');
    if (input) {
      input.value = handle || 'ritik@okhdfcbank';
      UIModule.showToast(`UPI handle "${input.value}" loaded`, 'info');
    }
  },

  appendUpiHandle(suffix) {
    const input = document.getElementById('gateway-upi-id');
    if (input) {
      const current = input.value.split('@')[0] || 'user';
      input.value = `${current}${suffix}`;
    }
  },

  autofillTestCard() {
    const numInput = document.getElementById('gateway-card-number');
    const nameInput = document.getElementById('gateway-card-name');
    const expInput = document.getElementById('gateway-card-expiry');
    const cvvInput = document.getElementById('gateway-card-cvv');

    const prevNum = document.getElementById('card-preview-number');
    const prevName = document.getElementById('card-preview-name');
    const prevExp = document.getElementById('card-preview-expiry');

    if (numInput) numInput.value = '4532 8819 9204 4999';
    if (nameInput) {
      const user = DataStore.currentUser;
      nameInput.value = (user ? `${user.FirstName || ''} ${user.LastName || ''}`.trim() : '') || 'Ritik Yadav';
    }
    if (expInput) expInput.value = '12/28';
    if (cvvInput) cvvInput.value = '829';

    if (prevNum) prevNum.innerText = '4532 •••• •••• 4999';
    if (prevName && nameInput) prevName.innerText = nameInput.value.toUpperCase();
    if (prevExp) prevExp.innerText = '12/28';

    UIModule.showToast('Test 3D-Secure Card filled', 'info');
  },

  formatCardNumber(input) {
    let val = input.value.replace(/\D/g, '').substring(0, 16);
    let parts = [];
    for (let i = 0; i < val.length; i += 4) {
      parts.push(val.substring(i, i + 4));
    }
    input.value = parts.join(' ');

    const prevNum = document.getElementById('card-preview-number');
    if (prevNum) {
      if (val.length >= 4) {
        const masked = val.substring(0, 4) + ' •••• •••• ' + (val.length >= 12 ? val.substring(val.length - 4) : '••••');
        prevNum.innerText = masked;
      } else {
        prevNum.innerText = '4532 •••• •••• 4999';
      }
    }
  },

  formatCardExpiry(input) {
    let val = input.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 3) {
      input.value = `${val.substring(0, 2)}/${val.substring(2)}`;
    } else {
      input.value = val;
    }
    const prevExp = document.getElementById('card-preview-expiry');
    if (prevExp) prevExp.innerText = input.value || '12/28';
  },

  async executeGatewayPayment(channel) {

    if (this.activeGatewayTab === 'upi') {
      const upiInput = document.getElementById('gateway-upi-id');
      if (!upiInput || !upiInput.value.trim() || !upiInput.value.includes('@')) {
        UIModule.showToast('Please enter a valid UPI ID (e.g. user@okhdfcbank)', 'error');
        if (upiInput) upiInput.focus();
        return;
      }
    } else if (this.activeGatewayTab === 'card') {
      const numInput = document.getElementById('gateway-card-number');
      const nameInput = document.getElementById('gateway-card-name');
      const expInput = document.getElementById('gateway-card-expiry');
      const cvvInput = document.getElementById('gateway-card-cvv');

      if (!numInput || numInput.value.replace(/\s/g, '').length < 15) {
        UIModule.showToast('Please enter a valid 16-digit card number', 'error');
        if (numInput) numInput.focus();
        return;
      }
      if (!nameInput || !nameInput.value.trim()) {
        UIModule.showToast('Please enter cardholder name', 'error');
        if (nameInput) nameInput.focus();
        return;
      }
      if (!expInput || expInput.value.length < 5) {
        UIModule.showToast('Please enter expiry MM/YY', 'error');
        if (expInput) expInput.focus();
        return;
      }
      if (!cvvInput || cvvInput.value.length < 3) {
        UIModule.showToast('Please enter 3-digit CVV', 'error');
        if (cvvInput) cvvInput.focus();
        return;
      }
    } else if (this.activeGatewayTab === 'netbanking') {
      const selectedBankRadio = document.querySelector('input[name="nb-bank"]:checked');
      const selectOtherBank = document.getElementById('gateway-nb-select');
      const chosenBank = (selectOtherBank && selectOtherBank.value) || (selectedBankRadio && selectedBankRadio.value);
      if (!chosenBank) {
        UIModule.showToast('Please select your bank for Net Banking authorization', 'error');
        return;
      }
      channel = `Net Banking (${chosenBank})`;
    }

    const overlay = document.getElementById('gateway-processing-overlay');
    const title = document.getElementById('gateway-processing-title');
    const subtitle = document.getElementById('gateway-processing-subtitle');

    if (overlay) overlay.classList.remove('hidden');
    if (title) title.innerText = 'Securing Bank Connection...';
    if (subtitle) subtitle.innerText = 'Authenticating payment session with 256-bit encryption protocol.';

    await new Promise(r => setTimeout(r, 650));

    if (title) title.innerText = 'Authorizing Transaction...';
    if (subtitle) subtitle.innerText = 'Payment token verified. Finalizing order settlement.';

    await new Promise(r => setTimeout(r, 650));

    const manualName = document.getElementById('checkout-manual-name');
    const manualPhone = document.getElementById('checkout-manual-phone');
    const user = DataStore.currentUser;

    const recipientName = (this.pendingOrderData && this.pendingOrderData.recipientName)
      || (manualName && manualName.value.trim())
      || (user ? `${user.FirstName || ''} ${user.LastName || ''}`.trim() : '')
      || 'Customer';

    const recipientPhone = (this.pendingOrderData && this.pendingOrderData.recipientPhone)
      || (manualPhone && manualPhone.value.trim())
      || (user && user.phone) || '';

    const address = (this.pendingOrderData && this.pendingOrderData.address) || this.validateAndGetAddress();

    this.closePaymentModal();
    await this.finalizeOrder({ isCod: false, paymentChannel: channel, recipientName, recipientPhone, address });
  },

  async finalizeOrder({ isCod, paymentChannel, recipientName, recipientPhone, address } = {}) {
    const addressStr = address || this.validateAndGetAddress();
    if (!addressStr) return;

    const btn = document.getElementById('checkout-action-btn');
    if (btn && window.UIModule && window.UIModule.setButtonLoading) {
      window.UIModule.setButtonLoading(btn, true, 'Finalizing Order...');
    } else if (btn) {
      btn.innerText = 'Finalizing Order...';
      btn.disabled = true;
    }

    const subtotal = DataStore.getCartSubtotal();
    const effectiveDiscount = Math.min(this.voucherDiscount, subtotal);
    const finalTotal = Math.max(0, Math.round((subtotal - effectiveDiscount) * 100) / 100);

    let resolvedMethodId = 3;
    if (isCod) {
      resolvedMethodId = 5;
    } else if (this.activeGatewayTab === 'card') {
      resolvedMethodId = 1;
    } else if (this.activeGatewayTab === 'netbanking') {
      resolvedMethodId = 4;
    } else if (this.activeGatewayTab === 'upi') {
      resolvedMethodId = 3;
    } else if (this.selectedPaymentMethodId) {
      resolvedMethodId = this.selectedPaymentMethodId;
    }

    const resolvedMethod = isCod ? 'Cash on Delivery (POD)' : (paymentChannel || this.selectedPaymentMethod);

    const manualName = document.getElementById('checkout-manual-name');
    const manualPhone = document.getElementById('checkout-manual-phone');
    const user = DataStore.currentUser;

    const resolvedRecipientName = (recipientName && recipientName.trim())
      || (manualName && manualName.value.trim())
      || (user ? `${user.FirstName || ''} ${user.LastName || ''}`.trim() : '')
      || 'Customer';

    const resolvedRecipientPhone = (recipientPhone && recipientPhone.trim())
      || (manualPhone && manualPhone.value.trim())
      || (user && user.phone) || '';

    try {
      const order = await DataStore.placeOrder({
        customerId: DataStore.currentUser ? DataStore.currentUser.id : 1,
        recipientName: resolvedRecipientName,
        clientName: resolvedRecipientName,
        phone: resolvedRecipientPhone,
        paymentMethod: resolvedMethod,
        paymentMethodId: resolvedMethodId,
        address: addressStr,
        deliveryAddress: addressStr,
        isExpress: true,
        discount: effectiveDiscount
      });

      localStorage.removeItem('omnicart_voucher');
      localStorage.removeItem('omnicart_discount');
      this.voucherDiscount = 0;

      if (isCod) {
        UIModule.showToast(`Order #${order.orderNumber} confirmed! Pay ₹${finalTotal.toLocaleString('en-IN')} on delivery.`, 'success', 5000);
      } else {
        UIModule.showToast(`Payment authorized! Order #${order.orderNumber} placed successfully.`, 'success', 5000);
      }

      const mainContainer = document.querySelector('main') || document.getElementById('checkout-page-container');
      if (mainContainer) {
        UIModule.renderSuccessState(mainContainer, {
          title: 'Order Confirmed & Fulfillment Dispatched!',
          message: isCod
            ? `Your order #${order.orderNumber} has been verified in our fulfillment pipeline. Please have cash or UPI ready for delivery verification.`
            : `Transaction approved for ${UIModule.formatCurrency(finalTotal)}. Your order #${order.orderNumber} is now being packed at our local hub.`,
          badgeText: isCod ? 'Pay on Delivery Confirmed' : 'Instant Settlement Verified',
          primaryActionText: 'Track Order & Live Telemetry →',
          primaryActionUrl: 'orders.html',
          secondaryActionText: 'Explore More Products',
          secondaryActionUrl: 'products.html',
          extraContent: `
            <div class="success-receipt-card my-6 text-left max-w-md mx-auto">
              <div class="flex justify-between items-center pb-3 border-b border-[#2a2520] text-xs">
                <span class="text-[#9a9188] font-mono">Manifest ID</span>
                <span class="font-mono font-bold text-[#c8a96e]">${UIModule.escapeHtml(order.orderNumber)}</span>
              </div>
              <div class="flex justify-between items-center py-2.5 border-b border-[#2a2520] text-xs">
                <span class="text-[#9a9188]">Payment Mode</span>
                <span class="font-semibold text-[#e8e2d9]">${UIModule.escapeHtml(resolvedMethod)}</span>
              </div>
              <div class="flex justify-between items-start py-2.5 border-b border-[#2a2520] text-xs">
                <span class="text-[#9a9188] shrink-0 mr-2">Delivery Destination</span>
                <span class="text-[#e8e2d9] text-right truncate max-w-[220px]">${UIModule.escapeHtml(addressStr)}</span>
              </div>
              <div class="flex justify-between items-center pt-3 text-sm font-bold">
                <span class="text-[#e8e2d9]">Amount Settled</span>
                <span class="text-[#c8a96e] font-serif text-base">${UIModule.formatCurrency(finalTotal)}</span>
              </div>
            </div>
          `
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setTimeout(() => {
        window.location.href = 'orders.html';
      }, 1000);
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to place order. Please try again.', 'error');
      if (btn) {
        if (window.UIModule && window.UIModule.setButtonLoading) {
          window.UIModule.setButtonLoading(btn, false);
        } else {
          btn.disabled = false;
        }
        this.updatePaymentRailUI();
      }
    }
  }
};

window.CheckoutModule = CheckoutModule;
