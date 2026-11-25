export default {
	guid: function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		    return v.toString(16);
		});
	},
	
	getId: function(o) {
		if(typeof o.__guid == 'undefined') {
			o.__guid = this.guid();
		}
		return o.__guid;
	},

	// Copies the properties of each source onto the target, as jQuery's extend did:
	// a missing source is passed over, and so is a property that is undefined
	extend: function(target) {
		for(var i = 1; i < arguments.length; i++) {
			var source = arguments[i];
			if(source == null) {
				continue;
			}
			for(var name in source) {
				var value = source[name];
				if(value !== undefined && value !== target) {
					target[name] = value;
				}
			}
		}
		return target;
	}
};
