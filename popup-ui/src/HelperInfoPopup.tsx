import { useCallback, useLayoutEffect, useRef } from "react";
import { extensionAssetUrl } from "./utils";

type Props = {
  open: boolean;
  anchorEl: HTMLElement | null;
  title: string;
  images: string[];
  imageIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  t: (key: string) => string;
};

export function HelperInfoPopup({
  open,
  anchorEl,
  title,
  images,
  imageIndex,
  onClose,
  onPrev,
  onNext,
  t,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  const position = useCallback(() => {
    if (!open || !anchorEl || !rootRef.current) {
      return;
    }

    const buttonRect = anchorEl.getBoundingClientRect();
    const popupRect = rootRef.current.getBoundingClientRect();
    const margin = 10;
    const gap = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spaceRight = viewportWidth - buttonRect.right;
    const placeLeft = spaceRight < popupRect.width + gap + margin;
    const left = placeLeft
      ? Math.max(margin, buttonRect.left - popupRect.width - gap)
      : Math.min(viewportWidth - popupRect.width - margin, buttonRect.right + gap);
    const top = Math.min(
      Math.max(margin, buttonRect.top + buttonRect.height / 2 - popupRect.height / 2),
      viewportHeight - popupRect.height - margin,
    );
    const arrowTop = Math.min(
      Math.max(18, buttonRect.top + buttonRect.height / 2 - top),
      popupRect.height - 18,
    );

    rootRef.current.style.setProperty("--helper-info-left", `${left}px`);
    rootRef.current.style.setProperty("--helper-info-top", `${top}px`);
    rootRef.current.style.setProperty("--helper-info-arrow-top", `${arrowTop}px`);
    rootRef.current.dataset.placement = placeLeft ? "left" : "right";
  }, [open, anchorEl]);

  useLayoutEffect(() => {
    position();
  }, [position, open, title, images, imageIndex]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, position]);

  if (!open) {
    return null;
  }

  const i = Math.max(0, Math.min(imageIndex, images.length - 1));
  const src = images[i] ? extensionAssetUrl(images[i]) : "";

  return (
    <div
      ref={rootRef}
      className="helper-info-popup"
      aria-hidden="false"
      data-open="true"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="helper-info-card" role="dialog" aria-modal="false" aria-labelledby="helperInfoTitle">
        <div className="helper-info-head">
          <p id="helperInfoTitle" className="helper-info-title">
            {title}
          </p>
          <button
            className="helper-info-close"
            type="button"
            aria-label={t("Close helper preview")}
            onClick={onClose}
          >
            {t("Close")}
          </button>
        </div>
        <img
          className="helper-info-image"
          alt={`${title} preview`}
          src={src}
          onLoad={position}
        />
        {images.length > 1 ? (
          <div className="helper-info-nav">
            <button
              className="helper-info-nav-button"
              type="button"
              aria-label={t("Previous image")}
              disabled={i === 0}
              onClick={onPrev}
            >
              &#8592;
            </button>
            <span className="helper-info-nav-counter">
              {i + 1} / {images.length}
            </span>
            <button
              className="helper-info-nav-button"
              type="button"
              aria-label={t("Next image")}
              disabled={i === images.length - 1}
              onClick={onNext}
            >
              &#8594;
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
