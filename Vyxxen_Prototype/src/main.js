import './style.css';
import { Game } from './game.js';

export let game;
try {
  game = new Game();
} catch (error) {
  console.error(error);
  const screen = document.getElementById('error-screen');
  screen.classList.remove('hidden');
  screen.innerHTML = '<div><h1>Flight systems<br><span>offline.</span></h1><p>Vyxxen needs a desktop browser with WebGL enabled.<br>Enable hardware acceleration and reload to try again.</p></div>';
}
