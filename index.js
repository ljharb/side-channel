'use strict';

var inspect = require('object-inspect');

var $TypeError = TypeError;
var $WeakMap = typeof WeakMap === 'undefined' ? undefined : WeakMap;
var $Map = typeof Map === 'undefined' ? undefined : Map;

var $bind = Function.prototype.bind;
var $call = Function.prototype.call;
var uncurryThis = $bind
	? $bind.bind($call)
	// @ts-ignore
	: function uncurryThis(f) {
		return function () {
			// @ts-ignore
			return $call.apply(f, arguments);
		};
	};

/**
 * @template {(this: unknown, ...args: any[]) => unknown} T
 * @typedef {(self: ThisParameterType<T>, ...args: Parameters<T>) => ReturnType<T>} UncurryThis
 */

/** @type {UncurryThis<WeakMap<any, any>['get']>} */
var $weakMapGet;
/** @type {UncurryThis<WeakMap<any, any>['set']>} */
var $weakMapSet;
/** @type {UncurryThis<WeakMap<any, any>['has']>} */
var $weakMapHas;
if ($WeakMap) {
	$weakMapGet = uncurryThis($WeakMap.prototype.get);
	$weakMapSet = uncurryThis($WeakMap.prototype.set);
	$weakMapHas = uncurryThis($WeakMap.prototype.has);
}

/** @type {UncurryThis<Map<any, any>['get']>} */
var $mapGet;
/** @type {UncurryThis<Map<any, any>['set']>} */
var $mapSet;
/** @type {UncurryThis<Map<any, any>['has']>} */
var $mapHas;
if ($Map) {
	$mapGet = uncurryThis($Map.prototype.get);
	$mapSet = uncurryThis($Map.prototype.set);
	$mapHas = uncurryThis($Map.prototype.has);
}

/*
 * This function traverses the list returning the node corresponding to the given key.
 *
 * That node is also moved to the head of the list, so that if it's accessed again we don't need to traverse the whole list. By doing so, all the recently used nodes can be accessed relatively quickly.
 */
/** @type {import('.').listGetNode} */
var listGetNode = function (list, key) { // eslint-disable-line consistent-return
	/** @type {typeof list | NonNullable<(typeof list)['next']>} */
	var prev = list;
	/** @type {(typeof list)['next']} */
	var curr;
	for (; (curr = prev.next) !== null; prev = curr) {
		if (curr.key === key) {
			prev.next = curr.next;
			// eslint-disable-next-line no-extra-parens
			curr.next = /** @type {NonNullable<typeof list.next>} */ (list.next);
			list.next = curr; // eslint-disable-line no-param-reassign
			return curr;
		}
	}
};

/** @type {import('.').listGet} */
var listGet = function (objects, key) {
	var node = listGetNode(objects, key);
	return node && node.value;
};
/** @type {import('.').listSet} */
var listSet = function (objects, key, value) {
	var node = listGetNode(objects, key);
	if (node) {
		node.value = value;
	} else {
		// Prepend the new node to the beginning of the list
		objects.next = /** @type {import('.').ListNode<typeof value>} */ ({ // eslint-disable-line no-param-reassign, no-extra-parens
			key: key,
			next: objects.next,
			value: value
		});
	}
};
/** @type {import('.').listHas} */
var listHas = function (objects, key) {
	return !!listGetNode(objects, key);
};

/** @type {import('.')} */
module.exports = function getSideChannel() {
	/** @type {WeakMap<object, unknown>} */ var $wm;
	/** @type {Map<object, unknown>} */ var $m;
	/** @type {import('.').RootNode<unknown>} */ var $o;

	/** @type {import('.').Channel} */
	var channel = {
		assert: function (key) {
			if (!channel.has(key)) {
				throw new $TypeError('Side channel does not contain ' + inspect(key));
			}
		},
		get: function (key) { // eslint-disable-line consistent-return
			if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
				if ($wm) {
					return $weakMapGet($wm, key);
				}
			} else if ($Map) {
				if ($m) {
					return $mapGet($m, key);
				}
			} else {
				if ($o) { // eslint-disable-line no-lonely-if
					return listGet($o, key);
				}
			}
		},
		has: function (key) {
			if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
				if ($wm) {
					return $weakMapHas($wm, key);
				}
			} else if ($Map) {
				if ($m) {
					return $mapHas($m, key);
				}
			} else {
				if ($o) { // eslint-disable-line no-lonely-if
					return listHas($o, key);
				}
			}
			return false;
		},
		set: function (key, value) {
			if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
				if (!$wm) {
					$wm = new $WeakMap();
				}
				$weakMapSet($wm, key, value);
			} else if ($Map) {
				if (!$m) {
					$m = new $Map();
				}
				$mapSet($m, key, value);
			} else {
				if (!$o) {
					// Initialize the linked list as an empty node, so that we don't have to special-case handling of the first node: we can always refer to it as (previous node).next, instead of something like (list).head
					$o = { key: {}, next: null };
				}
				listSet($o, key, value);
			}
		}
	};
	return channel;
};
