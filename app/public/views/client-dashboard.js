/**
 * CONECTAGRO - CLIENT DASHBOARD JAVASCRIPT
 * Tienda online moderna con funcionalidades avanzadas
 */

class ConectAgroStore {
  constructor() {
    this.cartItemsCount = 0;
    this.currentCategory = 0;
    this.searchTimeout = null;
    this.isLoading = false;

    this.init();
  }

  /**
   * Inicializar la aplicación
   */
  init() {
    this.setupEventListeners();
    this.loadInitialData();
    this.setupAnimations();
  }

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    // Búsqueda en tiempo real
    const searchBar = document.querySelector(".search-bar");
    if (searchBar) {
      searchBar.addEventListener("input", (e) =>
        this.handleSearchInput(e.target.value)
      );
    }

    // Botón de búsqueda
    const searchBtn = document.querySelector(".search-btn");
    if (searchBtn) {
      searchBtn.addEventListener("click", () => this.performSearch());
    }

    // Enter en búsqueda
    if (searchBar) {
      searchBar.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.performSearch();
        }
      });
    }

    // Selector de ordenamiento
    const sortSelect = document.querySelector(".sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) =>
        this.handleSort(e.target.value)
      );
    }

    // Cart offcanvas
    const cartOffcanvas = document.getElementById("cartOffcanvas");
    if (cartOffcanvas) {
      cartOffcanvas.addEventListener("show.bs.offcanvas", () =>
        this.loadCartItems()
      );
    }

    // Intersection Observer para lazy loading
    this.setupIntersectionObserver();
  }

  /**
   * Cargar datos iniciales
   */
  async loadInitialData() {
    try {
      await Promise.all([
        this.loadCategories(),
        this.loadFeaturedProducts(),
        this.loadProducts(),
        this.loadCartItems(),
      ]);

      this.hideInitialLoading();
    } catch (error) {
      console.error("Error loading initial data:", error);
      this.showErrorMessage("Error al cargar los datos iniciales");
    }
  }

  /**
   * Configurar animaciones
   */
  setupAnimations() {
    // Animación de entrada para las tarjetas
    this.animateCards();

    // Parallax effect para el hero
    this.setupParallax();

    // Smooth scroll para navegación
    this.setupSmoothScroll();
  }

  /**
   * Animar tarjetas al cargar
   */
  animateCards() {
    const cards = document.querySelectorAll(".product-card");
    cards.forEach((card, index) => {
      card.style.animationDelay = `${index * 0.1}s`;
      card.classList.add("fade-in");
    });
  }

  /**
   * Configurar efecto parallax
   */
  setupParallax() {
    window.addEventListener("scroll", () => {
      const scrolled = window.pageYOffset;
      const parallaxElements = document.querySelectorAll(
        ".hero-section::before, .hero-section::after"
      );

      parallaxElements.forEach((element, index) => {
        const speed = index === 0 ? 0.5 : 0.3;
        element.style.transform = `translateY(${scrolled * speed}px)`;
      });
    });
  }

  /**
   * Configurar scroll suave
   */
  setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    });
  }

  /**
   * Configurar Intersection Observer para lazy loading
   */
  setupIntersectionObserver() {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src || img.src;
          img.classList.add("fade-in");
          observer.unobserve(img);
        }
      });
    });

    // Observar imágenes de productos
    document.querySelectorAll(".product-img").forEach((img) => {
      imageObserver.observe(img);
    });
  }

  /**
   * Manejar búsqueda en tiempo real
   */
  handleSearchInput(query) {
    clearTimeout(this.searchTimeout);

    if (query.length === 0) {
      this.loadProducts();
      return;
    }

    this.searchTimeout = setTimeout(() => {
      if (query.length >= 2) {
        this.performSearch(query);
      }
    }, 300);
  }

  /**
   * Realizar búsqueda
   */
  async performSearch(query = null) {
    const searchQuery = query || document.querySelector(".search-bar").value;

    if (searchQuery.length < 2) {
      this.showToast("Por favor ingresa al menos 2 caracteres", "warning");
      return;
    }

    this.showLoading("products-container");

    try {
      const response = await fetch(
        `/api/products/search?q=${encodeURIComponent(searchQuery)}`
      );
      if (!response.ok) throw new Error("Error en la búsqueda");

      const products = await response.json();
      this.renderProducts(products, "products-container");

      if (products.length === 0) {
        this.showEmptyState(
          "products-container",
          "No se encontraron productos"
        );
      }
    } catch (error) {
      console.error("Search error:", error);
      this.showErrorMessage("Error al buscar productos");
    }
  }

  /**
   * Manejar ordenamiento
   */
  async handleSort(sortType) {
    this.showLoading("products-container");

    try {
      const response = await fetch(
        `/api/products?sort=${sortType}&category=${this.currentCategory}`
      );
      if (!response.ok) throw new Error("Error al ordenar");

      const products = await response.json();
      this.renderProducts(products, "products-container");
    } catch (error) {
      console.error("Sort error:", error);
      this.showErrorMessage("Error al ordenar productos");
    }
  }

  /**
   * Cargar categorías
   */
  async loadCategories() {
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Error loading categories");

      const categories = await response.json();
      this.renderCategories(categories);
      this.setupCategoryFilters();
    } catch (error) {
      console.error("Categories error:", error);
      this.showErrorInContainer(
        "categories-container",
        "Error al cargar categorías"
      );
    }
  }

  /**
   * Renderizar categorías
   */
  renderCategories(categories) {
    const container = document.getElementById("categories-container");
    if (!container) return;

    const categoriesHTML = categories
      .map(
        (category) => `
        <span class="badge rounded-pill category-pill hover-lift" 
              data-category-id="${category.category_id}">
          ${category.category_name}
        </span>
      `
      )
      .join("");

    container.innerHTML = `
      <span class="badge rounded-pill category-pill active hover-lift" 
            data-category-id="0">
        Todos
      </span>
      ${categoriesHTML}
    `;
  }

  /**
   * Configurar filtros de categoría
   */
  setupCategoryFilters() {
    const categoryPills = document.querySelectorAll(".category-pill");

    categoryPills.forEach((pill) => {
      pill.addEventListener("click", (e) => {
        // Efecto visual de selección
        categoryPills.forEach((p) => p.classList.remove("active"));
        e.target.classList.add("active");

        // Cargar productos de la categoría
        this.currentCategory = parseInt(e.target.dataset.categoryId);

        if (this.currentCategory === 0) {
          this.loadProducts();
        } else {
          this.loadProductsByCategory(this.currentCategory);
        }

        // Animación de click
        this.addClickAnimation(e.target);
      });
    });
  }

  /**
   * Cargar productos destacados
   */
  async loadFeaturedProducts() {
    try {
      const response = await fetch("/api/products/featured");
      if (!response.ok) throw new Error("Error loading featured products");

      const products = await response.json();
      this.renderFeaturedProducts(products);
    } catch (error) {
      console.error("Featured products error:", error);
      this.showErrorInContainer(
        "featured-products-container",
        "Error al cargar productos destacados"
      );
    }
  }

  /**
   * Renderizar productos destacados
   */
  renderFeaturedProducts(products) {
    const container = document.getElementById("featured-products-container");
    if (!container) return;

    // Asegurar que tenemos al menos 6 productos para el carousel
    const extendedProducts = [...products];
    while (extendedProducts.length < 6) {
      extendedProducts.push(...products);
    }

    // Agrupar productos en grupos de 3 para mejor visualización
    const groupedProducts = this.chunkArray(extendedProducts.slice(0, 9), 3);

    const carouselHTML = groupedProducts
      .map(
        (group, index) => `
        <div class="carousel-item ${
          index === 0 ? "active" : ""
        }" data-slide-index="${index}">
          <div class="row justify-content-center">
            ${group
              .map((product) => this.createFeaturedProductHTML(product))
              .join("")}
          </div>
        </div>
      `
      )
      .join("");

    container.innerHTML = carouselHTML;

    // Crear indicadores del carousel
    this.createCarouselIndicators(groupedProducts.length);

    // Configurar botones de carrito para productos destacados
    this.setupFeaturedAddToCartButtons();

    // Inicializar carousel con configuración avanzada
    this.initializeFeaturedCarousel();
  }

  /**
   * Crear indicadores del carousel
   */
  createCarouselIndicators(slideCount) {
    const indicatorsContainer = document.getElementById(
      "featured-carousel-indicators"
    );
    if (!indicatorsContainer || slideCount <= 1) return;

    const indicatorsHTML = Array.from(
      { length: slideCount },
      (_, index) => `
      <button
        type="button"
        data-bs-target="#featuredCarousel"
        data-bs-slide-to="${index}"
        class="${index === 0 ? "active" : ""}"
        aria-current="${index === 0 ? "true" : "false"}"
        aria-label="Slide ${index + 1}"
      ></button>
    `
    ).join("");

    indicatorsContainer.innerHTML = indicatorsHTML;
  }

  /**
   * Configurar botones específicos para productos destacados
   */
  setupFeaturedAddToCartButtons() {
    const featuredButtons = document.querySelectorAll(".featured-add-to-cart");

    featuredButtons.forEach((button) => {
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);

      newButton.addEventListener("click", async (e) => {
        e.preventDefault();
        await this.addToCartWithAnimation(newButton);
      });
    });
  }

  /**
   * Inicializar carousel con efectos especiales
   */
  initializeFeaturedCarousel() {
    const carousel = document.getElementById("featuredCarousel");
    if (!carousel) return;

    // Configurar eventos del carousel
    carousel.addEventListener("slide.bs.carousel", (e) => {
      // Agregar efecto de zoom out al slide saliente
      const activeSlide = carousel.querySelector(".carousel-item.active");
      if (activeSlide) {
        activeSlide.style.transform = "scale(0.95)";
        activeSlide.style.opacity = "0.7";
      }
    });

    carousel.addEventListener("slid.bs.carousel", (e) => {
      // Restaurar el slide activo
      const activeSlide = carousel.querySelector(".carousel-item.active");
      if (activeSlide) {
        activeSlide.style.transform = "scale(1)";
        activeSlide.style.opacity = "1";
      }

      // Agregar animación a las cards del slide activo
      const cards = activeSlide.querySelectorAll(".featured-product-card");
      cards.forEach((card, index) => {
        setTimeout(() => {
          card.style.animation = "none";
          card.offsetHeight; // Trigger reflow
          card.style.animation = "fadeIn 0.6s ease-in-out";
        }, index * 150);
      });
    });

    // Pausar en hover
    carousel.addEventListener("mouseenter", () => {
      const bsCarousel = bootstrap.Carousel.getInstance(carousel);
      if (bsCarousel) bsCarousel.pause();
    });

    carousel.addEventListener("mouseleave", () => {
      const bsCarousel = bootstrap.Carousel.getInstance(carousel);
      if (bsCarousel) bsCarousel.cycle();
    });
  }

  /**
   * Añadir al carrito con animación especial para destacados
   */
  async addToCartWithAnimation(button) {
    const productId = button.dataset.productId;
    const originalContent = button.innerHTML;
    const card = button.closest(".featured-product-card");

    try {
      // Animación de loading especial
      button.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Agregando...';
      button.disabled = true;

      // Efecto de pulso en la card
      card.style.animation = "pulse 0.5s ease-in-out";

      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });

      const data = await response.json();

      if (data.success) {
        // Actualizar contador del carrito
        const cartResponse = await fetch("/api/cart");
        const cartData = await cartResponse.json();
        this.updateCartCount(cartData.itemCount);

        // Animación de éxito con efectos especiales
        button.innerHTML = '<i class="bi bi-check-circle-fill"></i> ¡Agregado!';
        button.style.background = "linear-gradient(135deg, #28a745, #20c997)";

        // Efecto de confetti mejorado
        this.showEnhancedConfetti(button);

        // Toast de éxito
        this.showToast("¡Producto destacado agregado! 🎉", "success");

        // Restaurar botón después de 2.5 segundos
        setTimeout(() => {
          button.innerHTML = originalContent;
          button.style.background = "";
          button.disabled = false;
          card.style.animation = "";
        }, 2500);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      button.innerHTML = originalContent;
      button.disabled = false;
      card.style.animation = "";
      this.showToast("Error al agregar al carrito", "error");
    }
  }

  /**
   * Efecto confetti mejorado para productos destacados
   */
  showEnhancedConfetti(element) {
    const rect = element.getBoundingClientRect();
    const colors = ["#ff6b35", "#f7931e", "#4caf50", "#66bb6a", "#ffd700"];

    for (let i = 0; i < 25; i++) {
      const confetti = document.createElement("div");
      const size = Math.random() * 8 + 4;

      confetti.style.cssText = `
        position: fixed;
        width: ${size}px;
        height: ${size}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        top: ${rect.top + rect.height / 2}px;
        left: ${rect.left + rect.width / 2}px;
        pointer-events: none;
        z-index: 1000;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      `;

      document.body.appendChild(confetti);

      const angle = (Math.PI * 2 * i) / 25;
      const velocity = 120 + Math.random() * 80;
      const gravity = 0.8;

      confetti.animate(
        [
          {
            transform: "translate(0, 0) scale(1) rotate(0deg)",
            opacity: 1,
          },
          {
            transform: `translate(${Math.cos(angle) * velocity}px, ${
              Math.sin(angle) * velocity + gravity * 100
            }px) scale(0) rotate(720deg)`,
            opacity: 0,
          },
        ],
        {
          duration: 1200,
          easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }
      ).onfinish = () => confetti.remove();
    }
  }

  /**
   * Crear HTML para producto destacado
   */
  createFeaturedProductHTML(product) {
    return `
      <div class="col-lg-4 col-md-6 mb-3">
        <div class="featured-product-card position-relative">
          <span class="badge category-badge-special position-absolute" 
                style="top: 10px; left: 10px; z-index: 15; background: ${this.getCategoryBadgeStyle(
                  product.category_name
                )} !important;">
            ${product.category_name}
          </span>
          ${
            product.is_featured
              ? '<span class="badge featured-badge-special position-absolute" style="top: 10px; right: 10px; z-index: 15;">🔥 Destacado</span>'
              : product.is_organic
              ? '<span class="badge organic-badge-special position-absolute" style="top: 10px; right: 10px; z-index: 15;">🌱 Orgánico</span>'
              : ""
          }
          <div class="featured-product-img-container">
            <img src="${
              product.image_url ||
              "https://placehold.co/300x200?text=Producto+Fresco"
            }"
                 class="product-img" alt="${product.product_name}"
                 loading="lazy">
          </div>
          <div class="featured-card-body">
            <h5 class="featured-card-title">${product.product_name}</h5>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="featured-card-price">${parseFloat(
                product.price
              ).toLocaleString("es-CO", {
                style: "currency",
                currency: "COP",
                minimumFractionDigits: 0,
              })}</span>
              <div class="rating-stars">
                ${"★".repeat(5)} <small class="text-muted">(4.8)</small>
              </div>
            </div>
            <button class="btn featured-add-to-cart w-100" 
                    data-product-id="${product.product_id}">
              <i class="bi bi-cart-plus me-2"></i>Agregar al Carrito
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Cargar productos
   */
  async loadProducts() {
    this.showLoading("products-container");

    try {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Error loading products");

      const products = await response.json();
      this.renderProducts(products, "products-container");
    } catch (error) {
      console.error("Products error:", error);
      this.showErrorInContainer(
        "products-container",
        "Error al cargar productos"
      );
    }
  }

  /**
   * Cargar productos por categoría
   */
  async loadProductsByCategory(categoryId) {
    this.showLoading("products-container");

    try {
      const response = await fetch(`/api/products/category/${categoryId}`);
      if (!response.ok) throw new Error("Error loading products by category");

      const products = await response.json();
      this.renderProducts(products, "products-container");

      if (products.length === 0) {
        this.showEmptyState(
          "products-container",
          "No hay productos en esta categoría"
        );
      }
    } catch (error) {
      console.error("Category products error:", error);
      this.showErrorInContainer(
        "products-container",
        "Error al cargar productos de la categoría"
      );
    }
  }

  /**
   * Renderizar productos
   */
  renderProducts(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (products.length === 0) {
      this.showEmptyState(containerId, "No se encontraron productos");
      return;
    }

    const productsHTML = products
      .map((product) => this.createProductHTML(product))
      .join("");

    container.innerHTML = productsHTML;
    this.setupAddToCartButtons();
    this.animateCards();
  }

  /**
   * Crear HTML para producto
   */
  createProductHTML(product) {
    return `
      <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
        <div class="card product-card h-100 position-relative hover-lift">
          <span class="badge category-badge" 
                style="background: ${this.getCategoryBadgeStyle(
                  product.category_name
                )} !important;">
            ${product.category_name}
          </span>
          ${
            product.is_featured
              ? '<span class="badge featured-badge" style="top: 0; right: 0;">🔥</span>'
              : product.is_organic
              ? '<span class="badge organic-badge" style="top: 0; right: 0;">🌱</span>'
              : ""
          }
          <div class="product-img-container">
            <img src="${product.image_url || "https://placehold.co/300x300"}"
                 class="product-img" alt="${product.product_name}"
                 loading="lazy">
          </div>
          <div class="card-body">
            <h5 class="card-title">${product.product_name}</h5>
            <p class="card-text text-success fw-bold">${parseFloat(
              product.price
            ).toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
            })}</p>
            <p class="card-text small text-muted">Categoría: ${
              product.category_name
            }</p>
          </div>
          <div class="card-footer">
            <button class="btn btn-success w-100 add-to-cart pulse-animation" 
                    data-product-id="${product.product_id}">
              <i class="bi bi-cart-plus"></i> Agregar al Carrito
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Configurar botones de añadir al carrito
   */
  setupAddToCartButtons() {
    const buttons = document.querySelectorAll(".add-to-cart");

    buttons.forEach((button) => {
      // Clonar para eliminar listeners previos
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);

      newButton.addEventListener("click", async (e) => {
        await this.addToCart(e.target);
      });
    });
  }

  /**
   * Añadir producto al carrito
   */
  async addToCart(button) {
    const productId = button.dataset.productId;
    const originalContent = button.innerHTML;

    try {
      // Animación de loading
      button.innerHTML = '<div class="loading-spinner"></div> Agregando...';
      button.disabled = true;

      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });

      const data = await response.json();

      if (data.success) {
        // Actualizar contador del carrito
        const cartResponse = await fetch("/api/cart");
        const cartData = await cartResponse.json();
        this.updateCartCount(cartData.itemCount);

        // Animación de éxito
        button.innerHTML = '<i class="bi bi-check-lg"></i> ¡Agregado!';
        button.classList.remove("btn-success");
        button.classList.add("btn-outline-success");

        // Efecto de confetti
        this.showConfetti(button);

        // Toast de éxito
        this.showToast("Producto agregado al carrito", "success");

        // Restaurar botón después de 2 segundos
        setTimeout(() => {
          button.innerHTML = originalContent;
          button.classList.add("btn-success");
          button.classList.remove("btn-outline-success");
          button.disabled = false;
        }, 2000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      button.innerHTML = originalContent;
      button.disabled = false;
      this.showToast("Error al agregar al carrito", "error");
    }
  }

  /**
   * Cargar items del carrito
   */
  async loadCartItems() {
    try {
      const response = await fetch("/api/cart");
      if (!response.ok) throw new Error("Error loading cart");

      const data = await response.json();
      this.updateCartUI(data.items);
      this.updateCartCount(data.itemCount);
      this.updateCartTotals(data.total);
    } catch (error) {
      console.error("Cart error:", error);
      this.showErrorInContainer(
        "cart-items-container",
        "Error al cargar el carrito"
      );
    }
  }

  /**
   * Actualizar UI del carrito
   */
  updateCartUI(items) {
    const container = document.getElementById("cart-items-container");
    if (!container) return;

    if (!items || items.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted p-4 fade-in">
          <i class="bi bi-cart-x fs-1"></i>
          <p class="mt-2">Tu carrito está vacío</p>
          <small>¡Agrega algunos productos deliciosos!</small>
        </div>
      `;
      return;
    }

    const itemsHTML = items
      .map((item) => this.createCartItemHTML(item))
      .join("");

    container.innerHTML = itemsHTML;
    this.setupDeleteButtons();
  }

  /**
   * Crear HTML para item del carrito
   */
  createCartItemHTML(item) {
    const price = parseFloat(item.price);
    const subtotal = parseFloat(item.subtotal || 0);

    return `
      <div class="card mb-3 hover-lift">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
              <img src="${item.image_url || "https://placehold.co/50"}"
                   class="me-3 rounded" alt="${item.product_name}"
                   style="width: 60px; height: 60px; object-fit: cover;">
              <div>
                <h6 class="mb-1 fw-bold">${item.product_name}</h6>
                <small class="text-muted">${price.toLocaleString("es-CO", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })} x ${item.quantity}</small>
              </div>
            </div>
            <div class="d-flex align-items-center">
              <span class="fw-bold me-3 text-success fs-5">
                $${subtotal.toLocaleString("es-CO", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </span>
              <button class="btn btn-sm delete-item" 
                      data-product-id="${item.product_id}"
                      title="Eliminar producto">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Configurar botones de eliminar
   */
  setupDeleteButtons() {
    document.querySelectorAll(".delete-item").forEach((button) => {
      button.addEventListener("click", async (e) => {
        await this.removeFromCart(e.target);
      });
    });
  }

  /**
   * Eliminar producto del carrito
   */
  async removeFromCart(button) {
    const productId = button.dataset.productId;

    try {
      button.innerHTML = '<div class="loading-spinner"></div>';
      button.disabled = true;

      const response = await fetch(`/api/cart/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error removing item");

      await this.loadCartItems();
      this.showToast("Producto eliminado del carrito", "info");
    } catch (error) {
      console.error("Remove from cart error:", error);
      this.showToast("Error al eliminar producto", "error");
      button.innerHTML = '<i class="bi bi-trash"></i>';
      button.disabled = false;
    }
  }

  /**
   * Actualizar contador del carrito
   */
  updateCartCount(count) {
    this.cartItemsCount = count;
    const cartBadge = document.querySelector(".cart-count");
    if (cartBadge) {
      cartBadge.textContent = count;

      // Animación del contador
      cartBadge.style.transform = "scale(1.2)";
      setTimeout(() => {
        cartBadge.style.transform = "scale(1)";
      }, 200);
    }
  }

  /**
   * Actualizar totales del carrito
   */
  updateCartTotals(subtotal) {
    const shipping = subtotal > 0 && subtotal < 100000 ? 10000 : 0; // $10.000 COP de envío, gratis si es mayor a $100.000
    const total = subtotal + shipping;

    const elements = {
      subtotal: document.getElementById("cart-subtotal"),
      shipping: document.getElementById("cart-shipping"),
      total: document.getElementById("cart-total"),
      checkoutBtn: document.getElementById("checkout-btn"),
    };

    if (elements.subtotal)
      elements.subtotal.textContent = `$${subtotal.toLocaleString("es-CO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    if (elements.shipping)
      elements.shipping.textContent =
        shipping > 0
          ? `$${shipping.toLocaleString("es-CO", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}`
          : "Gratis";
    if (elements.total)
      elements.total.textContent = `$${total.toLocaleString("es-CO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    if (elements.checkoutBtn) elements.checkoutBtn.disabled = subtotal === 0;
  }

  // === UTILITY METHODS ===

  /**
   * Mostrar loading en un contenedor
   */
  showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="text-center py-5">
        <div class="loading-spinner mx-auto mb-3"></div>
        <p class="text-muted">Cargando productos...</p>
      </div>
    `;
  }

  /**
   * Mostrar estado vacío
   */
  showEmptyState(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="col-12">
        <div class="text-center py-5 fade-in">
          <i class="bi bi-search fs-1 text-muted mb-3"></i>
          <h4 class="text-muted">${message}</h4>
          <p class="text-muted">Intenta con otros términos de búsqueda</p>
        </div>
      </div>
    `;
  }

  /**
   * Mostrar error en contenedor
   */
  showErrorInContainer(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="alert alert-danger fade-in">
        <i class="bi bi-exclamation-triangle me-2"></i>
        ${message}
      </div>
    `;
  }

  /**
   * Mostrar mensaje de error
   */
  showErrorMessage(message) {
    this.showToast(message, "error");
  }

  /**
   * Ocultar loading inicial
   */
  hideInitialLoading() {
    const loadingElements = document.querySelectorAll(
      ".d-none .spinner-border"
    );
    loadingElements.forEach((element) => {
      element.closest(".d-none").remove();
    });
  }

  /**
   * Mostrar toast notification
   */
  showToast(message, type = "info") {
    // Crear toast container si no existe
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      toastContainer.className = "position-fixed top-0 end-0 p-3";
      toastContainer.style.zIndex = "1060";
      document.body.appendChild(toastContainer);
    }

    const toastId = `toast-${Date.now()}`;
    const bgClass =
      {
        success: "bg-success",
        error: "bg-danger",
        warning: "bg-warning",
        info: "bg-info",
      }[type] || "bg-info";

    const toast = document.createElement("div");
    toast.id = toastId;
    toast.className = `toast fade-in ${bgClass} text-white`;
    toast.innerHTML = `
      <div class="toast-header ${bgClass} text-white border-0">
        <i class="bi bi-check-circle me-2"></i>
        <strong class="me-auto">ConectAgro</strong>
        <button type="button" class="btn-close btn-close-white" onclick="this.closest('.toast').remove()"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    `;

    toastContainer.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 3000);
  }

  /**
   * Efecto confetti
   */
  showConfetti(element) {
    const rect = element.getBoundingClientRect();
    const colors = ["#4caf50", "#66bb6a", "#81c784"];

    for (let i = 0; i < 15; i++) {
      const confetti = document.createElement("div");
      confetti.style.cssText = `
        position: fixed;
        width: 6px;
        height: 6px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        top: ${rect.top + rect.height / 2}px;
        left: ${rect.left + rect.width / 2}px;
        pointer-events: none;
        z-index: 1000;
        border-radius: 50%;
      `;

      document.body.appendChild(confetti);

      const angle = (Math.PI * 2 * i) / 15;
      const velocity = 100 + Math.random() * 50;

      confetti.animate(
        [
          {
            transform: "translate(0, 0) scale(1)",
            opacity: 1,
          },
          {
            transform: `translate(${Math.cos(angle) * velocity}px, ${
              Math.sin(angle) * velocity
            }px) scale(0)`,
            opacity: 0,
          },
        ],
        {
          duration: 800,
          easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }
      ).onfinish = () => confetti.remove();
    }
  }

  /**
   * Añadir animación de click
   */
  addClickAnimation(element) {
    element.style.transform = "scale(0.95)";
    setTimeout(() => {
      element.style.transform = "scale(1)";
    }, 150);
  }

  /**
   * Dividir array en chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Obtener color dinámico para categoría
   */
  getCategoryBadgeStyle(categoryName) {
    const categoryColors = {
      frutas: "linear-gradient(135deg, #ff6b35, #f7931e)",
      verduras: "linear-gradient(135deg, #4caf50, #66bb6a)",
      lácteos: "linear-gradient(135deg, #2196f3, #64b5f6)",
      cereales: "linear-gradient(135deg, #ff9800, #ffb74d)",
      carnes: "linear-gradient(135deg, #e53935, #ef5350)",
      procesados: "linear-gradient(135deg, #9c27b0, #ba68c8)",
      bebidas: "linear-gradient(135deg, #00bcd4, #4dd0e1)",
      condimentos: "linear-gradient(135deg, #795548, #a1887f)",
      granos: "linear-gradient(135deg, #607d8b, #90a4ae)",
    };

    const defaultColor = "linear-gradient(135deg, #6c757d, #868e96)";
    const categoryKey = categoryName.toLowerCase();

    return categoryColors[categoryKey] || defaultColor;
  }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  window.conectagroStore = new ConectAgroStore();
});

// Exponer métodos globales para compatibilidad
window.ConectAgroStore = ConectAgroStore;
