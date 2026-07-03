with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

# Find what the tab names are
import re
# Search for tab rendering patterns
for match in re.finditer(r"currentTab\s*===\s*['\"](\w+)['\"]", src):
    print(f"Tab: {match.group(1)} at {match.start()}")

# Also find the 'more' drawer content
idx = src.find("'more'")
print(f"\nFirst 'more' at: {idx}")
if idx != -1:
    print(repr(src[idx-50:idx+150]))
