
const OrdersModule = {
  reviewsCache: {},
  currentReviewOrderId: null,
  currentReviewProductId: null,
  currentRatingValue: 5,

  async loadDeliveredOrdersReviews() {
    const deliveredOrders = (DataStore.orders || []).filter(o => o.shippingStatus === 'DELIVERED');
    for (const ord of deliveredOrders) {
      if (ord.id) {
        try {
          const revs = await DataStore.getOrderReviews(ord.id);
          this.reviewsCache[ord.id] = revs || [];
        } catch (_) {
          this.reviewsCache[ord.id] = [];
        }
      }
    }
  },

  backendStatusMap: {
    'Pending': 'ORDER_PLACED',
    'Processing': 'PROCESSING',
    'Shipped': 'SHIPPED',
    'In Transit': 'OUT_FOR_DELIVERY',
    'Delivered': 'DELIVERED',
    'Cancelled': 'CANCELLED',
    'Returned': 'CANCELLED'
  },

  normalizeBackendOrder(backendOrder) {
    const normalized = { ...backendOrder };

    if (normalized.shippingStatus) {
      const matchKey = Object.keys(this.backendStatusMap).find(
        k => k.toLowerCase() === String(normalized.shippingStatus).toLowerCase()
      );
      if (matchKey) {
        normalized.shippingStatus = this.backendStatusMap[matchKey];
      }
    }

    if (!normalized.deliveryAddress) {
      normalized.deliveryAddress = (DataStore.addresses && DataStore.addresses[0])
        ? `${DataStore.addresses[0].street}, ${DataStore.addresses[0].city} ${DataStore.addresses[0].pincode}`
        : (DataStore.addresses && DataStore.addresses[0] ? `${DataStore.addresses[0].street}, ${DataStore.addresses[0].city}${DataStore.addresses[0].state ? ', ' + DataStore.addresses[0].state : ''}` : 'Standard Dispatch');
    }

    if (!normalized.orderNumber && normalized.id) {
      normalized.orderNumber = `ORD-${normalized.id}`;
    }

    if (Array.isArray(normalized.items)) {
      normalized.items = normalized.items.map(item => {
        const norm = { ...item };
        if (!norm.name && norm.productName) norm.name = norm.productName;
        if ((!norm.price || Number(norm.price) === 0) && norm.exactLedgerPrice) {
          norm.price = Number(norm.exactLedgerPrice);
        }
        if (!norm.id && norm.productId) norm.id = norm.productId;
        if (!norm.image && norm.imageUrl) norm.image = norm.imageUrl;
        norm.status = norm.status || 'ACTIVE';
        if (!norm.sellerId) {
          const p = (DataStore.products || []).find(x => Number(x.id) === Number(norm.productId || norm.id));
          if (p) {
            norm.sellerId = p.sellerId;
            norm.sellerName = p.sellerName || (DataStore.sellers && DataStore.sellers.find(s => s.id == p.sellerId)?.companyName);
          }
        }
        return norm;
      });

      const nonCancelled = normalized.items.filter(it => String(it.status || '').toUpperCase() !== 'CANCELLED');
      const deliveredCount = nonCancelled.filter(it => String(it.status || '').toUpperCase() === 'DELIVERED').length;
      if (nonCancelled.length > 0 && deliveredCount === nonCancelled.length) {
        normalized.shippingStatus = 'DELIVERED';
      } else if (deliveredCount > 0 && deliveredCount < nonCancelled.length) {
        normalized.shippingStatus = 'PARTIALLY_DELIVERED';
      }
    }

    if ((!normalized.totalAmount || Number(normalized.totalAmount) === 0) && normalized.payment) {
      normalized.totalAmount = Number(normalized.payment.paidAmount) || 0;
    }

    if (!normalized.paymentMethod && normalized.payment && normalized.payment.paymentMethod) {
      normalized.paymentMethod = normalized.payment.paymentMethod;
    }

    return normalized;
  },

  async init() {

    if (DataStore.currentUser) {
      try {
        const res = await DataStore.apiRequest(`/customers/${DataStore.currentUser.id}/orders`);
        if (res && res.success && res.data && Array.isArray(res.data.content)) {

          const backendOrders = res.data.content.map(o => this.normalizeBackendOrder(o));

          const otherCustomersOrders = (DataStore.orders || []).filter(
            o => o.customerId && Number(o.customerId) !== Number(DataStore.currentUser.id)
          );
          DataStore.orders = [...backendOrders, ...otherCustomersOrders];
          localStorage.setItem('omnicart_orders', JSON.stringify(DataStore.orders));
        }
      } catch (e) {
        console.warn('[OrdersModule] Using cached orders.');
      }
      await this.loadDeliveredOrdersReviews();
    }

    this.renderOrdersList();

    const urlParams = new URLSearchParams(window.location.search);
    const reqReviewOrder = urlParams.get('reviewOrder');
    const reqReviewProduct = urlParams.get('reviewProduct');
    if (reqReviewOrder && reqReviewProduct) {
      setTimeout(() => {
        this.openReviewModal(reqReviewOrder, reqReviewProduct);
      }, 350);
    }
  },

  renderOrdersList() {
    const container = document.getElementById('orders-list-container');
    if (!container) return;

    if (!DataStore.currentUser || DataStore.currentUserRole !== 'buyer') {
      container.innerHTML = UIModule.getPermissionDeniedHtml({
        title: 'Authentication Required: Track Orders',
        message: 'Sign in to your customer account to view live shipment telemetry, 20-minute dispatch routing, and GST tax invoices.',
        requiredRole: 'buyer',
        returnUrl: 'products.html',
        actionText: 'Sign In to Your Account'
      });
      return;
    }

    const currentUserId = Number(DataStore.currentUser.id);
    const orders = (DataStore.orders || []).filter(o => !o.customerId || Number(o.customerId) === currentUserId);

    if (!orders || orders.length === 0) {
      container.innerHTML = UIModule.getEmptyStateHtml({
        icon: 'orders',
        title: 'No Orders Placed Yet',
        description: 'When you place orders, real-time shipment tracking, live telemetry, and official tax invoices will appear here.',
        actionText: 'Explore Marketplace Catalog →',
        actionUrl: 'products.html'
      });
      return;
    }

    container.innerHTML = orders.map(order => {
      const isCancelled = order.shippingStatus === 'CANCELLED';
      const isDelivered = order.shippingStatus === 'DELIVERED';
      const isOutForDelivery = order.shippingStatus === 'OUT_FOR_DELIVERY';

      const statusMap = {
        'ORDER_PLACED': { text: 'Order Placed', badge: 'badge-gold', step: 1 },
        'PROCESSING': { text: 'Verified at Hub', badge: 'badge-gold', step: 2 },
        'SHIPPED': { text: 'Dispatched', badge: 'badge-gold', step: 3 },
        'OUT_FOR_DELIVERY': { text: 'Out for Delivery (20-Min)', badge: 'badge-green', step: 4 },
        'PARTIALLY_DELIVERED': { text: 'Partially Delivered', badge: 'badge-gold', step: 4 },
        'DELIVERED': { text: 'Delivered', badge: 'badge-green', step: 5 },
        'CANCELLED': { text: 'Cancelled', badge: 'badge-red', step: 0 }
      };

      const statusInfo = statusMap[order.shippingStatus] || statusMap['ORDER_PLACED'];
      const activeStep = statusInfo.step;
      const safeOrderNum = UIModule.escapeHtml(order.orderNumber || (order.id ? `ORD-${order.id}` : 'ORD-101'));
      const safeOrderDate = UIModule.escapeHtml(order.orderDate ? (order.orderDate.split('T')[0] || order.orderDate) : 'Today');
      const rawPayMethod = String(order.paymentMethod || (order.payment && order.payment.paymentMethod) || 'UPI Instant Transfer');
      const isCOD = rawPayMethod.toLowerCase().includes('cash') ||
                    rawPayMethod.toLowerCase().includes('delivery') ||
                    rawPayMethod.toLowerCase().includes('pod');
      const safePayMethod = UIModule.escapeHtml(rawPayMethod);
      const safeAddress = UIModule.escapeHtml(order.deliveryAddress || 'Standard Delivery Hub');

      let resolvedTotal = Number(order.totalAmount);
      if (isNaN(resolvedTotal) || resolvedTotal <= 0) {
        resolvedTotal = Number(order.dueOnDelivery);
      }
      if (isNaN(resolvedTotal) || resolvedTotal <= 0) {
        resolvedTotal = Number(order.subtotal);
      }
      if (isNaN(resolvedTotal) || resolvedTotal <= 0) {
        resolvedTotal = Number(order.payment && order.payment.paidAmount);
      }
      if ((isNaN(resolvedTotal) || resolvedTotal <= 0) && Array.isArray(order.items)) {
        resolvedTotal = order.items.reduce((acc, it) => acc + (Number(it.price || it.exactLedgerPrice || 0) * Number(it.quantity || 1)), 0);
      }
      if (isNaN(resolvedTotal) || resolvedTotal <= 0) {
        resolvedTotal = 4999;
      }

      return `
        <div class="clean-card p-6 sm:p-7 space-y-6 mb-6">

          <!-- Order Card Header -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2a2520]">
            <div>
              <div class="flex items-center gap-2.5 flex-wrap">
                <span class="font-bold text-[#e8e2d9] text-base">Order #${order.id || safeOrderNum.replace('ORD-', '')}</span>
                <span class="badge ${statusInfo.badge}">${statusInfo.text}</span>
                ${isCOD ? '<span class="badge border border-[#c8a96e]/40 bg-[#c8a96e]/10 text-[#c8a96e] text-[10px]">Pay on Delivery</span>' : (order.razorpayPaymentId || safePayMethod.includes('pay_') || safePayMethod.includes('RZP-') ? `<span class="badge border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px]">Razorpay: ${UIModule.escapeHtml(order.razorpayPaymentId || safePayMethod)}</span>` : '<span class="badge border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px]">Razorpay: Paid Online</span>')}
              </div>
              <p class="text-xs text-[#9a9188] mt-1.5">
                Placed on <strong class="text-[#e8e2d9]">${safeOrderDate}</strong> •
                ${isCOD ? `<span class="text-[#c8a96e] font-semibold">Pay on Delivery</span> (Cash or UPI to courier upon handover)` : `Paid via ${safePayMethod}`}
              </p>
            </div>

            <div class="text-left sm:text-right">
              <span class="text-xs text-[#9a9188] block font-medium">${isCOD ? 'Payable on Delivery' : 'Total Paid'}</span>
              <span class="text-xl font-bold ${isCOD ? 'text-[#e8c98e]' : 'text-[#c8a96e]'}">${UIModule.formatCurrency(resolvedTotal)}</span>
            </div>
          </div>

          <!-- Live Shipment Tracker (5 Steps) -->
          ${!isCancelled ? `
            <div class="py-2">
              <div class="flex items-center justify-between">
                <div class="tracker-step ${activeStep >= 1 ? (activeStep > 1 ? 'completed' : 'active') : ''}">
                  <div class="tracker-step-icon">${activeStep > 1 ? '✓' : '1'}</div>
                  <span class="text-[11px] font-semibold text-[#9a9188] mt-1.5 text-center">Placed</span>
                </div>
                <div class="tracker-step ${activeStep >= 2 ? (activeStep > 2 ? 'completed' : 'active') : ''}">
                  <div class="tracker-step-icon">${activeStep > 2 ? '✓' : '2'}</div>
                  <span class="text-[11px] font-semibold text-[#9a9188] mt-1.5 text-center">Packed</span>
                </div>
                <div class="tracker-step ${activeStep >= 3 ? (activeStep > 3 ? 'completed' : 'active') : ''}">
                  <div class="tracker-step-icon">${activeStep > 3 ? '✓' : '3'}</div>
                  <span class="text-[11px] font-semibold text-[#9a9188] mt-1.5 text-center">Dispatched</span>
                </div>
                <div class="tracker-step ${activeStep >= 4 ? (activeStep > 4 ? 'completed' : 'active') : ''}">
                  <div class="tracker-step-icon">${activeStep > 4 ? '✓' : '4'}</div>
                  <span class="text-[11px] font-semibold text-[#9a9188] mt-1.5 text-center">Near You (20m)</span>
                </div>
                <div class="tracker-step ${activeStep >= 5 ? 'completed' : ''}">
                  <div class="tracker-step-icon">${activeStep >= 5 ? '✓' : '5'}</div>
                  <span class="text-[11px] font-semibold text-[#9a9188] mt-1.5 text-center">Delivered</span>
                </div>
              </div>
            </div>
          ` : `
            <div class="p-3.5 bg-[#2d1212] rounded border border-[#ef4444]/40 text-xs text-[#fca5a5] flex items-center gap-2">
              <span class="text-red-400 font-bold">•</span>
              <span>This order has been cancelled and stock inventory restored.</span>
            </div>
          `}

          <!-- Order Items List -->
          <div class="divide-y divide-[#2a2520] bg-[#0d0c0a] rounded p-4 border border-[#1f1b17]">
            ${(order.items || []).map(item => {
              const safeItemName = UIModule.escapeHtml(item.name || 'Product');
              const safeImg = UIModule.escapeHtml(DataStore.getProductImage(item));
              const itemTotal = Math.round(item.price * item.quantity * 100) / 100;
              const itemId = item.id || item.productId;
              const isItemCancelled = (item.status && String(item.status).toUpperCase() === 'CANCELLED') || isCancelled;
              return `
              <div class="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-3 ${isItemCancelled ? 'opacity-80' : ''}">
                <div class="flex items-center gap-3 min-w-0">
                  <img src="${safeImg}" alt="${safeItemName}" onerror="this.onerror=null; this.src='images/f7369fc9-8a6a-40cb-9090-f8be441e1bfb.jpg';" class="w-12 h-12 object-contain bg-[#161412] rounded p-1 border border-[#2a2520] shrink-0 ${isItemCancelled ? 'grayscale' : ''}" />
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h5 class="text-xs font-semibold ${isItemCancelled ? 'text-[#a8a29e] line-through' : 'text-[#e8e2d9]'} truncate">${safeItemName}</h5>
                      ${isItemCancelled ? `
                        <span class="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#ef4444]/20 text-[#f87171] border border-[#ef4444]/40 uppercase tracking-wide shrink-0">
                          Cancelled
                        </span>
                      ` : ''}
                    </div>
                    <span class="text-[11px] text-[#9a9188]">Qty: ${item.quantity} × ${UIModule.formatCurrency(item.price)}</span>
                    ${isItemCancelled ? `<span class="block text-[10px] text-[#f87171] font-medium mt-0.5">Item Cancelled • Stock Restored</span>` : ''}
                  </div>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                  <div class="text-right">
                    <strong class="text-xs font-bold ${isItemCancelled ? 'text-[#a8a29e] line-through' : 'text-[#e8e2d9]'}">${UIModule.formatCurrency(itemTotal)}</strong>
                    ${isItemCancelled ? `<span class="block text-[10px] text-[#f87171] font-semibold">Cancelled</span>` : ''}
                  </div>
                  ${(!isCancelled && !isDelivered) ? (
                    isItemCancelled ? `
                      <span class="text-[11px] px-2.5 py-1 rounded bg-[#241515] text-[#fca5a5]/70 border border-[#ef4444]/20 cursor-not-allowed">
                        Cancelled
                      </span>
                    ` : `
                      <button
                        onclick="OrdersModule.cancelOrderItem(${order.id}, ${itemId}, '${safeItemName.replace(/'/g, "\\'")}')"
                        class="text-[11px] px-2.5 py-1 rounded bg-[#2a1717] hover:bg-[#3d1a1a] text-[#fca5a5] border border-[#ef4444]/30 hover:border-[#ef4444]/60 transition-colors cursor-pointer"
                        title="Cancel this item from order"
                      >
                        Cancel Item
                      </button>
                    `
                  ) : (isDelivered && !isItemCancelled) ? (() => {
                    const existingReview = (this.reviewsCache[order.id] || []).find(r => Number(r.productId) === Number(itemId));
                    if (existingReview) {
                      return `
                        <button
                          type="button"
                          onclick="OrdersModule.openReviewModal(${order.id}, ${itemId})"
                          class="text-[11px] px-2.5 py-1 rounded bg-[#1c1916] hover:bg-[#25201b] text-[#c8a96e] border border-[#c8a96e]/40 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                          title="Click to view or edit your review"
                        >
                          <span class="text-amber-400 font-bold">★ ${existingReview.rating}/5</span>
                          <span class="text-[10px] text-[#9a9188] hidden sm:inline">Reviewed (Edit)</span>
                        </button>
                      `;
                    } else {
                      return `
                        <button
                          type="button"
                          onclick="OrdersModule.openReviewModal(${order.id}, ${itemId})"
                          class="text-[11px] px-3 py-1 rounded bg-gradient-to-r from-[#c8a96e] to-[#b89355] text-black font-semibold hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                          title="Leave a review for this delivered product"
                        >
                          <span>⭐</span>
                          <span>Write Review</span>
                        </button>
                      `;
                    }
                  })() : ''}
                </div>
              </div>
            `;
            }).join('')}
          </div>

          <!-- Order Footer Details & Actions -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-2">
            <div class="text-[#9a9188]">
              <span>Delivery Destination: </span>
              <strong class="text-[#e8e2d9]">${safeAddress}</strong>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              ${(!isCancelled && !isDelivered) ? `
                <button
                  onclick="OrdersModule.cancelOrder(${order.id})"
                  class="btn-secondary text-xs py-1.5 px-3 text-[#fca5a5] hover:border-[#ef4444]/60"
                >
                  Cancel Order
                </button>
              ` : ''}
              <button
                onclick="OrdersModule.downloadInvoice(${order.id})"
                class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <span>Download Invoice</span>
              </button>
            </div>
          </div>

        </div>
      `;
    }).join('');
  },

  async cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this entire order? Stock will be immediately restored.')) {
      return;
    }

    try {
      await DataStore.cancelOrder(orderId);
      UIModule.showToast('Order cancelled successfully and stock restored', 'info');
      await this.init();
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to cancel order.', 'error');
    }
  },

  async cancelOrderItem(orderId, productId, productName) {
    if (!confirm(`Are you sure you want to cancel "${productName || 'this item'}" from Order #${orderId}? Stock will be immediately restored.`)) {
      return;
    }

    try {
      await DataStore.cancelOrderItem(orderId, productId);
      UIModule.showToast(`"${productName || 'Item'}" cancelled successfully and stock restored`, 'info');
      await this.init();
    } catch (err) {
      UIModule.showToast(err.message || 'Failed to cancel item.', 'error');
    }
  },

  downloadInvoice(orderId) {
    const order = (DataStore.orders || []).find(o => Number(o.id) === Number(orderId));
    if (!order) {
      UIModule.showToast('Order details not found.', 'error');
      return;
    }
    const safeOrderNum = order.orderNumber || `ORD-${order.id}`;
    const itemsHtml = (order.items || []).map((it, idx) => {
      const isItemCancelled = it.status && String(it.status).toUpperCase() === 'CANCELLED';
      return `
      <tr style="${isItemCancelled ? 'background-color:#fff1f2;' : ''}">
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-size:12px;">${idx + 1}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-size:12px;">
          <strong style="${isItemCancelled ? 'text-decoration:line-through;color:#94a3b8;' : ''}">${it.name || 'Product'}</strong>
          ${isItemCancelled ? '<span style="color:#ef4444;font-size:10px;font-weight:bold;margin-left:6px;">[CANCELLED - REFUNDED]</span>' : ''}
        </td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:center;">${it.quantity}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:right;">₹${Number(it.price).toLocaleString('en-IN')}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:right;">
          <strong style="${isItemCancelled ? 'text-decoration:line-through;color:#94a3b8;' : ''}">₹${Number(it.price * it.quantity).toLocaleString('en-IN')}</strong>
          ${isItemCancelled ? '<div style="font-size:10px;color:#ef4444;font-weight:600;">Refunded (₹0)</div>' : ''}
        </td>
      </tr>
    `;
    }).join('');

    const isCOD = String(order.paymentMethod || '').toLowerCase().includes('delivery') || String(order.paymentMethod || '').toLowerCase().includes('cash') || String(order.paymentStatus || '').toLowerCase().includes('delivery') || order.paymentMethodId === 5;

    const invoiceContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OmniCart Invoice - ${safeOrderNum}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #0f172a; padding-bottom: 20px; }
          .logo { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
          .badge { background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 25px 0; }
          th { background: #f8fafc; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 2px solid #cbd5e1; }
          .total-box { margin-left: auto; width: 280px; text-align: right; }
          .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
          .grand-total { font-size: 18px; font-weight: bold; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 8px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">OMNICART</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">GSTIN: 29AABCO1234F1Z5 • 20-Min Express Fulfillment</div>
          </div>
          <div style="text-align:right;">
            <span class="badge">OFFICIAL TAX INVOICE</span>
            <div style="font-size:14px;font-weight:bold;margin-top:8px;">${safeOrderNum}</div>
            <div style="font-size:12px;color:#64748b;">Date: ${order.orderDate || 'Today'}</div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-bottom:20px;font-size:12px;">
          <div>
            <strong style="display:block;margin-bottom:4px;color:#0f172a;">Billed / Shipped To:</strong>
            <div>${order.recipientName || order.customerName || (DataStore.currentUser ? (`${DataStore.currentUser.FirstName || ''} ${DataStore.currentUser.LastName || ''}`.trim() || DataStore.currentUser.email || 'Valued Customer') : 'Valued Customer')}</div>
            <div style="color:#64748b;">${order.deliveryAddress || 'Standard Delivery Hub'}</div>
            <div style="color:#64748b;">Payment Method: ${order.paymentMethod || 'UPI'} (${isCOD ? 'Pay on Delivery' : 'Paid'})</div>
          </div>
          <div style="text-align:right;">
            <strong style="display:block;margin-bottom:4px;color:#0f172a;">Fulfillment Hub:</strong>
            <div>OmniCart Express Dark Store #04</div>
            <div style="color:#64748b;">Status: ${order.shippingStatus || 'Delivered'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th>Product Description</th>
              <th style="text-align:center;width:60px;">Qty</th>
              <th style="text-align:right;width:110px;">Unit Price</th>
              <th style="text-align:right;width:110px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-row"><span>Subtotal:</span><span>₹${Number(order.totalAmount || order.subtotal || 0).toLocaleString('en-IN')}</span></div>
          <div class="total-row"><span>Express Delivery:</span><span style="color:#16a34a;font-weight:bold;">FREE</span></div>
          <div class="total-row grand-total"><span>${isCOD ? 'Payable on Delivery:' : 'Total Paid:'}</span><span>₹${Number(order.totalAmount || order.subtotal || 0).toLocaleString('en-IN')}</span></div>
        </div>

        <div class="footer">
          This is a computer-generated invoice and does not require a physical signature.<br/>
          OmniCart Technologies Pvt Ltd • Thank you for your business!
        </div>
        <script>
          window.print();
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(invoiceContent);
      printWin.document.close();
    } else {
      UIModule.showToast('Popup blocker prevented invoice opening. Please allow popups.', 'info');
    }
  },

  openReviewModal(orderId, productId, explicitName) {
    this.currentReviewOrderId = Number(orderId);
    this.currentReviewProductId = Number(productId);

    const ord = (DataStore.orders || []).find(o => Number(o.id) === Number(orderId));
    const item = ord && ord.items ? ord.items.find(it => Number(it.productId || it.id) === Number(productId)) : null;
    const productName = explicitName || (item ? item.name : `Product #${productId}`);
    const existing = (this.reviewsCache[orderId] || []).find(r => Number(r.productId) === Number(productId));

    this.currentRatingValue = existing ? Number(existing.rating || 5) : 5;
    const initialTitle = existing ? (existing.title || '') : '';
    const initialComment = existing ? (existing.comment || '') : '';

    let modal = document.getElementById('review-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'review-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm hidden';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="relative w-full max-w-lg bg-[#131110] rounded-xl border border-[#2a2520] p-6 sm:p-7 shadow-2xl space-y-5 animate-fade-in text-xs">
        <button type="button" onclick="OrdersModule.closeReviewModal()" class="absolute top-4 right-4 text-[#9a9188] hover:text-[#e8e2d9] text-xl font-bold cursor-pointer">✕</button>

        <div>
          <span class="text-[10px] tracking-widest uppercase font-semibold text-[#c8a96e] block mb-1">Verified Purchase Experience</span>
          <h3 class="text-lg font-serif font-bold text-white">Rate & Review Product</h3>
          <p class="text-xs text-[#9a9188] mt-0.5 truncate max-w-sm">${UIModule.escapeHtml(productName)} (Order #${orderId})</p>
        </div>

        <form onsubmit="OrdersModule.submitReview(event)" class="space-y-4">
          <div>
            <label class="block font-semibold text-[#e8e2d9] mb-2">Overall Rating <span class="text-red-400">*</span></label>
            <div class="flex items-center gap-2" id="review-stars-container">
              ${[1, 2, 3, 4, 5].map(star => `
                <button
                  type="button"
                  onclick="OrdersModule.setRating(${star})"
                  onmouseenter="OrdersModule.previewRating(${star})"
                  onmouseleave="OrdersModule.previewRating(${this.currentRatingValue})"
                  class="star-btn text-2xl transition-transform hover:scale-110 focus:outline-none cursor-pointer ${star <= this.currentRatingValue ? 'text-amber-400' : 'text-[#443e37]'}"
                  data-star="${star}"
                  title="${star} Stars"
                >★</button>
              `).join('')}
              <span id="review-rating-label" class="text-xs font-bold text-[#c8a96e] ml-2">${this.currentRatingValue} of 5 Stars</span>
            </div>
          </div>

          <div>
            <label class="block font-semibold text-[#e8e2d9] mb-1">Review Title <span class="text-[#9a9188] font-normal">(optional)</span></label>
            <input
              type="text"
              id="review-title-input"
              maxlength="150"
              placeholder="e.g. Outstanding quality, fast delivery!"
              value="${UIModule.escapeHtml(initialTitle)}"
              class="clean-input text-xs w-full"
            />
          </div>

          <div>
            <label class="block font-semibold text-[#e8e2d9] mb-1">Review Comment <span class="text-red-400">*</span></label>
            <textarea
              id="review-comment-input"
              rows="4"
              required
              maxlength="2000"
              placeholder="Share what you liked, product performance, or the fast 20-min fulfillment..."
              class="clean-input text-xs w-full py-2.5 leading-relaxed resize-none"
            >${UIModule.escapeHtml(initialComment)}</textarea>
            <span class="text-[10px] text-[#9a9188] block text-right mt-1">Review recorded into OmniCart database</span>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2 border-t border-[#2a2520]">
            <button
              type="button"
              onclick="OrdersModule.closeReviewModal()"
              class="btn-secondary py-2.5 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="review-submit-btn"
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
    const modal = document.getElementById('review-modal');
    if (modal) modal.classList.add('hidden');
  },

  setRating(val) {
    this.currentRatingValue = val;
    this.previewRating(val);
  },

  previewRating(val) {
    const stars = document.querySelectorAll('#review-stars-container .star-btn');
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
    const label = document.getElementById('review-rating-label');
    if (label) {
      const labels = { 1: '1 of 5 (Poor)', 2: '2 of 5 (Fair)', 3: '3 of 5 (Good)', 4: '4 of 5 (Very Good)', 5: '5 of 5 (Excellent)' };
      label.innerText = labels[val] || `${val} of 5 Stars`;
    }
  },

  async submitReview(e) {
    e.preventDefault();
    const btn = document.getElementById('review-submit-btn');
    const titleInput = document.getElementById('review-title-input');
    const commentInput = document.getElementById('review-comment-input');

    const title = titleInput ? titleInput.value.trim() : '';
    const comment = commentInput ? commentInput.value.trim() : '';

    if (!comment) {
      UIModule.showToast('Please provide a comment for your review.', 'error');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerText = 'Submitting...';
    }

    try {
      const savedReview = await DataStore.submitProductReview({
        orderId: this.currentReviewOrderId,
        productId: this.currentReviewProductId,
        rating: this.currentRatingValue,
        title: title || 'Verified Purchase Review',
        comment: comment
      });

      if (!this.reviewsCache[this.currentReviewOrderId]) {
        this.reviewsCache[this.currentReviewOrderId] = [];
      }
      const existingIdx = this.reviewsCache[this.currentReviewOrderId].findIndex(
        r => Number(r.productId) === Number(this.currentReviewProductId)
      );
      if (existingIdx > -1) {
        this.reviewsCache[this.currentReviewOrderId][existingIdx] = savedReview;
      } else {
        this.reviewsCache[this.currentReviewOrderId].push(savedReview);
      }

      this.closeReviewModal();
      UIModule.showToast('Thank you! Your verified product review has been saved in the database.', 'success');
      this.renderOrdersList();
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

window.OrdersModule = OrdersModule;
