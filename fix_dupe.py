import os

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# The first Quick Settings block needs to be removed
q_start = code.find('{/* Quick Settings */}')
q_end = code.find('</div>', code.find('</div>', code.find('</div>', code.find('</div>', q_start) + 1) + 1) + 1) + 6

if code.count('{/* Quick Settings */}') > 1:
    code = code[:q_start] + code[q_end:]
    # Keep the second one

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed duplicate")
