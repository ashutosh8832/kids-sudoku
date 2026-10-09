export type Grid = number[][]

export const SIZE = 9

const ALL_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0))
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.slice())
}

function shuffle<T>(items: T[]): T[] {
  const arr = items.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

function candidates(grid: Grid, row: number, col: number): number[] {
  const used = new Set<number>()
  const boxRow = row - (row % 3)
  const boxCol = col - (col % 3)
  for (let i = 0; i < SIZE; i++) {
    used.add(grid[row][i])
    used.add(grid[i][col])
  }
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      used.add(grid[r][c])
    }
  }
  return ALL_DIGITS.filter((n) => !used.has(n))
}

export function isSafe(grid: Grid, row: number, col: number, num: number): boolean {
  return candidates(grid, row, col).includes(num)
}

export function sameBox(r1: number, c1: number, r2: number, c2: number): boolean {
  return Math.floor(r1 / 3) === Math.floor(r2 / 3) && Math.floor(c1 / 3) === Math.floor(c2 / 3)
}

type CellSlots = [number, number, number[]]

function selectCell(grid: Grid): CellSlots | null {
  let best: CellSlots | null = null
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] !== 0) continue
      const cands = candidates(grid, r, c)
      if (cands.length === 0) return [r, c, []]
      if (best === null || cands.length < best[2].length) {
        best = [r, c, cands]
      }
    }
  }
  return best
}

function solveGrid(grid: Grid, randomize: boolean): Grid | null {
  const result = cloneGrid(grid)

  function backtrack(): Grid | null {
    const cell = selectCell(result)
    if (cell === null) return cloneGrid(result)
    const [r, c, cands] = cell
    if (cands.length === 0) return null
    const order = randomize ? shuffle(cands) : cands.slice()
    for (const num of order) {
      result[r][c] = num
      const solved = backtrack()
      if (solved) return solved
      result[r][c] = 0
    }
    return null
  }

  return backtrack()
}

export function generateSolution(): Grid {
  const solution = solveGrid(emptyGrid(), true)
  return solution ?? generateSolution()
}

export function countSolutions(grid: Grid, limit = 2): number {
  let count = 0
  const result = cloneGrid(grid)

  function backtrack(): void {
    if (count >= limit) return
    const cell = selectCell(result)
    if (cell === null) {
      count++
      return
    }
    const [r, c, cands] = cell
    if (cands.length === 0) return
    for (const num of cands) {
      result[r][c] = num
      backtrack()
      result[r][c] = 0
      if (count >= limit) return
    }
  }

  backtrack()
  return count
}

export function hasUniqueSolution(grid: Grid): boolean {
  return countSolutions(grid, 2) === 1
}

export function createPuzzle(solution: Grid, targetGivens: number): Grid {
  const puzzle = cloneGrid(solution)
  const cells = shuffle(Array.from({ length: SIZE * SIZE }, (_, i) => i))
  let givens = SIZE * SIZE

  for (const index of cells) {
    if (givens <= targetGivens) break
    const r = Math.floor(index / SIZE)
    const c = index % SIZE
    if (puzzle[r][c] === 0) continue
    const backup = puzzle[r][c]
    puzzle[r][c] = 0
    if (hasUniqueSolution(puzzle)) {
      givens--
    } else {
      puzzle[r][c] = backup
    }
  }

  return puzzle
}

export function isPuzzleSolved(board: Grid, solution: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== solution[r][c]) return false
    }
  }
  return true
}

export function completedDigits(board: Grid, solution: Grid): boolean[] {
  const correct = new Array<number>(SIZE + 1).fill(0)
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c]
      if (v !== 0 && v === solution[r][c]) correct[v]++
    }
  }
  const finished = new Array<boolean>(SIZE + 1).fill(false)
  for (let d = 1; d <= SIZE; d++) {
    finished[d] = correct[d] === SIZE
  }
  return finished
}

export interface GroupCompletion {
  rows: boolean[]
  cols: boolean[]
  boxes: boolean[]
}

export function groupsCompleted(board: Grid, solution: Grid): GroupCompletion {
  const result: GroupCompletion = {
    rows: Array.from({ length: SIZE }, () => true),
    cols: Array.from({ length: SIZE }, () => true),
    boxes: Array.from({ length: SIZE }, () => true),
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const correct = board[r][c] === solution[r][c]
      if (!correct) {
        result.rows[r] = false
        result.cols[c] = false
        result.boxes[Math.floor(r / 3) * 3 + Math.floor(c / 3)] = false
      }
    }
  }

  return result
}

export const TIERS = [
  "Very Easy",
  "Easy",
  "Medium",
  "Hard",
  "Insane",
] as const
export type TierName = (typeof TIERS)[number]
export const GAMES_PER_TIER = 40
export const MAX_LEVEL = TIERS.length * GAMES_PER_TIER

const TIER_RANGES: Record<TierName, [number, number]> = {
  "Very Easy": [56, 50],
  Easy: [49, 44],
  Medium: [43, 38],
  Hard: [37, 32],
  Insane: [31, 26],
}

export function tierForLevel(level: number): TierName {
  const clamped = Math.max(1, level)
  const index = Math.min(TIERS.length - 1, Math.floor((clamped - 1) / GAMES_PER_TIER))
  return TIERS[index]
}

export function givensForLevel(level: number): number {
  const clamped = Math.max(1, level)
  const tier = tierForLevel(clamped)
  const [start, end] = TIER_RANGES[tier]
  if (clamped >= MAX_LEVEL) return end
  const index = (clamped - 1) % GAMES_PER_TIER
  const fraction = GAMES_PER_TIER > 1 ? index / (GAMES_PER_TIER - 1) : 0
  return Math.round(start - (start - end) * fraction)
}

export function starsFor(_level: number, hintsUsed: number): number {
  if (hintsUsed === 0) return 3
  if (hintsUsed <= 1) return 2
  return 1
}

const STAR_PANEL: Grid = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
]

export function panelDigit(r: number, c: number): number {
  return STAR_PANEL[r][c]
}