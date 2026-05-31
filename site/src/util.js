// ============================================================================
// PURE UTILITIES - Dependency-free helpers shared across all entry points
// ============================================================================
// This module loads first and depends on nothing. Keep it free of references
// to any other module's globals so it stays a safe, universal base layer.

// Escape text for safe interpolation into HTML strings.
// eslint-disable-next-line no-unused-vars
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Format an ISO date string as a short relative label (e.g. "5m ago").
// eslint-disable-next-line no-unused-vars
function formatRelativeDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  const yesterday = new Date(Date.now() - 86400000);
  if (date.toDateString() === yesterday.toDateString()) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
