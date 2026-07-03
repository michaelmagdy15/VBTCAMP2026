with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

# Passcodes
import re
passcodes = re.findall(r"passcode\w*['\"]?\s*:\s*['\"]([A-Z0-9]+)['\"]", src)
print("Passcodes:", passcodes[:6])

# Roles
roles = re.findall(r"role\s*===\s*['\"](\w+)['\"]", src)
from collections import Counter
print("Roles:", list(set(roles)))

# Tabs by role
for role in ['admin', 'coordinator', 'referee', 'leader']:
    idx = src.find(f"is{role[0].upper()+role[1:]}")
    if idx != -1:
        print(f"\n{role} tabs:")
        block = src[idx:idx+600]
        tabs_in_block = re.findall(r"id:\s*'(\w+)'.*?label:\s*'([^']+)'", block)
        for t in tabs_in_block:
            print(f"  {t}")
