const debugStorageKey = "the-word.debug";
const prefix = "[the-word]";

function readDebugFlag(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(debugStorageKey) === "1";
  } catch {
    return false;
  }
}

// Logs stay in the browser console; nothing is sent anywhere. Context should carry
// identifiers (edition, book, chapter), never user-typed text such as search queries.
export function createLogger({ sink = console, debugEnabled = readDebugFlag(), now = () => performance.now() } = {}) {
  return {
    error: (message, context) => sink.error(`${prefix} ${message}`, context),
    warn: (message, context) => sink.warn(`${prefix} ${message}`, context),
    debug(message, context) {
      if (debugEnabled) sink.debug(`${prefix} ${message}`, context);
    },
    // Times a whole operation and reports it only in debug mode; failures still propagate.
    async measure(label, context, task) {
      if (!debugEnabled) return task();
      const start = now();
      try {
        return await task();
      } finally {
        sink.debug(`${prefix} ${label} took ${Math.round(now() - start)}ms`, context);
      }
    },
  };
}

export const logger = createLogger();
