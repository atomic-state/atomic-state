/**
 * An observable class that uses the observer pattern
 */
export declare class Observervable {
    suscribers: any;
    constructor();
    addSubscriber(messageName: string, subscriber: any): Promise<void>;
    removeSubscriber(messageName: string, subscriber: any): Promise<void>;
    update(messageName: string, payload: any): Promise<void>;
}
export declare function createObserver(): {
    observer: Observervable;
    notify: (storeName: string, hookCall: string, payload: any) => void;
};
