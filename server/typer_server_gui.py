# -*- coding: utf-8 -*-
"""
AI Human Typer Server 
Kloue - 2025-11-23
v1.2.0

TODO: clean this up eventually lol
"""

import sys
import io

# UTF-8 fix for windows console (keeps breaking otherwise)
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from flask import Flask, request, jsonify
from flask_cors import CORS
import pyautogui
import time
import random
import threading
from datetime import datetime
import pystray
from PIL import Image, ImageDraw

# sound stuff - windows only
try:
    import winsound
    SOUND_AVAILABLE = True
except ImportError:
    SOUND_AVAILABLE = False

# window tracking - need this for google docs
try:
    import pygetwindow as gw
    WINDOW_TRACKING_AVAILABLE = True
except ImportError:
    WINDOW_TRACKING_AVAILABLE = False
    print("⚠️ pygetwindow missing - run: pip install pygetwindow")

# init flask
app = Flask(__name__)
CORS(app)  # fix CORS errors from extension

# global state - yeah i know globals are bad but whatever
typing_state = {
    'is_typing': False,
    'paused': False,
    'current_position': 0,
    'total_length': 0,
    'text': '',
    'typed_so_far': '',
    'remaining_text': '',
    'pause_reason': None,
    'settings': {},
    'interruptions': 0
}

# default settings
current_settings = {
    'wpm': 60,
    'variance': 20,
    'mistakeRate': 5,
    'thinkingPause': True,
    'selfCorrection': True,
    'paragraphBreaks': 2,
    'aiEnhanced': False  # not implemented yet
}

typing_thread = None
stop_typing_flag = False
resume_signal = False
state_lock = threading.Lock()
last_settings_update = 0  # hack to avoid interruption on settings change

server_version = "1.2.0"
server_author = "Kloue"
server_date = "2025-11-23"

# pyautogui config
pyautogui.PAUSE = 0.01
pyautogui.FAILSAFE = True  # move mouse to corner = emergency stop


def create_icon_image():
    """make system tray icon - simple robot face"""
    width = 64
    height = 64
    image = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(image)
    
    # robot face
    draw.ellipse([10, 10, 54, 54], fill='#667eea', outline='#764ba2')
    draw.ellipse([20, 22, 28, 30], fill='white')  # left eye
    draw.ellipse([36, 22, 44, 30], fill='white')  # right eye
    draw.arc([20, 30, 44, 45], 0, 180, fill='white', width=2)  # smile
    
    return image


def play_sound(frequency, duration):
    """beep beep - windows only"""
    if SOUND_AVAILABLE:
        try:
            winsound.Beep(frequency, duration)
        except:
            pass  # silent fail


def calculate_delay(wpm, variance):
    """
    calc typing delay based on wpm
    variance = randomness percentage
    """
    chars_per_word = 5
    chars_per_minute = wpm * chars_per_word
    base_delay = 60 / chars_per_minute
    
    min_delay = base_delay * (1 - variance)
    max_delay = base_delay * (1 + variance)
    
    return random.uniform(min_delay, max_delay)


def wait_for_resume():
    """wait until resume button clicked"""
    global resume_signal
    resume_signal = False
    
    print(f"⏸️ Waiting for resume...")
    
    while not resume_signal and not stop_typing_flag:
        time.sleep(0.1)
    
    if resume_signal:
        print(f"✅ Resume!")
    
    resume_signal = False


def check_window_focus(initial_window_title):
    """
    check if still in google docs
    returns true/false
    """
    global last_settings_update
    
    if not WINDOW_TRACKING_AVAILABLE:
        return True  # can't check, assume ok
    
    # don't check right after settings change (causes false positives)
    if time.time() - last_settings_update < 2:
        return True
    
    try:
        current_window = gw.getActiveWindow()
        
        if not current_window:
            return True  # no window = probably fine
        
        current_title = current_window.title
        
        # still in google docs?
        if "Google Docs" in current_title or "Docs" in current_title:
            return True
        
        # nope, focus lost
        print(f"\n⚠️ Focus lost!")
        print(f"   Was: {initial_window_title}")
        print(f"   Now: {current_title}")
        
        return False
    
    except Exception as e:
        # error = assume ok (better than false interrupt)
        return True


