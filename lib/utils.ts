/**
 * Races a promise against a timeout. Rejects with a descriptive error if
 * the promise doesn't resolve within `ms` milliseconds.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label?: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => {
      reject(
        new Error(
          label
            ? `${label} timed out after ${ms}ms`
            : "This is taking longer than expected. Please check your connection and try again.",
        ),
      );
    }, ms);
    promise
      .then((value) => {
        clearTimeout(id);
        resolve(value);
      })
      .catch((e) => {
        clearTimeout(id);
        reject(e);
      });
  });
}
