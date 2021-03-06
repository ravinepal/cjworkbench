// Parse a string of TSV or CSV. Returns a flat array of objects of the form { column: value }
// as well as the column names using `d3.dsv`

var d3Dsv = require("d3-dsv");
var each = require("lodash/each");
var parseUtils = require("./parse-utils");
var unique = require("lodash/uniq");
var separators = {
  decimal: ".",
  thousands: ","
};

var stripChars = [
	"$",
	"£",
	"€",
	"%"
];

var newLineRegex = /\r\n|\r|\n/;

function parseDelimInput(input, opts) {
	var hasDate = null;
	var isNumeric = null;

	opts = opts || {};
	var _defaultOpts = Object.assign({
		delimiter: parseUtils.detectDelimiter(input),
		type: opts.type,
		inputTZ: "Z"
	}, opts);

	if (opts.checkForDate === false) {
		_defaultOpts.type = "ordinal";
	}

	// create regex of special characters we want to strip out as well as our
	// computed locale-specific thousands separator.
	var _stripCharsStr = stripChars.concat([separators.thousands]).reduce(function(a, b) {
		return a.concat(parseUtils.escapeRegExp(b));
	}, []).join("|");
	var stripCharsRegex = new RegExp(_stripCharsStr, "g");

	var columnNames = input.split(newLineRegex)[0].split(_defaultOpts.delimiter);
	var dsv = d3Dsv.dsvFormat(_defaultOpts.delimiter, "text/plain");
	var all_index_types = [];

	var casted_data = cast_data(input, columnNames, stripCharsRegex, _defaultOpts);
	var data = casted_data.data;
	all_index_types = casted_data.indexes;
	var all_entry_values = casted_data.entries;
	var index_types = unique(all_index_types);

	if(index_types.length !== 1 && !_defaultOpts.type) {
		//there is possilby more than one type of data, an error will be thrown in validate-data-input
	} else {
		hasDate = _defaultOpts.type ? _defaultOpts.type == "date" : index_types[0] === "date";
		isNumeric = _defaultOpts.type ? _defaultOpts.type == "numeric" : index_types[0] === "number";

		if(isNumeric && !_defaultOpts.type && _defaultOpts.checkForDate) {
			// if the entries are certain four digit numbers that look like years reparse as years if there isn't a specified type
			var entry_extent = d3Array.extent(all_entry_values);
			if(entry_extent[0] > 1500 && entry_extent[1] < 3000) {
				var _forceDate = Object.assign(_defaultOpts, { type: "date" });
				data = cast_data(input, columnNames, stripCharsRegex, _forceDate).data;
				isNumeric = false;
				hasDate = true;
			}
		}
	}

	return {
		data: data,
		columnNames: columnNames,
		hasDate: hasDate,
		isNumeric: isNumeric,
		type: _defaultOpts.type
	};
}

function cast_data(input, columnNames, stripCharsRegex, opts) {
	var dsv = d3Dsv.dsvFormat(opts.delimiter, "text/plain");
	var all_index_types = [];
	var all_entry_values = [];

	var tz_pattern = /([+-]\d\d:*\d\d)/gi;
	var found_timezones = input.match(tz_pattern);

	var data = dsv.parse(input, function(d,ii) {
		var curOffset = (new Date()).getTimezoneOffset();
		each(columnNames, function(column, i) {
			if (i === 0) {
				//first column

				var parsed = parseKeyColumn(d[column], opts.type);

				all_index_types.push(parsed.type);
				all_entry_values.push(parsed.val);
				d[column] = parsed.val;
			}
			else {
				// all other columns

				d[column] = parseValue(d[column], stripCharsRegex, separators.decimal);
			}
		});
		return d;
	});

	return {
		data: data,
		indexes: all_index_types,
		entries: all_entry_values
	};
}

function parseValue(val, _stripChars, decimal) {
	if (_stripChars.test(val)) {
		val = val.replace(_stripChars, "").replace(decimal, ".");
	}

	if (isNaN(parseFloat(val)) === false) {
		return +val;
	} else if (val == "null") {
		return null;
	} else {
		return val;
	}
}

function parseKeyColumn(entry, type) {

	if (type == "ordinal") {
		return {type: "string", val: entry};
	}

	var num = Number(entry);
	if ((num && !type) || type == "numeric") {
		return {type: "number", val: num};
	} else {
		return {type: "string", val: entry};
	}
}

module.exports = {
	parser: parseDelimInput,
};
