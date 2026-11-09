(function () {
  try {
    var choice = localStorage.getItem("nxtl-shield-theme") || "system";
    var dark = choice === "dark" || (choice !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme-choice", choice);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0A0C12" : "#F4F5F7");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
