
const VisualSearchModule = {
  activeTab: 'upload',
  cameraStream: null,
  isAnalyzing: false,
  lastQueryLabel: '',
  lastQueryVector: null,
  _hasEscListener: false,

  presetChips: [
    { key: 'watch', label: 'Smartwatch', category: 'Wearables', targetId: 1 },
    { key: 'headphones', label: 'Wireless Headphones', category: 'Audio', targetId: 4 },
    { key: 'mouse', label: 'Gaming Mouse', category: 'Gaming', targetId: 13 },
    { key: 'keyboard', label: 'Mechanical Keyboard', category: 'Peripherals', targetId: 3 },
    { key: 'drone', label: '4K Camera Drone', category: 'Electronics', targetId: 2 },
    { key: 'moisturizer', label: 'Skincare Serum', category: 'Beauty', targetId: 10 },
    { key: 'laptop', label: 'MacBook Pro', category: 'Laptops', targetId: 14 },
    { key: 'sunglasses', label: 'Polarized Sunglasses', category: 'Fashion', targetId: 9 }
  ],

  openModal(initialMode = 'upload') {
    let modal = document.getElementById('visual-search-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'visual-search-modal';
      document.body.appendChild(modal);
    }

    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/50 backdrop-blur-sm';
    modal.onclick = (e) => {
      if (e.target === modal) this.closeModal();
    };

    if (!this._hasEscListener) {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const m = document.getElementById('visual-search-modal');
          if (m && !m.classList.contains('hidden')) {
            VisualSearchModule.closeModal();
          }
        }
      });
      this._hasEscListener = true;
    }

    this.activeTab = initialMode;
    this.renderModalStructure(modal);
    modal.classList.remove('hidden');

    if (this.activeTab === 'camera') {
      this.startCameraStream();
    }
  },

  closeModal() {
    this.stopCameraStream();
    const modal = document.getElementById('visual-search-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  },

  switchTab(tab) {
    if (this.activeTab === 'camera' && tab !== 'camera') {
      this.stopCameraStream();
    }
    this.activeTab = tab;

    document.querySelectorAll('.vs-tab-btn').forEach(btn => {
      const isSelected = btn.dataset.tab === tab;
      btn.className = isSelected
        ? 'vs-tab-btn py-2.5 px-3 rounded-lg text-xs font-semibold transition-all bg-white text-stone-900 border border-stone-300/80 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer'
        : 'vs-tab-btn py-2.5 px-3 rounded-lg text-xs font-medium transition-all text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 border border-transparent flex items-center justify-center gap-1.5 cursor-pointer';
    });

    const panels = ['upload', 'camera', 'concept'];
    panels.forEach(p => {
      const el = document.getElementById(`vs-panel-${p}`);
      if (el) {
        if (p === tab) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });

    if (tab === 'camera') {
      this.startCameraStream();
    }
  },

  renderModalStructure(modal) {
    modal.innerHTML = `
      <div class="vs-modal-card relative w-full max-w-2xl bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.18)] overflow-hidden max-h-[90vh] flex flex-col text-stone-800 animate-in fade-in zoom-in-95 duration-200">

        <!-- Subtle Top Accent Gradient Line -->
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600"></div>

        <!-- Close Button -->
        <button
          onclick="VisualSearchModule.closeModal()"
          class="absolute top-5 right-5 text-stone-400 hover:text-stone-700 text-base font-bold z-20 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors cursor-pointer"
          title="Close (Esc)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <!-- Clean Light Header -->
        <div class="flex items-center gap-3.5 pb-4 mb-4 border-b border-stone-100 pr-10">
          <div class="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-700 flex items-center justify-center text-lg shrink-0 shadow-xs">
            <svg class="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-stone-900 tracking-tight">Search by Image</h3>
            <p class="text-xs text-stone-500 mt-0.5">Find matching products by uploading a photo, using your camera, or picking a suggestion.</p>
          </div>
        </div>

        <!-- Mode Navigation Bar -->
        <div class="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-stone-100 border border-stone-200/80 mb-5 text-xs shrink-0">
          <button
            data-tab="upload"
            onclick="VisualSearchModule.switchTab('upload')"
            class="vs-tab-btn py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${this.activeTab === 'upload' ? 'bg-white text-stone-900 border border-stone-300/80 shadow-xs' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 border border-transparent'} flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <span>Upload Photo</span>
          </button>
          <button
            data-tab="camera"
            onclick="VisualSearchModule.switchTab('camera')"
            class="vs-tab-btn py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${this.activeTab === 'camera' ? 'bg-white text-stone-900 border border-stone-300/80 shadow-xs' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 border border-transparent'} flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            <span>Use Camera</span>
          </button>
          
        </div>

        <!-- Scrollable Modal Body -->
        <div class="overflow-y-auto space-y-5 flex-1 pr-1 custom-scrollbar">

          <!-- TAB 1: IMAGE DROPZONE & UPLOAD -->
          <div id="vs-panel-upload" class="${this.activeTab === 'upload' ? '' : 'hidden'} space-y-4">
            <div
              id="vs-dropzone"
              class="border-2 border-dashed border-stone-300 hover:border-amber-600 bg-stone-50/70 hover:bg-amber-50/30 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
              onclick="document.getElementById('vs-file-input').click()"
              ondragover="VisualSearchModule.handleDragOver(event)"
              ondragleave="VisualSearchModule.handleDragLeave(event)"
              ondrop="VisualSearchModule.handleDrop(event)"
            >
              <input type="file" id="vs-file-input" accept="image/*" class="hidden" onchange="VisualSearchModule.handleFileUpload(event)" />

              <div class="w-12 h-12 rounded-full bg-white border border-stone-200 group-hover:border-amber-400 group-hover:bg-amber-50 text-amber-700 flex items-center justify-center text-xl transition-all shadow-xs">
                <svg class="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
              <div class="mt-1">
                <p class="text-sm font-semibold text-stone-800">Drag & drop an image here, or <span class="text-amber-700 underline font-medium">browse file</span></p>
                <p class="text-xs text-stone-500 mt-1">Supports JPG, PNG, WEBP (up to 15MB)</p>
              </div>
            </div>

            <!-- Upload Preview Container -->
            <div id="vs-upload-preview-container" class="hidden p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-4">
              <div class="flex items-center gap-3 min-w-0">
                <img id="vs-upload-preview-img" src="" alt="Selected product" class="w-12 h-12 object-cover rounded-lg border border-stone-200 bg-white shrink-0" />
                <div class="min-w-0">
                  <div id="vs-upload-filename" class="text-xs font-semibold text-stone-900 truncate">image.png</div>
                  <div id="vs-upload-meta" class="text-[11px] text-stone-500 mt-0.5">Searching for matches...</div>
                </div>
              </div>
              <button
                type="button"
                onclick="document.getElementById('vs-file-input').click()"
                class="py-1.5 px-3 rounded-lg border border-stone-300 hover:border-amber-600 bg-white text-xs font-medium text-stone-700 hover:text-amber-700 transition-colors shrink-0 cursor-pointer"
              >
                Change Photo
              </button>
            </div>
          </div>

          <!-- TAB 2: LIVE CAMERA -->
          <div id="vs-panel-camera" class="${this.activeTab === 'camera' ? '' : 'hidden'} space-y-4">
            <div class="relative w-full aspect-video bg-stone-900 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">

              <!-- Video Feed -->
              <video id="vs-camera-feed" class="w-full h-full object-cover" autoplay playsinline muted></video>

              <!-- Subtle Centered Guide Frame -->
              <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div class="w-48 h-48 sm:w-56 sm:h-56 border-2 border-dashed border-white/60 rounded-2xl"></div>
              </div>

              <!-- Camera Framing Tip -->
              <div class="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none text-[11px] font-medium text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                Center product in frame
              </div>

              <div id="vs-camera-fallback" class="hidden absolute inset-0 bg-stone-100 flex flex-col items-center justify-center p-6 text-center">
                <div class="w-12 h-12 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center mb-3">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                </div>
                <h4 class="text-sm font-semibold text-stone-900 mb-1">Camera Stream Inactive</h4>
                <p class="text-xs text-stone-500 max-w-sm mb-4">Please grant camera permissions, or switch to the upload photo tab.</p>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    onclick="VisualSearchModule.startCameraStream()"
                    class="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Enable Camera
                  </button>
                  <button
                    type="button"
                    onclick="VisualSearchModule.switchTab('upload')"
                    class="py-2 px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Upload Photo Instead
                  </button>
                </div>
              </div>
            </div>

            <!-- Camera Shutter Button -->
            <div class="flex items-center justify-center gap-3">
              <button
                type="button"
                id="vs-capture-btn"
                onclick="VisualSearchModule.captureCameraSnapshot()"
                class="py-2.5 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold tracking-wide flex items-center gap-2 cursor-pointer shadow-sm hover:shadow transition-all"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                <span>Take Photo & Search</span>
              </button>
            </div>
          </div>

          

          <!-- HIDDEN VECTOR INSPECTOR (Kept in DOM for compatibility without visual clutter) -->
          <div id="vs-vector-inspector" class="hidden" style="display: none !important;">
            <div id="vs-active-query-label"></div>
            <div id="vs-latent-bars"></div>
          </div>

          <!-- RESULTS CONTAINER -->
          <div id="vs-results-container" class="hidden pt-4 border-t border-stone-200 space-y-3.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <h4 class="text-sm font-bold text-stone-900">Matching Products</h4>
                <span id="vs-match-count" class="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">0 matches</span>
              </div>
              <span class="text-xs text-stone-400">Best visual matches</span>
            </div>

            <div id="vs-results-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-3"></div>
          </div>

        </div>
      </div>
    `;
  },

  async startCameraStream() {
    const video = document.getElementById('vs-camera-feed');
    const fallback = document.getElementById('vs-camera-fallback');
    if (!video) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (fallback) fallback.classList.remove('hidden');
      return;
    }

    try {
      this.stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      this.cameraStream = stream;
      video.srcObject = stream;
      video.play();
      if (fallback) fallback.classList.add('hidden');
    } catch (err) {
      console.warn('[VisualSearchModule] Camera access not available:', err);
      if (fallback) fallback.classList.remove('hidden');
    }
  },

  stopCameraStream() {
    if (this.cameraStream) {
      try {
        this.cameraStream.getTracks().forEach(track => track.stop());
      } catch (_) {}
      this.cameraStream = null;
    }
    const video = document.getElementById('vs-camera-feed');
    if (video) {
      video.srcObject = null;
    }
  },

  async captureCameraSnapshot() {
    const video = document.getElementById('vs-camera-feed');
    if (!video || !this.cameraStream) {
      UIModule.showToast('Please enable camera before capturing snapshot.', 'warning');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    this.uploadedPreviewUrl = dataUrl;

    UIModule.showToast('Photo captured! Searching for matching products...', 'info');
    await this.processImageSearch(dataUrl, 'Camera Photo');
  },

  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById('vs-dropzone');
    if (dropzone) {
      dropzone.classList.add('border-amber-600', 'bg-amber-50/50');
      dropzone.classList.remove('border-stone-300', 'bg-stone-50/70');
    }
  },

  handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById('vs-dropzone');
    if (dropzone) {
      dropzone.classList.remove('border-amber-600', 'bg-amber-50/50');
      dropzone.classList.add('border-stone-300', 'bg-stone-50/70');
    }
  },

  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById('vs-dropzone');
    if (dropzone) {
      dropzone.classList.remove('border-amber-600', 'bg-amber-50/50');
      dropzone.classList.add('border-stone-300', 'bg-stone-50/70');
    }

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      this.handleFileSelected(file);
    }
  },

  handleFileUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (file) {
      this.handleFileSelected(file);
    }
  },

  handleFileSelected(file) {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      UIModule.showToast('Please select a valid image file (JPG, PNG, WEBP).', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      UIModule.showToast('Image file size must be less than 15MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      this.uploadedPreviewUrl = dataUrl;

      const previewCont = document.getElementById('vs-upload-preview-container');
      const previewImg = document.getElementById('vs-upload-preview-img');
      const filenameEl = document.getElementById('vs-upload-filename');
      const metaEl = document.getElementById('vs-upload-meta');

      if (previewCont && previewImg) {
        previewImg.src = dataUrl;
        if (filenameEl) filenameEl.innerText = file.name;
        if (metaEl) metaEl.innerText = `${(file.size / 1024).toFixed(1)} KB • ${file.type.replace('image/', '').toUpperCase()}`;
        previewCont.classList.remove('hidden');
      }

      await this.processImageSearch(dataUrl, file.name);
    };
    reader.readAsDataURL(file);
  },

  async processImageSearch(imageSource, label) {

    try {
      const res = await fetch('http://127.0.0.1:5000/api/search/visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageSource, top_k: 6, min_threshold: 0.35 })
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.status === 'success' && Array.isArray(json.results) && json.results.length > 0) {
          this.renderResults(json.results, label);
          return;
        }
      }
    } catch (_) {

    }

    const lower = (label || '').toLowerCase();
    let bestKey = 'watch';
    if (lower.includes('headphone') || lower.includes('audio') || lower.includes('earbud')) bestKey = 'headphones';
    else if (lower.includes('mouse') || lower.includes('gaming')) bestKey = 'mouse';
    else if (lower.includes('keyboard')) bestKey = 'keyboard';
    else if (lower.includes('drone') || lower.includes('camera')) bestKey = 'drone';
    else if (lower.includes('serum') || lower.includes('cream') || lower.includes('lotion') || lower.includes('moistur')) bestKey = 'moisturizer';
    else if (lower.includes('laptop') || lower.includes('computer') || lower.includes('macbook')) bestKey = 'laptop';
    else if (lower.includes('sunglass') || lower.includes('glasses')) bestKey = 'sunglasses';
    else if (lower.includes('watch') || lower.includes('chrono')) bestKey = 'watch';

    this.runPresetChip(bestKey, label);
  },

  runConceptSearch() {
    const input = document.getElementById('vs-concept-input');
    const query = input ? input.value.trim() : '';
    if (!query) {
      UIModule.showToast('Please enter a product name or category.', 'warning');
      return;
    }

    this.executePromptSearch(query);
  },

  async executePromptSearch(queryPrompt) {
    const qLower = (queryPrompt || '').toLowerCase().trim();
    if (!qLower) return;

    try {
      const res = await fetch('http://127.0.0.1:5000/api/search/visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: queryPrompt, top_k: 6, min_threshold: 0.35 })
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.status === 'success' && Array.isArray(json.results) && json.results.length > 0) {
          this.renderResults(json.results, queryPrompt);
          return;
        }
      }
    } catch (_) {

    }

    let targetVector = null;
    let matchProd = null;

    if (window.PRODUCT_EMBEDDINGS) {
      matchProd = (DataStore.products || []).find(p => {
        const ptext = `${p.name} ${p.description || ''} ${p.categoryName || ''} ${p.code || ''}`.toLowerCase();
        return ptext.includes(qLower) || qLower.split(/\s+/).some(w => w.length > 2 && ptext.includes(w));
      });
      if (matchProd && window.PRODUCT_EMBEDDINGS[matchProd.id]) {
        targetVector = window.PRODUCT_EMBEDDINGS[matchProd.id];
        this.uploadedPreviewUrl = DataStore.getProductImage(matchProd);
      }
    }

    if (!targetVector && window.SAMPLE_QUERY_EMBEDDINGS) {
      if (qLower.includes('watch') || qLower.includes('chrono')) targetVector = window.SAMPLE_QUERY_EMBEDDINGS['watch'];
      else if (qLower.includes('headphone') || qLower.includes('audio') || qLower.includes('earbud')) targetVector = window.SAMPLE_QUERY_EMBEDDINGS['headphones'];
      else if (qLower.includes('drone')) targetVector = window.SAMPLE_QUERY_EMBEDDINGS['drone'];
      else if (qLower.includes('keyboard')) targetVector = window.SAMPLE_QUERY_EMBEDDINGS['keyboard'];
      else if (qLower.includes('mouse') || qLower.includes('gaming')) targetVector = window.SAMPLE_QUERY_EMBEDDINGS['mouse'];
      else if (qLower.includes('serum') || qLower.includes('moistur') || qLower.includes('skincare') || qLower.includes('cream')) targetVector = window.SAMPLE_QUERY_EMBEDDINGS['moisturizer'];
      else if (qLower.includes('laptop') || qLower.includes('macbook') || qLower.includes('computer')) targetVector = window.SAMPLE_QUERY_EMBEDDINGS['laptop'] || (window.PRODUCT_EMBEDDINGS && window.PRODUCT_EMBEDDINGS['14']);
      else if (qLower.includes('sunglass') || qLower.includes('glasses')) targetVector = window.SAMPLE_QUERY_EMBEDDINGS['sunglasses'] || (window.PRODUCT_EMBEDDINGS && window.PRODUCT_EMBEDDINGS['9']);
      else if (qLower.includes('shoe') || qLower.includes('sneaker') || qLower.includes('running')) targetVector = (window.PRODUCT_EMBEDDINGS && window.PRODUCT_EMBEDDINGS['10']) || window.SAMPLE_QUERY_EMBEDDINGS['watch'];
      else if (qLower.includes('chair') || qLower.includes('office')) targetVector = (window.PRODUCT_EMBEDDINGS && window.PRODUCT_EMBEDDINGS['7']);
      else if (qLower.includes('kettle') || qLower.includes('coffee') || qLower.includes('tea')) targetVector = (window.PRODUCT_EMBEDDINGS && window.PRODUCT_EMBEDDINGS['8']);
      else if (qLower.includes('cable') || qLower.includes('charger') || qLower.includes('type-c')) targetVector = (window.PRODUCT_EMBEDDINGS && window.PRODUCT_EMBEDDINGS['11']);
    }

    if (!targetVector) {
      targetVector = (window.SAMPLE_QUERY_EMBEDDINGS && window.SAMPLE_QUERY_EMBEDDINGS['watch']) || (window.PRODUCT_EMBEDDINGS && window.PRODUCT_EMBEDDINGS['1']);
    }

    this.calculateSimilarityAndRender(targetVector, queryPrompt);
  },

  runPresetChip(key, customLabel) {
    const chip = this.presetChips.find(c => c.key === key);
    const label = customLabel || (chip ? chip.label : key);

    let vector = null;
    if (chip && chip.targetId && window.PRODUCT_EMBEDDINGS && window.PRODUCT_EMBEDDINGS[chip.targetId]) {
      vector = window.PRODUCT_EMBEDDINGS[chip.targetId];
    } else if (window.SAMPLE_QUERY_EMBEDDINGS && window.SAMPLE_QUERY_EMBEDDINGS[key]) {
      vector = window.SAMPLE_QUERY_EMBEDDINGS[key];
    }

    if (chip && chip.targetId) {
      const prod = (DataStore.products || []).find(p => Number(p.id) === Number(chip.targetId));
      if (prod) {
        this.uploadedPreviewUrl = DataStore.getProductImage(prod);
      }
    }

    if (vector) {
      this.calculateSimilarityAndRender(vector, label);
    } else {
      this.executePromptSearch(label);
    }
  },

  calculateSimilarityAndRender(queryVector, queryLabel) {
    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      UIModule.showToast('Unable to process search.', 'error');
      return;
    }

    this.lastQueryLabel = queryLabel;
    this.lastQueryVector = queryVector;

    let allProducts = DataStore.products || [];
    if (!allProducts || allProducts.length === 0) {
      try {
        allProducts = JSON.parse(localStorage.getItem('omnicart_products') || '[]');
      } catch (_) {}
    }

    const scoredProducts = allProducts.map(p => {
      let pVec = p.embedding;
      if (!pVec || !Array.isArray(pVec) || pVec.length < 10) {
        if (typeof DataStore.getProductEmbedding === 'function') {
          pVec = DataStore.getProductEmbedding(p);
        } else if (window.PRODUCT_EMBEDDINGS) {
          pVec = window.PRODUCT_EMBEDDINGS[p.id] || window.PRODUCT_EMBEDDINGS[String(p.id)];
        }
      }

      if (!pVec || pVec.length === 0) {
        return { ...p, similarity: 0.0, matchPercentage: 0 };
      }

      let dot = 0;
      let normQ = 0;
      let normP = 0;
      const len = Math.min(queryVector.length, pVec.length);
      for (let i = 0; i < len; i++) {
        dot += queryVector[i] * pVec[i];
        normQ += queryVector[i] * queryVector[i];
        normP += pVec[i] * pVec[i];
      }

      const sim = dot / (Math.sqrt(normQ) * Math.sqrt(normP) || 1);

      let calibratedPct = 0;
      if (sim > 0.20) {
        calibratedPct = 40.0 + ((sim - 0.20) / (0.65 - 0.20)) * 58.0;
        calibratedPct = Math.round(Math.min(99, Math.max(25, calibratedPct)));
      }

      return {
        ...p,
        similarity: sim,
        matchPercentage: calibratedPct
      };
    });

    scoredProducts.sort((a, b) => b.similarity - a.similarity);

    const finalResults = scoredProducts.slice(0, 5);

    const vsPayload = {
      queryLabel: queryLabel || 'Visual Search',
      queryImage: this.uploadedPreviewUrl || null,
      results: finalResults.map(p => ({
        id: p.id,
        name: p.name || 'Product',
        code: p.code || `PROD-00${p.id}`,
        categoryName: p.categoryName || 'General',
        currentPrice: p.currentPrice || 999,
        originalPrice: p.originalPrice || Math.round((p.currentPrice || 999) * 1.4),
        images: p.images || [{ url: DataStore.getProductImage(p), imageUrl: DataStore.getProductImage(p) }],
        imageUrl: DataStore.getProductImage(p),
        stockQuantity: p.stockQuantity ?? 15,
        rating: p.rating || 0.0,
        similarity: p.similarity,
        matchPercentage: p.matchPercentage
      }))
    };

    try {
      sessionStorage.setItem('omnicart_visual_search_data', JSON.stringify(vsPayload));
      localStorage.setItem('omnicart_visual_search_data', JSON.stringify(vsPayload));
    } catch (_) {}

    this.closeModal();

    if (window.location.pathname.endsWith('products.html') && window.CatalogModule && typeof window.CatalogModule.loadVisualSearchResults === 'function') {
      try { window.history.replaceState({}, '', 'products.html?visual_search=true'); } catch (_) {}
      window.CatalogModule.loadVisualSearchResults();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.href = 'products.html?visual_search=true';
    }
  },

  renderResults(results, queryLabel) {
    if (!Array.isArray(results) || results.length === 0) {
      UIModule.showToast('No matching products found.', 'warning');
      return;
    }

    const allProducts = DataStore.products || [];
    const top5 = results.slice(0, 5).map(res => {
      const pid = res.id || res.productId || res.ProductID;
      const localProd = allProducts.find(item => Number(item.id) === Number(pid) || String(item.code) === String(pid)) || res;
      return {
        id: localProd.id || pid,
        name: localProd.name || res.name || 'Matching Product',
        code: localProd.code || `PROD-00${localProd.id || pid}`,
        categoryName: localProd.categoryName || localProd.category || 'General',
        currentPrice: localProd.currentPrice || res.price || 999,
        originalPrice: localProd.originalPrice || Math.round((localProd.currentPrice || 999) * 1.4),
        images: localProd.images || [{ url: DataStore.getProductImage(localProd), imageUrl: DataStore.getProductImage(localProd) }],
        imageUrl: DataStore.getProductImage(localProd),
        stockQuantity: localProd.stockQuantity ?? 15,
        rating: localProd.rating || 0.0,
        similarity: res.similarity || 0.85,
        matchPercentage: Math.round(parseFloat(res.match_percentage || res.matchPercentage || (res.similarity ? res.similarity * 100 : 85)))
      };
    });

    const vsPayload = {
      queryLabel: queryLabel || 'Visual Search',
      queryImage: this.uploadedPreviewUrl || null,
      results: top5
    };

    try {
      sessionStorage.setItem('omnicart_visual_search_data', JSON.stringify(vsPayload));
      localStorage.setItem('omnicart_visual_search_data', JSON.stringify(vsPayload));
    } catch (_) {}

    this.closeModal();
    if (window.location.pathname.endsWith('products.html') && window.CatalogModule && typeof window.CatalogModule.loadVisualSearchResults === 'function') {
      try { window.history.replaceState({}, '', 'products.html?visual_search=true'); } catch (_) {}
      window.CatalogModule.loadVisualSearchResults();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.href = 'products.html?visual_search=true';
    }
  },

  addToCartFromSearch(productId) {
    const prod = (DataStore.products || []).find(p => String(p.id) === String(productId) || p.code === String(productId));
    if (!prod) {
      UIModule.showToast('Product not found in catalog.', 'error');
      return;
    }
    if ((prod.stockQuantity ?? 15) <= 0) {
      UIModule.showToast(`"${prod.name}" is currently sold out.`, 'error');
      return;
    }

    try {
      DataStore.addToCart(prod, 1);
      UIModule.showToast(`Added "${prod.name}" to cart!`, 'success');
      UIModule.renderHeader();
    } catch (err) {
      UIModule.showToast(err.message || 'Could not add to cart.', 'error');
    }
  }
};

window.VisualSearchModule = VisualSearchModule;
