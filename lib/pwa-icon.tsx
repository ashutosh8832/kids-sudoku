import { ImageResponse } from "next/og";
import { SudokuMark } from "@/lib/icon-mark";

export function pwaIconResponse(size: number, padded = false) {
  const scale = size / 512;
  const cellPx = Math.max(8, Math.round((padded ? 32 : 42) * scale));
  const frame = Math.max(8, Math.round((padded ? 96 : 48) * scale));
  return new ImageResponse(SudokuMark({ cellPx, frame }), {
    width: size,
    height: size,
  });
}
