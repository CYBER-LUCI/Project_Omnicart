
const App = {
  init() {

    if (window.UIModule) {
      if (typeof window.UIModule.init === 'function') {
        window.UIModule.init();
      } else {
        window.UIModule.initTheme();
      }
      window.UIModule.renderHeader();
    }

    const searchInputs = document.querySelectorAll('.global-search-input');
    searchInputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = input.value.trim();
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

    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('auth-dropdown-menu');
      const toggleBtn = e.target.closest('button[onclick*="toggleAuthDropdown"]');
      if (dropdown && !dropdown.classList.contains('hidden') && !dropdown.contains(e.target) && !toggleBtn) {
        dropdown.classList.add('hidden');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const authModal = document.getElementById('auth-modal');
        if (authModal && !authModal.classList.contains('hidden')) {
          authModal.classList.add('hidden');
        }

        const vsModal = document.getElementById('visual-search-modal');
        if (vsModal && !vsModal.classList.contains('hidden')) {
          vsModal.classList.add('hidden');
        }

        const addProdModal = document.getElementById('add-product-modal');
        if (addProdModal && !addProdModal.classList.contains('hidden')) {
          addProdModal.classList.add('hidden');
        }
      }
    });
  }
};

window.App = App;

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
