/**
 * An observable class that uses the observer pattern
 */
export class Observervable {
  suscribers: any
  constructor() {
    this.suscribers = {}
  }
  async addSubscriber(messageName: string, subscriber: any) {
    if (!(messageName in this.suscribers)) {
      this.suscribers[messageName] = {}
    }
    let subscriberId = Object.keys(this.suscribers[messageName]).length + 1
    this.suscribers[messageName][subscriberId] = subscriber
  }
  async removeSubscriber(messageName: string, subscriber: any) {
    for (let observer in this.suscribers[messageName]) {
      if (this.suscribers[messageName][observer] === subscriber) {
        delete this.suscribers[messageName][observer]
      }
    }
  }
  async update(messageName: string, payload: any) {
    for (let subscribers in this.suscribers[messageName]) {
      await this.suscribers[messageName][subscribers](payload)
    }
  }
}

export function createObserver() {
  const observer = new Observervable()
  function notify(storeName: string, hookCall: string, payload: any) {
    observer.update(storeName, { storeName, hookCall, payload })
  }
  return {
    observer: observer,
    notify,
  }
}
