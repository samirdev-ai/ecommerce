export function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const SIMULATE_FAILURES = false;

export function maybeFail(rate = 0.04): void {
  if (SIMULATE_FAILURES && Math.random() < rate) {
    throw { status: 500, data: "Simulated upstream failure" };
  }
}
