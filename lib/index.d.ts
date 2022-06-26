/**  @license Atomic State
 * Copyright (c) Dany Beltran
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React from "react";
import { Observervable, createObserver } from "./observable";
import { ActionsObjectType, Atom, Filter, FilterGet, useAtomType } from "./types";
export { Observervable, createObserver };
export type { ActionsObjectType, Atom, Filter, FilterGet, useAtomType };
export declare const AtomicState: React.FC<{
    children: any;
    /**
     * Set default values using an atom's key
     */
    atoms?: {
        [key: string]: any;
    };
    /**
     * Set default filters' values using filter key
     */
    filters?: {
        [key: string]: any;
    };
    /**
     * The prefix added to atoms inside this component
     */
    prefix?: string;
}>;
/**
 * Creates an atom containing state
 */
export declare function atom<R, ActionsArgs = any>(init: Atom<R, ActionsArgs>): Atom<R, ActionsArgs>;
export declare const createAtom: typeof atom;
export declare function filter<R>(init: Filter<R | Promise<R>>): {
    (): R;
    "filter-name": string;
    "init-object": Filter<R | Promise<R>>;
};
export declare function useFilter<T>(f: (() => T | Promise<T>) | Filter<T | Promise<T>>): T;
/**
 * Get an atom's value and state setter
 */
export declare function useAtom<R, ActionsArgs = any>(atom: Atom<R, ActionsArgs>): [R, (cb: R | ((c: R) => R)) => void, ActionsObjectType<ActionsArgs>];
/**
 * Get an atom's value
 */
export declare function useValue<R>(atom: useAtomType<R> | Atom<R, any>): R;
export declare const useAtomValue: typeof useValue;
/**
 * Get the function that updates the atom's value
 */
export declare function useDispatch<R>(atom: useAtomType<R> | Atom<R, any>): (cb: R | ((c: R) => R)) => void;
export declare const useAtomDispatch: typeof useDispatch;
/**
 * Get the actions of the atom as reducers
 */
export declare function useActions<R, ActionsArgs = any>(atom: useAtomType<R, ActionsArgs> | Atom<R, ActionsArgs>): ActionsObjectType<ActionsArgs>;
export declare const useAtomActions: typeof useActions;
/**
 * Get all localStorage items as an object (they will be JSON parsed). You can pass default values (which work with SSR) and a type argument
 */
export declare function useStorage<K = any>(defaults?: K): K;
export declare const storage: {
    /**
     * Set an item in localStorage. Its value will be serialized as JSON
     */
    set<T = any>(k: string, v: T): void;
    /**
     * Remove a localStorage item
     */
    remove(k: string): Promise<void>;
    /**
     * Get an item in localStorage. Its value will be JSON parsed. If it does not exist or
     * is an invalid JSON format, the default value passed in the second argument will be returned
     */
    get<T_1 = any>(k: string, def?: T_1): T_1;
};
/**
 * Get a localStorage item. Whenever `storage.set` or `storage.remove` are called,
 * this hook will update its state
 */
export declare function useStorageItem<T = any>(k: string, def?: T): T;
