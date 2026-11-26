
const AuthModule = {
  currentModalRole: 'buyer',
  currentModalMode: 'login',
  pendingRedirect: null,

  guardUserClick(targetUrl, event) {
    if (DataStore.currentUser && DataStore.currentUserRole === 'buyer') {
      return true;
    }

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.pendingRedirect = targetUrl;
    this.openAuthModal('buyer', 'login');
    return false;
  },

  guardSellerClick(targetUrl, event) {
    if (DataStore.currentSeller && DataStore.currentUserRole === 'seller') {
      return true;
    }

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.pendingRedirect = targetUrl;
    this.openAuthModal('seller', 'login');
    return false;
  },

  toggleAuthDropdown() {
    const menu = document.getElementById('auth-dropdown-menu');
    if (menu) {
      menu.classList.toggle('hidden');
    }
  },

  closeAuthDropdown() {
    const menu = document.getElementById('auth-dropdown-menu');
    if (menu) {
      menu.classList.add('hidden');
    }
  },

  openAuthModal(role = 'buyer', mode = 'login') {
    this.currentModalRole = role;
    this.currentModalMode = mode;

    const modal = document.getElementById('auth-modal');
    if (!modal) {

      const redirectParam = this.pendingRedirect ? `&redirect=${encodeURIComponent(this.pendingRedirect)}` : '';
      window.location.href = `login.html?role=${role}${redirectParam}`;
      return;
    }

    this.setModalTab(role);
    modal.classList.remove('hidden');
  },

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  },

  setModalTab(role) {
    this.currentModalRole = role;
    const buyerTab = document.getElementById('modal-tab-buyer');
    const sellerTab = document.getElementById('modal-tab-seller');

    if (role === 'buyer') {
      if (buyerTab) buyerTab.className = 'py-2.5 rounded font-semibold transition-all bg-[#1c1916] text-[#c8a96e] border border-[#c8a96e]/30 cursor-pointer';
      if (sellerTab) sellerTab.className = 'py-2.5 rounded font-medium transition-all text-[#9a9188] hover:text-[#b89355] cursor-pointer';
    } else {
      if (sellerTab) sellerTab.className = 'py-2.5 rounded font-semibold transition-all bg-[#1c1916] text-[#c8a96e] border border-[#c8a96e]/30 cursor-pointer';
      if (buyerTab) buyerTab.className = 'py-2.5 rounded font-medium transition-all text-[#9a9188] hover:text-[#b89355] cursor-pointer';
    }

    this.renderModalForm();
  },

  setModalMode(mode) {
    this.currentModalMode = mode;
    this.renderModalForm();
  },

  renderModalForm() {
    const container = document.getElementById('auth-modal-form-container');
    if (!container) return;

    if (this.currentModalRole === 'buyer') {
      if (this.currentModalMode === 'login') {
        container.innerHTML = `
          <div class="mb-4">
            <h3 class="text-lg font-bold text-slate-900">Customer Sign In</h3>
            <p class="text-xs text-slate-500">Enter your credentials to continue shopping</p>
          </div>
          <form onsubmit="AuthModule.handleCustomerLogin(event)" class="space-y-3.5 text-xs" autocomplete="off" autocorrect="off" autocapitalize="off">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Email or Mobile Number</label>
              <input
                type="text"
                id="modal-cust-id"
                required
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                data-lpignore="true"
                placeholder="name@domain.com or 9876543210"
                class="clean-input text-xs"
              />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                id="modal-cust-pw"
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
              <label class="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer select-none">
                <input type="checkbox" id="modal-cust-remember" class="accent-blue-600 w-3.5 h-3.5 cursor-pointer" />
                <span>Save login details on this device</span>
              </label>
            </div>
            <button type="submit" class="btn-primary w-full py-2.5 text-xs justify-center font-bold cursor-pointer">
              Sign In to Account →
            </button>
          </form>
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500">Need an account?</span>
            <button type="button" onclick="AuthModule.setModalMode('register')" class="text-blue-600 font-bold hover:underline">Register Now</button>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="mb-4">
            <h3 class="text-lg font-bold text-slate-900">Create Customer Account</h3>
            <p class="text-xs text-slate-500">Join OmniCart for fast 20-min delivery</p>
          </div>
          <form onsubmit="AuthModule.handleCustomerRegister(event)" class="space-y-3 text-xs" autocomplete="off" autocorrect="off" autocapitalize="off">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">First Name</label>
                <input type="text" id="modal-reg-fname" required autocomplete="off" placeholder="First Name" class="clean-input text-xs" />
              </div>
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Last Name</label>
                <input type="text" id="modal-reg-lname" required autocomplete="off" placeholder="Last Name" class="clean-input text-xs" />
              </div>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Email</label>
              <input type="email" id="modal-reg-email" required autocomplete="off" placeholder="name@domain.com" class="clean-input text-xs" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Phone</label>
              <input type="tel" id="modal-reg-phone" required autocomplete="off" placeholder="+91 98765 43210" class="clean-input text-xs" />
            </div>

            <!-- Address Section Aligned with Database Schema -->
            <div class="address-section-box space-y-2">
              <div class="address-header">
                <span class="address-title text-[11px]">Delivery Address</span>
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] text-[#5a544b]">Type:</span>
                  <select id="modal-reg-addr-type" class="clean-select text-xs py-1 px-1.5 bg-white border border-[#d9d2c6] text-[#171513] rounded">
                    <option value="1">Home</option>
                    <option value="2">Work</option>
                    <option value="3">Other</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="address-label text-[10px]">House / Flat No.</label>
                  <input type="text" id="modal-reg-houseno" required autocomplete="off" placeholder="e.g. Flat 402" class="clean-input text-xs" />
                </div>
                <div>
                  <label class="address-label text-[10px]">Street / Colony / Campus</label>
                  <input type="text" id="modal-reg-street" required autocomplete="off" placeholder="e.g. IIT BHU, Lanka" class="clean-input text-xs" />
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="address-label text-[10px]">City</label>
                  <input type="text" id="modal-reg-city" required autocomplete="off" placeholder="e.g. Varanasi" class="clean-input text-xs" />
                </div>
                <div>
                  <label class="address-label text-[10px]">State</label>
                  <input type="text" id="modal-reg-state" required autocomplete="off" placeholder="e.g. Uttar Pradesh" class="clean-input text-xs" />
                </div>
                <div>
                  <label class="address-label text-[10px]">PIN Code (6 digits)</label>
                  <input type="text" id="modal-reg-pincode" required autocomplete="off" placeholder="221005" pattern="[0-9]{6}" title="6-digit PIN code" class="clean-input text-xs" />
                </div>
              </div>
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Password</label>
              <input type="password" id="modal-reg-pw" required autocomplete="new-password" placeholder="Set password" class="clean-input text-xs" />
            </div>
            <button type="submit" class="btn-primary w-full py-2.5 text-xs justify-center font-bold cursor-pointer">
              Create Account →
            </button>
          </form>
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500">Already registered?</span>
            <button type="button" onclick="AuthModule.setModalMode('login')" class="text-blue-600 font-bold hover:underline">Sign In</button>
          </div>
        `;
      }
    } else {

      if (this.currentModalMode === 'login') {
        container.innerHTML = `
          <div class="mb-4">
            <h3 class="text-lg font-bold text-slate-900">Merchant Sign In</h3>
            <p class="text-xs text-slate-500">Manage store inventory and price ledgers</p>
          </div>
          <form onsubmit="AuthModule.handleSellerLogin(event)" class="space-y-3.5 text-xs" autocomplete="off" autocorrect="off" autocapitalize="off">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Merchant Email or Phone</label>
              <input
                type="text"
                id="modal-seller-id"
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
              <label class="block font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                id="modal-seller-pw"
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
              <label class="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer select-none">
                <input type="checkbox" id="modal-seller-remember" class="accent-emerald-600 w-3.5 h-3.5 cursor-pointer" />
                <span>Save login details on this device</span>
              </label>
            </div>
            <button type="submit" class="btn-primary bg-emerald-600 hover:bg-emerald-700 w-full py-2.5 text-xs justify-center font-bold cursor-pointer">
              Access Seller Portal →
            </button>
          </form>
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500">New seller?</span>
            <button type="button" onclick="AuthModule.setModalMode('register')" class="text-emerald-700 font-bold hover:underline">Register Store</button>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="mb-4">
            <h3 class="text-lg font-bold text-slate-900">Register Merchant Store</h3>
            <p class="text-xs text-slate-500">Sell products with GSTIN registration</p>
          </div>
          <form onsubmit="AuthModule.handleSellerRegister(event)" class="space-y-3 text-xs" autocomplete="off" autocorrect="off" autocapitalize="off">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Company / Store Name</label>
              <input type="text" id="modal-seller-name" required autocomplete="off" placeholder="e.g. Apex Hardware Pvt Ltd" class="clean-input text-xs" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">GSTIN (15-digit)</label>
              <input type="text" id="modal-seller-gstin" required autocomplete="off" placeholder="29ABCDE1234F1Z5" class="clean-input text-xs uppercase" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Business Email</label>
                <input type="email" id="modal-seller-email" required autocomplete="off" placeholder="contact@store.in" class="clean-input text-xs" />
              </div>
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input type="tel" id="modal-seller-phone" required autocomplete="off" placeholder="+91 800 555 1010" class="clean-input text-xs" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">City</label>
                <input type="text" id="modal-seller-city" required autocomplete="off" placeholder="e.g. Bengaluru" class="clean-input text-xs" />
              </div>
              <div>
                <label class="block font-semibold text-slate-700 mb-1">State</label>
                <input type="text" id="modal-seller-state" required autocomplete="off" placeholder="e.g. Karnataka" class="clean-input text-xs" />
              </div>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Password</label>
              <input type="password" id="modal-seller-pw2" required autocomplete="new-password" placeholder="Set password" class="clean-input text-xs" />
            </div>
            <button type="submit" class="btn-primary bg-emerald-600 hover:bg-emerald-700 w-full py-2.5 text-xs justify-center font-bold cursor-pointer">
              Register Store →
            </button>
          </form>
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500">Already registered?</span>
            <button type="button" onclick="AuthModule.setModalMode('login')" class="text-emerald-700 font-bold hover:underline">Sign In</button>
          </div>
        `;
      }
    }

    if (window.UIModule && typeof window.UIModule.initPasswordToggles === 'function') {
      window.UIModule.initPasswordToggles(container);
    }
  },

  async handleCustomerLogin(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const idInput = document.getElementById('modal-cust-id');
    const pwInput = document.getElementById('modal-cust-pw');
    const remember = document.getElementById('modal-cust-remember')?.checked || false;
    const id = idInput ? idInput.value.trim() : '';
    const pw = pwInput ? pwInput.value : '';

    if (window.UIModule && window.UIModule.setButtonLoading) {
      window.UIModule.setButtonLoading(submitBtn, true, 'Signing in...');
    }

    try {
      const user = await DataStore.loginCustomer(id, pw, remember);
      if (pwInput) pwInput.value = '';
      if (idInput && !remember) idInput.value = '';
      this.closeAuthModal();

      if (DataStore.currentUserRole === 'seller' || (user && user.isSeller)) {
        UIModule.showToast(`Signed in as Merchant: ${DataStore.currentSeller.CompanyName}!`, 'success');
        UIModule.renderHeader();
        setTimeout(() => {
          window.location.href = 'seller-dashboard.html';
        }, 300);
        return;
      }

      UIModule.showToast(`Signed in as ${user.FirstName}!`, 'success');
      UIModule.renderHeader();

      if (this.pendingRedirect) {
        window.location.href = this.pendingRedirect;
      } else {
        setTimeout(() => window.location.reload(), 300);
      }
    } catch (err) {
      if (pwInput) pwInput.value = '';
      UIModule.showToast(err.message || 'Invalid credentials. Please register first.', 'error');
    } finally {
      if (window.UIModule && window.UIModule.setButtonLoading) {
        window.UIModule.setButtonLoading(submitBtn, false);
      }
    }
  },

  async handleCustomerRegister(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const fname = document.getElementById('modal-reg-fname').value.trim();
    const lname = document.getElementById('modal-reg-lname').value.trim();
    const email = document.getElementById('modal-reg-email').value.trim();
    const phone = document.getElementById('modal-reg-phone').value.trim();
    const addrTypeEl = document.getElementById('modal-reg-addr-type');
    const addressTypeId = addrTypeEl ? parseInt(addrTypeEl.value, 10) : 1;
    const addressTypeName = addrTypeEl ? addrTypeEl.options[addrTypeEl.selectedIndex].text : 'Home';
    const houseNumber = document.getElementById('modal-reg-houseno').value.trim();
    const street = document.getElementById('modal-reg-street').value.trim();
    const city = document.getElementById('modal-reg-city').value.trim();
    const state = document.getElementById('modal-reg-state')?.value.trim() || '';
    const pincode = document.getElementById('modal-reg-pincode').value.trim();
    const pw = document.getElementById('modal-reg-pw').value;

    if (window.UIModule && window.UIModule.setButtonLoading) {
      window.UIModule.setButtonLoading(submitBtn, true, 'Creating account...');
    }

    try {
      const user = await DataStore.registerCustomer({
        firstName: fname,
        lastName: lname,
        email: email,
        phone: phone,
        password: pw,
        address: {
          addressTypeId: addressTypeId,
          addressType: addressTypeName,
          type: addressTypeName,
          houseNumber: houseNumber,
          street: street,
          city: city,
          state: state,
          pincode: pincode
        }
      });

      this.closeAuthModal();
      UIModule.showToast(`Welcome to OmniCart, ${user.FirstName}!`, 'success');
      UIModule.renderHeader();

      if (this.pendingRedirect) {
        window.location.href = this.pendingRedirect;
      } else {
        setTimeout(() => window.location.reload(), 300);
      }
    } catch (err) {
      UIModule.showToast(err.message || 'Registration failed.', 'error');
    } finally {
      if (window.UIModule && window.UIModule.setButtonLoading) {
        window.UIModule.setButtonLoading(submitBtn, false);
      }
    }
  },

  async handleSellerLogin(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const idInput = document.getElementById('modal-seller-id');
    const pwInput = document.getElementById('modal-seller-pw');
    const remember = document.getElementById('modal-seller-remember')?.checked || false;
    const id = idInput ? idInput.value.trim() : '';
    const pw = pwInput ? pwInput.value : '';

    if (window.UIModule && window.UIModule.setButtonLoading) {
      window.UIModule.setButtonLoading(submitBtn, true, 'Signing in...');
    }

    try {
      const seller = await DataStore.loginSeller(id, pw, remember);
      if (pwInput) pwInput.value = '';
      if (idInput && !remember) idInput.value = '';
      this.closeAuthModal();
      UIModule.showToast(`Authenticated Merchant: ${seller.CompanyName}`, 'success');
      UIModule.renderHeader();

      if (this.pendingRedirect) {
        window.location.href = this.pendingRedirect;
      } else {
        window.location.href = 'seller-dashboard.html';
      }
    } catch (err) {
      if (pwInput) pwInput.value = '';
      UIModule.showToast(err.message || 'Invalid merchant credentials.', 'error');
    } finally {
      if (window.UIModule && window.UIModule.setButtonLoading) {
        window.UIModule.setButtonLoading(submitBtn, false);
      }
    }
  },

  async handleSellerRegister(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const name = document.getElementById('modal-seller-name').value.trim();
    const gstin = document.getElementById('modal-seller-gstin').value.trim();
    const email = document.getElementById('modal-seller-email').value.trim();
    const phone = document.getElementById('modal-seller-phone')?.value.trim() || '+91 800 555 1010';
    const city = document.getElementById('modal-seller-city')?.value.trim() || 'Bengaluru';
    const state = document.getElementById('modal-seller-state')?.value.trim() || 'Karnataka';
    const pw = document.getElementById('modal-seller-pw2').value;

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

      this.closeAuthModal();
      UIModule.showToast(`Merchant Store Registered: ${seller.CompanyName}`, 'success');
      UIModule.renderHeader();

      window.location.href = 'seller-dashboard.html';
    } catch (err) {
      UIModule.showToast(err.message || 'Store registration failed.', 'error');
    } finally {
      if (window.UIModule && window.UIModule.setButtonLoading) {
        window.UIModule.setButtonLoading(submitBtn, false);
      }
    }
  },

  logout() {
    DataStore.logout();
    UIModule.showToast('You have been logged out.', 'info');
    UIModule.renderHeader();
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 400);
  }
};

window.AuthModule = AuthModule;
