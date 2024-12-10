'use strict';

var GetIntrinsic = require('get-intrinsic');
var callBound = require('call-bind/callBound');
var inspect = require('object-inspect');

var $TypeError = require('es-errors/type');
var $WeakMap = GetIntrinsic('%WeakMap%', true);
var $Map = GetIntrinsic('%Map%', true);

/** @template T @typedef {<T extends (this: any, ...args: any[]) => any>(this: ThisParameterType<T>, ...args: Parameters<T>) => ReturnType<T>} CallBind */

/** @type {CallBind<<K extends object, V>(this: WeakMap<K, V>, key: K) => V>} */
var $weakMapGet = callBound('WeakMap.prototype.get', true);
/** @type {CallBind<typeof WeakMap.prototype.set>} */
var $weakMapSet = callBound('WeakMap.prototype.set', true);
/** @type {CallBind<typeof WeakMap.prototype.has>} */
var $weakMapHas = callBound('WeakMap.prototype.has', true);
/** @type {CallBind<typeof WeakMap.prototype.delete>} */
var $weakMapDelete = callBound('WeakMap.prototype.delete', true);
/** @type {CallBind<typeof Map.prototype.get>} */
var $mapGet = callBound('Map.prototype.get', true);
/** @type {CallBind<typeof Map.prototype.set>} */
var $mapSet = callBound('Map.prototype.set', true);
/** @type {CallBind<typeof Map.prototype.has>} */
var $mapHas = callBound('Map.prototype.has', true);
/** @type {CallBind<typeof Map.prototype.delete>} */
var $mapDelete = callBound('Map.prototype.delete', true);

/*
* This function traverses the list returning the node corresponding to the given key.
*
* That node is also moved to the head of the list, so that if it's accessed again we don't need to traverse the whole list.
* By doing so, all the recently used nodes can be accessed relatively quickly.
*/
/** @type {import('./list.d.ts').listGetNode} */
// eslint-disable-next-line consistent-return
var listGetNode = function (list, key, isDelete) {
	/** @type {typeof list | NonNullable<(typeof list)['next']>} */
	var prev = list;
	/** @type {(typeof list)['next']} */
	var curr;
	// eslint-disable-next-line eqeqeq
	for (; (curr = prev.next) != null; prev = curr) {
		if (curr.key === key) {
			prev.next = curr.next;
			if (!isDelete) {
				// eslint-disable-next-line no-extra-parens
				curr.next = /** @type {NonNullable<typeof list.next>} */ (list.next);
				list.next = curr; // eslint-disable-line no-param-reassign
			}
			return curr;
		}
	}
};

/** @type {import('./list.d.ts').listGet} */
// eslint-disable-next-line consistent-return
var listGet = function (objects, key) {
	if (objects) {
		var node = listGetNode(objects, key);
		return node && node.value;
	}
};
/** @type {import('./list.d.ts').listSet} */
var listSet = function (objects, key, value) {
	if (objects) {
		var node = listGetNode(objects, key);
		if (node) {
			node.value = value;
		} else {
		// Prepend the new node to the beginning of the list
			objects.next = /** @type {import('./list.d.ts').ListNode<typeof value, typeof key>} */ ({ // eslint-disable-line no-param-reassign, no-extra-parens
				key: key,
				next: objects.next,
				value: value
			});
		}
	}
};
/** @type {import('./list.d.ts').listHas} */
var listHas = function (objects, key) {
	if (!objects) {
		return false;
	}
	return !!listGetNode(objects, key);
};
/** @type {import('./list.d.ts').listDelete} */
// eslint-disable-next-line consistent-return
var listDelete = function (objects, key) {
	if (objects) {
		return listGetNode(objects, key, true);
	}
};

/** @type {import('.')} */
module.exports = function getSideChannel() {
	/** @typedef {ReturnType<typeof getSideChannel>} Channel */
	/** @typedef {Parameters<Channel['get']>[0]} K */
	/** @typedef {Parameters<Channel['set']>[1]} V */

	/** @type {WeakMap<K & object, V> | undefined} */ var $wm;
	/** @type {Map<K, V> | undefined} */ var $m;
	/** @type {import('./list.d.ts').RootNode<V, K> | undefined} */ var $o;

	/** @type {Channel} */
	var channel = {
		assert: function (key) {
			if (!channel.has(key)) {
				throw new $TypeError('Side channel does not contain ' + inspect(key));
			}
		},
		'delete': function (key) {
			if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
				if ($wm) {
					return $weakMapDelete($wm, key);
				}
			} else if ($Map) {
				if ($m) {
					return $mapDelete($m, key);
				}
			} else {
				if ($o) { // eslint-disable-line no-lonely-if
					var root = $o && $o.next;
					var deletedNode = listDelete($o, key);
					if (deletedNode && root && root === deletedNode) {
						$o = void undefined;
					}
					return !!deletedNode;
				}
			}
			return false;
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
				return listGet($o, key);
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
				return listHas($o, key);
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
					$o = { next: void undefined };
				}
				// eslint-disable-next-line no-extra-parens
				listSet(/** @type {NonNullable<typeof $o>} */ ($o), key, value);
			}
		}
	};
	// @ts-expect-error TODO: figure out why this is erroring
	return channel;
};