def simulate_human_typing(text, settings):
    """
    main typing function
    simulates realistic human typing
    """
    global typing_state, stop_typing_flag, current_settings
    
    # setup state
    with state_lock:
        typing_state['text'] = text
        typing_state['total_length'] = len(text)
        typing_state['current_position'] = 0
        typing_state['typed_so_far'] = ''
        typing_state['remaining_text'] = text
        typing_state['is_typing'] = True
        typing_state['paused'] = False
        typing_state['pause_reason'] = None
        typing_state['settings'] = settings
        typing_state['interruptions'] = 0
    
    # update settings
    current_settings.update(settings)
    
    # extract settings (yeah this is messy but works)
    wpm = current_settings['wpm']
    variance = current_settings['variance'] / 100
    mistake_rate = current_settings['mistakeRate'] / 100
    thinking_pause = current_settings['thinkingPause']
    self_correction = current_settings['selfCorrection']
    paragraph_breaks = current_settings.get('paragraphBreaks', 0)
    
    # log start
    print(f"\n{'='*60}")
    print(f"🚀 Starting typing")
    print(f"{'='*60}")
    print(f"👤 User: {server_author}")
    print(f"⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📝 Length: {len(text)} chars")
    print(f"⚙️ WPM={wpm}, Var={int(variance*100)}%, Err={int(mistake_rate*100)}%")
    print(f"{'='*60}\n")
    
    # get initial window (for focus tracking)
    initial_window_title = None
    if WINDOW_TRACKING_AVAILABLE:
        try:
            active_window = gw.getActiveWindow()
            if active_window:
                initial_window_title = active_window.title
                print(f"📋 Window: {initial_window_title}")
        except:
            pass  # whatever
    
    # countdown - 4 seconds for user to position cursor
    print(f"\n⏳ Starting in 4 seconds - position cursor...")
    for countdown in range(4, 0, -1):
        if stop_typing_flag:
            return
        print(f"   {countdown}...")
        play_sound(600, 100)
        time.sleep(1)
    
    print(f"\n⌨️ TYPING!\n")
    play_sound(800, 200)
    
    # stats tracking
    mistakes_made = 0
    paragraphs_typed = 0
    
    # main typing loop
    i = 0
    while i < len(text):
        # stop requested?
        if stop_typing_flag:
            print(f"\n⏹️ Stopped at {i}/{len(text)}")
            break
        
        # wait if paused
        while typing_state['paused']:
            time.sleep(0.1)
            if stop_typing_flag:
                break
        
        if stop_typing_flag:
            break
        
        # check focus every 10 chars
        if i % 10 == 0 and i > 0 and initial_window_title:
            if not check_window_focus(initial_window_title):
                # focus lost - pause
                print(f"💾 Paused at {i}/{len(text)}")
                
                with state_lock:
                    typing_state['paused'] = True
                    typing_state['pause_reason'] = 'focus_lost'
                    typing_state['current_position'] = i
                    typing_state['typed_so_far'] = text[:i]
                    typing_state['remaining_text'] = text[i:]
                    typing_state['interruptions'] += 1
                
                play_sound(1200, 300)
                
                # wait for resume
                wait_for_resume()
                
                if stop_typing_flag:
                    break
                
                # countdown after resume
                print(f"\n⏳ Resuming in 4 sec - position cursor at end...")
                for countdown in range(4, 0, -1):
                    if stop_typing_flag:
                        break
                    print(f"   {countdown}...")
                    play_sound(600, 100)
                    time.sleep(1)
                
                print(f"▶️ Continuing from {i}...\n")
                play_sound(800, 200)
        
        # get char
        char = text[i]
        
        # paragraph break handling
        if char == '\n' and i + 1 < len(text) and text[i + 1] == '\n':
            paragraphs_typed += 1
            
            # pause between paragraphs if configured
            if paragraph_breaks > 0 and paragraphs_typed % paragraph_breaks == 0:
                print(f"\n📄 Paragraph {paragraphs_typed} done - pausing 2s...")
                time.sleep(2)
        
        # make mistakes sometimes (realistic)
        if self_correction and random.random() < mistake_rate and char not in '\n\t':
            # type wrong char
            wrong_chars = 'qwertyuiopasdfghjklzxcvbnm'
            wrong_char = random.choice(wrong_chars)
            
            try:
                pyautogui.write(wrong_char, interval=0)
                time.sleep(random.uniform(0.1, 0.3))  # pause
                pyautogui.press('backspace')  # fix it
                time.sleep(random.uniform(0.05, 0.15))
                mistakes_made += 1
            except:
                pass  # ignore errors
        
        # type correct char
        try:
            if char == '\n':
                pyautogui.press('enter')
            elif char == '\t':
                pyautogui.press('tab')
            else:
                pyautogui.write(char, interval=0)
        except Exception as e:
            print(f"⚠️ Type error at {i}: {e}")
            # continue anyway
        
        # update state
        with state_lock:
            typing_state['current_position'] = i + 1
            typing_state['typed_so_far'] = text[:i + 1]
            typing_state['remaining_text'] = text[i + 1:]
        
        # calc delay
        delay = calculate_delay(current_settings['wpm'], variance)
        
        # thinking pauses at punctuation
        if thinking_pause and char in '.!?,:;':
            delay += random.uniform(0.5, 2.0)
        
        # longer pause at newlines
        if char == '\n':
            delay += random.uniform(0.5, 1.5)
        
        # progress log every 50 chars
        if i % 50 == 0 and i > 0:
            progress = (i / len(text)) * 100
            print(f"📊 {progress:.1f}% ({i}/{len(text)}) - Mistakes: {mistakes_made}")
        
        time.sleep(delay)
        i += 1
    
    # done!
    if not stop_typing_flag:
        print(f"\n{'='*60}")
        print(f"✅ DONE!")
        print(f"{'='*60}")
        print(f"📈 Stats:")
        print(f"   Chars: {len(text)}")
        print(f"   Mistakes: {mistakes_made}")
        print(f"   Paragraphs: {paragraphs_typed}")
        print(f"   Interruptions: {typing_state['interruptions']}")
        print(f"{'='*60}\n")
        
        play_sound(1200, 500)
    
    # cleanup state
    with state_lock:
        typing_state['is_typing'] = False
        typing_state['paused'] = False
        typing_state['pause_reason'] = None


