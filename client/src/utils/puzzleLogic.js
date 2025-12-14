/**
 * Generate a shuffled puzzle board
 * @param {number} size - Board size (3, 4, 6, 8, or 10)
 * @param {number} moves - Number of random moves to make
 * @returns {Array} Shuffled board state
 */
export function generatePuzzle(size, moves = 100) {
  const totalTiles = size * size;
  let board = Array.from({ length: totalTiles }, (_, i) => i);
  let emptyIndex = totalTiles - 1;

  // Make random valid moves to shuffle
  for (let i = 0; i < moves; i++) {
    const validMoves = getValidMoves(board, emptyIndex, size);
    const randomMove =
      validMoves[Math.floor(Math.random() * validMoves.length)];

    // Swap
    [board[emptyIndex], board[randomMove]] = [
      board[randomMove],
      board[emptyIndex],
    ];
    emptyIndex = randomMove;
  }

  return board;
}

/**
 * Get valid moves for current board state
 * @param {Array} board - Current board state
 * @param {number} emptyIndex - Index of empty tile
 * @param {number} size - Board size
 * @returns {Array} Array of valid move indices
 */
export function getValidMoves(board, emptyIndex, size) {
  const moves = [];
  const row = Math.floor(emptyIndex / size);
  const col = emptyIndex % size;

  // Up
  if (row > 0) moves.push(emptyIndex - size);
  // Down
  if (row < size - 1) moves.push(emptyIndex + size);
  // Left
  if (col > 0) moves.push(emptyIndex - 1);
  // Right
  if (col < size - 1) moves.push(emptyIndex + 1);

  return moves;
}

/**
 * Check if a tile can be moved
 * @param {Array} board - Current board state
 * @param {number} tileIndex - Index of tile to move
 * @param {number} size - Board size
 * @returns {boolean}
 */
export function canMoveTile(board, tileIndex, size) {
  const emptyIndex = board.indexOf(0);
  const validMoves = getValidMoves(board, emptyIndex, size);
  return validMoves.includes(tileIndex);
}

/**
 * Move a tile
 * @param {Array} board - Current board state
 * @param {number} tileIndex - Index of tile to move
 * @returns {Array|null} New board state or null if invalid move
 */
export function moveTile(board, tileIndex) {
  const emptyIndex = board.indexOf(0);
  const size = Math.sqrt(board.length);

  // Check if move is valid (tiles must be adjacent)
  const validMoves = getValidMoves(board, emptyIndex, size);
  if (!validMoves.includes(tileIndex)) {
    return null;
  }

  // Create new board and swap
  const newBoard = [...board];
  [newBoard[emptyIndex], newBoard[tileIndex]] = [
    newBoard[tileIndex],
    newBoard[emptyIndex],
  ];

  return newBoard;
}

/**
 * Get direction of move
 * @param {number} fromIndex - Starting index
 * @param {number} toIndex - Ending index
 * @param {number} size - Board size
 * @returns {string} Direction ('up', 'down', 'left', 'right')
 */
export function getMoveDirection(fromIndex, toIndex, size) {
  const diff = toIndex - fromIndex;

  if (diff === -size) return "up";
  if (diff === size) return "down";
  if (diff === -1) return "left";
  if (diff === 1) return "right";

  return "unknown";
}

/**
 * Check if puzzle is solved
 * @param {Array} board - Current board state
 * @returns {boolean}
 */
export function isSolved(board) {
  for (let i = 0; i < board.length - 1; i++) {
    if (board[i] !== i) return false;
  }
  return board[board.length - 1] === 0;
}

/**
 * Count inversions for solvability check
 * @param {Array} board - Board state
 * @returns {number} Number of inversions
 */
export function countInversions(board) {
  let inversions = 0;
  const filteredBoard = board.filter((tile) => tile !== 0);

  for (let i = 0; i < filteredBoard.length - 1; i++) {
    for (let j = i + 1; j < filteredBoard.length; j++) {
      if (filteredBoard[i] > filteredBoard[j]) {
        inversions++;
      }
    }
  }

  return inversions;
}

