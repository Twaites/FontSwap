export const createUrlRewriter = (baseUrl: URL) => {
    return (url: string) => {
        if (!url) return url;
        // Ignore data: URIs
        if (url.startsWith('data:')) return url;
        try {
            // Handle absolute URLs
            if (url.startsWith('http')) {
                return `/api/proxy?url=${encodeURIComponent(url)}`;
            }
            // Handle relative URLs
            const resolved = new URL(url, baseUrl).toString();
            return `/api/proxy?url=${encodeURIComponent(resolved)}`;
        } catch (_) {
            return url;
        }
    };
};

export const getInjectorScript = (baseUrl: string) => `
<script>
  (function() {
    const TARGET_BASE = "${baseUrl}";

    // --- NETWORK INTERCEPTION (SPA Support) ---
    // Rewrite fetch requests to go through proxy
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        let url = input;
        if (typeof input === 'string') {
            try {
                // Resolve relative paths against the original target base
                const resolved = new URL(input, TARGET_BASE).href;
                url = '/api/proxy?url=' + encodeURIComponent(resolved);
            } catch (e) {
                // Invalid URL, let it pass
            }
        } else if (input instanceof Request) {
             // Clone request with new URL? Harder. 
             // Simplification: Most apps use string. 
             // If we fallback to original, it fails, but avoids crash.
             try {
                const resolved = new URL(input.url, TARGET_BASE).href;
                // We recreate the Request if possible, or just pass the string url if init matches?
                // Often safer to just pass the string URL if the app allows it.
                url = '/api/proxy?url=' + encodeURIComponent(resolved);
            } catch (e) {}
        }
        return originalFetch(url, init);
    };

    // Rewrite XHR requests
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        if (typeof url === 'string') {
            try {
                const resolved = new URL(url, TARGET_BASE).href;
                url = '/api/proxy?url=' + encodeURIComponent(resolved);
            } catch (e) {}
        }
        return originalOpen.call(this, method, url, ...rest);
    };
    // ------------------------------------------

    const originalFonts = new Map();
    const nativeFonts = new Set();
    const activeSwaps = new Set();
    let isInitialized = false;

    // Helper to get active font family
    function getActiveFont(el) {
       const style = window.getComputedStyle(el);
       const stack = style.fontFamily.split(',').map(f => f.trim().replace(/['"]/g, ''));
       return stack[0];
    }

    // Helper to check if element should be tracked
    function shouldTrack(el) {
       const tag = el.tagName;
       if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'PATH'].includes(tag)) return false;
       if (el.offsetParent === null) return false; // Hidden

       if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return true;

       for (let i = 0; i < el.childNodes.length; i++) {
          const node = el.childNodes[i];
          if (node.nodeType === 3 && node.textContent.trim().length > 0) {
              return true;
          }
       }
       return false;
    }

    function analyzeFonts() {
      const allElements = document.querySelectorAll('body *');
      const fonts = {};
      
      // First pass tracking
      if (!isInitialized) {
          allElements.forEach(el => {
              if (!shouldTrack(el)) return;
              const f = getActiveFont(el);
              if (f) nativeFonts.add(f);
          });
          isInitialized = true;
      }
      
      allElements.forEach(el => {
          if (!shouldTrack(el)) return;
          
          // Use original font if known to avoid re-detecting swapped fonts
          let primaryFont = el.dataset.fontSwapOriginal;
          
          if (!primaryFont) {
              const current = getActiveFont(el);
              
              // ROBUST FILTERING LOGIC:
              // 1. If we've seen this font natively before, it's safe.
              if (nativeFonts.has(current)) {
                  primaryFont = current;
              } 
              // 2. If it matches a font we have actively swapped in, it is a phantom. Ignore.
              else if (activeSwaps.has(current)) {
                  return;
              } 
              // 3. Otherwise, it's a truly new native font (rare late loader).
              else {
                  primaryFont = current;
              }
          }
          
          if (!primaryFont) return;
          
          // Tag it so we remember it was originally this font
          if (!el.dataset.fontSwapOriginal) {
              el.dataset.fontSwapOriginal = primaryFont;
          }
          
          // Prevent double counting nested elements (merge with parent count if same font)
          const trackedAncestor = el.parentElement ? el.parentElement.closest('[data-font-swap-original]') : null;
          if (trackedAncestor && trackedAncestor.dataset.fontSwapOriginal === primaryFont) {
              return;
          }

          if(!fonts[primaryFont]) {
              fonts[primaryFont] = 0;
          }
          fonts[primaryFont]++;
      });

      window.parent.postMessage({ type: 'FONT_ANALYSIS', fonts }, '*');
    }

    function applyHighlights(activeHighlights) {
       // 1. Clear all previous highlights
       const all = document.querySelectorAll('*');
       all.forEach(el => {
           el.style.outline = '';
           el.style.backgroundColor = '';
           delete el.dataset.fontSwapHighlighted;
           delete el.dataset.fontSwapHighlightColor;
       });

       if (!activeHighlights || activeHighlights.length === 0) return;

       // 2. Apply new highlights
       const allElements = document.querySelectorAll('body *');
       allElements.forEach(el => {
           if (!shouldTrack(el)) return;
           
           // Capture original font if missing (safety check)
           if (!el.dataset.fontSwapOriginal) {
               // CAREFUL: Do not capture if it matches a swap!
               const current = getActiveFont(el);
               if (activeSwaps.has(current) && !nativeFonts.has(current)) return;
               el.dataset.fontSwapOriginal = current;
           }
           
           const currentFont = el.dataset.fontSwapOriginal;
           if (!currentFont) return;

           // Check if any active highlight matches this font
           const match = activeHighlights.find(h => currentFont.startsWith(h.font) || currentFont.includes(h.font));
           
           if (match) {
               // Check if ancestor is already highlighted with the SAME color
               const parentHighlight = el.parentElement ? el.parentElement.closest('[data-font-swap-highlighted="true"]') : null;
               if (parentHighlight && parentHighlight.dataset.fontSwapHighlightColor === match.color) {
                   return; // Skip double highlight
               }

               el.style.backgroundColor = match.color + "55"; 
               el.dataset.fontSwapHighlighted = "true";
               el.dataset.fontSwapHighlightColor = match.color;
           }
       });
    }

    function changeFont(targetFontName, newFontFamily) {
       if (newFontFamily) {
           activeSwaps.add(newFontFamily);
       }

       const allElements = document.querySelectorAll('body *');
       allElements.forEach(el => {
          if (!shouldTrack(el)) return;

          // Ensure we have a baseline
          if (!el.dataset.fontSwapOriginal) {
               const current = getActiveFont(el);
               // If we are about to modify it, we MUST capture the original NOW.
               // But validity check: Is it already a phantom?
               if (activeSwaps.has(current) && !nativeFonts.has(current)) {
                   // It's already tainted. We can't safely swap it or track it.
                   // But if we do nothing, it stays "Roboto". 
                   // If we want to swap "Inter" -> "Open Sans", and this is "Roboto", it won't match "Inter" anyway.
               } else {
                   el.dataset.fontSwapOriginal = current;
               }
          }

          const f = el.dataset.fontSwapOriginal;
          if(f && (f.startsWith(targetFontName) || f.includes(targetFontName))) {
              if (newFontFamily) {
                  el.style.fontFamily = '"' + newFontFamily + '", ' + el.dataset.fontSwapOriginal;
              } else {
                  el.style.fontFamily = '';
              }
          }
       });
    }

    window.addEventListener('message', (event) => {
       const { type, payload } = event.data;
       if(type === 'ANALYZE_REQUEST') {
           analyzeFonts();
       } else if (type === 'UPDATE_HIGHLIGHTS') {
           applyHighlights(payload);
       } else if (type === 'CHANGE_FONT') {
           changeFont(payload.target, payload.newFont);
       }
    });
    
    // Link Interception & Toast Notification
    window.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link) {
            e.preventDefault();
            
            // Create toast if it doesn't exist
            let toast = document.getElementById('font-swap-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'font-swap-toast';
                toast.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: #333; color: white; padding: 10px 20px; border-radius: 8px; font-family: sans-serif; font-size: 14px; z-index: 999999; box-shadow: 0 4px 6px rgba(0,0,0,0.1); opacity: 0; transition: opacity 0.3s ease; pointer-events: none;';
                toast.innerText = 'Link navigation is disabled';
                document.body.appendChild(toast);
            }

            // Show toast
            toast.style.opacity = '1';
            
            // Hide after 2 seconds
            setTimeout(() => {
                toast.style.opacity = '0';
            }, 2000);
        }
    }, true); // Capture phase to ensure we intercept it

    // Immediate analysis on load to populate nativeFonts
    window.addEventListener('load', analyzeFonts);
    setTimeout(analyzeFonts, 1000);
    setTimeout(analyzeFonts, 3000);
  })();
</script>
`;

export const rewriteCssIds = (css: string, rewriter: (url: string) => string) => {
     // Regex to capture url('...') url("...") or url(...)
     return css.replace(/url\s*\((['"]?)(.*?)\1\)/gi, (match, quote, url) => {
         // Avoid rewriting data uris or empty
         if (!url || url.startsWith('data:') || url.startsWith('#')) return match;
         return `url(${quote}${rewriter(url)}${quote})`;
    });
}
