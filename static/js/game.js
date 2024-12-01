class SudokuGame {
    constructor() {
        this.selectedCell = null;
        this.puzzle = null;
        this.solution = null;
        this.currentNumbers = new Array(81).fill(0);
        this.pencilMode = false;
        this.pencilMarks = Array(81).fill().map(() => new Set());
        this.gameState = {
            moves: [],
            currentMove: -1
        };
        
        // Initialize timer with error handling
        try {
            this.timer = new Timer();
        } catch (error) {
            console.error('Failed to initialize timer:', error);
            throw new Error('Timer initialization failed');
        }
        
        this.initializeGame();
    }

    initializeGame() {
        this.setupBoard();
        this.setupControls();
        this.setupKeyboardInput();
        this.newGame('easy');
    }

    setupBoard() {
        const board = document.getElementById('sudoku-board');
        if (!board) {
            throw new Error('Sudoku board element not found');
        }

        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                cell.dataset.index = i * 9 + j;
                
                // Add pencil marks container
                const pencilMarks = document.createElement('div');
                pencilMarks.className = 'pencil-marks';
                cell.appendChild(pencilMarks);
                
                cell.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.selectCell(cell);
                });
                
                board.appendChild(cell);
            }
        }
    }

    setupControls() {
        // Setup numpad
        const numpad = document.getElementById('numpad');
        if (!numpad) {
            throw new Error('Numpad element not found');
        }
        
        for (let i = 1; i <= 9; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.addEventListener('click', () => this.enterNumber(i));
            numpad.appendChild(button);
        }

        // Setup difficulty buttons
        const difficultyButtons = document.querySelectorAll('.mode-btn');
        difficultyButtons.forEach(button => {
            button.addEventListener('click', () => {
                difficultyButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.newGame(button.dataset.difficulty);
            });
        });

        // Setup pause button
        const pauseButton = document.getElementById('pause');
        if (pauseButton) {
            pauseButton.addEventListener('click', () => this.togglePause());
        }
    }

    setupKeyboardInput() {
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '9') {
                this.enterNumber(parseInt(e.key));
            }
        });
    }

    async newGame(difficulty) {
        const response = await fetch(`/new-game/${difficulty}`);
        const data = await response.json();
        this.puzzle = data.puzzle;
        this.solution = data.solution;
        this.currentNumbers = [...this.puzzle];
        this.renderBoard();
        this.timer.reset();
        this.timer.start();
    }

    selectCell(cell) {
        if (this.selectedCell) {
            this.selectedCell.classList.remove('selected');
        }
        cell.classList.add('selected');
        this.selectedCell = cell;
    }

    enterNumber(num) {
        if (!this.selectedCell || this.isPaused) return;
        
        const row = parseInt(this.selectedCell.dataset.row);
        const col = parseInt(this.selectedCell.dataset.col);
        const index = row * 9 + col;

        if (this.puzzle[index] === '0') {
            this.currentNumbers[index] = num.toString();
            this.selectedCell.textContent = num;
            this.validateMove(row, col, num);
            this.checkWin();
        }
    }

    validateMove(row, col, num) {
        const index = row * 9 + col;
        if (this.solution[index] === num.toString()) {
            this.selectedCell.classList.remove('invalid');
            this.selectedCell.classList.add('valid');
        } else {
            this.selectedCell.classList.remove('valid');
            this.selectedCell.classList.add('invalid');
        }
    }

    checkWin() {
        if (this.currentNumbers.join('') === this.solution) {
            this.timer.stop();
            alert('Congratulations! You solved the puzzle!');
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const board = document.getElementById('sudoku-board');
        if (this.isPaused) {
            board.classList.add('paused');
            this.timer.pause();
        } else {
            board.classList.remove('paused');
            this.timer.resume();
        }
    }

    renderBoard() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            const value = this.puzzle[index];
            if (value !== '0') {
                cell.textContent = value;
                cell.classList.add('initial');
            } else {
                cell.textContent = '';
                cell.classList.remove('initial');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new SudokuGame();
});
