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
        repositionPins(); // Reposition pins on resize
        
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
        
        // 1. Try ID (High Priority)
        if (el.id) return '#' + el.id;
        
        // 2. Try Stable Attributes (data-*, aria-*, name, role)
        const stableAttributes = ['data-testid', 'data-id', 'name', 'aria-label', 'role'];
        for (const attr of stableAttributes) {
            if (el.hasAttribute(attr)) {
                const val = el.getAttribute(attr);
                if (val) {
                    const selector = `[${attr}="${val.replace(/"/g, '\\"')}"]`;
                    if (document.querySelectorAll(selector).length === 1) return selector;
                }
            }
        }

        // 3. Try Specific Classes (Medium Priority)
        if (el.className && typeof el.className === 'string' && el.className.trim()) {
             const classes = el.className.split(/\s+/).filter(c => 
                !c.includes(':') && 
                !c.includes('/') && 
                !['relative', 'absolute', 'flex', 'grid', 'block', 'hidden', 'w-full', 'h-full', 'transition-colors', 'duration-300', 'ease-in-out'].includes(c)
             );
             
             if (classes.length > 0) {
                 try {
                     // Try all classes first
                     const classSelector = el.tagName.toLowerCase() + '.' + classes.join('.');
                     if (document.querySelectorAll(classSelector).length === 1) return classSelector;
                     
                     // Try single class if unique
                     for (const cls of classes) {
                         const single = el.tagName.toLowerCase() + '.' + cls;
                         if (document.querySelectorAll(single).length === 1) return single;
                     }
                 } catch (e) {
                     console.warn('[Annota Embed] Selector generation error:', e);
                 }
             }
        }

        // 4. Fallback to Structural Path (Low Priority)
        let path = [];
        let current = el;
        while (current && current.tagName !== 'BODY' && current.tagName !== 'HTML') {
            let selector = current.tagName.toLowerCase();
            let parent = current.parentNode;
            if (parent) {
                const children = Array.from(parent.children);
                const sameTagSiblings = children.filter(c => c.tagName === current.tagName);
                
                if (sameTagSiblings.length > 1) {
                    const index = children.indexOf(current);
                    selector += `:nth-child(${index + 1})`;
                }
            }
            path.unshift(selector);
            current = parent;
        }
        return path.join(' > ');
    }

    function calculateAnchor(x, y) {
        // x, y are viewport coordinates passed from parent
        const el = document.elementFromPoint(x, y);
        if (!el || el.id === 'annota-layer') return null;

        const rect = el.getBoundingClientRect();
        const selector = getUniqueSelector(el);
        
        // Calculate Percentage Offsets
        // Clamp between 0 and 1 just in case, though clicks usually are inside
        const offsetXPct = (x - rect.left) / rect.width;
        const offsetYPct = (y - rect.top) / rect.height;

        console.log('[Annota Embed] Calculated Anchor:', { selector, tagName: el.tagName, offsetXPct, offsetYPct });

        return {
            selector,
            offsetXPct,
            offsetYPct,
            tagName: el.tagName,
            // Fallback: Store original size to detect massive scaling issues if needed?
            // width: rect.width,
            // height: rect.height
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

            let newX, newY;
            let anchored = false;

            // ALWAYS prefer semantic anchoring when anchor data exists
            if (pin.anchor && pin.anchor.selector) {
                const anchorEl = document.querySelector(pin.anchor.selector);
                if (anchorEl) {
                    const rect = anchorEl.getBoundingClientRect();
                    // Basic bounds check to ensure element is visible/reasonable
                    if (rect.width > 0 && rect.height > 0) {
                        const docTop = rect.top + window.scrollY;
                        const docLeft = rect.left + window.scrollX;
                        
                        // ALWAYS use percentage-based positioning for semantic anchoring
                        // This ensures pins stay near the element, not pixel-perfect
                        if (pin.anchor.offsetXPct !== undefined) {
                            newX = docLeft + (rect.width * pin.anchor.offsetXPct);
                            newY = docTop + (rect.height * pin.anchor.offsetYPct);
                            anchored = true;
                        } else if (pin.anchor.offsetX !== undefined) {
                            // Legacy fallback for old pins without percentage
                            newX = docLeft + pin.anchor.offsetX;
                            newY = docTop + pin.anchor.offsetY;
                            anchored = true;
                        }
                    }
                }
            }

            // ONLY fallback to absolute coordinates if element not found
            // This means the DOM structure changed significantly
            if (!anchored) {
                newX = pin.x;
                newY = pin.y;
                // Visual indicator that pin is "detached" from its anchor
                el.style.opacity = '0.7'; 
            } else {
                el.style.opacity = '1';
            }

            el.style.left = newX + 'px';
            el.style.top = newY + 'px';
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
            
            // Initial render: blindly use passed x/y, then immediately reposition
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
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(repositionPins);
    }

    // --- Event Listeners for Repositioning ---
    function onResizeOrScroll() {
       handleScroll(); 
       repositionPins();
    }

    window.addEventListener('resize', onResizeOrScroll);
    window.addEventListener('scroll', onResizeOrScroll, { passive: true });
    window.addEventListener('orientationchange', onResizeOrScroll); // Mobile rotation
    window.addEventListener('load', onResizeOrScroll); // Late loads

    // Also use ResizeObserver for body/html size changes
    const resizeObserver = new ResizeObserver((entries) => {
        handleResize();
        repositionPins();
    });
    resizeObserver.observe(document.body);
    resizeObserver.observe(document.documentElement);

    // Initial check
    setTimeout(repositionPins, 500);

    // --- Message Listener ---
    window.addEventListener('message', (event) => {
        if (!event.data) return;

        if (event.data.type === 'render-pins') {
            renderPins(event.data.pins);
        }
        
        if (event.data.type === 'request-anchor') {
             const { x, y } = event.data;
             const anchor = calculateAnchor(x, y);
             
             window.parent.postMessage({
                source: SCRIPT_ID,
                type: 'anchor-found',
                anchor,
                x, y 
             }, PARENT_ORIGIN);
        }
    });

    console.log('[Annota Embed] Initializing...');
    sendHandshake();
    injectStyles();

    setInterval(checkUrlChange, 500);
    window.addEventListener('popstate', checkUrlChange);
    
})();

