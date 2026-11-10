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
  id?: string;
  title: string;
  detail: string;
  severity: string;
}

export interface CheckResultData {
  verdict: string;
  summary: string;
  uncertainty?: string;
  scope?: string;
  timestamp?: string;
  evidence: ResultEvidence[];
  staleLists?: boolean;
  inputRedacted?: string;
  level?: "scam" | "careful" | "safe";
  actionAdvice?: string;
  isText?: boolean;
}

export function resultCard(result: CheckResultData): HTMLElement {
  let level: "scam" | "careful" | "safe" = "safe";
  if (result.level) {
    level = result.level;
  } else if (result.verdict === "known_malicious_match") {
    level = "scam";
  } else if (result.verdict === "suspicious_indicators") {
    const isStrong = result.evidence.some((e) =>
      e.id && (
        ["prize", "parcel-fee", "tax-refund", "crypto-scam", "credential-ask", "family-impersonation", "urgency-link", "misleading-host", "userinfo"].includes(e.id) ||
        e.id.startsWith("brand-lookalike")
      )
    );
    level = isStrong ? "scam" : "careful";
  } else if (result.verdict === "no_known_match" || result.verdict === "clean" || result.verdict === "ok") {
    level = "safe";
  } else {
    level = "careful";
  }

  const isScam = level === "scam";
  const isCareful = level === "careful";
  const isSafe = level === "safe";

  const cardVariant = isScam ? "danger" : isCareful ? "warning" : "ok";
  const pillVariant = isScam ? "match" : isCareful ? "indicator" : "ok";
  const iconName: IconName = isScam ? "alert" : isCareful ? "shield-alert" : "shield-check";
  const pillLabel = isScam ? "Likely scam" : isCareful ? "Be careful" : "Looks safe";

  const card = h("section", {
    class: `card result-card ${cardVariant} result-reveal`,
    "data-testid": "verdict",
    "aria-live": "polite",
  });

  const header = h("div", { class: "result-header" }, [
    h("span", { class: `pill ${pillVariant}` }, [
      createIcon(iconName, 18),
      pillLabel,
    ]),
  ]);

  const quoteBlock = result.inputRedacted
    ? h("div", { class: "result-quote mono" }, [result.inputRedacted])
    : null;

  let cleanSummary = result.summary
    .replace(/HaGeZi|TIF|uAssets|bundled threat host list|bundled badware-risk host list/gi, "known threat lists")
    .replace(/That is not proof the message is genuine\./gi, "")
    .trim();

  if (
    cleanSummary === "Likely scam message: contains common fraud patterns." ||
    (isScam && result.isText)
  ) {
    cleanSummary = "This looks like a scam.";
  } else if (
    cleanSummary === "Known dangerous link found in this message." ||
    cleanSummary === "This address is on a known dangerous list." ||
    cleanSummary === "Deceptive address: contains misleading or disguised characters." ||
    (isScam && !result.isText)
  ) {
    cleanSummary = "This looks like a dangerous link.";
  } else if (
    cleanSummary === "Be careful: contains shortened links or unusual indicators." ||
    cleanSummary === "Be careful: contains shortened or unusual address patterns." ||
    isCareful
  ) {
    cleanSummary = "Be careful with this.";
  } else if (
    cleanSummary === "No scam indicators or known dangerous links found in this message." ||
    cleanSummary === "No known dangerous or misleading signs were found in this address." ||
    isSafe
  ) {
    cleanSummary = "No known dangerous signs were found.";
  }

  const title = h("h2", {}, [cleanSummary]);

  let adviceText = result.actionAdvice;
  if (!adviceText) {
    if (isScam) {
      adviceText = result.isText
        ? "Don't reply and don't pay. Real lotteries and inheritances never ask for fees or bank details by text."
        : "Don't open this link or enter any details.";
    } else if (isCareful) {
      adviceText = "Be careful before interacting with this.";
    }
  }

  const desc = isSafe
    ? h("p", { class: "muted-soft", style: "font-size: 0.9rem;" }, ["A brand-new trick might not be on the list yet."])
    : adviceText
      ? h("p", { class: "muted", style: "font-weight: 500;" }, [adviceText])
      : "";

  const filteredEvidence = result.evidence
    .filter((item) => item.id !== "authenticity" && item.severity !== "info")
    .slice(0, 3);

  const list = h("div", { class: "evidence" });
  if (filteredEvidence.length) {
    const listHeader = h("h3", { style: "font-size: 0.95rem; margin-top: var(--sp-3); margin-bottom: var(--sp-2);" }, ["What we noticed:"]);
    list.append(listHeader);
    for (const item of filteredEvidence) {
      const cleanTitle = item.title
        .replace(/HaGeZi|TIF|uAssets/gi, "Threat list")
        .replace(/Link: Threat-list match/gi, "Known dangerous link");
      const cleanDetail = item.detail
        .replace(/HaGeZi|TIF|uAssets|mini/gi, "threat list")
        .replace(/\(retrieved [^)]+\)/gi, "")
        .replace(/This is a list match, not a courtroom finding\./gi, "")
        .replace(/Pasted text cannot prove who wrote it\./gi, "")
        .trim();
      list.append(
        h("article", {}, [
          h("h4", { style: "font-size: 0.95rem; margin: 0 0 2px;" }, [cleanTitle]),
          h("p", { class: "muted" }, [cleanDetail]),
        ]),
      );
    }
  }

  const actions = h("div", { class: "result-action-box" });
  const clearBtn = h("button", { class: "btn", type: "button" }, [
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
  actions.append(clearBtn);

  card.append(header, ...(quoteBlock ? [quoteBlock] : []), title, desc, list, actions);
  return card;
}

export function introBlock(options: {
  what: string;
  when?: string | string[];
  howSteps: string[];
  limit?: string | string[];
  limits?: string | string[];
  howItWorks?: string;
}): HTMLElement {
  const block = h("section", { class: "tool-intro", "aria-label": "Tool Guide" }, [
    h("p", { class: "lede", style: "margin-bottom: var(--sp-4);" }, [options.what]),
  ]);

  if (options.when) {
    const whenItems = Array.isArray(options.when) ? options.when : [options.when];
    const whenSection = h("div", { class: "tool-intro-section", style: "margin-bottom: var(--sp-3);" }, [
      h("div", { class: "tool-intro-title" }, [createIcon("info", 18), "When to use it"]),
      h("ul", { style: "line-height: 1.6; margin: 0; padding-left: var(--sp-4);" }, whenItems.map((item) => h("li", {}, [item]))),
    ]);
    block.append(whenSection);
  }

  const howSection = h("div", { class: "tool-intro-section", style: "margin-bottom: var(--sp-3);" }, [
    h("div", { class: "tool-intro-title" }, [createIcon("check", 18), "How to use it"]),
    h("ol", { class: "numbered-steps" }, options.howSteps.map((step) => h("li", {}, [step]))),
  ]);
  block.append(howSection);

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
    const details = h("details", { style: "margin-top: var(--sp-4);" }, [
      h("summary", {}, ["How this works"]),
      h("p", {}, [options.howItWorks]),
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
