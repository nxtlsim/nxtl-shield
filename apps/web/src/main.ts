import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono/500.css";
import "./styles.css";
import { h } from "./dom";
import { createIcon, type IconName } from "./icons";
import {
  pageAdBlocker,
  pageCheck,
  pageClean,
  pageConnection,
  pageEsim,
  pageExtension,
  pageHome,
  pageInstall,
  pageLocation,
  pagePassword,
  pagePhoneProtection,
  pageSettings,
  pageSetup,
  pageStatus,
} from "./pages";
import { pageShare } from "./share-page";

const DESKTOP_NAV = [
  ["", "Home"],
  ["check", "Check"],
  ["share", "Share"],
  ["ad-blocker", "Ad Blocker"],
  ["phone-protection", "Phone"],
  ["extension", "Extension"],
  ["setup", "Safe DNS"],
  ["password", "Password"],
];

const ALL_NAV = [
  ["", "Home", "shield"],
  ["check", "Check", "search"],
  ["share", "Secure Share", "share-lock"],
  ["ad-blocker", "Ad Blocker", "ad-block"],
  ["phone-protection", "Protect Phone", "phone"],
  ["extension", "Browser Extension", "extension"],
  ["setup", "Safe DNS Setup", "dns"],
  ["clean", "Link Cleaner", "clean"],
  ["password", "Password Tools", "password"],
  ["connection", "Connection Doctor", "connection"],
  ["location", "Location Privacy", "location"],
  ["esim", "NXTL eSIM", "esim"],
  ["status", "Capability Status", "info"],
  ["install", "Install App", "install"],
  ["settings", "Reports", "file"],
] as const;

const app = document.querySelector("#app");
if (!app) throw new Error("missing app");

const offline = h("p", { class: "banner", "data-testid": "offline-banner", role: "status" }, [
  createIcon("alert", 16),
  " You are offline. Saved pages and list snapshots can still open. New online lookups will fail.",
]);
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
        h("img", {
          class: "logo-dark",
          src: `${import.meta.env.BASE_URL}brand/nxtl-esim-lockup-dark.png`,
          alt: "NXTL eSIM",
        }),
        h("img", {
          class: "logo-light",
          src: `${import.meta.env.BASE_URL}brand/nxtl-esim-lockup-light.png`,
          alt: "NXTL eSIM",
        }),
        h("span", { class: "brand-badge" }, ["Shield"]),
      ]),
      desktopNav(path),
      h("span", { class: "grow" }),
      themeControl(),
      h("a", { class: "btn primary btn-sm", href: "#/install" }, [
        createIcon("install", 16),
        "Install",
      ]),
      menuButton(path),
    ]),
  ]);

  const main = h("main", { id: "content", class: "wrap" });
  const page = await pageFor(path, tab);
  main.append(offline, page);

  const bottomNav = mobileBottomNav(path);

  const footer = h("footer", { class: "site" }, [
    h("div", { class: "wrap" }, [
      h("p", {}, [
        "Free, open-source security tools by NXTL eSIM. Not a VPN. NXTL eSIM is an optional paid connection and does not unlock these tools.",
      ]),
      h("p", {}, [
        h("a", { href: "https://github.com/nxtlsim/nxtl-shield", target: "_blank", rel: "noreferrer" }, ["Source Code (GPLv3)"]),
        " · ",
        h("a", { href: "#/status" }, ["Capability status"]),
        " · ",
        h("a", { href: "#/setup" }, ["Safe DNS"]),
        " · ",
        h("a", { href: "#/settings" }, ["Reports"]),
      ]),
    ]),
  ]);

  app?.replaceChildren(header, main, bottomNav, footer);
}

function themeControl() {
  const current = localStorage.getItem("nxtl-shield-theme") || "system";
  const icon = createIcon(current === "dark" ? "moon" : current === "light" ? "sun" : "auto", 16);

  const wrap = h("div", { class: "theme-picker-wrap" }, [icon]);

  const select = h("select", {
    "data-testid": "theme-toggle",
    "aria-label": "Theme",
  });

  for (const [value, label] of [
    ["system", "System"],
    ["dark", "Dark"],
    ["light", "Light"],
  ]) {
    const opt = h("option", { value }, [label]);
    if (current === value) opt.setAttribute("selected", "selected");
    select.append(opt);
  }

  select.addEventListener("change", () => {
    const val = (select as HTMLSelectElement).value;
    applyTheme(val);
    const newIcon = createIcon(val === "dark" ? "moon" : val === "light" ? "sun" : "auto", 16);
    wrap.firstElementChild?.replaceWith(newIcon);
  });

  wrap.append(select);
  return wrap;
}

