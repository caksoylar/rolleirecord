// ============================================================================
// ENTITY MANAGER - Generic localStorage-backed CRUD for cameras, films, etc.
// ============================================================================

class EntityManager {
  constructor({ entityType, storageKey, counterKey, schema, defaults }) {
    this.entityType = entityType;
    this.storageKey = storageKey;
    this.counterKey = counterKey;
    this.seededKey = `${storageKey}-seeded`;
    this.schema = schema;
    this.defaults = defaults;
  }

  // Names of defaults already introduced to this install, or null if the
  // registry has never been written (i.e. storage predates this mechanism).
  getSeededNames() {
    const stored = localStorage.getItem(this.seededKey);
    return stored ? JSON.parse(stored) : null;
  }

  setSeededNames(names) {
    localStorage.setItem(this.seededKey, JSON.stringify(names));
  }

  // Frame fields whose option lists are scoped per-entity of this type.
  getEntitySpecificFrameFields() {
    return FRAME_SCHEMA.fields.filter(
      (f) => f.type === "select" && f.entity_specific === this.entityType,
    );
  }

  init() {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) {
      // First load: seed entirely from defaults
      const seeded = this.defaults.map((item, i) => ({
        ...item,
        id: `${this.storageKey}-${i + 1}`,
      }));
      this.saveAll(seeded);
      localStorage.setItem(this.counterKey, String(this.defaults.length));
      this.setSeededNames(this.defaults.map((d) => d.name));
      return;
    }

    const seededNames = this.getSeededNames();
    if (seededNames === null) {
      // Migration: storage predates the seeded registry. Treat every current
      // default as already introduced so earlier deletions/renames aren't
      // resurrected; only future additions to the defaults will be merged.
      this.setSeededNames(this.defaults.map((d) => d.name));
      return;
    }

    // Merge: add only defaults that have never been introduced before. A
    // deleted or renamed default keeps its original name in the registry, so
    // it stays gone across reloads.
    const items = JSON.parse(stored);
    const existingNames = new Set(items.map((item) => item.name));
    const seen = new Set(seededNames);
    let changed = false;
    for (const def of this.defaults) {
      if (seen.has(def.name)) continue;
      seen.add(def.name);
      changed = true;
      if (!existingNames.has(def.name)) {
        items.push({ ...def, id: this.getNextId() });
      }
    }
    if (changed) {
      this.saveAll(items);
      this.setSeededNames([...seen]);
    }
  }

  getAll() {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  saveAll(items) {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  getById(id) {
    return this.getAll().find((item) => item.id === id) || null;
  }

  getByName(name) {
    return this.getAll().find((item) => item.name === name) || null;
  }

  getNextId() {
    let counter = localStorage.getItem(this.counterKey);
    counter = counter ? parseInt(counter, 10) + 1 : 1;
    localStorage.setItem(this.counterKey, String(counter));
    return `${this.storageKey}-${counter}`;
  }

  create(data) {
    const items = this.getAll();
    const newItem = { ...data, id: this.getNextId() };
    items.push(newItem);
    this.saveAll(items);
    return newItem;
  }

  update(id, data) {
    const items = this.getAll();
    const item = items.find((item) => item.id === id);
    if (!item) return null;
    const oldName = item.name;
    Object.assign(item, data);
    this.saveAll(items);
    return { item, oldName };
  }

  delete(id) {
    const items = this.getAll();
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length === items.length) return false;
    this.saveAll(filtered);
    return true;
  }

  getDisplayName(id) {
    const item = this.getById(id);
    return item ? item.name : null;
  }

  // Find entity by name; create if missing, update if properties differ.
  // Returns the entity. The `data` object should include `name`.
  upsertByName(data) {
    if (!data || !data.name) return null;
    const existing = this.getByName(data.name);
    if (!existing) {
      return this.create(data);
    }
    // Check if any properties differ (ignore `id`)
    const { id: _id, ...importProps } = data;
    const needsUpdate = Object.keys(importProps).some(
      (key) =>
        JSON.stringify(existing[key]) !== JSON.stringify(importProps[key]),
    );
    if (needsUpdate) {
      return this.update(existing.id, importProps).item;
    }
    return existing;
  }

  getHiddenFields(entityName) {
    if (!entityName) return [];
    const entity = this.getByName(entityName);
    return (entity && entity["hidden-fields"]) || [];
  }

  isFieldHidden(fieldName, entityName) {
    return this.getHiddenFields(entityName).includes(fieldName);
  }

  toggleHiddenField(fieldName, entityName) {
    const entity = this.getByName(entityName);
    if (!entity) return;
    const hidden = entity["hidden-fields"] || [];
    const index = hidden.indexOf(fieldName);
    if (index === -1) {
      hidden.push(fieldName);
    } else {
      hidden.splice(index, 1);
    }
    entity["hidden-fields"] = hidden;
    this.update(entity.id, entity);
  }
}

