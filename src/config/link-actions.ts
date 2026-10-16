/**
 * Link actions that need a feature the template doesn't ship yet. Switch each one on when its
 * feature lands (task 93 panels, task 95 booking); until then the Studio doesn't offer it and no
 * schema field references a document type that doesn't exist.
 */
export const LINK_ACTIONS: { panel: boolean; booking: boolean } = {
  panel: false,
  booking: false,
}

export type OverlayKind = 'panel' | 'booking'

/**
 * How the overlays find their triggers. A panel or booking link renders
 * `<button data-overlay-kind="panel|booking" data-overlay-id="...">`. The overlay feature adds one
 * delegated listener, `document.addEventListener('click', ...)`, finds the trigger with
 * `event.target.closest('[data-overlay-kind]')` and calls `event.preventDefault()` (which also
 * stops the fallback form submitting) before opening its dialog.
 */
export const OVERLAY_TRIGGER_SELECTOR = '[data-overlay-kind]'
