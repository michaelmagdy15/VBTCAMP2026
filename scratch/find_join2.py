with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

# Get line number of the join section
lines = src.split('\n')
target = "Join Your Service"
for i, line in enumerate(lines, 1):
    if target in line:
        print(f"Line {i}: {line[:80]}")
        break

# Also find eventRegistry usage and the section that shows available events
idx = src.find("eventRegistry")
print(f"\neventRegistry first at: {idx}")
print(repr(src[idx:idx+200]))

# Find the section just before "Join Your Service"
join_idx = src.find("Join Your Service")
print(f"\n300 chars before 'Join Your Service':")
print(repr(src[join_idx-300:join_idx]))
