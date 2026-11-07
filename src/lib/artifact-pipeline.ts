/** Leave outbound capacity for private database operations in the Worker. */
export async function mapArtifacts<T, R>(items: T[], work: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let offset = 0; offset < items.length; offset += 4) {
    // Await the whole batch even on failure before releasing a finalization lease.
    const batch = await Promise.allSettled(items.slice(offset, offset + 4).map((item, i) => work(item, offset + i)));
    const failed = batch.find(result => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
    for (const result of batch) if (result.status === 'fulfilled') results.push(result.value);
  }
  return results;
}