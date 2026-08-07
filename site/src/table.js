// ============================================================================
// TABLE RENDERING - Show frames as expanded, tappable metadata rows
// ============================================================================

// eslint-disable-next-line no-unused-vars
const TableRenderer = {
  // Preserve the camera-aware field visibility used by frame cards.
  _getVisibleFields() {
    const camera = RollManager.getCurrentCamera();
    return FRAME_SCHEMA.fields.filter(
      (field) =>
        field.in_card && !CameraManager.isFieldHidden(field.name, camera),
    );
  },

  _getExposureDetails(row) {
    return this._getVisibleFields()
      .filter((field) => row[field.name])
      .map((field) => `${field.header || field.label} ${row[field.name]}`)
      .join(" · ");
  },

  _renderFrameRow(row) {
    const exposure = this._getExposureDetails(row);
    const rawLocation = row.location || "";
    const location = LocationManager.getLocationLabel(
      rawLocation,
      (resolvedLocation) => {
        const label = document.getElementById(`frame-location-${row.id}`);
        if (label?.dataset.location === rawLocation) {
          label.textContent = resolvedLocation;
        }
      },
    );
    const notes = row.notes
      ? `<span class="frame-row-notes">"${escapeHtml(String(row.notes))}"</span>`
      : "";

    return `
      <button
        type="button"
        class="frame-row"
        onclick="FrameModal.openEditModal(${row.id})"
      >
        <span class="frame-row-header">
          <span class="frame-row-id"># ${escapeHtml(String(row.id))}</span>
          <span class="frame-row-date">${escapeHtml(formatDisplayDate(row.date))}</span>
        </span>
        ${
          exposure
            ? `<span class="frame-row-exposure">${escapeHtml(exposure)}</span>`
            : ""
        }
        <span class="frame-row-location">
          <svg class="icon" aria-hidden="true"><use href="icons.svg#icon-pin"></use></svg>
          <span
            id="frame-location-${escapeHtml(String(row.id))}"
            class="frame-row-location-label"
            data-location="${escapeHtml(rawLocation)}"
          >${escapeHtml(location)}</span>
        </span>
        ${notes}
      </button>`;
  },

  // Render all frames newest first.
  _renderFrames() {
    const rows = RollManager.getFrames();
    if (rows.length === 0) {
      return '<div class="empty-state"><p>No frames, tap "+" to add one</p></div>';
    }
    return `<div class="frame-list">${rows
      .toSorted((r1, r2) => r2.id - r1.id)
      .map((row) => this._renderFrameRow(row))
      .join("")}</div>`;
  },

  // Full frame list render
  render() {
    const container = document.getElementById("tableContainer");
    const hasRoll = RollManager.getCurrentRoll() !== null;
    if (!hasRoll) {
      container.innerHTML =
        '<div class="empty-state"><p>Create a new roll to get started</p></div>';
    } else {
      container.innerHTML = this._renderFrames();
    }

    const mainActions = document.getElementById("mainActions");
    if (mainActions) mainActions.style.display = hasRoll ? "" : "none";
  },
};
