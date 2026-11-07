export const REQUEST_TIMEOUT_MS = 15_000;

/** Bound the entire HTTP read, including its body, and abort timed-out work. */
export async function withRequestTimeout<T>(
  read: (signal: AbortSignal) => Promise<T>,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error('Catalogue request timed out');
      error.name = 'TimeoutError';
      reject(error);
      controller.abort(error);
    }, timeoutMs);
  });
  try {
    // The race also settles reads that do not react to the abort signal.
    return await Promise.race([Promise.resolve().then(() => read(controller.signal)), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
