// Streams newline-delimited JSON events from the backend.
export async function streamMovies({ language, genre, year }, onEvent, signal) {
  const qs = new URLSearchParams({ language, genre, year });
  const res = await fetch(`/api/movies/stream?${qs}`, { signal });
  if (!res.ok) {
    let msg = `Server error (${res.status})`;
    try { msg = (await res.json()).detail || msg; } catch {}
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) onEvent(JSON.parse(line));
    }
  }
  if (buf.trim()) onEvent(JSON.parse(buf));
}
