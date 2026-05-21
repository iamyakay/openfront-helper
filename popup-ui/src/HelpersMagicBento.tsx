import MagicBento, { type BentoCardProps } from "@/components/react-bits/magic-bento";
import type { NormalizedSettings } from "./settingsTypes";

const HELPER_GLOW = "45, 212, 191";
const HELPER_CARD_OFF = "#051c20";
const HELPER_CARD_ON = "#0a2e28";

export type HelperBentoItem = {
  id: string;
  titleKey: string;
  descKey: string;
  categoryLabel: string;
  infoImage?: string;
  infoImages?: string[];
  infoAriaKey?: string;
  disabled?: boolean;
};

type HelpersMagicBentoProps = {
  helpers: HelperBentoItem[];
  settings: NormalizedSettings;
  t: (key: string) => string;
  onToggle: (id: string, next: boolean) => void;
};

export function HelpersMagicBento({
  helpers,
  settings,
  t,
  onToggle,
}: HelpersMagicBentoProps) {
  const cards: BentoCardProps[] = helpers.map((helper) => ({
    id: helper.id,
    label: helper.categoryLabel,
    title: t(helper.titleKey),
    description: t(helper.descKey),
    color: Boolean(settings[helper.id as keyof NormalizedSettings])
      ? HELPER_CARD_ON
      : HELPER_CARD_OFF,
  }));

  return (
    <MagicBento
      cards={cards}
      layout="compact"
      sectionClassName="helpers-bento-grid"
      textAutoHide
      enableStars={false}
      enableSpotlight
      enableBorderGlow
      enableTilt={false}
      enableMagnetism={false}
      clickEffect
      glowColor={HELPER_GLOW}
      spotlightRadius={220}
      onCardClick={(card) => {
        const helper = helpers.find((item) => item.id === card.id);
        if (!helper || helper.disabled) {
          return;
        }
        onToggle(
          helper.id,
          !Boolean(settings[helper.id as keyof NormalizedSettings]),
        );
      }}
      isCardActive={(card) =>
        Boolean(settings[card.id as keyof NormalizedSettings])
      }
      renderCardOverlay={(card) => {
        const helper = helpers.find((item) => item.id === card.id);
        if (!helper?.infoImage && !helper?.infoImages?.length) {
          return null;
        }
        return (
          <button
            className="helper-info-button helpers-bento-info"
            type="button"
            data-info-title={t(helper.titleKey)}
            {...(helper.infoImages?.length
              ? { "data-info-images": JSON.stringify(helper.infoImages) }
              : { "data-info-image": helper.infoImage })}
            aria-label={helper.infoAriaKey ? t(helper.infoAriaKey) : t("Helper preview")}
            disabled={helper.disabled}
          >
            i
          </button>
        );
      }}
    />
  );
}
