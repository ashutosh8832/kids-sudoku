import { ImageResponse } from "next/og";
import { SudokuMark } from "@/lib/icon-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(SudokuMark({ cellPx: 15, frame: 22 }), size);
}