// Singleton instances

const CameraManager = new EntityManager({
  entityType: "camera",
  storageKey: "cameras",
  counterKey: "camera-counter",
  schema: CAMERA_SCHEMA,
  defaults: DEFAULT_CAMERAS,
});

const FilmManager = new EntityManager({
  entityType: "film",
  storageKey: "films",
  counterKey: "film-counter",
  schema: FILM_SCHEMA,
  defaults: DEFAULT_FILMS,
});

// eslint-disable-next-line no-unused-vars
const EntityManagers = {
  camera: CameraManager,
  film: FilmManager,
};

// ============================================================================
// OPTIONS MANAGER - localStorage for dynamic select field options
// ============================================================================
// eslint-disable-next-line no-unused-vars
const OptionsManager = {
  OPTIONS_KEY: "fieldOptions",

  _getField(fieldName) {
    return FRAME_SCHEMA.fields.find((f) => f.name === fieldName);
  },

  _readAll() {
    const raw = localStorage.getItem(this.OPTIONS_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      console.error("Failed to parse field options store", e);
      return {};
    }
  },

  _writeAll(obj) {
    try {
      localStorage.setItem(this.OPTIONS_KEY, JSON.stringify(obj));
      return true;
    } catch (e) {
      console.error("Failed to save field options store", e);
      return false;
    }
  },

  // Get options for a specific field from localStorage or defaults
  getOptions(fieldName, entityType = "", entityName = "") {
    const field = this._getField(fieldName);
    if (!field || field.type !== "select") {
      return [];
    }

    const stored = this._readAll()?.[entityType]?.[entityName]?.[fieldName];
    if (Array.isArray(stored)) {
      return stored;
    }

    // Return default options from schema
    return field.options || [];
  },

  // Set options for a specific field in localStorage
  setOptions(fieldName, optionsArray, entityType = "", entityName = "") {
    const field = this._getField(fieldName);
    if (!field || field.type !== "select") {
      return false;
    }

    const all = this._readAll();
    if (!all[entityType]) all[entityType] = {};
    if (!all[entityType][entityName]) all[entityType][entityName] = {};
    all[entityType][entityName][fieldName] = optionsArray;
    return this._writeAll(all);
  },

  // Get default options from schema
  getDefaultOptions(fieldName) {
    const field = this._getField(fieldName);
    return field && field.type === "select" ? field.options : [];
  },

  // Reset options to defaults
  resetOptions(fieldName, entityType = "", entityName = "") {
    const field = this._getField(fieldName);
    if (!field) return false;

    const all = this._readAll();
    const fields = all?.[entityType]?.[entityName];
    if (!fields || !(fieldName in fields)) return true;
    delete fields[fieldName];
    if (Object.keys(fields).length === 0) {
      delete all[entityType][entityName];
      if (Object.keys(all[entityType]).length === 0) {
        delete all[entityType];
      }
    }
    return this._writeAll(all);
  },

  // Rename an entity in the options store (e.g., camera renamed from oldName to newName)
  renameEntityKeys(entityType, oldName, newName) {
    const all = this._readAll();
    const bucket = all[entityType];
    if (!bucket || !(oldName in bucket)) return;
    bucket[newName] = bucket[oldName];
    delete bucket[oldName];
    this._writeAll(all);
  },

  // Drop all stored options for a deleted entity.
  deleteEntity(entityType, entityName) {
    const all = this._readAll();
    const bucket = all[entityType];
    if (!bucket || !(entityName in bucket)) return;
    delete bucket[entityName];
    if (Object.keys(bucket).length === 0) {
      delete all[entityType];
    }
    this._writeAll(all);
  },
};
