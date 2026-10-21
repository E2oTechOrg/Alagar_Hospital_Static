// ===== header + footer loader (needs a server, e.g. Live Server) =====
function loadComponent(id, file) {
  const target = document.getElementById(id);
  if (!target) return;

  fetch(file)
    .then(res => {
      if (!res.ok) throw new Error("Failed to load " + file);
      return res.text();
    })
    .then(data => {
      target.innerHTML = data;

      requestAnimationFrame(() => {
        if (id === "header-container") {
          initHeader();
          setActiveMenu();
        }
        if (id === "footer-container") {
          initFooter();
        }
        initReveal(); // pick up .reveal items inside the loaded partial
        window.dispatchEvent(new Event("resize"));
      });
    })
    .catch(err => console.error(err));
}

// ===== Header: sticky style, progress bar, mobile menu =====
function initHeader() {
  const header = document.getElementById("mainHeader");
  if (!header) { console.error("Header not found!"); return; }

  const toggle = document.getElementById("mobileToggle");
  const menu = document.getElementById("navMenu");
  const overlay = document.getElementById("navOverlay");
  const progress = document.getElementById("scrollProgress");
  const toTop = () => document.getElementById("toTop"); // lives in footer.html

  function setMenu(open) {
    menu.classList.toggle("open", open);
    toggle.classList.toggle("open", open);
    overlay.classList.toggle("show", open);
    toggle.setAttribute("aria-expanded", open);
    document.body.style.overflow = open ? "hidden" : "";
  }
  toggle.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
  overlay.addEventListener("click", () => setMenu(false));
  // Close the drawer first, then go to the page (so it slides out smoothly instead of freezing mid-way)
  menu.querySelectorAll("a").forEach(a => a.addEventListener("click", e => {
    if (!menu.classList.contains("open")) return;
    setMenu(false);

    const href = a.getAttribute("href") || "";
    const isPage = href && !href.startsWith("#") && !/^(tel|mailto):/.test(href) && a.target !== "_blank";
    if (!isPage || e.ctrlKey || e.metaKey) return;

    e.preventDefault();
    if (a.pathname === window.location.pathname) return; // already on this page
    setTimeout(() => { window.location.href = href; }, 380);
  }));
  document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });
  window.addEventListener("resize", () => { if (window.innerWidth > 992) setMenu(false); });

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle("scrolled", y > 40);
    progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    const t = toTop();
    if (t) t.classList.toggle("show", y > 500);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// ===== Footer: back-to-top =====
function initFooter() {
  const footer = document.getElementById("footer");
  if (!footer) { console.error("Footer not found!"); return; }

  const btn = document.getElementById("toTop");
  if (btn) {
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    btn.classList.toggle("show", window.scrollY > 500);
  }
}

// ===== Active menu (by file name) =====
function setActiveMenu() {
  const links = document.querySelectorAll(".nav-links .nav-link");
  let currentPage = window.location.pathname.split("/").pop();
  if (currentPage === "" ) currentPage = "index.html";

  links.forEach(link => {
    link.classList.toggle("active", link.getAttribute("href") === currentPage);
  });
}

// ===== Reveal on scroll + count-up (safe to call repeatedly) =====
let revealIO, countIO;
function initReveal() {
  if (!revealIO) {
    revealIO = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add("visible"); revealIO.unobserve(en.target); }
      });
    }, { threshold: 0.12 });

    countIO = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const el = en.target, to = +el.dataset.to, t0 = performance.now(), dur = 1500;
        (function tick(t) {
          const p = Math.min((t - t0) / dur, 1);
          el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
        countIO.unobserve(el);
      });
    }, { threshold: 0.6 });
  }
  document.querySelectorAll(".reveal:not([data-seen])").forEach(el => { el.dataset.seen = "1"; revealIO.observe(el); });
  document.querySelectorAll(".count:not([data-seen])").forEach(el => { el.dataset.seen = "1"; countIO.observe(el); });
}

// ===== Contact form -> opens WhatsApp with the message prefilled =====
function initContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const v = id => document.getElementById(id).value.trim();
    const text = `Hello Alagar Hospital,%0AName: ${encodeURIComponent(v("fullname"))}%0APhone: ${encodeURIComponent(v("phone"))}` +
      (v("email") ? `%0AEmail: ${encodeURIComponent(v("email"))}` : "") +
      `%0AMessage: ${encodeURIComponent(v("message"))}`;
    window.open("https://wa.me/918807262725?text=" + text, "_blank", "noopener");
    form.reset();
  });
}

initReveal();
initContactForm();
loadComponent("header-container", "header.html");
loadComponent("footer-container", "footer.html");

/* ===== Gallery lightbox ===== */
(function () {
    const photos = Array.from(document.querySelectorAll('.photo-gallery .photo'));
    if (!photos.length) return;

    const box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.innerHTML = `
        <button class="lb-btn lb-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        <button class="lb-btn lb-prev" aria-label="Previous image"><i class="fa-solid fa-chevron-left"></i></button>
        <figure class="lightbox-figure">
            <img class="lightbox-img" src="" alt="">
            <figcaption class="lightbox-caption"></figcaption>
        </figure>
        <button class="lb-btn lb-next" aria-label="Next image"><i class="fa-solid fa-chevron-right"></i></button>`;
    document.body.appendChild(box);

    const img = box.querySelector('.lightbox-img');
    const caption = box.querySelector('.lightbox-caption');
    let current = 0;

    function show(i) {
        current = (i + photos.length) % photos.length;
        const src = photos[current].querySelector('img');
        const title = photos[current].querySelector('figcaption');
        img.src = src.currentSrc || src.src;
        img.alt = src.alt;
        caption.innerHTML = (title ? title.textContent : '') +
            '<span class="lightbox-count">' + (current + 1) + ' / ' + photos.length + '</span>';
    }
    function open(i) {
        show(i);
        box.classList.add('open');
        document.body.classList.add('lb-lock');
    }
    function close() {
        box.classList.remove('open');
        document.body.classList.remove('lb-lock');
    }

    photos.forEach((p, i) => p.addEventListener('click', () => open(i)));
    box.querySelector('.lb-close').addEventListener('click', close);
    box.querySelector('.lb-prev').addEventListener('click', () => show(current - 1));
    box.querySelector('.lb-next').addEventListener('click', () => show(current + 1));
    box.addEventListener('click', e => { if (e.target === box) close(); });

    document.addEventListener('keydown', e => {
        if (!box.classList.contains('open')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') show(current - 1);
        if (e.key === 'ArrowRight') show(current + 1);
    });

    // swipe on touch devices
    let startX = 0;
    box.addEventListener('touchstart', e => { startX = e.changedTouches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 50) show(dx < 0 ? current + 1 : current - 1);
    });
})();