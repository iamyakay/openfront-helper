import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ECONOMIC_HELPERS,
  GAME_HELPERS,
  LOBBY_TYPE_FILTERS,
  MODIFIER_FILTERS,
  START_GOLD_FILTERS,
} from "./filterAndHelperConfig";
import { Button } from "@/components/ui/button";
import { HelperInfoPopup } from "./HelperInfoPopup";
import type { NormalizedSettings } from "./settingsTypes";
import {
  extensionAssetUrl,
  formatDurationShort,
  formatElapsedTime,
  normalizeSearchText,
} from "./utils";

const SOUND_KEY = "joinNotificationSoundData";
const SOUND_NAME_KEY = "joinNotificationSoundName";

function hasSelectedOptions(
  shared: Window["OpenFrontHelperSettings"],
  s: NormalizedSettings,
): boolean {
  if (s.minLobbySize != null) {
    return true;
  }
  if (
    shared.FILTER_KEYS.some(
      (key) => s.includeFilters[key] || s.excludeFilters[key],
    )
  ) {
    return true;
  }
  if (shared.MAP_IDS.some((id) => s.mapFilters[id])) {
    return true;
  }
  if (shared.MAP_IDS.some((id) => s.mapExcludeFilters[id])) {
    return true;
  }
  return false;
}

function resetAutoJoinIfEmpty(
  shared: Window["OpenFrontHelperSettings"],
  s: NormalizedSettings,
): NormalizedSettings {
  if (!hasSelectedOptions(shared, s)) {
    return { ...s, enabled: false, searchStartedAt: null };
  }
  return s;
}

type HelperInfoState = {
  title: string;
  images: string[];
  index: number;
  anchorEl: HTMLElement;
  sourceId: string;
} | null;

