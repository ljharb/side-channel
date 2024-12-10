declare namespace getSideChannel {
	type Channel<V, K> = {
		assert: (key: K) => void;
		has: (key: K) => boolean;
		get: (key: K) => V | undefined;
		set: (key: K, value: V) => void;
		delete: (key: K) => boolean;
	}
}

declare function getSideChannel<V, K>(): getSideChannel.Channel<V, K>;

export = getSideChannel;
