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

// Format a date object with the timezone-based representation
// eslint-disable-next-line no-unused-vars
function formatDate(date) {
  const pad = (n) => String(n).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
