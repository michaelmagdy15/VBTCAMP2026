with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

lines = src.split('\n')
# find the showCreateEvent line number
for i, line in enumerate(lines, 1):
    if "showCreateEvent, setShowCreateEvent] = useState(false)" in line:
        print(f"Line {i}: {line[:80]}")
        break
