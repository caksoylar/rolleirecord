// ============================================================================
// TABLE RENDERING & UI VISIBILITY
// ============================================================================

/* eslint-disable no-unused-vars */

// APPLICATION STATE
// ============================================================================
let appState = {
  mode: null, // 'add' or 'edit'
  currentRowId: null,
};

// ============================================================================
// UI VISIBILITY - Show/hide elements based on roll state
// ============================================================================
const UIVisibility = {
  update() {
    const hasRoll = RollManager.getCurrentRoll() !== null;
    const selectorGroup = document.querySelector(".entity-selector-group");

    if (selectorGroup) selectorGroup.style.display = hasRoll ? "" : "none";
  },
};

// ============================================================================
// TABLE RENDERING
// ============================================================================
const TableRenderer = {
  // Get visible fields, excluding per-camera hidden fields
  getVisibleFields() {
    const camera = SessionManager.getSelectedCamera();
    return FRAME_SCHEMA.fields.filter(
      (f) => f.visible && !(f.hideable && CameraManager.isFieldHidden(f.name, camera)),
    );
  },

  // Render table headers dynamically from visible fields
  renderHeaders() {
    const visibleFields = this.getVisibleFields();

    // Normalize widths so visible columns always fill the same proportion
    const TARGET_TOTAL = 85;
    const rawTotal = visibleFields.reduce(
      (sum, f) => sum + (parseFloat(f.width) || 0),
      0,
    );
    const scale = rawTotal > 0 ? TARGET_TOTAL / rawTotal : 1;

    let html = "<thead><tr>";

    visibleFields.forEach((field) => {
      const w = field.width
        ? ` style="width:${(parseFloat(field.width) * scale).toFixed(1)}%"`
        : "";
      html += `<th${w}>${field.header || field.label}</th>`;
    });

    html += "<th>⁝</th></tr></thead>";
    return html;
  },

  // Render table body with all rows
  renderTableBody() {
    const rows = RollManager.getFrames();
    const visibleFields = this.getVisibleFields();

    let html = "<tbody>";
    html += "<tr>";
    visibleFields.forEach((_field) => {
      html += `<td></td>`;
    });
    html += `<td class="actions"><button onclick="UI.openAddModal()" title="Add new"><svg class="icon"><use href="icons.svg#icon-add"></use></svg></button></td>`;
    html += "</tr>";

    rows
      .sort((r1, r2) => r2.id - r1.id)
      .forEach((row) => {
        html += "<tr>";

        visibleFields.forEach((field) => {
          const value = row[field.name] == null ? "" : row[field.name]; // eslint-disable-line eqeqeq
          html += `<td>${escapeHtml(String(value))}</td>`;
        });

        html += `<td class="actions">
                        <button class="secondary" onclick="UI.openEditModal(${Number(row.id)})" title="Edit"><svg class="icon"><use href="icons.svg#icon-edit"></use></svg></button>
                    </td></tr>`;
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

    UIVisibility.update();
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

function refreshAllUI() {
  RollSelector.render();
  TableRenderer.render();
  CameraSelector.render();
  FilmSelector.render();
}
