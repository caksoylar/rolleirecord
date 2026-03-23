// ============================================================================
// APP INITIALIZATION - Main entry point for application
// ============================================================================

document.addEventListener("DOMContentLoaded", function () {
  // Initialize RollManager first (creates default roll if needed)
  RollManager.init();

  // Initialize modules
  Modal.init();
  ConfirmDialog.init();
  OptionsDialog.init();
  CameraSelector.init();
  FilmSelector.init();
  CreateRollModal.init();
  RollSelector.init();
  RenameRollModal.init();

  // Render initial table
  TableRenderer.render();

  // Attach event listeners
  document
    .getElementById("exportBtn")
    .addEventListener("click", () => Export.exportToJSON());
  document
    .getElementById("settingsBtn")
    .addEventListener("click", () => OptionsDialog.open());
  document
    .getElementById("renameBtn")
    .addEventListener("click", () => RenameRollModal.open());
  document.getElementById("deleteRollBtn").addEventListener("click", () => {
    const currentRoll = RollManager.getCurrentRoll();
    if (!currentRoll) return;
    if (
      confirm(
        `Are you sure you want to delete the roll "${currentRoll.name}"? This cannot be undone.`,
      )
    ) {
      RollManager.deleteRoll(currentRoll.id);
      RollSelector.render();
      TableRenderer.render();
      CameraSelector.render();
      FilmSelector.render();
    }
  });
  document.getElementById("clearAllBtn").addEventListener("click", () => {
    if (
      confirm(
        `Are you sure you want to clear all storage? This cannot be undone.`,
      )
    ) {
      localStorage.clear();
      RollSelector.render();
      TableRenderer.render();
      CameraSelector.render();
      FilmSelector.render();
    }
  });

  // Modal form submission
  document
    .getElementById("modalForm")
    .addEventListener("submit", (e) => ModalFlows.submitForm(e));

  // Modal cancel button
  document.querySelectorAll("#modal .cancel-btn").forEach((btn) => {
    btn.addEventListener("click", () => Modal.close());
  });

  // Options dialog form submission
  document.getElementById("optionsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    OptionsDialog.save();
  });

  // Add option button listener
  document.getElementById("addOptionBtn").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    OptionsDialog.addOption();
  });

  // Options dialog cancel button
  document
    .querySelector("#optionsDialog .cancel-btn")
    .addEventListener("click", () => OptionsDialog.close());

  // Close options dialog when clicking outside (on dialog background)
  document.getElementById("optionsDialog").addEventListener("click", (e) => {
    if (e.target === document.getElementById("optionsDialog")) {
      OptionsDialog.close();
    }
  });

  // Confirmation dialog buttons
  document
    .getElementById("confirmYes")
    .addEventListener("click", () => ConfirmDialog.confirmDelete());
  document
    .getElementById("confirmNo")
    .addEventListener("click", () => ConfirmDialog.cancel());
  document
    .getElementById("confirmOverlay")
    .addEventListener("click", () => ConfirmDialog.cancel());

  // Close modal when clicking outside (on modal background)
  document.getElementById("modal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("modal")) {
      Modal.close();
    }
  });
});