/**
 * Check if puzzle is solvable
 * @param {Array} board - Board state
 * @param {number} size - Board size
 * @returns {boolean}
 */
export function isSolvable(board, size) {
  const inversions = countInversions(board);
  const emptyRow = Math.floor(board.indexOf(0) / size);

  if (size % 2 === 1) {
    // Odd grid: solvable if inversions is even
    return inversions % 2 === 0;
  } else {
    // Even grid: solvable if (inversions + empty row from bottom) is odd
    const emptyRowFromBottom = size - emptyRow;
    return (inversions + emptyRowFromBottom) % 2 === 1;
  }
}

/**
 * Generate a guaranteed solvable puzzle
 * @param {number} size - Board size
 * @returns {Array} Solvable board state
 */
export function generateSolvablePuzzle(size) {
  let board;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    board = generatePuzzle(size, size * size * 2);
    attempts++;

    if (attempts >= maxAttempts) {
      // Fallback: create solved puzzle and make one legal move
      board = Array.from({ length: size * size }, (_, i) => i);
      const emptyIndex = size * size - 1;
      const validMoves = getValidMoves(board, emptyIndex, size);
      const move = validMoves[0];
      [board[emptyIndex], board[move]] = [board[move], board[emptyIndex]];
      break;
    }
  } while (!isSolvable(board, size) || isSolved(board));

  return board;
}

/**
 * Calculate minimum moves to solve (estimation using Manhattan distance)
 * @param {Array} board - Current board state
 * @param {number} size - Board size
 * @returns {number} Estimated minimum moves
 */
export function calculateMinimumMoves(board, size) {
  let distance = 0;

  for (let i = 0; i < board.length; i++) {
    const tile = board[i];
    if (tile === 0) continue;

    const currentRow = Math.floor(i / size);
    const currentCol = i % size;
    const targetRow = Math.floor(tile / size);
    const targetCol = tile % size;

    // Manhattan distance
    distance +=
      Math.abs(currentRow - targetRow) + Math.abs(currentCol - targetCol);
  }

  return distance;
}

/**
 * Get difficulty rating based on moves required
 * @param {number} minimumMoves - Minimum moves to solve
 * @param {number} size - Board size
 * @returns {string} Difficulty rating
 */
export function getDifficultyRating(minimumMoves, size) {
  const threshold = size * size;

  if (minimumMoves < threshold * 0.5) return "easy";
  if (minimumMoves < threshold * 1) return "medium";
  if (minimumMoves < threshold * 1.5) return "hard";
  return "expert";
}

/**
 * Get hint for next move
 * @param {Array} board - Current board state
 * @param {number} size - Board size
 * @returns {number|null} Index of tile to move, or null
 */
export function getHint(board, size) {
  const emptyIndex = board.indexOf(0);
  const validMoves = getValidMoves(board, emptyIndex, size);

  // Find move that reduces Manhattan distance the most
  let bestMove = null;
  let bestScore = Infinity;

  for (const moveIndex of validMoves) {
    const testBoard = moveTile(board, moveIndex);
    if (!testBoard) continue;

    const score = calculateMinimumMoves(testBoard, size);

    if (score < bestScore) {
      bestScore = score;
      bestMove = moveIndex;
    }
  }

  return bestMove;
}

/**
 * Check if current solution is optimal
 * @param {number} moveCount - Number of moves taken
 * @param {number} minimumMoves - Minimum possible moves
 * @returns {boolean}
 */
export function isPerfectGame(moveCount, minimumMoves) {
  // Allow small margin for error since minimum is an estimate
  return moveCount <= minimumMoves * 1.1;
}

/**
 * Convert board to image slice positions
 * @param {Array} board - Board state
 * @param {number} size - Board size
 * @returns {Array} Array of {x, y, tile} for rendering
 */
export function boardToImageSlices(board, size) {
  return board.map((tile, index) => {
    const row = Math.floor(index / size);
    const col = index % size;

    return {
      tile,
      x: col,
      y: row,
      isEmpty: tile === 0,
    };
  });
}

