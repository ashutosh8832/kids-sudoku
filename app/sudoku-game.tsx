"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GAMES_PER_TIER,
  Grid,
  MAX_LEVEL,
  TIERS,
  TierName,
  cloneGrid,
  completedDigits,
  createPuzzle,
  emptyGrid,
  generateSolution,
  givensForLevel,
  groupsCompleted,
  isPuzzleSolved,
  sameBox,
  SIZE,
  starsFor,
  tierForLevel,
} from "@/lib/sudoku";

const SAVE_KEY = "kids-sudoku/save/v1"
const MAX_HINTS = 3
const FLASH_MS = 700
const AUTO_ADVANCE_MS = 3500

interface GameState {
  level: number
  bestLevel: number
  status: "home" | "playing"
  givens: Grid
  solution: Grid
  board: Grid
  notes: number[][][]
  notesMode: boolean
  selected: [number, number] | null
  hintsUsed: number
  seconds: number
  won: boolean
  pending: boolean
}

function createGame(
  level: number,
  bestLevel: number,
  status: "home" | "playing" = "playing"
): GameState {
  const solution = generateSolution()
  const givens = createPuzzle(solution, givensForLevel(level))
  return {
    level,
    bestLevel,
    status,
    givens,
    solution,
    board: cloneGrid(givens),
    notes: Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => [])
    ),
    notesMode: false,
    selected: null,
    hintsUsed: 0,
    seconds: 0,
    won: false,
    pending: false,
  }
}

function placeholderState(): GameState {
  return {
    level: 1,
    bestLevel: 1,
    status: "home",
    givens: emptyGrid(),
    solution: emptyGrid(),
    board: emptyGrid(),
    notes: Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => [])
    ),
    notesMode: false,
    selected: null,
    hintsUsed: 0,
    seconds: 0,
    won: false,
    pending: true,
  }
}

function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as GameState
    if (
      !data ||
      typeof data.level !== "number" ||
      !Array.isArray(data.givens) ||
      !Array.isArray(data.solution) ||
      !Array.isArray(data.board)
    ) {
      return null
    }
    if (!Array.isArray(data.notes)) {
      data.notes = Array.from({ length: SIZE }, () =>
        Array.from({ length: SIZE }, () => [])
      )
    }
    data.status = "home"
    data.won = false
    return data
  } catch {
    return null
  }
}

function borderClasses(r: number, c: number): string {
  const top =
    r === 0 || r % 3 === 0
      ? "border-t-2 border-t-slate-400"
      : "border-t border-t-slate-200"
  const bottom =
    r === 8 || r % 3 === 2
      ? "border-b-2 border-b-slate-400"
      : "border-b border-b-slate-200"
  const left =
    c === 0 || c % 3 === 0
      ? "border-l-2 border-l-slate-400"
      : "border-l border-l-slate-200"
  const right =
    c === 8 || c % 3 === 2
      ? "border-r-2 border-r-slate-400"
      : "border-r border-r-slate-200"
  return `${top} ${bottom} ${left} ${right}`
}

const TIER_COLORS: Record<TierName, string> = {
  "Very Easy": "text-teal-600",
  Easy: "text-emerald-600",
  Medium: "text-amber-600",
  Hard: "text-orange-600",
  Insane: "text-rose-600",
}

function NumberPad({
  onDigit,
  finishedDigits,
}: {
  onDigit: (d: number) => void
  finishedDigits: boolean[]
}) {
  return (
    <div className="grid w-full grid-cols-3 gap-2">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onDigit(d)}
          disabled={finishedDigits[d]}
          className="flex h-16 items-center justify-center rounded-xl border border-slate-300 bg-white text-2xl font-bold text-slate-700 transition select-none touch-manipulation active:scale-95 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300"
          aria-label={`Number ${d}`}
        >
          {d}
        </button>
      ))}
    </div>
  )
}