# ===== API ROUTES =====

@app.route('/status', methods=['GET'])
def status():
    """status endpoint for extension"""
    with state_lock:
        state_copy = typing_state.copy()
    
    return jsonify({
        'status': 'online',
        'version': server_version,
        'author': server_author,
        'date': server_date,
        'is_typing': state_copy['is_typing'],
        'paused': state_copy['paused'],
        'progress': {
            'current': state_copy['current_position'],
            'total': state_copy['total_length'],
            'percentage': (state_copy['current_position'] / state_copy['total_length'] * 100) 
                         if state_copy['total_length'] > 0 else 0,
            'typed_so_far': state_copy['typed_so_far'][-100:] if state_copy['typed_so_far'] else '',
            'remaining': state_copy['remaining_text'][:100] if state_copy['remaining_text'] else ''
        },
        'pause_reason': state_copy['pause_reason'],
        'stats': {
            'interruptions': state_copy.get('interruptions', 0)
        }
    })


@app.route('/health', methods=['GET'])
def health():
    """health check"""
    return jsonify({
        'healthy': True,
        'timestamp': datetime.now().isoformat(),
        'features': {
            'window_tracking': WINDOW_TRACKING_AVAILABLE,
            'sound_alerts': SOUND_AVAILABLE,
            'ai_enhancement': False  # TODO: implement later
        }
    })


@app.route('/type', methods=['POST'])
def start_typing():
    """start typing endpoint"""
    global typing_state, typing_thread, stop_typing_flag
    
    # check if already typing
    with state_lock:
        if typing_state['is_typing']:
            return jsonify({
                'success': False,
                'error': 'Already typing'
            }), 400
    
    # get data
    data = request.json
    text = data.get('text', '')
    settings = data.get('settings', {})
    
    if not text:
        return jsonify({
            'success': False,
            'error': 'No text'
        }), 400
    
    print(f"\n{'='*60}")
    print(f"📨 Request from extension")
    print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    # reset stop flag
    stop_typing_flag = False
    
    # start typing thread
    typing_thread = threading.Thread(
        target=simulate_human_typing,
        args=(text, settings),
        daemon=True
    )
    typing_thread.start()
    
    return jsonify({
        'success': True,
        'message': 'Started',
        'text_length': len(text)
    })


