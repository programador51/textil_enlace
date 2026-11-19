export async function encodePng(width: number, height: number, rgba: Uint8ClampedArray) {
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (stride + 1);
    raw[row] = 0;
    raw.set(rgba.subarray(y * stride, y * stride + stride), row + 1);
  }

  const compressed = await deflate(raw);
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const chunks = [chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", new Uint8Array())];
  const size = signature.length + chunks.reduce((sum, item) => sum + item.length, 0);
  const png = new Uint8Array(size);
  png.set(signature, 0);
  let offset = signature.length;
  for (const item of chunks) {
    png.set(item, offset);
    offset += item.length;
  }
  return png;
}

function chunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

async function deflate(data: Uint8Array) {
  const stream = new CompressionStream("deflate");
  const compressed = new Response(stream.readable).arrayBuffer();
  const writer = stream.writable.getWriter();
  await writer.write(data as Uint8Array<ArrayBuffer>);
  await writer.close();
  return new Uint8Array(await compressed);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
