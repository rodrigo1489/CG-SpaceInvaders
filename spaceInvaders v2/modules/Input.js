export const keys = {};

export function setupInput(onShootCallback) {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') onShootCallback();
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });
}
