import { runShare, shareError, type ShareJob } from "./share-crypto";

self.onmessage = async (event: MessageEvent<{ id: number; job: ShareJob }>) => {
  const { id, job } = event.data;
  try {
    const result = await runShare(job);
    const transfer: ArrayBuffer[] = [];
    if (result.kind === "binary" || result.kind === "file") transfer.push(result.bytes.buffer as ArrayBuffer);
    self.postMessage({ id, ok: true, result }, { transfer });
  } catch (error) {
    self.postMessage({ id, ok: false, message: shareError(error) });
  }
};
