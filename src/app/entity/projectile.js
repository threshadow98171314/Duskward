import $ from '../../vendor/jquery.js';
import WorldEntity from './worldentity.js';
import Graphics from '../graphics/graphics.js';

var Projectile = function(options) {
	this.options = $.extend({}, this.options, options);
};
Projectile.prototype = new WorldEntity({
	className: 'projectile'
});
Projectile.constructor = Projectile;

Projectile.prototype.el = function() {
	if(this._el == null) {
		this._el = WorldEntity.prototype.el.call(this)
			.addClass(this.options.projectileClass)
			.append(Graphics.make('projectileInner'));
	}
	return this._el;
};

export default Projectile;
