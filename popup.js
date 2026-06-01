// Ensure DOM elements are fully loaded before querying storage
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(
    { stats: { postsPurged: 0, totalLinesCollapsed: 0, totalSecondsSaved: 0 } },
    (data) => {
      const stats = data.stats;

      document.getElementById("purged").textContent = stats.postsPurged;
      document.getElementById("lines").textContent = stats.totalLinesCollapsed;

      const sec = stats.totalSecondsSaved;
      document.getElementById("time").textContent =
        sec > 60 ? `${Math.round(sec / 60)}m` : `${sec}s`;
    }
  );
});
