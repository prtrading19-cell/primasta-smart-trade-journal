import { inflateRawSync } from "zlib";

const LOCAL_FILE_HEADER_SIG = 0x04034b50;

export function unzipBuffer(data: Buffer): string {
  const textEntries: Buffer[] = [];
  let offset = 0;

  while (offset + 30 <= data.length) {
    const sig = data.readUInt32LE(offset);
    if (sig !== LOCAL_FILE_HEADER_SIG) break;

    const method = data.readUInt16LE(offset + 8);
    const compressedSize = data.readUInt32LE(offset + 18);
    const filenameLen = data.readUInt16LE(offset + 26);
    const extraLen = data.readUInt16LE(offset + 28);

    const filename = data.toString(
      "utf8",
      offset + 30,
      offset + 30 + filenameLen
    );

    const dataOffset = offset + 30 + filenameLen + extraLen;

    if (compressedSize > 0 && !filename.startsWith("__MACOSX")) {
      const rawData = data.subarray(dataOffset, dataOffset + compressedSize);

      if (method === 0) {
        textEntries.push(rawData);
      } else if (method === 8) {
        const decompressed = inflateRawSync(rawData);
        textEntries.push(decompressed);
      }
    }

    offset = dataOffset + compressedSize;
  }

  if (textEntries.length === 0) {
    throw new Error("No decompressable entries found in ZIP");
  }

  const combined = Buffer.concat(textEntries);

  const utf16Match = combined.toString("utf8").match(/\0/);
  if (utf16Match && utf16Match.index !== undefined && utf16Match.index < 100) {
    return combined.toString("utf16le");
  }

  return combined.toString("utf8");
}
