#!/usr/bin/env python3
from flask import Flask, jsonify, send_file
import subprocess
import threading

app = Flask(__name__)

@app.route('/')
def home():
    return send_file('update_ui.html')

@app.route('/api/check-update', methods=['GET'])
def check_update():
    result = subprocess.run(['python3', 'auto_updater.py'], capture_output=True, text=True)
    return jsonify({
        'output': result.stdout,
        'success': result.returncode == 0
    })

@app.route('/api/trigger-update', methods=['POST'])
def trigger_update():
    def run_update():
        subprocess.run(['python3', 'auto_updater.py'])
    
    threading.Thread(target=run_update).start()
    return jsonify({'message': 'Update started in background'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
