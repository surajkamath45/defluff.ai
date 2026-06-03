// content.js - Comprehensive Defluff Injection Engine

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

// 3. BROADVIEW NEWSPAPER TILE INJECTION ENGINE (NON-DESTRUCTIVE REACT FIX)
function injectSummarySafely(targetTextElement, parentCard, summaryText, isCached) {
  // Guard check to prevent infinite re-injection loops
  if (targetTextElement.querySelector('.defluff-summary')) {
    return; 
  }

  // Extract LinkedIn's relative time metadata identifiers safely
  let timeString = "recently"; 
  const headerContainer = parentCard.querySelector('.feed-shared-actor, .update-v2-social-activity__header, .feed-shared-text-view') || parentCard;
  const targetElements = headerContainer.querySelectorAll('span, a, small');
  
  for (const element of targetElements) {
    const text = element.textContent ? element.textContent.trim() : '';
    if (!text) continue;

    const longMatch = text.match(/\b(\d+)\s*(min|minute|hour|day|week|month|year)s?\s*ago\b/i);
    if (longMatch) {
      const value = longMatch[1];
      let unit = longMatch[2].toLowerCase();
      if (unit.startsWith('minu') || unit.startsWith('mini')) unit = 'min';
      const pluralSuffix = value > 1 ? 's' : '';
      timeString = `${value} ${unit}${pluralSuffix} ago`;
      break;
    }

    const shortMatch = text.match(/\b(\d+)([mhdwmy])\b/i);
    if (shortMatch) {
      const value = shortMatch[1];
      const unit = shortMatch[2].toLowerCase();
      
      if (['m', 'h', 'd', 'w', 'y'].includes(unit)) {
        if (unit === 'm' && (text.includes('$') || text.toUpperCase().includes('ARR') || text.toUpperCase().includes('MRR'))) {
          continue; 
        }
        const dictionary = { 'm': 'min', 'h': 'hour', 'd': 'day', 'w': 'week', 'mo': 'month', 'y': 'year' };
        const pluralSuffix = value > 1 ? 's' : '';
        timeString = `${value} ${dictionary[unit] || unit}${pluralSuffix} ago`;
        break;
      }
    }
  }

  // 💡 FIX: Tag the full top-level container card to wrap the ENTIRE assembly in double rules
  parentCard.classList.add('vintage-newspaper-tile');

  // Build the underlying typography column container asset
  const summaryContainer = document.createElement('div');
  summaryContainer.className = 'defluff-summary';
  
  summaryContainer.style.setProperty("display", "block", "important");
  summaryContainer.style.setProperty("height", "auto", "important");

  // Format the primary header banner line
  const badgeElement = document.createElement('strong');
  badgeElement.className = 'defluff-badge';
  badgeElement.textContent = isCached 
    ? `📰 DEFLUFFED (ARCHIVE) | ${timeString}` 
    : `📰 DEFLUFFED | ${timeString}`;
  summaryContainer.appendChild(badgeElement);

  // VINTAGE COMMAND MENU TOOLBAR
  const menuContainer = document.createElement('div');
  menuContainer.className = 'defluff-menu';

  const toggleTextBtn = document.createElement('button');
  toggleTextBtn.className = 'defluff-btn';
  toggleTextBtn.textContent = '📖 SHOW ORIGINAL TEXT';

  menuContainer.appendChild(toggleTextBtn);
  summaryContainer.appendChild(menuContainer);

  // Build Isolated Summary Text Narrative Block
  const summaryContent = document.createElement('div');
  summaryContent.className = 'defluff-summary-text-content';
  summaryContent.textContent = summaryText;
  summaryContainer.appendChild(summaryContent);
  
  // 💡 FIX: Append our summary alongside the untouched text nodes to keep React perfectly stable
  targetTextElement.appendChild(summaryContainer);

  // INTERACTION EVENT LISTENER
  let showingOriginalText = false;
  toggleTextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showingOriginalText = !showingOriginalText;
    if (showingOriginalText) {
      parentCard.classList.add('show-original-active');
      toggleTextBtn.textContent = '📰 SHOW DEFLUFFED';
    } else {
      parentCard.classList.remove('show-original-active');
      toggleTextBtn.textContent = '📖 SHOW ORIGINAL TEXT';
    }
  });

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

// 4. MACRO-FIRST CORE ENGINE (CRITICAL SELECTOR FIX)
function scanAndCleanFeed() {
  // 💡 FIX: Strictly target top-level post wrapper nodes to avoid layout boundary slicing
  const postCards = document.querySelectorAll('div.feed-shared-update-v2, .occludable-update');
  
  postCards.forEach((parentCard) => {
    if (parentCard.hasAttribute('data-defluffed') || parentCard.classList.contains('defluff-loading')) {
      return;
    }

    const targetTextElement = parentCard.querySelector(
      '.feed-shared-inline-show-more-text, ' +
      '.feed-shared-update-v2__description, ' +
      '.update-components-text, ' +
      '.update-components-text-view, ' +
      '.feed-shared-update-v2__commentary'
    );

    if (!targetTextElement) return;

    const postText = targetTextElement.innerText || targetTextElement.textContent;
    if (!postText || postText.trim().length < 10 || postText.includes("[defluff")) return;

    parentCard.setAttribute('data-defluffed', 'true');

    if (isFluffOrBroetry(postText)) {
      if (!chrome.runtime || !chrome.runtime.id) return;

      parentCard.classList.add('defluff-loading');
      const postHash = getPostHash(postText);

      chrome.runtime.sendMessage({
        action: "summarizeText",
        text: postText,
        postHash: postHash
      }, (response) => {
        parentCard.classList.remove('defluff-loading');
        if (response && response.success) {
          injectSummarySafely(targetTextElement, parentCard, response.summary, response.cached);
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