export default function SudokuGame() {
  const [state, setState] = useState<GameState>(placeholderState)

  useEffect(() => {
    if (!state.pending) return
    const saved = loadState()
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(saved)
    } else {
      setState((prev) => createGame(prev.level, prev.bestLevel, "home"))
    }
  }, [state.pending])

  const [flashCells, setFlashCells] = useState<Map<string, number>>(
    () => new Map()
  )
  const flashTokens = useRef(new Map<string, number>())
  const flashTimers = useRef(new Map<string, number>())
  const [confirmNew, setConfirmNew] = useState(false)

  const boardRef = useRef<HTMLDivElement>(null)
  const [cellPx, setCellPx] = useState(40)

  useEffect(() => {
    function measure() {
      const el = boardRef.current
      if (!el) return
      setCellPx(el.offsetWidth / SIZE)
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  useEffect(() => {
    if (state.pending) return
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state))
    } catch {
      // storage unavailable, ignore
    }
  }, [state])

  useEffect(() => {
    if (state.pending || state.status !== "playing" || state.won) return
    const id = window.setInterval(() => {
      setState((prev) => ({ ...prev, seconds: prev.seconds + 1 }))
    }, 1000)
    return () => window.clearInterval(id)
  }, [state.pending, state.status, state.won])

  useEffect(() => {
    if (!state.won) return
    const id = window.setTimeout(() => {
      clearAllFlashes()
      setState((prev) => {
        const level = Math.min(MAX_LEVEL, prev.level + 1)
        return createGame(level, Math.max(prev.bestLevel, level), "playing")
      })
    }, AUTO_ADVANCE_MS)
    return () => window.clearTimeout(id)
  }, [state.won])

  const completed = useMemo(
    () => groupsCompleted(state.board, state.solution),
    [state.board, state.solution]
  )

  const finishedDigits = useMemo(
    () => completedDigits(state.board, state.solution),
    [state.board, state.solution]
  )

  function clearAllFlashes() {
    for (const key of flashTokens.current.keys()) {
      const t = flashTimers.current.get(key)
      if (t) window.clearTimeout(t)
    }
    flashTokens.current.clear()
    flashTimers.current.clear()
    setFlashCells(new Map())
  }

  function cancelFlash(key: string) {
    const t = flashTimers.current.get(key)
    if (t) window.clearTimeout(t)
    flashTimers.current.delete(key)
    flashTokens.current.delete(key)
    setFlashCells((prev) => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })
  }

  function startFlash(r: number, c: number) {
    const key = `${r},${c}`
    const token = (flashTokens.current.get(key) ?? 0) + 1
    flashTokens.current.set(key, token)
    setFlashCells((prev) => {
      const next = new Map(prev)
      next.set(key, token)
      return next
    })
    const old = flashTimers.current.get(key)
    if (old) window.clearTimeout(old)
    const timer = window.setTimeout(() => {
      if (flashTokens.current.get(key) === token) {
        setState((prev) => {
          const board = prev.board.map((row) => row.slice())
          board[r][c] = 0
          return { ...prev, board }
        })
        setFlashCells((prev) => {
          const next = new Map(prev)
          next.delete(key)
          return next
        })
        flashTokens.current.delete(key)
        flashTimers.current.delete(key)
      }
    }, FLASH_MS)
    flashTimers.current.set(key, timer)
  }

  function startGame() {
    if (state.pending) return
    setState((prev) => {
      if (prev.won) {
        return createGame(prev.level, prev.bestLevel, "playing")
      }
      return { ...prev, status: "playing" }
    })
  }

  function hasProgress(): boolean {
    if (state.seconds > 0 || state.hintsUsed > 0) return true
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (state.board[r][c] !== state.givens[r][c]) return true
        if (state.notes[r][c].length > 0) return true
      }
    }
    return false
  }

  function requestNew() {
    if (hasProgress()) {
      setConfirmNew(true)
    } else {
      newGameAt(state.level)
    }
  }

  function newGameAt(level: number) {
    clearAllFlashes()
    setState((prev) => createGame(level, prev.bestLevel, "playing"))
  }

  function selectTier(tier: string) {
    const index = TIERS.indexOf(tier as TierName)
    if (index < 0) return
    const level = index * GAMES_PER_TIER + 1
    clearAllFlashes()
    setState((prev) =>
      createGame(level, Math.max(prev.bestLevel, level), prev.status)
    )
  }

  function changeLevel(delta: number) {
    clearAllFlashes()
    setState((prev) => {
      const level = Math.min(MAX_LEVEL, Math.max(1, prev.level + delta))
      return createGame(level, Math.max(prev.bestLevel, level), "playing")
    })
  }

  function nextLevel() {
    clearAllFlashes()
    setState((prev) => {
      const level = Math.min(MAX_LEVEL, prev.level + 1)
      return createGame(level, Math.max(prev.bestLevel, level), "playing")
    })
  }

  function eraseCell(r: number, c: number) {
    if (state.givens[r][c] !== 0) return
    cancelFlash(`${r},${c}`)
    setState((prev) => {
      const board = prev.board.map((row) => row.slice())
      const notes = prev.notes.map((row) => row.map((col) => col.slice()))
      board[r][c] = 0
      notes[r][c] = []
      return { ...prev, board, notes }
    })
  }

  function eraseSelected() {
    const sel = state.selected
    if (!sel) return
    eraseCell(sel[0], sel[1])
  }

  function setCorrect(r: number, c: number, digit: number) {
    cancelFlash(`${r},${c}`)
    setState((prev) => {
      const board = prev.board.map((row) => row.slice())
      const notes = prev.notes.map((row) => row.map((col) => col.slice()))
      board[r][c] = digit
      notes[r][c] = []
      const next = { ...prev, board, notes }
      if (isPuzzleSolved(board, prev.solution)) {
        next.won = true
      }
      return next
    })
  }

  function toggleNote(r: number, c: number, digit: number) {
    if (state.givens[r][c] !== 0) return
    if (state.board[r][c] !== 0) return
    setState((prev) => {
      const notes = prev.notes.map((row) => row.map((col) => col.slice()))
      const arr = notes[r][c]
      const idx = arr.indexOf(digit)
      if (idx >= 0) arr.splice(idx, 1)
      else arr.push(digit)
      return { ...prev, notes }
    })
  }

  function enterDigit(digit: number) {
    if (state.won) return
    const sel = state.selected
    if (!sel) return
    const [r, c] = sel
    if (state.givens[r][c] !== 0) return
    if (state.notesMode) {
      toggleNote(r, c, digit)
      return
    }
    const current = state.board[r][c]
    if (current === digit) {
      eraseCell(r, c)
      return
    }
    if (state.solution[r][c] === digit) {
      setCorrect(r, c, digit)
    } else {
      setState((prev) => {
        const board = prev.board.map((row) => row.slice())
        board[r][c] = digit
        return { ...prev, board }
      })
      startFlash(r, c)
    }
  }

  function revealHint() {
    if (state.won) return
    const sel = state.selected
    if (!sel) return
    const [r, c] = sel
    if (state.givens[r][c] !== 0) return
    if (state.hintsUsed >= MAX_HINTS) return
    setCorrect(r, c, state.solution[r][c])
    setState((prev) => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }))
  }

  function toggleNotesMode() {
    setState((prev) => ({ ...prev, notesMode: !prev.notesMode }))
  }

  function moveSelection(dr: number, dc: number) {
    const sel = state.selected
    if (!sel) return
    const r = Math.min(SIZE - 1, Math.max(0, sel[0] + dr))
    const c = Math.min(SIZE - 1, Math.max(0, sel[1] + dc))
    setState((prev) => ({ ...prev, selected: [r, c] }))
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (state.won) {
        if (e.key === "Enter") nextLevel()
        return
      }
      if (e.key >= "1" && e.key <= "9") {
        enterDigit(parseInt(e.key, 10))
        return
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        eraseSelected()
        return
      }
      if (e.key === "ArrowUp") moveSelection(-1, 0)
      else if (e.key === "ArrowDown") moveSelection(1, 0)
      else if (e.key === "ArrowLeft") moveSelection(0, -1)
      else if (e.key === "ArrowRight") moveSelection(0, 1)
      else if (e.key.toLowerCase() === "h") revealHint()
      else if (e.key.toLowerCase() === "n") toggleNotesMode()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  function cellClasses(r: number, c: number): string {
    const sel = state.selected
    const value = state.board[r][c]
    const isGiven = state.givens[r][c] !== 0
    const isSelected = sel !== null && sel[0] === r && sel[1] === c
    const flash = flashCells.get(`${r},${c}`)
    const boxIndex = Math.floor(r / 3) * 3 + Math.floor(c / 3)

    let bg = "bg-white"
    if (flash) {
      bg = "cell-flash-wrong"
    } else if (isSelected) {
      bg = "bg-sky-200"
    } else if (sel && value !== 0 && value === state.board[sel[0]][sel[1]]) {
      bg = "bg-sky-100"
    } else if (
      completed.rows[r] ||
      completed.cols[c] ||
      completed.boxes[boxIndex]
    ) {
      bg = "bg-emerald-50"
    } else if (
      sel &&
      (sel[0] === r || sel[1] === c || sameBox(sel[0], sel[1], r, c))
    ) {
      bg = "bg-sky-50"
    }

    let text = ""
    if (value !== 0) {
      text = isGiven
        ? "text-slate-700"
        : value !== state.solution[r][c] || flash
          ? "text-rose-600"
          : "text-blue-700"
    }

    const ring = isSelected ? "ring-4 ring-sky-400" : ""
    return `${borderClasses(r, c)} ${bg} ${text} ${ring}`
  }

  function renderCell(r: number, c: number) {
    const given = state.givens[r][c] !== 0
    const value = state.board[r][c]
    const notes = state.notes[r][c]
    const flashKey = flashCells.get(`${r},${c}`)
    const fontSize = Math.max(14, Math.round(cellPx * 0.52))
    const noteFont = Math.max(9, Math.round(cellPx * 0.17))

    return (
      <button
        key={`${r}-${c}-${flashKey ?? 0}`}
        type="button"
        aria-label={`row ${r + 1} column ${c + 1}${
          value !== 0 ? `, ${value}` : ", empty"
        }`}
        onClick={() => setState((prev) => ({ ...prev, selected: [r, c] }))}
        className={`${cellClasses(r, c)} flex aspect-square items-center justify-center p-0 select-none touch-manipulation`}
        style={{ fontSize }}
      >
        {value !== 0 ? (
          <span className={given ? "font-bold" : ""}>{value}</span>
        ) : notes.length > 0 ? (
          <span
            className="grid align-center"
            style={{
              gridTemplateColumns: "repeat(3, 1fr)",
              width: "100%",
              height: "100%",
              fontSize: noteFont,
              lineHeight: 1,
            }}
          >
            {Array.from({ length: 9 }, (_, i) => i + 1).map((d) => (
              <span key={d} className={notes.includes(d) ? "text-slate-400" : ""}>
                {notes.includes(d) ? d : ""}
              </span>
            ))}
          </span>
        ) : null}
      </button>
    )
  }

  function timeLabel(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  function chip(label: string, done: number, total: number) {
    const complete = done === total
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          complete
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        <span aria-hidden="true">{complete ? "✓" : "•"}</span>
        {label} {done}/{total}
      </span>
    )
  }

  const rowCount = completed.rows.filter(Boolean).length
  const colCount = completed.cols.filter(Boolean).length
  const boxCount = completed.boxes.filter(Boolean).length

  if (state.pending) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-4 px-2 font-sans">
        <div className="flex flex-col items-center gap-3">
          <span
            className="h-14 w-14 animate-spin rounded-full border-4 border-slate-300 border-t-slate-500"
            aria-hidden="true"
          />
          <p className="text-lg font-semibold text-slate-600">Loading...</p>
        </div>
      </main>
    )
  }

  const tierName = tierForLevel(state.level)
  const tierColor = TIER_COLORS[tierName]

  if (state.pending) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-4 px-2 font-sans">
        <div className="flex flex-col items-center gap-3">
          <span
            className="h-14 w-14 animate-spin rounded-full border-4 border-slate-300 border-t-slate-500"
            aria-hidden="true"
          />
          <p className="text-lg font-semibold text-slate-600">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-full flex-col items-center gap-4 px-2 pt-4 font-sans">
      <div className="flex w-full flex-wrap items-start justify-center gap-4 max-w-[1024px]">
        {/* Sudoku board — its own frame */}
        <div className="flex min-w-0 flex-1 items-start justify-center">
          <div
            className="relative"
            style={{
              width: "min(100%, 720px, max(240px, calc(100vh - 160px)))",
            }}
          >
            <div
              ref={boardRef}
              className="grid w-full grid-cols-9 overflow-hidden rounded-2xl border-4 border-slate-500 bg-white shadow-lg"
            >
              {Array.from({ length: SIZE }, (_, r) =>
                Array.from({ length: SIZE }, (_, c) => renderCell(r, c))
              ).flat()}
            </div>
            {state.status === "home" ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-slate-50/85 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={startGame}
                  className="flex h-16 min-w-48 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 text-2xl font-extrabold text-white shadow-md transition select-none active:scale-95"
                >
                  Start
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right column: difficulty, level + timer above the number pad */}
        <div className="flex w-full flex-col items-stretch gap-3 min-[560px]:w-64 sm:w-72">
          {/* Difficulty selector */}
          <div className="flex w-full items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 py-2 shadow-sm">
            <label
              htmlFor="difficulty"
              className="text-sm font-bold text-slate-500"
            >
              Difficulty
            </label>
            <select
              id="difficulty"
              value={tierName}
              onChange={(e) => selectTier(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-bold text-slate-800 select-none"
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Level + time */}
          <div className="flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-300 bg-white px-3 py-2 shadow-sm">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Previous level"
                onClick={() => changeLevel(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-2xl font-bold leading-none text-slate-500 shadow-sm select-none active:scale-95"
              >
                <span aria-hidden="true">‹</span>
              </button>
              <div className="flex flex-col items-center leading-tight">
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider ${tierColor}`}
                >
                  {tierName}
                </span>
                <span className="text-xl font-extrabold tabular-nums text-slate-800">
                  {state.level}
                </span>
              </div>
              <button
                type="button"
                aria-label="Next level"
                onClick={() => changeLevel(1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-2xl font-bold leading-none text-slate-500 shadow-sm select-none active:scale-95"
              >
                <span aria-hidden="true">›</span>
              </button>
            </div>
            <div className="flex flex-col items-center leading-tight">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Time
              </span>
              <span className="tabular-nums text-base font-bold text-slate-700">
                {timeLabel(state.seconds)}
              </span>
            </div>
          </div>

          <NumberPad
            onDigit={enterDigit}
            finishedDigits={finishedDigits}
          />
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={requestNew}
              className="flex min-h-12 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-600 active:scale-95 select-none"
            >
              <span aria-hidden="true">↻</span> New
            </button>
            <button
              type="button"
              onClick={revealHint}
              className="flex min-h-12 items-center justify-center gap-1 rounded-lg bg-amber-100 text-sm font-bold text-amber-800 active:scale-95 select-none disabled:opacity-40"
              disabled={state.hintsUsed >= MAX_HINTS}
            >
              <span aria-hidden="true">💡</span> Hint {MAX_HINTS - state.hintsUsed}
            </button>
            <button
              type="button"
              onClick={toggleNotesMode}
              className={`flex min-h-12 items-center justify-center gap-1 rounded-lg text-sm font-bold select-none active:scale-95 ${
                state.notesMode
                  ? "bg-blue-100 text-blue-700"
                  : "border border-slate-300 bg-white text-slate-600"
              }`}
            >
              <span aria-hidden="true">✏️</span> Notes
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 shadow-sm">
            {chip("Rows", rowCount, SIZE)}
            {chip("Cols", colCount, SIZE)}
            {chip("Boxes", boxCount, 9)}
          </div>
        </div>
      </div>

      {/* Win overlay */}
      {state.won ? (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-white/90 backdrop-blur-sm">
          {Array.from({ length: 40 }, (_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="pointer-events-none confetti"
              style={{
                left: `${(i * 37) % 100}%`,
                background:
                  ["#f43f5e", "#fb923c", "#facc15", "#4ade80", "#38bdf8", "#a78bfa"][
                    i % 6
                  ],
                animationDelay: `${(i % 10) * 0.12}s`,
                animationDuration: `${2.4 + (i % 5) * 0.3}s`,
              }}
            />
          ))}
          <div className="pop-in text-6xl" aria-hidden="true">🎉</div>
          <h1 className="pop-in text-3xl font-extrabold text-slate-800">
            You solved it!
          </h1>
          <div
            className="pop-in text-4xl tracking-widest"
            role="img"
            aria-label={`${starsFor(state.level, state.hintsUsed)} out of 3 stars`}
          >
            {Array.from({ length: 3 }, (_, i) =>
              i < starsFor(state.level, state.hintsUsed) ? "★" : "☆"
            ).join("")}
          </div>
          <p className="text-lg font-semibold text-slate-600">
            {timeLabel(state.seconds)}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={nextLevel}
              className="h-14 rounded-2xl bg-blue-600 px-6 text-lg font-extrabold text-white active:scale-95"
            >
              Next Level →
            </button>
            <button
              type="button"
              onClick={() => newGameAt(state.level)}
              className="h-14 rounded-2xl border border-slate-300 bg-white px-6 text-lg font-bold text-slate-600 active:scale-95"
            >
              Play Again
            </button>
          </div>
          <p className="text-sm font-semibold text-slate-400">
            Next level coming up…
          </p>
        </div>
      ) : null}

      {/* New puzzle confirmation */}
      {confirmNew ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="pop-in flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-xl">
            <div className="text-4xl" aria-hidden="true">
              🔁
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">
              Start a new puzzle?
            </h2>
            <p className="text-base font-medium text-slate-500">
              The current game will be lost.
            </p>
            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={() => setConfirmNew(false)}
                className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white text-base font-bold text-slate-600 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmNew(false)
                  newGameAt(state.level)
                }}
                className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-blue-600 text-base font-extrabold text-white active:scale-95"
              >
                New Puzzle
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}