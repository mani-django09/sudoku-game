class SudokuGame {
    constructor() {
        // Initialize basic state
        this.initialized = false;
        this.selectedCell = null;
        this.puzzle = null;
        this.solution = null;
        this.currentNumbers = null;
        this.pencilMode = false;
        this.pencilMarks = null;
        this.gameState = null;
        this.timer = null;
        this.isPaused = false;

        // Ensure initialization happens after DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    async initialize() {
        console.log('Initializing SudokuGame...');
        
        try {
            // Initialize game state
            this.validateAndInitializeState();
            
            // Initialize timer
            await this.initializeTimer();
            
            // Initialize game components
            await this.initializeComponents();
            
            this.initialized = true;
            console.log('Game initialization completed successfully');
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.showError('Failed to initialize game: ' + error.message);
        }
    }

    validateAndInitializeState() {
        this.currentNumbers = new Array(81).fill('0');
        this.pencilMarks = Array(81).fill().map(() => new Set());
        this.gameState = {
            moves: [],
            currentMove: -1,
            remainingHints: 3,
            mistakes: 0
        };
    }

    async initializeTimer() {
        try {
            const timerElement = document.getElementById('timer');
            if (!timerElement) {
                throw new Error('Timer element not found');
            }
            this.timer = new Timer();
            console.log('Timer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize timer:', error);
            throw new Error('Timer initialization failed');
        }
    }

    async initializeComponents() {
        try {
            await this.setupBoard();
            this.setupControls();
            this.setupKeyboardInput();
            await this.newGame('easy');
        } catch (error) {
            console.error('Failed to initialize components:', error);
            throw error;
        }
    }

    async setupBoard() {
        console.log('Setting up game board...');
        
        const board = document.getElementById('sudoku-board');
        if (!board) {
            throw new Error('Sudoku board element not found');
        }
        
        board.innerHTML = '';
        console.log('Board cleared, creating cells...');
        
        try {
            for (let i = 0; i < 9; i++) {
                for (let j = 0; j < 9; j++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    cell.dataset.row = i;
                    cell.dataset.col = j;
                    cell.dataset.index = i * 9 + j;
                    
                    const pencilMarksDiv = document.createElement('div');
                    pencilMarksDiv.className = 'pencil-marks';
                    cell.appendChild(pencilMarksDiv);
                    
                    cell.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (!this.initialized || this.isPaused) return;
                        this.selectCell(cell);
                    });
                    
                    board.appendChild(cell);
                }
            }
            console.log('Board setup completed successfully');
        } catch (error) {
            console.error('Error setting up board:', error);
            throw new Error('Failed to setup game board');
        }
    }

    async newGame(difficulty) {
        try {
            // Validate difficulty
            const validDifficulties = ['easy', 'medium', 'hard'];
            if (!validDifficulties.includes(difficulty)) {
                throw new Error(`Invalid difficulty level: ${difficulty}`);
            }

            // Update UI to show loading state
            document.querySelectorAll('.mode-btn').forEach(btn => {
                btn.disabled = true;
            });
            
            const response = await fetch(`/new-game/${difficulty}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch new game: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.puzzle || !data.solution || 
                data.puzzle.length !== 81 || data.solution.length !== 81) {
                throw new Error('Invalid puzzle or solution data');
            }

            // Update difficulty buttons
            document.querySelectorAll('.mode-btn').forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('active');
                if (btn.dataset.difficulty === difficulty) {
                    btn.classList.add('active');
                }
            });
            
            this.puzzle = data.puzzle;
            this.solution = data.solution;
            this.currentNumbers = [...this.puzzle];
            
            // Reset game state
            this.gameState = {
                moves: [],
                currentMove: -1,
                remainingHints: 3,
                mistakes: 0
            };
            
            this.pencilMarks = Array(81).fill().map(() => new Set());
            this.pencilMode = false;
            
            // Update UI
            this.updatePencilModeIndicator();
            this.updateHintCount();
            this.updateMistakesDisplay();
            await this.renderBoard();
            
            // Reset and start timer
            if (this.timer) {
                this.timer.reset();
                this.timer.start();
            }
        } catch (error) {
            console.error('Error starting new game:', error);
            this.showError('Failed to start new game: ' + error.message);
        }
    }

    async renderBoard() {
        try {
            const cells = document.querySelectorAll('.cell');
            
            if (!this.puzzle || !this.currentNumbers) {
                throw new Error('Game data not initialized');
            }

            cells.forEach((cell, index) => {
                // Clear existing content
                const value = this.currentNumbers[index];
                cell.textContent = value === '0' ? '' : value;
                
                // Set classes
                cell.classList.remove('initial', 'valid', 'invalid', 'selected', 'related', 'hint');
                if (this.puzzle[index] !== '0') {
                    cell.classList.add('initial');
                }
                
                // Create new pencil marks container
                const oldPencilMarks = cell.querySelector('.pencil-marks');
                if (oldPencilMarks) {
                    oldPencilMarks.remove();
                }
                
                const pencilMarksDiv = document.createElement('div');
                pencilMarksDiv.className = 'pencil-marks';
                cell.appendChild(pencilMarksDiv);
                
                // Render pencil marks
                if (this.pencilMarks[index].size > 0) {
                    this.renderPencilMarks(index);
                }
            });
        } catch (error) {
            console.error('Error rendering board:', error);
            throw new Error('Failed to render game board: ' + error.message);
        }
    }

    renderPencilMarks(index) {
        const cell = document.querySelector(`.cell[data-index="${index}"]`);
        if (!cell) return;
        
        const pencilMarksDiv = cell.querySelector('.pencil-marks');
        if (!pencilMarksDiv) return;
        
        pencilMarksDiv.innerHTML = '';
        
        const grid = document.createElement('div');
        grid.className = 'pencil-marks-grid';
        
        for (let i = 1; i <= 9; i++) {
            const mark = document.createElement('div');
            mark.className = 'pencil-mark';
            if (this.pencilMarks[index].has(i)) {
                mark.textContent = i;
            }
            grid.appendChild(mark);
        }
        
        pencilMarksDiv.appendChild(grid);
    }

    async getHint(retryCount = 0) {
        let hintMessage = null;
        try {
            // Validate game state
            if (!this.initialized) {
                throw new Error('Game not initialized');
            }

            if (this.gameState.remainingHints <= 0) {
                throw new Error('No hints remaining');
            }

            if (this.isPaused) {
                throw new Error('Cannot get hint while game is paused');
            }

            // Validate board state
            if (!this.currentNumbers || !this.solution) {
                throw new Error('Invalid game state');
            }

            const currentState = this.currentNumbers.join('');
            if (currentState.length !== 81 || !/^[0-9]+$/.test(currentState)) {
                throw new Error('Invalid board state');
            }

            // Clear any existing visualizations, error messages, and hint messages
            this.clearTechniqueVisualizations();
            document.querySelectorAll('.game-error, .hint-message, .hint-overlay').forEach(el => el.remove());

            console.log('Requesting hint...');
            const response = await fetch('/hint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    current_state: currentState,
                    solution: this.solution
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(data.error || 'No hints available');
                }
                // If it's a server error and we haven't exceeded retry attempts
                if (response.status === 500 && retryCount < 2) {
                    console.log(`Retrying hint request (attempt ${retryCount + 1})...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return this.getHint(retryCount + 1);
                }
                throw new Error(data.error || 'Failed to get hint');
            }

            // Validate hint response
            const requiredFields = ['row', 'col', 'value', 'technique', 'related_cells', 'message'];
            const missingFields = requiredFields.filter(field => !data[field]);
            
            if (missingFields.length > 0) {
                throw new Error(`Invalid hint data: missing ${missingFields.join(', ')}`);
            }

            // Validate hint message
            if (typeof data.message !== 'string' || !data.message.trim()) {
                throw new Error('Invalid hint message format');
            }

            // Validate data types and ranges
            if (!Number.isInteger(data.row) || data.row < 0 || data.row > 8 ||
                !Number.isInteger(data.col) || data.col < 0 || data.col > 8 ||
                !/^[1-9]$/.test(data.value) ||
                !Array.isArray(data.related_cells)) {
                throw new Error('Invalid hint data format');
            }

            // Validate related cells format
            if (!data.related_cells.every(cell => 
                typeof cell === 'object' &&
                Number.isInteger(cell.row) &&
                Number.isInteger(cell.col) &&
                cell.row >= 0 && cell.row < 9 &&
                cell.col >= 0 && cell.col < 9
            )) {
                throw new Error('Invalid related cells format');
            }

            const hint = data;
            const index = hint.row * 9 + hint.col;
            const cell = document.querySelector(
                `.cell[data-row="${hint.row}"][data-col="${hint.col}"]`
            );

            if (!cell) {
                throw new Error('Cell not found');
            }

            // Save current state for undo
            const oldState = {
                index: index,
                value: this.currentNumbers[index],
                pencilMarks: new Set(this.pencilMarks[index])
            };

            // Clear pencil marks
            this.pencilMarks[index].clear();
            this.renderPencilMarks(index);

            // Create hint message element
            hintMessage = document.createElement('div');
            hintMessage.className = 'hint-message';
            hintMessage.textContent = hint.message;
            document.querySelector('.game-container').appendChild(hintMessage);

            // Visualize the solving technique
            await this.visualizeTechnique(hint);
            
            // Update number and UI after visualization
            setTimeout(() => {
                this.currentNumbers[index] = hint.value;
                cell.textContent = hint.value;
                cell.classList.add('hint', 'hint-active');
                cell.classList.add('hint-reveal');
            }, 1500);
            
            // Record move
            this.gameState.moves.splice(this.gameState.currentMove + 1);
            this.gameState.moves.push({
                type: 'hint',
                oldState: oldState,
                newState: {
                    index: index,
                    value: hint.value,
                    pencilMarks: new Set()
                }
            });
            this.gameState.currentMove++;

            // Remove hint highlight and message after animation
            setTimeout(() => {
                cell.classList.remove('hint-reveal', 'hint-active');
                if (hintMessage && hintMessage.parentNode) {
                    hintMessage.remove();
                }
            }, 3000);

            // Decrement hint count
            this.gameState.remainingHints--;
            this.updateHintCount();

            // Check if puzzle is complete
            this.checkWin();

        } catch (error) {
            console.error('Error getting hint:', error);
            this.showError('Failed to get hint: ' + error.message);
            // Clean up hint message if there was an error
            if (hintMessage && hintMessage.parentNode) {
                hintMessage.remove();
            }
        }
    }

    updateHintCount() {
        const hintButton = document.getElementById('hint');
        const hintCount = hintButton.querySelector('.hint-count');
        if (hintCount) {
            hintCount.textContent = this.gameState.remainingHints;
        }
        hintButton.disabled = this.gameState.remainingHints <= 0;
    }

    updateMistakesDisplay() {
        const mistakesElement = document.getElementById('mistakes');
        if (mistakesElement) {
            mistakesElement.textContent = `${this.gameState.mistakes}/3`;
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


    selectCell(cell) {
        console.log('Selecting cell:', cell.dataset.row, cell.dataset.col);
        
        try {
            // Clear previous selections and highlights
            document.querySelectorAll('.cell').forEach(c => {
                c.classList.remove('selected', 'related', 'hint');
            });

            // Don't select if game is paused
            if (this.isPaused) {
                console.log('Game is paused, cell selection blocked');
                return;
            }

            // Set new selected cell
            cell.classList.add('selected');
            this.selectedCell = cell;

            // Highlight related cells
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);

            document.querySelectorAll('.cell').forEach(c => {
                const cRow = parseInt(c.dataset.row);
                const cCol = parseInt(c.dataset.col);
                const cBox = Math.floor(cRow / 3) * 3 + Math.floor(cCol / 3);

                if ((cRow === row || cCol === col || cBox === box) && c !== cell) {
                    c.classList.add('related');
                }
            });

            console.log('Cell selected and related cells highlighted');
        } catch (error) {
            console.error('Error in selectCell:', error);
        }
    }

    setupControls() {
        // Setup numpad
        const numpad = document.getElementById('numpad');
        if (!numpad) {
            throw new Error('Numpad element not found');
        }
        
        numpad.innerHTML = '';
        for (let i = 1; i <= 9; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.addEventListener('click', () => this.enterNumber(i));
            numpad.appendChild(button);
        }

        // Setup control buttons
        const undoButton = document.getElementById('undo');
        if (undoButton) {
            undoButton.addEventListener('click', () => this.undoMove());
        }

        const eraseButton = document.getElementById('erase');
        if (eraseButton) {
            eraseButton.addEventListener('click', () => this.eraseNumber());
        }

        const pencilButton = document.getElementById('pencil');
        if (pencilButton) {
            pencilButton.addEventListener('click', () => this.togglePencilMode());
        }

        const hintButton = document.getElementById('hint');
        if (hintButton) {
            hintButton.addEventListener('click', () => this.getHint());
        }

        // Setup difficulty buttons and daily challenge
        document.querySelectorAll('.mode-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                // Remove active class from all buttons
                document.querySelectorAll('.mode-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                // Add active class to clicked button
                e.target.classList.add('active');
                
                if (e.target.id === 'daily-challenge') {
                    try {
                        const response = await fetch('/daily-challenge');
                        if (!response.ok) {
                            throw new Error('Failed to fetch daily challenge');
                        }
                        const data = await response.json();
                        this.puzzle = data.puzzle;
                        this.solution = data.solution;
                        this.currentNumbers = [...this.puzzle];
                        
                        // Reset game state
                        this.gameState = {
                            moves: [],
                            currentMove: -1,
                            remainingHints: 3,
                            mistakes: 0
                        };
                        
                        this.pencilMarks = Array(81).fill().map(() => new Set());
                        this.pencilMode = false;
                        
                        // Update UI
                        this.updatePencilModeIndicator();
                        this.updateHintCount();
                        this.updateMistakesDisplay();
                        await this.renderBoard();
                        
                        // Reset and start timer
                        if (this.timer) {
                            this.timer.reset();
                            this.timer.start();
                        }
                    } catch (error) {
                        console.error('Error loading daily challenge:', error);
                        this.showError('Failed to load daily challenge: ' + error.message);
                    }
                } else {
                    // Start new game with selected difficulty
                    this.newGame(e.target.dataset.difficulty);
                }
            });
        });

        // Setup New Game button
        const newGameButton = document.getElementById('new-game-btn');
        if (newGameButton) {
            newGameButton.addEventListener('click', () => {
                // Get current difficulty from active difficulty button
                const activeDifficultyBtn = document.querySelector('.mode-btn.active');
                const difficulty = activeDifficultyBtn ? activeDifficultyBtn.dataset.difficulty : 'easy';
                
                // Call the newGame function with the current difficulty
                this.newGame(difficulty);
                
                // Update UI to show loading state
                newGameButton.disabled = true;
                setTimeout(() => {
                    newGameButton.disabled = false;
                }, 1000);
            });
        }

        // Update hint count display
        this.updateHintCount();
    }

    setupKeyboardInput() {
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '9') {
                this.enterNumber(parseInt(e.key));
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                this.eraseNumber();
            }
        });
    }

    showError(message) {
        console.error('Game error:', message);
        
        const existingError = document.querySelector('.game-error');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'game-error';
        errorDiv.textContent = message;
        document.querySelector('.game-container').appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }

    isValidHint(row, col, value) {
        if (row < 0 || row >= 9 || col < 0 || col >= 9) {
            return false;
        }

        const index = row * 9 + col;
        
        if (this.currentNumbers[index] !== '0' && 
            this.currentNumbers[index] !== this.solution[index]) {
            return false;
        }

        return this.solution[index] === value;
    }

    enterNumber(num) {
        try {
            console.log('Attempting to enter number:', num);
            
            if (!this.initialized) {
                throw new Error('Game not fully initialized');
            }
            
            if (!this.selectedCell) {
                throw new Error('No cell selected');
            }
            
            if (this.isPaused) {
                throw new Error('Game is paused');
            }
            
            const index = parseInt(this.selectedCell.dataset.index);
            
            if (this.puzzle[index] !== '0') {
                throw new Error('Cannot modify initial numbers');
            }
            
            const gameState = {
                row: Math.floor(index / 9),
                col: index % 9,
                index: index,
                isPencilMode: this.pencilMode,
                currentValue: this.currentNumbers[index],
                isInitialCell: this.puzzle[index] !== '0'
            };
            
            console.log('Current game state:', gameState);
            
            if (this.pencilMode) {
                this.togglePencilMark(index, num);
            } else {
                // Save move for undo
                const oldState = {
                    index: index,
                    value: this.currentNumbers[index],
                    pencilMarks: new Set(this.pencilMarks[index])
                };
                
                // Clear pencil marks
                this.pencilMarks[index].clear();
                this.renderPencilMarks(index);
                
                // Update number
                this.currentNumbers[index] = num.toString();
                this.selectedCell.textContent = num;
                
                // Check against solution
                if (this.solution[index] !== num.toString()) {
                    this.gameState.mistakes++;
                    this.updateMistakesDisplay();
                    this.selectedCell.classList.add('invalid');
                    
                    if (this.gameState.mistakes >= 5) {
                        this.showError('Game Over: Too many mistakes. Try a new game!');
                        this.timer.stop();
                        document.getElementById('sudoku-board').classList.add('game-over');
                        return;
                    } else if (this.gameState.mistakes === 4) {
                        this.showError('Warning: One more mistake will end the game!');
                    }
                } else {
                    this.selectedCell.classList.add('valid');
                }
                
                // Record move
                this.gameState.moves.splice(this.gameState.currentMove + 1);
                this.gameState.moves.push({
                    type: 'number',
                    oldState: oldState,
                    newState: {
                        index: index,
                        value: num.toString(),
                        pencilMarks: new Set()
                    }
                });
                this.gameState.currentMove++;
            }
            
            console.log('Number entered successfully');
            this.checkWin();
        } catch (error) {
            console.error('Error entering number:', error);
            this.showError(error.message);
        }
    }

    togglePencilMark(index, num) {
        console.log('Toggling pencil mark:', num, 'at index:', index);
        
        try {
            if (index < 0 || index >= 81 || num < 1 || num > 9) {
                throw new Error('Invalid index or number for pencil mark');
            }

            if (!this.selectedCell) {
                throw new Error('No cell selected');
            }

            const pencilMarksContainer = this.selectedCell.querySelector('.pencil-marks');
            if (!pencilMarksContainer) {
                throw new Error('Pencil marks container not found');
            }

            // Initialize pencil marks array if needed
            if (!this.pencilMarks[index]) {
                this.pencilMarks[index] = new Set();
            }

            // Save current state for undo
            const oldState = {
                index: index,
                value: this.currentNumbers[index],
                pencilMarks: new Set(this.pencilMarks[index])
            };

            const hasNumber = this.pencilMarks[index].has(num);
            
            if (hasNumber) {
                this.pencilMarks[index].delete(num);
            } else {
                this.pencilMarks[index].add(num);
            }

            // Record move for undo
            this.gameState.moves.splice(this.gameState.currentMove + 1);
            this.gameState.moves.push({
                type: 'pencil',
                oldState: oldState,
                newState: {
                    index: index,
                    value: this.currentNumbers[index],
                    pencilMarks: new Set(this.pencilMarks[index])
                }
            });
            this.gameState.currentMove++;

            this.renderPencilMarks(index);
        } catch (error) {
            console.error('Error in togglePencilMark:', error.message);
            if (this.selectedCell) {
                this.selectedCell.classList.add('error');
                setTimeout(() => this.selectedCell.classList.remove('error'), 1000);
            }
            this.showError(error.message);
        }
    }


    undoMove() {
        if (this.gameState.currentMove < 0) {
            console.log('No moves to undo');
            return;
        }

        const move = this.gameState.moves[this.gameState.currentMove];
        const cell = document.querySelector(`.cell[data-index="${move.oldState.index}"]`);

        // Restore previous state
        this.currentNumbers[move.oldState.index] = move.oldState.value;
        this.pencilMarks[move.oldState.index] = new Set(move.oldState.pencilMarks);

        // Update UI
        if (move.type === 'pencil') {
            this.renderPencilMarks(move.oldState.index);
        } else {
            cell.textContent = move.oldState.value || '';
            cell.classList.remove('valid', 'invalid');
        }

        this.gameState.currentMove--;
    }

    eraseNumber() {
        if (!this.selectedCell) {
            return;
        }

        const index = parseInt(this.selectedCell.dataset.index);
        if (this.puzzle[index] !== '0') {
            this.showError('Cannot erase initial numbers');
            return;
        }

        // Save current state for undo
        const oldState = {
            index: index,
            value: this.currentNumbers[index],
            pencilMarks: new Set(this.pencilMarks[index])
        };

        // Clear number and pencil marks
        this.currentNumbers[index] = '0';
        this.pencilMarks[index].clear();
        this.selectedCell.textContent = '';
        this.selectedCell.classList.remove('valid', 'invalid');
        this.renderPencilMarks(index);

        // Record move
        this.gameState.moves.splice(this.gameState.currentMove + 1);
        this.gameState.moves.push({
            type: 'erase',
            oldState: oldState,
            newState: {
                index: index,
                value: '0',
                pencilMarks: new Set()
            }
        });
        this.gameState.currentMove++;
    }

    togglePencilMode() {
        this.pencilMode = !this.pencilMode;
        this.updatePencilModeIndicator();
    }

    updatePencilModeIndicator() {
        const pencilButton = document.getElementById('pencil');
        const stateIndicator = pencilButton.querySelector('.state-indicator');
        if (stateIndicator) {
            stateIndicator.textContent = this.pencilMode ? 'ON' : 'OFF';
        }
        pencilButton.classList.toggle('active', this.pencilMode);
    }

    clearTechniqueVisualizations() {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove(
                'hint-candidate',
                'hint-related',
                'hint-elimination',
                'hint-single',
                'hint-hidden-single',
                'hint-highlight',
                'hint-pair',
                'hint-affected',
                'hint-naked-pair',
                'hint-hidden-pair',
                'hint-pointing-pair',
                'hint-box-line',
                'hint-primary',
                'hint-secondary'
            );
        });
    }

    async visualizeTechnique(hint) {
        return new Promise((resolve) => {
            const { row, col, technique, related_cells = [], message } = hint;
            const index = row * 9 + col;
            const mainCell = document.querySelector(`.cell[data-index="${index}"]`);
            
            if (!mainCell) {
                console.error('Main cell not found for visualization');
                resolve();
                return;
            }

            // Clear any existing visualizations
            this.clearTechniqueVisualizations();

            // Create hint message overlay with technique indicator
            const hintOverlay = document.createElement('div');
            hintOverlay.className = `hint-overlay hint-overlay-${technique}`;
            
            // Create technique badge
            const techniqueBadge = document.createElement('div');
            techniqueBadge.className = 'technique-badge';
            techniqueBadge.textContent = technique.replace(/_/g, ' ').toUpperCase();
            hintOverlay.appendChild(techniqueBadge);

            // Add message with enhanced styling
            const messageElement = document.createElement('div');
            messageElement.className = 'hint-message';
            messageElement.textContent = message;
            hintOverlay.appendChild(messageElement);

            document.querySelector('.game-container').appendChild(hintOverlay);

            let delay = 0; // Common delay variable for all animations

            // Add visualization based on technique
            switch (technique) {
                case 'single_candidate':
                    mainCell.classList.add('hint-single', 'hint-primary');
                    // Animate related cells sequentially with improved timing
                    related_cells.forEach(({ row, col }, index) => {
                        const relatedIndex = row * 9 + col;
                        const relatedCell = document.querySelector(`.cell[data-index="${relatedIndex}"]`);
                        if (relatedCell) {
                            setTimeout(() => {
                                relatedCell.classList.add('hint-elimination', 'hint-highlight');
                                // Pulse animation for emphasis
                                setTimeout(() => relatedCell.classList.add('hint-pulse'), 100);
                            }, delay);
                            delay += 150; // Faster sequence for better visualization
                        }
                    });
                    break;

                case 'hidden_single':
                    mainCell.classList.add('hint-hidden-single', 'hint-primary');
                    // Enhanced animation for hidden single visualization
                    related_cells.forEach(({ row, col }) => {
                        const relatedIndex = row * 9 + col;
                        const relatedCell = document.querySelector(`.cell[data-index="${relatedIndex}"]`);
                        if (relatedCell) {
                            setTimeout(() => {
                                relatedCell.classList.add('hint-related', 'hint-secondary');
                            }, delay);
                        }
                    });
                    break;

                case 'naked_pair':
                    mainCell.classList.add('hint-naked-pair', 'hint-primary');
                    let pairIndex = 0;
                    related_cells.forEach(({ row, col }) => {
                        const relatedIndex = row * 9 + col;
                        const relatedCell = document.querySelector(`.cell[data-index="${relatedIndex}"]`);
                        if (relatedCell) {
                            setTimeout(() => {
                                if (pairIndex < 2) {
                                    // Highlight the pair cells
                                    relatedCell.classList.add('hint-naked-pair', 'hint-primary');
                                } else {
                                    // Highlight affected cells
                                    relatedCell.classList.add('hint-affected', 'hint-secondary');
                                }
                            }, delay);
                            delay += 200;
                            pairIndex++;
                        }
                    });
                    break;

                case 'hidden_pair':
                    mainCell.classList.add('hint-hidden-pair', 'hint-primary');
                    related_cells.forEach(({ row, col }, index) => {
                        const relatedIndex = row * 9 + col;
                        const relatedCell = document.querySelector(`.cell[data-index="${relatedIndex}"]`);
                        if (relatedCell) {
                            setTimeout(() => {
                                if (index < 2) {
                                    relatedCell.classList.add('hint-hidden-pair', 'hint-primary');
                                } else {
                                    relatedCell.classList.add('hint-related', 'hint-secondary');
                                }
                            }, delay);
                            delay += 200;
                        }
                    });
                    break;

                case 'pointing_pair':
                    mainCell.classList.add('hint-pointing-pair', 'hint-primary');
                    related_cells.forEach(({ row, col }, index) => {
                        const relatedIndex = row * 9 + col;
                        const relatedCell = document.querySelector(`.cell[data-index="${relatedIndex}"]`);
                        if (relatedCell) {
                            setTimeout(() => {
                                if (index < 2) {
                                    relatedCell.classList.add('hint-pointing-pair', 'hint-primary');
                                } else {
                                    relatedCell.classList.add('hint-affected', 'hint-secondary');
                                }
                                relatedCell.classList.add('hint-pulse');
                            }, delay);
                            delay += 200;
                        }
                    });
                    break;

                case 'box_line_reduction':
                    mainCell.classList.add('hint-box-line', 'hint-primary');
                    related_cells.forEach(({ row, col }, index) => {
                        const relatedIndex = row * 9 + col;
                        const relatedCell = document.querySelector(`.cell[data-index="${relatedIndex}"]`);
                        if (relatedCell) {
                            setTimeout(() => {
                                relatedCell.classList.add('hint-box-line', index < 3 ? 'hint-primary' : 'hint-secondary');
                            }, delay);
                            delay += 150;
                        }
                    });
                    break;
                    // Group visualization
                    related_cells.forEach(({ row, col }) => {
                        const relatedIndex = row * 9 + col;
                        const relatedCell = document.querySelector(`.cell[data-index="${relatedIndex}"]`);
                        if (relatedCell) {
                            relatedCell.classList.add('hint-related');
                            setTimeout(() => {
                                relatedCell.classList.add('hint-highlight');
                            }, 300);
                        }
                    });
                    break;

                case 'naked_pair':
                case 'hidden_pair':
                    mainCell.classList.add('hint-pair');
                    related_cells.forEach(({ row, col, type }) => {
                        const relatedIndex = row * 9 + col;
                        const relatedCell = document.querySelector(`.cell[data-index="${relatedIndex}"]`);
                        if (relatedCell) {
                            setTimeout(() => {
                                relatedCell.classList.add(type === 'pair' ? 'hint-pair' : 'hint-affected');
                                relatedCell.classList.add('hint-highlight');
                            }, delay);
                            delay += 200;
                        }
                    });
                    break;

                case 'pointing_pair':
                case 'box_line_reduction':
                    mainCell.classList.add('hint-pair');
                    related_cells.forEach(({ row, col, type }) => {
                        const relatedIndex = row * 9 + col;
                        const relatedCell = document.querySelector(`.cell[data-index="${relatedIndex}"]`);
                        if (relatedCell) {
                            setTimeout(() => {
                                relatedCell.classList.add(type === 'pair' ? 'hint-pair' : 'hint-affected');
                                relatedCell.classList.add('hint-highlight');
                            }, delay);
                            delay += 200;
                        }
                    });
                    break;

                default:
                    // Basic elimination for unknown techniques
                    mainCell.classList.add('hint-candidate');
                    related_cells.forEach(({ row, col }) => {
                        const relatedIndex = row * 9 + col;
                        const relatedCell = document.querySelector(`.cell[data-index="${relatedIndex}"]`);
                        if (relatedCell) {
                            setTimeout(() => {
                                relatedCell.classList.add('hint-related');
                                relatedCell.classList.add('hint-highlight');
                            }, delay);
                            delay += 150;
                        }
                    });
                    break;
            }

            // Animate the main cell
            mainCell.classList.add('hint-highlight');
            
            // Cleanup and resolve after all animations
            setTimeout(() => {
                hintOverlay.remove();
                resolve();
            }, Math.max(2000, delay + 500)); // Ensure overlay stays visible long enough
        });
    }
}

// Initialize game when document is ready
document.addEventListener('DOMContentLoaded', () => {
    new SudokuGame();
});