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

// 3. BROADVIEW NEWSPAPER TILE INJECTION ENGINE (RESILIENT TIMESTAMP FIX)
function injectSummarySafely(targetTextElement, parentCard, summaryText, isCached) {
  // Clear original text nodes safely
  targetTextElement.textContent = ''; 

  // 💡 NEW TIMESTAMPS EXTRACTOR: Scope search strictly to the header block to avoid footer metric collisions
  let timeString = "recently"; 
  const headerContainer = parentCard.querySelector('.feed-shared-actor, .update-v2-social-activity__header, .feed-shared-text-view') || parentCard;
  const targetElements = headerContainer.querySelectorAll('span, a, small');
  
  for (const element of targetElements) {
    const text = element.textContent ? element.textContent.trim() : '';
    if (!text) continue;

    // Rule A: Match conversational accessibility strings ("3 hours ago", "1 day ago")
    const longMatch = text.match(/\b(\d+)\s*(min|minute|hour|day|week|month|year)s?\s*ago\b/i);
    if (longMatch) {
      const value = longMatch[1];
      let unit = longMatch[2].toLowerCase();
      if (unit.startsWith('minu') || unit.startsWith('mini')) unit = 'min';
      const pluralSuffix = value > 1 ? 's' : '';
      timeString = `${value} ${unit}${pluralSuffix} ago`;
      break;
    }

    // Rule B: Match shorthand notation tokens ("3h", "1d", "4m") safely isolated from adjacent words
    const shortMatch = text.match(/\b(\d+)([mhdwmy])\b/i);
    if (shortMatch) {
      const value = shortMatch[1];
      const unit = shortMatch[2].toLowerCase();
      
      // Quick filter to protect against corporate metrics in headlines (e.g., $5M, B2B, 3D)
      if (['m', 'h', 'd', 'w', 'y'].includes(unit)) {
        if (unit === 'm' && (text.includes('$') || text.toUpperCase().includes('ARR') || text.toUpperCase().includes('MRR'))) {
          continue; 
        }
        
        const dictionary = {
          'm': 'min',
          'h': 'hour',
          'd': 'day',
          'w': 'week',
          'mo': 'month',
          'y': 'year'
        };
        
        const expandedUnit = dictionary[unit] || unit;
        const pluralSuffix = value > 1 ? 's' : '';
        timeString = `${value} ${expandedUnit}${pluralSuffix} ago`;
        break;
      }
    }
  }

  // Tag the full parent card container to enforce the newspaper aesthetic styles
  parentCard.classList.add('vintage-newspaper-tile');

  // Build the underlying typography column asset
  const summaryContainer = document.createElement('div');
  summaryContainer.className = 'brainwash-summary';
  
  summaryContainer.style.setProperty("display", "block", "important");
  summaryContainer.style.setProperty("height", "auto", "important");
  summaryContainer.style.setProperty("max-height", "none", "important");
  summaryContainer.style.setProperty("overflow", "visible", "important");

  const badgeElement = document.createElement('strong');
  badgeElement.textContent = isCached 
    ? `📰 DEFLUFFED (ARCHIVE) | ${timeString}` 
    : `📰 DEFLUFFED | ${timeString}`;

  const textNode = document.createTextNode(summaryText);
  summaryContainer.appendChild(badgeElement);
  summaryContainer.appendChild(textNode);
  
  targetTextElement.appendChild(summaryContainer);

  // Deep structural layout layout loop to overwrite nested constraints
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
