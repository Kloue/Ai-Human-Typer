"""
AI Human Typer Server - Desktop Application
Created by: Kloue
Date: 2025-01-23
Version: 1.0.0

This server runs locally and provides realistic typing automation
for the Chrome extension.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pyautogui
import time
import random
import threading
import sys
import os
from datetime import datetime

# For system tray icon
try:
    import pystray
    from pystray import MenuItem as item
    from PIL import Image, ImageDraw
    HAS_TRAY = True
except ImportError:
    HAS_TRAY = False
    print("⚠️ pystray not available - running without system tray icon")

app = Flask(__name__)
CORS(app)

# Global state
is_typing = False
should_stop = False
server_version = "1.0.0"
server_start_time = datetime.now()

# PyAutoGUI settings
pyautogui.FAILSAFE = True  # Move mouse to corner to stop
pyautogui.PAUSE = 0.01  # Small pause between commands

def log(message):
    """Print with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")

def calculate_delay(wpm, variance):
    """Calculate realistic typing delay based on WPM with variance"""
    # Average word = 5 characters
    chars_per_second = (wpm * 5) / 60
    base_delay = 1 / chars_per_second
    
    # Add variance
    variance_amount = base_delay * (variance / 100)
    delay = base_delay + random.uniform(-variance_amount, variance_amount)
    
    return max(0.02, delay)  # Minimum 20ms

def get_adjacent_key(char):
    """Get adjacent keyboard keys for realistic typos"""
    adjacent_keys = {
        'a': ['s', 'q', 'z', 'w'], 'b': ['v', 'g', 'n', 'h'],
        'c': ['x', 'd', 'v', 'f'], 'd': ['s', 'e', 'f', 'c', 'x'],
        'e': ['w', 'r', 'd', 's'], 'f': ['d', 'r', 'g', 'v', 'c'],
        'g': ['f', 't', 'h', 'b', 'v'], 'h': ['g', 'y', 'j', 'n', 'b'],
        'i': ['u', 'o', 'k', 'j'], 'j': ['h', 'u', 'k', 'm', 'n'],
        'k': ['j', 'i', 'l', 'o'], 'l': ['k', 'o', 'p'],
        'm': ['n', 'j', 'k'], 'n': ['b', 'h', 'j', 'm'],
        'o': ['i', 'p', 'l', 'k'], 'p': ['o', 'l'],
        'q': ['w', 'a', 's'], 'r': ['e', 't', 'f', 'd'],
        's': ['a', 'w', 'd', 'x', 'z'], 't': ['r', 'y', 'g', 'f'],
        'u': ['y', 'i', 'j', 'h'], 'v': ['c', 'f', 'b', 'g'],
        'w': ['q', 'e', 's', 'a'], 'x': ['z', 's', 'c', 'd'],
        'y': ['t', 'u', 'h', 'g'], 'z': ['a', 's', 'x']
    }
    
    lower_char = char.lower()
    if lower_char in adjacent_keys:
        wrong = random.choice(adjacent_keys[lower_char])
        return wrong.upper() if char.isupper() else wrong
    return char

def type_text_humanlike(text, settings):
    """Type text with human-like patterns"""
    global is_typing, should_stop
    
    is_typing = True
    should_stop = False
    
    wpm = settings.get('wpm', 60)
    variance = settings.get('variance', 20)
    mistake_rate = settings.get('mistakeRate', 5)
    thinking_pause = settings.get('thinkingPause', True)
    self_correction = settings.get('selfCorrection', True)
    
    log(f"🚀 Starting typing session")
    log(f"📝 Text length: {len(text)} characters")
    log(f"⚙️ WPM: {wpm}, Variance: {variance}%, Mistakes: {mistake_rate}%")
    log(f"⏳ Waiting 3 seconds - please focus on your typing field...")
    
    # Give user time to focus on Google Docs
    for i in range(3, 0, -1):
        log(f"   {i}...")
        time.sleep(1)
    
    log("⌨️ Starting typing NOW!")
    
    chars_typed = 0
    mistakes_made = 0
    
    for i, char in enumerate(text):
        if should_stop:
            log("⏹️ Typing stopped by user")
            break
        
        # Calculate delay for this character
        delay = calculate_delay(wpm, variance)
        
        # Simulate random typos
        made_mistake = False
        if self_correction and char.isalpha() and random.random() * 100 < mistake_rate:
            # Type wrong character
            wrong_char = get_adjacent_key(char)
            pyautogui.write(wrong_char, interval=0)
            time.sleep(delay)
            
            # Realize mistake after a moment
            time.sleep(random.uniform(0.15, 0.4))
            
            # Backspace to fix
            pyautogui.press('backspace')
            time.sleep(delay * 1.5)
            
            mistakes_made += 1
            made_mistake = True
        
        # Type the correct character
        if char == '\n':
            pyautogui.press('enter')
        elif char == '\t':
            pyautogui.press('tab')
        else:
            pyautogui.write(char, interval=0)
        
        chars_typed += 1
        
        # Thinking pauses at sentence endings
        if thinking_pause and char in ['.', '!', '?']:
            if random.random() < 0.5:  # 50% chance
                pause_duration = random.uniform(1.0, 3.0)
                log(f"💭 Thinking pause: {pause_duration:.1f}s at position {i}")
                time.sleep(pause_duration)
        
        # Normal character delay
        time.sleep(delay)
        
        # Progress updates
        if (i + 1) % 100 == 0:
            progress = ((i + 1) / len(text)) * 100
            log(f"📊 Progress: {progress:.1f}% ({i + 1}/{len(text)}) - Mistakes: {mistakes_made}")
    
    is_typing = False
    
    if not should_stop:
        log("✅ Typing completed successfully!")
        log(f"📈 Stats: {chars_typed} chars, {mistakes_made} mistakes corrected")
    
    return {
        'completed': not should_stop,
        'chars_typed': chars_typed,
        'mistakes_made': mistakes_made
    }

