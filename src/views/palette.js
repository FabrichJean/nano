(function () {
  window.NANO_PALETTES = [
    { id: "red", label: "Rouge", swatch: "#ff5f56" },
    { id: "yellow", label: "Jaune", swatch: "#ffbd2e" },
    { id: "green", label: "Vert", swatch: "#27c93f" },
  ];

  var STORAGE_KEY = "nano-palette";
  var DEFAULT_PALETTE = "red";

  function isValidPalette(id) {
    return window.NANO_PALETTES.some(function (p) { return p.id === id; });
  }

  window.getPalette = function () {
    var stored = localStorage.getItem(STORAGE_KEY);
    return isValidPalette(stored) ? stored : DEFAULT_PALETTE;
  };

  window.setPalette = function (id) {
    if (!isValidPalette(id)) return;
    localStorage.setItem(STORAGE_KEY, id);
    document.documentElement.setAttribute("data-palette", id);
    document.querySelectorAll("[data-palette-option]").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.paletteOption === id);
    });
  };

  // Applique la palette mémorisée le plus tôt possible pour éviter un flash.
  document.documentElement.setAttribute("data-palette", window.getPalette());

  // Construit le sélecteur : 3 pastilles, façon feux de fenêtre macOS.
  window.renderPaletteSwitch = function () {
    var slot = document.getElementById("palette-switch-slot");
    if (!slot) return;
    var current = window.getPalette();
    slot.innerHTML =
      '<div class="ui-palette-switch">' +
      window.NANO_PALETTES.map(function (p) {
        return '<button type="button" class="ui-palette-swatch' + (p.id === current ? " active" : "") +
          '" data-palette-option="' + p.id + '" style="background:' + p.swatch + '" title="' + p.label + '"></button>';
      }).join("") +
      "</div>";
    slot.querySelectorAll("[data-palette-option]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.setPalette(btn.dataset.paletteOption);
      });
    });
  };
})();
