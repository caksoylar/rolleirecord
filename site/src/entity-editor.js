// ============================================================================
// ENTITY EDITOR PAGE - Standalone editor for cameras / films
// ============================================================================
// URL parameter `?type=camera|film` selects the entity type.
//
// Shows two sections per selected entity:
//  1. Properties: fields from the entity schema (single-value edit modal).
//  2. Frame field options: list of values for frame fields with
//     `entity_specific === <type>` (multi-option edit modal). Hideable fields
//     get an inline Enabled toggle wired to toggleHiddenField.

// Selected entity id (per type, scoped to this page session)
let currentEntityId = null;

// Read entity type from URL, default to "camera"
function getEntityType() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type") || "camera";
  return type;
}

// Read entity name from URL, default to null
function getEntityName() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get("name");
  return name;
}

// Returns the EntityManager for the current type, or null if invalid.
function getManager() {
  return EntityManagers[getEntityType()] || null;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Rolls reference cameras/films by name string. The entity type identifier
// ("camera" / "film") matches the roll field name, so we can look up
// referencing rolls directly.
function rollsReferencing(entityName) {
  return RollManager.getRolls().filter(
    (roll) => roll[getEntityType()] === entityName,
  );
}

// Cascade a name change to every roll that references the entity by its old name.
function cascadeRenameOnRolls(oldName, newName) {
  const field = getEntityType();
  RollManager.getRolls().forEach((roll) => {
    if (roll[field] === oldName) {
      RollManager.updateRoll(roll.id, { [field]: newName });
    }
  });
}

// ---------------------------------------------------------------------------
// Entity selector bar
// ---------------------------------------------------------------------------

const EntityEditorSelector = {
  containerEl: null,
  selectEl: null,
  addBtn: null,
  deleteBtn: null,

  init() {
    this.containerEl = document.getElementById("entitySelectorContainer");
    const type = getEntityType();
    this.containerEl.innerHTML = `
      <label title="Select ${capitalize(type)}">
        <svg class="icon"><use href="icons.svg#icon-${type}"></use></svg>
      </label>
      <select id="entitySelect"></select>
      <button type="button" id="addEntityBtn" title="Add new">
        <svg class="icon"><use href="icons.svg#icon-add"></use></svg>
      </button>
      <button type="button" class="danger" id="deleteEntityBtn" title="Delete">
        <svg class="icon"><use href="icons.svg#icon-delete"></use></svg>
      </button>`;

    this.selectEl = this.containerEl.querySelector("#entitySelect");
    this.addBtn = this.containerEl.querySelector("#addEntityBtn");
    this.deleteBtn = this.containerEl.querySelector("#deleteEntityBtn");

    this.selectEl.addEventListener("change", (e) => {
      currentEntityId = e.target.value;
      renderEntityEditor();
    });

    this.addBtn.addEventListener("click", () => this._addNew());
    this.deleteBtn.addEventListener("click", () => this._deleteCurrent());
  },

  render() {
    const manager = getManager();
    const items = manager.getAll();
    if (!items.some((it) => it.id === currentEntityId)) {
      currentEntityId = items[0]?.id || null;
    }
    this.selectEl.innerHTML = items
      .map(
        (item) =>
          `<option value="${item.id}" ${item.id === currentEntityId ? "selected" : ""}>${escapeHtml(item.name)}</option>`,
      )
      .join("");
    this.deleteBtn.style.display = items.length > 0 ? "" : "none";
  },

  _addNew() {
    const manager = getManager();
    const type = getEntityType();
    const name = `New ${capitalize(type)}`;
    if (manager.getByName(name)) {
      alert(`A ${type} named "${name}" already exists.`);
      return;
    }
    // Seed remaining fields with defaults (first option for selects, "" for text/number)
    const data = { name: name };
    manager.schema.fields.forEach((field) => {
      if (field.name === "name") return;
      if (field.dependent_on) {
        const parentVal = data[field.dependent_on];
        const opts =
          (field.dependent_options && field.dependent_options[parentVal]) || [];
        data[field.name] = opts[0] || "";
      } else if (field.type === "select") {
        data[field.name] =
          field.defaultValue ?? (field.options && field.options[0]) ?? "";
      } else if (field.type === "number") {
        data[field.name] = null;
      } else {
        data[field.name] = "";
      }
    });
    const created = manager.create(data);
    currentEntityId = created.id;
    renderEntityEditor();
  },

  _deleteCurrent() {
    const manager = getManager();
    const type = getEntityType();
    const entity = manager.getById(currentEntityId);
    if (!entity) return;

    if (manager.getAll().length <= 1) {
      alert(
        `Cannot delete the last ${type}. At least one ${type} is required to create rolls.`,
      );
      return;
    }

    const referencing = rollsReferencing(entity.name);
    if (referencing.length > 0) {
      const names = referencing.map((r) => `"${r.name}"`).join(", ");
      alert(
        `Cannot delete "${entity.name}":  it is used by ${referencing.length} roll(s): ${names}.\n\n` +
          `Reassign or delete those rolls first.`,
      );
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete "${entity.name}"? This cannot be undone.`,
      )
    )
      return;
    manager.delete(entity.id);
    OptionsManager.deleteEntity(type, entity.name);
    currentEntityId = null;
    renderEntityEditor();
  },
};

// ---------------------------------------------------------------------------
// Properties section (schema fields)
// ---------------------------------------------------------------------------

const PropertiesSection = {
  listEl: null,

  init() {
    this.listEl = document.getElementById("propertiesList");
    this.listEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-field]");
      if (!btn) return;
      PropertyEditModal.open(btn.dataset.field);
    });
  },

  render() {
    const manager = getManager();
    const entity = manager.getById(currentEntityId);
    if (!entity) {
      this.listEl.innerHTML = `<p class="entity-prop-empty">No ${getEntityType()} selected.</p>`;
      return;
    }
    this.listEl.innerHTML = manager.schema.fields
      .map((field) => {
        const value = entity[field.name];
        // eslint-disable-next-line eqeqeq
        const display = value === "" || value == null ? "—" : String(value);
        return `
          <button type="button" class="settings-row" data-field="${field.name}">
            <span class="row-label">
              <span class="row-title">${escapeHtml(field.label)}</span>
              <span class="row-sub">${escapeHtml(display)}</span>
            </span>
          </button>`;
      })
      .join("");
  },
};

// ---------------------------------------------------------------------------
// Property Edit Modal - single-field input (text, number, select)
// ---------------------------------------------------------------------------

const PropertyEditModal = {
  modalEl: null,
  formEl: null,
  bodyEl: null,
  titleEl: null,
  currentField: null,

  init() {
    this.modalEl = document.getElementById("propertyEditModal");
    this.formEl = document.getElementById("propertyEditForm");
    this.bodyEl = document.getElementById("propertyEditBody");
    this.titleEl = document.getElementById("propertyEditTitle");

    this.formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      this._save();
    });
    this.modalEl
      .querySelector(".cancel-btn")
      .addEventListener("click", () => this.close());
    this.modalEl.addEventListener("click", (e) => {
      if (e.target === this.modalEl) this.close();
    });
  },

  open(fieldName) {
    const manager = getManager();
    const entity = manager.getById(currentEntityId);
    if (!entity) return;
    const field = manager.schema.fields.find((f) => f.name === fieldName);
    if (!field) return;

    this.currentField = field;
    this.titleEl.textContent = `Edit ${field.label}`;
    this.bodyEl.innerHTML = this._renderInput(field, entity);
    this.modalEl.classList.add("active");
    const input = this.bodyEl.querySelector("input, select, textarea");
    if (input) input.focus();
  },

  _renderInput(field, entity) {
    const id = `property-edit-input`;
    // eslint-disable-next-line eqeqeq
    const val = entity[field.name] == null ? "" : entity[field.name];
    const required = field.required ? "required" : "";
    if (field.type === "select") {
      const options = (
        field.dependent_on
          ? field.dependent_options[entity[field.dependent_on]]
          : field.options || []
      )
        .map(
          (o) =>
            `<option value="${escapeHtml(o)}" ${o === val ? "selected" : ""}>${escapeHtml(o)}</option>`,
        )
        .join("");
      return `
        <div class="form-group">
          <label for="${id}">${escapeHtml(field.label)}</label>
          <select id="${id}" ${required}>${options}</select>
        </div>`;
    }
    const inputType = field.type === "number" ? "number" : "text";
    return `
      <div class="form-group">
        <label for="${id}">${escapeHtml(field.label)}</label>
        <input type="${inputType}" id="${id}" value="${escapeHtml(String(val))}" ${required} />
      </div>`;
  },

  _save() {
    const manager = getManager();
    const entity = manager.getById(currentEntityId);
    if (!entity || !this.currentField) return;
    const field = this.currentField;
    const input = this.bodyEl.querySelector("#property-edit-input");
    let value;
    if (field.type === "number") {
      value = input.value === "" ? null : Number(input.value);
    } else {
      value = input.value.trim();
    }
    // eslint-disable-next-line eqeqeq
    if (field.required && (value === "" || value == null)) {
      alert(`${field.label} is required`);
      return;
    }

    // Name change: rename per-entity option-store keys + warn if duplicate
    if (field.name === "name") {
      if (value !== entity.name && manager.getByName(value)) {
        alert(`A ${getEntityType()} named "${value}" already exists.`);
        return;
      }
    }

    const oldName = entity.name;
    const update = { [field.name]: value };

    // If this field is referenced as `dependent_on` by another field, reset
    // that dependent field if its current value is no longer valid.
    manager.schema.fields.forEach((other) => {
      if (other.dependent_on !== field.name) return;
      const validOpts =
        (other.dependent_options && other.dependent_options[value]) || [];
      if (!validOpts.includes(entity[other.name])) {
        update[other.name] = validOpts[0] || "";
      }
    });

    manager.update(entity.id, update);

    if (field.name === "name" && oldName !== value) {
      OptionsManager.renameEntityKeys(getEntityType(), oldName, value);
      cascadeRenameOnRolls(oldName, value);
    }

    this.close();
    renderEntityEditor();
  },

  close() {
    this.modalEl.classList.remove("active");
    this.currentField = null;
  },
};

// ---------------------------------------------------------------------------
// Frame fields section - per-entity option lists for entity_specific frame fields
// ---------------------------------------------------------------------------

const FrameFieldsSection = {
  sectionEl: null,
  listEl: null,

  init() {
    this.sectionEl = document.getElementById("frameFieldsSection");
    this.listEl = document.getElementById("frameFieldsList");

    this.listEl.addEventListener("click", (e) => {
      if (e.target.closest("input.field-enabled-toggle")) return;
      const row = e.target.closest(".settings-row[data-field]");
      if (!row) return;
      const fieldName = row.dataset.field;
      const manager = getManager();
      const entity = manager.getById(currentEntityId);
      if (!entity || manager.isFieldHidden(fieldName, entity.name)) return;
      FrameFieldOptionsModal.open(fieldName);
    });

    this.listEl.addEventListener("change", (e) => {
      const toggle = e.target.closest("input.field-enabled-toggle");
      if (!toggle) return;
      const fieldName = toggle.dataset.field;
      const manager = getManager();
      const entity = manager.getById(currentEntityId);
      if (!entity) return;
      manager.toggleHiddenField(fieldName, entity.name);
      this.render();
    });
  },

  render() {
    const manager = getManager();
    const fields = manager.getEntitySpecificFrameFields();
    const entity = manager.getById(currentEntityId);
    if (fields.length === 0 || !entity) {
      this.sectionEl.style.display = "none";
      return;
    }
    this.sectionEl.style.display = "";

    this.listEl.innerHTML = fields
      .map((field) => {
        const opts = OptionsManager.getOptions(
          field.name,
          getEntityType(),
          entity.name,
        );
        const isHidden = manager.isFieldHidden(field.name, entity.name);
        const muted = isHidden ? "settings-row--muted" : "";
        return `
          <div class="settings-row ${muted}" data-field="${field.name}">
            <span class="row-label">
              <span class="row-title">${escapeHtml(field.label)}</span>
              <span class="row-sub">${escapeHtml(opts.join(", ") || "—")}</span>
            </span>
            <input type="checkbox" class="row-checkbox field-enabled-toggle" data-field="${field.name}" ${isHidden ? "" : "checked"} title="Enabled for this ${getEntityType()}" />
          </div>`;
      })
      .join("");
  },
};

// ---------------------------------------------------------------------------
// Frame field options edit modal (multi-value list with reorder/add/remove).
// Adapted from the former FieldOptionsDialog; field is preselected by row.
// ---------------------------------------------------------------------------

const FrameFieldOptionsModal = {
  modalEl: null,
  formEl: null,
  containerEl: null,
  titleEl: null,
  currentField: null,

  init() {
    this.modalEl = document.getElementById("optionsEditModal");
    this.formEl = document.getElementById("optionsEditForm");
    this.containerEl = document.getElementById("optionsEditContainer");
    this.titleEl = document.getElementById("optionsEditTitle");

    this.formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      this._save();
    });
    this.modalEl
      .querySelector(".cancel-btn")
      .addEventListener("click", () => this.close());
    this.modalEl.addEventListener("click", (e) => {
      if (e.target === this.modalEl) this.close();
    });

    this.modalEl.querySelector(".reset-btn").addEventListener("click", () => {
      if (!confirm("Reset this list to the schema defaults?")) return;
      const defaults = OptionsManager.getDefaultOptions(this.currentField.name);
      this._renderOptions(defaults);
    });

    this.containerEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-index]");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const index = parseInt(btn.dataset.index, 10);
      if (btn.classList.contains("remove-option-btn")) {
        this._removeOption(index);
      } else if (btn.classList.contains("move-option-btn")) {
        if (btn.classList.contains("up")) this._moveOption(index, -1);
        else if (btn.classList.contains("down")) this._moveOption(index, 1);
      }
    });
  },

  open(fieldName) {
    const manager = getManager();
    const entity = manager.getById(currentEntityId);
    if (!entity) return;
    const field = manager
      .getEntitySpecificFrameFields()
      .find((f) => f.name === fieldName);
    if (!field) return;

    this.currentField = field;
    this.titleEl.textContent = `${field.label} options`;
    const current = OptionsManager.getOptions(
      field.name,
      getEntityType(),
      entity.name,
    );
    this._renderOptions(current);
    this.modalEl.classList.add("active");
  },

  _renderOptions(options) {
    this.containerEl.innerHTML =
      options
        .map((option, index) => {
          const canMoveUp = index > 0;
          const canMoveDown = index < options.length - 1;
          return `
          <div class="settings-row">
            <input type="text" class="option-input" value="${escapeHtml(option)}" data-index="${index}" />
            <div class="row-control">
              <button type="button" class="move-option-btn up" data-index="${index}" ${!canMoveUp ? "disabled" : ""} title="Move up"><svg class="icon"><use href="icons.svg#icon-up"></use></svg></button>
              <button type="button" class="move-option-btn down" data-index="${index}" ${!canMoveDown ? "disabled" : ""} title="Move down"><svg class="icon"><use href="icons.svg#icon-down"></use></svg></button>
              <button type="button" class="remove-option-btn danger" data-index="${index}" title="Remove"><svg class="icon"><use href="icons.svg#icon-delete"></use></svg></button>
            </div>
          </div>`;
        })
        .join("") +
      `
          <button type="button" id="addOptionBtn" class="settings-row">
            + Add Option
          </button>`;

    document.getElementById("addOptionBtn").addEventListener("click", (e) => {
      e.preventDefault();
      this._addOption();
    });
  },

  _collect() {
    return Array.from(this.containerEl.querySelectorAll(".option-input"))
      .map((i) => i.value.trim())
      .filter((v) => v !== "");
  },

  _removeOption(index) {
    const opts = this._collect();
    opts.splice(index, 1);
    this._renderOptions(opts);
  },

  _moveOption(index, dir) {
    const opts = this._collect();
    const target = index + dir;
    if (target < 0 || target >= opts.length) return;
    [opts[index], opts[target]] = [opts[target], opts[index]];
    this._renderOptions(opts);
  },

  _addOption() {
    const opts = this._collect();
    this._renderOptions([...opts, ""]);
    const inputs = this.containerEl.querySelectorAll(".option-input");
    inputs[inputs.length - 1]?.focus();
  },

  _save() {
    const opts = this._collect();
    if (opts.length === 0) {
      alert("At least one option is required.");
      return;
    }
    const manager = getManager();
    const entity = manager.getById(currentEntityId);
    if (!entity) return;
    OptionsManager.setOptions(
      this.currentField.name,
      opts,
      getEntityType(),
      entity.name,
    );
    this.close();
    renderEntityEditor();
  },

  close() {
    this.modalEl.classList.remove("active");
    this.currentField = null;
  },
};

// ---------------------------------------------------------------------------
// Top-level render and init
// ---------------------------------------------------------------------------

function renderEntityEditor() {
  EntityEditorSelector.render();
  PropertiesSection.render();
  FrameFieldsSection.render();
}

document.addEventListener("DOMContentLoaded", () => {
  const type = getEntityType();
  const manager = EntityManagers[type];
  if (!manager) {
    document.querySelector("main").innerHTML =
      `<p style="padding:1rem">Unknown entity type: <code>${escapeHtml(type)}</code>. Valid types: ${Object.keys(EntityManagers).join(", ")}.</p>`;
    return;
  }

  // Initialize all managers so defaults are seeded if needed
  Object.values(EntityManagers).forEach((m) => m.init());

  document.title = `Edit ${capitalize(type)}s`;
  document.getElementById("pageTitle").textContent = `${capitalize(type)}s`;

  EntityEditorSelector.init();
  PropertiesSection.init();
  FrameFieldsSection.init();
  PropertyEditModal.init();
  FrameFieldOptionsModal.init();

  currentEntityId = getManager().getByName(getEntityName())?.id;
  renderEntityEditor();
});
