export const NXTL_LINKS = {
  product: "https://nxtlsim.com/product/global-esim/",
  pricing: "https://nxtlsim.com/pricing/",
  coverage: "https://nxtlsim.com/esim-coverage/",
  destinations: "https://nxtlsim.com/esim-destinations/",
  compatibility: "https://nxtlsim.com/esim-compatible-devices/",
  setup: "https://nxtlsim.com/esim-setup/",
  account: "https://nxtlsim.com/my-account/",
  routing: "https://nxtlsim.com/global-routing/",
  privacy: "https://nxtlsim.com/privacy-policy/",
  contact: "https://nxtlsim.com/contact-us/",
  networkPreference: "https://nxtlsim.com/network-preference/",
  manualNetwork: "https://nxtlsim.com/manual-network-selection/",
  faqUsage: "https://nxtlsim.com/faq/#faq-usage-limits",
  iosApp: "https://apps.apple.com/app/id6796002935",
  androidApp: "https://play.google.com/store/apps/details?id=com.nxtlsim.mobile",
  pricingApi: "https://nxtlsim.com/wp-json/nxtl-app/v1/pricing/countries",
  compatibilityTool: "https://nxtlsim.github.io/esim-compatibility-check/",
  tripBudget: "https://nxtlsim.github.io/trip-data-budget/",
  connectionCheck: "https://nxtlsim.github.io/travel-connection-check/",
} as const;

export const ROUTING_FACTS_ACCESSED = "2026-11-09";

export function explainNxtlRouting(): {
  summary: string;
  points: string[];
  forbiddenAvoided: string[];
  sourceUrl: string;
  sourceAccessed: string;
  liveRecheck: "not_run";
  transmission: "local";
} {
  return {
    summary: "NXTL routes mobile data via a London internet exit; it is not a privacy tunnel or anonymity tool.",
    points: [
      "The current service uses London as its internet exit, without a separate routing app or a location menu.",
      "Data path published by NXTL: device, then the partner mobile network, then the London internet exit, then apps and websites. There is no separate routing profile to install.",
      "London is the internet exit, not the limit of where you can use NXTL.",
      "Websites may estimate location from the IP address. If their databases associate that exit with London or the UK, IP alone may reveal less about the country you are in. NXTL does not guarantee which country is displayed, or access to location-restricted content.",
      "Permitted device location, cookies, and signed-in accounts still identify you. The same is true on a separate encrypted-tunnel product.",
      "Switching Cheapest to Best coverage changes the network preference, not the exit city. There is no other exit and no customer location picker.",
      "NXTL does not guarantee faster speed.",
      "The privacy policy (updated June 2026) does not say whether routed traffic is logged, and its only encryption wording is “encryption in transit where supported” for personal data.",
      "NXTL eSIM is a separately charged optional connectivity service. No Shield check, block list, or setup step requires buying it.",
      "Shield cannot see whether NXTL is the active data line. A London-looking IP, a browser hint, or a successful page load is not proof. Status stays “connection not verified” unless a future authorised signal exists.",
    ],
    forbiddenAvoided: [
      "Shield does not describe this route as a connected privacy tunnel, anonymous browsing, hidden location, a no-logs network, or encryption of your traffic.",
    ],
    sourceUrl: NXTL_LINKS.routing,
    sourceAccessed: ROUTING_FACTS_ACCESSED,
    liveRecheck: "not_run",
    transmission: "local",
  };
}

export function esimCompatibilityGuidance() {
  return {
    summary: "NXTL needs an eSIM-compatible, carrier-unlocked device. Region, model number, carrier firmware, and WWAN configuration can change the answer.",
    uncertainty:
      "Shield does not decide compatibility. The device list reviewed on the NXTL site (2026-09-09, 407 devices) and the separate compatibility checker are the places to look. This page cannot read your model.",
    links: {
      checker: NXTL_LINKS.compatibilityTool,
      site: NXTL_LINKS.compatibility,
    },
    iphoneLockCheck: "Settings → General → About → Carrier Lock. “No SIM restrictions” is the unlocked state described on the NXTL compatibility page.",
    statuses: ["supported", "depends on configuration", "region", "cellular version needed", "adapter", "no eSIM"],
    sourceAccessed: "2026-11-09",
    transmission: "local" as const,
  };
}

