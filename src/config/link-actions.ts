/**
 * Link actions that need a feature the template may not ship. Panels are built (src/features/panels);
 * booking is switched on when its feature lands (task 95). Until an action is on, the Studio doesn't
 * offer it and no schema field references a document type that doesn't exist.
 */
export const LINK_ACTIONS: { panel: boolean; booking: boolean } = {
  panel: true,
  booking: false,
}

export type OverlayKind = 'panel' | 'booking'

/**
 * How the overlays find their triggers. A panel or booking link renders
 * `<button data-overlay-kind="panel|booking" data-overlay-id="...">`. The panel controller
 * (features/panels/components/panel-controller.tsx) adds one
 * delegated listener, `document.addEventListener('click', ...)`, finds the trigger with
 * `event.target.closest('[data-overlay-kind]')` and calls `event.preventDefault()` (which also
 * stops the fallback form submitting) before opening its dialog.
 */
export const OVERLAY_TRIGGER_SELECTOR = '[data-overlay-kind]'
