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
  for (const child of children) el.append(child instanceof Node ? child : document.createTextNode(child));
  return el;
}

export function clear(node: ParentNode) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function field(label: string, control: HTMLElement): HTMLLabelElement {
  const wrap = h("label", { class: "field" }, [h("span", {}, [label]), control]);
  return wrap;
}

export function resultCard(result: {
  verdict: string;
  summary: string;
  uncertainty: string;
  scope: string;
  timestamp: string;
  evidence: { title: string; detail: string; severity: string }[];
  staleLists?: boolean;
}): HTMLElement {
  const label = result.verdict.replaceAll("_", " ");
  const pillClass = result.verdict === "known_malicious_match" ? "match" : result.verdict === "suspicious_indicators" ? "indicator" : "neutral";
  const card = h("section", { class: "card", "data-testid": "verdict", "aria-live": "polite" }, [
    h("p", { class: `pill ${pillClass}` }, [label]),
    h("h2", {}, [result.summary]),
    h("p", { class: "muted" }, [result.uncertainty]),
    h("p", { class: "muted" }, [`Scope: ${result.scope}`]),
    h("p", { class: "muted" }, [`Checked ${result.timestamp}${result.staleLists ? " · list snapshot is past an upstream expiry hint" : ""}`]),
  ]);
  const list = h("div", { class: "evidence" });
  for (const item of result.evidence) {
    list.append(h("article", {}, [h("h3", {}, [item.title]), h("p", {}, [item.detail])]));
  }
  card.append(list);
  return card;
}
