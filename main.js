/**
 * FRESHBITE — Shared JavaScript
 * Features: Toast notifications, Cart with localStorage, Scroll animations,
 * Mobile menu, Scroll progress, Back to top, Cookie consent
 */

// ═══════════════════════════════════════════
// CONFIG & STATE
// ═══════════════════════════════════════════
const CONFIG = {
  TAX_RATE: 0.08,
  FREE_DELIVERY_THRESHOLD: 30,
  DELIVERY_FEE: 3.99,
  TOAST_DURATION: 4000,
  CART_ANIMATION_DURATION: 300
};

// Cart state with localStorage persistence
let cart = [];
try {
  const saved = localStorage.getItem('freshbite_cart');
  if (saved) cart = JSON.parse(saved);
} catch (e) { console.warn('localStorage not available'); }

// ═══════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const formatCurrency = (n) => '$' + (n || 0).toFixed(2);
const throttle = (fn, wait) => {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= wait) { last = now; fn(...args); }
  };
};
const debounce = (fn, wait) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
};

// ═══════════════════════════════════════════
// TOAST NOTIFICATION SYSTEM
// ═══════════════════════════════════════════
const Toast = {
  container: null,
  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.container);
  },

  show(message, options = {}) {
    this.init();
    const {
      title = '',
      type = 'success',     // success | error | info
      duration = CONFIG.TOAST_DURATION
    } = options;

    const icons = {
      success: 'fa-check',
      error: 'fa-exclamation-circle',
      info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="toast-icon"><i class="fas ${icons[type]}"></i></div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close notification"><i class="fas fa-times"></i></button>
      <div class="toast-progress"></div>
    `;

    // Progress bar animation
    const progress = toast.querySelector('.toast-progress');
    progress.style.animation = `toastProgress ${duration}ms linear forwards`;

    // Close handlers
    const close = () => {
      toast.style.transform = 'translateX(120%)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast-close').addEventListener('click', close);
    const autoClose = setTimeout(close, duration);
    toast.addEventListener('mouseenter', () => clearTimeout(autoClose));
    toast.addEventListener('mouseleave', () => setTimeout(close, duration));

    this.container.appendChild(toast);
    // Force reflow for animation
    requestAnimationFrame(() => toast.classList.add('show'));

    // Add keyframe for progress if not present
    if (!document.getElementById('toast-progress-style')) {
      const style = document.createElement('style');
      style.id = 'toast-progress-style';
      style.textContent = `
        @keyframes toastProgress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `;
      document.head.appendChild(style);
    }
  },

  success(msg, opts) { this.show(msg, { ...opts, type: 'success' }); },
  error(msg, opts) { this.show(msg, { ...opts, type: 'error' }); },
  info(msg, opts) { this.show(msg, { ...opts, type: 'info' }); }
};

// ═══════════════════════════════════════════
// CART SYSTEM
// ═══════════════════════════════════════════
const Cart = {
  save() {
    try { localStorage.setItem('freshbite_cart', JSON.stringify(cart)); } catch (e) {}
    this.updateUI();
  },

  add(item) {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      existing.quantity += 1;
      Toast.success(`Added another ${item.name} to cart`, { title: 'Cart Updated' });
    } else {
      cart.push({ ...item, quantity: 1 });
      Toast.success(`${item.name} added to cart`, { title: 'Item Added' });
    }
    this.save();
    this.animateBadge();
  },

  remove(id) {
    const item = cart.find(i => i.id === id);
    cart = cart.filter(i => i.id !== id);
    this.save();
    if (item) Toast.info(`${item.name} removed from cart`, { title: 'Item Removed' });
  },

  updateQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      this.remove(id);
      return;
    }
    this.save();
  },

  clear() {
    cart = [];
    this.save();
    Toast.info('Cart cleared', { title: 'Cart Empty' });
  },

  getTotalItems() {
    return cart.reduce((sum, i) => sum + i.quantity, 0);
  },

  getSubtotal() {
    return cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  getTotals() {
    const items = this.getTotalItems();
    const subtotal = this.getSubtotal();
    const deliveryFee = items > 0 ? (subtotal < CONFIG.FREE_DELIVERY_THRESHOLD ? CONFIG.DELIVERY_FEE : 0) : 0;
    const tax = subtotal * CONFIG.TAX_RATE;
    const total = subtotal + deliveryFee + tax;
    return { items, subtotal, deliveryFee, tax, total };
  },

  animateBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    badge.classList.remove('pulse');
    void badge.offsetWidth;
    badge.classList.add('pulse');
  },

  updateUI() {
    const { items, subtotal, deliveryFee, tax, total } = this.getTotals();

    // Badge
    const badge = document.getElementById('cartBadge');
    const countLabel = document.getElementById('cartItemCount');
    if (badge) {
      badge.textContent = items;
      badge.style.display = items > 0 ? 'flex' : 'none';
    }
    if (countLabel) countLabel.textContent = `(${items} item${items !== 1 ? 's' : ''})`;

    // Cart list
    const list = document.getElementById('cartList');
    const empty = document.getElementById('cartEmpty');
    const footer = document.getElementById('cartFooter');

    if (!list) return;

    if (cart.length === 0) {
      list.innerHTML = '';
      if (empty) empty.style.display = 'flex';
      if (footer) footer.style.display = 'none';
    } else {
      if (empty) empty.style.display = 'none';
      if (footer) footer.style.display = 'block';
      list.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
          <img src="${item.image}" alt="${item.name}" loading="lazy" width="52" height="52" />
          <div class="info">
            <div class="name">${item.name}</div>
            <div class="price">${formatCurrency(item.price)}</div>
            <div class="meta">${item.category}</div>
          </div>
          <div class="qty-ctrl">
            <button class="qty-dec" data-id="${item.id}" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button class="qty-inc" data-id="${item.id}" aria-label="Increase quantity">+</button>
          </div>
          <button class="remove-item" data-id="${item.id}" aria-label="Remove item">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      `).join('');

      // Attach events
      list.querySelectorAll('.qty-dec').forEach(btn => {
        btn.addEventListener('click', () => this.updateQty(parseInt(btn.dataset.id), -1));
      });
      list.querySelectorAll('.qty-inc').forEach(btn => {
        btn.addEventListener('click', () => this.updateQty(parseInt(btn.dataset.id), 1));
      });
      list.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', () => this.remove(parseInt(btn.dataset.id)));
      });
    }

    // Totals
    const subEl = document.getElementById('subtotal');
    const delEl = document.getElementById('deliveryFee');
    const taxEl = document.getElementById('tax');
    const totEl = document.getElementById('total');
    const savingsEl = document.getElementById('cartSavings');

    if (subEl) subEl.textContent = formatCurrency(subtotal);
    if (delEl) delEl.textContent = items > 0 ? (deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)) : '$0.00';
    if (taxEl) taxEl.textContent = formatCurrency(tax);
    if (totEl) totEl.textContent = formatCurrency(total);
    if (savingsEl) {
      if (deliveryFee === 0 && items > 0) {
        savingsEl.textContent = `🎉 You saved ${formatCurrency(CONFIG.DELIVERY_FEE)} on delivery!`;
        savingsEl.style.display = 'block';
      } else {
        savingsEl.style.display = 'none';
      }
    }

    // Checkout button
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;

    // Hide checkout message
    const msg = document.getElementById('checkoutMsg');
    if (msg) { msg.classList.remove('show'); msg.style.display = 'none'; }
  },

  open() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    this.updateUI();
  },

  close() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  },

  checkout() {
    if (cart.length === 0) return;
    const btn = document.getElementById('checkoutBtn');
    const msg = document.getElementById('checkoutMsg');
    if (btn) btn.disabled = true;
    if (msg) { msg.style.display = 'block'; msg.classList.add('show'); }

    Toast.success('Your order has been placed successfully!', {
      title: 'Order Confirmed',
      duration: 3000
    });

    setTimeout(() => {
      this.clear();
      if (msg) { msg.classList.remove('show'); msg.style.display = 'none'; }
      if (btn) btn.disabled = false;
      this.close();
    }, 2500);
  }
};

