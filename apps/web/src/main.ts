import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/500.css";
import "./styles.css";
import { h } from "./dom";
import {
  pageCheck,
  pageClean,
  pageConnection,
  pageEsim,
  pageHome,
  pageInstall,
  pageLocation,
  pagePassword,
  pageSettings,
  pageSetup,
  pageStatus,
} from "./pages";

const NAV = [
  ["", "Home"],
  ["check", "Check"],
  ["clean", "Clean"],
  ["password", "Password"],
  ["connection", "Connection"],
  ["location", "Location"],
  ["esim", "eSIM"],
  ["setup", "Setup"],
  ["status", "Status"],
  ["install", "Install"],
  ["settings", "Reports"],
];

const app = document.querySelector("#app");
if (!app) throw new Error("missing app");

const offline = h("p", { class: "banner", "data-testid": "offline-banner", role: "status" }, ["You are offline. Saved pages and list snapshots can still open. New lookups will fail."]);
offline.hidden = navigator.onLine;

function applyTheme(choice: string) {
  localStorage.setItem("nxtl-shield-theme", choice);
  const dark = choice === "dark" || (choice !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme-choice", choice);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0A0C12" : "#F4F5F7");
}

function route() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, query] = raw.split("?");
  const params = new URLSearchParams(query ?? "");
  return { path: path || "", tab: params.get("tab") || "link" };
}

async function render() {
  const { path, tab } = route();
  const header = h("header", { class: "top" }, [
    h("div", { class: "wrap bar" }, [
      h("a", { class: "brand", href: "#/" }, [
        h("img", { class: "logo-dark", src: `${import.meta.env.BASE_URL}brand/nxtl-esim-lockup-dark.png`, alt: "NXTL eSIM" }),
        h("img", { class: "logo-light", src: `${import.meta.env.BASE_URL}brand/nxtl-esim-lockup-light.png`, alt: "" }),
        h("strong", {}, ["Shield"]),
      ]),
      nav(path, "nav-inline"),
      h("span", { class: "grow" }),
      themeSelect(),
      h("a", { class: "btn primary", href: "#/install" }, ["Install"]),
      menuButton(path),
    ]),
  ]);
  const main = h("main", { id: "content", class: "wrap" });
  const page = await pageFor(path, tab);
  main.append(offline, page);
  const footer = h("footer", { class: "site" }, [
    h("div", { class: "wrap" }, [
      h("p", {}, ["Free, open-source security tools by NXTL eSIM. Not a VPN. NXTL eSIM is an optional paid connection and does not unlock these tools."]),
      h("p", {}, [
        h("a", { href: "https://github.com/nxtlsim/nxtl-shield" }, ["Source"]),
        " · ",
        h("a", { href: "#/status" }, ["Capability status"]),
        " · ",
        h("a", { href: "#/settings" }, ["Reports"]),
      ]),
    ]),
  ]);
  app?.replaceChildren(header, main, footer);
}

function themeSelect() {
  const select = h("select", { "data-testid": "theme-toggle", "aria-label": "Theme" });
  for (const [value, label] of [
    ["system", "Theme: system"],
    ["dark", "Theme: dark"],
    ["light", "Theme: light"],
  ]) {
    const option = h("option", { value }, [label]);
    if ((localStorage.getItem("nxtl-shield-theme") || "system") === value) option.setAttribute("selected", "selected");
    select.append(option);
  }
  select.addEventListener("change", () => applyTheme((select as HTMLSelectElement).value));
  return select;
}

function nav(path: string, className: string) {
  const el = h("nav", { class: className, "aria-label": "Primary" });
  for (const [id, label] of NAV) {
    const href = id ? `#/${id}` : "#/";
    const anchor = h("a", { href }, [label]);
    if ((path || "") === id) anchor.setAttribute("aria-current", "page");
    el.append(anchor);
  }
  return el;
}

function menuButton(path: string) {
  const button = h("button", { class: "menu-btn", type: "button", "aria-haspopup": "dialog" }, ["Menu"]);
  button.addEventListener("click", () => {
    const dialog = h("dialog", {});
    const close = h("button", { type: "button" }, ["Close"]);
    close.addEventListener("click", () => dialog.close());
    dialog.append(close, nav(path, ""));
    dialog.addEventListener("click", (event) => {
      if ((event.target as HTMLElement).tagName === "A") dialog.close();
    });
    document.body.append(dialog);
    dialog.showModal();
    dialog.addEventListener("close", () => dialog.remove());
  });
  return button;
}

async function pageFor(path: string, tab: string) {
  switch (path) {
    case "check":
      return pageCheck(tab);
    case "clean":
      return pageClean();
    case "password":
      return pagePassword();
    case "connection":
      return pageConnection();
    case "location":
      return pageLocation();
    case "esim":
      return pageEsim();
    case "setup":
      return pageSetup();
    case "status":
      return pageStatus();
    case "install":
      return pageInstall();
    case "settings":
      return pageSettings();
    default:
      return pageHome();
  }
}

window.addEventListener("hashchange", () => void render());
window.addEventListener("online", () => {
  offline.hidden = true;
});
window.addEventListener("offline", () => {
  offline.hidden = false;
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if ((localStorage.getItem("nxtl-shield-theme") || "system") === "system") applyTheme("system");
});

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
}

void render();
