from flask import render_template, jsonify, request
from app import app
from utils.generator import generate_puzzle

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new-game/<difficulty>')
def new_game(difficulty):
    puzzle, solution = generate_puzzle(difficulty)
    return jsonify({
        'puzzle': puzzle,
        'solution': solution
    })

@app.route('/hint', methods=['POST'])
def get_hint():
    data = request.get_json()
    current_state = data.get('current_state')
    solution = data.get('solution')
    
    if not current_state or not solution:
        return jsonify({'error': 'Missing required data'}), 400
    
    # Find the first cell that doesn't match the solution
    for i in range(len(current_state)):
        if current_state[i] == '0' and solution[i] != '0':
            row = i // 9
            col = i % 9
            return jsonify({
                'row': row,
                'col': col,
                'value': solution[i]
            })
    
    return jsonify({'message': 'No hints available'}), 404
