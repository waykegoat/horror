import { Game } from './core/Game.js';

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  window.__horrorGame = game;

  window.addEventListener('blur', () => {
    if (game.state === 'PLAYING') {
      const escEvent = new KeyboardEvent('keydown', { code: 'Escape' });
      window.dispatchEvent(escEvent);
    }
  });
});
