// background.js - Pure Routing, Cache Management, and Analytics

// background.js - Pure Routing, Cache Management, and Analytics

const TRANSFORMERS_CACHE_FLAG = 'defluff_transformers_cache_v3';

// 💡 FIX: Declare the global execution lock variable so it's defined
let creatingOffscreenPromise = null; 

async function clearStaleTransformersCacheOnce() {
  const stored = await chrome.storage.local.get(TRANSFORMERS_CACHE_FLAG);
  if (stored[TRANSFORMERS_CACHE_FLAG]) return;

  // Only drop the Transformers.js model cache — not every Cache API entry.
  try {
    await caches.delete('transformers-cache');
  } catch (_) {
    /* cache may not exist yet */
  }
  await chrome.storage.local.set({ [TRANSFORMERS_CACHE_FLAG]: true });
  console.log('[Background] Cleared stale Transformers.js model cache.');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target === 'offscreen') return;

  if (request.action === 'summarizeText') {
    const postHash = request.postHash;

    chrome.storage.local.get([postHash], async (cacheResult) => {
      if (chrome.runtime.lastError) {
        console.error('[Background] Cache lookup error:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }

      if (cacheResult[postHash]) {
        console.log('[Background] Cache hit for:', postHash);
        sendResponse({ success: true, summary: cacheResult[postHash], cached: true });
        return;
      }

      console.log('[Background] Cache miss — routing text to unconstrained Offscreen DOM...');
      try {
        await clearStaleTransformersCacheOnce();
        const summary = await routeToOffscreen(request.text);

        const cacheUpdate = {};
        cacheUpdate[postHash] = summary;
        chrome.storage.local.set(cacheUpdate);

        updateAnalytics(request.text, summary);
        sendResponse({ success: true, summary, cached: false });
      } catch (error) {
        console.error('[Background] Processing route failed:', error.message);
        sendResponse({ success: false, error: error.message });
      }
    });

    return true;
  }
});

async function routeToOffscreen(text) {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  if (existingContexts.length === 0) {
    // 💡 FIX: If an active compilation sequence is already running, wait for it instead of spawning a duplicate
    if (!creatingOffscreenPromise) {
      console.log("[Background] Creating hidden Offscreen Document frame...");
      creatingOffscreenPromise = chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['DOM_PARSER'],
        justification: 'Execute on-device deep learning summaries without Service Worker thread limits.'
      }).then(() => {
        creatingOffscreenPromise = null; // Clear lock when initialization clears
      }).catch((err) => {
        creatingOffscreenPromise = null; // Clear lock on hard failure to allow manual re-evaluation
        throw err;
      });
    }
    
    // Halt further operational progress until the initializing promise resolves successfully
    await creatingOffscreenPromise;
  }

  let attempts = 0;
  const maxAttempts = 20; 
  const retryDelay = 300; 
  
  while (attempts < maxAttempts) {
    try {
      const response = await chrome.runtime.sendMessage({
        target: 'offscreen',
        action: 'summarizeText',
        text: text
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Invalid calculation payload returned from offscreen document.');
      }

      return response.summary;
    } catch (error) {
      const isConnectionError = error.message.includes('Could not establish connection') || 
                                error.message.includes('Receiving end does not exist');
                                
      if (isConnectionError) {
        attempts++;
        console.log(`[Background] Offscreen runtime compiling. Retrying packet dispatch (${attempts}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay)); 
      } else {
        throw error; 
      }
    }
  }
  
  throw new Error('Failed to establish a runtime connection with the Offscreen Document context after maximum attempts.');
}

async function updateAnalytics(originalText, summaryText) {
  const originalWords = originalText.split(/\s+/).filter(Boolean).length;
  const summaryWords = summaryText.split(/\s+/).filter(Boolean).length;
  const originalLines = (originalText.match(/\n/g) || []).length;
  const summaryLines = (summaryText.match(/\n/g) || []).length;

  const wordsSaved = Math.max(0, originalWords - summaryWords);
  const linesCollapsed = Math.max(0, originalLines - summaryLines);
  const secondsSaved = Math.round((wordsSaved / 230) * 60);

  chrome.storage.local.get({ stats: { postsPurged: 0, totalLinesCollapsed: 0, totalSecondsSaved: 0 } }, (data) => {
    const updatedStats = {
      postsPurged: data.stats.postsPurged + 1,
      totalLinesCollapsed: data.stats.totalLinesCollapsed + linesCollapsed,
      totalSecondsSaved: data.stats.totalSecondsSaved + secondsSaved
    };
    chrome.storage.local.set({ stats: updatedStats });
  });
}
