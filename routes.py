from flask import render_template, jsonify, request, flash, redirect, url_for
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
        
    return render_template('contact.html')