// ═══════════════════════════════════════════
// SCROLL PROGRESS
// ═══════════════════════════════════════════
const ScrollProgress = {
  init() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    window.addEventListener('scroll', throttle(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = progress + '%';
    }, 50));
  }
};

// ═══════════════════════════════════════════
// BACK TO TOP
// ═══════════════════════════════════════════
const BackToTop = {
  init() {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    document.body.appendChild(btn);

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', throttle(() => {
      btn.classList.toggle('visible', window.scrollY > 500);
    }, 100));
  }
};

// ═══════════════════════════════════════════
// SCROLL REVEAL (Intersection Observer)
// ═══════════════════════════════════════════
const ScrollReveal = {
  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    $$('.reveal').forEach(el => observer.observe(el));
  }
};

// ═══════════════════════════════════════════
// NAVBAR
// ═══════════════════════════════════════════
const Navbar = {
  init() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    window.addEventListener('scroll', throttle(() => {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, 50));

    // Active link highlighting
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    $$('.nav-links a, .mobile-menu a').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes(currentPage)) {
        link.classList.add('active');
      }
    });
  }
};

// ═══════════════════════════════════════════
// MOBILE MENU
// ═══════════════════════════════════════════
const MobileMenu = {
  init() {
    const hamburger = document.getElementById('hamburger');
    const menu = document.getElementById('mobileMenu');
    if (!hamburger || !menu) return;

    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      menu.classList.toggle('open');
    });

    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        menu.classList.remove('open');
      });
    });
  }
};

