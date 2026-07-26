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

  _formatDate(value) {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  },

  _getLocationLabel(location) {
    if (!location) return "Location unavailable";

    const lookup = LocationManager.getReverseGeocode(location);
    if (lookup && typeof lookup.then === "function") {
      void lookup.then(
        (label) => {
          if (label) this.render();
        },
        (error) => console.error("Reverse geocode lookup failed:", error),
      );
      return location;
    }

    return lookup || location;
  },

  _renderFrameRow(row) {
    const exposure = this._getExposureDetails(row);
    const location = this._getLocationLabel(row.location);
    const notes = row.notes
      ? `<span class="frame-row-notes">"${escapeHtml(String(row.notes))}"</span>`
      : "";

    return `
      <button
        type="button"
        class="frame-row"
        onclick="FrameModal.openEditModal(${row.id})"
      >
        <span class="frame-row-left">
          <span class="frame-row-id">Frame ${escapeHtml(String(row.id))}</span>
          ${
            exposure
              ? `<span class="frame-row-exposure">${escapeHtml(exposure)}</span>`
              : ""
          }
          ${notes}
        </span>
        <span class="frame-row-right">
          <span class="frame-row-date">${escapeHtml(this._formatDate(row.date))}</span>
          <span class="frame-row-location">${escapeHtml(location)}</span>
        </span>
      </button>`;
  },

  // Render all frames newest first.
  _renderFrames() {
    const rows = RollManager.getFrames();
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
        '<div class="empty-state"><p>No rolls yet</p><p>Create a new roll to get started</p></div>';
    } else {
      container.innerHTML = this._renderFrames();
    }

    const addFab = document.getElementById("addFrameFab");
    if (addFab) addFab.style.display = hasRoll ? "" : "none";
    const rollFab = document.getElementById("rollActionsFab");
    if (rollFab) rollFab.style.display = hasRoll ? "" : "none";
  },
};
