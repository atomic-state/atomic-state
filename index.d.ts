import { Dispatch, SetStateAction } from "react";
export declare function createAtom<T>(init: {
    /**
     * Name of the store
     */
    name: string;
    /**
     * Default value for state
     */
    default: T;
    /**
     * Whether to save state to the `localStorage` object
     */
    localStoragePersistence?: boolean;
    /**
     * Actions/reducers of the state.
     * These will keep the state synchronised across multiple components
     * and if `localStoragePersistence` is `true` , also synchronised
     * with `localStorage`
     */
    actions?: {
        [name: string]: (st: {
            args: any;
            state: T;
            dispatch: Dispatch<SetStateAction<T>>;
        }) => void;
    };
}): () => [T, (cb: T | ((c: T) => T)) => void, {
    [name: string]: (args?: any) => void;
}];
declare type atomType<T> = () => [
    T,
    (cb: ((c: T) => T) | T) => void,
    {
        [name: string]: (args?: any) => void;
    }
];
export declare function useAtom<T>(atom: atomType<T>): [T, (cb: T | ((c: T) => T)) => void, {
    [name: string]: (args?: any) => void;
}];
export declare function useAtomValue<T>(atom: atomType<T>): T;
export declare function useAtomDispatch<T>(atom: atomType<T>): (cb: T | ((c: T) => T)) => void;
export declare function useAtomActions<T>(atom: atomType<T>): {
    [name: string]: (args?: any) => void;
};
export declare const atom: typeof createAtom;
export declare const useActions: typeof useAtomActions;
export declare const useValue: typeof useAtomValue;
export declare const useDispatch: typeof useAtomDispatch;
export {};
