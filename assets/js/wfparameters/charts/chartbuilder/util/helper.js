var isArray = require("lodash/isArray");
var isUndefined = require("lodash/isUndefined");
var keys = require("lodash/keys");
var reduce = require("lodash/reduce");
var d3Array = require("d3-array");

function niceExtent(extent) {
	// was:
	//var extent = d3.extent(data);
	//var niced = d3.scale.linear()
	//		.domain(extent)
	//		.nice()
	//		.domain();
	//
	// ... now, let's see if we can nix a gazillion deps by nixing d3.scale.linear
	//
  // from https://github.com/d3/d3-scale/blob/master/src/linear.js:
	var count = 10;
	var start = extent[0], stop = extent[1];
  var step = d3Array.tickIncrement(start, stop, count);
  start = Math.floor(start / step) * step;
  stop = Math.ceil(stop / step) * step;
  step = d3Array.tickIncrement(start, stop, count);
  start = Math.floor(start / step) * step;
  stop = Math.ceil(stop / step) * step;
  return [ start, stop ];
}

/**
 * Generate an exact number of ticks given a domain
 *
 * @param {number[]} domain - min/max of the current scale
 * @param {number} numticks - desired number of ticks
 * @return {string[]} Array of ticks
 * @static
 * @memberof helper
 */
function exact_ticks(domain, numticks) {
	numticks -= 1;
	var ticks = [];
	var delta = domain[1] - domain[0];
	var i;
	for (i = 0; i < numticks; i++) {
		ticks.push(domain[0] + (delta / numticks) * i);
	}
	ticks.push(domain[1]);

	if (domain[1] * domain[0] < 0) {
		//if the domain crosses zero, make sure there is a zero line
		var hasZero = false;
		for (i = ticks.length - 1; i >= 0; i--) {
			//check if there is already a zero line
			if (ticks[i] === 0) {
				hasZero = true;
			}
		}
		if (!hasZero) {
			ticks.push(0);
		}
	}

	return ticks;
}

/**
 * compute_scale_domain
 *
 * @param scaleObj - Current scale before generating new domain
 * @param {number[]} data - All values in the current scale
 * @param {object} opts - Whether to return nice values or force a minimum of 0
 * or below
 * @return {object} { domain: [min, max], custom: <boolean> }
 * @static
 * @memberof helper
 */
function compute_scale_domain(scaleObj, data, opts) {
	// Compute the domain (`[min, max]`) of a scale based on its data points.
	// `data` is a flat array of all values used in this scale, and is
	// created by `input-parsers/parse-<chart>.js`
	opts = opts || {};
	var scaleDomain = scaleObj.domain || [];
	var _domain;
	var defaultMin;
	var defaultMax;

	if (!isArray(data)) {
		throw new TypeError("data passed to compute_scale_domain must be an array");
	}

	var extent = d3Array.extent(data);
	var niced = niceExtent(extent);

	if (!scaleObj.domain || !scaleObj.custom) {
		if (opts.nice) {
			_domain = niced;
		} else {
			_domain = extent;
		}
		defaultMin = true;
		defaultMax = true;
	} else {
		_domain = (opts.nice) ? niced : extent;
		defaultMin = (_domain[0] === scaleDomain[0] || isUndefined(scaleDomain[0]));
		defaultMax = (_domain[1] === scaleDomain[1] || isUndefined(scaleDomain[1]));
		_domain = scaleDomain;
	}

	if (opts.minZero) {
		_domain[0] = Math.min(_domain[0], 0);
	}

	return {
		domain: _domain,
		custom: (!defaultMin || !defaultMax)
	};
}

/**
 * precision
 *
 * @param a
 * @static
 * @memberof helper
 * @return {undefined}
 */
function precision(a) {
  // http://stackoverflow.com/a/27865285/1181761

  // guard for NaN
  if (a === a) {
		var e = 1;
		while (Math.round(a * e) / e !== a) e *= 10;
		return Math.round(Math.log(e) / Math.LN10);
  } else {
		return 0;
  }
}

/**
 * Given a the domain of a scale suggest the most numerous number
 * of round number ticks that it cold be divided into while still containing
 values evenly divisible by 1, 2, 2.5, 5, 10, or 25.
 * @param {array} domain - An array of two number like objects
 * @returns {integer} - Result is a single integer representing a nice number of ticks to use
 * @static
 * @memberof helper
*/
function suggest_tick_num(domain) {
	var MAX_TICKS = 10;
	var INTERVAL_BASE_VALS = [1, 2, 2.5, 5, 10, 25];
	var range = Math.abs(domain[0] - domain[1])
	var minimum = range / MAX_TICKS;
	var digits = Math.floor(range).toString().length;
	var multiplier = Math.pow(10, (digits - 2));

	var acceptable_intervals = reduce(INTERVAL_BASE_VALS, function(prev, curr) {
		var mult = curr * multiplier;

		if (mult >= minimum) {
			prev = prev.concat([mult]);
		}

		return prev;
	}, []);

	for (var i = 0; i < acceptable_intervals.length; i++) {
		var interval = acceptable_intervals[i]
		if(range % interval == 0) {
			return (range / interval) + 1
		}
	};

	return 11;
}

/**
 * Helper functions!
 * @name helper
 */
var helper = {
	exactTicks : exact_ticks,
	computeScaleDomain: compute_scale_domain,
	precision: precision,
	suggestTickNum: suggest_tick_num,
};

module.exports = helper;
