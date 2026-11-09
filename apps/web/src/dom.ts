import { createIcon, type IconName } from "./icons";

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string | undefined> = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    if (key === "class") el.className = value;
    else el.setAttribute(key, value);
  }
  for (const child of children) {
    el.append(child instanceof Node ? child : document.createTextNode(child));
  }
  return el;
}

export function clear(node: ParentNode) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function field(label: string, control: HTMLElement, helper?: string): HTMLLabelElement {
  const wrap = h("label", { class: "field" }, [
    h("span", { class: "label-text" }, [
      label,
      helper ? h("span", { class: "helper" }, [helper]) : "",
    ]),
    control,
  ]);
  return wrap;
}

export interface ResultEvidence {
  title: string;
  detail: string;
  severity: string;
}

export interface CheckResultData {
  verdict: string;
  summary: string;
  uncertainty: string;
  scope: string;
  timestamp: string;
  evidence: ResultEvidence[];
  staleLists?: boolean;
  inputRedacted?: string;
}

export function resultCard(result: CheckResultData): HTMLElement {
  const isMalicious = result.verdict === "known_malicious_match";
  const isSuspicious = result.verdict === "suspicious_indicators";
  const isClean = result.verdict === "clean" || result.verdict === "no_match" || result.verdict === "ok";

  const cardVariant = isMalicious ? "danger" : isSuspicious ? "warning" : isClean ? "ok" : "info";
  const pillVariant = isMalicious ? "match" : isSuspicious ? "indicator" : isClean ? "ok" : "neutral";
  const iconName: IconName = isMalicious ? "alert" : isSuspicious ? "shield-alert" : isClean ? "shield-check" : "info";

  const card = h("section", {
    class: `card result-card ${cardVariant}`,
    "data-testid": "verdict",
    "aria-live": "polite",
  });

  const header = h("div", { class: "result-header" }, [
    h("span", { class: `pill ${pillVariant}` }, [
      createIcon(iconName, 16),
      result.verdict.replaceAll("_", " "),
    ]),
    h("span", { class: "muted-soft" }, [result.timestamp]),
  ]);

  const title = h("h2", {}, [result.summary]);

  const desc = h("p", { class: "muted" }, [
    result.uncertainty,
    result.staleLists ? " (List snapshot is past an upstream expiry hint)." : "",
  ]);

  const scope = h("p", { class: "muted-soft" }, [`Scope: ${result.scope}`]);

  const list = h("div", { class: "evidence" });
  for (const item of result.evidence) {
    list.append(
      h("article", {}, [
        h("h3", {}, [item.title]),
        h("p", { class: "muted" }, [item.detail]),
      ]),
    );
  }

  // Action verbs and clear guidance based on severity
  const actions = h("div", { class: "result-action-box" });
  if (isMalicious) {
    const warnNotice = h("p", { style: "color: var(--danger); font-weight: 700; margin: 0; width: 100%;" }, [
      "Dangerous match: Do not open, click, or enter credentials on this destination.",
    ]);
    const clearBtn = h("button", { class: "primary sm", type: "button" }, [
      createIcon("refresh", 16),
      "Check another link",
    ]);
    clearBtn.addEventListener("click", () => {
      const textarea = document.querySelector<HTMLTextAreaElement>('textarea[data-testid="check-input"]');
      if (textarea) {
        textarea.value = "";
        textarea.focus();
      }
      card.remove();
    });
    actions.append(warnNotice, clearBtn);
  } else if (isSuspicious) {
    const cautionNotice = h("p", { style: "color: var(--warn); font-weight: 600; margin: 0; width: 100%;" }, [
      "Caution: Unusual patterns or brand impersonation detected. Double-check before proceeding.",
    ]);
    const clearBtn = h("button", { class: "btn sm", type: "button" }, [
      createIcon("refresh", 16),
      "Check another",
    ]);
    clearBtn.addEventListener("click", () => {
      const textarea = document.querySelector<HTMLTextAreaElement>('textarea[data-testid="check-input"]');
      if (textarea) {
        textarea.value = "";
        textarea.focus();
      }
      card.remove();
    });
    actions.append(cautionNotice, clearBtn);
  } else {
    const safeNotice = h("p", { style: "color: var(--good); font-weight: 600; margin: 0; width: 100%;" }, [
      "No threat matches found in the bundled security snapshots.",
    ]);
    actions.append(safeNotice);
  }

  card.append(header, title, desc, scope, list, actions);
  return card;
}

export function introBlock(options: {
  what: string;
  when: string;
  howSteps: string[];
  limits: string[];
}): HTMLElement {
  const block = h("section", { class: "tool-intro", "aria-label": "Tool Guide" }, [
    h("h2", {}, ["About this tool"]),
    h("p", { class: "muted" }, [options.what]),
    h("div", { class: "tool-intro-grid" }, [
      h("div", { class: "tool-intro-section" }, [
        h("div", { class: "tool-intro-title" }, [createIcon("info", 18), "When to use it"]),
        h("p", { class: "muted" }, [options.when]),
      ]),
      h("div", { class: "tool-intro-section" }, [
        h("div", { class: "tool-intro-title" }, [createIcon("check", 18), "How to use it"]),
        h("ol", { class: "numbered-steps" }, options.howSteps.map((step) => h("li", {}, [step]))),
      ]),
    ]),
    h("div", { style: "margin-top: var(--sp-4); border-top: 1px solid var(--line); padding-top: var(--sp-3);" }, [
      h("div", { class: "tool-intro-title" }, [createIcon("shield", 18), "What it can and cannot do"]),
      h("ul", { class: "numbered-steps" }, options.limits.map((limit) => h("li", {}, [limit]))),
    ]),
  ]);
  return block;
}

export function faqSection(faqs: { q: string; a: string }[]): HTMLElement {
  const container = h("section", { class: "faq-section", "aria-label": "Frequently asked questions" }, [
    h("h2", {}, ["Frequently asked questions"]),
  ]);
  for (const item of faqs) {
    const details = h("details", {}, [
      h("summary", {}, [item.q]),
      h("p", {}, [item.a]),
    ]);
    container.append(details);
  }
  return container;
}

export function emptyState(options: {
  iconName: IconName;
  title: string;
  description: string;
  example?: string;
}): HTMLElement {
  const wrap = h("div", { style: "text-align: center; padding: var(--sp-6) var(--sp-4); color: var(--muted);" }, [
    h("div", { class: "tile-icon", style: "margin: 0 auto var(--sp-3); width: 56px; height: 56px;" }, [
      createIcon(options.iconName, 28),
    ]),
    h("h3", { style: "font-size: 1.15rem; margin-bottom: var(--sp-2); color: var(--text);" }, [options.title]),
    h("p", { style: "max-width: 48ch; margin: 0 auto var(--sp-3);" }, [options.description]),
    options.example ? h("p", { class: "mono muted-soft" }, [`Example: ${options.example}`]) : "",
  ]);
  return wrap;
}
