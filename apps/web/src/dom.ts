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
  const isClean = result.verdict === "clean" || result.verdict === "no_match" || result.verdict === "ok" || result.verdict === "no_known_match";

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
      createIcon(iconName, 18),
      isMalicious ? "Dangerous match" : isSuspicious ? "Suspicious indicators" : isClean ? "No known threats" : "Inconclusive",
    ]),
    result.inputRedacted ? h("span", { class: "mono muted-soft" }, [result.inputRedacted]) : "",
  ]);

  const title = h("h2", {}, [result.summary]);

  const desc = result.uncertainty ? h("p", { class: "muted" }, [result.uncertainty]) : "";

  const list = h("div", { class: "evidence" });
  for (const item of result.evidence.slice(0, 3)) {
    // Clean any technical list names from title or detail
    const cleanTitle = item.title.replace(/HaGeZi|TIF|uAssets/gi, "Threat list");
    const cleanDetail = item.detail.replace(/HaGeZi|TIF|uAssets/gi, "threat database");
    list.append(
      h("article", {}, [
        h("h3", {}, [cleanTitle]),
        h("p", { class: "muted" }, [cleanDetail]),
      ]),
    );
  }

  // Clear action verbs based on verdict
  const actions = h("div", { class: "result-action-box" });
  const clearBtn = h("button", { class: "btn sm", type: "button" }, [
    createIcon("refresh", 16),
    "Check another",
  ]);
  clearBtn.addEventListener("click", () => {
    const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>('[data-testid="check-input"]');
    if (input) {
      input.value = "";
      input.focus();
    }
    card.remove();
  });

  if (isMalicious) {
    const dangerNotice = h("p", { style: "color: var(--danger); font-weight: 700; margin: 0; width: 100%;" }, [
      "Dangerous destination. Do not open this link or submit personal information.",
    ]);
    const blockBtn = h("button", { class: "primary sm", type: "button", disabled: "true" }, [
      createIcon("close", 16),
      "Don't open (unsafe)",
    ]);
    actions.append(dangerNotice, blockBtn, clearBtn);
  } else if (isSuspicious) {
    const warnNotice = h("p", { style: "color: var(--warn); font-weight: 600; margin: 0; width: 100%;" }, [
      "Suspicious patterns detected. Verify the sender before opening.",
    ]);
    actions.append(warnNotice, clearBtn);
  } else {
    const safeNotice = h("p", { style: "color: var(--good); font-weight: 600; margin: 0; width: 100%;" }, [
      "Not found on known scam, phishing, or malware databases.",
    ]);
    actions.append(safeNotice, clearBtn);
  }

  card.append(header, title, desc, list, actions);
  return card;
}

export function introBlock(options: {
  what: string;
  when?: string;
  howSteps: string[];
  limit?: string | string[];
  limits?: string | string[];
  howItWorks?: string;
}): HTMLElement {
  const block = h("section", { class: "tool-intro", "aria-label": "Tool Guide" }, [
    h("p", { class: "lede", style: "margin-bottom: var(--sp-4);" }, [options.what]),
    h("div", { class: "tool-intro-section", style: "margin-bottom: var(--sp-3);" }, [
      h("div", { class: "tool-intro-title" }, [createIcon("check", 18), "How to use it"]),
      h("ol", { class: "numbered-steps" }, options.howSteps.map((step) => h("li", {}, [step]))),
    ]),
  ]);

  const lim = options.limit ?? options.limits;
  if (lim) {
    const text = Array.isArray(lim) ? lim.join(" ") : lim;
    const limitRow = h("p", { class: "muted-soft", style: "font-size: 0.9rem; margin-top: var(--sp-3); border-top: 1px solid var(--line); padding-top: var(--sp-2);" }, [
      createIcon("info", 14),
      " ",
      text,
    ]);
    block.append(limitRow);
  }

  if (options.howItWorks) {
    const details = h("details", { style: "margin-top: var(--sp-3); font-size: 0.9rem; color: var(--muted);" }, [
      h("summary", { style: "cursor: pointer; font-weight: 600;" }, ["How it works & technical details"]),
      h("p", { style: "margin-top: var(--sp-2);" }, [options.howItWorks]),
    ]);
    block.append(details);
  }

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
