(function () {
    const SCRIPT_ID = 'annota-embed';

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

    // --- Anchor Logic ---
    function getUniqueSelector(el) {
        if (!el || el.tagName === 'BODY' || el.tagName === 'HTML') return null;
        if (el.id) return '#' + el.id;
        
        // Try class names if they look specific enough (not generic layout classes)
        if (el.className && typeof el.className === 'string' && el.className.trim()) {
             const classes = el.className.split(/\s+/).filter(c => !c.includes('hover') && !c.includes('active'));
             if (classes.length > 0) {
                 // specific check could go here, for now just use first class
                 return el.tagName.toLowerCase() + '.' + classes[0];
             }
        }

        // Fallback to nth-child path
        let path = [];
        while (el && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
            let selector = el.tagName.toLowerCase();
            let parent = el.parentNode;
            if (parent) {
                const updatedChildren = Array.from(parent.children);
                const index = updatedChildren.indexOf(el);
                selector += `:nth-child(${index + 1})`;
            }
            path.unshift(selector);
            el = parent;
        }
        return path.join(' > ');
    }

    function calculateAnchor(x, y) {
        // x, y are viewport coordinates passed from parent
        const el = document.elementFromPoint(x, y);
        if (!el || el.id === 'annota-layer') return null; // Don't anchor to our own layer

        const rect = el.getBoundingClientRect();
        const selector = getUniqueSelector(el);
        
        console.log('[Annota Embed] Calculated Anchor:', { selector, tagName: el.tagName, x, y, rect });

        return {
            selector,
            offsetX: x - rect.left,
            offsetY: y - rect.top,
            tagName: el.tagName
        };
    }

    // --- Repositioning ---
    let activePins = [];

    function repositionPins() {
        if (!activePins.length) return;
        
        const layer = document.getElementById('annota-layer');
        if (!layer) return;

        activePins.forEach(pin => {
            const el = document.getElementById('annota-pin-' + pin.id);
            if (!el) return;

            // Try to find anchor
            if (pin.anchor && pin.anchor.selector) {
                const anchorEl = document.querySelector(pin.anchor.selector);
                if (anchorEl) {
                    const rect = anchorEl.getBoundingClientRect();
                    // Add scroll offsets because layer is absolute at top:0 left:0 of document
                    const docTop = rect.top + window.scrollY;
                    const docLeft = rect.left + window.scrollX;
                    
                    const newX = docLeft + pin.anchor.offsetX;
                    const newY = docTop + pin.anchor.offsetY;

                    // Only log if position changed significantly to avoid spam
                    // const oldLeft = parseFloat(el.style.left);
                    // if (Math.abs(oldLeft - newX) > 1) {
                    //    console.log(`[Annota Embed] Repositioning Pin ${pin.id} to`, newX, newY, 'Anchor:', pin.anchor.selector);
                    // }

                    el.style.left = newX + 'px';
                    el.style.top = newY + 'px';
                    return;
                } else {
                    console.warn(`[Annota Embed] Anchor element not found for pin ${pin.id}:`, pin.anchor.selector);
                }
            }
        });
    }

    function renderPins(pins) {
        console.log('[Annota Embed] renderPins called with:', pins);
        injectStyles();
        const layer = getOrCreateLayer();
        layer.innerHTML = ''; 
        activePins = pins; // Store for repositioning

        if (!pins || !Array.isArray(pins)) return;

        pins.forEach(pin => {
            const el = document.createElement('div');
            el.id = 'annota-pin-' + pin.id;
            el.className = `annota-pin ${pin.status === 'RESOLVED' ? 'resolved' : ''} ${pin.active ? 'active' : ''}`;
            
            // Initial Position (will be updated by repositionPins immediately if anchor exists)
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

        // Run initial reposition to snap to anchors
        repositionPins();
    }

    // Message Listener
    window.addEventListener('message', (event) => {
        if (!event.data) return;

        if (event.data.type === 'render-pins') {
            console.log('[Annota Embed] Rendering Pins (Count: ' + event.data.pins.length + ')', event.data.pins);
            renderPins(event.data.pins);
        }
        
        if (event.data.type === 'request-anchor') {
             const { x, y } = event.data;
             // Remove our layer pointer events temporarily to click through? 
             // Actually document.elementFromPoint hits top element. 
             // Parent handles overlay instructions, so we just need to ensure annota-layer passes through.
             // It does (pointer-events: none).

             const anchor = calculateAnchor(x, y);
             console.log('[Annota Embed] Calculated anchor:', anchor);
             
             window.parent.postMessage({
                source: SCRIPT_ID,
                type: 'anchor-found',
                anchor,
                x, y // Echo back for context
             }, PARENT_ORIGIN);
        }
    });

    console.log('[Annota Embed] Initializing...');
    sendHandshake();
    injectStyles();

    setInterval(checkUrlChange, 500);
    window.addEventListener('popstate', checkUrlChange);
    
    // Reposition triggers
    window.addEventListener('scroll', () => { handleScroll(); }, { passive: true });
    window.addEventListener('resize', () => { handleResize(); repositionPins(); }, { passive: true }); // Window resize
    
    // ResizeObserver for body height changes (layout shifts)
    const resizeObserver = new ResizeObserver(() => {
        handleResize(); // updates layer height
        repositionPins();
    });
    resizeObserver.observe(document.body);
    
})();

