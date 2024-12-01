class SudokuValidator {
    static isValidMove(board, row, col, num) {
        // Check row
        for (let x = 0; x < 9; x++) {
            if (board[row][x] === num && x !== col) {
                return false;
            }
        }

        // Check column
        for (let x = 0; x < 9; x++) {
            if (board[x][col] === num && x !== row) {
                return false;
            }
        }

        // Check 3x3 box
        let boxRow = Math.floor(row / 3) * 3;
        let boxCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[boxRow + i][boxCol + j] === num && 
                    (boxRow + i !== row || boxCol + j !== col)) {
                    return false;
                }
            }
        }

        return true;
    }

    static stringToBoard(puzzleString) {
        const board = [];
        for (let i = 0; i < 9; i++) {
            board[i] = [];
            for (let j = 0; j < 9; j++) {
                board[i][j] = parseInt(puzzleString[i * 9 + j]) || 0;
            }
        }
        return board;
    }

    static boardToString(board) {
        return board.flat().join('');
    }

    static findEmptyCell(board) {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (board[i][j] === 0) {
                    return [i, j];
                }
            }
        }
        return null;
    }

    static solve(board) {
        const emptyCell = this.findEmptyCell(board);
        
        if (!emptyCell) {
            return true; // Puzzle is solved
        }

        const [row, col] = emptyCell;

        for (let num = 1; num <= 9; num++) {
            if (this.isValidMove(board, row, col, num)) {
                board[row][col] = num;

                if (this.solve(board)) {
                    return true;
                }

                board[row][col] = 0; // Backtrack
            }
        }

        return false;
    }

    static getRelatedCells(row, col) {
        const cells = new Set();
        
        // Add all cells in the same row
        for (let i = 0; i < 9; i++) {
            cells.add(`${row},${i}`);
        }

        // Add all cells in the same column
        for (let i = 0; i < 9; i++) {
            cells.add(`${i},${col}`);
        }

        // Add all cells in the same 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                cells.add(`${boxRow + i},${boxCol + j}`);
            }
        }

        return Array.from(cells).map(cell => {
            const [r, c] = cell.split(',');
            return [parseInt(r), parseInt(c)];
        });
    }

    static checkCompletion(board) {
        // Check if board is completely filled
        if (this.findEmptyCell(board)) {
            return false;
        }

        // Check if all rows, columns and boxes are valid
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const num = board[i][j];
                board[i][j] = 0;
                if (!this.isValidMove(board, i, j, num)) {
                    board[i][j] = num;
                    return false;
                }
                board[i][j] = num;
            }
        }

        return true;
    }

    static highlightConflicts(board, row, col, num) {
        const conflicts = [];
        const relatedCells = this.getRelatedCells(row, col);
        
        for (const [r, c] of relatedCells) {
            if (board[r][c] === num && (r !== row || c !== col)) {
                conflicts.push([r, c]);
            }
        }

        return conflicts;
    }

    static getPossibleValues(board, row, col) {
        if (board[row][col] !== 0) {
            return [];
        }

        const possible = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const relatedCells = this.getRelatedCells(row, col);

        for (const [r, c] of relatedCells) {
            if (board[r][c] !== 0) {
                possible.delete(board[r][c]);
            }
        }

        return Array.from(possible);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SudokuValidator;
}
