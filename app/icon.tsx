import { ImageResponse } from "next/og";
import { SudokuMark } from "@/lib/icon-mark";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(SudokuMark({ cellPx: 42, frame: 48 }), size);
}