export function esimSetupSteps() {
  return {
    alreadyHave: [
      "Turn the NXTL line on.",
      "Select NXTL for mobile data.",
      "Enable Data Roaming for the NXTL line.",
      "Check the balance.",
      "Turn Wi-Fi off briefly and open a page.",
    ],
    apn: "APN values published on the setup page: internet, plus. Change only the NXTL line's APN. Disable automatic data switching.",
    platforms: [
      { os: "iOS", steps: "Settings → Cellular / Mobile Data → choose NXTL for data → open the NXTL line → Data Roaming. On iOS 17.4 or later, touch and hold a QR code → Add eSIM." },
      { os: "Samsung", steps: "Settings → Connections → SIM manager." },
      { os: "Pixel", steps: "Network & internet → SIMs." },
      { os: "Windows", steps: "Settings → Network & internet → Cellular → eSIM profiles." },
    ],
    cannotVerify: "This guide cannot read your device settings or verify network service. The same limit applies to Shield.",
    install: "The eSIM is opened via the NXTL app or My Account. The QR code is also emailed. Shield does not install it and does not see the QR code.",
    sourceUrl: NXTL_LINKS.setup,
    sourceAccessed: "2026-11-09",
    optionalPaid: "NXTL eSIM is an optional paid connectivity service. Every Shield tool works without it.",
  };
}

export interface PricingCountry {
  country: string;
  min_eur: number;
  max_eur: number;
  min_display?: string;
  max_display?: string;
  networks?: number;
}

export interface PricingPayload {
  countries: PricingCountry[];
  total?: number;
  ledger_currency?: string;
  tier_mode?: string;
}

export interface RateResult {
  status: "ok" | "unavailable" | "not_found";
  country: string | null;
  currency: "EUR";
  unit: "per_gb";
  minEurPerGb: number | null;
  maxEurPerGb: number | null;
  minDisplay: string | null;
  maxDisplay: string | null;
  networks: number | null;
  ledgerCurrency: string | null;
  countryCount: number | null;
  retrievedAt: string | null;
  sourceUrl: string;
  note: string;
  transmission: "nxtl" | "local";
}

export function explainRates(countryQuery: string, payload: PricingPayload | null, retrievedAt: string | null, error?: string): RateResult {
  const sourceUrl = NXTL_LINKS.pricingApi;
  if (!payload) {
    return {
      status: "unavailable",
      country: countryQuery || null,
      currency: "EUR",
      unit: "per_gb",
      minEurPerGb: null,
      maxEurPerGb: null,
      minDisplay: null,
      maxDisplay: null,
      networks: null,
      ledgerCurrency: null,
      countryCount: null,
      retrievedAt,
      sourceUrl,
      note: error ?? "The NXTL pricing endpoint could not be read. No price is invented.",
      transmission: "local",
    };
  }
  const query = countryQuery.trim().toLowerCase();
  const match = payload.countries.find((row) => row.country.toLowerCase() === query);
  if (!match) {
    return {
      status: "not_found",
      country: countryQuery || null,
      currency: "EUR",
      unit: "per_gb",
      minEurPerGb: null,
      maxEurPerGb: null,
      minDisplay: null,
      maxDisplay: null,
      networks: null,
      ledgerCurrency: payload.ledger_currency ?? null,
      countryCount: payload.total ?? payload.countries.length,
      retrievedAt,
      sourceUrl,
      note: "No country with that exact name was in the pricing response. Prices were not guessed. Air and maritime coverage is not in this endpoint and is not satellite-to-phone.",
      transmission: "nxtl",
    };
  }
  return {
    status: "ok",
    country: match.country,
    currency: "EUR",
    unit: "per_gb",
    minEurPerGb: match.min_eur,
    maxEurPerGb: match.max_eur,
    minDisplay: match.min_display ?? null,
    maxDisplay: match.max_display ?? null,
    networks: match.networks ?? null,
    ledgerCurrency: payload.ledger_currency ?? null,
    countryCount: payload.total ?? payload.countries.length,
    retrievedAt,
    sourceUrl,
    note: match.min_display ? `Plans start from ${match.min_display}/GB.` : `Plans start from €${match.min_eur}/GB.`,
    transmission: "nxtl",
  };
}
