type ListNode<T, K> = {
	key: K;
	next: ListNode<T, K>;
	value: T;
};
type RootNode<T, K> = {
	key: object;
	next: null | ListNode<T, K>;
};

export function listGetNode<T, K>(list: RootNode<T, K>, key: ListNode<T, K>['key']): ListNode<T, K> | void;
export function listGet<T, K>(objects: RootNode<T, K>, key: ListNode<T, K>['key']): T | void;
export function listSet<T, K>(objects: RootNode<T, K>, key: ListNode<T, K>['key'], value: T): void;
export function listHas<T, K>(objects: RootNode<T, K>, key: ListNode<T, K>['key']): boolean;
