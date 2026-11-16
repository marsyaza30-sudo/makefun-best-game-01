// Prism Drift — keyboard and mouse input. Held keys give a movement direction; taps queue
// one-shot actions the game loop drains once a frame; number keys ask for a facet directly;
// the pointer steers the catcher and its press both confirms menus and cycles the facet in
// play — the game loop decides which meaning a press has from the screen it is on.

export const ACTION_CONFIRM = 1;
export const ACTION_CYCLE_NEXT = 2;
export const ACTION_CYCLE_PREV = 4;
export const ACTION_PAUSE = 8;
export const ACTION_MUTE = 16;

const FACET_KEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };

export function createInput(canvas) {
  const held = { left: false, right: false };
  let queuedActions = 0;
  let facetRequest = -1;
  let pointerClientX = null;

  window.addEventListener('keydown', (event) => {
    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        held.left = true;
        event.preventDefault();
        break;
      case 'ArrowRight':
      case 'KeyD':
        held.right = true;
        event.preventDefault();
        break;
      case 'Space':
        queuedActions |= ACTION_CONFIRM | ACTION_CYCLE_NEXT;
        event.preventDefault();
        break;
      case 'Enter':
        queuedActions |= ACTION_CONFIRM;
        break;
      case 'KeyE':
        queuedActions |= ACTION_CYCLE_NEXT;
        break;
      case 'KeyQ':
        queuedActions |= ACTION_CYCLE_PREV;
        break;
      case 'KeyP':
      case 'Escape':
        queuedActions |= ACTION_PAUSE;
        break;
      case 'KeyM':
        queuedActions |= ACTION_MUTE;
        break;
      default:
        if (Object.prototype.hasOwnProperty.call(FACET_KEYS, event.code)) {
          facetRequest = FACET_KEYS[event.code];
        }
        break;
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') held.left = false;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') held.right = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    pointerClientX = event.clientX;
  });

  canvas.addEventListener('pointerdown', (event) => {
    pointerClientX = event.clientX;
    queuedActions |= ACTION_CONFIRM | ACTION_CYCLE_NEXT;
  });

  function direction() {
    return (held.right ? 1 : 0) - (held.left ? 1 : 0);
  }

  function takeActions() {
    const actions = queuedActions;
    queuedActions = 0;
    return actions;
  }

  function takeFacetRequest() {
    const facet = facetRequest;
    facetRequest = -1;
    return facet;
  }

  function pointerX() {
    return pointerClientX;
  }

  return { direction, takeActions, takeFacetRequest, pointerX };
}
