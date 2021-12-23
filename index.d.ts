/**  @license Atomic State
 * Copyright (c) Dany Beltran
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Dispatch, SetStateAction } from "react";
declare type AtomType<T> = {
    name: string;
    default: T;
    localStoragePersistence?: boolean;
    actions?: {
        [name: string]: (st: {
            args: any;
            state: T;
            dispatch: Dispatch<SetStateAction<T>>;
        }) => void;
    };
};
/**
 * Creates an atom containing state
 */
export declare function atom<R>(init: AtomType<R>): () => (R | Dispatch<SetStateAction<R>> | {
    [name: string]: (args?: any) => void;
})[];
export declare const createAtom: typeof atom;
declare type useAtomType<R> = () => (R | Dispatch<SetStateAction<R>> | {
    [name: string]: (args?: any) => void;
})[];
/**
 * Get an atom's value and state setter
 */
export declare function useAtom<R>(atom: useAtomType<R>): [R, (cb: R | ((c: R) => R)) => void, {
    [name: string]: (args?: any) => void;
}];
/**
 * Get an atom's value
 */
export declare function useValue<R>(atom: useAtomType<R>): R;
export declare const useAtomValue: typeof useValue;
/**
 * Get the function that updates the atom's value
 */
export declare function useDispatch<R>(atom: useAtomType<R>): (cb: R | ((c: R) => R)) => void;
export declare const useAtomDispatch: typeof useDispatch;
/**
 * Get the actions of the atom as reducers
 */
export declare function useActions<R>(atom: useAtomType<R>): {
    [name: string]: (args?: any) => void;
};
export declare const useAtomActions: typeof useActions;
export declare function useStorage(): {
    [key: string]: any;
};
export declare const storage: {
    set(k: string, v: any): Promise<void>;
    remove(k: string): Promise<void>;
    get(k: string): any;
};
export {};
