import subprocess
from pywinauto import Desktop

import pyautogui

# Switch to Virtual Desktop 2 using Windows + Ctrl + Right Arrow
pyautogui.hotkey('win', 'ctrl', 'right')

# Launch WhatsApp
# subprocess.Popen([
#     r"C:\Program Files\WindowsApps\5319275A.WhatsAppDesktop_2.2514.4.0_x64__cv1g1gvanyjgm\WhatsApp.exe"
# ])

subprocess.Popen(["start", "shell:AppsFolder\\5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App"], shell=True)

app = Desktop(backend="uia").window(title_re="WhatsApp")
# After selecting the WhatsApp window

calls_tab = app.child_window(title="Calls", auto_id="CallsNavigationItem", control_type="ListItem")
calls_tab.click_input()
kontak = app.child_window(title="kakak", auto_id="Title", control_type="Text", best_match="kakakStatic")
kontak.click_input()
callButton = app.child_window(title="Voice call", auto_id="VoiceCallButton", control_type="Button")
callButton.click_input()

pyautogui.hotkey('win', 'ctrl', 'left') 