export default function App() {
  const shared = window.OpenFrontHelperSettings;
  const i18n = window.OpenFrontHelperI18n;

  const [settings, setSettings] = useState<NormalizedSettings>(() =>
    shared.normalizeSettings({}, { ensureActiveSearchTimestamp: true }),
  );
  const [translations, setTranslations] = useState(i18n.DEFAULT_TRANSLATIONS);
  const [languageOptions, setLanguageOptions] = useState(() =>
    i18n.createLanguageOptions("en"),
  );
  const [languageSearch, setLanguageSearch] = useState("");
  const [mapSearch, setMapSearch] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helperInfo, setHelperInfo] = useState<HelperInfoState>(null);
  const [openFrontReloadTabId, setOpenFrontReloadTabId] = useState<number | null>(
    null,
  );
  const [soundDisplayName, setSoundDisplayName] = useState(() =>
    i18n.getMessage(i18n.DEFAULT_TRANSLATIONS, "defaultSound"),
  );
  const [soundCustom, setSoundCustom] = useState(false);
  const [, setTimerTick] = useState(0);
  const soundInputRef = useRef<HTMLInputElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);

  const t = useCallback(
    (key: string) => i18n.getMessage(translations, key),
    [i18n, translations],
  );

  const persist = useCallback(
    (updater: (prev: NormalizedSettings) => NormalizedSettings) => {
      setSettings((prev) => {
        const normalized = shared.normalizeSettings(updater(prev), {
          ensureActiveSearchTimestamp: true,
        });
        const next = resetAutoJoinIfEmpty(shared, normalized);
        void chrome.storage.local.set({ [shared.STORAGE_KEY]: next });
        return next;
      });
    },
    [shared],
  );

  const loadTranslations = useCallback(
    async (language: string) => {
      const bundle = await i18n.loadBundle(language);
      setTranslations(bundle);
      setLanguageOptions(i18n.createLanguageOptions(language));
      document.documentElement.lang = language;
      document.title = i18n.getMessage(bundle, "Auto-Join & Helpers for OpenFront");
    },
    [i18n],
  );

  useEffect(() => {
    void (async () => {
      const stored = await chrome.storage.local.get(shared.STORAGE_KEY);
      const rawSettings = stored[shared.STORAGE_KEY] || {};
      let next = shared.normalizeSettings(rawSettings, {
        ensureActiveSearchTimestamp: true,
      });
      if (next.enabled && !rawSettings.searchStartedAt) {
        next = shared.normalizeSettings(next, { ensureActiveSearchTimestamp: true });
        await chrome.storage.local.set({ [shared.STORAGE_KEY]: next });
      }
      setSettings(next);
      await loadTranslations(next.language);
    })();
  }, [shared, loadTranslations]);

  useEffect(() => {
    void chrome.storage.local.get([SOUND_KEY, SOUND_NAME_KEY]).then((stored) => {
      if (stored[SOUND_KEY]) {
        setSoundDisplayName(
          stored[SOUND_NAME_KEY] ||
            i18n.getMessage(i18n.DEFAULT_TRANSLATIONS, "customSound"),
        );
        setSoundCustom(true);
      }
    });
  }, [i18n]);

  useEffect(() => {
    const onStorage = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== "local" || !changes[shared.STORAGE_KEY]) {
        return;
      }
      setSettings((prev) => {
        const previousLanguage = prev.language;
        const next = shared.normalizeSettings(changes[shared.STORAGE_KEY].newValue, {
          ensureActiveSearchTimestamp: true,
        });
        if (next.language !== previousLanguage) {
          void loadTranslations(next.language);
        }
        return next;
      });
    };
    chrome.storage.onChanged.addListener(onStorage);
    return () => chrome.storage.onChanged.removeListener(onStorage);
  }, [shared, loadTranslations]);

  useEffect(() => {
    if (!settings.enabled || !settings.searchStartedAt) {
      return;
    }
    const id = window.setInterval(() => setTimerTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [settings.enabled, settings.searchStartedAt]);

  useEffect(() => {
    void (async () => {
      if (!chrome.tabs?.query) {
        return;
      }
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id || !String(tab.url || "").startsWith("https://openfront.io/")) {
        return;
      }
      if (!chrome.tabs?.sendMessage) {
        return;
      }
      try {
        await chrome.tabs.sendMessage(tab.id, { type: "OPENFRONT_HELPER_PING" });
      } catch {
        setSettingsOpen(false);
        setOpenFrontReloadTabId(tab.id);
      }
    })();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenFrontReloadTabId(null);
        setHelperInfo(null);
        setSettingsOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (
        settingsOpen &&
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(target) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(target)
      ) {
        setSettingsOpen(false);
      }
      if (
        target.closest(".helper-info-popup") ||
        target.closest(".helper-info-button")
      ) {
        return;
      }
      setHelperInfo(null);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [settingsOpen]);

  const filteredLanguages = useMemo(() => {
    const q = normalizeSearchText(languageSearch);
    return languageOptions.filter((lang) => {
      if (!q) {
        return true;
      }
      return normalizeSearchText(lang.searchText).includes(q);
    });
  }, [languageOptions, languageSearch]);

  const mapTileVisible = useCallback(
    (mapId: string, mapName: string) => {
      const q = normalizeSearchText(mapSearch);
      if (!q) {
        return true;
      }
      const blob = `${normalizeSearchText(mapName)} ${normalizeSearchText(mapId)}`;
      return blob.includes(q);
    },
    [mapSearch],
  );

  const cheatsHint = t("Only available in solo or custom games.");
  const cheatsEnabled = settings.cheatsAvailable;

  const openHelperInfo = useCallback(
    (
      anchorEl: HTMLElement,
      title: string,
      images: string[],
      sourceId: string,
    ) => {
      setHelperInfo((prev) => {
        if (prev?.sourceId === sourceId) {
          return null;
        }
        return { title, images, index: 0, anchorEl, sourceId };
      });
    },
    [],
  );

  const manifestVersion = useMemo(() => {
    const m = chrome.runtime.getManifest?.();
    return m?.version ? `v${m.version}` : "";
  }, []);

  const helpersPopoutTitle = settings.showFloatingHelpersPanel
    ? t("hideFloatingHelpersPanel")
    : t("showFloatingHelpersPanel");

  const economyIntensityLabel = t(
    shared.getEconomyHeatmapIntensityLabel(settings.economyHeatmapIntensity),
  );

  return (
    <main className="panel">
      <header className="hero">
        <div className="hero-actions">
          <button
            ref={settingsButtonRef}
            className="settings-button"
            type="button"
            aria-label={t("openSettings")}
            aria-expanded={settingsOpen}
            onClick={(e) => {
              e.stopPropagation();
              setSettingsOpen((o) => !o);
            }}
          >
            <svg
              className="settings-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="settings-button-label">{t("settings")}</span>
          </button>
        </div>

        <div
          ref={settingsPanelRef}
          className="settings-panel"
          hidden={!settingsOpen}
        >
          <p className="settings-panel-title">{t("settings")}</p>
          <div className="settings-panel-row settings-section">
            <div className="settings-panel-row-header">
              <span className="settings-panel-label">
                {t("customNotificationSound")}
              </span>
              <div className="settings-panel-actions">
                <Button
                  className="settings-sound-btn"
                  variant="secondary"
                  type="button"
                  onClick={async () => {
                    const stored = await chrome.storage.local.get(SOUND_KEY);
                    if (stored[SOUND_KEY]) {
                      new Audio(stored[SOUND_KEY]).play().catch(() => {});
                    }
                  }}
                >
                  {t("test")}
                </Button>
                <button
                  className="settings-sound-btn settings-sound-btn-primary"
                  type="button"
                  onClick={() => soundInputRef.current?.click()}
                >
                  {t("upload")}
                </button>
                <button
                  className="settings-sound-btn settings-sound-btn-danger"
                  type="button"
                  hidden={!soundCustom}
                  onClick={async () => {
                    await chrome.storage.local.remove([SOUND_KEY, SOUND_NAME_KEY]);
                    setSoundDisplayName(t("defaultSound"));
                    setSoundCustom(false);
                    if (soundInputRef.current) {
                      soundInputRef.current.value = "";
                    }
                  }}
                >
                  {t("remove")}
                </button>
              </div>
            </div>
            <span className="settings-sound-name">{soundDisplayName}</span>
            <input
              ref={soundInputRef}
              type="file"
              accept="audio/*"
              hidden
              onChange={() => {
                const file = soundInputRef.current?.files?.[0];
                if (!file) {
                  return;
                }
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  const result = ev.target?.result;
                  if (typeof result !== "string") {
                    return;
                  }
                  await chrome.storage.local.set({
                    [SOUND_KEY]: result,
                    [SOUND_NAME_KEY]: file.name,
                  });
                  setSoundDisplayName(file.name);
                  setSoundCustom(true);
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>

          <div className="macros-panel settings-macros-panel settings-section">
            <p className="macros-panel-title">{t("Macros")}</p>
            <div className="macros-card">
              <label className="macros-card-header" htmlFor="send1PercentBoatToggle">
                <div className="macros-card-info">
                  <span className="macros-card-name">{t("⚓ Send 1% Boat")}</span>
                  <span className="macros-card-desc">
                    {t("Send a transport with 1% troops, then restore the attack ratio.")}
                  </span>
                </div>
                <span className="macros-card-toggle">
                  <input
                    type="checkbox"
                    id="send1PercentBoatToggle"
                    name="send1PercentBoat"
                    checked={settings.send1PercentBoat}
                    onChange={(e) => {
                      persist((prev) => ({ ...prev, send1PercentBoat: e.target.checked }));
                    }}
                  />
                  <span className="macros-card-toggle-track" />
                </span>
              </label>
              <div
                className={`macros-sub-options${settings.send1PercentBoat ? " visible" : ""}`}
              >
                <div className="macros-sub-row">
                  <span className="macros-sub-label">{t("Hotkey")}</span>
                  <kbd className="macros-kbd">{t("N")}</kbd>
                </div>
                <label className="macros-sub-check-row" htmlFor="send1PercentBoatContextMenuToggle">
                  <input
                    type="checkbox"
                    className="macros-sub-check"
                    id="send1PercentBoatContextMenuToggle"
                    name="send1PercentBoatContextMenu"
                    checked={settings.send1PercentBoatContextMenu !== false}
                    onChange={(e) => {
                      persist((prev) => ({
                        ...prev,
                        send1PercentBoatContextMenu: e.target.checked,
                      }));
                    }}
                  />
                  <span className="macros-sub-check-label">
                    {t("Show button in selection wheel")}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="settings-language-panel settings-section">
            <label className="language-search-label" htmlFor="languageSearchInput">
              {t("language")}
            </label>
            <input
              id="languageSearchInput"
              className="language-search-input"
              type="search"
              placeholder={t("searchLanguages")}
              autoComplete="off"
              value={languageSearch}
              onChange={(e) => setLanguageSearch(e.target.value)}
            />
            <div className="language-list" role="listbox" aria-label={t("Languages")}>
              {filteredLanguages.length === 0 ? (
                <p className="language-empty">{t("noLanguagesFound")}</p>
              ) : (
                filteredLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    className="language-option"
                    type="button"
                    role="option"
                    aria-selected={lang.code === settings.language}
                    onClick={() => {
                      const language = shared.normalizeLanguage(lang.code);
                      if (language === settings.language) {
                        return;
                      }
                      persist((prev) => ({ ...prev, language }));
                      void loadTranslations(language);
                      setLanguageSearch("");
                    }}
                  >
                    <span className="language-option-name">
                      {lang.name === lang.nativeName
                        ? lang.name
                        : `${lang.name} (${lang.nativeName})`}
                    </span>
                    <span className="language-option-code">{lang.code}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {openFrontReloadTabId != null ? (
          <div
            className="popup-modal openfront-reload-popup"
            aria-hidden="false"
          >
            <div
              className="popup-modal-card openfront-reload-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="openFrontReloadTitle"
            >
              <div className="popup-modal-head">
                <p id="openFrontReloadTitle" className="popup-modal-title openfront-reload-title">
                  {t("openFrontReloadTitle")}
                </p>
              </div>
              <p className="popup-modal-text openfront-reload-text">
                {t("openFrontReloadText")}
              </p>
              <div className="popup-modal-actions">
                <button
                  className="popup-modal-button"
                  type="button"
                  onClick={() => setOpenFrontReloadTabId(null)}
                >
                  {t("cancel")}
                </button>
                <button
                  className="popup-modal-button popup-modal-button-primary"
                  type="button"
                  onClick={async () => {
                    const tabId = openFrontReloadTabId;
                    setOpenFrontReloadTabId(null);
                    if (typeof tabId === "number" && chrome.tabs?.reload) {
                      await chrome.tabs.reload(tabId);
                    }
                  }}
                >
                  {t("openFrontReloadButton")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="discord-callout" aria-hidden="false">
          <a
            className="discord-link github-link"
            href="https://github.com/phil0010-gh/openfront-helper"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("openGitHubRepository")}
          >
            <svg className="discord-icon github-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 2C6.48 2 2 6.58 2 12.22c0 4.52 2.87 8.35 6.84 9.71.5.09.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.22-3.37-1.22-.46-1.19-1.11-1.51-1.11-1.51-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.36-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.32 9.32 0 0 1 12 6.93c.85 0 1.7.12 2.5.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.81 0 .27.18.59.69.49A10.14 10.14 0 0 0 22 12.22C22 6.58 17.52 2 12 2Z" />
            </svg>
          </a>
          <a
            className="discord-link"
            href="https://discord.gg/6WFy4NQ9jy"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("Join our Discord")}
          >
            <svg className="discord-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M20.3 4.5A16.6 16.6 0 0 0 16.2 3l-.2.4a12.7 12.7 0 0 1 3.6 1.8 13.6 13.6 0 0 0-10.4 0 12.7 12.7 0 0 1 3.6-1.8L12.6 3a16.6 16.6 0 0 0-4.1 1.5C5.9 8.4 5.2 12.2 5.6 16a16.7 16.7 0 0 0 5.1 2.6l.6-1a10.7 10.7 0 0 1-1.6-.8l.4-.3a11.9 11.9 0 0 0 10.6 0l.4.3a10.7 10.7 0 0 1-1.6.8l.6 1a16.7 16.7 0 0 0 5.1-2.6c.5-4.4-.8-8.1-2.9-11.5ZM11 13.7c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.4 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
            </svg>
            <span>{t("Join our Discord")}</span>
          </a>
        </div>
      </header>

      <form
        className="popup-layout"
        autoComplete="off"
        onSubmit={(e) => e.preventDefault()}
        onClick={async (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) {
            return;
          }

          const toggle = target.closest(".helper-category-toggle");
          if (toggle instanceof HTMLButtonElement) {
            const category = toggle.dataset.helperCategory;
            if (!category) {
              return;
            }
            persist((prev) => ({
              ...prev,
              collapsedHelperCategories: {
                ...shared.DEFAULT_SETTINGS.collapsedHelperCategories,
                ...prev.collapsedHelperCategories,
                [category]: !Boolean(prev.collapsedHelperCategories?.[category]),
              },
            }));
            return;
          }

          const infoButton = target.closest(".helper-info-button");
          if (infoButton instanceof HTMLButtonElement) {
            event.preventDefault();
            event.stopPropagation();
            const title = infoButton.dataset.infoTitle || t("Helper preview");
            let images: string[] = [];
            if (infoButton.dataset.infoImages) {
              try {
                images = JSON.parse(infoButton.dataset.infoImages) as string[];
              } catch {
                images = [];
              }
            }
            if (!images.length && infoButton.dataset.infoImage) {
              images = [infoButton.dataset.infoImage];
            }
            if (!images.length) {
              return;
            }
            const sourceId = `${title}:${images.join(",")}`;
            openHelperInfo(infoButton, title, images, sourceId);
            return;
          }

          const excludeButton = target.closest(".exclude-button");
          if (excludeButton instanceof HTMLButtonElement) {
            event.preventDefault();
            event.stopPropagation();
            const filterKey = excludeButton.dataset.filter;
            if (!filterKey) {
              return;
            }
            persist((prev) => {
              const nextValue = !prev.excludeFilters[filterKey];
              const excludeFilters = { ...prev.excludeFilters, [filterKey]: nextValue };
              const includeFilters = { ...prev.includeFilters };
              if (nextValue) {
                includeFilters[filterKey] = false;
              }
              return { ...prev, excludeFilters, includeFilters };
            });
          }
        }}
      >
        <section className="filter-group filter-group-helpers">
          <div className="helpers-panel-header">
            <p className="section-title">{t("Helpers")}</p>
            <button
              className="helpers-popout-button"
              type="button"
              aria-label={helpersPopoutTitle}
              title={helpersPopoutTitle}
              aria-pressed={settings.showFloatingHelpersPanel}
              data-active={String(settings.showFloatingHelpersPanel)}
              onClick={() => {
                persist((prev) => ({
                  ...prev,
                  showFloatingHelpersPanel: !prev.showFloatingHelpersPanel,
                }));
              }}
            >
              <span aria-hidden="true">⛶</span>
              <span>{t("Float")}</span>
            </button>
          </div>

          {(
            [
              { id: "game", titleKey: "Game helpers", helpers: GAME_HELPERS },
              {
                id: "economic",
                titleKey: "Economic helpers",
                economic: true as const,
              },
              { id: "cheats", titleKey: "Cheats", cheats: true as const },
            ] as const
          ).map((cat) => {
            const collapsed = Boolean(settings.collapsedHelperCategories?.[cat.id]);
            return (
              <div key={cat.id} className="helper-category">
                <button
                  className="helper-category-toggle"
                  type="button"
                  data-helper-category={cat.id}
                  aria-expanded={!collapsed}
                >
                  <span className="helper-category-title">{t(cat.titleKey)}</span>
                  <span className="helper-category-chevron" aria-hidden="true" />
                </button>
                <div
                  className="helper-category-content"
                  data-helper-category-content={cat.id}
                  hidden={collapsed}
                >
                  {"helpers" in cat
                    ? cat.helpers.map((h) => (
                        <label
                          key={h.name}
                          className={`filter-card toggle-card${
                            h.name === "showAllianceRequestsPanel"
                              ? " helper-alliance-request-card"
                              : ""
                          }`}
                        >
                          <span className="filter-main">
                            <input
                              type="checkbox"
                              name={h.name}
                              checked={Boolean(settings[h.name])}
                              onChange={(e) => {
                                persist((prev) => ({
                                  ...prev,
                                  [h.name]: e.target.checked,
                                }));
                              }}
                            />
                            <span className="filter-dot" />
                            <span className="filter-copy">
                              <strong>
                                {t(h.titleKey)}{" "}
                                {h.name === "markBotNationsRed" ? (
                                  <span
                                    className="helper-option-icon helper-option-icon-bot"
                                    aria-hidden="true"
                                  >
                                    🤖
                                  </span>
                                ) : null}
                                {h.name === "markHoveredAlliesGreen" ||
                                h.name === "showAllianceRequestsPanel" ? (
                                  <span
                                    className="helper-option-icon helper-option-icon-alliance"
                                    aria-hidden="true"
                                  >
                                    🤝
                                  </span>
                                ) : null}
                                {h.name === "showNukePrediction" ? (
                                  <span
                                    className="helper-option-icon helper-option-icon-nuke"
                                    aria-hidden="true"
                                  >
                                    !
                                  </span>
                                ) : null}
                                {h.name === "showBoatPrediction" ? (
                                  <span className="helper-option-icon" aria-hidden="true">
                                    ⚓
                                  </span>
                                ) : null}
                              </strong>
                              <small>{t(h.descKey)}</small>
                            </span>
                          </span>
                          <button
                            className="helper-info-button"
                            type="button"
                            data-info-title={t(h.titleKey)}
                            data-info-image={h.infoImage}
                            aria-label={h.infoAriaKey ? t(h.infoAriaKey) : t("Helper preview")}
                          >
                            i
                          </button>
                        </label>
                      ))
                    : null}

                  {"economic" in cat && cat.economic ? (
                    <>
                      {ECONOMIC_HELPERS.map((h) => (
                        <label key={h.name} className="filter-card toggle-card">
                          <span className="filter-main">
                            <input
                              type="checkbox"
                              name={h.name}
                              checked={Boolean(settings[h.name])}
                              onChange={(e) => {
                                persist((prev) => ({
                                  ...prev,
                                  [h.name]: e.target.checked,
                                }));
                              }}
                            />
                            <span className="filter-dot" />
                            <span className="filter-copy">
                              <strong>
                                {t(h.titleKey)}{" "}
                                {h.name === "showGoldPerMinute" ? (
                                  <span
                                    className="helper-option-icon helper-option-icon-gold"
                                    aria-hidden="true"
                                  >
                                    🪙
                                  </span>
                                ) : null}
                                {h.name === "showTeamGoldPerMinute" ? (
                                  <span
                                    className="helper-option-icon helper-option-icon-team"
                                    aria-hidden="true"
                                  >
                                    🛡️
                                  </span>
                                ) : null}
                                {h.name === "showTradeBalances" ? (
                                  <span
                                    className="helper-option-icon helper-option-icon-trade"
                                    aria-hidden="true"
                                  >
                                    🚂
                                  </span>
                                ) : null}
                              </strong>
                              <small>{t(h.descKey)}</small>
                            </span>
                          </span>
                          {h.infoImage ? (
                            <button
                              className="helper-info-button"
                              type="button"
                              data-info-title={t(h.titleKey)}
                              data-info-image={h.infoImage}
                              aria-label={
                                h.infoAriaKey ? t(h.infoAriaKey) : t("Helper preview")
                              }
                            >
                              i
                            </button>
                          ) : null}
                        </label>
                      ))}

                      <div className="helper-subpanel helper-subpanel-heatmaps">
                        <p className="helper-subpanel-title">{t("Heatmaps")}</p>
                        <div className="filter-card toggle-card helper-heatmap-card">
                          <label className="filter-main">
                            <input
                              type="checkbox"
                              name="showEconomyHeatmap"
                              checked={settings.showEconomyHeatmap}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                persist((prev) => ({
                                  ...prev,
                                  showEconomyHeatmap: checked,
                                  showExportPartnerHeatmap: checked
                                    ? false
                                    : prev.showExportPartnerHeatmap,
                                }));
                              }}
                            />
                            <span className="filter-dot" />
                            <span className="filter-copy">
                              <strong>
                                {t("Economic heatmap")}{" "}
                                <span
                                  className="helper-option-icon helper-option-icon-heatmap"
                                  aria-hidden="true"
                                >
                                  🔥
                                </span>
                              </strong>
                              <small>{t("Highlights structures with observed trade revenue.")}</small>
                            </span>
                          </label>
                          <button
                            className="helper-info-button"
                            type="button"
                            data-info-title={t("Economic heatmap")}
                            data-info-image="assets/info-images/economic_heatmap_info.png"
                            aria-label={t("Show Economic heatmap preview")}
                          >
                            i
                          </button>
                          <label className="helper-slider-card" htmlFor="economyHeatmapIntensity">
                            <span className="helper-slider-header">
                              <strong>{t("Intensity")}</strong>
                              <span className="helper-slider-value">{economyIntensityLabel}</span>
                            </span>
                            <input
                              id="economyHeatmapIntensity"
                              name="economyHeatmapIntensity"
                              type="range"
                              min={0}
                              max={2}
                              step={1}
                              value={settings.economyHeatmapIntensity}
                              onInput={(e) => {
                                const v = (e.target as HTMLInputElement).value;
                                setSettings((prev) => ({
                                  ...prev,
                                  economyHeatmapIntensity:
                                    shared.normalizeEconomyHeatmapIntensity(v),
                                }));
                              }}
                              onChange={(e) => {
                                persist((prev) => ({
                                  ...prev,
                                  economyHeatmapIntensity: shared.normalizeEconomyHeatmapIntensity(
                                    e.target.value,
                                  ),
                                }));
                              }}
                            />
                            <span className="helper-slider-labels" aria-hidden="true">
                              <span>{t("Low")}</span>
                              <span>{t("Default")}</span>
                              <span>{t("High")}</span>
                            </span>
                          </label>
                        </div>
                        <label className="filter-card toggle-card">
                          <span className="filter-main">
                            <input
                              type="checkbox"
                              name="showExportPartnerHeatmap"
                              checked={settings.showExportPartnerHeatmap}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                persist((prev) => ({
                                  ...prev,
                                  showExportPartnerHeatmap: checked,
                                  showEconomyHeatmap: checked ? false : prev.showEconomyHeatmap,
                                }));
                              }}
                            />
                            <span className="filter-dot" />
                            <span className="filter-copy">
                              <strong>{t("Export partner heatmap")}</strong>
                              <small>
                                {t(
                                  "Hover a player to highlight the partner industry that fuels their exports.",
                                )}
                              </small>
                            </span>
                          </span>
                        </label>
                      </div>
                    </>
                  ) : null}

                  {"cheats" in cat && cat.cheats ? (
                    <>
                      <p
                        className="helper-category-warning"
                        title={!cheatsEnabled ? cheatsHint : undefined}
                      >
                        {t("⚠ Only available in solo or custom games.")}
                      </p>
                      <label
                        className="filter-card toggle-card"
                        data-disabled={String(!cheatsEnabled)}
                        title={!cheatsEnabled ? cheatsHint : undefined}
                      >
                        <span className="filter-main">
                          <input
                            type="checkbox"
                            name="showNukeSuggestions"
                            disabled={!cheatsEnabled}
                            title={!cheatsEnabled ? cheatsHint : undefined}
                            checked={settings.showNukeSuggestions}
                            onChange={(e) => {
                              if (!cheatsEnabled) {
                                return;
                              }
                              persist((prev) => ({
                                ...prev,
                                showNukeSuggestions: e.target.checked,
                              }));
                            }}
                          />
                          <span className="filter-dot" />
                          <span className="filter-copy">
                            <strong>
                              {t("Nuke suggestion")}{" "}
                              <span className="helper-beta-badge">{t("Beta")}</span>{" "}
                              <span className="helper-warning-badge">{t("May lag")}</span>
                            </strong>
                            <small>
                              {t(
                                "Hover an enemy to show high-damage atom and hydrogen targets.",
                              )}
                            </small>
                          </span>
                        </span>
                      </label>
                      <label
                        className="filter-card toggle-card helper-auto-nuke-card"
                        data-disabled={String(!cheatsEnabled)}
                        title={!cheatsEnabled ? cheatsHint : undefined}
                      >
                        <span className="filter-main">
                          <input
                            type="checkbox"
                            name="autoNuke"
                            disabled={!cheatsEnabled}
                            title={!cheatsEnabled ? cheatsHint : undefined}
                            checked={settings.autoNuke}
                            onChange={(e) => {
                              if (!cheatsEnabled) {
                                return;
                              }
                              persist((prev) => ({ ...prev, autoNuke: e.target.checked }));
                            }}
                          />
                          <span className="filter-dot" />
                          <span className="filter-copy">
                            <strong>
                              {t("Auto nuke")}{" "}
                              <span className="helper-beta-badge">{t("Beta")}</span>{" "}
                              <span
                                className="helper-option-icon helper-option-icon-nuke helper-option-icon-auto-nuke"
                                aria-hidden="true"
                              >
                                !
                              </span>
                            </strong>
                            <small>
                              {t(
                                "Adds auto economy and population nuke actions to the player wheel.",
                              )}
                            </small>
                          </span>
                        </span>
                        <button
                          className="helper-info-button"
                          type="button"
                          disabled={!cheatsEnabled}
                          title={!cheatsEnabled ? cheatsHint : t("Auto nuke")}
                          data-info-title={t("Auto nuke")}
                          data-info-images='["assets/info-images/auto_nuke_1_info.png","assets/info-images/auto_nuke_2_info.png"]'
                          aria-label={t("Show Auto nuke preview")}
                        >
                          i
                        </button>
                      </label>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </section>

        <div className="options-panel">
          <div className="autojoin-panel-header">
            <p className="section-title autojoin-panel-title">{t("Auto-Join")}</p>
          </div>
          <button
            className="power-button"
            type="button"
            aria-pressed={settings.enabled}
            data-enabled={String(settings.enabled)}
            disabled={!hasSelectedOptions(shared, settings)}
            onClick={() => {
              persist((prev) => ({
                ...prev,
                enabled: !prev.enabled,
                searchStartedAt: !prev.enabled ? Date.now() : null,
              }));
            }}
          >
            <span className="power-label">
              {settings.enabled ? t("autoJoinOn") : t("autoJoinOff")}
            </span>
            <span className="power-indicator" />
          </button>

          <label
            className="notif-toggle"
            title={t("Show a notification when a game is found")}
          >
            <input
              type="checkbox"
              checked={settings.joinNotification}
              onChange={(e) => {
                persist((prev) => ({ ...prev, joinNotification: e.target.checked }));
              }}
            />
            <span className="notif-toggle-track">
              <span className="notif-toggle-thumb" />
            </span>
            <span className="notif-toggle-label">
              {t("Game found notification popup")}
            </span>
          </label>

          <p className="status-text" hidden />

          <div
            className="search-timer"
            aria-live="polite"
            hidden={!settings.enabled || !settings.searchStartedAt}
          >
            <span className="search-radar" aria-hidden="true" />
            <span className="search-timer-copy">
              <span className="search-timer-label">{t("Searching for")}</span>
              <span className="search-timer-value">
                {settings.enabled && settings.searchStartedAt
                  ? formatElapsedTime(settings.searchStartedAt)
                  : "00:00"}
              </span>
            </span>
          </div>

          {settings.lobbyForecast?.available ? (
            <section className="lobby-forecast">
              <p className="lobby-forecast-title">
                <span className="lobby-forecast-title-text">{t("Lobby forecast")}</span>
                <span className="lobby-forecast-beta">{t("Beta")}</span>
              </p>
              <p className="lobby-forecast-item">
                <span>{t("ETA (estimate)")}</span>
                <strong
                  className={
                    Number.isFinite(settings.lobbyForecast.etaMinSeconds) &&
                    Number.isFinite(settings.lobbyForecast.etaMaxSeconds) &&
                    (settings.lobbyForecast.etaMinSeconds ?? 0) > 0 &&
                    (settings.lobbyForecast.etaMaxSeconds ?? 0) > 0
                      ? ""
                      : "forecast-value-loading"
                  }
                >
                  {Number.isFinite(settings.lobbyForecast.etaMinSeconds) &&
                  Number.isFinite(settings.lobbyForecast.etaMaxSeconds) &&
                  (settings.lobbyForecast.etaMinSeconds ?? 0) > 0 &&
                  (settings.lobbyForecast.etaMaxSeconds ?? 0) > 0
                    ? `${formatDurationShort(settings.lobbyForecast.etaMinSeconds!)} - ${formatDurationShort(settings.lobbyForecast.etaMaxSeconds!)}`
                    : ""}
                </strong>
              </p>
              <p className="lobby-forecast-item">
                <span>{t("Hit chance next 10 lobbies")}</span>
                <strong
                  className={
                    Number.isFinite(settings.lobbyForecast.hitChanceNext10)
                      ? ""
                      : "forecast-value-loading"
                  }
                >
                  {Number.isFinite(settings.lobbyForecast.hitChanceNext10)
                    ? `${Math.round((settings.lobbyForecast.hitChanceNext10 as number) * 100)}%`
                    : ""}
                </strong>
              </p>
              <p className="lobby-forecast-item">
                <span>{t("Median to match")}</span>
                <strong
                  className={
                    Number.isFinite(settings.lobbyForecast.medianLobbiesToMatch)
                      ? ""
                      : "forecast-value-loading"
                  }
                >
                  {Number.isFinite(settings.lobbyForecast.medianLobbiesToMatch)
                    ? `${Math.round(settings.lobbyForecast.medianLobbiesToMatch as number)} ${t("lobbies")}`
                    : ""}
                </strong>
              </p>
            </section>
          ) : null}

          <div className="filters">
            <section className="filter-group">
              <p className="section-title">{t("Lobby Type")}</p>
              {LOBBY_TYPE_FILTERS.map((f) => (
                <label key={f.key} className="filter-card">
                  <span className="filter-main">
                    <input
                      type="checkbox"
                      name={f.key}
                      checked={Boolean(settings.includeFilters[f.key])}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        persist((prev) => {
                          const includeFilters = {
                            ...prev.includeFilters,
                            [f.key]: checked,
                          };
                          const excludeFilters = { ...prev.excludeFilters };
                          if (checked) {
                            excludeFilters[f.key] = false;
                          }
                          return { ...prev, includeFilters, excludeFilters };
                        });
                      }}
                    />
                    <span className="filter-dot" />
                    <span className="filter-copy">
                      <strong>{t(f.titleKey)}</strong>
                      {"descKey" in f && f.descKey ? <small>{t(f.descKey)}</small> : null}
                    </span>
                  </span>
                  <button
                    className="exclude-button"
                    type="button"
                    data-filter={f.key}
                    data-active={String(Boolean(settings.excludeFilters[f.key]))}
                  >
                    {t("Exclude")}
                  </button>
                </label>
              ))}
            </section>

            <section className="filter-group">
              <p className="section-title">{t("Modifier")}</p>
              {MODIFIER_FILTERS.map((f) => (
                <label key={f.key} className="filter-card">
                  <span className="filter-main">
                    <input
                      type="checkbox"
                      name={f.key}
                      checked={Boolean(settings.includeFilters[f.key])}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        persist((prev) => {
                          const includeFilters = {
                            ...prev.includeFilters,
                            [f.key]: checked,
                          };
                          const excludeFilters = { ...prev.excludeFilters };
                          if (checked) {
                            excludeFilters[f.key] = false;
                          }
                          return { ...prev, includeFilters, excludeFilters };
                        });
                      }}
                    />
                    <span className="filter-dot" />
                    <span className="filter-copy">
                      <strong>{t(f.titleKey)}</strong>
                    </span>
                  </span>
                  <button
                    className="exclude-button"
                    type="button"
                    data-filter={f.key}
                    data-active={String(Boolean(settings.excludeFilters[f.key]))}
                  >
                    {t("Exclude")}
                  </button>
                </label>
              ))}
            </section>

            <section className="filter-group filter-group-start-gold">
              <p className="section-title">{t("Start Gold")}</p>
              <p className="section-note">
                {t(
                  "You can turn on all four at the same time. Only one of them has to match.",
                )}
              </p>
              {START_GOLD_FILTERS.map((f) => (
                <label key={f.key} className="filter-card">
                  <span className="filter-main">
                    <input
                      type="checkbox"
                      name={f.key}
                      checked={Boolean(settings.includeFilters[f.key])}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        persist((prev) => {
                          const includeFilters = {
                            ...prev.includeFilters,
                            [f.key]: checked,
                          };
                          const excludeFilters = { ...prev.excludeFilters };
                          if (checked) {
                            excludeFilters[f.key] = false;
                          }
                          return { ...prev, includeFilters, excludeFilters };
                        });
                      }}
                    />
                    <span className="filter-dot" />
                    <span className="filter-copy">
                      <strong>{t(f.titleKey)}</strong>
                      {"descKey" in f && f.descKey ? <small>{t(f.descKey)}</small> : null}
                    </span>
                  </span>
                  <button
                    className="exclude-button"
                    type="button"
                    data-filter={f.key}
                    data-active={String(Boolean(settings.excludeFilters[f.key]))}
                  >
                    {t("Exclude")}
                  </button>
                </label>
              ))}
            </section>

            <label className="autojoin-number-card" htmlFor="minLobbySizeInput">
              <span className="autojoin-number-copy">
                <strong>{t("Min lobby size")}</strong>
                <small>
                  {t(
                    "Only join lobbies whose max player count is greater than this number.",
                  )}
                </small>
              </span>
              <input
                id="minLobbySizeInput"
                name="minLobbySize"
                type="number"
                min={1}
                max={100}
                step={1}
                inputMode="numeric"
                placeholder="0"
                value={settings.minLobbySize == null ? "" : String(settings.minLobbySize)}
                onChange={(e) => {
                  persist((prev) => ({
                    ...prev,
                    minLobbySize: shared.normalizeMinLobbySize(e.target.value),
                  }));
                }}
              />
            </label>

            <aside className="map-filter-panel" aria-labelledby="mapFilterTitle">
              <div className="map-filter-head">
                <div>
                  <p id="mapFilterTitle" className="section-title">
                    {t("Maps")}
                  </p>
                </div>
                <button
                  className="clear-map-button"
                  type="button"
                  disabled={
                    !shared.MAP_IDS.some((id) => settings.mapFilters[id]) &&
                    !shared.MAP_IDS.some((id) => settings.mapExcludeFilters[id])
                  }
                  onClick={() => {
                    persist((prev) => ({
                      ...prev,
                      mapFilters: shared.createDefaultMapFilters(),
                      mapExcludeFilters: shared.createDefaultMapFilters(),
                    }));
                  }}
                >
                  {t("Clear")}
                </button>
              </div>
              <label className="map-search-label" htmlFor="mapSearchInput">
                {t("Search maps")}
              </label>
              <input
                id="mapSearchInput"
                className="map-search-input"
                type="search"
                placeholder={t("Search maps")}
                autoComplete="off"
                value={mapSearch}
                onChange={(e) => setMapSearch(e.target.value)}
              />
              <div className="map-filters" aria-label={t("Map filters")}>
                {shared.MAPS.map((map) => (
                  <div
                    key={map.id}
                    className="map-filter-tile"
                    hidden={!mapTileVisible(map.id, map.name)}
                  >
                    <button
                      className="map-filter-button"
                      type="button"
                      data-map-id={map.id}
                      data-active={String(Boolean(settings.mapFilters[map.id]))}
                      aria-pressed={Boolean(settings.mapFilters[map.id])}
                      aria-label={`Filter map ${map.name}`}
                      onClick={() => {
                        persist((prev) => {
                          const nextInclude = !prev.mapFilters[map.id];
                          const mapFilters = { ...prev.mapFilters, [map.id]: nextInclude };
                          const mapExcludeFilters = { ...prev.mapExcludeFilters };
                          if (nextInclude) {
                            mapExcludeFilters[map.id] = false;
                          }
                          return { ...prev, mapFilters, mapExcludeFilters };
                        });
                      }}
                    >
                      <img
                        src={extensionAssetUrl(map.thumbnail)}
                        alt=""
                        loading="lazy"
                      />
                      <span className="map-name">{map.name}</span>
                    </button>
                    <button
                      className="map-exclude-button"
                      type="button"
                      data-map-id={map.id}
                      data-active={String(Boolean(settings.mapExcludeFilters[map.id]))}
                      aria-label={`${t("Exclude")} ${map.name}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        persist((prev) => {
                          const nextEx = !prev.mapExcludeFilters[map.id];
                          const mapExcludeFilters = {
                            ...prev.mapExcludeFilters,
                            [map.id]: nextEx,
                          };
                          const mapFilters = { ...prev.mapFilters };
                          if (nextEx) {
                            mapFilters[map.id] = false;
                          }
                          return { ...prev, mapFilters, mapExcludeFilters };
                        });
                      }}
                    >
                      {t("Exclude")}
                    </button>
                  </div>
                ))}
              </div>
            </aside>

            <footer className="footer-note">
              {t(
                "Include requires a match. Exclude blocks an option. For starting gold, any included value is enough, while excluded values are always rejected.",
              )}
            </footer>
          </div>
        </div>
      </form>

      <HelperInfoPopup
        open={helperInfo != null}
        anchorEl={helperInfo?.anchorEl ?? null}
        title={helperInfo?.title ?? ""}
        images={helperInfo?.images ?? []}
        imageIndex={helperInfo?.index ?? 0}
        onClose={() => setHelperInfo(null)}
        onPrev={() =>
          setHelperInfo((h) =>
            h ? { ...h, index: Math.max(0, h.index - 1) } : h,
          )
        }
        onNext={() =>
          setHelperInfo((h) =>
            h ? { ...h, index: Math.min(h.images.length - 1, h.index + 1) } : h,
          )
        }
        t={t}
      />

      <div className="location-footer" aria-label={t("Cologne, Germany and European Union")}>
        <span className="version-label">{manifestVersion}</span>
        <span>{t("Cologne")}</span>
        <span className="title-flags" aria-hidden="true">
          <img
            src={extensionAssetUrl("assets/icons/cologne-cathedral.png")}
            className="title-cathedral-img"
            title={t("Cologne Cathedral")}
            alt={t("Cologne Cathedral")}
          />
          <span className="title-flag title-flag-de" title={t("Germany")} />
          <span className="title-flag title-flag-eu" title={t("European Union")} />
        </span>
      </div>
    </main>
  );
}
