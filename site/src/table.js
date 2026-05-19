// ============================================================================
// TABLE RENDERING & UI VISIBILITY
// ============================================================================

// ============================================================================
// UI VISIBILITY - Show/hide elements based on roll state
// ============================================================================

// ============================================================================
// TABLE RENDERING
// ============================================================================

const TableRenderer = {
  // Get column fields (those with column_width), excluding per-camera hidden fields
  getVisibleFields() {
    const camera = SessionManager.getSelectedCamera();
    return FRAME_SCHEMA.fields.filter(
      (f) =>
        f.column_width &&
        !(f.hideable && CameraManager.isFieldHidden(f.name, camera)),
    );
  },

  // Render table headers dynamically from visible fields
  renderHeaders() {
    const visibleFields = this.getVisibleFields();

    // Normalize widths so visible columns always fill the same proportion
    const TARGET_TOTAL = 100;
    const rawTotal = visibleFields.reduce(
      (sum, f) => sum + (parseFloat(f.column_width) || 0),
      0,
    );
    const scale = rawTotal > 0 ? TARGET_TOTAL / rawTotal : 1;

    let html = "<thead><tr>";

    visibleFields.forEach((field) => {
      const w = ` style="width:${(parseFloat(field.column_width) * scale).toFixed(1)}%"`;
      html += `<th${w}>${field.header || field.label}</th>`;
    });

    html += "</tr></thead>";
    return html;
  },

  // Render table body with all rows
  renderTableBody() {
    const rows = RollManager.getFrames();
    const visibleFields = this.getVisibleFields();

    let html = "<tbody>";

    rows
      .toSorted((r1, r2) => r2.id - r1.id)
      .forEach((row) => {
        html += `<tr class="clickable" onclick="UI.openEditModal(${row.id})" style="cursor:pointer">`;

        visibleFields.forEach((field) => {
          const raw = row[field.name] == null ? "" : row[field.name]; // eslint-disable-line eqeqeq
          const value =
            field.type === "datetime" ? formatRelativeDate(raw) : raw;
          html += `<td>${escapeHtml(String(value))}</td>`;
        });

        html += "</tr>";
      });

    html += "</tbody>";
    return html;
  },

  // Full table render
  render() {
    const container = document.getElementById("tableContainer");
    const hasRoll = RollManager.getCurrentRoll() !== null;
    if (!hasRoll) {
      container.innerHTML =
        '<div class="empty-state"><p>No rolls yet</p><p>Create a new roll to get started</p></div>';
    } else {
      container.innerHTML = `<table>${this.renderHeaders()}${this.renderTableBody()}</table>`;
    }

    const selectorGroup = document.querySelector(".entity-selector-group");
    const addFab = document.getElementById("addFrameFab");
    if (selectorGroup) selectorGroup.style.display = hasRoll ? "" : "none";
    if (addFab) addFab.style.display = hasRoll ? "" : "none";
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

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

// eslint-disable-next-line no-unused-vars
function refreshAllUI() {
  RollSelector.render();
  TableRenderer.render();
  CameraSelector.render();
  FilmSelector.render();
}
