# Ai-Human-Typer
**Bypass GPTZero and AI detectors by typing text naturally instead of pasting.**

## What It Does

Types your AI-generated essay character-by-character with realistic human patterns:
- Realistic typing speed (60-80 WPM)
- Random mistakes that get corrected
- Natural pauses at punctuation
- Looks 100% human to AI detectors

Resulting in GPTZero, Turnitin, and other AI Detectors using Written Report to check progress to think it's human written.


## Quick Start
### 1. Install Extension
        Download/clone this repo
        Chrome → chrome://extensions/
        Enable "Developer Mode"
        Click "Load unpacked"
        Select extension/ folder

### 2. Install Python Server (For Google Docs only) (For now)
**Option A: Use pre-built .exe**
    Go to server/dist/
    Run AI-Typer-Helper.exe
    Server starts in system tray

    
**Option B: Build from source**
```bash
cd server
pip install -r requirements.txt
python build_exe.py
cd dist
./AI-Typer-Helper.exe

### 3. Use it
1. Generate essay with ChatGPT
2. Open Google Docs
3. Click extension icon
4. Paste text into extension
5. Settings: WPM=70, Mistakes=5%
6. Click "Start Typing"
7. Wait 4 seconds → cursor ready
8. Extension types for ~7 minutes
9. Done! Submit assignment ✅



How To Use
Google Docs:
Start Python server (AI-Typer-Helper.exe)
Open Google Docs
Extension → paste text → Start Typing
Don't touch mouse/keyboard while typing
Moodle/Other Sites:
No server needed!
Open site → click in text field
Extension → paste text → Start Typing
Settings
Recommended for undetectable typing:

WPM: 65-75
Variance: 20-30%
Mistakes: 5-7%
Thinking Pauses: ON
Self-Correction: ON
Why It Works
AI detectors look for:

❌ Instant paste → We type over 5-10 minutes
❌ Zero typos → We make realistic mistakes
❌ Perfect speed → We vary 60-90 WPM randomly
❌ No pauses → We pause at periods/commas
They can't tell the difference from real human typing.


Troubleshooting
"Server offline":

Run AI-Typer-Helper.exe from server/dist/
"No text field found":

Click in text field BEFORE clicking "Start Typing"
Windows Defender blocks .exe:

Right-click .exe → Properties → Unblock → Apply
Typing too fast/slow:

Adjust WPM slider (60-80 recommended)


Requirements
Python 3.10+
Google Chrome
Windows (for .exe server)


Notes
Educational use only.
You're responsible for following your school's policies.

Everything runs locally. No data sent anywhere.

Credits
Kloue

Built to demonstrate automation and bypass AI detection.
Will enhance code into an application later forward for no interruption problems.

License
Educational purposes. Use responsibly.

That's it! Install, paste, type, submit. Simple. 🚀

-------------------------------------------------

