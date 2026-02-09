(function () {
    const SCRIPT_ID = 'annota-embed';
    console.log('[Annota Embed] VERSION: LOCAL_DEV_V1 (Red Border Edition)');

    if (window.__annota_initialized) return;
    window.__annota_initialized = true;

    function getParentOrigin() {
        const el = document.currentScript || document.querySelector('script[src*="/embed.js"]');
        const origin = el && el.getAttribute('data-annota-parent-origin');
        return origin || '*'; // fallback for dev
    }

    const PARENT_ORIGIN = getParentOrigin();

    // --- CSS Injection ---
    function injectStyles() {
        const styleId = 'annota-styles';
        if (document.getElementById(styleId)) return;

        const css = `
            #annota-layer {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                pointer-events: none;
                z-index: 99999;
                overflow: visible;
                border: 2px solid red; /* DEBUG: VISIBLE LAYER BOUNDARY */
            }
            .annota-pin {
                position: absolute;
                width: 28px;
                height: 28px;
                background: #00F3FF; /* Cyan */
                border: 2px solid #fff;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                cursor: pointer;
                z-index: 2147483647; /* MAX Z-INDEX */
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 800;
                color: #000;
                pointer-events: auto;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                font-family: sans-serif;
            }
            .annota-pin:hover {
                z-index: 160;
                transform: translate(-50%, -50%) scale(1.1);
                box-shadow: 0 0 16px rgba(0, 243, 255, 0.6);
            }
            .annota-pin.active {
                z-index: 200;
                transform: translate(-50%, -50%) scale(1.1);
                box-shadow: 0 0 16px rgba(0, 243, 255, 0.6);
                border-color: #fff;
            }
            .annota-pin.resolved {
                background: #444;
                color: #ccc;
                border-color: #888;
                opacity: 0.6;
                box-shadow: none;
            }
            .annota-pin.resolved:hover {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.05);
            }
            .annota-tooltip {
                position: absolute;
                bottom: calc(100% + 12px);
                left: 50%;
                transform: translateX(-50%);
                width: max-content;
                max-width: 320px;
                background: #111;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 6px;
                padding: 8px 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 210;
                pointer-events: none;
                display: none;
                flex-direction: column;
                gap: 4px;
                color: #fff;
                text-align: left;
            }
            .annota-pin:hover .annota-tooltip,
            .annota-pin.active .annota-tooltip {
                display: flex;
            }
            .annota-tooltip::after {
                content: '';
                position: absolute;
                bottom: -5px;
                left: 50%;
                transform: translateX(-50%);
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 5px solid #111;
            }
            .annota-tooltip-status {
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                color: #00F3FF;
                letter-spacing: 0.05em;
            }
            .annota-tooltip-message {
                font-size: 12px;
                line-height: 1.4;
                white-space: pre-wrap;
            }
        `;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
    }

    // --- Layer Management ---
    function getOrCreateLayer() {
        let layer = document.getElementById('annota-layer');
        if (!layer) {
            layer = document.createElement('div');
            layer.id = 'annota-layer';
            document.body.appendChild(layer);
        }
        // Ensure layer covers the full scroll height
        const docHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        );
        layer.style.height = docHeight + 'px';
        return layer;
    }

    // --- Logic ---

    function sendHandshake() {
        if (window.parent === window) return;

        window.parent.postMessage({
            source: SCRIPT_ID,
            type: 'handshake',
            href: window.location.href,
            path: window.location.pathname + window.location.search + window.location.hash
        }, PARENT_ORIGIN);

        sendScrollUpdate();
    }

    let lastPath = window.location.pathname + window.location.search + window.location.hash;

    function checkUrlChange() {
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        if (currentPath !== lastPath) {
            lastPath = currentPath;
            if (window.parent !== window) {
                window.parent.postMessage({
                    source: SCRIPT_ID,
                    type: 'path-update',
                    path: currentPath
                }, PARENT_ORIGIN);
            }
        }
    }

    // Scroll update with throttling
    let scrollUpdatePending = false;

    function sendScrollUpdate() {
        if (window.parent === window) return;

        window.parent.postMessage({
            source: SCRIPT_ID,
            type: 'scroll-update',
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            scrollWidth: document.documentElement.scrollWidth,
            scrollHeight: document.documentElement.scrollHeight,
            documentWidth: document.documentElement.scrollWidth
        }, PARENT_ORIGIN);
    }

    function handleScroll() {
        if (scrollUpdatePending) return;

        scrollUpdatePending = true;
        requestAnimationFrame(() => {
            sendScrollUpdate();
            scrollUpdatePending = false;
        });
    }

    function handleResize() {
        handleScroll(); // Dimensions change usually affects layout/scroll
        // Also update layer height on resize
        const layer = document.getElementById('annota-layer');
        if (layer) {
             const docHeight = Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.clientHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
            );
            layer.style.height = docHeight + 'px';
        }
    }

    function renderPins(pins) {
        console.log('[Annota Embed] renderPins called with:', pins);
        injectStyles(); // Ensure styles exist
        const layer = getOrCreateLayer();
        layer.innerHTML = ''; // Clear existing pins

        if (!pins || !Array.isArray(pins)) {
            console.warn('[Annota Embed] Invalid pins data:', pins);
            return;
        }

        pins.forEach(pin => {
            const el = document.createElement('div');
            el.className = `annota-pin ${pin.status === 'RESOLVED' ? 'resolved' : ''} ${pin.active ? 'active' : ''}`;
            el.style.left = pin.x + 'px';
            el.style.top = pin.y + 'px';
            el.innerHTML = `
                ${pin.number}
                <div class="annota-tooltip">
                    <span class="annota-tooltip-status">${pin.status}</span>
                    <div class="annota-tooltip-message">${pin.message}</div>
                </div>
            `;

            el.addEventListener('click', (e) => {
                e.stopPropagation();
                window.parent.postMessage({
                    source: SCRIPT_ID,
                    type: 'pin-clicked',
                    commentId: pin.id
                }, PARENT_ORIGIN);
            });

            layer.appendChild(el);
        });
        console.log('[Annota Embed] Pins rendered to layer:', layer);
        
        // Confirm to parent
        window.parent.postMessage({
            source: SCRIPT_ID,
            type: 'render-confirmed',
            count: pins.length
        }, PARENT_ORIGIN);
    }

    // Message Listener
    window.addEventListener('message', (event) => {
        // Basic security check: ensure it comes from parent if we can contextually know it,
        // but since this is an embed script, we might be loose or rely on data-annota-parent-origin logic.
        // For now, checks if we have a type we care about.
        if (!event.data) return;

        if (event.data.type === 'render-pins') {
            console.log('[Annota Embed] Received render-pins message');
            renderPins(event.data.pins);
        }
    });

    console.log('[Annota Embed] Initializing...');
    sendHandshake();
    injectStyles(); // Inject immediately

    setInterval(checkUrlChange, 500);
    window.addEventListener('popstate', checkUrlChange);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
})();