# ============================================
# API ENDPOINTS
# ============================================

@app.route('/status', methods=['GET'])
def status():
    """Get server status"""
    uptime = (datetime.now() - server_start_time).total_seconds()
    return jsonify({
        'status': 'online',
        'version': server_version,
        'is_typing': is_typing,
        'uptime_seconds': uptime,
        'author': 'Kloue',
        'date': '2025-01-23'
    })

@app.route('/type', methods=['POST'])
def start_typing():
    """Start typing the provided text"""
    global should_stop
    
    data = request.json
    text = data.get('text', '')
    settings = data.get('settings', {})
    
    if not text:
        return jsonify({
            'success': False,
            'error': 'No text provided'
        }), 400
    
    if is_typing:
        return jsonify({
            'success': False,
            'error': 'Already typing - please wait or stop current session'
        }), 400
    
    log("=" * 60)
    log("📨 Received typing request from extension")
    
    # Start typing in background thread
    def type_thread():
        try:
            type_text_humanlike(text, settings)
        except Exception as e:
            log(f"❌ Error during typing: {e}")
    
    thread = threading.Thread(target=type_thread)
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'success': True,
        'message': 'Typing started - focus on your text field!',
        'text_length': len(text)
    })

@app.route('/stop', methods=['POST'])
def stop_typing():
    """Stop current typing session"""
    global should_stop
    
    if not is_typing:
        return jsonify({
            'success': False,
            'error': 'Not currently typing'
        }), 400
    
    should_stop = True
    log("⏹️ Stop request received")
    
    return jsonify({
        'success': True,
        'message': 'Stopping typing...'
    })

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'healthy': True})

# ============================================
# SYSTEM TRAY ICON (Optional)
# ============================================

def create_image():
    """Create system tray icon"""
    # Create a simple icon
    width = 64
    height = 64
    color1 = (102, 126, 234)  # Purple-blue
    color2 = (118, 75, 162)   # Purple
    
    image = Image.new('RGB', (width, height), color1)
    dc = ImageDraw.Draw(image)
    
    # Draw "AI" text
    dc.rectangle([10, 10, 54, 54], fill=color2)
    dc.text((16, 20), "AI", fill='white')
    
    return image

def on_quit(icon, item):
    """Quit the application"""
    log("👋 Shutting down server...")
    icon.stop()
    os._exit(0)

def run_system_tray():
    """Run system tray icon"""
    if not HAS_TRAY:
        return
    
    icon = pystray.Icon(
        "AI Typer",
        create_image(),
        "AI Human Typer - Running on :8765",
        menu=pystray.Menu(
            item('AI Human Typer v1.0.0', lambda: None, enabled=False),
            item('Status: Online', lambda: None, enabled=False),
            item('Port: 8765', lambda: None, enabled=False),
            pystray.Menu.SEPARATOR,
            item('Quit', on_quit)
        )
    )
    
    icon.run()

# ============================================
# MAIN
# ============================================

def print_banner():
    """Print startup banner"""
    print("\n" + "=" * 60)
    print("  🤖 AI HUMAN TYPER SERVER")
    print("=" * 60)
    print(f"  Version: {server_version}")
    print(f"  Author: Kloue")
    print(f"  Date: 2025-01-23")
    print("=" * 60)
    print(f"  🌐 Server URL: http://localhost:8765")
    print(f"  📊 Status: http://localhost:8765/status")
    print(f"  ⚙️ Health: http://localhost:8765/health")
    print("=" * 60)
    print("  ✅ Server is ONLINE and ready!")
    print("  💡 Use the Chrome extension to start typing")
    print("  ⚠️ Move mouse to corner to emergency stop")
    print("=" * 60)
    print()

if __name__ == '__main__':
    print_banner()
    
    # Start system tray in separate thread
    if HAS_TRAY:
        tray_thread = threading.Thread(target=run_system_tray)
        tray_thread.daemon = True
        tray_thread.start()
        log("📌 System tray icon started")
    
    # Start Flask server
    try:
        app.run(
            host='127.0.0.1',
            port=8765,
            debug=False,
            use_reloader=False
        )
    except KeyboardInterrupt:
        log("👋 Server stopped by user")
    except Exception as e:
        log(f"❌ Server error: {e}")