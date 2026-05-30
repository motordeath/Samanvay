export async function safeAudit<T>(
  fn: () => Promise<T>
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error('Audit failure', error);
  }
}
