// 1. Enhanced Heuristic Filter to catch salary, hiring, and layoff hooks
function isFluffOrBroetry(text) {
  const lineCount = (text.match(/\n/g) || []).length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const lineToWordRatio = wordCount / (lineCount + 1);
  
  const corporateFluffRegex = /(humbled and honored|thrilled to announce|excited to share|thought leader|synergy|passion evangelist|agree\?|comment ".*"|comment below|LPA|CTC|laid off|laying off|hiring is a team sport)/i;
  
  const isBroetry = lineCount > 2 && lineToWordRatio < 15;
  const hasBuzzwords = corporateFluffRegex.test(text);
  
  return isBroetry || hasBuzzwords;
}

// 2. Hash Generator for Caching
function getPostHash(text) {
  let hash = 0;
  const str = text.substring(0, 60);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `bw_${Math.abs(hash)}`;
}

// 3. COMPLETE DOM CLEANSE & SWAP (Destroys nested constraints from the inside out)
function injectSummarySafely(targetTextElement, parentCard, summaryText, isCached) {
  // Clear original text nodes safely
  targetTextElement.textContent = ''; 

  const summaryContainer = document.createElement('div');
  summaryContainer.className = 'defluff-summary';
  
  // Apply explicit layout rules directly to our custom container
  summaryContainer.style.setProperty("display", "block", "important");
  summaryContainer.style.setProperty("height", "auto", "important");
  summaryContainer.style.setProperty("max-height", "none", "important");
  summaryContainer.style.setProperty("overflow", "visible", "important");

  // Locate this line inside your injectSummarySafely block:
  const badgeElement = document.createElement('strong');
  
  // 💡 FIX: Update wording to simulate a 90s print headline asset
  badgeElement.textContent = isCached 
    ? "THE DAILY DEFLUFF • ARCHIVAL WIRE REPORT •" 
    : "DEFLUFFED SUMMARY";

  const textNode = document.createTextNode(summaryText);
  summaryContainer.appendChild(badgeElement);
  summaryContainer.appendChild(textNode);
  
  // Inject clean block directly into target slot
  targetTextElement.appendChild(summaryContainer);

  // DEEP TREE ERASER: Climb up from the text element up to the macro card, clearing layout constraints
  let currentElement = targetTextElement;
  while (currentElement && currentElement !== parentCard) {
    currentElement.style.setProperty("display", "block", "important");
    currentElement.style.setProperty("-webkit-line-clamp", "unset", "important");
    currentElement.style.setProperty("line-clamp", "unset", "important");
    currentElement.style.setProperty("max-height", "none", "important");
    currentElement.style.setProperty("height", "auto", "important");
    currentElement.style.setProperty("overflow", "visible", "important");
    
    currentElement = currentElement.parentElement;
  }

  // 💡 FIX: Locate and hide the interaction bar (Like/Comment/Share) and the vanity social metrics display
  const engagementTargets = parentCard.querySelectorAll([
    '.feed-shared-social-action-bar',           // Main action items bar
    '.feed-shared-update-v2__social-actions',   // Alternative layout action container
    '.social-actions',                          // Compact view action targets
    '.feed-shared-social-counts',              // Vanity metric counters (e.g., "500 reactions")
    '.update-v2-social-activity'                // Shared commentary reaction headers
  ].join(', '));

  engagementTargets.forEach(element => {
    element.style.setProperty("display", "none", "important");
  });
}

// 4. MACRO-FIRST CORE ENGINE (diagnostic tracing enabled)
function scanAndCleanFeed() {
  const postCards = document.querySelectorAll('div.feed-shared-update-v2, .occludable-update, .feed-shared-update-v2__contents');
  
  postCards.forEach((parentCard, index) => {
    if (parentCard.hasAttribute('data-defluffed') || parentCard.classList.contains('defluff-loading')) {
      return;
    }

    // 1. UPDATED: Expanded selectors to capture more layout permutations (like text-views and commentary blocks)
    const targetTextElement = parentCard.querySelector(
      '.feed-shared-inline-show-more-text, ' +
      '.feed-shared-update-v2__description, ' +
      '.update-components-text, ' +
      '.update-components-text-view, ' +
      '.feed-shared-update-v2__commentary'
    );

    // 2. FIXED: Silently skip non-post layout containers (ads, carousels, etc.) instead of logging warnings
    if (!targetTextElement) {
      return;
    }

    const postText = targetTextElement.innerText || targetTextElement.textContent;
    if (!postText || postText.trim().length < 10 || postText.includes("[defluff")) return;

    parentCard.setAttribute('data-defluffed', 'true');

    const fluffCheck = isFluffOrBroetry(postText);
    
    if (fluffCheck) {
      if (!chrome.runtime || !chrome.runtime.id) {
        console.error("[Diagnostic] Extension context invalidated — reload the page after refreshing the extension.");
        return;
      }

      parentCard.classList.add('defluff-loading');
      const postHash = getPostHash(postText);

      chrome.runtime.sendMessage({
        action: "summarizeText",
        text: postText,
        postHash: postHash
      }, (response) => {
        parentCard.classList.remove('defluff-loading');

        if (chrome.runtime.lastError) {
          console.error("[Diagnostic] Message Port Error:", chrome.runtime.lastError.message);
          return;
        }

        if (response && response.success) {
          console.log(`%c[defluff Sync] Output Success!`, "color: #00ff66");
          injectSummarySafely(targetTextElement, parentCard, response.summary, response.cached);
        } else {
          console.error("[Diagnostic] Background Engine failed:", response?.error);
        }
      });
    }
  });
}

// Runtime Hooks
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  scanAndCleanFeed();
} else {
  window.addEventListener('DOMContentLoaded', scanAndCleanFeed);
}

let scrollTimeout;
const observer = new MutationObserver(() => {
  if (!chrome.runtime || !chrome.runtime.id) {
    observer.disconnect();
    return;
  }
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(scanAndCleanFeed, 150);
});
observer.observe(document.body, { childList: true, subtree: true });
