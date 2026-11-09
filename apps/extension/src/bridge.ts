window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== location.origin) return;
  const data = event.data as { source?: string; id?: string; type?: string };
  if (!data || data.source !== "nxtl-shield-page" || !data.id || !data.type) return;
  chrome.runtime.sendMessage(data, (status: unknown) => {
    window.postMessage({ source: "nxtl-shield-ext", id: data.id, status: status ?? null }, location.origin);
  });
});
