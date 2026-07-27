async function localizeGameFoundWindow() {
  const shared = globalThis.OpenFrontHelperSettings;
  const i18n = globalThis.OpenFrontHelperI18n;
  if (!shared || !i18n) {
    return;
  }

  const stored = await chrome.storage.local.get(shared.STORAGE_KEY);
  const settings = shared.normalizeSettings(stored[shared.STORAGE_KEY]);
  const translations = await i18n.loadBundle(settings.language);
  document.documentElement.lang = settings.language;
  i18n.localizeElement(document.body, translations);
  document.title = i18n.getMessage(translations, "Game Found!");
  const subtitle = document.querySelector(".sub");
  if (subtitle) {
    subtitle.textContent = i18n.getMessage(translations, "Joining now...");
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function playAudioWithRetries(src) {
  if (!src) {
    return false;
  }

  const audio = new Audio(src);
  audio.preload = "auto";
  audio.currentTime = 0;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await audio.play();
      // Keep the window alive until playback ends so the alert isn't cut off
      // mid-sound by window.close(). Guard with a cap in case the metadata
      // reports a bogus duration.
      await new Promise((resolve) => {
        const maxWaitMs = Number.isFinite(audio.duration)
          ? Math.min(10000, audio.duration * 1000)
          : 4000;
        const timeoutId = window.setTimeout(resolve, maxWaitMs);
        audio.addEventListener(
          "ended",
          () => {
            window.clearTimeout(timeoutId);
            resolve();
          },
          { once: true },
        );
      });
      return true;
    } catch (_error) {
      audio.load();
      await delay(160 + attempt * 220);
    }
  }

  return false;
}

async function playGameFoundSound() {
  try {
    const custom = await chrome.storage.local.get("joinNotificationSoundData");
    const customSrc =
      typeof custom.joinNotificationSoundData === "string"
        ? custom.joinNotificationSoundData
        : null;

    if (customSrc && (await playAudioWithRetries(customSrc))) {
      return;
    }

    await playAudioWithRetries(chrome.runtime.getURL("assets/autojoin.mp3"));
  } catch (_error) {
    // Ignore audio/storage errors in the ephemeral notification window.
  }
}

// Close once the alert sound has finished (or failed), with a hard cap so a
// stalled audio element can never keep the popup open indefinitely.
const closeAfterSound = playGameFoundSound()
  .catch(() => {})
  .then(() => delay(1500));
const closeAfterTimeout = delay(12000);

localizeGameFoundWindow().catch((error) => {
  console.error("Failed to localize game found window:", error);
});

Promise.race([closeAfterSound, closeAfterTimeout]).then(() => window.close());
