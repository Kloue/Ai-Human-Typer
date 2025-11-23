"""
Build script to create standalone .exe
Run: python build_exe.py
"""

import PyInstaller.__main__
import os

print("🔨 Building AI Typer Helper.exe...")
print("This may take a few minutes...")

PyInstaller.__main__.run([
    'typer_server_gui.py',
    '--onefile',
    '--noconsole',  # No console window
    '--name=AI-Typer-Helper',
    '--icon=icon.ico',  # Optional: add your icon
    '--add-data=requirements.txt;.',
    '--hidden-import=pystray',
    '--hidden-import=PIL',
    '--clean',
])

print("✅ Build complete!")
print("📦 Find AI-Typer-Helper.exe in the 'dist' folder")