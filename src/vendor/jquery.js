// jQuery as an ES module. The vendored build is a classic script that puts jQuery
// on window, so it is loaded for its side effect and window.jQuery is exported.
// It stays at 2.0.3, the version the game shipped with, until the UI is rewritten.
import './jquery-2.0.3.min.js';

export default window.jQuery;
