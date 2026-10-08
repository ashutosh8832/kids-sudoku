import { panelDigit } from "./sudoku";

function isShown(r: number, c: number): boolean {
  return (r * 3 + c * 7) % 5 === 0
}

export function SudokuMark({
  cellPx,
  frame,
}: {
  cellPx: number
  frame: number
}) {
  const thin = Math.max(1, Math.round(cellPx * 0.06))
  const thick = Math.max(2, Math.round(cellPx * 0.14))
  const fontSize = Math.round(cellPx * 0.55)

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#f8fafc",
        borderRadius: frame,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: "#334155",
          padding: thick,
        }}
      >
        {Array.from({ length: 9 }, (_, r) => (
          <div
            key={r}
            style={{
              display: "flex",
              marginBottom: r === 8 ? 0 : r % 3 === 2 ? thick : thin,
            }}
          >
            {Array.from({ length: 9 }, (_, c) => {
              const show = isShown(r, c)
              return (
                <div
                  key={c}
                  style={{
                    width: cellPx,
                    height: cellPx,
                    background: show ? "#e2e8f0" : "#ffffff",
                    color: "#2563eb",
                    fontSize,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: c === 8 ? 0 : c % 3 === 2 ? thick : thin,
                  }}
                >
                  {show ? String(panelDigit(r, c)) : ""}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}