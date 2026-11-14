// Rename the single root folder in a GitHub ZIP without changing compressed file data.
export function renameRepositoryZip(input, repository) {
  if (!/^[A-Za-z0-9_.-]+$/.test(repository) || repository === '.' || repository === '..') throw new Error('Invalid repository name.');
  const bytes = input instanceof Uint8Array ? Uint8Array.from(input) : new Uint8Array(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = offset => view.getUint16(offset, true), u32 = offset => view.getUint32(offset, true);
  const fail = () => { throw new Error('The downloaded ZIP has an unsupported or invalid structure.'); };
  if (bytes.length < 22) fail();
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (u32(i) === 0x06054b50 && i + 22 + u16(i + 20) === bytes.length) { end = i; break; }
  }
  if (end < 0 || u16(end + 4) || u16(end + 6) || u16(end + 8) !== u16(end + 10)) fail();
  const count = u16(end + 10), centralSize = u32(end + 12), centralStart = u32(end + 16);
  if (!count || count === 0xffff || centralStart === 0xffffffff || centralSize === 0xffffffff || centralStart + centralSize !== end) fail();
  const decoder = new TextDecoder('utf-8', {fatal:true}), encoder = new TextEncoder();
  const decode = value => { try { return decoder.decode(value); } catch { fail(); } };
  const checkExtra = (start, length) => {
    const endExtra = start + length;
    while (start < endExtra) {
      if (start + 4 > endExtra) fail();
      const kind = u16(start), size = u16(start + 2); start += 4;
      if (start + size > endExtra || kind === 0x0001 || kind === 0x7075) fail();
      start += size;
    }
  };
  const entries = []; let cursor = centralStart, root;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || u32(cursor) !== 0x02014b50 || (u16(cursor + 8) & 1)) fail();
    const nameLength = u16(cursor + 28), extraLength = u16(cursor + 30), commentLength = u16(cursor + 32);
    const recordEnd = cursor + 46 + nameLength + extraLength + commentLength, local = u32(cursor + 42);
    if (recordEnd > end || local === 0xffffffff || u32(cursor + 20) === 0xffffffff || u32(cursor + 24) === 0xffffffff || u16(cursor + 34)) fail();
    const name = decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    const parts = name.split('/');
    if (parts.length < 2 || !parts[0] || parts.some((part, index) => part === '.' || part === '..' || (part === '' && index !== parts.length - 1)) || name.includes('\\')) fail();
    if (root === undefined) root = parts[0]; else if (root !== parts[0]) fail();
    checkExtra(cursor + 46 + nameLength, extraLength);
    const newName = encoder.encode(repository + name.slice(root.length));
    if (newName.length > 0xffff) fail();
    entries.push({cursor, recordEnd, local, name, nameLength, newName}); cursor = recordEnd;
  }
  if (cursor !== end) fail();
  const ordered = [...entries].sort((a,b) => a.local - b.local), chunks = []; let outputLength = 0, previous = 0;
  const push = part => { chunks.push(part); outputLength += part.length; if (outputLength > 0xffffffff) fail(); };
  for (let i = 0; i < ordered.length; i++) {
    const entry = ordered[i], local = entry.local, next = ordered[i + 1]?.local ?? centralStart;
    if (local < previous || local + 30 > next || u32(local) !== 0x04034b50 || (u16(local + 6) & 1)) fail();
    const nameLength = u16(local + 26), extraLength = u16(local + 28), dataStart = local + 30 + nameLength + extraLength;
    if (dataStart > next || decode(bytes.subarray(local + 30, local + 30 + nameLength)) !== entry.name) fail();
    checkExtra(local + 30 + nameLength, extraLength);
    push(bytes.subarray(previous, local)); entry.newLocal = outputLength;
    const header = bytes.slice(local, local + 30); new DataView(header.buffer).setUint16(26, entry.newName.length, true);
    push(header); push(entry.newName); push(bytes.subarray(local + 30 + nameLength, next)); previous = next;
  }
  if (previous !== centralStart) fail();
  const newCentralStart = outputLength;
  for (const entry of entries) {
    const header = bytes.slice(entry.cursor, entry.cursor + 46), headerView = new DataView(header.buffer);
    headerView.setUint16(28, entry.newName.length, true); headerView.setUint32(42, entry.newLocal, true);
    push(header); push(entry.newName); push(bytes.subarray(entry.cursor + 46 + entry.nameLength, entry.recordEnd));
  }
  const newCentralSize = outputLength - newCentralStart, footer = bytes.slice(end);
  const footerView = new DataView(footer.buffer); footerView.setUint32(12, newCentralSize, true); footerView.setUint32(16, newCentralStart, true); push(footer);
  const output = new Uint8Array(outputLength); let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output;
}
