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
    '--noconsole',
    '--name=AI-Typer-Helper',
    '--hidden-import=pygetwindow',  
    '--hidden-import=pyperclip',
    '--clean',
])

print("✅ Build complete!")
print("📦 Find AI-Typer-Helper.exe in the 'dist' folder")