// ═══════════════════════════════════════════
// CART SIDEBAR EVENTS
// ═══════════════════════════════════════════
const CartSidebar = {
  init() {
    const openBtn = document.getElementById('cartOpenBtn');
    const closeBtn = document.getElementById('cartCloseBtn');
    const overlay = document.getElementById('cartOverlay');
    const mobileBtn = document.getElementById('cartMobileBtn');
    const browseBtn = document.getElementById('browseBtn');
    const checkoutBtn = document.getElementById('checkoutBtn');

    if (openBtn) openBtn.addEventListener('click', () => Cart.open());
    if (closeBtn) closeBtn.addEventListener('click', () => Cart.close());
    if (overlay) overlay.addEventListener('click', () => Cart.close());
    if (mobileBtn) mobileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('hamburger')?.classList.remove('open');
      document.getElementById('mobileMenu')?.classList.remove('open');
      Cart.open();
    });
    if (browseBtn) browseBtn.addEventListener('click', () => {
      Cart.close();
      const menuSection = document.getElementById('menu');
      if (menuSection) menuSection.scrollIntoView({ behavior: 'smooth' });
      else window.location.href = 'menu.html#menu';
    });
    if (checkoutBtn) checkoutBtn.addEventListener('click', () => Cart.checkout());

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') Cart.close();
    });
  }
};

// ═══════════════════════════════════════════
// COOKIE CONSENT
// ═══════════════════════════════════════════
const CookieConsent = {
  init() {
    if (localStorage.getItem('freshbite_cookies')) return;

    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.innerHTML = `
      <p>We use cookies to enhance your experience, analyze site traffic, and serve personalized content. 
      <a href="#" onclick="return false;">Learn more</a></p>
      <button class="btn btn-primary" id="cookieAccept" style="padding:0.5rem 1.5rem; font-size:0.85rem;">
        <i class="fas fa-check"></i> Accept All
      </button>
    `;
    document.body.appendChild(banner);

    requestAnimationFrame(() => banner.classList.add('show'));

    banner.querySelector('#cookieAccept').addEventListener('click', () => {
      localStorage.setItem('freshbite_cookies', 'accepted');
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 500);
      Toast.success('Preferences saved!', { title: 'Cookies Accepted' });
    });
  }
};

// ═══════════════════════════════════════════
// MODAL SYSTEM
// ═══════════════════════════════════════════
const Modal = {
  open(contentHTML, options = {}) {
    const existing = document.getElementById('app-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'app-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>${options.title || ''}</h3>
          <button class="modal-close" aria-label="Close modal"><i class="fas fa-times"></i></button>
        </div>
        <div style="padding:1.5rem;">${contentHTML}</div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => overlay.classList.add('open'));

    const close = () => {
      overlay.classList.remove('open');
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
      }, 300);
    };

    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });

    return { close };
  }
};

// ═══════════════════════════════════════════
// FORM VALIDATION HELPER
// ═══════════════════════════════════════════
const FormValidator = {
  validate(formId, fields) {
    const form = document.getElementById(formId);
    if (!form) return null;

    let isValid = true;
    fields.forEach(({ id, rule, errorId, message }) => {
      const el = document.getElementById(id);
      const err = document.getElementById(errorId);
      if (!el || !err) return;

      const value = el.value.trim();
      const valid = rule(value);
      if (!valid) {
        err.textContent = message;
        err.classList.add('show');
        el.style.borderColor = 'var(--color-error)';
        isValid = false;
      } else {
        err.classList.remove('show');
        el.style.borderColor = '';
      }
    });

    return isValid ? form : null;
  },

  clearErrors(fields) {
    fields.forEach(({ id, errorId }) => {
      const el = document.getElementById(id);
      const err = document.getElementById(errorId);
      if (el) el.style.borderColor = '';
      if (err) err.classList.remove('show');
    });
  }
};

// ═══════════════════════════════════════════
// COUNTER ANIMATION
// ═══════════════════════════════════════════
const Counter = {
  init() {
    const counters = $$('[data-counter]');
    if (counters.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.counter);
          const suffix = el.dataset.suffix || '';
          const duration = 2000;
          const start = performance.now();

          const update = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            el.textContent = Math.floor(ease * target).toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(update);
          };
          requestAnimationFrame(update);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
  }
};

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  Navbar.init();
  MobileMenu.init();
  CartSidebar.init();
  Cart.updateUI();
  ScrollProgress.init();
  BackToTop.init();
  ScrollReveal.init();
  CookieConsent.init();
  Counter.init();

  // Global access
  window.Cart = Cart;
  window.Toast = Toast;
  window.Modal = Modal;
  window.FormValidator = FormValidator;
});