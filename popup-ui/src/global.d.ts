import type { NormalizedSettings } from "./settingsTypes";

type LanguageOption = {
  code: string;
  name: string;
  nativeName: string;
  searchText: string;
};

type Translations = Record<string, string>;

type OpenFrontMap = { id: string; name: string; thumbnail: string };

declare global {
  interface Window {
    OPENFRONT_MAPS?: readonly OpenFrontMap[];
    OpenFrontHelperSettings: {
      STORAGE_KEY: string;
      MAPS: OpenFrontMap[];
      MAP_IDS: string[];
      FILTER_KEYS: string[];
      DEFAULT_SETTINGS: NormalizedSettings;
      createDefaultMapFilters: () => Record<string, boolean>;
      normalizeSettings: (
        raw: unknown,
        options?: { ensureActiveSearchTimestamp?: boolean },
      ) => NormalizedSettings;
      normalizeMinLobbySize: (value: unknown) => number | null;
      normalizeLanguage: (value: unknown) => string;
      normalizeEconomyHeatmapIntensity: (value: unknown) => number;
      getEconomyHeatmapIntensityLabel: (value: unknown) => string;
    };
    OpenFrontHelperI18n: {
      DEFAULT_TRANSLATIONS: Translations;
      createLanguageOptions: (locale?: string) => LanguageOption[];
      getMessage: (bundle: Translations, key: string) => string;
      loadBundle: (language: string) => Promise<Translations>;
    };
  }
}

export {};
