import { h } from "./dom";

/**
 * Creates a clean 3-step explainer diagram using inline SVG with square/line styling.
 */
export function createExplainerDiagram(steps: { label: string; iconSvg: string }[]): HTMLElement {
  const container = h("div", {
    class: "explainer-diagram",
    "aria-hidden": "true",
  });

  const svgParts: string[] = [];
  const width = 360;
  const height = 72;
  const stepWidth = 80;
  const spacing = (width - steps.length * stepWidth) / (steps.length - 1);

  steps.forEach((step, index) => {
    const x = index * (stepWidth + spacing);
    const centerX = x + stepWidth / 2;

    // Arrow to next step
    if (index < steps.length - 1) {
      const arrowStart = x + stepWidth + 6;
      const arrowEnd = arrowStart + spacing - 12;
      svgParts.push(`
        <g class="diagram-arrow" style="animation-delay: ${index * 150}ms">
          <line x1="${arrowStart}" y1="24" x2="${arrowEnd}" y2="24" stroke="var(--line-strong)" stroke-width="1.5" stroke-dasharray="3 3"/>
          <polyline points="${arrowEnd - 4},20 ${arrowEnd},24 ${arrowEnd - 4},28" fill="none" stroke="var(--line-strong)" stroke-width="1.5"/>
        </g>
      `);
    }

    // Step node
    svgParts.push(`
      <g class="diagram-node" style="animation-delay: ${index * 150}ms">
        <rect x="${x + 16}" y="4" width="48" height="40" rx="2" fill="var(--card)" stroke="var(--line)" stroke-width="1.5"/>
        <g transform="translate(${x + 28}, 14)">
          ${step.iconSvg}
        </g>
        <text x="${centerX}" y="60" text-anchor="middle" font-size="11" font-family="Inter, sans-serif" font-weight="500" fill="var(--muted)">${step.label}</text>
      </g>
    `);
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" style="max-width: 440px; margin: 0 auto; display: block;">
      ${svgParts.join("")}
    </svg>
  `;

  return container;
}

export function diagramCheck(): HTMLElement {
  return createExplainerDiagram([
    {
      label: "Link / SMS",
      iconSvg: '<path d="M2 4h18v14H2z" stroke="var(--muted)" stroke-width="1.5"/><path d="M2 4l9 7 9-7" stroke="var(--muted)" stroke-width="1.5"/>',
    },
    {
      label: "Inspect",
      iconSvg: '<circle cx="9" cy="9" r="6" stroke="var(--accent-coral)" stroke-width="1.5"/><path d="M14 14l5 5" stroke="var(--accent-coral)" stroke-width="1.5"/>',
    },
    {
      label: "Verdict",
      iconSvg: '<path d="M10 2L2 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-4z" stroke="var(--good)" stroke-width="1.5"/><path d="M6 11l3 3 5-5" stroke="var(--good)" stroke-width="1.5"/>',
    },
  ]);
}

export function diagramShare(): HTMLElement {
  return createExplainerDiagram([
    {
      label: "Text or file",
      iconSvg: '<path d="M3 3h12l4 4v14H3z" stroke="var(--muted)" stroke-width="1.5"/><path d="M6 9h7M6 13h7M6 17h4" stroke="var(--muted)" stroke-width="1.5"/>',
    },
    {
      label: "Encrypt",
      iconSvg: '<rect x="3" y="8" width="16" height="12" rx="2" stroke="var(--accent-coral)" stroke-width="1.5"/><path d="M6 8V5a5 5 0 0 1 10 0v3" stroke="var(--accent-coral)" stroke-width="1.5"/>',
    },
    {
      label: "Safe link",
      iconSvg: '<path d="M8 12h8M12 8l4 4-4 4" stroke="var(--good)" stroke-width="1.5"/><circle cx="12" cy="12" r="9" stroke="var(--good)" stroke-width="1.5"/>',
    },
  ]);
}

export function diagramDns(): HTMLElement {
  return createExplainerDiagram([
    {
      label: "Device",
      iconSvg: '<rect x="4" y="2" width="14" height="20" rx="2" stroke="var(--muted)" stroke-width="1.5"/><circle cx="11" cy="18" r="1" fill="var(--muted)"/>',
    },
    {
      label: "Safe DNS",
      iconSvg: '<path d="M11 2L3 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-4z" stroke="var(--accent-coral)" stroke-width="1.5"/>',
    },
    {
      label: "Blocked",
      iconSvg: '<circle cx="11" cy="11" r="8" stroke="var(--danger)" stroke-width="1.5"/><path d="M6 6l10 10" stroke="var(--danger)" stroke-width="1.5"/>',
    },
  ]);
}

export function diagramConnection(): HTMLElement {
  return createExplainerDiagram([
    {
      label: "Network",
      iconSvg: '<circle cx="11" cy="11" r="9" stroke="var(--muted)" stroke-width="1.5"/><ellipse cx="11" cy="11" rx="4" ry="9" stroke="var(--muted)" stroke-width="1.5"/><line x1="2" y1="11" x2="20" y2="11" stroke="var(--muted)" stroke-width="1.5"/>',
    },
    {
      label: "Lookup",
      iconSvg: '<rect x="2" y="4" width="18" height="14" rx="2" stroke="var(--accent-coral)" stroke-width="1.5"/><path d="M6 10h5M6 13h8" stroke="var(--accent-coral)" stroke-width="1.5"/>',
    },
    {
      label: "Your info",
      iconSvg: '<path d="M11 2L3 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-4z" stroke="var(--good)" stroke-width="1.5"/>',
    },
  ]);
}

export function diagramPassword(): HTMLElement {
  return createExplainerDiagram([
    {
      label: "Generator",
      iconSvg: '<rect x="3" y="3" width="16" height="16" rx="2" stroke="var(--muted)" stroke-width="1.5"/><circle cx="8" cy="8" r="1.5" fill="var(--muted)"/><circle cx="14" cy="14" r="1.5" fill="var(--muted)"/>',
    },
    {
      label: "Leak test",
      iconSvg: '<circle cx="9" cy="9" r="6" stroke="var(--accent-coral)" stroke-width="1.5"/><path d="M14 14l5 5" stroke="var(--accent-coral)" stroke-width="1.5"/>',
    },
    {
      label: "Strong pass",
      iconSvg: '<rect x="3" y="8" width="16" height="12" rx="2" stroke="var(--good)" stroke-width="1.5"/><path d="M7 8V5a4 4 0 0 1 8 0v3" stroke="var(--good)" stroke-width="1.5"/>',
    },
  ]);
}
