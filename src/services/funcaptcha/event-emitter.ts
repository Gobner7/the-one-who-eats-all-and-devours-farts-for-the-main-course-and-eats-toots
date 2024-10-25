type Listener = (...args: any[]) => void;

export class EventEmitter {
  private events: Map<string, Set<Listener>> = new Map();

  on(event: string, listener: Listener): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)?.add(listener);
  }

  off(event: string, listener: Listener): void {
    this.events.get(event)?.delete(listener);
    if (this.events.get(event)?.size === 0) {
      this.events.delete(event);
    }
  }

  emit(event: string, ...args: any[]): void {
    this.events.get(event)?.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}