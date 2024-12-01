import random

def generate_puzzle(difficulty):
    """Generate a Sudoku puzzle with its solution"""
    def is_valid(board, row, col, num):
        # Check row
        for x in range(9):
            if board[row][x] == num:
                return False
        
        # Check column
        for x in range(9):
            if board[x][col] == num:
                return False
        
        # Check 3x3 box
        start_row, start_col = 3 * (row // 3), 3 * (col // 3)
        for i in range(3):
            for j in range(3):
                if board[i + start_row][j + start_col] == num:
                    return False
        return True

    def solve(board):
        for i in range(9):
            for j in range(9):
                if board[i][j] == 0:
                    for num in range(1, 10):
                        if is_valid(board, i, j, num):
                            board[i][j] = num
                            if solve(board):
                                return True
                            board[i][j] = 0
                    return False
        return True

    # Initialize empty board
    board = [[0 for _ in range(9)] for _ in range(9)]
    
    # Fill diagonal boxes
    nums = list(range(1, 10))
    for i in range(0, 9, 3):
        random.shuffle(nums)
        for j in range(3):
            for k in range(3):
                board[i + j][i + k] = nums[j * 3 + k]
    
    # Solve the board
    solve(board)
    
    # Create solution string
    solution = ''.join(str(num) for row in board for num in row)
    
    # Create puzzle by removing numbers
    cells_to_remove = {
        'easy': 30,
        'medium': 40,
        'hard': 50
    }
    
    puzzle = [row[:] for row in board]
    remove_count = cells_to_remove.get(difficulty, 30)
    
    positions = [(i, j) for i in range(9) for j in range(9)]
    random.shuffle(positions)
    
    for i, j in positions[:remove_count]:
        puzzle[i][j] = 0
    
    puzzle_string = ''.join(str(num) for row in puzzle for num in row)
    return puzzle_string, solution
