// ============================================================================
// ENTITY MANAGER - Generic localStorage-backed CRUD for cameras, films, etc.
// ============================================================================

class EntityManager {
  constructor({ storageKey, counterKey, defaults }) {
    this.storageKey = storageKey;
    this.counterKey = counterKey;
    this.defaults = defaults;
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
      return;
    }

    // Merge: add any new defaults not already present by name
    const items = JSON.parse(stored);
    const existingNames = new Set(items.map((item) => item.name));
    let added = 0;
    for (const def of this.defaults) {
      if (!existingNames.has(def.name)) {
        items.push({ ...def, id: this.getNextId() });
        added++;
      }
    }
    if (added > 0) {
      this.saveAll(items);
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
}

// Singleton instances

const CameraManager = new EntityManager({
  storageKey: "cameras",
  counterKey: "camera-counter",
  defaults: DEFAULT_CAMERAS,
});

CameraManager.getHiddenFields = function (cameraName) {
  if (!cameraName) return [];
  const camera = this.getByName(cameraName);
  return (camera && camera["hidden-fields"]) || [];
};

CameraManager.isFieldHidden = function (fieldName, cameraName) {
  return this.getHiddenFields(cameraName).includes(fieldName);
};

CameraManager.toggleHiddenField = function (fieldName, cameraName) {
  const camera = this.getByName(cameraName);
  if (!camera) return;
  const hidden = camera["hidden-fields"] || [];
  const index = hidden.indexOf(fieldName);
  if (index === -1) {
    hidden.push(fieldName);
  } else {
    hidden.splice(index, 1);
  }
  camera["hidden-fields"] = hidden;
  this.update(camera.id, camera);
};

// eslint-disable-next-line no-unused-vars
const FilmManager = new EntityManager({
  storageKey: "films",
  counterKey: "film-counter",
  defaults: DEFAULT_FILMS,
});

// Adapter to make RollManager compatible with EntityFormModal/EntitySelector
// eslint-disable-next-line no-unused-vars
const RollManagerAdapter = {
  getAll() {
    return RollManager.getRolls();
  },

  getById(id) {
    return RollManager.getRollById(id);
  },

  getByName(name) {
    return RollManager.getRolls().find((r) => r.name === name) || null;
  },

  create(data) {
    const roll = RollManager.createRoll(data.name, data.frameCount);
    const { name: _n, frameCount: _fc, ...rest } = data;
    return RollManager.updateRoll(roll.id, rest);
  },

  update(id, data) {
    const roll = RollManager.getRollById(id);
    if (!roll) return null;
    const oldName = roll.name;
    RollManager.updateRoll(id, data);
    return { item: RollManager.getRollById(id), oldName };
  },

  delete(id) {
    return RollManager.deleteRoll(id);
  },
};
