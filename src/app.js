// ============================================================================
// APP INITIALIZATION - Main entry point for application
// ============================================================================

document.addEventListener("DOMContentLoaded", function () {
  // Initialize modules
  Modal.init();
  ConfirmDialog.init();
  OptionsDialog.init();
  CameraSelector.init();
  FilmSelector.init();

  // Render initial table
  TableRenderer.render();

  // Attach event listeners
  document
    .getElementById("exportBtn")
    .addEventListener("click", () => Export.exportToJSON());
  document
    .getElementById("settingsBtn")
    .addEventListener("click", () => OptionsDialog.open());
  document.getElementById("clearBtn").addEventListener("click", () => {
    if (
      confirm(
        "Are you sure you want to delete all data? This cannot be undone.",
      )
    ) {
      DataModel.clearData();
      TableRenderer.render();
    }
  });

  // Modal form submission
  document
    .getElementById("modalForm")
    .addEventListener("submit", (e) => ModalFlows.submitForm(e));

  // Modal cancel button
  document.querySelectorAll(".cancel-btn").forEach((btn) => {
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
