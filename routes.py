from flask import render_template, jsonify, request, flash, redirect, url_for
from app import app
from utils.generator import generate_puzzle, analyze_hint_candidates

from datetime import datetime, timedelta
import random
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
    
    # Get hint candidates with analysis
    candidates = analyze_hint_candidates(current_state, solution)
    
    if not candidates:
        return jsonify({'message': 'No hints available'}), 404
    
    # Get the best hint (first candidate)
    best_hint = candidates[0]
    
    # Prepare hint message based on technique
    hint_messages = {
        'single_candidate': 'Look for a cell where only one number is possible',
        'hidden_single': 'Find a number that can only go in one position',
        'basic_elimination': 'Use basic elimination to find the correct number'
    }
    
    return jsonify({
        'row': best_hint['row'],
        'col': best_hint['col'],
        'value': best_hint['value'],
        'technique': best_hint['technique'],
        'message': hint_messages.get(best_hint['technique'], 'Use elimination to solve this cell')
    })


@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        subject = request.form.get('subject')
        message = request.form.get('message')
        
        # Here you would typically send the email or store the contact form submission
        # For now, we'll just show a success message
        flash('Thank you for your message! We will get back to you soon.', 'success')
        return redirect(url_for('contact'))

@app.route('/daily-challenge')
def daily_challenge():
    today = datetime.now().date()
    
    # Try to get today's puzzle from the database
    result = execute_sql_tool(f"""
        SELECT puzzle, solution, difficulty 
        FROM daily_puzzles 
        WHERE puzzle_date = '{today}'
    """)
    
    if not result:
        # Generate a new puzzle with random difficulty
        difficulty = random.choice(['easy', 'medium', 'hard'])
        puzzle, solution = generate_puzzle(difficulty)
        
        # Store the puzzle in the database
        execute_sql_tool(f"""
            INSERT INTO daily_puzzles (puzzle_date, puzzle, solution, difficulty)
            VALUES ('{today}', '{puzzle}', '{solution}', '{difficulty}')
        """)
    else:
        puzzle = result[0][0]
        solution = result[0][1]
        difficulty = result[0][2]
    
    return jsonify({
        'puzzle': puzzle,
        'solution': solution,
        'difficulty': difficulty,
        'date': today.strftime('%Y-%m-%d')
    })
        
    return render_template('contact.html')