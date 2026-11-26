
const ProfileModule = {
  authMode: 'login',
  editingPhoneVal: null,
  editingEmailVal: null,

  async init() {

    if (DataStore.currentUser && DataStore.currentUserRole === 'buyer') {
      try {
        await Promise.all([
          DataStore.syncCustomerProfile(),
          DataStore.fetchCustomerAddresses(),
          DataStore.fetchCustomerPhones(),
          DataStore.fetchCustomerEmails()
        ]);
      } catch (_) {}
    }
    this.render();
  },

  setAuthMode(mode) {
    this.authMode = mode;
    this.renderAuthForm();
  },

  async render() {
    const authContainer = document.getElementById('customer-auth-container');
    const profileContainer = document.getElementById('customer-profile-container');

    if (!DataStore.currentUser || DataStore.currentUserRole !== 'buyer') {
      if (authContainer) authContainer.classList.remove('hidden');
      if (profileContainer) profileContainer.classList.add('hidden');
      this.renderAuthForm();
      return;
    }

    if (authContainer) authContainer.classList.add('hidden');
    if (profileContainer) profileContainer.classList.remove('hidden');

    const user = DataStore.currentUser;

    const nameElem = document.getElementById('profile-full-name');
    const initialsElem = document.getElementById('profile-avatar-initials');
    const custIdElem = document.getElementById('profile-customer-id');

    const fullName = `${user.FirstName || ''} ${user.LastName || ''}`.trim() || user.email || 'Customer';
    if (nameElem) nameElem.innerText = fullName;
    if (initialsElem) {
      const parts = fullName.split(' ');
      const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
      initialsElem.innerText = initials;
    }
    if (custIdElem) {
      const idNum = Number(user.id || user.CustomerID || 1);
      custIdElem.innerText = `CUST-${String(idNum).padStart(4, '0')}`;
    }

    if (window.UIModule && typeof UIModule.renderHeader === 'function') {
      UIModule.renderHeader();
    }

    this.renderPhones();
    this.renderEmails();
    this.renderAddresses();
  },

  renderAuthForm() {
    const box = document.getElementById('customer-auth-form-box');
    const loginTab = document.getElementById('cust-tab-login');
    const regTab = document.getElementById('cust-tab-register');

    if (this.authMode === 'login') {
      if (loginTab) loginTab.className = 'py-2 rounded font-semibold transition-all bg-[#1a1714] text-[#c8a96e] border border-[#c8a96e]/30';
      if (regTab) regTab.className = 'py-2 rounded font-medium transition-all text-[#9a9188] hover:text-[#e8e2d9]';

      if (box) {
        box.innerHTML = `
          <form onsubmit="ProfileModule.handleLogin(event)" class="space-y-4 text-xs" autocomplete="off" autocorrect="off" autocapitalize="off">
            <div>
              <label class="block font-semibold text-[#9a9188] mb-1">Email or Mobile Phone</label>
              <input
                type="text"
                id="prof-login-id"
                required
                autocomplete="off"
                placeholder="name@domain.com or 9876543210"
                class="clean-input text-xs"
              />
            </div>
            <div>
              <label class="block font-semibold text-[#9a9188] mb-1">Password</label>
              <input
                type="password"
                id="prof-login-pw"
                required
                autocomplete="new-password"
                placeholder="••••••••"
                class="clean-input text-xs"
              />
            </div>
            <div class="flex items-center justify-between pt-1">
              <label class="flex items-center gap-2 text-[11px] text-[#9a9188] cursor-pointer select-none">
                <input type="checkbox" id="prof-remember" class="accent-[#c8a96e] w-3.5 h-3.5 cursor-pointer" />
                <span>Save login details on this device</span>
              </label>
            </div>
            <button type="submit" class="btn-primary w-full py-2.5 text-xs justify-center font-bold cursor-pointer">
              Sign In to Account →
            </button>
          </form>
        `;
      }
    } else {
      if (regTab) regTab.className = 'py-2 rounded font-semibold transition-all bg-[#1a1714] text-[#c8a96e] border border-[#c8a96e]/30';
      if (loginTab) loginTab.className = 'py-2 rounded font-medium transition-all text-[#9a9188] hover:text-[#e8e2d9]';

      if (box) {
        box.innerHTML = `
          <form onsubmit="ProfileModule.handleRegister(event)" class="space-y-3 text-xs" autocomplete="off" autocorrect="off" autocapitalize="off">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold text-[#9a9188] mb-1">First Name</label>
                <input type="text" id="prof-reg-fname" required autocomplete="off" placeholder="Ritik" class="clean-input text-xs" />
              </div>
              <div>
                <label class="block font-semibold text-[#9a9188] mb-1">Last Name</label>
                <input type="text" id="prof-reg-lname" required autocomplete="off" placeholder="Yadav" class="clean-input text-xs" />
              </div>
            </div>
            <div>
              <label class="block font-semibold text-[#9a9188] mb-1">Email</label>
              <input type="email" id="prof-reg-email" required autocomplete="off" placeholder="ritik@gmail.com" class="clean-input text-xs" />
            </div>
            <div>
              <label class="block font-semibold text-[#9a9188] mb-1">Phone</label>
              <input type="tel" id="prof-reg-phone" required autocomplete="off" placeholder="9478589654" class="clean-input text-xs" />
            </div>
            <div class="address-section-box space-y-2">
              <div class="address-header">
                <span class="address-title text-[11px]">Delivery Address</span>
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] text-[#5a544b]">Type:</span>
                  <select id="prof-reg-addr-type" class="clean-select text-xs py-0.5 px-1.5">
                    <option value="1">Home</option>
                    <option value="2">Work</option>
                    <option value="3">Other</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="address-label text-[10px]">House / Flat No.</label>
                  <input type="text" id="prof-reg-houseno" required autocomplete="off" placeholder="45" class="clean-input text-xs" />
                </div>
                <div>
                  <label class="address-label text-[10px]">Street / Locality</label>
                  <input type="text" id="prof-reg-street" required autocomplete="off" placeholder="Lanka" class="clean-input text-xs" />
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="address-label text-[10px]">City</label>
                  <input type="text" id="prof-reg-city" required autocomplete="off" placeholder="Varanasi" class="clean-input text-xs" />
                </div>
                <div>
                  <label class="address-label text-[10px]">State</label>
                  <input type="text" id="prof-reg-state" required autocomplete="off" placeholder="Uttar Pradesh" class="clean-input text-xs" />
                </div>
                <div>
                  <label class="address-label text-[10px]">PIN Code</label>
                  <input type="text" id="prof-reg-pincode" required autocomplete="off" placeholder="221005" pattern="[0-9]{6}" title="6-digit PIN code" class="clean-input text-xs" />
                </div>
              </div>
            </div>
            <div>
              <label class="block font-semibold text-[#9a9188] mb-1">Password</label>
              <input type="password" id="prof-reg-pw" required autocomplete="new-password" placeholder="Set password" class="clean-input text-xs" />
            </div>
            <button type="submit" class="btn-primary w-full py-2.5 text-xs justify-center font-bold cursor-pointer">
              Create Customer Account →
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
    const idInput = document.getElementById('prof-login-id');
    const pwInput = document.getElementById('prof-login-pw');
    const remember = document.getElementById('prof-remember')?.checked || false;
    const id = idInput ? idInput.value.trim() : '';
    const pw = pwInput ? pwInput.value : '';

    if (window.UIModule && window.UIModule.setButtonLoading) {
      window.UIModule.setButtonLoading(submitBtn, true, 'Signing in...');
    }

    try {
      const user = await DataStore.loginCustomer(id, pw, remember);
      if (pwInput) pwInput.value = '';
      if (idInput && !remember) idInput.value = '';
      UIModule.showToast(`Welcome back, ${user.FirstName} ${user.LastName || ''}!`, 'success');
      UIModule.renderHeader();
      await this.init();
    } catch (err) {
      if (pwInput) pwInput.value = '';
      UIModule.showToast(err.message || 'Invalid credentials. Please register first.', 'error');
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
    const fname = document.getElementById('prof-reg-fname').value.trim();
    const lname = document.getElementById('prof-reg-lname').value.trim();
    const email = document.getElementById('prof-reg-email').value.trim();
    const phone = document.getElementById('prof-reg-phone').value.trim();
    const addrTypeEl = document.getElementById('prof-reg-addr-type');
    const addressTypeId = addrTypeEl ? parseInt(addrTypeEl.value, 10) : 1;
    const addressTypeName = addrTypeEl ? addrTypeEl.options[addrTypeEl.selectedIndex].text : 'Home';
    const houseNumber = document.getElementById('prof-reg-houseno').value.trim();
    const street = document.getElementById('prof-reg-street').value.trim();
    const city = document.getElementById('prof-reg-city').value.trim();
    const state = document.getElementById('prof-reg-state')?.value.trim() || '';
    const pincode = document.getElementById('prof-reg-pincode').value.trim();
    const pw = document.getElementById('prof-reg-pw').value;

    if (window.UIModule && window.UIModule.setButtonLoading) {
      window.UIModule.setButtonLoading(submitBtn, true, 'Creating account...');
    }

    try {
      const customer = await DataStore.registerCustomer({
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
      UIModule.showToast(`Account created! Welcome, ${customer.FirstName} ${customer.LastName || ''}!`, 'success');
      UIModule.renderHeader();
      await this.init();
    } catch (err) {
      UIModule.showToast(err.message || 'Registration failed.', 'error');
    } finally {
      if (window.UIModule && window.UIModule.setButtonLoading) {
        window.UIModule.setButtonLoading(submitBtn, false);
      }
    }
  },

  renderPhones() {
    const container = document.getElementById('profile-phones-container');
    if (!container) return;

    let phones = DataStore.phones || [];
    if (phones.length === 0 && DataStore.currentUser && DataStore.currentUser.phone) {
      phones = [{ id: 1, phone: DataStore.currentUser.phone, type: 'Primary', isPrimary: true }];
      DataStore.phones = phones;
    }

    if (phones.length === 0) {
      container.innerHTML = '<p class="text-xs text-[#9a9188]">No phone numbers registered.</p>';
      return;
    }

    container.innerHTML = phones.map(p => {
      const safePhone = UIModule.escapeHtml(p.phone || '');
      const isEditing = (this.editingPhoneVal === p.phone);

      if (isEditing) {
        return `
          <form onsubmit="ProfileModule.saveEditedPhone(event, '${safePhone}')" class="p-3 rounded bg-[#161412] border border-[#c8a96e] space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-[#c8a96e] text-[11px]">Change Phone Number</span>
              <button type="button" onclick="ProfileModule.cancelEditPhone()" class="text-xs text-[#9a9188] hover:text-[#e8e2d9]">Cancel</button>
            </div>
            <div class="flex gap-2">
              <input type="tel" id="edit-phone-input" value="${safePhone}" required class="clean-input text-xs py-1.5 flex-1" />
              <button type="submit" class="btn-primary py-1.5 px-3 text-xs font-semibold cursor-pointer">Save Phone</button>
            </div>
          </form>
        `;
      }

      return `
        <div class="flex items-center justify-between p-3 rounded bg-[#161412] border border-[#2a2520] text-xs">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-[#e8e2d9] text-sm">${safePhone}</span>
              <span class="badge ${p.isPrimary ? 'badge-green' : 'badge-gold'} text-[10px]">${p.isPrimary ? 'Primary' : 'Alternate'}</span>
              <button type="button" class="copy-btn text-[10px] py-0.5 px-2" onclick="UIModule.copyToClipboard('${safePhone}', this, 'Phone Copied!')" title="Copy Phone">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>Copy</span>
              </button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              onclick="ProfileModule.startEditPhone('${safePhone}')"
              class="text-[#c8a96e] hover:underline font-semibold text-xs cursor-pointer"
            >
              Change
            </button>
            ${!p.isPrimary && phones.length > 1 ? `
              <button
                type="button"
                onclick="ProfileModule.deletePhone(${p.id}, '${safePhone}')"
                class="text-red-400 hover:text-red-300 text-xs px-1 cursor-pointer"
              >
                Remove
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  startEditPhone(phoneVal) {
    this.editingPhoneVal = phoneVal;
    this.renderPhones();
    setTimeout(() => {
      const el = document.getElementById('edit-phone-input');
      if (el) el.focus();
    }, 50);
  },

  cancelEditPhone() {
    this.editingPhoneVal = null;
    this.renderPhones();
  },

  async saveEditedPhone(e, oldPhone) {
    e.preventDefault();
    const input = document.getElementById('edit-phone-input');
    if (!input) return;
    const newPhone = input.value.trim();

    if (newPhone.length < 8) {
      UIModule.showToast('Please enter a valid phone number.', 'error');
      return;
    }

    try {
      await DataStore.updateCustomerPhone(newPhone);
      this.editingPhoneVal = null;
      this.renderPhones();
      UIModule.showToast('Phone number updated successfully', 'success');
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to update phone number.', 'error');
    }
  },

  async addPhone(e) {
    e.preventDefault();
    const phoneInput = document.getElementById('new-phone-input');
    if (!phoneInput || !phoneInput.value.trim()) return;
    const phoneVal = phoneInput.value.trim();

    if (phoneVal.length < 8) {
      UIModule.showToast('Please enter a valid phone number.', 'error');
      return;
    }

    try {
      await DataStore.addCustomerPhone(phoneVal, 'Alternate', false);
      phoneInput.value = '';
      this.renderPhones();
      UIModule.showToast('Alternate phone added successfully', 'success');
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to add phone number.', 'error');
    }
  },

  async deletePhone(id, phoneVal) {
    try {
      await DataStore.deleteCustomerPhone(id, phoneVal);
      this.renderPhones();
      UIModule.showToast('Phone number removed', 'info');
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to remove phone number.', 'error');
    }
  },

  renderEmails() {
    const container = document.getElementById('profile-emails-container');
    if (!container) return;

    let emails = DataStore.emails || [];
    if (emails.length === 0 && DataStore.currentUser && DataStore.currentUser.email) {
      emails = [{ id: 1, email: DataStore.currentUser.email, type: 'Primary', isPrimary: true }];
      DataStore.emails = emails;
    }

    if (emails.length === 0) {
      container.innerHTML = '<p class="text-xs text-[#9a9188]">No email addresses registered.</p>';
      return;
    }

    container.innerHTML = emails.map(e => {
      const safeEmail = UIModule.escapeHtml(e.email || '');
      const isEditing = (this.editingEmailVal === e.email);

      if (isEditing) {
        return `
          <form onsubmit="ProfileModule.saveEditedEmail(event, '${safeEmail}')" class="p-3 rounded bg-[#161412] border border-[#c8a96e] space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-[#c8a96e] text-[11px]">Change Email Address</span>
              <button type="button" onclick="ProfileModule.cancelEditEmail()" class="text-xs text-[#9a9188] hover:text-[#e8e2d9]">Cancel</button>
            </div>
            <div class="flex gap-2">
              <input type="email" id="edit-email-input" value="${safeEmail}" required class="clean-input text-xs py-1.5 flex-1" />
              <button type="submit" class="btn-primary py-1.5 px-3 text-xs font-semibold cursor-pointer">Save Email</button>
            </div>
          </form>
        `;
      }

      return `
        <div class="flex items-center justify-between p-3 rounded bg-[#161412] border border-[#2a2520] text-xs">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-[#e8e2d9] text-sm">${safeEmail}</span>
              <span class="badge ${e.isPrimary ? 'badge-green' : 'badge-gold'} text-[10px]">${e.isPrimary ? 'Primary' : 'Alternate'}</span>
              <button type="button" class="copy-btn text-[10px] py-0.5 px-2" onclick="UIModule.copyToClipboard('${safeEmail}', this, 'Email Copied!')" title="Copy Email">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>Copy</span>
              </button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              onclick="ProfileModule.startEditEmail('${safeEmail}')"
              class="text-[#c8a96e] hover:underline font-semibold text-xs cursor-pointer"
            >
              Change
            </button>
            ${!e.isPrimary && emails.length > 1 ? `
              <button
                type="button"
                onclick="ProfileModule.deleteEmail(${e.id}, '${safeEmail}')"
                class="text-red-400 hover:text-red-300 text-xs px-1 cursor-pointer"
              >
                Remove
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  startEditEmail(emailVal) {
    this.editingEmailVal = emailVal;
    this.renderEmails();
    setTimeout(() => {
      const el = document.getElementById('edit-email-input');
      if (el) el.focus();
    }, 50);
  },

  cancelEditEmail() {
    this.editingEmailVal = null;
    this.renderEmails();
  },

  async saveEditedEmail(e, oldEmail) {
    e.preventDefault();
    const input = document.getElementById('edit-email-input');
    if (!input) return;
    const newEmail = input.value.trim();

    if (!newEmail.includes('@') || !newEmail.includes('.')) {
      UIModule.showToast('Please enter a valid email address.', 'error');
      return;
    }

    try {
      await DataStore.updateCustomerEmail(newEmail);
      this.editingEmailVal = null;
      this.renderEmails();
      UIModule.showToast('Email address updated successfully', 'success');
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to update email address.', 'error');
    }
  },

  async addEmail(e) {
    e.preventDefault();
    const emailInput = document.getElementById('new-email-input');
    if (!emailInput || !emailInput.value.trim()) return;
    const emailVal = emailInput.value.trim();

    if (!emailVal.includes('@') || !emailVal.includes('.')) {
      UIModule.showToast('Please enter a valid email address.', 'error');
      return;
    }

    try {
      await DataStore.addCustomerEmail(emailVal, 'Alternate', false);
      emailInput.value = '';
      this.renderEmails();
      UIModule.showToast('Alternate email added successfully', 'success');
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to add email address.', 'error');
    }
  },

  async deleteEmail(id, emailVal) {
    try {
      await DataStore.deleteCustomerEmail(id, emailVal);
      this.renderEmails();
      UIModule.showToast('Email address removed', 'info');
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to remove email.', 'error');
    }
  },

  renderAddresses() {
    const container = document.getElementById('profile-addresses-container');
    if (!container) return;

    DataStore.addresses = (DataStore.addresses || []).filter(a => !(a.street && (a.street.includes('Cyber Residency') || a.street.includes('100 Feet Rd, Indiranagar'))));

    const addresses = DataStore.addresses;

    if (addresses.length === 0) {
      container.innerHTML = '<p class="text-xs text-[#9a9188] col-span-2">No delivery addresses saved yet.</p>';
      return;
    }

    const currentAddressId = Number(localStorage.getItem('omnicart_current_address_id')) || addresses[0].id;

    container.innerHTML = addresses.map(addr => {
      const isCurrent = (Number(addr.id) === Number(currentAddressId));
      const safeType = UIModule.escapeHtml(addr.type || addr.addressType || 'Home');
      const safeHouse = addr.houseNumber ? UIModule.escapeHtml(addr.houseNumber) + ', ' : '';
      const safeStreet = UIModule.escapeHtml(addr.street || '');
      const safeCity = UIModule.escapeHtml(addr.city || 'Varanasi');
      const safeState = addr.state ? `, ${UIModule.escapeHtml(addr.state)}` : '';
      const safePin = UIModule.escapeHtml(addr.pincode || addr.pinCode || '221005');

      return `
        <div class="p-4 rounded bg-[#161412] border ${isCurrent ? 'border-[#c8a96e]' : 'border-[#2a2520]'} space-y-2 text-xs">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="badge badge-gold font-bold text-[10px]">${safeType}</span>
              ${isCurrent ? '<span class="badge badge-green text-[10px]">Current</span>' : ''}
            </div>
            <div class="flex items-center gap-2">
              ${!isCurrent ? `
                <button
                  type="button"
                  onclick="ProfileModule.setCurrentAddress(${addr.id})"
                  class="text-[#c8a96e] hover:underline font-semibold text-xs cursor-pointer"
                >
                  Set as Current
                </button>
              ` : ''}
              <button
                type="button"
                onclick="ProfileModule.deleteAddress(${addr.id})"
                class="text-red-400 hover:text-red-300 font-semibold cursor-pointer text-xs ml-1"
              >
                Delete
              </button>
            </div>
          </div>
          <p class="font-bold text-[#e8e2d9] text-sm">${safeHouse}${safeStreet}</p>
          <p class="text-[#9a9188]">${safeCity}${safeState} - ${safePin}</p>
        </div>
      `;
    }).join('');
  },

  async addAddress(e) {
    e.preventDefault();
    const houseInput = document.getElementById('new-addr-house');
    const streetInput = document.getElementById('new-addr-street');
    const cityInput = document.getElementById('new-addr-city');
    const stateInput = document.getElementById('new-addr-state');
    const pinInput = document.getElementById('new-addr-pin');
    const typeInput = document.getElementById('new-addr-type');

    const houseNumber = houseInput ? houseInput.value.trim() : '';
    const street = streetInput ? streetInput.value.trim() : '';
    const city = cityInput ? cityInput.value.trim() : '';
    const state = stateInput ? stateInput.value.trim() : '';
    const pincode = pinInput ? pinInput.value.trim() : '';
    const type = typeInput ? typeInput.value.trim() : 'Home';

    if (!street || !city) {
      UIModule.showToast('Please fill in street and city.', 'error');
      return;
    }

    if (!/^\d{6}$/.test(pincode)) {
      UIModule.showToast('Invalid PIN code. Must be exactly 6 digits.', 'error');
      return;
    }

    try {
      await DataStore.addCustomerAddress({
        houseNumber: houseNumber,
        street: street,
        city: city,
        state: state,
        pincode: pincode,
        type: type
      });

      e.target.reset();
      this.renderAddresses();
      UIModule.showToast('Delivery address saved successfully', 'success');
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to save address.', 'error');
    }
  },

  async deleteAddress(id) {
    try {
      await DataStore.deleteCustomerAddress(id);
      this.renderAddresses();
      UIModule.showToast('Delivery address deleted', 'info');
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to delete address.', 'error');
    }
  },

  setCurrentAddress(id) {
    DataStore.setCurrentAddress(id);
    this.renderAddresses();
    UIModule.showToast('Address selected as current delivery destination', 'success');
  },

  async deleteAccount() {
    const confirmed = confirm('Are you sure you want to permanently delete your account? This action cannot be undone. All your data including addresses, phone numbers, and emails will be removed from the database.');
    if (!confirmed) return;

    const doubleConfirm = confirm('This is your final confirmation. Your account and all associated data will be permanently deleted. Continue?');
    if (!doubleConfirm) return;

    try {
      await DataStore.deleteCustomerAccount();
      UIModule.showToast('Your account has been permanently deleted.', 'success');
      setTimeout(() => {
        window.location.href = 'customer-profile.html';
      }, 1500);
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to delete account. Please try again.', 'error');
    }
  },

  openEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (!modal) return;

    const user = DataStore.currentUser;
    if (!user) return;

    const fnameInput = document.getElementById('edit-prof-fname');
    const lnameInput = document.getElementById('edit-prof-lname');
    const emailInput = document.getElementById('edit-prof-email');
    const phoneInput = document.getElementById('edit-prof-phone');
    const pwInput = document.getElementById('edit-prof-password');

    if (fnameInput) fnameInput.value = user.FirstName || '';
    if (lnameInput) lnameInput.value = user.LastName || '';
    if (emailInput) emailInput.value = user.email || '';
    if (phoneInput) phoneInput.value = user.phone || '';
    if (pwInput) pwInput.value = '';

    modal.classList.remove('hidden');

    if (window.UIModule && typeof window.UIModule.initPasswordToggles === 'function') {
      window.UIModule.initPasswordToggles(modal);
    }
  },

  closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) modal.classList.add('hidden');
  },

  async handleUpdateProfile(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const firstName = (document.getElementById('edit-prof-fname')?.value || '').trim();
    const lastName = (document.getElementById('edit-prof-lname')?.value || '').trim();
    const email = (document.getElementById('edit-prof-email')?.value || '').trim();
    const phone = (document.getElementById('edit-prof-phone')?.value || '').trim();
    const password = (document.getElementById('edit-prof-password')?.value || '').trim();

    if (!firstName) {
      UIModule.showToast('First name is required.', 'error');
      return;
    }
    if (!lastName) {
      UIModule.showToast('Last name is required.', 'error');
      return;
    }
    if (!email || !email.includes('@')) {
      UIModule.showToast('A valid email address is required.', 'error');
      return;
    }
    if (!phone || phone.length < 8) {
      UIModule.showToast('A valid phone number is required.', 'error');
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
      await DataStore.updateCustomerProfile({
        firstName,
        lastName,
        email,
        phone,
        password: password || undefined
      });

      this.closeEditProfileModal();
      await this.init();
      UIModule.showToast('Profile updated successfully!', 'success');
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      if (window.UIModule && window.UIModule.setButtonLoading) {
        window.UIModule.setButtonLoading(submitBtn, false);
      }
    }
  }
};

window.ProfileModule = ProfileModule;
