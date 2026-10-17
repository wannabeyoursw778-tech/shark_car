(() => {
  "use strict";

  const app = document.querySelector("#app");
  const shopPhone = "+998931150389";
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const sampleVehicles = Array.isArray(window.SHARK_SAMPLE_VEHICLES) ? window.SHARK_SAMPLE_VEHICLES : [];
  const storageKeys = { vehicles: "sharkcar.vehicles.v2", favorites: "sharkcar.favorites.v1", compare: "sharkcar.compare.v1", inquiries: "sharkcar.inquiries.v1" };
  const demoAdminSessionKey = "sharkcar.admin.demo-session";
  const demoAdminCredentials = { email: "js_muxandis", password: "SC-Admin-7vQ!29mZ#4pL" };
  let vehicles = loadVehicles();
  let favorites = loadArray(storageKeys.favorites);
  let compareIds = loadArray(storageKeys.compare).slice(0, 3);
  let inquiries = loadInquiries();
  let catalogFilters = { search: "", brand: "", model: "", fuel: "", transmission: "", body: "", minPrice: "", maxPrice: "", minYear: "", maxYear: "", sort: "featured" };
  let editingId = null;
  let adminFormOpen = false;
  let selectedImage = 0;
  let toastTimer;

  function readStorage(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Unable to read local prototype data (${key}).`, error);
      notify("Brauzerda saqlangan ma’lumotni o‘qib bo‘lmadi. Namuna e’lonlar ko‘rsatilyapti.", "error");
      return null;
    }

  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Unable to save local prototype data (${key}).`, error);
      notify("Brauzer bu o‘zgarishni saqlay olmadi. Xotirani tekshirib, qayta urinib ko‘ring.", "error");
      return false;
    }
  }

  function loadVehicles() {
    const stored = readStorage(storageKeys.vehicles);
    if (Array.isArray(stored)) return stored;
    return sampleVehicles.map((vehicle) => ({ ...vehicle, images: [...vehicle.images] }));
  }

  function loadArray(key) {
    const stored = readStorage(key);
    return Array.isArray(stored) ? stored.filter((item) => typeof item === "string") : [];
  }

  function loadInquiries() {
    const stored = readStorage(storageKeys.inquiries);
    return Array.isArray(stored) ? stored.filter((item) => item && typeof item === "object" && typeof item.id === "string") : [];
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function moneyText(value) {
    return Number.isFinite(Number(value)) ? money.format(Number(value)) : "Narx kiritilmagan";
  }

  function displayValue(value) {
    const translations = {
      Petrol: "Benzin", Electric: "Elektr", Hybrid: "Gibrid",
      Automatic: "Avtomat", Manual: "Mexanik",
      Coupe: "Kupe", Wagon: "Universal", SUV: "Krossover", Sedan: "Sedan", Convertible: "Kabriolet", Van: "Mikroven",
      "Rear-Wheel Drive": "Orqa g‘ildirakdan tortish", "All-Wheel Drive": "To‘liq g‘ildirakdan tortish",
      "Front-Wheel Drive": "Old g‘ildirakdan tortish",
      "Not specified": "Ko‘rsatilmagan"
    };
    return translations[value] || value || "Ko‘rsatilmagan";
  }

  function imageURL(vehicle, index = 0) {
    return (Array.isArray(vehicle.images) && vehicle.images[index]) || (Array.isArray(vehicle.images) && vehicle.images[0]) || "";
  }

  function imageMarkup(vehicle, className = "", index = 0) {
    const url = escapeHTML(imageURL(vehicle, index));
    const label = escapeHTML(`${vehicle.year} ${vehicle.brand} ${vehicle.model}`);
    return `<img class="${className}" src="${url}" alt="${label}" loading="lazy" data-car-image>`;
  }

  function saleStatus(vehicle) {
    if (vehicle.status === "sold") return "Sotildi · namuna";
    if (vehicle.status === "reserved") return "Band qilingan · namuna";
    if (vehicle.status === "sale") return "Sotuvda · namuna";
    return vehicle.status ? "Sotuvda" : "Namuna e’loni";
  }

  function notify(message, type = "success") {
    const region = document.querySelector("#toast-region");
    if (!region) return;
    region.innerHTML = `<div class="toast toast-${type}" role="status">${escapeHTML(message)}</div>`;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { region.innerHTML = ""; }, 4200);
  }

  function navCounts() {
    const compare = document.querySelector("#compare-count");
    const favorite = document.querySelector("#favorite-count");
    const inquiryCount = document.querySelector("#admin-inquiry-count");
    if (compare) compare.textContent = String(compareIds.length);
    if (favorite) favorite.textContent = String(favorites.length);
    if (inquiryCount) {
      const pending = inquiries.filter((inquiry) => inquiry.status !== "called").length;
      inquiryCount.textContent = String(pending);
      inquiryCount.hidden = pending === 0;
    }
  }

  function activeRoute() {
    const hash = window.location.hash.slice(1) || "home";
    const [page, ...rest] = hash.split("/");
    return { page, id: rest.join("/") };
  }

  function setPageTitle(title) {
    document.title = `${title} — SHARK CAR`;
  }

  function render() {
    navCounts();
    document.querySelectorAll("[data-nav]").forEach((link) => link.classList.toggle("active", link.dataset.nav === activeRoute().page));
    const { page, id } = activeRoute();
    try {
      if (page === "home") renderHome();
      else if (page === "catalog") renderCatalog();
      else if (page === "car") renderDetail(id);
      else if (page === "favorites") renderFavorites();
      else if (page === "compare") renderCompare();
      else if (page === "contact") renderContact(id);
      else if (page === "admin") {
        if (hasDemoAdminSession()) renderAdmin();
        else renderAdminLogin();
      }
      else renderNotFound();
      app.focus({ preventScroll: true });
    } catch (error) {
      console.error("Page could not be rendered.", error);
      app.innerHTML = `<section class="state-panel error-panel"><span class="eyebrow">Xatolik yuz berdi</span><h1>Sahifani yuklab bo‘lmadi.</h1><p>Qayta urinib ko‘ring. Saqlangan namuna ma’lumotlari o‘zgartirilmadi.</p><button class="button button-red" data-action="refresh">Qayta yuklash</button></section>`;
    }
    document.querySelector(".main-nav")?.classList.remove("nav-open");
    document.querySelector(".menu-toggle")?.setAttribute("aria-expanded", "false");
    document.querySelector(".menu-toggle")?.setAttribute("aria-label", "Menyuni ochish");
  }

  function card(vehicle, index = 0) {
    const isFavorite = favorites.includes(vehicle.id);
    const isCompared = compareIds.includes(vehicle.id);
    return `<article class="car-card" style="--card-index:${Math.min(index, 6)}">
      <a class="car-card-image" href="#car/${encodeURIComponent(vehicle.id)}">
        ${imageMarkup(vehicle, "card-photo")}
        <span class="card-image-shade"></span>
        <span class="card-year">${escapeHTML(vehicle.year)}</span>
        <span class="sale-badge ${vehicle.status === "sold" ? "sale-badge-sold" : vehicle.status === "reserved" ? "sale-badge-reserved" : ""}">${escapeHTML(saleStatus(vehicle))}</span>
      </a>
      <div class="car-card-content">
        <div class="card-title-row"><div><span class="card-brand">${escapeHTML(vehicle.brand)}</span><h3><a href="#car/${encodeURIComponent(vehicle.id)}">${escapeHTML(vehicle.model)}</a></h3></div>
          <button class="icon-button favorite-button ${isFavorite ? "is-active" : ""}" type="button" data-action="favorite" data-id="${escapeHTML(vehicle.id)}" aria-label="${isFavorite ? "Sevimlilardan olib tashlash" : "Sevimlilarga qo‘shish"}">${isFavorite ? "♥" : "♡"}</button>
        </div>
        <div class="card-specs"><span>${escapeHTML(displayValue(vehicle.transmission))}</span><span>${escapeHTML(displayValue(vehicle.fuel))}</span><span>${escapeHTML(displayValue(vehicle.body))}</span></div>
        <div class="card-bottom"><div><small>Namunaviy narx</small><strong>${moneyText(vehicle.price)}</strong></div>
          <button class="compare-chip ${isCompared ? "selected" : ""}" type="button" data-action="compare" data-id="${escapeHTML(vehicle.id)}" aria-pressed="${isCompared}">${isCompared ? "✓ Qo‘shildi" : "+ Taqqoslash"}</button>
        </div>
      </div>
    </article>`;
  }

  function renderHome() {
    setPageTitle("O‘zingizga mos avtomobilni toping");
    const featured = vehicles.filter((vehicle) => vehicle.featured).slice(0, 3);
    const homeVehicles = featured.length ? featured : vehicles.slice(0, 3);
    const categories = [
      { name: "Krossover", value: "SUV", note: "Har bir yo‘l uchun kenglik", icon: "01" },
      { name: "Kupe", value: "Coupe", note: "Harakat uchun yaratilgan", icon: "02" },
      { name: "Sedan", value: "Sedan", note: "Har kun uchun qulaylik", icon: "03" },
      { name: "Kabriolet", value: "Convertible", note: "Shamolni his eting", icon: "04" }
    ];
    app.innerHTML = `
      <section class="hero">
        <div class="hero-image"></div><div class="hero-grain"></div>
        <div class="hero-content">
          <span class="eyebrow"><span class="eyebrow-line"></span> Yangi safar shu yerdan boshlanadi</span>
          <h1>O‘zingizga mos<br><em>avtomobilni toping.</em></h1>
          <p>Avtomobillarni ko‘ring, muhim xususiyatlarini taqqoslang va keyingi tanlovingizni ishonch bilan qiling.</p>
          <form class="hero-search" id="hero-search"><span class="search-icon" aria-hidden="true">⌕</span><label class="visually-hidden" for="hero-query">Marka yoki modelni qidiring</label><input id="hero-query" name="search" placeholder="Masalan: Porsche, krossover..." autocomplete="off"><button class="button button-red" type="submit">Avtomobillarni ko‘rish <span>↗</span></button></form>
          <div class="hero-proof"><span class="proof-dot"></span> Avtomobil topish platformasi, dilerlik markazi emas</div>
        </div>
        <div class="hero-index"><span>01</span><i></i><span>08</span></div>
        <div class="hero-caption">SIZNING SAFARINGIZ UCHUN <span>—</span> SHARK CAR</div>
      </section>
      <section class="intro-strip"><span>SARALANGAN AVTOMOBILLAR</span><p>Ortiqcha shovqinsiz. Yaxshi avtomobillar. Qulay tanlov.</p><a href="#catalog">Barcha avtomobillar <span>↗</span></a></section>
      <section class="section featured-section">
        <div class="section-heading"><div><span class="eyebrow">E’tiborga loyiq avtomobillar</span><h2>Diqqat <em>markazida.</em></h2></div><a class="text-link" href="#catalog">Barchasini ko‘rish <span>↗</span></a></div>
        ${homeVehicles.length ? `<div class="car-grid">${homeVehicles.map(card).join("")}</div>` : emptyState("Hozircha tanlangan avtomobillar yo‘q", "Namuna e’lonlarini boshqaruv bo‘limidan qo‘shishingiz mumkin.")}
      </section>
      <section class="category-section">
        <div class="section-heading"><div><span class="eyebrow">O‘zingizga mosini tanlang</span><h2>Kayfiyatingizga <em>mos.</em></h2></div><p>Bugungi rejalaringizga mos kuzov turidan boshlang.</p></div>
        <div class="category-grid">${categories.map((item) => `<button class="category-card" type="button" data-action="category" data-body="${item.value}"><span class="category-number">${item.icon} / 04</span><span class="category-name">${item.name}<b>↗</b></span><span class="category-note">${item.note}</span></button>`).join("")}</div>
      </section>
      <section class="manifesto"><span class="eyebrow">Tanlovni osonlashtiramiz</span><h2>To‘g‘ri qaror<br><em>aniq ma’lumotdan.</em></h2><p>Kerakli xususiyatlar, yonma-yon taqqoslash va sevimli avtomobillar — barchasi bir joyda.</p><a class="button button-outline-light" href="#catalog">Ko‘rishni boshlash <span>↗</span></a><span class="manifesto-watermark">SC</span></section>
      <section class="section latest-section"><div class="section-heading"><div><span class="eyebrow">Yana bir nechta variant</span><h2>Yangi <em>tanlovlar.</em></h2></div><a class="text-link" href="#catalog">Barchasini ko‘rish <span>↗</span></a></div>
        ${vehicles.length > 3 ? `<div class="car-grid">${vehicles.filter((vehicle) => !homeVehicles.some((featuredVehicle) => featuredVehicle.id === vehicle.id)).slice(0, 3).map(card).join("")}</div>` : `<div class="quiet-note">Namuna e’lonlarini <a href="#admin">boshqaruv bo‘limi</a> orqali qo‘shishingiz mumkin.</div>`}
      </section>`;
    bindImageFallbacks();
  }

  function emptyState(title, message, action = "") {
    return `<div class="state-panel"><span class="state-symbol">◇</span><h2>${escapeHTML(title)}</h2><p>${escapeHTML(message)}</p>${action}</div>`;
  }

  function renderCatalog() {
    setPageTitle("Avtomobillar katalogi");
    const brands = unique("brand");
    const models = unique("model", catalogFilters.brand);
    const fuels = unique("fuel");
    const transmissions = unique("transmission");
    const bodies = unique("body");
    let matches = vehicles.filter((vehicle) => {
      const query = catalogFilters.search.trim().toLowerCase();
      const queryMatch = !query || [vehicle.brand, vehicle.model, displayValue(vehicle.body), displayValue(vehicle.fuel), vehicle.year].join(" ").toLowerCase().includes(query);
      return queryMatch &&
        (!catalogFilters.brand || vehicle.brand === catalogFilters.brand) &&
        (!catalogFilters.model || vehicle.model === catalogFilters.model) &&
        (!catalogFilters.fuel || vehicle.fuel === catalogFilters.fuel) &&
        (!catalogFilters.transmission || vehicle.transmission === catalogFilters.transmission) &&
        (!catalogFilters.body || vehicle.body === catalogFilters.body) &&
        (!catalogFilters.minPrice || Number(vehicle.price) >= Number(catalogFilters.minPrice)) &&
        (!catalogFilters.maxPrice || Number(vehicle.price) <= Number(catalogFilters.maxPrice)) &&
        (!catalogFilters.minYear || Number(vehicle.year) >= Number(catalogFilters.minYear)) &&
        (!catalogFilters.maxYear || Number(vehicle.year) <= Number(catalogFilters.maxYear));
    });
    const sorting = {
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      "year-desc": (a, b) => b.year - a.year,
      "year-asc": (a, b) => a.year - b.year,
      "name-asc": (a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`),
      featured: (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || b.year - a.year
    };
    matches = [...matches].sort(sorting[catalogFilters.sort] || sorting.featured);
    const filters = [
      selectFilter("brand", "Barcha markalar", brands), selectFilter("model", "Barcha modellar", models, !catalogFilters.brand),
      selectFilter("fuel", "Barcha yoqilg‘i turlari", fuels), selectFilter("transmission", "Barcha uzatmalar", transmissions),
      selectFilter("body", "Barcha kuzov turlari", bodies)
    ];
    app.innerHTML = `<section class="page-banner catalog-banner"><div class="page-banner-inner"><span class="eyebrow">O‘zingizga mosini toping</span><h1>Avtomobillar <em>katalogi.</em></h1><p>O‘zingiz uchun muhim xususiyatlar bo‘yicha namuna e’lonlarni saralang.</p></div><span class="banner-index">SC / 01</span></section>
      <section class="catalog-wrap">
        <form class="filter-panel" id="filter-form">
          <div class="filter-top"><div><span class="eyebrow">Qidiruvni aniqlashtiring</span><h2>O‘zingizga <em>moslang.</em></h2></div><button class="clear-filters" type="button" data-action="clear-filters">Tozalash</button></div>
          <div class="filter-fields"><label class="filter-search wide-filter">Qidiruv<input name="search" type="search" placeholder="Marka, model yoki kalit so‘z" value="${escapeHTML(catalogFilters.search)}"></label>
            ${filters.join("")}
            <label>Eng past narx<input name="minPrice" type="number" min="0" placeholder="$ dan" value="${escapeHTML(catalogFilters.minPrice)}"></label>
            <label>Eng yuqori narx<input name="maxPrice" type="number" min="0" placeholder="$ gacha" value="${escapeHTML(catalogFilters.maxPrice)}"></label>
            <label>Yil (dan)<input name="minYear" type="number" min="1900" max="2100" placeholder="Yil" value="${escapeHTML(catalogFilters.minYear)}"></label>
            <label>Yil (gacha)<input name="maxYear" type="number" min="1900" max="2100" placeholder="Yil" value="${escapeHTML(catalogFilters.maxYear)}"></label>
          </div>
          <button class="button button-dark filter-submit" type="submit">Saralash <span>↗</span></button>
        </form>
        <div class="results-toolbar"><p><strong>${matches.length}</strong> ta avtomobil topildi <span>· Namuna e’lonlar</span></p><label class="sort-control">Saralash: <select name="sort" id="sort-select"><option value="featured" ${catalogFilters.sort === "featured" ? "selected" : ""}>Tanlanganlar</option><option value="price-asc" ${catalogFilters.sort === "price-asc" ? "selected" : ""}>Narx: arzondan qimmatga</option><option value="price-desc" ${catalogFilters.sort === "price-desc" ? "selected" : ""}>Narx: qimmatdan arzonga</option><option value="year-desc" ${catalogFilters.sort === "year-desc" ? "selected" : ""}>Yil: yangisidan</option><option value="year-asc" ${catalogFilters.sort === "year-asc" ? "selected" : ""}>Yil: eskisidan</option><option value="name-asc" ${catalogFilters.sort === "name-asc" ? "selected" : ""}>Nomi: A–Z</option></select></label></div>
        ${matches.length ? `<div class="car-grid catalog-grid">${matches.map(card).join("")}</div>` : emptyState("Mos avtomobillar topilmadi", "Narx oralig‘ini kengaytiring yoki ayrim saralash shartlarini olib tashlang.", '<button class="button button-dark" data-action="clear-filters">Saralashni tozalash</button>')}
      </section>`;
    bindImageFallbacks();
  }

  function unique(key, brandFilter = "") {
    return [...new Set(vehicles.filter((vehicle) => !brandFilter || vehicle.brand === brandFilter).map((vehicle) => vehicle[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
  }

  function selectFilter(name, label, values, disabled = false) {
    const names = { brand: "Marka", model: "Model", fuel: "Yoqilg‘i turi", transmission: "Uzatmalar qutisi", body: "Kuzov turi" };
    return `<label>${names[name]}<select name="${name}" ${disabled ? "disabled" : ""}><option value="">${label}</option>${values.map((value) => `<option value="${escapeHTML(value)}" ${catalogFilters[name] === value ? "selected" : ""}>${escapeHTML(displayValue(value))}</option>`).join("")}</select></label>`;
  }

  function renderDetail(id) {
    const vehicle = vehicles.find((item) => item.id === decodeURIComponent(id));
    if (!vehicle) { renderNotFound(); return; }
    setPageTitle(`${vehicle.year} ${vehicle.brand} ${vehicle.model}`);
    const images = Array.isArray(vehicle.images) && vehicle.images.length ? vehicle.images : [""];
    selectedImage = Math.min(selectedImage, images.length - 1);
    app.innerHTML = `<section class="detail-page">
      <div class="detail-crumb"><a href="#catalog">Barcha avtomobillar</a><span>/</span><span>${escapeHTML(vehicle.brand)}</span><span>/</span><span>${escapeHTML(vehicle.model)}</span></div>
      <div class="detail-heading"><div><span class="eyebrow">${escapeHTML(vehicle.year)} · ${escapeHTML(displayValue(vehicle.body || "Avtomobil"))} · ${escapeHTML(saleStatus(vehicle))}</span><h1>${escapeHTML(vehicle.brand)} <em>${escapeHTML(vehicle.model)}</em></h1></div><div class="detail-price"><small>Namunaviy narx (USD)</small><strong>${moneyText(vehicle.price)}</strong><span>Taxminiy narx · Jonli taklif emas</span></div></div>
      <div class="gallery-layout"><div class="gallery-main">${imageMarkup(vehicle, "detail-main-image", selectedImage)}<span class="gallery-counter">${String(selectedImage + 1).padStart(2, "0")} / ${String(images.length).padStart(2, "0")}</span></div>
        <div class="gallery-thumbs">${images.map((_, index) => `<button class="gallery-thumb ${index === selectedImage ? "active" : ""}" type="button" data-action="gallery" data-index="${index}" aria-label="${index + 1}-rasmni ko‘rish">${imageMarkup(vehicle, "", index)}</button>`).join("")}</div></div>
      <div class="detail-columns"><section class="detail-description"><span class="eyebrow">Batafsil ma’lumot</span><h2>Har bir lahza <em>o‘zgacha.</em></h2><p>${escapeHTML(vehicle.description || "Bu namuna e’loniga qo‘shimcha ma’lumotlar kiritilishi mumkin.")}</p><div class="detail-actions"><button class="button button-red" data-action="favorite" data-id="${escapeHTML(vehicle.id)}">${favorites.includes(vehicle.id) ? "♥ Sevimlilarda" : "♡ Sevimlilarga qo‘shish"}</button><button class="button button-outline-dark" data-action="compare" data-id="${escapeHTML(vehicle.id)}">${compareIds.includes(vehicle.id) ? "✓ Taqqoslashga qo‘shilgan" : "+ Taqqoslashga qo‘shish"}</button><a class="button button-dark" href="#contact/${encodeURIComponent(vehicle.id)}">Sotuv bo‘yicha bog‘lanish <span>↗</span></a></div></section>
        <section class="spec-panel"><div class="spec-heading"><span class="eyebrow">Asosiy xususiyatlar</span><span class="sample-label">NAMUNA MA’LUMOTLARI</span></div><div class="spec-grid">${spec("Ishlab chiqarilgan yil", vehicle.year)}${spec("Yurgan masofa", vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} mil` : "Ko‘rsatilmagan")}${spec("Yoqilg‘i turi", displayValue(vehicle.fuel))}${spec("Uzatmalar qutisi", displayValue(vehicle.transmission))}${spec("Kuzov turi", displayValue(vehicle.body))}${spec("Quvvati", vehicle.power ? vehicle.power.replace(" hp", " ot kuchi") : "")}${spec("Dvigatel", vehicle.engine)}${spec("Tortish turi", displayValue(vehicle.drivetrain))}${spec("O‘rindiqlar soni", vehicle.seats)}${spec("Rangi", vehicle.color)}</div></section></div>
      <div class="disclaimer"><span>!</span><p>Bu avtomobil namuna e’loni hisoblanadi. Xususiyatlar va taxminiy narxlar misol tariqasida berilgan hamda mustaqil tekshirilmagan. Ushbu prototipdagi aloqa shakli sotuvchiga xabar yubormaydi.</p></div>
      </section>`;
    bindImageFallbacks();
  }

  function spec(label, value) {
    return `<div class="spec-item"><span>${escapeHTML(label)}</span><strong>${escapeHTML(displayValue(value))}</strong></div>`;
  }

  function renderFavorites() {
    setPageTitle("Sevimli avtomobillar");
    const saved = vehicles.filter((vehicle) => favorites.includes(vehicle.id));
    app.innerHTML = `<section class="page-banner simple-banner"><div class="page-banner-inner"><span class="eyebrow">Yoqtirganlaringizni saqlang</span><h1>Sizning <em>tanlovlaringiz.</em></h1><p>Sevimli avtomobillar ushbu qurilmada saqlanadi.</p></div></section><section class="section listing-page">${saved.length ? `<div class="results-toolbar"><p><strong>${saved.length}</strong> ta saqlangan avtomobil</p><a class="text-link" href="#catalog">Yana ko‘rish <span>↗</span></a></div><div class="car-grid">${saved.map(card).join("")}</div>` : emptyState("Sevimlilar ro‘yxati bo‘sh", "Yoqtirgan avtomobilingizni saqlang — u shu yerda ko‘rinadi.", '<a class="button button-dark" href="#catalog">Avtomobillarni ko‘rish <span>↗</span></a>')}</section>`;
    bindImageFallbacks();
  }

  function renderCompare() {
    setPageTitle("Avtomobillarni taqqoslash");
    const compared = compareIds.map((id) => vehicles.find((vehicle) => vehicle.id === id)).filter(Boolean);
    const available = vehicles.filter((vehicle) => !compareIds.includes(vehicle.id));
    const rows = [
      ["Namunaviy narx", (vehicle) => moneyText(vehicle.price)], ["Ishlab chiqarilgan yil", (vehicle) => vehicle.year],
      ["Yurgan masofa", (vehicle) => vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} mil` : "Ko‘rsatilmagan"],
      ["Kuzov turi", (vehicle) => displayValue(vehicle.body)], ["Yoqilg‘i turi", (vehicle) => displayValue(vehicle.fuel)],
      ["Uzatmalar qutisi", (vehicle) => displayValue(vehicle.transmission)], ["Dvigatel", (vehicle) => vehicle.engine],
      ["Quvvati", (vehicle) => vehicle.power?.replace(" hp", " ot kuchi")], ["Tortish turi", (vehicle) => displayValue(vehicle.drivetrain)], ["O‘rindiqlar soni", (vehicle) => vehicle.seats]
    ];
    app.innerHTML = `<section class="page-banner simple-banner"><div class="page-banner-inner"><span class="eyebrow">Yonma-yon ko‘rib chiqing</span><h1>Aniq <em>tanlov qiling.</em></h1><p>Uchtagacha avtomobilni taqqoslang. Ma’lumotlar namuna e’lonlardan olingan.</p></div></section><section class="compare-page">
      <div class="compare-toolbar"><div><span class="eyebrow">Taqqoslash ro‘yxati</span><p>${compared.length} / 3 ta avtomobil tanlandi</p></div><label class="add-compare">Avtomobil qo‘shish<select id="compare-select" ${!available.length || compared.length >= 3 ? "disabled" : ""}><option value="">Avtomobilni tanlang…</option>${available.map((vehicle) => `<option value="${escapeHTML(vehicle.id)}">${escapeHTML(vehicle.brand)} ${escapeHTML(vehicle.model)}</option>`).join("")}</select></label></div>
      ${compared.length ? `<div class="compare-scroll"><table class="compare-table"><thead><tr><th scope="col">Xususiyatlar</th>${compared.map((vehicle) => `<th scope="col"><div class="compare-car-head">${imageMarkup(vehicle, "compare-image")}<span class="eyebrow">${escapeHTML(vehicle.year)} · ${escapeHTML(vehicle.brand)}</span><h2>${escapeHTML(vehicle.model)}</h2><a href="#car/${encodeURIComponent(vehicle.id)}" class="text-link">Batafsil ↗</a><button class="remove-compare" type="button" data-action="remove-compare" data-id="${escapeHTML(vehicle.id)}">Olib tashlash</button></div></th>`).join("")}${Array.from({ length: Math.max(0, 3 - compared.length) }, () => '<th class="empty-compare" scope="col">Avtomobil qo‘shing<br><span>Yuqoridagi menyudan tanlang</span></th>').join("")}</tr></thead><tbody>${rows.map(([label, getter]) => `<tr><th scope="row">${label}</th>${compared.map((vehicle) => `<td>${escapeHTML(displayValue(getter(vehicle) || "Ko‘rsatilmagan"))}</td>`).join("")}${Array.from({ length: Math.max(0, 3 - compared.length) }, () => "<td>—</td>").join("")}</tr>`).join("")}</tbody></table></div><p class="compare-disclaimer">Namunaviy narx va xususiyatlarni mustaqil ravishda tekshirib ko‘ring.</p>` : emptyState("Taqqoslashni boshlang", "Xususiyatlarini yonma-yon solishtirish uchun uchtagacha avtomobil qo‘shing.", '<a class="button button-dark" href="#catalog">Avtomobillarni ko‘rish <span>↗</span></a>')}
      </section>`;
    bindImageFallbacks();
  }

  function renderContact(vehicleId = "") {
    setPageTitle("Biz bilan bog‘lanish");
    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === decodeURIComponent(vehicleId));
    app.innerHTML = `<section class="page-banner simple-banner"><div class="page-banner-inner"><span class="eyebrow">Fikringiz biz uchun muhim</span><h1>Biz bilan <em>bog‘laning.</em></h1><p>Platforma yoki namuna e’lonlar haqida savolingiz bormi? Xabar qoldiring.</p></div></section>
      <section class="contact-layout"><div class="contact-aside"><span class="eyebrow">Avtomobil bo‘yicha so‘rov</span><h2>Qiziqqan avtomobilingiz haqida <em>xabar qoldiring.</em></h2><p>Ismingiz va telefon raqamingizni kiriting. So‘rovingiz ushbu brauzerdagi admin panelida ko‘rinadi, shunda siz bilan telefon orqali bog‘lanish mumkin.</p><div class="contact-aside-rule"></div><span class="sample-label">SAYT EGASI · JAMSHIDBEK (@JS_MUXANDIS)</span><p class="shop-contact-label">Do‘kon bilan bevosita bog‘lanish</p><a class="shop-phone" href="tel:${shopPhone}">+998 93 115 03 89 <span>↗</span></a><p class="local-warning">Hozircha so‘rovlar faqat shu brauzerda saqlanadi. Boshqa qurilmadagi tashrif buyuruvchilardan so‘rov olish uchun server ulash kerak.</p></div>
      <form class="contact-form" id="contact-form"><div class="form-heading"><span class="eyebrow">Bog‘lanish ma’lumotlari</span><p>Ism va telefon raqami shart.</p></div><div class="form-two"><label>Ismingiz *<input name="name" required maxlength="100" autocomplete="name" placeholder="Ism Familiya"></label><label>Telefon raqamingiz *<input name="phone" required type="tel" maxlength="30" autocomplete="tel" placeholder="+998 90 123 45 67"></label></div><label>Qaysi avtomobilga qiziqyapsiz?<select name="vehicleId"><option value="">Hali tanlamadim / umumiy savol</option>${vehicles.map((vehicle) => `<option value="${escapeHTML(vehicle.id)}" ${selectedVehicle?.id === vehicle.id ? "selected" : ""}>${escapeHTML(vehicle.brand)} ${escapeHTML(vehicle.model)} · ${moneyText(vehicle.price)}</option>`).join("")}</select></label><label>Xabar yoki qo‘shimcha ma’lumot<textarea name="message" rows="5" maxlength="2000" placeholder="Qaysi avtomobil va narx haqida gaplashmoqchisiz?"></textarea></label><button class="button button-red" type="submit">So‘rov qoldirish <span>↗</span></button><p class="form-note">Demo: so‘rov faqat shu qurilma brauzerida saqlanadi; egasiga avtomatik yuborilmaydi.</p><div class="form-response" id="contact-response" hidden></div></form></section>`;
  }

  function renderAdmin() {
    setPageTitle("E’lonlarni boshqarish");
    const form = adminFormOpen ? adminFormMarkup() : "";
    app.innerHTML = `<section class="page-banner admin-banner"><div class="page-banner-inner"><span class="eyebrow">Mahalliy prototip boshqaruvi</span><h1>E’lonlarni <em>boshqarish.</em></h1><p>Namuna e’lonlarini qo‘shing, tahrirlang yoki o‘chiring. O‘zgarishlar faqat shu brauzerda saqlanadi.</p></div><button class="admin-logout" type="button" data-action="admin-logout">Admin chiqish</button><span class="banner-index">ADMIN / LOCAL</span></section><section class="admin-page">
      <div class="admin-notice"><span>i</span><p><strong>Faqat prototip uchun.</strong> E’lonlar va mijoz so‘rovlari shu brauzerda saqlanadi. Boshqa odamning qurilmasidan yuborilgan so‘rov sizga kelishi uchun server kerak.</p></div>
      ${renderInquiries()}
      <div class="admin-toolbar"><div><span class="eyebrow">Avtomobil e’lonlari</span><h2>${vehicles.length} ta <em>e’lon</em></h2></div><button class="button button-red" type="button" data-action="new-listing">+ E’lon qo‘shish</button></div>
      ${form}
      ${vehicles.length ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Avtomobil</th><th>Yili</th><th>Namunaviy narx (USD)</th><th>Holati</th><th>Yoqilg‘i</th><th>Uzatmalar qutisi</th><th>Amallar</th></tr></thead><tbody>${vehicles.map((vehicle) => `<tr><td><div class="admin-vehicle">${imageMarkup(vehicle, "admin-thumb")}<span><strong>${escapeHTML(vehicle.brand)} ${escapeHTML(vehicle.model)}</strong><small>${escapeHTML(displayValue(vehicle.body || "Avtomobil"))}</small></span></div></td><td>${escapeHTML(vehicle.year)}</td><td>${moneyText(vehicle.price)}</td><td>${escapeHTML(saleStatus(vehicle))}</td><td>${escapeHTML(displayValue(vehicle.fuel))}</td><td>${escapeHTML(displayValue(vehicle.transmission))}</td><td><div class="admin-actions"><button type="button" data-action="edit-listing" data-id="${escapeHTML(vehicle.id)}">Tahrirlash</button><button class="delete-action" type="button" data-action="delete-listing" data-id="${escapeHTML(vehicle.id)}">O‘chirish</button></div></td></tr>`).join("")}</tbody></table></div>` : emptyState("Hozircha e’lonlar yo‘q", "Boshlash uchun namuna e’lonini qo‘shing.")}<p class="admin-footnote">Haqiqiy sayt uchun ushbu boshqaruv panelini xavfsiz serverga ulang va e’lonlarni chop etishdan oldin tekshiring.</p></section>`;
    bindImageFallbacks();
  }

  function renderInquiries() {
    const sorted = [...inquiries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const pending = sorted.filter((item) => item.status !== "called").length;
    return `<section class="inquiries-panel"><div class="inquiries-heading"><div><span class="eyebrow">Mijozlardan kelgan so‘rovlar · shu brauzer</span><h2>${sorted.length} ta <em>so‘rov</em></h2></div><span class="inquiry-count">${pending} ta javob kutilmoqda</span></div>${sorted.length ? `<div class="admin-table-wrap"><table class="admin-table inquiries-table"><thead><tr><th>Holat</th><th>Mijoz</th><th>Telefon</th><th>Qiziqqan avtomobil</th><th>Xabar</th><th>Vaqt</th><th>Amallar</th></tr></thead><tbody>${sorted.map((item) => `<tr><td><span class="inquiry-status ${item.status === "called" ? "inquiry-status-called" : ""}">${item.status === "called" ? "Qo‘ng‘iroq qilindi" : "Yangi"}</span></td><td><strong>${escapeHTML(item.name)}</strong></td><td><a class="phone-link" href="tel:${escapeHTML(item.phone.split("").filter((character) => character === "+" || (character >= "0" && character <= "9")).join(""))}">${escapeHTML(item.phone)}</a></td><td>${escapeHTML(item.vehicleName || "Umumiy savol")}</td><td class="inquiry-message">${escapeHTML(item.message || "—")}</td><td>${escapeHTML(new Date(item.createdAt).toLocaleString("uz-UZ"))}</td><td><div class="admin-actions">${item.status !== "called" ? `<button type="button" data-action="mark-inquiry-called" data-id="${escapeHTML(item.id)}">Qo‘ng‘iroq qilindi</button>` : ""}<button class="delete-action" type="button" data-action="delete-inquiry" data-id="${escapeHTML(item.id)}">O‘chirish</button></div></td></tr>`).join("")}</tbody></table></div>` : `<p class="inquiries-empty">Hozircha so‘rov yo‘q. Tashrif buyuruvchilar avtomobil sahifasidagi “Sotuv bo‘yicha bog‘lanish” tugmasidan so‘rov qoldirishi mumkin.</p>`}</section>`;
  }

  function updateInquiry(id, status) {
    const next = inquiries.map((inquiry) => inquiry.id === id ? { ...inquiry, status } : inquiry);
    if (!writeStorage(storageKeys.inquiries, next)) return;
    inquiries = next;
    navCounts();
    renderAdmin();
    notify("Mijoz so‘rovi yangilandi.");
  }

  function deleteInquiry(id) {
    const inquiry = inquiries.find((item) => item.id === id);
    if (!inquiry || !window.confirm(`${inquiry.name} mijozining so‘rovi o‘chirilsinmi?`)) return;
    const next = inquiries.filter((item) => item.id !== id);
    if (!writeStorage(storageKeys.inquiries, next)) return;
    inquiries = next;
    navCounts();
    renderAdmin();
    notify("Mijoz so‘rovi o‘chirildi.");
  }

  function adminFormMarkup() {
    const vehicle = editingId ? vehicles.find((item) => item.id === editingId) : null;
    const value = (key) => escapeHTML(vehicle?.[key] ?? "");
    const field = (name, label, type = "text", required = false) => `<label>${label}${required ? " *" : ""}<input name="${name}" type="${type}" value="${value(name)}" ${required ? "required" : ""} ${type === "number" && (name === "price" || name === "mileage") ? 'min="0"' : ""} ${type === "number" && name === "year" ? 'min="1886" max="2100"' : ""}></label>`;
    const selectField = (name, label, options) => `<label>${label}<select name="${name}"><option value="">Tanlang</option>${options.map((option) => `<option value="${escapeHTML(option)}" ${vehicle?.[name] === option ? "selected" : ""}>${escapeHTML(name === "status" ? ({ sale: "Sotuvda", reserved: "Band qilingan", sold: "Sotildi" }[option]) : displayValue(option))}</option>`).join("")}</select></label>`;
    const currentImage = imageURL(vehicle || { images: [] });
    return `<form class="admin-form" id="admin-form"><div class="admin-form-title"><div><span class="eyebrow">${vehicle ? "E’lonni yangilash" : "Namuna e’loni yaratish"}</span><h3>${vehicle ? `${escapeHTML(vehicle.brand)} ${escapeHTML(vehicle.model)} — tahrirlash` : "Yangi avtomobil"}</h3></div><button class="form-close" type="button" data-action="close-admin-form" aria-label="Shaklni yopish">×</button></div>
      <div class="admin-form-grid">${field("brand", "Marka", "text", true)}${field("model", "Model", "text", true)}${field("year", "Ishlab chiqarilgan yil", "number", true)}${field("price", "Namunaviy narx (USD)", "number", true)}${field("mileage", "Yurgan masofa (mil)", "number")}${selectField("fuel", "Yoqilg‘i turi", ["Petrol", "Electric", "Hybrid"])}${selectField("transmission", "Uzatmalar qutisi", ["Automatic", "Manual"])}${selectField("body", "Kuzov turi", ["SUV", "Coupe", "Sedan", "Wagon", "Convertible", "Van"])}${selectField("status", "E’lon holati", ["sale", "reserved", "sold"])}${field("power", "Quvvati")}${field("engine", "Dvigatel")}${selectField("drivetrain", "Tortish turi", ["Rear-Wheel Drive", "All-Wheel Drive"])}${field("seats", "O‘rindiqlar soni", "number")}${field("color", "Rangi")}<label class="admin-description">E’lon matni / sotuv haqida batafsil<textarea name="description" rows="3">${value("description")}</textarea></label><label class="admin-image-field">Asosiy rasm manzili<input name="image" type="url" value="${escapeHTML(currentImage.startsWith("data:") ? "" : currentImage)}" placeholder="https://rasm-manzili.jpg"></label><label class="admin-upload">Yoki qurilmadan rasm yuklang<input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp"><small>PNG, JPEG yoki WebP rasm; 700 KB dan kichik bo‘lsin. Brauzer xotirasida saqlanadi.</small></label><label class="featured-check"><input name="featured" type="checkbox" ${vehicle?.featured ? "checked" : ""}> Bosh sahifada ajratib ko‘rsatish</label></div>
      <div class="admin-form-actions"><button class="button button-dark" type="submit">${vehicle ? "O‘zgarishlarni saqlash" : "Namuna e’lonini qo‘shish"} <span>↗</span></button><button class="text-button" type="button" data-action="close-admin-form">Bekor qilish</button></div></form>`;
  }

  function hasDemoAdminSession() {
    try {
      return sessionStorage.getItem(demoAdminSessionKey) === "true";
    } catch (error) {
      console.error("Unable to read the local admin demo session.", error);
      return false;
    }
  }

  function renderAdminLogin() {
    setPageTitle("Admin kirish");
    app.innerHTML = `<section class="page-banner simple-banner"><div class="page-banner-inner"><span class="eyebrow">Faqat boshqaruv uchun</span><h1>Admin <em>kirishi.</em></h1><p>E’lonlarni boshqarish sahifasiga o‘ting.</p></div></section>
      <section class="admin-login-wrap"><form class="admin-login-card" id="admin-login-form"><span class="login-lock" aria-hidden="true">S</span><span class="eyebrow">Administrator</span><h2>Admin paneliga <em>kirish.</em></h2><p class="login-disclaimer">Demo hisob: login va parol loyiha JavaScript faylida ko‘rinadi. Bu sinov uchun; haqiqiy himoya emas. Maxfiy yoki amaldagi parolingizni bu yerga kiritmang.</p><label>Gmail yoki login nomi<input name="email" type="text" autocomplete="username" required placeholder="Gmail yoki login nomingiz"></label><label>Parol<input name="password" type="password" autocomplete="current-password" required placeholder="Parolingiz"></label><p class="login-error" id="login-error" role="alert" hidden>Login yoki parol noto‘g‘ri. Qayta urinib ko‘ring.</p><button class="button button-red" type="submit">Admin paneliga kirish <span>↗</span></button><p class="login-footnote">Haqiqiy himoya uchun keyinchalik server autentifikatsiyasini ulang.</p></form></section>`;
  }

  function renderNotFound() {
    setPageTitle("Sahifa topilmadi");
    app.innerHTML = `<section class="state-panel not-found"><span class="eyebrow">404 · Sahifa topilmadi</span><h1>Bu yo‘l shu yerda tugaydi.</h1><p>Siz izlagan sahifa yoki e’lon topilmadi.</p><a class="button button-dark" href="#home">Bosh sahifaga qaytish <span>↗</span></a></section>`;
  }

  function bindImageFallbacks() {
    app.querySelectorAll("img[data-car-image]").forEach((image) => {
      image.addEventListener("error", () => {
        image.classList.add("image-fallback");
        image.removeAttribute("src");
        image.alt = `${image.alt} rasmi mavjud emas`;
      }, { once: true });
    });
  }

  function toggleFavorite(id) {
    const next = favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id];
    if (!writeStorage(storageKeys.favorites, next)) return;
    favorites = next;
    notify(favorites.includes(id) ? "Avtomobil ushbu qurilmadagi sevimlilarga saqlandi." : "Avtomobil sevimlilardan olib tashlandi.");
    render();
  }

  function toggleCompare(id) {
    if (!vehicles.some((vehicle) => vehicle.id === id)) return;
    if (compareIds.includes(id)) {
      const next = compareIds.filter((item) => item !== id);
      if (!writeStorage(storageKeys.compare, next)) return;
      compareIds = next;
      notify("Avtomobil taqqoslash ro‘yxatidan olib tashlandi.");
    } else {
      if (compareIds.length >= 3) {
        notify("Uchtagacha avtomobilni taqqoslashingiz mumkin. Yangi avtomobil qo‘shish uchun bittasini olib tashlang.", "error");
        return;
      }
      const next = [...compareIds, id];
      if (!writeStorage(storageKeys.compare, next)) return;
      compareIds = next;
      notify("Avtomobil taqqoslash ro‘yxatiga qo‘shildi.");
    }
    render();
  }

  function resetCatalogFilters() {
    catalogFilters = { search: "", brand: "", model: "", fuel: "", transmission: "", body: "", minPrice: "", maxPrice: "", minYear: "", maxYear: "", sort: "featured" };
    render();
  }

  document.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      const { action, id } = actionButton.dataset;
      if (action === "favorite") toggleFavorite(id);
      else if (action === "compare" || action === "remove-compare") toggleCompare(id);
      else if (action === "clear-filters") resetCatalogFilters();
      else if (action === "category") {
        catalogFilters = { search: "", brand: "", model: "", fuel: "", transmission: "", body: actionButton.dataset.body || "", minPrice: "", maxPrice: "", minYear: "", maxYear: "", sort: "featured" };
        window.location.hash = "#catalog";
      } else if (action === "gallery") { selectedImage = Number(actionButton.dataset.index) || 0; render(); }
      else if (action === "new-listing") { editingId = null; adminFormOpen = true; render(); document.querySelector("#admin-form")?.scrollIntoView({ behavior: "smooth", block: "center" }); }
      else if (action === "edit-listing") { editingId = id; adminFormOpen = true; render(); document.querySelector("#admin-form")?.scrollIntoView({ behavior: "smooth", block: "center" }); }
      else if (action === "close-admin-form") { adminFormOpen = false; editingId = null; render(); }
      else if (action === "delete-listing") deleteListing(id);
      else if (action === "mark-inquiry-called") updateInquiry(id, "called");
      else if (action === "delete-inquiry") deleteInquiry(id);
      else if (action === "admin-logout") {
        try {
          sessionStorage.removeItem(demoAdminSessionKey);
          adminFormOpen = false;
          editingId = null;
          renderAdminLogin();
        } catch (error) {
          console.error("Unable to end the local admin demo session.", error);
          notify("Admin demo-sessiyasidan chiqib bo‘lmadi. Brauzer sozlamalarini tekshiring.", "error");
        }
      }
      else if (action === "refresh") render();
      return;
    }
    if (event.target.closest(".main-nav a, .header-cta, .admin-shortcut, .brand, .footer-links a")) {
      document.querySelector(".main-nav")?.classList.remove("nav-open");
      document.querySelector(".menu-toggle")?.setAttribute("aria-expanded", "false");
      document.querySelector(".menu-toggle")?.setAttribute("aria-label", "Menyuni ochish");
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.id === "sort-select") { catalogFilters.sort = target.value; render(); }
    if (target.id === "compare-select" && target.value) toggleCompare(target.value);
    if (target.name === "brand" && activeRoute().page === "catalog") {
      catalogFilters.brand = target.value;
      catalogFilters.model = "";
      render();
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (form.id === "hero-search") {
      event.preventDefault();
      catalogFilters.search = new FormData(form).get("search").toString().trim();
      catalogFilters.brand = ""; catalogFilters.model = "";
      window.location.hash = "#catalog";
    } else if (form.id === "filter-form") {
      event.preventDefault();
      const values = new FormData(form);
      const minPrice = values.get("minPrice").toString();
      const maxPrice = values.get("maxPrice").toString();
      const minYear = values.get("minYear").toString();
      const maxYear = values.get("maxYear").toString();
      if ((minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) || (minYear && maxYear && Number(minYear) > Number(maxYear))) {
        notify("Eng kam qiymat eng yuqori qiymatdan katta bo‘lishi mumkin emas.", "error");
        return;
      }
      ["search", "brand", "model", "fuel", "transmission", "body", "minPrice", "maxPrice", "minYear", "maxYear"].forEach((key) => { catalogFilters[key] = values.get(key)?.toString().trim() || ""; });
      render();
    } else if (form.id === "contact-form") {
      event.preventDefault();
      const values = new FormData(form);
      const vehicleId = values.get("vehicleId").toString();
      const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
      const inquiry = {
        id: `inquiry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: values.get("name").toString().trim(),
        phone: values.get("phone").toString().trim(),
        vehicleId: selectedVehicle?.id || "",
        vehicleName: selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : "",
        message: values.get("message").toString().trim(),
        createdAt: new Date().toISOString(),
        status: "new"
      };
      const nextInquiries = [inquiry, ...inquiries];
      if (!writeStorage(storageKeys.inquiries, nextInquiries)) return;
      inquiries = nextInquiries;
      navCounts();
      const response = document.querySelector("#contact-response");
      response.hidden = false;
      response.innerHTML = `<strong>${escapeHTML(inquiry.name)}, so‘rovingiz ushbu brauzerda saqlandi.</strong><br>${selectedVehicle ? `${escapeHTML(inquiry.vehicleName)} bo‘yicha` : ""} telefon raqamingiz admin panelida ko‘rinadi. Bu demo server orqali boshqa qurilmaga yuborilmaydi.`;
      form.reset();
      notify("So‘rov ushbu brauzerda saqlandi. Egaga avtomatik yuborilmadi.", "success");
    } else if (form.id === "admin-form") {
      event.preventDefault();
      saveAdminForm(form);
    } else if (form.id === "admin-login-form") {
      event.preventDefault();
      const values = new FormData(form);
      const email = values.get("email").toString().trim();
      const password = values.get("password").toString();
      if (email !== demoAdminCredentials.email || password !== demoAdminCredentials.password) {
        document.querySelector("#login-error").hidden = false;
        form.elements.password.value = "";
        return;
      }
      try {
        sessionStorage.setItem(demoAdminSessionKey, "true");
        renderAdmin();
        notify("Admin paneli ochildi. Bu demo kirish; haqiqiy himoya emas.", "error");
      } catch (error) {
        console.error("Unable to start the local admin demo session.", error);
        notify("Brauzer demo-sessiyasini saqlay olmadi. Brauzer sozlamalarini tekshiring.", "error");
      }
    }
  });

  async function saveAdminForm(form) {
    const data = new FormData(form);
    const brand = data.get("brand").toString().trim();
    const model = data.get("model").toString().trim();
    const year = Number(data.get("year"));
    const price = Number(data.get("price"));
    if (!brand || !model || !Number.isInteger(year) || year < 1886 || year > 2100 || !Number.isFinite(price) || price < 0) {
      notify("Marka, model, to‘g‘ri yil va noldan kam bo‘lmagan namunaviy narxni kiriting.", "error");
      return;
    }
    const old = editingId ? vehicles.find((vehicle) => vehicle.id === editingId) : null;
    const generatedId = `${brand}-${model}-${year}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let id = old?.id || generatedId || `vehicle-${Date.now()}`;
    if (!old && vehicles.some((vehicle) => vehicle.id === id)) id = `${id}-${Date.now().toString(36)}`;
    const rawImage = data.get("image").toString().trim();
    const imageFile = data.get("imageFile");
    let uploadedImage = "";
    if (imageFile instanceof File && imageFile.size > 0) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(imageFile.type)) {
        notify("PNG, JPEG yoki WebP formatidagi rasmni tanlang.", "error");
        return;
      }
      if (imageFile.size > 700 * 1024) {
        notify("Rasm 700 KB dan kichik bo‘lishi kerak.", "error");
        return;
      }
      try {
        uploadedImage = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.addEventListener("load", () => resolve(reader.result.toString()));
          reader.addEventListener("error", () => reject(reader.error || new Error("Rasmni o‘qib bo‘lmadi.")));
          reader.readAsDataURL(imageFile);
        });
      } catch (error) {
        console.error("Unable to read the selected vehicle image.", error);
        notify("Rasm faylini o‘qib bo‘lmadi. Boshqa rasm tanlang.", "error");
        return;
      }
    }
    const image = uploadedImage || rawImage;
    const status = data.get("status").toString();
    const vehicle = {
      ...(old || {}),
      id, brand, model, year, price, mileage: Number(data.get("mileage")) || 0,
      fuel: data.get("fuel").toString().trim(), transmission: data.get("transmission").toString().trim(),
      body: data.get("body").toString().trim(), power: data.get("power").toString().trim(),
      engine: data.get("engine").toString().trim(), drivetrain: data.get("drivetrain").toString().trim(),
      seats: Number(data.get("seats")) || "", color: data.get("color").toString().trim(),
      description: data.get("description").toString().trim(), featured: data.get("featured") === "on",
      status: ["sale", "reserved", "sold"].includes(status) ? status : "sale",
      images: image ? [image, ...(old?.images || []).filter((savedImage) => savedImage !== image).slice(0, 2)] : (old?.images || [])
    };
    const next = old ? vehicles.map((item) => item.id === old.id ? vehicle : item) : [...vehicles, vehicle];
    if (!writeStorage(storageKeys.vehicles, next)) return;
    vehicles = next;
    editingId = null;
    adminFormOpen = false;
    notify(old ? "Namuna e’loni ushbu brauzerda yangilandi." : "Namuna e’loni ushbu brauzerga qo‘shildi.");
    render();
  }

  function deleteListing(id) {
    const vehicle = vehicles.find((item) => item.id === id);
    if (!vehicle) return;
    if (!window.confirm(`${vehicle.brand} ${vehicle.model} namuna e’loni o‘chirilsinmi? U faqat ushbu brauzerdan o‘chiriladi.`)) return;
    const nextVehicles = vehicles.filter((item) => item.id !== id);
    const nextFavorites = favorites.filter((item) => item !== id);
    const nextCompare = compareIds.filter((item) => item !== id);
    if (!writeStorage(storageKeys.vehicles, nextVehicles)) return;
    const favoritesSaved = writeStorage(storageKeys.favorites, nextFavorites);
    const compareSaved = writeStorage(storageKeys.compare, nextCompare);
    vehicles = nextVehicles;
    favorites = favoritesSaved ? nextFavorites : favorites;
    compareIds = compareSaved ? nextCompare : compareIds;
    if (!favoritesSaved || !compareSaved) notify("E’lon o‘chirildi, ammo saqlangan ro‘yxatlardan birini yangilab bo‘lmadi.", "error");
    else notify("Namuna e’loni ushbu brauzerdan o‘chirildi.");
    render();
  }

  const menuToggle = document.querySelector(".menu-toggle");
  menuToggle?.addEventListener("click", () => {
    const nav = document.querySelector(".main-nav");
    const open = nav.classList.toggle("nav-open");
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Menyuni yopish" : "Menyuni ochish");
  });

  window.addEventListener("hashchange", () => {
    selectedImage = 0;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== storageKeys.inquiries) return;
    inquiries = loadInquiries();
    navCounts();
    if (activeRoute().page === "admin" && hasDemoAdminSession()) renderAdmin();
  });
  document.querySelector("#year").textContent = String(new Date().getFullYear());
  render();
})();
