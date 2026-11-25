// The crash screen comes first, so it also covers errors while the game loads
import '../ui/crash-guard.ts';
import { installIcons } from '../ui/icons.ts';
import Engine from './engine.js';

// The interface's icons, placed from the sprite list
installIcons(document);

// Initialize the board
Engine.init();
