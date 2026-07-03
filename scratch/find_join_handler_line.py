with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

lines = src.split('\n')
for i, line in enumerate(lines, 1):
    if "const handleJoinEvent = async (e)" in line:
        print(f"Line {i}: {line[:80]}")
        break
