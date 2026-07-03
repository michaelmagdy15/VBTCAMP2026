with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

lines = src.split('\n')
for i, line in enumerate(lines, 1):
    if "onClick={() => { setEventJoinInput(ev.code); setTimeout" in line:
        print(f"Line {i}: {line[:120]}")
        break
