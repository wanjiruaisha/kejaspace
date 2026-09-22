export async function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = 90000
) {
  const controller = new AbortController();
  const externalSignal = options.signal;
  let timedOut = false;

  function cancelRequest() {
    controller.abort();
  }

  if (externalSignal?.aborted) {
    controller.abort();
  } else {
    externalSignal?.addEventListener("abort", cancelRequest, {
      once: true,
    });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut && !externalSignal?.aborted) {
      throw new Error(
        "The server took too long to respond. Please try again shortly."
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", cancelRequest);
  }
}