function appendScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(el);
  });
}

export async function loadExtensionGlobals(): Promise<void> {
  const getUrl = globalThis.chrome?.runtime?.getURL;
  if (typeof getUrl !== "function") {
    throw new Error(
      "This page must be opened as the extension popup (chrome.runtime.getURL missing).",
    );
  }
  await appendScript(getUrl("map-data.js"));
  await appendScript(getUrl("shared/settings.js"));
  await appendScript(getUrl("shared/i18n.js"));
}
