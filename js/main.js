(() => {
    const GUTTER = 16;      // = --gap del CSS
    const MIN_COL = 220;    // ancho mínimo por tarjeta

    const gridEl = document.getElementById('grid');
    const categoriaSelect = document.getElementById('categoriaSelect');
    const subcategoriaSelect = document.getElementById('subcategoriaSelect');
    const qInput = document.getElementById('q');
    const resetBtn = document.getElementById('resetBtn');

    // Asegura un solo sizer
    if (!gridEl.querySelector('.sizer')) {
        gridEl.insertAdjacentHTML('afterbegin', '<div class="sizer"></div>');
    }

    const text = (v = '') => (v ?? '').toString().toLowerCase();

    // pide a Shuffle recalcular cuando cambia imagen
    function requestLayout() { if (window.shuffle) setTimeout(() => window.shuffle.layout(), 30); }

    // Carrusel: botones, dots y gestos
    function attachCarousel(card, imgs) {
        const imgEl = card.querySelector('.thumb img');
        const prev = card.querySelector('.thumb .prev');
        const next = card.querySelector('.thumb .next');
        const dotsC = card.querySelector('.thumb .dots');
        let i = 0;

        function renderDots() {
            dotsC.innerHTML = '';
            if ((imgs?.length || 0) <= 1) return;
            imgs.forEach((_, idx) => {
                const d = document.createElement('span'); d.className = 'dot' + (idx === i ? ' active' : '');
                d.addEventListener('click', () => show(idx)); dotsC.appendChild(d);
            });
        }
        function updateDots() {
            dotsC.querySelectorAll('.dot').forEach((d, idx) => d.classList.toggle('active', idx === i));
        }
        function show(idx) {
            if (!imgs?.length) return;
            i = (idx + imgs.length) % imgs.length;
            imgEl.src = imgs[i];
            imgEl.onload = requestLayout;
            imgEl.onerror = requestLayout;
            updateDots();
        }

        prev?.addEventListener('click', () => show(i - 1));
        next?.addEventListener('click', () => show(i + 1));

        // swipe / drag
        let sx = null;
        card.querySelector('.thumb').addEventListener('pointerdown', e => { sx = e.clientX; });
        card.querySelector('.thumb').addEventListener('pointerup', e => {
            if (sx == null) return; const dx = e.clientX - sx; sx = null;
            if (Math.abs(dx) > 30) dx > 0 ? show(i - 1) : show(i + 1);
        });

        renderDots();
        show(0);
    }

    // Reemplaza tu createCard por este:
    function createCard(item) {
        const el = document.createElement('div');
        el.className = 'item';
        el.dataset.id = item.id || '';
        el.dataset.categoria = item.categoria || '';
        el.dataset.subcategoria = item.subcategoria || '';
        el.dataset.nombre = item.nombre || '';
        el.dataset.descripcion = item.descripcion || '';
        const imgs = Array.isArray(item.imgs) ? item.imgs : [];
        const first = imgs[0] || '';

        el.innerHTML = `
    <div id=${item.id} class="thumb">
      <button class="nav prev" type="button" aria-label="Anterior">‹</button>
      ${first ? `<img loading="lazy" src="${first}" alt="${item.nombre}" onerror="this.remove()">` : '<span style="opacity:.6">Sin imagen</span>'}
      <button class="nav next" type="button" aria-label="Siguiente">›</button>
      <div class="dots"></div>
    </div>
    <div class="content">
      <div class="name">${item.nombre || 'Sin nombre'}</div>
      <div class="desc">${item.descripcion || ''}</div>
      <div class="meta">
        <span class="price">${item.precio || ''}</span>
        <span class="status">${item.status || ''}</span>
      </div>
    </div>`;

        // inicializa carrusel para esta tarjeta
        attachCarousel(el, imgs);
        return el;
    }

    function populateFilters(items) {
        const cats = Array.from(new Set(items.map(i => i.categoria).filter(Boolean))).sort();
        for (const c of cats) {
            const opt = document.createElement('option');
            opt.value = c; opt.textContent = c; categoriaSelect.appendChild(opt);
        }
    }

    function refreshSubcategorias(items) {
        const cat = categoriaSelect.value;
        subcategoriaSelect.innerHTML = '<option value="">(Opcional)</option>';
        subcategoriaSelect.disabled = !cat;
        if (!cat) return;
        const subs = Array.from(new Set(items.filter(i => i.categoria === cat).map(i => i.subcategoria || '').filter(Boolean))).sort();
        for (const s of subs) {
            const opt = document.createElement('option');
            opt.value = s; opt.textContent = s; subcategoriaSelect.appendChild(opt);
        }
    }

    let shuffle;

    function applyFilter() {
        const cat = categoriaSelect.value;
        const sub = subcategoriaSelect.value;
        const q = text(qInput.value);
        shuffle.filter(el => {
            const mCat = !cat || el.dataset.categoria === cat;
            const mSub = !sub || el.dataset.subcategoria === sub;
            const haystack = (el.dataset.nombre + ' ' + el.dataset.descripcion).toLowerCase();
            const mQ = !q || haystack.includes(q);
            return mCat && mSub && mQ;
        });
    }

    function resetFilters() {
        categoriaSelect.value = '';
        subcategoriaSelect.innerHTML = '<option value="">(Opcional)</option>';
        subcategoriaSelect.disabled = true;
        qInput.value = '';
        applyFilter();
    }

    // Calcula columnas para llenar el ancho del wrap
    function fitCols() {
        const w = gridEl.clientWidth;
        const cols = Math.max(1, Math.floor((w + GUTTER) / (MIN_COL + GUTTER)));
        const colW = Math.floor((w - (cols - 1) * GUTTER) / cols);
        gridEl.style.setProperty('--col-width', colW + 'px');
        if (shuffle) shuffle.layout();
    }

    // Espera carga de imágenes antes de ajustar columnas
    function afterImagesLayout() {

        fitCols();

        const imgs = Array.from(gridEl.querySelectorAll('img'));
        if (imgs.length === 0) { fitCols(); return; }
        let pending = imgs.length;
        const done = () => { if (--pending === 0) fitCols(); };
        imgs.forEach(img => {
            if (img.complete) done();
            else { img.addEventListener('load', done); img.addEventListener('error', done); }
        });

        clearTimeout(window.__rsFallback);
        window.__rsFallback = setTimeout(fitCols, 600);
    }

    function mount(items) {
        // Pintar tarjetas
        const fr = document.createDocumentFragment();
        items.forEach(it => fr.appendChild(createCard(it)));
        gridEl.appendChild(fr);

        // Init Shuffle (¡ahora sí existe para fitCols!)
        shuffle = new window.Shuffle(gridEl, {
            itemSelector: '.item',
            sizer: '.sizer',
            gutterWidth: GUTTER,
            speed: 420,
        });

        // Filtros
        populateFilters(items);
        refreshSubcategorias(items);
        categoriaSelect.addEventListener('change', () => { refreshSubcategorias(items); applyFilter(); });
        subcategoriaSelect.addEventListener('change', applyFilter);
        qInput.addEventListener('input', applyFilter);
        resetBtn.addEventListener('click', resetFilters);

        // Layout
        afterImagesLayout();
        window.addEventListener('resize', () => {
            clearTimeout(window.__rzRS);
            window.__rzRS = setTimeout(fitCols, 120);
        });

        shuffle = new window.Shuffle(gridEl, {
            itemSelector: '.item',
            sizer: '.sizer',
            gutterWidth: 16,
            speed: 420,
        });

        fitCols(); // ⬅️ IMPORTANTE: calcula columnas YA

        // filtros...
        afterImagesLayout();
        window.addEventListener('resize', () => {
            clearTimeout(window.__rzRS);
            window.__rzRS = setTimeout(fitCols, 120);
        });
    }

    function boot() {
        if (Array.isArray(window.ARTICULOS)) { mount(window.ARTICULOS); return; }
        fetch('../json/articulos.json')
            .then(r => r.ok ? r.json() : [])
            .then(data => Array.isArray(data) ? data : [])
            .then(mount)
            .catch(() => mount([]));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