function desktopNav(currentPath: string) {
  const el = h("nav", { class: "nav-inline", "aria-label": "Primary Navigation" });
  for (const [id, label] of DESKTOP_NAV) {
    const href = id ? `#/${id}` : "#/";
    const anchor = h("a", { href }, [label]);
    if (currentPath === id) anchor.setAttribute("aria-current", "page");
    el.append(anchor);
  }

  const moreBtn = h("button", {
    type: "button",
    class: "btn ghost btn-sm",
    style: "min-height: 40px; padding: 0 10px;",
    "aria-haspopup": "dialog",
  }, [
    "More",
    createIcon("chevron-down", 14),
  ]);

  moreBtn.addEventListener("click", () => openFullNavDialog(currentPath));
  el.append(moreBtn);

  return el;
}

function mobileBottomNav(currentPath: string) {
  const nav = h("nav", { class: "bottom-nav", "aria-label": "Mobile Bottom Navigation" });
  const inner = h("div", { class: "bottom-nav-inner" });

  const tabs: Array<{ id: string; label: string; icon: IconName }> = [
    { id: "", label: "Home", icon: "shield" },
    { id: "check", label: "Check", icon: "search" },
    { id: "share", label: "Share", icon: "share-lock" },
    { id: "phone-protection", label: "Protect", icon: "phone" },
  ];

  for (const tab of tabs) {
    const isCurrent = currentPath === tab.id;
    const item = h("a", {
      class: "bottom-tab",
      href: tab.id ? `#/${tab.id}` : "#/",
      "aria-current": isCurrent ? "page" : "false",
    }, [
      h("span", { class: "bottom-tab-icon" }, [createIcon(tab.icon, 20)]),
      tab.label,
    ]);
    inner.append(item);
  }

  const moreTab = h("button", {
    type: "button",
    class: "bottom-tab",
    style: "background: transparent; border: 0;",
  }, [
    h("span", { class: "bottom-tab-icon" }, [createIcon("menu", 20)]),
    "More",
  ]);
  moreTab.addEventListener("click", () => openFullNavDialog(currentPath));
  inner.append(moreTab);

  nav.append(inner);
  return nav;
}

function menuButton(path: string) {
  const button = h("button", {
    class: "menu-btn btn ghost sm",
    type: "button",
    "aria-label": "Open Menu",
    "aria-haspopup": "dialog",
  }, [
    createIcon("menu", 20),
  ]);
  button.addEventListener("click", () => openFullNavDialog(path));
  return button;
}

function openFullNavDialog(currentPath: string) {
  const dialog = h("dialog", {});
  const header = h("div", { class: "dialog-header" }, [
    h("h2", { style: "margin: 0; font-size: 1.25rem;" }, ["All Protections & Tools"]),
    h("button", { type: "button", class: "btn sm ghost", "aria-label": "Close" }, [
      createIcon("close", 18),
      "Close",
    ]),
  ]);

  header.querySelector("button")?.addEventListener("click", () => dialog.close());

  const navList = h("nav", { style: "display: grid; gap: 4px; max-height: 65vh; overflow-y: auto;" });
  for (const [id, label, icon] of ALL_NAV) {
    const href = id ? `#/${id}` : "#/";
    const anchor = h("a", { class: "navlink", href }, [
      createIcon(icon as IconName, 20),
      label,
    ]);
    if (currentPath === id) anchor.setAttribute("aria-current", "page");
    navList.append(anchor);
  }

  dialog.append(header, navList);
  dialog.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).tagName === "A") dialog.close();
  });

  document.body.append(dialog);
  dialog.showModal();
  dialog.addEventListener("close", () => dialog.remove());
}

async function pageFor(path: string, tab: string) {
  switch (path) {
    case "ad-blocker":
      return pageAdBlocker();
    case "phone-protection":
      return pagePhoneProtection();
    case "extension":
      return pageExtension();
    case "check":
      return pageCheck(tab);
    case "share":
      return pageShare();
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
