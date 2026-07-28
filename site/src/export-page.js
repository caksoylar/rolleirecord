// ============================================================================
// EXPORT PAGE - Match local scan filenames to the active roll's logged frames
// ============================================================================

const ExportPage = {
  _roll: null,
  _frames: [],
  _scans: [],

  init() {
    CameraManager.init();
    FilmManager.init();
    RollManager.init();

    this._roll = RollManager.getCurrentRoll();
    this._frames = [...(this._roll?.frames ?? [])].sort(
      (frameA, frameB) => frameA.id - frameB.id,
    );

    this._fileInput = document.getElementById("scanFiles");
    this._matchingSection = document.getElementById("matchingSection");
    this._startFrameInput = document.getElementById("startFrame");
    this._matchList = document.getElementById("matchList");
    this._matchSummary = document.getElementById("matchSummary");
    this._exportBtn = document.getElementById("exportBtn");

    this._renderRoll();
    this._bindEvents();
  },

  _renderRoll() {
    const workflow = document.getElementById("exportWorkflow");
    const emptyState = document.getElementById("emptyState");

    if (!this._roll) {
      document.getElementById("rollName").textContent = "No active roll";
      document.getElementById("rollFrameCount").textContent = "0 frames";
      document.getElementById("rollMeta").textContent =
        "Return to the app and select a roll.";
      emptyState.textContent = "A roll is required to match and export scans.";
      emptyState.hidden = false;
      workflow.hidden = true;
      return;
    }

    document.getElementById("rollName").textContent = this._roll.name;
    document.getElementById("rollFrameCount").textContent =
      `${this._frames.length} logged ${this._frames.length === 1 ? "frame" : "frames"}`;
    document.getElementById("rollMeta").textContent = [
      this._roll.camera,
      this._roll.film,
      // eslint-disable-next-line eqeqeq
      this._roll.ei != null ? `EI ${this._roll.ei}` : null,
    ]
      .filter(Boolean)
      .join(" \u00b7 ");

    if (this._frames.length === 0) {
      emptyState.textContent =
        "Log at least one frame before matching and exporting scans.";
      emptyState.hidden = false;
      workflow.hidden = true;
      return;
    }

    this._startFrameInput.value = this._frames[0].id;
  },

  _bindEvents() {
    this._fileInput.addEventListener("change", () => {
      this._setScans(Array.from(this._fileInput.files));
    });

    this._matchList.addEventListener("change", (event) => {
      const checkbox = event.target.closest("input[data-index]");
      if (!checkbox) return;
      this._scans[Number(checkbox.dataset.index)].included = checkbox.checked;
      this._renderMatches();
    });

    this._startFrameInput.addEventListener("input", () =>
      this._renderMatches(),
    );

    document.getElementById("reverseBtn").addEventListener("click", () => {
      this._scans.reverse();
      this._renderMatches();
    });

    document.getElementById("clearBtn").addEventListener("click", () => {
      this._releasePreviews();
      this._scans = [];
      this._fileInput.value = "";
      this._renderMatches();
    });

    document
      .getElementById("exportWithoutMatch")
      .addEventListener("click", () => Export.exportToExiftoolCSV());

    this._exportBtn.addEventListener("click", () => {
      const matches = this._getAssignments()
        .filter(({ scan, frame }) => scan.included && frame)
        .map(({ scan, frame }) => ({
          frameId: frame.id,
          sourceFile: scan.name,
        }));

      try {
        Export.exportToExiftoolCSV(matches);
      } catch (error) {
        alert(`Failed to export: ${error.message}`);
      }
    });

    window.addEventListener("pagehide", () => this._releasePreviews());
  },

  _naturalSort(files) {
    return files.toSorted((fileA, fileB) =>
      fileA.name.localeCompare(fileB.name, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  },

  _setScans(files) {
    this._releasePreviews();
    this._scans = this._naturalSort(files).map((file) => ({
      name: file.name,
      detail: `${file.type || "Image"}${
        file.size ? ` \u00b7 ${(file.size / 1024 / 1024).toFixed(1)} MB` : ""
      }`,
      previewUrl: URL.createObjectURL(file),
      included: true,
    }));
    this._startFrameInput.value = this._frames[0].id;
    this._renderMatches();
  },

  _releasePreviews() {
    this._scans.forEach((scan) => URL.revokeObjectURL(scan.previewUrl));
  },

  _getStartFrame() {
    return this._startFrameInput.valueAsNumber;
  },

  _getAvailableFrames() {
    const firstFrame = this._getStartFrame();
    if (Number.isNaN(firstFrame)) return [];
    return this._frames.filter((frame) => frame.id >= firstFrame);
  },

  _getAssignments() {
    const availableFrames = this._getAvailableFrames();
    let frameIndex = 0;

    return this._scans.map((scan) => {
      if (!scan.included) return { scan, frame: null };
      const frame = availableFrames[frameIndex] ?? null;
      frameIndex++;
      return { scan, frame };
    });
  },

  _renderMatches() {
    if (this._scans.length === 0) {
      this._matchingSection.hidden = true;
      this._matchList.replaceChildren();
      this._matchSummary.textContent = "";
      this._exportBtn.disabled = true;
      return;
    }
    this._matchingSection.hidden = false;

    const assignments = this._getAssignments();
    this._matchList.innerHTML = assignments
      .map(({ scan, frame }, index) => {
        let status = "No logged frame";
        if (!scan.included) status = "Excluded";
        else if (frame) status = `Frame ${frame.id}`;

        const location = frame?.location || "";

        const mapsUrl = LocationManager.getMapsUrl(location);
        const locationStr = LocationManager.getLocationLabel(
          location,
          (resolvedLocation) => {
            const label = document.getElementById(`export-location-${index}`);
            if (label?.dataset.location === location) {
              label.textContent = resolvedLocation;
            }
          },
        );

        return `
          <div class="settings-row export-match-row${scan.included ? "" : " excluded"}">
            <input
              type="checkbox"
              data-index="${index}"
              ${scan.included ? "checked" : ""}
            />
            <span class="export-scan-thumbnail">
              <img src="${escapeHtml(scan.previewUrl)}" alt="" loading="lazy" />
              <svg class="icon export-preview-fallback" aria-hidden="true">
                <use href="icons.svg#icon-camera"></use>
              </svg>
            </span>
            <span class="row-label">
              <span class="row-title">${escapeHtml(scan.name)}</span>
              <span class="row-sub">${escapeHtml(scan.detail)}</span>
            </span>
            <span class="export-match-arrow" aria-hidden="true">&rarr;</span>
            <span class="export-frame-details">
              <span class="export-frame-heading">
                <span class="export-frame-match${scan.included && !frame ? " unmatched" : ""}">
                  ${escapeHtml(status)}
                </span>
                <a
                  class="export-map-button"
                  ${mapsUrl ? `href="${escapeHtml(mapsUrl)}"` : ""}
                  target="_blank"
                  rel="noopener"
                  title="Open frame location in map"
                  aria-label="Open frame location in map"
                  ${mapsUrl ? "" : 'aria-disabled="true"'}
                >
                  <svg class="icon" aria-hidden="true">
                    <use href="icons.svg#icon-map"></use>
                  </svg>
                </a>
              </span>
              <span class="export-frame-detail">${
                frame
                  ? escapeHtml(formatDisplayDate(frame.date))
                  : "No frame metadata"
              }</span>
              <span
                id="export-location-${index}"
                class="export-frame-detail"
                data-location="${escapeHtml(location)}"
              >${frame ? escapeHtml(locationStr) : "Location unavailable"}</span>
              ${
                frame?.notes
                  ? `<span class="export-frame-detail export-frame-note">"${escapeHtml(frame.notes)}"</span>`
                  : ""
              }
            </span>
          </div>`;
      })
      .join("");

    this._matchList
      .querySelectorAll("input[data-index]")
      .forEach((checkbox) => {
        const scan = this._scans[Number(checkbox.dataset.index)];
        checkbox.setAttribute("aria-label", `Include ${scan.name}`);
      });

    this._matchList
      .querySelectorAll(".export-scan-thumbnail img")
      .forEach((image) => {
        image.addEventListener(
          "error",
          () => image.closest(".export-scan-thumbnail").classList.add("failed"),
          { once: true },
        );
      });

    const included = assignments.filter(({ scan }) => scan.included);
    const matched = included.filter(({ frame }) => frame).length;
    const unmatchedFiles = included.length - matched;
    const missingScans = Math.max(
      0,
      this._getAvailableFrames().length - matched,
    );
    const details = [`${matched} matched`];
    if (unmatchedFiles) details.push(`${unmatchedFiles} without a frame`);
    if (missingScans) details.push(`${missingScans} frames without a scan`);
    this._matchSummary.textContent = details.join(" \u00b7 ");
    this._exportBtn.disabled = matched === 0;
  },
};

document.addEventListener("DOMContentLoaded", () => ExportPage.init());
