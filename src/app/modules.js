// Late-bound references between modules that import each other.
//
// RequireJS let a module call require('app/x') from inside a function, so two
// modules could freely depend on each other. ES modules run in import order
// instead, and inside an import cycle a subclass can run before its base class
// (Block.prototype = new WorldEntity() then fails). The few calls that would
// close such a cycle, such as the entity base classes drawing through Graphics,
// look the module up here when they run. Each module that is looked up this way
// registers itself once it has loaded.
var registered = {};

export function register(name, module) {
	registered[name] = module;
}

export function getModule(name) {
	if(!registered.hasOwnProperty(name)) {
		throw new Error('Module ' + name + ' has not loaded yet');
	}
	return registered[name];
}
