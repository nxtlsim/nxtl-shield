chrome.storage.local.get("cosmetic", (saved: { cosmetic?: boolean }) => {
  if (!saved.cosmetic) return;
  const style = document.createElement("style");
  style.setAttribute("data-nxtl-shield", "cookie-hide");
  style.textContent = `
    #onetrust-banner-sdk,
    #onetrust-consent-sdk,
    #CybotCookiebotDialog,
    #CybotCookiebotDialogBodyUnderlay,
    #cookie-law-info-bar,
    #cookie-notice,
    .cc-window,
    .cky-consent-container,
    .fc-consent-root { display: none !important; }
  `;
  document.documentElement.append(style);
});
