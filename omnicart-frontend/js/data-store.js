
const DataStore = {
  API_BASE: 'http://localhost:8080/api',
  token: sessionStorage.getItem('omnicart_token') || localStorage.getItem('omnicart_token') || null,
  currentUser: JSON.parse(sessionStorage.getItem('omnicart_user') || localStorage.getItem('omnicart_user') || 'null'),
  currentSeller: JSON.parse(sessionStorage.getItem('omnicart_seller') || localStorage.getItem('omnicart_seller') || 'null'),
  currentUserRole: sessionStorage.getItem('omnicart_role') || localStorage.getItem('omnicart_role') || null,

  categories: [],
  products: [],
  cart: JSON.parse(localStorage.getItem('omnicart_cart') || '[]'),
  savedProducts: JSON.parse(localStorage.getItem('omnicart_saved') || '[]'),
  orders: JSON.parse(localStorage.getItem('omnicart_orders') || '[]'),
  addresses: JSON.parse(localStorage.getItem('omnicart_addresses') || '[]'),
  phones: JSON.parse(localStorage.getItem('omnicart_phones') || '[]'),
  emails: JSON.parse(localStorage.getItem('omnicart_emails') || '[]'),
  sellers: JSON.parse(localStorage.getItem('omnicart_sellers') || '[]'),

  async apiRequest(endpoint, options = {}) {

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (window.UIModule && typeof window.UIModule.showToast === 'function') {
        window.UIModule.showToast('You are currently offline. Operating in offline cache mode.', 'warning', 3000);
      }
      return null;
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      ...(options.headers || {})
    };

    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    if (window.UIModule && typeof window.UIModule.startLoadingBar === 'function') {
      window.UIModule.startLoadingBar();
    }

    const slowTimer = setTimeout(() => {
      if (window.UIModule && typeof window.UIModule.notifySlowConnection === 'function') {
        window.UIModule.notifySlowConnection();
      }
    }, 2500);

    try {
      const response = await fetch(`${this.API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      if (response.status === 401) {
        if (this.token) {
          this.token = null;
          sessionStorage.removeItem('omnicart_token');
          localStorage.removeItem('omnicart_token');
          if (window.UIModule && typeof window.UIModule.showSessionExpiredModal === 'function') {
            window.UIModule.showSessionExpiredModal();
          }
        }
      }

      try {
        const data = await response.json();

        if (!response.ok && data && data.success === undefined) {
          data.success = false;
        }
        return data;
      } catch (parseErr) {

        if (!response.ok) {
          return { success: false, message: `Server error (HTTP ${response.status})`, data: null };
        }
        return null;
      }
    } catch (err) {
      console.warn(`[DataStore] Backend API call to ${endpoint} failed or is offline. Operating in local-sync mode.`, err);
      return null;
    } finally {
      clearTimeout(slowTimer);
      if (window.UIModule && typeof window.UIModule.stopLoadingBar === 'function') {
        window.UIModule.stopLoadingBar();
      }
    }
  },

  generateTenPriceLedgerRecords(productId, basePrice) {
    const history = [];
    const scenarios = [
      { delta: 0, reason: 'Initial Catalog Baseline Listing', source: 'Seller Update' },
      { delta: 0.03, reason: 'Dynamic Pricing: Demand Surge (8 orders in 24h) [+3%]', source: 'Dynamic Pricing Algorithm' },
      { delta: 0.06, reason: 'Dynamic Pricing: Low Stock Scarcity (12 units remaining) [+6%]', source: 'Dynamic Pricing Algorithm' },
      { delta: -0.04, reason: 'Automated Discount: Inventory Clearance (-4%)', source: 'Automated Discount' },
      { delta: 0.02, reason: 'Dynamic Pricing: Multi-Seller Velocity (+2%)', source: 'Dynamic Pricing Algorithm' },
      { delta: 0.05, reason: 'Dynamic Pricing: Critical Reserve Premium (6 units left) [+5%]', source: 'Dynamic Pricing Algorithm' },
      { delta: -0.05, reason: 'Multi-Seller Inventory Replenished (-5%)', source: 'Seller Update' },
      { delta: -0.03, reason: 'Dynamic Pricing: Volume Incentive (-3%)', source: 'Dynamic Pricing Algorithm' },
      { delta: -0.02, reason: 'Platform Campaign Matching (-2%)', source: 'Platform Campaign' },
      { delta: 0.00, reason: 'Dynamic Pricing: Current Equilibrium Rate (Stock & Demand Evaluated)', source: 'Dynamic Pricing Algorithm' }
    ];

    let current = Math.round(basePrice * 0.94);
    const now = new Date();

    for (let i = 0; i < 10; i++) {
      const step = scenarios[i];
      const entryPrice = Math.round(basePrice * (1 + step.delta));
      const fluctuation = i === 0 ? 0 : entryPrice - current;
      const daysAgo = 10 - i;
      const d = new Date(now.getTime() - (daysAgo * 24 * 3600 * 1000) + (i * 3600 * 1000));
      const formattedDate = d.toISOString().replace('T', ' ').substring(0, 19);

      history.push({
        id: (productId * 100) + i + 1,
        price: entryPrice,
        fluctuation: fluctuation,
        changedAt: formattedDate,
        changeReason: step.reason,
        sourceName: step.source
      });
      current = entryPrice;
    }

    return history.reverse();
  },

  init() {
    this.seedInitialData();
    this.syncBackendCatalog();
    this.applyMarketplaceDynamicPricingSync();
    this.syncCustomerProfile();
    this.syncSellerProfile();

    // Self-heal past orders with actual delivery address
    if (Array.isArray(this.orders)) {
      this.orders.forEach(o => {
        if (!o.deliveryAddress || o.deliveryAddress === 'Standard Local Hub Dispatch') {
          o.deliveryAddress = (this.addresses && this.addresses[0])
            ? `${this.addresses[0].street}, ${this.addresses[0].city} - ${this.addresses[0].pincode}`
            : 'Flat 402, Cyber Heights, 100 Feet Rd, Bengaluru - 560038';
        }
      });
      localStorage.setItem('omnicart_orders', JSON.stringify(this.orders));
    }

    // Auto-fix any saved addresses where state was erroneously defaulted to Karnataka
    if (Array.isArray(this.addresses)) {
      let addrFixed = false;
      this.addresses.forEach(a => {
        if (a && a.city && a.city.toLowerCase().includes('varanasi') && (a.state === 'Karnataka' || !a.state)) {
          a.state = 'Uttar Pradesh';
          addrFixed = true;
        }
      });
      if (addrFixed) {
        localStorage.setItem('omnicart_addresses', JSON.stringify(this.addresses));
      }
    }

    // Automatic dynamic pricing scheduler disabled per user requirements
    // this.startAutoDynamicPricingScheduler();
  },

  startAutoDynamicPricingScheduler() {
    // Automatic 30-min background scheduler disabled per user requirement.
    // Dynamic pricing is strictly manual on-demand when the merchant triggers it in the dashboard.
    if (window._omnicartDynamicPricingInterval) {
      clearInterval(window._omnicartDynamicPricingInterval);
      window._omnicartDynamicPricingInterval = null;
    }
  },

  seedInitialData() {

    if (localStorage.getItem('omnicart_seeded_v1') || !localStorage.getItem('omnicart_clean_v5_dynamic')) {
      localStorage.removeItem('omnicart_seeded_v1');
      localStorage.removeItem('omnicart_clean_v2');
      localStorage.removeItem('omnicart_clean_v3');
      localStorage.removeItem('omnicart_products');
      localStorage.removeItem('omnicart_categories');
      localStorage.removeItem('omnicart_orders');
      localStorage.removeItem('omnicart_addresses');
      localStorage.removeItem('omnicart_phones');
      localStorage.removeItem('omnicart_emails');
      localStorage.removeItem('omnicart_cart');
      localStorage.removeItem('omnicart_saved');
      localStorage.removeItem('omnicart_user');
      localStorage.removeItem('omnicart_seller');
      localStorage.removeItem('omnicart_token');
      localStorage.removeItem('omnicart_role');

      const baseCategories = [
        { id: 1, name: 'Electronics', categoryName: 'Electronics', code: 'ELEC', description: 'Electronic devices and gadgets' },
        { id: 2, name: 'Apparel', categoryName: 'Apparel', code: 'APP', description: 'Clothing and fashion accessories' },
        { id: 3, name: 'Home & Kitchen', categoryName: 'Home & Kitchen', code: 'HOME', description: 'Household and kitchen items' },
        { id: 4, name: 'Sports', categoryName: 'Sports', code: 'SPORT', description: 'Sports equipment and gear' },
        { id: 5, name: 'Mobile Phones', categoryName: 'Mobile Phones', code: 'MOBI', description: 'Smartphones and accessories' },
        { id: 6, name: 'Laptops', categoryName: 'Laptops', code: 'LAPT', description: 'Laptops and notebooks' },
        { id: 7, name: 'Mens Clothing', categoryName: 'Mens Clothing', code: 'MCLO', description: 'Apparel for men' },
        { id: 8, name: 'Womens Clothing', categoryName: 'Womens Clothing', code: 'WCLO', description: 'Apparel for women' },
        { id: 9, name: 'Kitchen Appliances', categoryName: 'Kitchen Appliances', code: 'KITC', description: 'Electrical appliances for kitchen' },
        { id: 10, name: 'Running Shoes', categoryName: 'Running Shoes', code: 'SHOE', description: 'Shoes for running and athletics' }
      ];

      localStorage.setItem('omnicart_categories', JSON.stringify(baseCategories));
      localStorage.setItem('omnicart_products', JSON.stringify([]));
      localStorage.setItem('omnicart_addresses', JSON.stringify([]));
      localStorage.setItem('omnicart_phones', JSON.stringify([]));
      localStorage.setItem('omnicart_emails', JSON.stringify([]));
      localStorage.setItem('omnicart_orders', JSON.stringify([]));
      localStorage.setItem('omnicart_clean_v5_dynamic', 'true');
    }

    this.categories = JSON.parse(localStorage.getItem('omnicart_categories') || '[]');
    const storedProducts = JSON.parse(localStorage.getItem('omnicart_products') || '[]');
    if (storedProducts && storedProducts.length > 0) {
      this.products = storedProducts;
    } else {
      const baseCatalog = [
        { id: 1, code: 'PROD-001', name: 'Apex Chrono Cyber Watch v3', basePrice: 4999, originalPrice: 7499, stock: 25, catId: 1, catName: 'Electronics', desc: 'Next-gen titanium cybernetic smartwatch with biometric sensors, AMOLED retina display, and 14-day battery life.', img: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80', deal: true },
        { id: 2, code: 'PROD-002', name: 'Falcon-X 4K Gimbal Drone', basePrice: 38999, originalPrice: 48999, stock: 12, catId: 1, catName: 'Electronics', desc: 'Ultra-stable quadcopter drone featuring 3-axis mechanical gimbal, 4K HDR 60fps video, and 8km transmission range.', img: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80', deal: false },
        { id: 3, code: 'PROD-003', name: 'Pro Mechanical RGB Keyboard', basePrice: 6499, originalPrice: 8999, stock: 40, catId: 1, catName: 'Electronics', desc: 'Hot-swappable tactile switches, per-key RGB backlighting, sound-dampening foam, and aircraft-grade aluminum frame.', img: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80', deal: false },
        { id: 4, code: 'PROD-004', name: 'AcousticStudio ANC Wireless Headphones', basePrice: 12999, originalPrice: 16999, stock: 18, catId: 1, catName: 'Electronics', desc: 'Studio-grade over-ear wireless headphones with hybrid active noise cancellation, spatial audio, and 40-hour playback.', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', deal: false },
        { id: 5, code: 'PROD-005', name: 'CyberGlow Neural Desk Mat RGB', basePrice: 1899, originalPrice: 2499, stock: 35, catId: 1, catName: 'Electronics', desc: 'Extended microfiber speed-surface gaming desk mat with customizable 360-degree dual-zone RGB edges and non-slip rubber base.', img: 'https://images.unsplash.com/photo-1616440347437-b1c73416efc2?auto=format&fit=crop&w=800&q=80', deal: false },
        { id: 6, code: 'PROD-006', name: 'Quantum ANC Wireless Earbuds Pro', basePrice: 4499, originalPrice: 5999, stock: 50, catId: 1, catName: 'Electronics', desc: 'True wireless stereo earbuds with transparency mode, wireless charging case, low-latency gaming mode, and IPX7 water resistance.', img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80', deal: false },
        { id: 7, code: 'PROD-007', name: 'AeroFit Ergonomic Mesh Office Chair', basePrice: 7999, originalPrice: 10999, stock: 15, catId: 3, catName: 'Home & Kitchen', desc: 'Ergonomic lumbar-adaptive breathable mesh office chair with 4D armrests, pneumatic recline, and dynamic spine support.', img: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80', deal: false },
        { id: 8, code: 'PROD-008', name: 'Nordic Ceramic Pour-Over Kettle', basePrice: 2499, originalPrice: 3299, stock: 30, catId: 3, catName: 'Home & Kitchen', desc: 'Matte black temperature-stable gooseneck ceramic pour-over electric kettle with precision flow spout and digital control.', img: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80', deal: false },
        { id: 9, code: 'PROD-009', name: 'Solstice Polarized UV Sunglasses', basePrice: 2999, originalPrice: 4199, stock: 22, catId: 2, catName: 'Apparel', desc: 'Japanese acetate handcrafted polarized eyewear with anti-reflective mirror coating and 100% UV400 defense lenses.', img: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80', deal: false },
        { id: 10, code: 'PROD-010', name: 'Botanical Serum Complex 50ml', basePrice: 1999, originalPrice: 2799, stock: 45, catId: 2, catName: 'Apparel', desc: 'Cruelty-free revitalizing daily facial serum infused with organic jojoba, rosehip extracts, and hyaluronic moisture matrix.', img: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80', deal: false },
        { id: 11, code: 'PROD-011', name: 'Braided Type-C 240W Cable 2M', basePrice: 799, originalPrice: 1299, stock: 80, catId: 1, catName: 'Electronics', desc: 'Heavy-duty nylon braided Power Delivery 3.1 ultra-fast charging and data cable with aluminum alloy connectors.', img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80', deal: false },
        { id: 12, code: 'PROD-012', name: 'Apex Mechanical Gaming Keyboard', basePrice: 800, originalPrice: 1200, stock: 65, catId: 1, catName: 'Electronics', desc: 'Compact mechanical gaming keyboard with responsive blue switches, spill resistance, and RGB side glow.', img: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80', deal: false },
        { id: 13, code: 'PROD-013', name: 'Horizon Smart Audio Glasses', basePrice: 1499, originalPrice: 2199, stock: 28, catId: 1, catName: 'Electronics', desc: 'Open-ear acoustic smart glasses with microphone array, touch controls, and polarized UV protection.', img: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=800&q=80', deal: false },
        { id: 14, code: 'PROD-014', name: 'MacBook Pro M3 Max Workstation', basePrice: 50000, originalPrice: 65000, stock: 8, catId: 6, catName: 'Laptops', desc: 'Flagship Apple Silicon M3 Max workstation laptop with 16-inch Liquid Retina XDR display, 64GB unified memory, and 2TB SSD.', img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80', deal: false },
        { id: 15, code: 'PROD-015', name: 'Vintage Studio Recording Mic', basePrice: 1000, originalPrice: 1600, stock: 32, catId: 1, catName: 'Electronics', desc: 'Classic condenser vocal microphone with cardioid pickup pattern, XLR output, and vintage gold chassis.', img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80', deal: false }
      ];

      const defaultProducts = baseCatalog.map(item => {

        const ledger = this.generateTenPriceLedgerRecords(item.id, item.basePrice);
        const currentActivePrice = ledger[0].price;
        return {
          id: item.id,
          code: item.code,
          name: item.name,
          description: item.desc,
          categoryId: item.catId,
          categoryName: item.catName,
          sellerId: 1,
          sellerName: 'Apex Tech Store',
          currentPrice: currentActivePrice,
          originalPrice: item.originalPrice || Math.round(currentActivePrice * 1.4),
          stockQuantity: item.stock,
          stockStatus: item.stock > 10 ? 'AVAILABLE' : (item.stock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK'),
          isDealOfTheDay: Boolean(item.deal),
          rating: 0.0,
          reviewsCount: 0,
          fastDeliveryAvailable: true,
          images: [
            { id: 100 + item.id, url: item.img, imageUrl: item.img, isPrimary: true }
          ],
          priceLedger: ledger
        };
      });

      this.products = defaultProducts;
      localStorage.setItem('omnicart_products', JSON.stringify(defaultProducts));
    }
    this.addresses = JSON.parse(localStorage.getItem('omnicart_addresses') || '[]');

    this.addresses = this.addresses.filter(a => !(a.street && (a.street.includes('Cyber Residency') || a.street.includes('100 Feet Rd, Indiranagar'))));
    localStorage.setItem('omnicart_addresses', JSON.stringify(this.addresses));
    this.phones = JSON.parse(localStorage.getItem('omnicart_phones') || '[]');
    this.emails = JSON.parse(localStorage.getItem('omnicart_emails') || '[]');
    this.orders = JSON.parse(localStorage.getItem('omnicart_orders') || '[]');
  },

  getProductImage(product) {
    const fallback = 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg';
    if (!product) return fallback;

    if (Array.isArray(product.images) && product.images.length > 0) {
      const primary = product.images.find(img => img && (img.isPrimary || img.IsPrimary)) || product.images[0];
      if (primary) {
        const candidate = primary.imageUrl || primary.url || (typeof primary === 'string' ? primary : null);
        if (candidate && candidate !== 'undefined' && candidate.trim() !== '') {
          return candidate;
        }
      }
    }

    if (product.imageUrl && product.imageUrl !== 'undefined' && product.imageUrl.trim() !== '') {
      return product.imageUrl;
    }
    if (product.image && product.image !== 'undefined' && product.image.trim() !== '') {
      return product.image;
    }
    if (product.url && product.url !== 'undefined' && product.url.trim() !== '') {
      return product.url;
    }

    const localMap = {
      1: 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg',
      2: 'images/50d6f266-ce07-4138-a390-43c28152468d.jpg',
      3: 'images/8c68880a-c857-45ef-9d45-87e5db16ad0e.jpg',
      4: 'images/71e9bda9-7e49-4e07-9c7c-7577e256d95a.jpg',
      5: 'images/179d212e-0cf9-462d-acec-8185f874596a.jpg'
    };
    return localMap[product.id] || fallback;
  },

  getProductEmbedding(product) {
    if (!product) return null;
    if (product.embedding && Array.isArray(product.embedding) && product.embedding.length > 10) {
      return product.embedding;
    }
    if (window.PRODUCT_EMBEDDINGS) {
      const pid = String(product.id || '');
      const pcode = String(product.code || '');
      if (window.PRODUCT_EMBEDDINGS[pid]) return window.PRODUCT_EMBEDDINGS[pid];
      if (window.PRODUCT_EMBEDDINGS[pcode]) return window.PRODUCT_EMBEDDINGS[pcode];
      const match = pid.match(/\d+/) || pcode.match(/\d+/);
      if (match && window.PRODUCT_EMBEDDINGS[parseInt(match[0], 10)]) {
        return window.PRODUCT_EMBEDDINGS[parseInt(match[0], 10)];
      }
    }
    return null;
  },

  async syncBackendCatalog() {
    try {
      const catRes = await this.apiRequest('/categories');
      if (catRes && catRes.success && Array.isArray(catRes.data) && catRes.data.length > 0) {
        this.categories = catRes.data.map(c => ({
          id: c.id,
          name: c.categoryName || c.name || 'General',
          categoryName: c.categoryName || c.name || 'General',
          code: c.code || `CAT-${c.id}`,
          description: c.categoryDescription || c.description || ''
        }));
        localStorage.setItem('omnicart_categories', JSON.stringify(this.categories));
      }

      const prodRes = await this.apiRequest('/products?page=0&size=50');
      if (prodRes && prodRes.success && prodRes.data && Array.isArray(prodRes.data.content)) {
        if (prodRes.data.content.length === 0) {
          this.products = [];
          localStorage.setItem('omnicart_products', JSON.stringify([]));
        } else {

          const mappedProducts = prodRes.data.content.map(p => {
            const rawImages = (p.images && p.images.length > 0)
              ? p.images.map((img, idx) => {
                const src = (img.imageUrl || img.url || '').trim();
                return {
                  id: img.id || (100 + p.id * 10 + idx),
                  url: src || 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg',
                  imageUrl: src || 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg',
                  isPrimary: Boolean(img.isPrimary)
                };
              })
              : [
                { id: 100 + p.id, url: 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg', imageUrl: 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg', isPrimary: true }
              ];
            const pEmb = (window.PRODUCT_EMBEDDINGS && (window.PRODUCT_EMBEDDINGS[p.id] || window.PRODUCT_EMBEDDINGS[String(p.id)])) || null;
            return {
              id: p.id,
              code: p.code || `PROD-00${p.id}`,
              name: p.name,
              description: p.description,
              categoryId: p.categoryId,
              categoryName: p.categoryName || 'General',
              sellerId: p.sellerId || 1,
              sellerName: p.sellerName || 'Verified Merchant',
              currentPrice: Number(p.currentPrice) || 999,
              originalPrice: Math.round((Number(p.currentPrice) || 999) * 1.5),
              stockQuantity: p.stockQuantity ?? 15,
              stockStatus: p.stockStatus || (p.stockQuantity > 10 ? 'AVAILABLE' : (p.stockQuantity > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK')),
              isDealOfTheDay: p.id === 1,
              rating: p.rating != null ? Number(p.rating) : 0.0,
              reviewsCount: p.reviewsCount != null ? Number(p.reviewsCount) : 0,
              fastDeliveryAvailable: true,
              images: rawImages,
              embedding: pEmb
            };
          });
          this.products = mappedProducts;
          localStorage.setItem('omnicart_products', JSON.stringify(this.products));
        }
      }

      try {
        const sellersRes = await this.apiRequest('/sellers?page=0&size=50');
        if (sellersRes && sellersRes.success && sellersRes.data && Array.isArray(sellersRes.data.content)) {
          this.sellers = sellersRes.data.content;
          localStorage.setItem('omnicart_sellers', JSON.stringify(this.sellers));
        }
      } catch (_) { }

      if (window.CatalogModule) {
        const isVS = new URLSearchParams(window.location.search).get('visual_search') === 'true' ||
          new URLSearchParams(window.location.search).has('visual_search');
        if (isVS) {
          if (typeof window.CatalogModule.loadVisualSearchResults === 'function') {
            window.CatalogModule.loadVisualSearchResults();
          }
        } else {
          if (typeof window.CatalogModule.renderCategoryFilters === 'function') window.CatalogModule.renderCategoryFilters();
          if (typeof window.CatalogModule.renderSellerFilters === 'function') window.CatalogModule.renderSellerFilters();
          if (typeof window.CatalogModule.renderProductsGrid === 'function') window.CatalogModule.renderProductsGrid();
        }
      }
      if (window.SellerModule && typeof window.SellerModule.render === 'function') {
        window.SellerModule.render();
      }
      if (window.BuyerModule && typeof window.BuyerModule.init === 'function') {
        if (typeof window.BuyerModule.renderCategories === 'function') window.BuyerModule.renderCategories();
        if (typeof window.BuyerModule.renderRecommended === 'function') window.BuyerModule.renderRecommended();
        if (typeof window.BuyerModule.renderExpressDelivery === 'function') window.BuyerModule.renderExpressDelivery();
        if (typeof window.BuyerModule.renderDealOfTheDay === 'function') window.BuyerModule.renderDealOfTheDay();
      }
      if (window.ProductDetailModule && window.ProductDetailModule.product) {
        const fresh = (this.products || []).find(p => p.id === window.ProductDetailModule.product.id || p.code === window.ProductDetailModule.product.code);
        if (fresh) {
          window.ProductDetailModule.product = { ...window.ProductDetailModule.product, ...fresh };
          if (typeof window.ProductDetailModule.render === 'function') {
            window.ProductDetailModule.render();
          }
        }
      }
    } catch (e) {
      console.warn('[DataStore] Backend sync notice:', e.message);
    }
  },

  saveAuthSession(type, obj, token, rememberMe = false) {
    this.token = token || this.token;
    if (type === 'buyer') {
      this.currentUser = obj;
      this.currentUserRole = 'buyer';
      this.currentSeller = null;
      if (rememberMe) {
        localStorage.setItem('omnicart_user', JSON.stringify(obj));
        localStorage.setItem('omnicart_role', 'buyer');
        if (this.token) localStorage.setItem('omnicart_token', this.token);
        sessionStorage.removeItem('omnicart_user');
        sessionStorage.removeItem('omnicart_role');
        sessionStorage.removeItem('omnicart_token');
      } else {
        sessionStorage.setItem('omnicart_user', JSON.stringify(obj));
        sessionStorage.setItem('omnicart_role', 'buyer');
        if (this.token) sessionStorage.setItem('omnicart_token', this.token);
        localStorage.removeItem('omnicart_user');
        localStorage.removeItem('omnicart_role');
        localStorage.removeItem('omnicart_token');
      }
      localStorage.removeItem('omnicart_seller');
      sessionStorage.removeItem('omnicart_seller');
    } else if (type === 'seller') {
      this.currentSeller = obj;
      this.currentUserRole = 'seller';
      this.currentUser = null;
      if (rememberMe) {
        localStorage.setItem('omnicart_seller', JSON.stringify(obj));
        localStorage.setItem('omnicart_role', 'seller');
        if (this.token) localStorage.setItem('omnicart_token', this.token);
        sessionStorage.removeItem('omnicart_seller');
        sessionStorage.removeItem('omnicart_role');
        sessionStorage.removeItem('omnicart_token');
      } else {
        sessionStorage.setItem('omnicart_seller', JSON.stringify(obj));
        sessionStorage.setItem('omnicart_role', 'seller');
        if (this.token) sessionStorage.setItem('omnicart_token', this.token);
        localStorage.removeItem('omnicart_seller');
        localStorage.removeItem('omnicart_role');
        localStorage.removeItem('omnicart_token');
      }
      localStorage.removeItem('omnicart_user');
      sessionStorage.removeItem('omnicart_user');
    }
    this.applyMarketplaceDynamicPricingSync();
  },

  async loginCustomer(emailOrPhone, password, rememberMe = false) {
    const email = (emailOrPhone || '').trim();
    const cleanPw = (password || '').trim();

    if (!email || !cleanPw) {
      throw new Error('Email and password are required.');
    }

    const apiRes = await this.apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email, password: cleanPw })
    });

    if (apiRes) {
      if (!apiRes.success || !apiRes.data) {
        throw new Error(apiRes.message || `No account found for '${email}'. Please check your credentials or register.`);
      }

      this.token = apiRes.data.token;

      if (apiRes.data.role === 'SELLER') {
        let sellerInfo = null;
        try {
          const sRes = await this.apiRequest(`/sellers/${apiRes.data.userId}`);
          if (sRes && sRes.success && sRes.data) {
            sellerInfo = sRes.data;
          }
        } catch (_) { }

        const sellerObj = {
          id: apiRes.data.userId || 1,
          CompanyName: sellerInfo ? (sellerInfo.companyName || sellerInfo.CompanyName) : (email.includes('@') ? (email.split('@')[0].toUpperCase() + ' Store') : 'Merchant Store'),
          gstin: sellerInfo ? sellerInfo.gstin : '29ABCDE1234F1Z5',
          email: sellerInfo ? (sellerInfo.contactEmail || email) : email,
          phone: sellerInfo ? (sellerInfo.contactPhone || '+91 800 555 1010') : '+91 800 555 1010',
          city: (sellerInfo && sellerInfo.city) ? sellerInfo.city : 'Bengaluru, Karnataka'
        };

        this.saveAuthSession('seller', sellerObj, this.token, rememberMe);
        return { ...sellerObj, isSeller: true };
      }

      let custDetails = null;
      try {
        const cRes = await this.apiRequest(`/customers/${apiRes.data.userId}`);
        if (cRes && cRes.success && cRes.data) {
          custDetails = cRes.data;
        }
      } catch (_) { }

      const customerObj = {
        id: apiRes.data.userId || 1,
        FirstName: custDetails ? (custDetails.firstName || custDetails.FirstName) : (email.includes('@') ? email.split('@')[0] : 'Customer'),
        LastName: custDetails ? (custDetails.lastName || custDetails.LastName || '') : '',
        email: (custDetails && custDetails.emails && custDetails.emails[0]) ? custDetails.emails[0] : email,
        phone: (custDetails && custDetails.phones && custDetails.phones[0]) ? custDetails.phones[0] : ''
      };

      this.saveAuthSession('buyer', customerObj, this.token, rememberMe);
      return customerObj;
    }

    const registeredUsers = JSON.parse(localStorage.getItem('omnicart_registered_users') || '[]');
    const matchedUser = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase() || (u.phone && u.phone.includes(email)));

    if (!matchedUser) {
      throw new Error(`Account not found for '${email}'. Please create an account by clicking Register.`);
    }

    if (!matchedUser.password || matchedUser.password !== cleanPw) {
      throw new Error('Incorrect password. Please enter the valid account password.');
    }

    const customerObj = {
      id: matchedUser.id,
      FirstName: matchedUser.FirstName,
      LastName: matchedUser.LastName,
      email: matchedUser.email,
      phone: matchedUser.phone
    };

    this.saveAuthSession('buyer', customerObj, this.token, rememberMe);
    return customerObj;
  },

  async registerCustomer(data) {
    if (!data.email || !data.firstName || !data.password) {
      throw new Error('First name, email, and password are required.');
    }
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const apiRes = await this.apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        firstName: data.firstName.trim(),
        lastName: (data.lastName || '').trim(),
        email: data.email.trim(),
        phone: (data.phone || '').trim(),
        password: data.password,
        role: 'CUSTOMER'
      })
    });

    const customerObj = {
      id: (apiRes && apiRes.data && apiRes.data.userId) ? apiRes.data.userId : Date.now(),
      FirstName: data.firstName.trim(),
      LastName: (data.lastName || '').trim(),
      email: data.email.trim(),
      phone: (data.phone || '').trim(),
      password: data.password
    };

    const registeredUsers = JSON.parse(localStorage.getItem('omnicart_registered_users') || '[]');
    const existingIdx = registeredUsers.findIndex(u => u.email.toLowerCase() === customerObj.email.toLowerCase());
    if (existingIdx > -1) {
      registeredUsers[existingIdx] = customerObj;
    } else {
      registeredUsers.push(customerObj);
    }
    localStorage.setItem('omnicart_registered_users', JSON.stringify(registeredUsers));

    if (data.address && (data.address.street || data.address.houseNumber)) {
      const houseNo = (data.address.houseNumber || '').trim();
      const streetName = (data.address.street || '').trim();
      const addrTypeId = data.address.addressTypeId ? parseInt(data.address.addressTypeId, 10) : 1;
      const addrTypeName = data.address.addressType || (addrTypeId === 2 ? 'Work' : addrTypeId === 3 ? 'Other' : 'Home');
      const cityName = (data.address.city || '').trim();
      const stateName = (data.address.state || '').trim();
      const pinCodeVal = (data.address.pinCode || data.address.pincode || '').trim();

      const newAddr = {
        id: Date.now(),
        customerId: customerObj.id,
        addressTypeId: addrTypeId,
        addressType: addrTypeName,
        type: addrTypeName,
        houseNumber: houseNo,
        street: streetName,
        city: cityName,
        state: stateName,
        pincode: pinCodeVal,
        pinCode: pinCodeVal,
        isDefault: true
      };
      this.addresses.push(newAddr);
      localStorage.setItem('omnicart_addresses', JSON.stringify(this.addresses));

      if (apiRes && apiRes.data && apiRes.data.userId) {
        try {
          await this.apiRequest(`/customers/${customerObj.id}/addresses`, {
            method: 'POST',
            body: JSON.stringify({
              addressTypeId: addrTypeId,
              houseNumber: houseNo || 'N/A',
              street: streetName || 'Main Street',
              city: cityName,
              pinCode: pinCodeVal
            })
          });
        } catch (_) { }
      }
    }

    if (apiRes && apiRes.data && apiRes.data.token) {
      this.token = apiRes.data.token;
    }

    const sessionObj = {
      id: customerObj.id,
      FirstName: customerObj.FirstName,
      LastName: customerObj.LastName,
      email: customerObj.email,
      phone: customerObj.phone
    };

    this.saveAuthSession('buyer', sessionObj, this.token, false);
    return sessionObj;
  },

  async loginSeller(emailOrPhone, password, rememberMe = false) {
    const inputIdentifier = (emailOrPhone || '').trim();
    const cleanPw = (password || '').trim();

    if (!inputIdentifier || !cleanPw) {
      throw new Error('Merchant email or phone and password are required.');
    }

    let apiRes = null;
    try {
      apiRes = await this.apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: inputIdentifier, password: cleanPw })
      });
    } catch (_) { }

    if (apiRes) {
      if (!apiRes.success || !apiRes.data) {
        throw new Error(apiRes.message || `No merchant account found for '${inputIdentifier}'. Please verify your credentials or register.`);
      }

      this.token = apiRes.data.token;

      let sellerInfo = null;
      try {
        const sRes = await this.apiRequest(`/sellers/${apiRes.data.userId}`);
        if (sRes && sRes.success && sRes.data) {
          sellerInfo = sRes.data;
        }
      } catch (_) { }

      const sellerObj = {
        id: apiRes.data.userId || 1,
        CompanyName: sellerInfo ? (sellerInfo.companyName || sellerInfo.CompanyName) : (inputIdentifier.includes('@') ? (inputIdentifier.split('@')[0].toUpperCase() + ' Retail') : 'Merchant Store'),
        gstin: sellerInfo ? sellerInfo.gstin : '29ABCDE1234F1Z5',
        email: sellerInfo ? (sellerInfo.contactEmail || inputIdentifier) : inputIdentifier,
        phone: sellerInfo ? (sellerInfo.contactPhone || '+91 800 555 1010') : '+91 800 555 1010',
        city: (sellerInfo && sellerInfo.city) ? sellerInfo.city : 'Bengaluru',
        state: (sellerInfo && sellerInfo.state) ? sellerInfo.state : 'Karnataka'
      };

      this.saveAuthSession('seller', sellerObj, this.token, rememberMe);
      return sellerObj;
    }

    const cleanQuery = inputIdentifier.toLowerCase();
    const queryDigits = cleanQuery.replace(/\D/g, '');
    let matchedSeller = null;

    const sellerMatches = (s) => {
      if (!s) return false;
      const sEmail = (s.contactEmail || s.email || '').toLowerCase();
      const sName = (s.companyName || s.CompanyName || '').toLowerCase();
      const sPhone = (s.contactPhone || s.phone || '').trim();
      const sPhoneDigits = sPhone.replace(/\D/g, '');

      return sEmail === cleanQuery ||
        sName === cleanQuery ||
        sPhone === cleanQuery ||
        (queryDigits.length >= 7 && sPhoneDigits.endsWith(queryDigits));
    };

    if (this.sellers && Array.isArray(this.sellers)) {
      matchedSeller = this.sellers.find(sellerMatches);
    }

    if (!matchedSeller) {
      const registeredSellers = JSON.parse(localStorage.getItem('omnicart_registered_sellers') || '[]');
      matchedSeller = registeredSellers.find(sellerMatches);
    }

    if (!matchedSeller && /^\d+$/.test(cleanQuery)) {
      try {
        const sRes = await this.apiRequest(`/sellers/${cleanQuery}`);
        if (sRes && sRes.success && sRes.data) {
          matchedSeller = sRes.data;
        }
      } catch (_) { }
    }

    if (!matchedSeller) {
      throw new Error(`Merchant account '${inputIdentifier}' not found. Please verify your merchant email or phone.`);
    }

    if (!matchedSeller.password || matchedSeller.password !== cleanPw) {
      throw new Error('Incorrect merchant password. Please enter the valid password.');
    }

    const sellerObj = {
      id: matchedSeller.id || matchedSeller.sellerId,
      CompanyName: matchedSeller.companyName || matchedSeller.CompanyName || 'Merchant Store',
      gstin: matchedSeller.gstin || '29ABCDE1234F1Z5',
      email: matchedSeller.contactEmail || matchedSeller.email || (inputIdentifier.includes('@') ? inputIdentifier : 'seller@store.in'),
      phone: matchedSeller.contactPhone || matchedSeller.phone || (!inputIdentifier.includes('@') ? inputIdentifier : '+91 800 555 1010'),
      city: matchedSeller.city || 'Bengaluru',
      state: matchedSeller.state || 'Karnataka'
    };

    this.saveAuthSession('seller', sellerObj, this.token, rememberMe);
    return sellerObj;
  },

  async registerSeller(data) {
    if (!data.companyName || !data.email || !data.gstin || !data.password) {
      throw new Error('Company name, GSTIN, business email, and password are required.');
    }
    const cleanGstin = data.gstin.trim().toUpperCase();
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(cleanGstin)) {
      throw new Error('Invalid GSTIN format. Expected 15-character standard format (e.g. 29ABCDE1234F1Z5).');
    }
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const cleanCity = (data.city || 'Bengaluru').trim();
    const cleanState = (data.state || '').trim();
    const cleanEmail = (data.email || data.contactEmail).trim();
    const cleanPhone = (data.phone || data.contactPhone || '+91 800 555 1010').trim();

    const apiRes = await this.apiRequest('/sellers', {
      method: 'POST',
      body: JSON.stringify({
        companyName: data.companyName.trim(),
        gstin: cleanGstin,
        contactEmail: cleanEmail,
        contactPhone: cleanPhone,
        city: cleanCity,
        state: cleanState,
        password: data.password
      })
    });

    if (!apiRes || !apiRes.success || !apiRes.data) {
      const errMsg = (apiRes && apiRes.message) ? apiRes.message : 'Database seller registration failed. Please try again.';
      throw new Error(errMsg);
    }

    let token = null;
    try {
      const loginRes = await this.apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, password: data.password })
      });
      if (loginRes && loginRes.success && loginRes.data && loginRes.data.token) {
        token = loginRes.data.token;
      }
    } catch (_) { }

    const sessionObj = {
      id: apiRes.data.id,
      CompanyName: apiRes.data.companyName || data.companyName.trim(),
      gstin: apiRes.data.gstin || cleanGstin,
      email: apiRes.data.contactEmail || cleanEmail,
      phone: apiRes.data.contactPhone || cleanPhone,
      city: apiRes.data.city || cleanCity,
      state: apiRes.data.state || cleanState
    };

    this.saveAuthSession('seller', sessionObj, token || this.token, false);

    try {
      await this.syncBackendCatalog();
    } catch (_) { }

    return sessionObj;
  },

  logout() {
    this.token = null;
    this.currentUser = null;
    this.currentSeller = null;
    this.currentUserRole = null;

    localStorage.removeItem('omnicart_token');
    localStorage.removeItem('omnicart_user');
    localStorage.removeItem('omnicart_seller');
    localStorage.removeItem('omnicart_role');

    sessionStorage.removeItem('omnicart_token');
    sessionStorage.removeItem('omnicart_user');
    sessionStorage.removeItem('omnicart_seller');
    sessionStorage.removeItem('omnicart_role');

    this.applyMarketplaceDynamicPricingSync();
  },

  getCart() {
    return this.cart;
  },

  getCartCount() {
    return this.cart.reduce((total, item) => total + (item.quantity || 1), 0);
  },

  getCartSubtotal() {
    const raw = this.cart.reduce((total, item) => {
      let price = Number(item.price);

      if (!price || price <= 0) {
        const liveProd = (this.products || []).find(p => Number(p.id) === Number(item.id));
        price = liveProd ? (Number(liveProd.currentPrice) || Number(liveProd.price) || 999) : 999;

        item.price = price;
      }
      return total + (price * Number(item.quantity));
    }, 0);
    return Math.round(raw * 100) / 100;
  },

  addToCart(product, quantity = 1) {
    if (!product || !product.id) {
      throw new Error('Invalid product.');
    }

    if (!this.currentUser || this.currentUserRole !== 'buyer') {
      const currentFile = window.location.pathname.split('/').pop() || 'index.html';
      const redirectUrl = encodeURIComponent(currentFile + window.location.search);
      if (window.UIModule && typeof window.UIModule.showToast === 'function') {
        window.UIModule.showToast('Please sign in to add items to your cart. Redirecting...', 'warning', 3000);
      }
      setTimeout(() => {
        window.location.href = `login.html?role=buyer&redirect=${redirectUrl}&auth_required=true&reason=cart`;
      }, 400);
      throw new Error('Please sign in to your buyer account to add items to your cart.');
    }

    const prodId = Number(product.id);
    const qtyToAdd = Math.max(1, Math.floor(Number(quantity) || 1));

    const catalogProd = this.products.find(p => Number(p.id) === prodId) || product;
    const availableStock = typeof catalogProd.stockQuantity === 'number' ? catalogProd.stockQuantity : 10;

    if (availableStock <= 0) {
      throw new Error(`"${catalogProd.name}" is currently out of stock.`);
    }

    const existingIndex = this.cart.findIndex(item => Number(item.id) === prodId);
    const price = Number(catalogProd.currentPrice || product.currentPrice || product.price || 0);
    const primaryImg = this.getProductImage(catalogProd);

    if (existingIndex > -1) {
      const targetQty = this.cart[existingIndex].quantity + qtyToAdd;
      if (targetQty > availableStock) {
        this.cart[existingIndex].quantity = availableStock;
        this.saveCart();
        throw new Error(`Only ${availableStock} units available in warehouse. Cart quantity adjusted to maximum available stock.`);
      }
      this.cart[existingIndex].quantity = targetQty;
    } else {
      const finalQty = Math.min(qtyToAdd, availableStock);
      this.cart.push({
        id: prodId,
        name: catalogProd.name,
        code: catalogProd.code || `PROD-${prodId}`,
        price: price,
        originalPrice: catalogProd.originalPrice || Math.round(price * 1.5),
        image: primaryImg,
        categoryName: catalogProd.categoryName || 'Product',
        quantity: finalQty
      });
    }

    this.saveCart();
    return this.cart;
  },

  updateCartQty(productId, quantity) {
    const prodId = Number(productId);
    const index = this.cart.findIndex(item => Number(item.id) === prodId);

    if (index > -1) {
      const requestedQty = Math.floor(Number(quantity));
      if (requestedQty <= 0) {
        this.cart.splice(index, 1);
      } else {
        const catalogProd = this.products.find(p => Number(p.id) === prodId);
        const maxStock = catalogProd ? (catalogProd.stockQuantity ?? 50) : 50;
        this.cart[index].quantity = Math.min(requestedQty, maxStock);
      }
      this.saveCart();
    }
    return this.cart;
  },

  removeFromCart(productId) {
    const prodId = Number(productId);
    this.cart = this.cart.filter(item => Number(item.id) !== prodId);
    this.saveCart();
    return this.cart;
  },

  clearCart() {
    this.cart = [];
    this.saveCart();
  },

  saveCart() {
    localStorage.setItem('omnicart_cart', JSON.stringify(this.cart));
    if (window.UIModule) {
      window.UIModule.renderHeader();
    }
  },

  getSavedProducts() {
    return this.savedProducts;
  },

  isSaved(productId) {
    const prodId = Number(productId);
    return this.savedProducts.some(id => Number(id) === prodId);
  },

  toggleSavedProduct(productId) {
    const prodId = Number(productId);
    const index = this.savedProducts.findIndex(id => Number(id) === prodId);
    let added = false;

    if (index > -1) {
      this.savedProducts.splice(index, 1);
      added = false;
    } else {
      this.savedProducts.push(prodId);
      added = true;
    }

    localStorage.setItem('omnicart_saved', JSON.stringify(this.savedProducts));
    if (window.UIModule) {
      window.UIModule.renderHeader();
    }
    return added;
  },

  async placeOrder({ customerId, recipientName, clientName, phone, paymentMethod, paymentMethodId = 3, address, deliveryAddress, isExpress = true, discount = 0 }) {
    if (!this.cart || this.cart.length === 0) {
      throw new Error('Your shopping cart is empty.');
    }

    if (!this.currentUser || this.currentUserRole !== 'buyer') {
      throw new Error('Please sign in to your customer account to place an order.');
    }

    for (const item of this.cart) {
      const prod = this.products.find(p => Number(p.id) === Number(item.id));
      if (prod && typeof prod.stockQuantity === 'number') {
        if (prod.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for "${item.name}". Only ${prod.stockQuantity} available.`);
        }
      }
    }

    const subtotal = this.getCartSubtotal();
    const finalTotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

    const buyerId = Number(this.currentUser.id);

    const resolvedRecipient = (recipientName || clientName || (this.currentUser ? `${this.currentUser.FirstName || ''} ${this.currentUser.LastName || ''}`.trim() : '') || 'Customer').trim();
    const resolvedAddress = (deliveryAddress || address || (this.addresses && this.addresses[0] ? `${this.addresses[0].street}, ${this.addresses[0].city} - ${this.addresses[0].pincode}` : 'Flat 402, Cyber Heights, 100 Feet Rd, Bengaluru - 560038')).trim();

    const orderPayload = {
      customerId: buyerId,
      paymentMethodId: Number(paymentMethodId) || 3,
      recipientName: resolvedRecipient,
      deliveryAddress: resolvedAddress,
      items: this.cart.map(item => ({
        productId: Number(item.id),
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1)
      }))
    };

    const apiRes = await this.apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    });

    if (apiRes && apiRes.success === false) {
      throw new Error(apiRes.message || 'Backend rejected the order. Please try again.');
    }

    const isCodMethod = (paymentMethod || '').toLowerCase().includes('cash') ||
      (paymentMethod || '').toLowerCase().includes('delivery') ||
      (paymentMethod || '').toLowerCase().includes('pod');

    let newOrder;
    if (apiRes && apiRes.data && apiRes.data.id) {
      const normalized = (window.OrdersModule && typeof window.OrdersModule.normalizeBackendOrder === 'function')
        ? window.OrdersModule.normalizeBackendOrder(apiRes.data)
        : null;

      newOrder = {
        ...(normalized || {}),
        id: apiRes.data.id,
        orderNumber: `ORD-${apiRes.data.id}`,
        customerId: buyerId,
        customerName: resolvedRecipient,
        recipientName: resolvedRecipient,
        clientName: resolvedRecipient,
        orderDate: apiRes.data.orderDate ? String(apiRes.data.orderDate).replace('T', ' ').substring(0, 19) : new Date().toISOString().replace('T', ' ').substring(0, 19),
        shippingStatus: 'ORDER_PLACED',
        paymentMethod: paymentMethod || (isCodMethod ? 'Cash on Delivery (POD)' : (apiRes.data.payment ? apiRes.data.payment.paymentMethod : 'UPI Instant Transfer')),
        paymentStatus: isCodMethod ? 'DUE_ON_DELIVERY' : 'PAID',
        deliveryAddress: resolvedAddress,
        isExpress20Min: isExpress,
        items: (apiRes && apiRes.data && Array.isArray(apiRes.data.items) && apiRes.data.items.length > 0)
          ? apiRes.data.items.map(item => {
            const liveProd = (this.products || []).find(p => Number(p.id) === Number(item.productId));
            const unitPrice = Number(item.exactLedgerPrice) || (liveProd ? liveProd.currentPrice : 0);
            const qty = item.quantity || 1;
            return {
              id: item.productId,
              productId: item.productId,
              name: item.productName || (liveProd ? liveProd.name : `Product #${item.productId}`),
              code: liveProd ? (liveProd.code || `PROD-00${item.productId}`) : `PROD-00${item.productId}`,
              price: unitPrice,
              quantity: qty,
              lineTotal: Number(item.lineTotal) || (unitPrice * qty),
              image: item.imageUrl || (liveProd ? this.getProductImage(liveProd) : 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg'),
              imageUrl: item.imageUrl || (liveProd ? this.getProductImage(liveProd) : 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg'),
              sellerId: liveProd ? liveProd.sellerId : 1
            };
          })
          : this.cart.map(cartItem => {
            const liveProd = (this.products || []).find(p => Number(p.id) === Number(cartItem.id));
            const resolvedPrice = Number(cartItem.price) ||
              (liveProd ? (Number(liveProd.currentPrice) || Number(liveProd.price) || 999) : 999);
            const qty = Number(cartItem.quantity) || 1;
            return {
              id: cartItem.id,
              productId: cartItem.id,
              name: cartItem.name || (liveProd ? liveProd.name : `Product #${cartItem.id}`),
              code: cartItem.code || (liveProd ? liveProd.code : `PROD-00${cartItem.id}`),
              price: resolvedPrice,
              quantity: qty,
              lineTotal: resolvedPrice * qty,
              image: cartItem.image || (liveProd ? this.getProductImage(liveProd) : 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg'),
              imageUrl: cartItem.image || (liveProd ? this.getProductImage(liveProd) : 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg'),
              sellerId: liveProd ? liveProd.sellerId : 1
            };
          }),
        subtotal: subtotal,
        discount: discount,
        deliveryFee: 0,
        totalAmount: Number(apiRes.data.totalAmount) || finalTotal,
        dueOnDelivery: isCodMethod ? (Number(apiRes.data.totalAmount) || finalTotal) : 0,
        paidAmount: isCodMethod ? 0 : (Number(apiRes.data.totalAmount) || finalTotal)
      };
    } else {
      const orderId = 1000 + this.orders.length + 1;
      newOrder = {
        id: orderId,
        orderNumber: `ORD-${orderId}`,
        customerId: buyerId,
        customerName: resolvedRecipient,
        recipientName: resolvedRecipient,
        clientName: resolvedRecipient,
        orderDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
        shippingStatus: 'ORDER_PLACED',
        paymentMethod: paymentMethod || (isCodMethod ? 'Cash on Delivery (POD)' : 'UPI Instant Transfer'),
        paymentStatus: isCodMethod ? 'DUE_ON_DELIVERY' : 'PAID',
        deliveryAddress: resolvedAddress,
        isExpress20Min: isExpress,
        items: this.cart.map(cartItem => {
          const liveProd = (this.products || []).find(p => Number(p.id) === Number(cartItem.id));
          const resolvedPrice = Number(cartItem.price) ||
            (liveProd ? (Number(liveProd.currentPrice) || Number(liveProd.price) || 999) : 999);
          const qty = Number(cartItem.quantity) || 1;
          return {
            id: cartItem.id,
            productId: cartItem.id,
            name: cartItem.name || (liveProd ? liveProd.name : `Product #${cartItem.id}`),
            code: cartItem.code || (liveProd ? liveProd.code : `PROD-00${cartItem.id}`),
            price: resolvedPrice,
            quantity: qty,
            lineTotal: resolvedPrice * qty,
            image: cartItem.image || (liveProd ? this.getProductImage(liveProd) : 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg'),
            imageUrl: cartItem.image || (liveProd ? this.getProductImage(liveProd) : 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg'),
            sellerId: liveProd ? liveProd.sellerId : 1
          };
        }),
        subtotal: subtotal,
        discount: discount,
        deliveryFee: 0,
        totalAmount: finalTotal,
        dueOnDelivery: isCodMethod ? finalTotal : 0,
        paidAmount: isCodMethod ? 0 : finalTotal
      };
    }

    this.orders = this.orders.filter(o => Number(o.id) !== Number(newOrder.id));
    this.orders.unshift(newOrder);
    localStorage.setItem('omnicart_orders', JSON.stringify(this.orders));

    this.cart.forEach(item => {
      const prod = this.products.find(p => Number(p.id) === Number(item.id));
      if (prod && typeof prod.stockQuantity === 'number') {
        prod.stockQuantity = Math.max(0, prod.stockQuantity - item.quantity);
        if (prod.stockQuantity === 0) prod.stockStatus = 'OUT_OF_STOCK';
        else if (prod.stockQuantity <= 10) prod.stockStatus = 'LOW_STOCK';
      }
    });
    localStorage.setItem('omnicart_products', JSON.stringify(this.products));

    this.clearCart();
    return newOrder;
  },

  async cancelOrder(orderId) {
    const id = Number(orderId);
    await this.apiRequest(`/orders/${id}/cancel`, { method: 'POST' });

    const order = this.orders.find(o => Number(o.id) === id);
    if (order) {
      order.shippingStatus = 'CANCELLED';
      order.totalAmount = 0;

      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (!item.status || item.status.toUpperCase() !== 'CANCELLED') {
            item.status = 'CANCELLED';
            const prod = this.products.find(p => Number(p.id) === Number(item.id || item.productId));
            if (prod && typeof prod.stockQuantity === 'number') {
              prod.stockQuantity += Number(item.quantity) || 1;
              prod.stockStatus = prod.stockQuantity > 10 ? 'AVAILABLE' : (prod.stockQuantity > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK');
            }
          }
        });
        localStorage.setItem('omnicart_products', JSON.stringify(this.products));
      }
      localStorage.setItem('omnicart_orders', JSON.stringify(this.orders));
    }
    return order;
  },

  async cancelOrderItem(orderId, productId) {
    const oId = Number(orderId);
    const pId = Number(productId);

    let response = null;
    try {
      response = await this.apiRequest(`/orders/${oId}/items/${pId}/cancel`, { method: 'POST' });
    } catch (apiErr) {
      console.warn('[DataStore] Backend cancelOrderItem failed:', apiErr);
      throw apiErr;
    }

    const order = this.orders.find(o => Number(o.id) === oId);
    if (order) {
      const targetItem = (order.items || []).find(item => Number(item.id || item.productId) === pId);
      if (targetItem) {
        const removedQty = Number(targetItem.quantity) || 1;

        targetItem.status = 'CANCELLED';

        const activeTotal = (order.items || [])
          .filter(it => !it.status || it.status.toUpperCase() !== 'CANCELLED')
          .reduce((sum, it) => sum + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);
        order.totalAmount = Math.round(activeTotal * 100) / 100;

        const allCancelled = (order.items || []).every(it => it.status && it.status.toUpperCase() === 'CANCELLED');
        if (allCancelled) {
          order.shippingStatus = 'CANCELLED';
        }

        const prod = this.products.find(p => Number(p.id) === pId);
        if (prod && typeof prod.stockQuantity === 'number') {
          prod.stockQuantity += removedQty;
          prod.stockStatus = prod.stockQuantity > 10 ? 'AVAILABLE' : (prod.stockQuantity > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK');
          localStorage.setItem('omnicart_products', JSON.stringify(this.products));
        }
      }
      localStorage.setItem('omnicart_orders', JSON.stringify(this.orders));
    }
    return order;
  },

  async updateOrderStatus(orderId, newStatus, sellerId) {
    const id = Number(orderId);
    const order = this.orders.find(o => Number(o.id) === id);
    if (order) {
      const currentStatus = String(order.shippingStatus || '').toUpperCase();
      if (currentStatus === 'CANCELLED' || currentStatus === 'CANCELLED_BY_CUSTOMER') {
        throw new Error('Cannot modify status of a cancelled order.');
      }
      if (currentStatus === 'DELIVERED' && (sellerId === undefined || sellerId === null)) {
        throw new Error('Cannot modify status of a delivered order.');
      }
    }

    const statusMap = {
      'ORDER_PLACED': 1, 'Pending': 1,
      'PROCESSING': 2, 'Processing': 2,
      'SHIPPED': 3, 'Shipped': 3,
      'OUT_FOR_DELIVERY': 4, 'In Transit': 4,
      'DELIVERED': 5, 'Delivered': 5,
      'CANCELLED': 6, 'Cancelled': 6,
      'RETURNED': 7, 'Returned': 7
    };
    const statusId = statusMap[newStatus] || 2;
    const payload = {
      statusId: statusId,
      status: newStatus
    };
    if (sellerId !== undefined && sellerId !== null) {
      payload.sellerId = Number(sellerId);
    }

    const apiRes = await this.apiRequest(`/orders/${id}/shipping-status`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (apiRes && apiRes.success === false) {
      throw new Error(apiRes.message || 'Failed to update order shipping status in database.');
    }

    if (order) {
      if (sellerId !== undefined && sellerId !== null && Array.isArray(order.items)) {
        const sId = Number(sellerId);
        order.items.forEach(it => {
          const itSellerId = (it.sellerId !== undefined && it.sellerId !== null)
            ? Number(it.sellerId)
            : (() => {
                const p = (this.products || []).find(prod => Number(prod.id) === Number(it.productId || it.id));
                return p ? Number(p.sellerId) : null;
              })();
          if (itSellerId === sId && String(it.status || '').toUpperCase() !== 'CANCELLED') {
            it.status = newStatus;
          }
        });

        const nonCancelled = order.items.filter(it => String(it.status || '').toUpperCase() !== 'CANCELLED');
        const allDelivered = nonCancelled.length > 0 && nonCancelled.every(it => String(it.status || '').toUpperCase() === 'DELIVERED');
        const anyDeliveredOrTransit = nonCancelled.some(it => {
          const s = String(it.status || '').toUpperCase();
          return s === 'DELIVERED' || s === 'OUT_FOR_DELIVERY' || s === 'IN TRANSIT';
        });
        const anyShipped = nonCancelled.some(it => String(it.status || '').toUpperCase() === 'SHIPPED');

        if (allDelivered) {
          order.shippingStatus = 'DELIVERED';
        } else if (anyDeliveredOrTransit) {
          order.shippingStatus = 'OUT_FOR_DELIVERY';
        } else if (anyShipped) {
          order.shippingStatus = 'SHIPPED';
        } else {
          order.shippingStatus = 'PROCESSING';
        }
      } else {
        order.shippingStatus = newStatus;
        if (Array.isArray(order.items)) {
          order.items.forEach(it => {
            if (String(it.status || '').toUpperCase() !== 'CANCELLED') {
              it.status = newStatus;
            }
          });
        }
      }
      localStorage.setItem('omnicart_orders', JSON.stringify(this.orders));
    }

    if (Array.isArray(this.sellerOrders)) {
      const so = this.sellerOrders.find(o => Number(o.id) === id);
      if (so) {
        if (sellerId !== undefined && sellerId !== null && Array.isArray(so.items)) {
          const sId = Number(sellerId);
          so.items.forEach(it => {
            const itSellerId = (it.sellerId !== undefined && it.sellerId !== null)
              ? Number(it.sellerId)
              : (() => {
                  const p = (this.products || []).find(prod => Number(prod.id) === Number(it.productId || it.id));
                  return p ? Number(p.sellerId) : null;
                })();
            if (itSellerId === sId && String(it.status || '').toUpperCase() !== 'CANCELLED') {
              it.status = newStatus;
            }
          });
          const myNonCancelled = so.items.filter(it => String(it.status || '').toUpperCase() !== 'CANCELLED');
          if (myNonCancelled.length > 0 && myNonCancelled.every(it => String(it.status || '').toUpperCase() === 'DELIVERED')) {
            so.shippingStatus = 'DELIVERED';
          } else {
            so.shippingStatus = newStatus;
          }
        } else {
          so.shippingStatus = newStatus;
        }
      }
    }

    return order;
  },

  async updateStock(productId, newQuantity) {
    const id = Number(productId);
    const qty = parseInt(newQuantity, 10);

    if (isNaN(qty) || qty < 0) {
      throw new Error('Stock quantity must be a non-negative integer.');
    }

    await this.apiRequest(`/products/${id}/stock`, {
      method: 'PUT',
      body: JSON.stringify({ quantity: qty })
    });

    const prod = this.products.find(p => Number(p.id) === id);
    if (prod) {
      prod.stockQuantity = qty;
      prod.stockStatus = qty > 10 ? 'AVAILABLE' : (qty > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK');
      localStorage.setItem('omnicart_products', JSON.stringify(this.products));
    }
    return prod;
  },

  async updatePrice(productId, newPrice, reason = 'Price adjustment') {
    const id = Number(productId);
    const price = Math.round(parseFloat(newPrice) * 100) / 100;

    if (isNaN(price) || price <= 0) {
      throw new Error('Price must be greater than zero.');
    }

    const cleanReason = (reason || 'Price adjustment').trim();

    const apiRes = await this.apiRequest(`/products/${id}/prices`, {
      method: 'POST',
      body: JSON.stringify({ price: price, sourceId: 1, changeReason: cleanReason })
    });

    const prod = this.products.find(p => Number(p.id) === id);
    if (prod) {
      prod.originalPrice = prod.currentPrice;
      prod.currentPrice = price;
      if (!prod.priceLedger) prod.priceLedger = [];
      const newEntry = (apiRes && apiRes.data) ? {
        id: apiRes.data.id || Date.now(),
        productId: id,
        sourceName: apiRes.data.sourceName || 'Seller Update',
        price: Number(apiRes.data.price || price),
        priceFluctuation: Number(apiRes.data.priceFluctuation || 0),
        recordedAt: apiRes.data.recordedAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
        changeReason: cleanReason
      } : {
        id: Date.now(),
        productId: id,
        sourceName: 'Seller Update',
        price: price,
        priceFluctuation: prod.originalPrice ? (price - prod.originalPrice) : 0,
        recordedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        changeReason: cleanReason
      };
      prod.priceLedger.unshift(newEntry);
      localStorage.setItem('omnicart_products', JSON.stringify(this.products));
    }
    return prod;
  },

  async addProduct(productData) {
    if (!this.currentSeller || this.currentUserRole !== 'seller') {
      throw new Error('Unauthorized: You must be signed in as a merchant to publish products.');
    }

    const name = (productData.name || '').trim();
    if (!name) {
      throw new Error('Product name is required.');
    }

    const initialPrice = Math.round(parseFloat(productData.initialPrice || productData.currentPrice || 0) * 100) / 100;
    if (isNaN(initialPrice) || initialPrice <= 0) {
      throw new Error('Product price must be greater than zero.');
    }

    const stockQuantity = parseInt(productData.stockQuantity, 10);
    if (isNaN(stockQuantity) || stockQuantity < 0) {
      throw new Error('Stock quantity must be a non-negative integer.');
    }

    const sellerId = Number(this.currentSeller.id);
    const categoryId = Number(productData.categoryId) || 1;

    const existingIdx = this.products.findIndex(p => p.name.trim().toLowerCase() === name.toLowerCase() && Number(p.sellerId) === sellerId);

    const apiRes = await this.apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: name,
        description: productData.description || 'Verified product',
        stockQuantity: stockQuantity,
        sellerId: sellerId,
        categoryId: categoryId,
        initialPrice: initialPrice
      })
    });

    if (existingIdx > -1) {

      const existing = this.products[existingIdx];
      const oldStock = Number(existing.stockQuantity) || 0;
      const newTotal = oldStock + stockQuantity;
      existing.stockQuantity = newTotal;
      existing.stockStatus = newTotal > 10 ? 'AVAILABLE' : (newTotal > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK');

      if (!Array.isArray(existing.sellerIds)) {
        existing.sellerIds = [Number(existing.sellerId)];
      }
      if (!existing.sellerIds.includes(sellerId)) {
        existing.sellerIds.push(sellerId);
      }
      if (!existing.sellerStock) {
        existing.sellerStock = {};
        existing.sellerStock[Number(existing.sellerId)] = oldStock;
      }
      existing.sellerStock[sellerId] = (existing.sellerStock[sellerId] || 0) + stockQuantity;

      if (initialPrice && initialPrice > 0) {
        existing.currentPrice = initialPrice;
        if (!existing.priceLedger) existing.priceLedger = [];
        existing.priceLedger.unshift({
          id: Date.now(),
          price: initialPrice,
          changedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          changeReason: `Replenished +${stockQuantity} units by ${this.currentSeller.CompanyName || 'Merchant #' + sellerId}`
        });
      }

      localStorage.setItem('omnicart_products', JSON.stringify(this.products));
      return { ...existing, isReplenished: true, oldStock, newTotal, addedStock: stockQuantity };
    }

    const prodId = (apiRes && apiRes.data && apiRes.data.id) ? apiRes.data.id : (this.products.length + 1);

    if (productData.imageUrl && apiRes && apiRes.data) {
      try {
        await this.apiRequest(`/products/${prodId}/images`, {
          method: 'POST',
          body: JSON.stringify({
            imageUrl: productData.imageUrl,
            displayOrder: 1,
            isPrimary: true
          })
        });
      } catch (err) {
        console.warn('[DataStore] Image save notice:', err.message);
      }
    }

    // Automatically extract and index deep CLIP embedding for visual search and MySQL ProductEmbeddings
    if (productData.imageUrl) {
      try {
        fetch('http://127.0.0.1:5000/api/embeddings/index', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: String(prodId),
            name: productData.name,
            category: productData.categoryName || 'General',
            price: initialPrice,
            image: productData.imageUrl,
            desc: productData.description || ''
          })
        }).then(r => r.json()).then(res => {
          if (res && res.vector_sample && window.PRODUCT_EMBEDDINGS) {
            window.PRODUCT_EMBEDDINGS[String(prodId)] = res.vector_sample;
          }
        }).catch(err => console.warn('[DataStore] Visual search indexing notice:', err));
      } catch (_) {}
    }

    const newProd = {
      id: prodId,
      code: `PROD-00${prodId}`,
      name: productData.name,
      description: productData.description || 'Verified authentic product',
      categoryId: categoryId,
      categoryName: productData.categoryName || 'General',
      sellerId: sellerId,
      sellerIds: [sellerId],
      sellerStock: { [sellerId]: stockQuantity },
      sellerName: this.currentSeller ? this.currentSeller.CompanyName : 'Verified Merchant',
      currentPrice: initialPrice,
      originalPrice: Math.round(initialPrice * 1.4),
      stockQuantity: stockQuantity,
      stockStatus: stockQuantity > 10 ? 'AVAILABLE' : (stockQuantity > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK'),
      isDealOfTheDay: false,
      rating: 0.0,
      reviewsCount: 0,
      fastDeliveryAvailable: true,
      images: [
        { id: Date.now(), url: productData.imageUrl || 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg', imageUrl: productData.imageUrl || 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg', isPrimary: true }
      ],
      priceLedger: [
        {
          id: Date.now(),
          price: initialPrice,
          changedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          changeReason: 'Initial Catalog Listing'
        }
      ],
      embedding: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
    };

    this.products.unshift(newProd);
    localStorage.setItem('omnicart_products', JSON.stringify(this.products));
    return newProd;
  },

  async deleteProduct(productId) {
    if (!this.currentSeller || this.currentUserRole !== 'seller') {
      throw new Error('Unauthorized: You must be signed in as a merchant to remove products.');
    }

    const sellerId = Number(this.currentSeller.id);
    const prodId = Number(productId);
    const prodIndex = this.products.findIndex(p => Number(p.id) === prodId);

    if (prodIndex === -1) {
      throw new Error('Product not found in catalog.');
    }

    const product = this.products[prodIndex];
    const isOwner = Number(product.sellerId) === sellerId || (Array.isArray(product.sellerIds) && product.sellerIds.map(Number).includes(sellerId));
    if (!isOwner) {
      throw new Error('Unauthorized: You do not have permission to remove this product.');
    }

    const apiRes = await this.apiRequest(`/products/${prodId}`, {
      method: 'DELETE'
    });

    if (apiRes && apiRes.success === false) {
      throw new Error(apiRes.message || 'Failed to delete product from database.');
    }

    this.products.splice(prodIndex, 1);
    localStorage.setItem('omnicart_products', JSON.stringify(this.products));

    if (Array.isArray(this.cart) && this.cart.length > 0) {
      this.cart = this.cart.filter(item => Number(item.productId) !== prodId && Number(item.id) !== prodId);
      this.saveCart();
    }

    try {
      fetch(`http://127.0.0.1:5000/api/embeddings/${prodId}`, { method: 'DELETE' }).catch(() => { });
    } catch (_) { }

    return { success: true, id: prodId, name: product.name };
  },

  getProductById(productId) {
    if (!productId) return null;
    const idNum = Number(productId);
    return (this.products || []).find(p => Number(p.id) === idNum || p.code === String(productId)) || null;
  },

  async calculateDynamicPrice(productId, intervalHours = 24, customerId = null) {
    const prod = this.getProductById(productId);
    if (!prod) return null;

    const effectiveCustId = customerId || (this.currentUser && this.currentUserRole === 'buyer' ? this.currentUser.id : null);

    try {
      const q = effectiveCustId ? `?intervalHours=${intervalHours}&customerId=${effectiveCustId}` : `?intervalHours=${intervalHours}`;
      const backendRes = await this.apiRequest(`/dynamic-pricing/preview/${prod.id}${q}`);
      if (backendRes && backendRes.success && backendRes.data) {
        return backendRes.data;
      }
    } catch (_) { }

    const sinceTime = Date.now() - (intervalHours * 3600 * 1000);
    const recentOrders = (this.orders || []).filter(o => {
      const oTime = new Date(o.orderDate || o.createdAt || 0).getTime();
      return oTime >= sinceTime && o.items && o.items.some(item => Number(item.productId || item.id) === prod.id);
    });
    const demandOrders = recentOrders.length || (Math.floor((prod.id * 3) % 7) + 2);
    const demandUnits = recentOrders.reduce((sum, o) => {
      const item = o.items.find(it => Number(it.productId || it.id) === prod.id);
      return sum + (item ? Number(item.quantity || 1) : 0);
    }, 0) || (demandOrders * 2);

    const benchmarkDemand = 5;
    const demandDelta = (demandOrders - benchmarkDemand) / benchmarkDemand;
    const demandAdj = Math.max(-0.06, Math.min(0.09, demandDelta * 0.05));
    let demandSignalName;
    if (demandOrders >= 8) {
      demandSignalName = `Surging Real-Time Demand (${demandOrders} orders in ${intervalHours}h)`;
    } else if (demandOrders <= 1) {
      demandSignalName = `Off-Peak Demand Volume (${demandOrders} orders in ${intervalHours}h)`;
    } else {
      demandSignalName = `Steady Retail Velocity (${demandOrders} orders in ${intervalHours}h)`;
    }

    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    let timeAdj = 0.0;
    let timeSignalDesc = 'Standard Shopping Hours';
    if (hour >= 18 && hour <= 22) {
      timeAdj = 0.035;
      timeSignalDesc = 'Peak Evening Window (18:00 - 22:00)';
    } else if (hour >= 12 && hour <= 14) {
      timeAdj = 0.015;
      timeSignalDesc = 'Midday Shopping Window (12:00 - 14:00)';
    } else if (hour >= 1 && hour <= 6) {
      timeAdj = -0.025;
      timeSignalDesc = 'Late Night Off-Peak (01:00 - 06:00)';
    }

    let weekendAdj = 0.0;
    if (day === 0 || day === 6) {
      weekendAdj = 0.025;
      timeSignalDesc += ' • Weekend Traffic Surge';
    }
    const temporalAdj = timeAdj + weekendAdj;

    const matchingProducts = this.products.filter(p => p.name.trim().toLowerCase() === prod.name.trim().toLowerCase());
    const totalStock = matchingProducts.reduce((sum, p) => sum + (Number(p.stockQuantity) || 0), 0) || (prod.stockQuantity || 20);

    let inventoryAdj = 0.0;
    let inventorySignalName;
    if (totalStock <= 5) {
      inventoryAdj = 0.08;
      inventorySignalName = `Critical Low Stock (${totalStock} units left)`;
    } else if (totalStock <= 12) {
      inventoryAdj = 0.04;
      inventorySignalName = `Low Stock Pressure (${totalStock} units left)`;
    } else if (totalStock >= 40) {
      inventoryAdj = -0.06;
      inventorySignalName = `Surplus Inventory Clearance (${totalStock} units)`;
    } else if (totalStock >= 25) {
      inventoryAdj = -0.02;
      inventorySignalName = `Ample Stock Buffer (${totalStock} units)`;
    } else {
      inventorySignalName = `Balanced Marketplace Inventory (${totalStock} units)`;
    }

    let customerAdj = 0.0;
    let customerSegmentName = 'Marketplace Guest / Standard';

    if (effectiveCustId) {
      const userOrders = (this.orders || []).filter(o => Number(o.customerId) === Number(effectiveCustId));
      const orderCount = userOrders.length;
      const isVIP = orderCount >= 3 || (this.currentUser && this.currentUser.isVip);

      if (isVIP) {
        customerAdj = -0.05;
        customerSegmentName = `VIP Loyalty Privilege (${orderCount} past orders)`;
      } else if (orderCount === 0) {
        customerAdj = -0.04;
        customerSegmentName = 'First-Time Buyer Welcome Incentive';
      } else {
        customerSegmentName = `Valued Returning Customer (${orderCount} past orders)`;
      }
    }

    const basePrice = (prod.priceLedger && prod.priceLedger.length > 0)
      ? Number(prod.priceLedger[prod.priceLedger.length - 1].price)
      : (prod.basePrice || (prod.originalPrice ? Math.round(prod.originalPrice / 1.4) : prod.currentPrice));

    let combinedMultiplier = 1.0 + demandAdj + temporalAdj + inventoryAdj + customerAdj;
    combinedMultiplier = Math.max(0.70, Math.min(1.40, combinedMultiplier));

    const calculatedPrice = Math.round(basePrice * combinedMultiplier);
    const fluctuation = calculatedPrice - prod.currentPrice;
    const percentAdj = prod.currentPrice > 0
      ? Math.round(((calculatedPrice - prod.currentPrice) / prod.currentPrice) * 10000) / 100
      : 0.0;

    const rationale = `Dynamic Pricing Model: Demand [${(demandAdj * 100).toFixed(1)}%, ${demandSignalName}] • Temporal [${(temporalAdj * 100).toFixed(1)}%, ${timeSignalDesc}] • Inventory [${(inventoryAdj * 100).toFixed(1)}%, ${inventorySignalName}] • Segment [${(customerAdj * 100).toFixed(1)}%, ${customerSegmentName}] => Net Multiplier: ${combinedMultiplier.toFixed(3)}x`;

    return {
      productId: prod.id,
      productName: prod.name,
      totalStockAllSellers: totalStock,
      demandOrdersInInterval: demandOrders,
      demandUnitsInInterval: demandUnits,
      intervalHours: intervalHours,
      customerId: effectiveCustId,

      basePrice: basePrice,
      currentPrice: prod.currentPrice,
      calculatedDynamicPrice: calculatedPrice,
      priceFluctuation: fluctuation,
      percentageAdjustment: percentAdj,

      demandAdjustmentPercentage: Math.round(demandAdj * 1000) / 10,
      demandSignalName: demandSignalName,

      temporalAdjustmentPercentage: Math.round(temporalAdj * 1000) / 10,
      temporalSignalName: timeSignalDesc,

      inventoryAdjustmentPercentage: Math.round(inventoryAdj * 1000) / 10,
      inventorySignalName: inventorySignalName,

      customerSegmentAdjustmentPercentage: Math.round(customerAdj * 1000) / 10,
      customerSegmentName: customerSegmentName,

      pricingRationale: rationale,
      evaluatedAt: new Date().toISOString()
    };
  },

  async applyDynamicPrice(productId, intervalHours = 24, customerId = null) {
    const prod = this.getProductById(productId);
    if (!prod) return null;

    let appliedPrice = null;
    let priceFluc = 0;
    let sourceName = 'Dynamic Pricing Algorithm';

    try {
      const q = customerId ? `?intervalHours=${intervalHours}&customerId=${customerId}` : `?intervalHours=${intervalHours}`;
      const backendRes = await this.apiRequest(`/dynamic-pricing/apply/${prod.id}${q}`, {
        method: 'POST'
      });
      if (backendRes && backendRes.success && backendRes.data) {
        appliedPrice = Number(backendRes.data.price || backendRes.data.Price);
        priceFluc = Number(backendRes.data.priceFluctuation || backendRes.data.PriceFluctuation || 0);
        sourceName = backendRes.data.sourceName || 'Dynamic Pricing Algorithm';
      }
    } catch (e) {
      console.warn('[DataStore] Backend dynamic pricing call notice:', e.message);
    }

    if (!appliedPrice) {
      const preview = await this.calculateDynamicPrice(productId, intervalHours, customerId);
      if (preview && preview.calculatedDynamicPrice) {
        appliedPrice = preview.calculatedDynamicPrice;
        priceFluc = preview.priceFluctuation || 0;
        sourceName = preview.pricingRationale || 'Dynamic Pricing Algorithm';
      }
    }

    if (appliedPrice) {
      prod.currentPrice = appliedPrice;
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const newEntry = {
        id: Date.now(),
        price: appliedPrice,
        fluctuation: priceFluc,
        changedAt: nowStr,
        changeReason: sourceName
      };

      if (!prod.priceLedger) prod.priceLedger = [];
      prod.priceLedger.unshift(newEntry);
      localStorage.setItem('omnicart_products', JSON.stringify(this.products));
    }

    return prod;
  },

  async recalculateAllDynamicPrices(intervalHours = 24, customerId = null) {

    try {
      const backendRes = await this.apiRequest(`/dynamic-pricing/recalculate-all?intervalHours=${intervalHours}`, {
        method: 'POST'
      });
      if (backendRes && backendRes.success && Array.isArray(backendRes.data)) {
        backendRes.data.forEach(entry => {
          const p = (this.products || []).find(item => Number(item.id) === Number(entry.productId));
          if (p) {
            p.currentPrice = Number(entry.price);
            if (!p.priceLedger) p.priceLedger = [];
            p.priceLedger.unshift({
              id: entry.id || Date.now(),
              price: Number(entry.price),
              fluctuation: Number(entry.priceFluctuation || 0),
              changedAt: entry.recordedAt ? entry.recordedAt.replace('T', ' ').substring(0, 19) : new Date().toISOString().substring(0, 19),
              changeReason: entry.sourceName || 'Dynamic Pricing Algorithm'
            });
          }
        });
        localStorage.setItem('omnicart_products', JSON.stringify(this.products));
        return this.products;
      }
    } catch (e) {
      console.warn('[DataStore] Batch dynamic recalculate notice:', e.message);
    }

    for (const p of (this.products || [])) {
      await this.applyDynamicPrice(p.id, intervalHours, customerId);
    }
    return this.products;
  },

  applyMarketplaceDynamicPricingSync() {

    for (const prod of (this.products || [])) {
      const matchingProducts = (this.products || []).filter(p => p.name && p.name.trim().toLowerCase() === prod.name.trim().toLowerCase());
      const totalStock = matchingProducts.reduce((sum, p) => sum + (Number(p.stockQuantity) || 0), 0) || (prod.stockQuantity || 20);

      const recentOrders = (this.orders || []).filter(o =>
        o.items && o.items.some(item => Number(item.productId || item.id) === prod.id)
      );
      const demandOrders = recentOrders.length || (Math.floor((prod.id * 3) % 7) + 2);
      const demandDelta = (demandOrders - 5) / 5.0;
      const demandAdj = Math.max(-0.06, Math.min(0.09, demandDelta * 0.05));

      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      let timeAdj = 0.0;
      let timeSignalDesc = 'Standard Shopping Hours';
      if (hour >= 18 && hour <= 22) {
        timeAdj = 0.035;
        timeSignalDesc = 'Peak Evening Window (18:00 - 22:00)';
      } else if (hour >= 12 && hour <= 14) {
        timeAdj = 0.015;
        timeSignalDesc = 'Midday Shopping Window (12:00 - 14:00)';
      } else if (hour >= 1 && hour <= 6) {
        timeAdj = -0.025;
        timeSignalDesc = 'Late Night Off-Peak (01:00 - 06:00)';
      }
      let weekendAdj = (day === 0 || day === 6) ? 0.025 : 0.0;
      const temporalAdj = timeAdj + weekendAdj;

      let inventoryAdj = 0.0;
      let inventorySignalName;
      if (totalStock <= 5) {
        inventoryAdj = 0.08;
        inventorySignalName = `Critical Low Stock (${totalStock} units left)`;
      } else if (totalStock <= 12) {
        inventoryAdj = 0.04;
        inventorySignalName = `Low Stock Pressure (${totalStock} units left)`;
      } else if (totalStock >= 40) {
        inventoryAdj = -0.06;
        inventorySignalName = `Surplus Inventory Clearance (${totalStock} units)`;
      } else if (totalStock >= 25) {
        inventoryAdj = -0.02;
        inventorySignalName = `Ample Stock Buffer (${totalStock} units)`;
      } else {
        inventorySignalName = `Balanced Marketplace Stock (${totalStock} units)`;
      }

      let customerAdj = 0.0;
      let customerSegmentName = 'Marketplace Standard';
      if (this.currentUser && this.currentUserRole === 'buyer') {
        const userOrders = (this.orders || []).filter(o => Number(o.customerId) === Number(this.currentUser.id));
        const orderCount = userOrders.length;
        if (orderCount >= 3 || this.currentUser.isVip) {
          customerAdj = -0.05;
          customerSegmentName = `VIP Loyalty Privilege (${orderCount} orders)`;
        } else if (orderCount === 0) {
          customerAdj = -0.04;
          customerSegmentName = 'Welcome First-Order Incentive';
        }
      }

      const basePrice = (prod.priceLedger && prod.priceLedger.length > 0)
        ? Number(prod.priceLedger[prod.priceLedger.length - 1].price)
        : (prod.basePrice || (prod.originalPrice ? Math.round(prod.originalPrice / 1.4) : prod.currentPrice));

      let mult = 1.0 + demandAdj + temporalAdj + inventoryAdj + customerAdj;
      mult = Math.max(0.70, Math.min(1.40, mult));

      const dynPrice = Math.round(basePrice * mult);
      if (!prod.currentPrice) {
        prod.currentPrice = dynPrice;
      }
      prod.dynamicPricing = {
        basePrice,
        currentPrice: prod.currentPrice,
        calculatedDynamicPrice: dynPrice,
        percentageAdjustment: Math.round(((dynPrice - basePrice) / basePrice) * 1000) / 10,
        demandAdjustmentPercentage: Math.round(demandAdj * 1000) / 10,
        demandSignalName: `Real-Time Demand (${demandOrders} orders/24h)`,
        temporalAdjustmentPercentage: Math.round(temporalAdj * 1000) / 10,
        temporalSignalName: timeSignalDesc,
        inventoryAdjustmentPercentage: Math.round(inventoryAdj * 1000) / 10,
        inventorySignalName,
        customerSegmentAdjustmentPercentage: Math.round(customerAdj * 1000) / 10,
        customerSegmentName
      };
    }
    localStorage.setItem('omnicart_products', JSON.stringify(this.products));
  },

  async syncCustomerProfile() {
    if (!this.currentUser || this.currentUserRole !== 'buyer') return null;
    const customerId = this.currentUser.id;
    if (!customerId) return this.currentUser;

    try {
      const res = await this.apiRequest(`/customers/${customerId}`);
      if (res && res.success && res.data) {
        const d = res.data;
        this.currentUser.FirstName = d.firstName || this.currentUser.FirstName;
        this.currentUser.LastName = d.lastName !== undefined ? d.lastName : this.currentUser.LastName;
        if (d.emails && d.emails.length > 0) {
          this.currentUser.email = d.emails[0];
        }
        if (d.phones && d.phones.length > 0) {
          this.currentUser.phone = d.phones[0];
        }
        localStorage.setItem('omnicart_user', JSON.stringify(this.currentUser));
      }
    } catch (_) { }
    return this.currentUser;
  },

  async syncSellerProfile() {
    if (!this.currentSeller) return null;
    const sellerId = Number(this.currentSeller.id || 1);
    try {
      const res = await this.apiRequest(`/sellers/${sellerId}`);
      if (res && res.success && res.data) {
        const d = res.data;
        this.currentSeller.CompanyName = d.companyName || this.currentSeller.CompanyName;
        this.currentSeller.companyName = d.companyName || this.currentSeller.companyName;
        this.currentSeller.gstin = d.gstin || this.currentSeller.gstin;
        this.currentSeller.email = d.contactEmail || this.currentSeller.email;
        this.currentSeller.phone = d.contactPhone || this.currentSeller.phone;
        this.currentSeller.city = d.city || this.currentSeller.city;
        this.currentSeller.state = d.state || this.currentSeller.state;
        localStorage.setItem('omnicart_seller', JSON.stringify(this.currentSeller));
        sessionStorage.setItem('omnicart_seller', JSON.stringify(this.currentSeller));
      }
    } catch (_) { }
    return this.currentSeller;
  },

  async fetchCustomerAddresses() {
    if (!this.currentUser || this.currentUserRole !== 'buyer') return this.addresses;
    const customerId = this.currentUser.id;

    try {
      const res = await this.apiRequest(`/customers/${customerId}/addresses`);
      if (res && res.success && Array.isArray(res.data)) {
        const currentSelectedId = Number(localStorage.getItem('omnicart_current_address_id')) || (res.data.length > 0 ? res.data[0].id : null);
        this.addresses = res.data.map((a, idx) => ({
          id: a.id,
          customerId: a.customerId || customerId,
          type: a.addressType || 'Home',
          addressType: a.addressType || 'Home',
          houseNumber: a.houseNumber || '',
          street: a.street || '',
          city: a.city || 'Varanasi',
          state: (a.city && a.city.toLowerCase().includes('varanasi')) ? 'Uttar Pradesh' : (a.state || ''),
          pincode: a.pinCode || a.pincode || '221005',
          pinCode: a.pinCode || a.pincode || '221005',
          isCurrent: currentSelectedId ? a.id === currentSelectedId : idx === 0
        }));

        this.addresses = this.addresses.filter(a => !(a.street && (a.street.includes('Cyber Residency') || a.street.includes('100 Feet Rd, Indiranagar'))));
        localStorage.setItem('omnicart_addresses', JSON.stringify(this.addresses));
      }
    } catch (_) { }
    return this.addresses;
  },

  async fetchCustomerPhones() {
    if (!this.currentUser || this.currentUserRole !== 'buyer') return this.phones;
    const customerId = this.currentUser.id;

    try {
      const res = await this.apiRequest(`/customers/${customerId}/phones`);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        this.phones = res.data.map((p, idx) => ({
          id: p.id,
          phone: p.phoneNumber,
          type: p.isPrimary ? 'Primary' : 'Secondary',
          isPrimary: Boolean(p.isPrimary)
        }));
        localStorage.setItem('omnicart_phones', JSON.stringify(this.phones));
        return this.phones;
      }

      const custRes = await this.apiRequest(`/customers/${customerId}`);
      if (custRes && custRes.success && custRes.data && Array.isArray(custRes.data.phones) && custRes.data.phones.length > 0) {
        this.phones = custRes.data.phones.map((p, idx) => ({
          id: idx + 1,
          phone: p,
          type: idx === 0 ? 'Primary' : 'Secondary',
          isPrimary: idx === 0
        }));
        localStorage.setItem('omnicart_phones', JSON.stringify(this.phones));
      } else if (this.currentUser.phone) {
        this.phones = [{ id: 1, phone: this.currentUser.phone, type: 'Primary', isPrimary: true }];
        localStorage.setItem('omnicart_phones', JSON.stringify(this.phones));
      }
    } catch (_) {
      if (this.currentUser.phone && this.phones.length === 0) {
        this.phones = [{ id: 1, phone: this.currentUser.phone, type: 'Primary', isPrimary: true }];
      }
    }
    return this.phones;
  },

  async fetchCustomerEmails() {
    if (!this.currentUser || this.currentUserRole !== 'buyer') return this.emails;
    const customerId = this.currentUser.id;

    try {
      const res = await this.apiRequest(`/customers/${customerId}/emails`);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        this.emails = res.data.map((e, idx) => ({
          id: e.id,
          email: e.emailAddress,
          type: e.isPrimary ? 'Primary' : 'Secondary',
          isPrimary: Boolean(e.isPrimary)
        }));
        localStorage.setItem('omnicart_emails', JSON.stringify(this.emails));
        return this.emails;
      }

      const custRes = await this.apiRequest(`/customers/${customerId}`);
      if (custRes && custRes.success && custRes.data && Array.isArray(custRes.data.emails) && custRes.data.emails.length > 0) {
        this.emails = custRes.data.emails.map((e, idx) => ({
          id: idx + 1,
          email: e,
          type: idx === 0 ? 'Primary' : 'Secondary',
          isPrimary: idx === 0
        }));
        localStorage.setItem('omnicart_emails', JSON.stringify(this.emails));
      } else if (this.currentUser.email) {
        this.emails = [{ id: 1, email: this.currentUser.email, type: 'Primary', isPrimary: true }];
        localStorage.setItem('omnicart_emails', JSON.stringify(this.emails));
      }
    } catch (_) {
      if (this.currentUser.email && this.emails.length === 0) {
        this.emails = [{ id: 1, email: this.currentUser.email, type: 'Primary', isPrimary: true }];
      }
    }
    return this.emails;
  },

  async addCustomerPhone(phoneVal, type = 'Mobile', isPrimary = false) {
    if (!this.currentUser || this.currentUserRole !== 'buyer') return;
    const customerId = this.currentUser.id;

    const newDigits = (phoneVal || '').replace(/\D/g, '');
    const primaryDigits = (this.currentUser.phone || '').replace(/\D/g, '');
    if (!isPrimary && primaryDigits && primaryDigits.length >= 10 && newDigits.length >= 10 &&
      primaryDigits.slice(-10) === newDigits.slice(-10)) {
      throw new Error('This phone number is already registered as your primary phone.');
    }
    const isDup = (this.phones || []).some(p => {
      const existDigits = (p.phone || '').replace(/\D/g, '');
      return existDigits.length >= 10 && newDigits.length >= 10 &&
        existDigits.slice(-10) === newDigits.slice(-10);
    });
    if (isDup) {
      throw new Error('This phone number is already registered in your profile.');
    }

    try {
      await this.apiRequest(`/customers/${customerId}/phones`, {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: phoneVal, isPrimary })
      });
    } catch (err) {
      if (err && err.message && err.message.toLowerCase().includes('already registered')) {
        throw err;
      }
    }

    await this.fetchCustomerPhones();
  },

  async updateCustomerPhone(newPhone) {
    if (!this.currentUser) return;
    const customerId = this.currentUser.id;

    const res = await this.apiRequest(`/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify({
        firstName: this.currentUser.FirstName || 'Customer',
        lastName: this.currentUser.LastName || 'User',
        phone: newPhone
      })
    });
    if (!res) {
      throw new Error('Unable to connect to backend server. Please verify port 8080 is online.');
    }
    if (res.success === false) {
      throw new Error(res.message || 'Failed to update phone number in database.');
    }

    this.currentUser.phone = newPhone;
    localStorage.setItem('omnicart_user', JSON.stringify(this.currentUser));
    await this.fetchCustomerPhones();
  },

  async deleteCustomerPhone(id, phoneVal) {
    if (this.currentUser && this.currentUserRole === 'buyer') {
      const customerId = this.currentUser.id;
      if (id) {
        try {
          await this.apiRequest(`/customers/${customerId}/phones/${id}?phone=${encodeURIComponent(phoneVal || '')}`, { method: 'DELETE' });
        } catch (_) { }
      } else if (phoneVal) {
        try {
          await this.apiRequest(`/customers/${customerId}/phones?phone=${encodeURIComponent(phoneVal)}`, { method: 'DELETE' });
        } catch (_) { }
      }
    }
    this.phones = this.phones.filter(p => p.id !== id && p.phone !== phoneVal);
    localStorage.setItem('omnicart_phones', JSON.stringify(this.phones));
  },

  async addCustomerEmail(emailVal, type = 'Personal', isPrimary = false) {
    if (!this.currentUser || this.currentUserRole !== 'buyer') return;
    const customerId = this.currentUser.id;

    const normalEmail = (emailVal || '').trim().toLowerCase();
    const primaryEmail = (this.currentUser.email || '').trim().toLowerCase();
    if (!isPrimary && primaryEmail && primaryEmail === normalEmail) {
      throw new Error('This email address is already registered as your primary email.');
    }
    const isDup = (this.emails || []).some(e => {
      return (e.email || '').trim().toLowerCase() === normalEmail;
    });
    if (isDup) {
      throw new Error('This email address is already registered in your profile.');
    }

    try {
      await this.apiRequest(`/customers/${customerId}/emails`, {
        method: 'POST',
        body: JSON.stringify({ emailAddress: emailVal, isPrimary })
      });
    } catch (err) {
      if (err && err.message && err.message.toLowerCase().includes('already registered')) {
        throw err;
      }
    }

    await this.fetchCustomerEmails();
  },

  async updateCustomerEmail(newEmail) {
    if (!this.currentUser) return;
    const customerId = this.currentUser.id;

    const res = await this.apiRequest(`/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify({
        firstName: this.currentUser.FirstName || 'Customer',
        lastName: this.currentUser.LastName || 'User',
        email: newEmail
      })
    });
    if (!res) {
      throw new Error('Unable to connect to backend server. Please verify port 8080 is online.');
    }
    if (res.success === false) {
      throw new Error(res.message || 'Failed to update email address in database.');
    }

    this.currentUser.email = newEmail;
    localStorage.setItem('omnicart_user', JSON.stringify(this.currentUser));
    await this.fetchCustomerEmails();
  },

  async deleteCustomerEmail(id, emailVal) {
    if (this.currentUser && this.currentUserRole === 'buyer') {
      const customerId = this.currentUser.id;
      if (id) {
        try {
          await this.apiRequest(`/customers/${customerId}/emails/${id}?email=${encodeURIComponent(emailVal || '')}`, { method: 'DELETE' });
        } catch (_) { }
      } else if (emailVal) {
        try {
          await this.apiRequest(`/customers/${customerId}/emails?email=${encodeURIComponent(emailVal)}`, { method: 'DELETE' });
        } catch (_) { }
      }
    }
    this.emails = this.emails.filter(e => e.id !== id && e.email !== emailVal);
    localStorage.setItem('omnicart_emails', JSON.stringify(this.emails));
  },

  async addCustomerAddress(addr) {
    if (!this.currentUser || this.currentUserRole !== 'buyer') return;
    const customerId = this.currentUser.id;

    let apiRes = null;
    try {
      apiRes = await this.apiRequest(`/customers/${customerId}/addresses`, {
        method: 'POST',
        body: JSON.stringify({
          addressTypeId: addr.addressTypeId || 1,
          houseNumber: addr.houseNumber || 'N/A',
          street: addr.street || 'Main Street',
          city: addr.city || 'Varanasi',
          pinCode: addr.pincode || addr.pinCode || '221005'
        })
      });
    } catch (_) { }

    const newAddr = {
      id: (apiRes && apiRes.data && apiRes.data.id) ? apiRes.data.id : Date.now(),
      customerId: customerId,
      type: addr.type || 'Home',
      addressType: addr.type || 'Home',
      houseNumber: addr.houseNumber || '',
      street: addr.street || '',
      city: addr.city || 'Varanasi',
      state: addr.state || '',
      pincode: addr.pincode || addr.pinCode || '221005',
      pinCode: addr.pincode || addr.pinCode || '221005',
      isCurrent: this.addresses.length === 0
    };

    this.addresses.push(newAddr);
    localStorage.setItem('omnicart_addresses', JSON.stringify(this.addresses));
    if (newAddr.isCurrent) {
      localStorage.setItem('omnicart_current_address_id', newAddr.id);
    }
    return newAddr;
  },

  async deleteCustomerAddress(id) {
    try {
      await this.apiRequest(`/addresses/${id}`, { method: 'DELETE' });
    } catch (_) { }

    this.addresses = this.addresses.filter(a => a.id !== id);
    if (this.addresses.length > 0 && !this.addresses.some(a => a.isCurrent)) {
      this.addresses[0].isCurrent = true;
      localStorage.setItem('omnicart_current_address_id', this.addresses[0].id);
    }
    localStorage.setItem('omnicart_addresses', JSON.stringify(this.addresses));
  },

  setCurrentAddress(id) {
    localStorage.setItem('omnicart_current_address_id', id);
    this.addresses.forEach(a => {
      a.isCurrent = (a.id === id);
    });
    localStorage.setItem('omnicart_addresses', JSON.stringify(this.addresses));
  },

  async deleteCustomerAccount() {
    if (!this.currentUser || !this.currentUser.id) {
      throw new Error('No customer account is logged in.');
    }
    const id = this.currentUser.id;
    const res = await this.apiRequest(`/customers/${id}`, { method: 'DELETE' });
    if (res && res.success === false) {
      throw new Error(res.message || 'Failed to delete account from database.');
    }

    this.logout();
  },

  async deleteSellerAccount() {
    if (!this.currentSeller || !this.currentSeller.id) {
      throw new Error('No seller account is logged in.');
    }
    const id = this.currentSeller.id;
    const res = await this.apiRequest(`/sellers/${id}`, { method: 'DELETE' });
    if (res && res.success === false) {
      throw new Error(res.message || 'Failed to delete account from database.');
    }

    this.logout();
  },

  async updateCustomerProfile(data) {
    if (!this.currentUser) {
      throw new Error('Please sign in as a customer to update your profile.');
    }
    const customerId = this.currentUser.id;
    if (!data.firstName || !data.firstName.trim()) {
      throw new Error('First name is required.');
    }
    if (!data.lastName || !data.lastName.trim()) {
      throw new Error('Last name is required.');
    }

    const payload = {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email ? data.email.trim() : undefined,
      phone: data.phone ? data.phone.trim() : undefined,
      password: (data.password && data.password.trim().length >= 6) ? data.password.trim() : undefined
    };

    const res = await this.apiRequest(`/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (!res) {
      throw new Error('Unable to connect to backend server. Please verify port 8080 is online.');
    }
    if (res.success === false) {
      throw new Error(res.message || 'Failed to update profile in database.');
    }

    if (res.data) {
      this.currentUser.FirstName = res.data.firstName || data.firstName.trim();
      this.currentUser.LastName = res.data.lastName || data.lastName.trim();
      if (Array.isArray(res.data.emails) && res.data.emails.length > 0) {
        this.currentUser.email = res.data.emails[0];
      } else if (data.email) {
        this.currentUser.email = data.email.trim();
      }
      if (Array.isArray(res.data.phones) && res.data.phones.length > 0) {
        this.currentUser.phone = res.data.phones[0];
      } else if (data.phone) {
        this.currentUser.phone = data.phone.trim();
      }
    }

    if (data.password && data.password.trim().length >= 6) {
      this.currentUser.password = data.password.trim();
    }

    localStorage.setItem('omnicart_user', JSON.stringify(this.currentUser));
    sessionStorage.setItem('omnicart_user', JSON.stringify(this.currentUser));

    const registeredUsers = JSON.parse(localStorage.getItem('omnicart_registered_users') || '[]');
    const idx = registeredUsers.findIndex(u => u.id === customerId || (u.email && u.email.toLowerCase() === (this.currentUser.email || '').toLowerCase()));
    if (idx > -1) {
      registeredUsers[idx].FirstName = this.currentUser.FirstName;
      registeredUsers[idx].LastName = this.currentUser.LastName;
      registeredUsers[idx].email = this.currentUser.email;
      registeredUsers[idx].phone = this.currentUser.phone;
      if (data.password && data.password.trim().length >= 6) {
        registeredUsers[idx].password = data.password.trim();
      }
      localStorage.setItem('omnicart_registered_users', JSON.stringify(registeredUsers));
    }

    await this.fetchCustomerEmails();
    await this.fetchCustomerPhones();

    return this.currentUser;
  },

  async updateSellerProfile(data) {
    if (!this.currentSeller || this.currentUserRole !== 'seller') {
      throw new Error('Please sign in as a merchant to update your store profile.');
    }
    const sellerId = this.currentSeller.id;
    if (!data.companyName || !data.companyName.trim()) {
      throw new Error('Company name is required.');
    }
    if (!data.email || !data.email.trim()) {
      throw new Error('Contact email is required.');
    }
    if (!data.phone || !data.phone.trim()) {
      throw new Error('Contact phone is required.');
    }

    const payload = {
      companyName: data.companyName.trim(),
      contactEmail: data.email.trim(),
      contactPhone: data.phone.trim(),
      city: (data.city || '').trim() || undefined,
      state: (data.state || '').trim() || undefined,
      password: (data.password && data.password.trim().length >= 6) ? data.password.trim() : undefined
    };

    const res = await this.apiRequest(`/sellers/${sellerId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (!res) {
      throw new Error('Unable to connect to backend server. Please verify port 8080 is online.');
    }
    if (res.success === false) {
      throw new Error(res.message || 'Failed to update store profile in database.');
    }

    if (res.data) {
      this.currentSeller.CompanyName = res.data.companyName || data.companyName.trim();
      this.currentSeller.companyName = res.data.companyName || data.companyName.trim();
      this.currentSeller.email = res.data.contactEmail || data.email.trim();
      this.currentSeller.phone = res.data.contactPhone || data.phone.trim();
      this.currentSeller.city = res.data.city || (data.city || '').trim();
      this.currentSeller.state = res.data.state || (data.state || '').trim();
      if (res.data.gstin) this.currentSeller.gstin = res.data.gstin;
    }

    if (data.password && data.password.trim().length >= 6) {
      this.currentSeller.password = data.password.trim();
    }

    localStorage.setItem('omnicart_seller', JSON.stringify(this.currentSeller));
    sessionStorage.setItem('omnicart_seller', JSON.stringify(this.currentSeller));

    const registeredSellers = JSON.parse(localStorage.getItem('omnicart_registered_sellers') || '[]');
    const idx = registeredSellers.findIndex(s => s.id === sellerId || (s.contactEmail || s.email || '').toLowerCase() === this.currentSeller.email.toLowerCase());
    if (idx > -1) {
      registeredSellers[idx].companyName = this.currentSeller.CompanyName;
      registeredSellers[idx].contactEmail = this.currentSeller.email;
      registeredSellers[idx].contactPhone = this.currentSeller.phone;
      registeredSellers[idx].city = this.currentSeller.city;
      registeredSellers[idx].state = this.currentSeller.state;
      if (data.password && data.password.trim().length >= 6) {
        registeredSellers[idx].password = data.password.trim();
      }
      localStorage.setItem('omnicart_registered_sellers', JSON.stringify(registeredSellers));
    }

    return this.currentSeller;
  },

  async fetchSellerOrders() {
    if (!this.currentSeller) return this.orders;
    const sellerId = Number(this.currentSeller.id || 1);
    try {
      const res = await this.apiRequest(`/sellers/${sellerId}/orders?page=0&size=50`);
      if (res && res.success && res.data && Array.isArray(res.data.content)) {
        const backendOrders = res.data.content.map(bo => {
          const localMatch = (this.orders || []).find(o => Number(o.id) === Number(bo.id));
          return {
            id: bo.id,
            orderNumber: `ORD-${bo.id}`,
            sellerId: sellerId,
            customerId: bo.customerId,
            customerName: bo.recipientName || (localMatch ? (localMatch.recipientName || localMatch.customerName) : null) || bo.customerName || 'Customer',
            recipientName: bo.recipientName || (localMatch ? (localMatch.recipientName || localMatch.customerName) : null) || bo.customerName || 'Customer',
            orderDate: bo.orderDate ? String(bo.orderDate).replace('T', ' ').substring(0, 19) : '',
            shippingStatus: bo.shippingStatus || 'ORDER_PLACED',
            totalAmount: Number(bo.totalAmount) || 0,
            deliveryAddress: (bo.deliveryAddress && bo.deliveryAddress !== 'Standard Local Hub Dispatch')
              ? bo.deliveryAddress
              : ((localMatch && localMatch.deliveryAddress && localMatch.deliveryAddress !== 'Standard Local Hub Dispatch')
                ? localMatch.deliveryAddress
                : (this.addresses && this.addresses[0] ? `${this.addresses[0].street}, ${this.addresses[0].city} - ${this.addresses[0].pincode}` : 'Flat 402, Cyber Heights, 100 Feet Rd, Bengaluru - 560038')),
            paymentMethod: bo.payment ? bo.payment.paymentMethod : 'Prepaid Verified',
            items: (bo.items || []).map(item => {
              const liveProd = (this.products || []).find(p => Number(p.id) === Number(item.productId));
              return {
                id: item.productId,
                productId: item.productId,
                name: item.productName || (liveProd ? liveProd.name : `Product #${item.productId}`),
                price: Number(item.exactLedgerPrice) || (liveProd ? liveProd.currentPrice : 0),
                quantity: item.quantity || 1,
                lineTotal: Number(item.lineTotal) || ((Number(item.exactLedgerPrice) || 0) * (item.quantity || 1)),
                image: item.imageUrl || (liveProd ? this.getProductImage(liveProd) : 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg'),
                imageUrl: item.imageUrl || (liveProd ? this.getProductImage(liveProd) : 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg'),
                code: liveProd ? (liveProd.code || `PROD-00${item.productId}`) : `PROD-00${item.productId}`,
                sellerId: item.sellerId ? Number(item.sellerId) : (liveProd ? Number(liveProd.sellerId) : sellerId),
                sellerName: item.sellerName || (liveProd && liveProd.seller ? liveProd.seller.companyName : ''),
                status: item.status || 'ORDER_PLACED'
              };
            })
          };
        });

        this.sellerOrders = backendOrders;
        const backendIds = new Set(backendOrders.map(o => Number(o.id)));
        const otherOrders = (this.orders || []).filter(o => !backendIds.has(Number(o.id)));
        this.orders = [...backendOrders, ...otherOrders];
        localStorage.setItem('omnicart_orders', JSON.stringify(this.orders));
      }
    } catch (_) { }
        return this.orders;
  },

  async fetchCustomerOrders() {
    if (!this.currentUser || this.currentUserRole !== 'buyer') return this.orders;
    const customerId = Number(this.currentUser.id || 1);
    try {
      const res = await this.apiRequest(`/customers/${customerId}/orders?page=0&size=50`);
      if (res && res.success && res.data && Array.isArray(res.data.content)) {
        const backendStatusMap = {
          'Pending': 'ORDER_PLACED',
          'Processing': 'PROCESSING',
          'Shipped': 'SHIPPED',
          'In Transit': 'OUT_FOR_DELIVERY',
          'Delivered': 'DELIVERED',
          'Cancelled': 'CANCELLED',
          'Returned': 'CANCELLED'
        };
        const backendOrders = res.data.content.map(bo => {
          let st = bo.shippingStatus || 'ORDER_PLACED';
          if (backendStatusMap[st]) st = backendStatusMap[st];
          return {
            id: bo.id,
            orderNumber: `ORD-${bo.id}`,
            customerId: customerId,
            customerName: bo.customerName || 'Customer',
            orderDate: bo.orderDate ? String(bo.orderDate).replace('T', ' ').substring(0, 19) : '',
            shippingStatus: st,
            totalAmount: Number(bo.totalAmount) || (bo.payment ? Number(bo.payment.paidAmount) : 0),
            deliveryAddress: bo.deliveryAddress || 'Bengaluru, Karnataka',
            paymentMethod: bo.payment ? bo.payment.paymentMethod : 'Prepaid Verified',
            items: (bo.items || []).map(item => {
              const liveProd = (this.products || []).find(p => Number(p.id) === Number(item.productId));
              return {
                id: item.productId,
                productId: item.productId,
                name: item.productName || (liveProd ? liveProd.name : `Product #${item.productId}`),
                price: Number(item.exactLedgerPrice) || (liveProd ? liveProd.currentPrice : 0),
                quantity: item.quantity || 1,
                lineTotal: Number(item.lineTotal) || ((Number(item.exactLedgerPrice) || 0) * (item.quantity || 1)),
                image: item.imageUrl || (liveProd ? this.getProductImage(liveProd) : 'images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg'),
                status: item.status || 'ACTIVE'
              };
            })
          };
        });

        const backendIds = new Set(backendOrders.map(o => Number(o.id)));
        const otherOrders = (this.orders || []).filter(o => !backendIds.has(Number(o.id)));
        this.orders = [...backendOrders, ...otherOrders];
        localStorage.setItem('omnicart_orders', JSON.stringify(this.orders));
      }
    } catch (_) { }
    return this.orders;
  },

  async submitProductReview(reviewData) {
    if (!reviewData.orderId || !reviewData.productId || !reviewData.rating || !reviewData.comment) {
      throw new Error('Order ID, Product ID, star rating (1-5), and review comment are required.');
    }

    const payload = {
      orderId: Number(reviewData.orderId),
      productId: Number(reviewData.productId),
      customerId: this.currentUser ? Number(this.currentUser.id) : (reviewData.customerId ? Number(reviewData.customerId) : 1),
      rating: Number(reviewData.rating),
      title: (reviewData.title || 'Verified Purchase Review').trim(),
      comment: reviewData.comment.trim()
    };

    let apiRes = null;
    try {
      apiRes = await this.apiRequest('/reviews', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (_) { }

    if (apiRes && apiRes.success && apiRes.data) {
      const localReviews = JSON.parse(localStorage.getItem('omnicart_reviews') || '[]');
      const idx = localReviews.findIndex(r => Number(r.orderId) === payload.orderId && Number(r.productId) === payload.productId);
      if (idx > -1) {
        localReviews[idx] = apiRes.data;
      } else {
        localReviews.unshift(apiRes.data);
      }
      localStorage.setItem('omnicart_reviews', JSON.stringify(localReviews));
      return apiRes.data;
    }

    if (apiRes && !apiRes.success) {
      throw new Error(apiRes.message || 'Failed to submit review.');
    }

    const customerDisplayName = this.currentUser ? (this.currentUser.FirstName || 'Customer') : 'Verified Buyer';
    const localReview = {
      id: Date.now(),
      orderId: payload.orderId,
      productId: payload.productId,
      customerId: payload.customerId,
      customerName: customerDisplayName.trim(),
      rating: payload.rating,
      title: payload.title,
      comment: payload.comment,
      createdAt: new Date().toISOString(),
      formattedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    const localReviews = JSON.parse(localStorage.getItem('omnicart_reviews') || '[]');
    const idx = localReviews.findIndex(r => Number(r.orderId) === payload.orderId && Number(r.productId) === payload.productId);
    if (idx > -1) {
      localReviews[idx] = localReview;
    } else {
      localReviews.unshift(localReview);
    }
    localStorage.setItem('omnicart_reviews', JSON.stringify(localReviews));
    return localReview;
  },

  async getOrderReviews(orderId) {
    if (!orderId) return [];
    try {
      const res = await this.apiRequest(`/reviews/order/${orderId}`);
      if (res && res.success && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (_) { }

    const localReviews = JSON.parse(localStorage.getItem('omnicart_reviews') || '[]');
    return localReviews.filter(r => Number(r.orderId) === Number(orderId));
  },

  async getProductReviews(productId) {
    if (!productId) return [];
    try {
      const res = await this.apiRequest(`/reviews/product/${productId}`);
      if (res && res.success && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (_) { }

    const localReviews = JSON.parse(localStorage.getItem('omnicart_reviews') || '[]');
    return localReviews.filter(r => Number(r.productId) === Number(productId));
  },

  async getProductReviewSummary(productId) {
    if (!productId) return { averageRating: 0.0, totalReviews: 0, ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    try {
      const res = await this.apiRequest(`/reviews/product/${productId}/summary`);
      if (res && res.success && res.data) {
        return res.data;
      }
    } catch (_) { }

    const reviews = await this.getProductReviews(productId);
    if (!reviews || reviews.length === 0) {
      return { averageRating: 0.0, totalReviews: 0, ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    }
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const avg = Math.round((sum / reviews.length) * 10) / 10;
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      counts[star] = (counts[star] || 0) + 1;
    });
    return {
      averageRating: avg,
      totalReviews: reviews.length,
      ratingCounts: counts
    };
  }
};

DataStore.init();
