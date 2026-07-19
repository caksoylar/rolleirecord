// ============================================================================
// EXPORT & IMPORT - I/O for rolls
// ============================================================================

// Convert app metadata fields to exiftool tag names.
function buildExifTags(meta) {
  const frameId = String(meta.id).padStart(2, "0");
  const tags = { SourceFile: `frame_${frameId}.jpg` };

  // Camera make & model (split first word as Make)
  if (meta.camera) {
    const parts = meta.camera.split(" ");
    tags["Make"] = parts[0];
    tags["Model"] = parts.length > 1 ? parts.slice(1).join(" ") : parts[0];
  }

  // Date: use AllDates to set DateTimeOriginal, CreateDate, ModifyDate at once
  if (meta.date) {
    const d = meta.date
      .replace(/^(\d+)-(\d+)-(\d+)/, "$1:$2:$3")
      .replace(/T/, " ");

    tags["AllDates"] = d.replace(/[+-]\d+:\d+$/, "");

    // Timezone offset
    const offset = d.match(/[+-]\d+:\d+$/)?.[0];
    if (offset) {
      tags["OffsetTime"] = offset;
      tags["OffsetTimeOriginal"] = offset;
      tags["OffsetTimeDigitized"] = offset;
    }
  }

  // Shutter speed (e.g. "1/125" or "1s"). Bulb ("B") has no numeric representation.
  if (meta.shutter && !/^(auto|b)$/i.test(meta.shutter)) {
    const val = String(meta.shutter).replace(/s$/, "");
    tags["ExposureTime"] = val;
  }

  // Aperture (e.g. "ƒ/5.6" or "5.6")
  if (meta.aperture && !/^auto$/i.test(meta.aperture)) {
    const val = String(meta.aperture).replace(/^[ƒf]\//, "");
    tags["FNumber"] = val;
  }

  // ISO
  if (meta.iso) {
    tags["ISO"] = String(meta.iso);
  }

  // Exposure compensation
  if (meta.exposure_comp) {
    tags["ExposureCompensation"] = String(meta.exposure_comp);
  }

  // Flash: EXIF Flash tag:  0 = No Flash, 1 = Fired
  // eslint-disable-next-line eqeqeq
  if (meta.flash != null) {
    tags["Flash"] = meta.flash ? "1" : "0";
  }

  // Lens make & model (split first word as Make, like camera)
  if (meta.lens) {
    const parts = String(meta.lens).trim().split(" ");
    // If lens has multiple words, try make/model split
    // Typical analog lens names may be just "50mm f/1.8" (no brand)
    // or "Nikon 50mm f/1.4" (with brand)
    if (parts.length > 1 && !/^\d/.test(parts[0])) {
      // First word looks like a brand (starts with a letter)
      tags["LensMake"] = parts[0];
      tags["LensModel"] = parts.slice(1).join(" ");
    } else {
      // No brand prefix:  use full string as model
      tags["LensModel"] = meta.lens;
    }
  }

  // Focal length (e.g. "85mm" or "85")
  // Note: we write FocalLength (actual physical focal length) only.
  // FocalLengthIn35mmFormat is intentionally omitted - computing it requires
  // a per-format crop factor that we don't have reliably for user-added cameras
  // and medium format bodies where the relationship to 35mm varies widely.
  if (meta.focal_length) {
    const val = String(meta.focal_length).replace(/mm$/i, "");
    tags["FocalLength"] = val;
  }

  // Exposure program / shooting mode
  if (meta.mode) {
    // Map common shorthand values to EXIF ExposureProgram numeric codes.
    // Numeric values are passed through directly if already valid.
    const MODE_MAP = {
      M: 1,
      Manual: 1,
      P: 2,
      Program: 2,
      Auto: 2,
      A: 3,
      Av: 3,
      "Aperture-priority": 3,
      Bokeh: 3,
      S: 4,
      Tv: 4,
      "Shutter-priority": 4,
      Slow: 5,
      Night: 5,
    };
    const VALID_CODES = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const numeric = Number(meta.mode);
    if (!isNaN(numeric) && VALID_CODES.has(numeric)) {
      tags["ExposureProgram"] = String(numeric);
    } else {
      tags["ExposureProgram"] = String(MODE_MAP[meta.mode] ?? 0);
    }
  }

  // GPS coordinates
  if (meta.location) {
    const [latitude, longitude] = meta.location.split(/, */).map(parseFloat);
    if (!isNaN(latitude) && !isNaN(longitude)) {
      tags["GPSLatitude"] = latitude.toFixed(5);
      tags["GPSLatitudeRef"] = latitude >= 0 ? "N" : "S";
      tags["GPSLongitude"] = longitude.toFixed(5);
      tags["GPSLongitudeRef"] = longitude >= 0 ? "E" : "W";
    }
  }

  // Notes & Filter → UserComment
  const userComment = [
    meta.notes,
    meta.filter && meta.filter !== "None" ? `Filter: ${meta.filter}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  if (userComment) {
    tags["UserComment"] = userComment;
  }

  // Film stock → ImageDescription
  if (meta.film) {
    tags["ImageDescription"] = meta.film;
  }

  return tags;
}

// eslint-disable-next-line no-unused-vars
const Export = {
  // Build clean frame data for CSV export (flat rows with camera/film/iso)
  _getFrameData() {
    const rows = RollManager.getFrames();
    const camera = RollManager.getCurrentCamera();
    const film = RollManager.getCurrentFilm();
    const iso = FilmManager.getByName(film)?.iso ?? "";

    return rows.map((row) => {
      const clean = Object.fromEntries(
        Object.entries(row).filter(([, val]) => val != null), // eslint-disable-line eqeqeq
      );
      clean.camera = camera;
      clean.film = film;
      clean.iso = iso;
      return clean;
    });
  },

  // Strip internal id, keep only entity-relevant properties
  _cleanEntity(entity) {
    if (!entity) return {};
    const { id: _id, ...rest } = entity;
    return rest;
  },

  // Coerce raw frame objects to match FRAME_SCHEMA types, strip nulls
  _coerceFrames(rawFrames) {
    const fieldMap = new Map(FRAME_SCHEMA.fields.map((f) => [f.name, f]));
    return rawFrames.map((row) => {
      const frame = {};
      for (const key of Object.keys(row)) {
        const field = fieldMap.get(key);
        if (!field) continue;
        let val = row[key];
        if (field.type === "number") {
          val = val == null ? null : Number(val); // eslint-disable-line eqeqeq
          if (isNaN(val)) val = null;
        } else if (field.type === "checkbox") {
          val = val === true || val === "true";
          // eslint-disable-next-line eqeqeq
        } else if (val != null) {
          val = String(val);
        }
        if (val != null) frame[key] = val; // eslint-disable-line eqeqeq
      }
      return frame;
    });
  },

  // Append numeric suffix if a roll with this name already exists
  _deduplicateRollName(name) {
    const existingNames = new Set(RollManager.getRolls().map((r) => r.name));
    if (!existingNames.has(name)) return name;
    let suffix = 2;
    while (existingNames.has(`${name} (${suffix})`)) {
      suffix++;
    }
    return `${name} (${suffix})`;
  },

  _rollFilename(extension) {
    const currentRoll = RollManager.getCurrentRoll();
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const rollName = currentRoll
      ? currentRoll.name.replace(/[^a-z0-9]/gi, "_")
      : "export";
    const frameCount = RollManager.getMaxFrameId(currentRoll) ?? 0;
    return `${rollName}_${frameCount}-${timestamp}.${extension}`;
  },

  _downloadFile(content, mimeType, filename) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportStorage() {
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      backup[key] = localStorage.getItem(key);
    }
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    this._downloadFile(
      JSON.stringify(backup, null, 2),
      "application/json",
      `rolleirecord-backup-${timestamp}.json`,
    );
  },

  _importFile(handler) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          handler(event.target.result, file);
        } catch (err) {
          alert("Failed to import: " + err.message);
        }
      };
      reader.readAsText(file);
    });

    input.click();
  },

  importStorage() {
    this._importFile((text) => {
      const backup = JSON.parse(text);
      if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
        alert("Invalid file: expected a JSON object.");
        return;
      }
      if (
        !confirm(
          "This will replace all current data with the backup. Continue?",
        )
      )
        return;
      localStorage.clear();
      Object.entries(backup).forEach(([k, v]) => localStorage.setItem(k, v));
      location.reload();
    });
  },

  exportRoll() {
    const roll = RollManager.getCurrentRoll();
    if (!roll) return;

    const cameraName = RollManager.getCurrentCamera();
    const filmName = RollManager.getCurrentFilm();

    const data = {
      name: roll.name,
      frameCount: roll.frameCount ?? null,
      notes: roll.notes || "",
      camera: this._cleanEntity(CameraManager.getByName(cameraName)),
      film: this._cleanEntity(FilmManager.getByName(filmName)),
      frames: this._coerceFrames(roll.frames),
    };

    const jsonString = JSON.stringify(data, null, 2);
    this._downloadFile(
      jsonString,
      "application/json",
      this._rollFilename("json"),
    );
  },

  importRoll() {
    this._importFile((text, file) => {
      const data = JSON.parse(text);

      if (!data || typeof data !== "object" || !Array.isArray(data.frames)) {
        alert("Invalid file: expected a JSON object with a frames array.");
        return;
      }

      // Reconcile camera and film entities
      const camera = data.camera
        ? CameraManager.upsertByName(data.camera)
        : null;
      const film = data.film ? FilmManager.upsertByName(data.film) : null;

      const cameraName = camera?.name || CameraManager.getAll()[0]?.name || "";
      const filmName = film?.name || FilmManager.getAll()[0]?.name || "";

      const frames = this._coerceFrames(data.frames);

      // Use roll name from data, fall back to filename
      let rollName = data.name;
      if (!rollName) {
        const baseName = file.name.replace(/\.json$/i, "");
        rollName = baseName
          .replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/, "")
          .replace(/_-?\d+$/, "")
          .replace(/_/g, " ");
      }
      rollName = this._deduplicateRollName(rollName || "Imported Roll");

      const newRoll = RollManager.createRoll({
        name: rollName,
        frameCount: data.frameCount,
        notes: data.notes || "",
        camera: cameraName,
        film: filmName,
        frames,
      });
      RollManager.setCurrentRoll(newRoll.id);

      refreshAllUI();
    });
  },

  exportToExiftoolCSV() {
    const data = this._getFrameData().sort((f1, f2) => f1.id - f2.id);
    const exif = data.map(buildExifTags);

    const keys = [...new Set(exif.flatMap((obj) => Object.keys(obj)))];

    const toCsvLine = (obj) =>
      keys
        .map((key) => {
          const val = obj[key] ?? "";
          // Wrap in quotes if value contains comma, quote, or newline
          return /[,"\n]/.test(String(val))
            ? `"${String(val).replace(/"/g, '""')}"`
            : val;
        })
        .join(",");

    const csvString = [keys.join(","), ...exif.map(toCsvLine)].join("\n");

    this._downloadFile(csvString, "text/csv", this._rollFilename("csv"));
  },
};
