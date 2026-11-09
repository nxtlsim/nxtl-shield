import { runShare, shareError, type ShareJob } from "./share-crypto";

self.onmessage = async (event: MessageEvent<{ id: number; job: ShareJob }>) => {
  const { id, job } = event.data;
  try {
    const result = await runShare(job);
    if (result.kind === "binary" || result.kind === "file") {
      const copy = new Uint8Array(result.bytes);
      self.postMessage({ id, ok: true, result: { ...result, bytes: copy } }, { transfer: [copy.buffer] });
      return;
    }
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    self.postMessage({ id, ok: false, message: error instanceof Error ? error.message : shareError(error) });
  }
};
