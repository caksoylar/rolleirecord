/**
 * Convert app metadata fields to exiftool tag names.
 */
// eslint-disable-next-line no-unused-vars
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

  // Shutter speed (e.g. "1/125" or "1s")
  if (meta.shutter && !/^auto$/i.test(meta.shutter)) {
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

  // Flash: EXIF Flash tag — 0 = No Flash, 1 = Fired
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
      // No brand prefix — use full string as model
      tags["LensModel"] = meta.lens;
    }
  }

  // Focal length (e.g. "85mm" or "85")
  // Note: we write FocalLength (actual physical focal length) only.
  // FocalLengthIn35mmFormat is intentionally omitted — computing it requires
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

  // Notes → UserComment
  if (meta.notes) {
    tags["UserComment"] = meta.notes;
  }

  // Film stock → ImageDescription
  if (meta.film) {
    tags["ImageDescription"] = meta.film;
  }

  return tags;
}
