// ============================================================================
// TABLE RENDERING - Show frames in a table with ID + certain fields
// ============================================================================

// eslint-disable-next-line no-unused-vars
const TableRenderer = {
  // Get column fields (those with column_width), excluding per-camera hidden fields
  getVisibleFields() {
    const camera = RollManager.getCurrentCamera();
    return FRAME_SCHEMA.fields.filter(
      (f) => f.column_width && !CameraManager.isFieldHidden(f.name, camera),
    );
  },

  // Render table headers dynamically from visible fields
  renderHeaders() {
    const visibleFields = this.getVisibleFields();
    const idField = FRAME_SCHEMA.fields.find((f) => f.name === "id");

    // Normalize widths so visible columns always fill the same proportion
    const targetTotal = 100 - parseFloat(idField.column_width);
    const rawTotal = visibleFields
      .filter((f) => f.name !== "id")
      .reduce((sum, f) => sum + (parseFloat(f.column_width) || 0), 0);
    const scale = rawTotal > 0 ? targetTotal / rawTotal : 1;

    let html = "<thead><tr>";
    visibleFields.forEach((field) => {
      const w =
        field.name === "id"
          ? ""
          : ` style="width:${(parseFloat(field.column_width) * scale).toFixed(1)}%"`;
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
        html += `<tr class="clickable" onclick="FrameModal.openEditModal(${row.id})" style="cursor:pointer">`;

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

    const addFab = document.getElementById("addFrameFab");
    if (addFab) addFab.style.display = hasRoll ? "" : "none";
  },
};
