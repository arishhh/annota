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

    function sendHandshake() {
        if (window.parent === window) return;

        window.parent.postMessage({
            source: SCRIPT_ID,
            type: 'handshake',
            href: window.location.href,
            path: window.location.pathname + window.location.search + window.location.hash
        }, PARENT_ORIGIN);
        
        // Send initial scroll position immediately after handshake
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
    let lastScrollX = window.scrollX;
    let lastScrollY = window.scrollY;

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
            scrollHeight: document.documentElement.scrollHeight
        }, PARENT_ORIGIN);
        
        lastScrollX = window.scrollX;
        lastScrollY = window.scrollY;
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
    }

    sendHandshake();
    setInterval(checkUrlChange, 500);
    window.addEventListener('popstate', checkUrlChange);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
})();