@app.route('/stop', methods=['POST'])
def stop_typing():
    """stop typing"""
    global stop_typing_flag, typing_state
    
    print(f"\n📨 Stop request")
    
    with state_lock:
        if not typing_state['is_typing']:
            return jsonify({
                'success': False,
                'error': 'Not typing'
            }), 400
    
    stop_typing_flag = True
    
    with state_lock:
        typing_state['is_typing'] = False
        typing_state['paused'] = False
        typing_state['pause_reason'] = None
    
    print(f"⏹️ Stopped")
    
    return jsonify({
        'success': True,
        'message': 'Stopped'
    })


@app.route('/resume', methods=['POST'])
def resume_typing():
    """resume from pause"""
    global resume_signal, typing_state
    
    print(f"\n📨 Resume request")
    
    # get state
    with state_lock:
        is_typing = typing_state['is_typing']
        is_paused = typing_state['paused']
        position = typing_state['current_position']
    
    print(f"   typing={is_typing}, paused={is_paused}, pos={position}")
    
    # must be typing to resume
    if not is_typing:
        print(f"❌ Can't resume - not typing")
        return jsonify({
            'success': False,
            'error': 'Not typing'
        }), 400
    
    # unpause
    with state_lock:
        typing_state['paused'] = False
        typing_state['pause_reason'] = None
    
    # send signal
    resume_signal = True
    
    print(f"✅ Resumed")
    
    return jsonify({
        'success': True,
        'message': 'Resumed',
        'resume_position': position
    })


@app.route('/update-settings', methods=['POST'])
def update_settings():
    """live settings update"""
    global current_settings, last_settings_update
    
    data = request.json
    
    # track update time (avoid false interruption)
    last_settings_update = time.time()
    
    # update settings
    if 'wpm' in data:
        current_settings['wpm'] = data['wpm']
    if 'variance' in data:
        current_settings['variance'] = data['variance']
    if 'mistakeRate' in data:
        current_settings['mistakeRate'] = data['mistakeRate']
    if 'aiEnhanced' in data:
        current_settings['aiEnhanced'] = data['aiEnhanced']
    
    print(f"⚙️ Settings: WPM={current_settings['wpm']}, Var={current_settings['variance']}%, Err={current_settings['mistakeRate']}%, AI={current_settings['aiEnhanced']}")
    
    return jsonify({
        'success': True,
        'current_settings': current_settings
    })


def print_banner():
    """startup banner"""
    print("\n" + "=" * 60)
    print("  🤖 AI HUMAN TYPER v1.2.0")
    print("=" * 60)
    print(f"  👤 {server_author}")
    print(f"  📅 {server_date}")
    print("=" * 60)
    print(f"  🌐 http://localhost:8765")
    print(f"  📊 http://localhost:8765/status")
    print("=" * 60)
    print("  ✅ ONLINE")
    print(f"  🪟 Window tracking: {'✅' if WINDOW_TRACKING_AVAILABLE else '❌'}")
    print(f"  🔊 Sounds: {'✅' if SOUND_AVAILABLE else '❌'}")
    print("=" * 60)
    print()


def run_server():
    """run flask"""
    print_banner()
    app.run(host='localhost', port=8765, debug=False, use_reloader=False)


def setup_system_tray():
    """system tray icon"""
    icon_image = create_icon_image()
    
    def on_quit(icon, item):
        print("\n👋 Bye")
        icon.stop()
        sys.exit(0)
    
    def on_status(icon, item):
        with state_lock:
            status_text = '⌨️ Typing' if typing_state['is_typing'] else '✅ Ready'
            if typing_state['paused']:
                status_text = '⏸️ Paused'
            interrupts = typing_state.get('interruptions', 0)
        
        print(f"\n📊 {status_text}, Interrupts: {interrupts}\n")
    
    menu = pystray.Menu(
        pystray.MenuItem(f'AI Typer v{server_version}', on_status),
        pystray.MenuItem('Status', on_status),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem('Quit', on_quit)
    )
    
    icon = pystray.Icon('AI_Typer', icon_image, 'AI Human Typer', menu)
    return icon


def main():
    """entry point"""
    # start server in thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # run tray icon (blocks)
    try:
        icon = setup_system_tray()
        icon.run()
    except KeyboardInterrupt:
        print("\n👋 Stopped")
        sys.exit(0)


if __name__ == '__main__':
    main()