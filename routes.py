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
    try:
        data = request.get_json()
        current_state = data.get('board')
        solution = data.get('solution')
        
        if not current_state or not solution:
            return jsonify({'error': 'Missing board state or solution'}), 400
            
        hint = analyze_hint_candidates(current_state, solution)
        if not hint:
            return jsonify({'error': 'No valid hints available'}), 404
            
        # Prepare hint message based on technique
        hint_messages = {
            'single_candidate': 'Look for a cell where only one number is possible',
            'hidden_single': 'Find a number that can only go in one position',
            'basic_elimination': 'Use basic elimination to find the correct number'
        }
        
        return jsonify({
            'row': hint['row'],
            'col': hint['col'],
            'value': hint['value'],
            'technique': hint['technique'],
            'message': hint_messages.get(hint['technique'], 'Use elimination to solve this cell'),
            'related_cells': hint['related_cells']
        })
        
    except Exception as e:
        print(f"Error generating hint: {str(e)}")
        return jsonify({'error': 'Failed to generate hint'}), 500

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        subject = request.form.get('subject')
        message = request.form.get('message')
        
        # Here you would typically send the email or store the contact form submission
        flash('Thank you for your message! We will get back to you soon.', 'success')
        return redirect(url_for('contact'))
    return render_template('contact.html')

@app.route('/daily-challenge')
def daily_challenge():
    try:
        from models import DailyPuzzle
        from utils.generator import generate_puzzle
        from app import db
        import logging
        
        logging.info("Accessing daily challenge endpoint")
        today = datetime.now().date()
        
        # Try to get today's puzzle from the database
        try:
            daily_puzzle = DailyPuzzle.query.filter_by(puzzle_date=today).first()
            logging.info(f"Queried daily puzzle for date: {today}")
        except Exception as db_error:
            logging.error(f"Database error while fetching daily puzzle: {str(db_error)}")
            return jsonify({'error': 'Failed to fetch daily puzzle'}), 500
        
        if not daily_puzzle:
            logging.info("No puzzle found for today, generating new puzzle")
            try:
                # Generate a new puzzle with random difficulty
                difficulty = random.choice(['easy', 'medium', 'hard'])
                puzzle, solution = generate_puzzle(difficulty)
                
                # Create new daily puzzle
                daily_puzzle = DailyPuzzle(
                    puzzle_date=today,
                    puzzle=puzzle,
                    solution=solution,
                    difficulty=difficulty
                )
                db.session.add(daily_puzzle)
                db.session.commit()
                logging.info(f"Created new daily puzzle with difficulty: {difficulty}")
            except Exception as gen_error:
                logging.error(f"Error generating/saving new puzzle: {str(gen_error)}")
                db.session.rollback()
                return jsonify({'error': 'Failed to generate new puzzle'}), 500
        
        return jsonify({
            'puzzle': daily_puzzle.puzzle,
            'solution': daily_puzzle.solution,
            'difficulty': daily_puzzle.difficulty,
            'date': daily_puzzle.puzzle_date.strftime('%Y-%m-%d')
        })
        
    except Exception as e:
        logging.error(f"Unexpected error in daily challenge: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500