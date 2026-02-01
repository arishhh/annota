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

    sendHandshake();
    setInterval(checkUrlChange, 500);
    window.addEventListener('popstate', checkUrlChange);
})();