/**
 * Get tile's target position
 * @param {number} tile - Tile number
 * @param {number} size - Board size
 * @returns {object} {row, col}
 */
export function getTileTarget(tile, size) {
  return {
    row: Math.floor(tile / size),
    col: tile % size,
  };
}

/**
 * Check if tile is in correct position
 * @param {number} tile - Tile number
 * @param {number} currentIndex - Current position
 * @returns {boolean}
 */
export function isTileInPlace(tile, currentIndex) {
  return tile === currentIndex || tile === 0;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Create solved board
 * @param {number} size - Board size
 * @returns {Array} Solved board state
 */
export function createSolvedBoard(size) {
  return Array.from({ length: size * size }, (_, i) => i);
}

/**
 * Clone board
 * @param {Array} board - Board to clone
 * @returns {Array} Cloned board
 */
export function cloneBoard(board) {
  return [...board];
}

/**
 * Compare two boards
 * @param {Array} board1 - First board
 * @param {Array} board2 - Second board
 * @returns {boolean} True if boards are equal
 */
export function boardsEqual(board1, board2) {
  if (board1.length !== board2.length) return false;

  for (let i = 0; i < board1.length; i++) {
    if (board1[i] !== board2[i]) return false;
  }

  return true;
}

/**
 * Get adjacent tiles to a position
 * @param {number} index - Tile index
 * @param {number} size - Board size
 * @returns {Array} Array of adjacent indices
 */
export function getAdjacentTiles(index, size) {
  const row = Math.floor(index / size);
  const col = index % size;
  const adjacent = [];

  if (row > 0) adjacent.push(index - size); // Up
  if (row < size - 1) adjacent.push(index + size); // Down
  if (col > 0) adjacent.push(index - 1); // Left
  if (col < size - 1) adjacent.push(index + 1); // Right

  return adjacent;
}

/**
 * Calculate progress percentage
 * @param {Array} board - Current board
 * @returns {number} Percentage solved (0-100)
 */
export function calculateProgress(board) {
  let correctTiles = 0;

  for (let i = 0; i < board.length - 1; i++) {
    if (board[i] === i) correctTiles++;
  }

  return Math.round((correctTiles / (board.length - 1)) * 100);
}

/**
 * Get all corner tiles
 * @param {number} size - Board size
 * @returns {Array} Array of corner tile indices
 */
export function getCornerTiles(size) {
  return [
    0, // Top-left
    size - 1, // Top-right
    size * (size - 1), // Bottom-left
    size * size - 1, // Bottom-right (empty space)
  ];
}

/**
 * Get all edge tiles (not corners)
 * @param {number} size - Board size
 * @returns {Array} Array of edge tile indices
 */
export function getEdgeTiles(size) {
  const edges = [];

  // Top edge
  for (let i = 1; i < size - 1; i++) edges.push(i);

  // Bottom edge
  for (let i = 1; i < size - 1; i++) edges.push(size * (size - 1) + i);

  // Left edge
  for (let i = 1; i < size - 1; i++) edges.push(i * size);

  // Right edge
  for (let i = 1; i < size - 1; i++) edges.push(i * size + size - 1);

  return edges;
}

/**
 * Validate board size
 * @param {number} size - Board size to validate
 * @returns {boolean} True if valid
 */
export function isValidBoardSize(size) {
  const validSizes = [3, 4, 6, 8, 10];
  return validSizes.includes(size);
}

/**
 * Get board statistics
 * @param {Array} board - Board state
 * @param {number} size - Board size
 * @returns {Object} Statistics object
 */
export function getBoardStatistics(board, size) {
  return {
    size,
    totalTiles: board.length,
    emptyIndex: board.indexOf(0),
    progress: calculateProgress(board),
    minimumMoves: calculateMinimumMoves(board, size),
    difficulty: getDifficultyRating(calculateMinimumMoves(board, size), size),
    isSolvable: isSolvable(board, size),
    isSolved: isSolved(board),
    inversions: countInversions(board),
  };
}
