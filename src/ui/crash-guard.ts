// Imported first by main.js, so that errors anywhere after it, even while the
// rest of the game is still loading, bring up the crash screen.
import { installCrashScreen } from './crash.ts';

installCrashScreen();
