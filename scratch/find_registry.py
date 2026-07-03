with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

# Find where eventRegistry is fetched
idx = src.find("getEventRegistry")
while idx != -1:
    print(f"getEventRegistry at {idx}:")
    print(repr(src[idx:idx+150]))
    print()
    idx = src.find("getEventRegistry", idx+1)

# Find eventRegistry.map or .filter usage
idx2 = src.find("eventRegistry.map")
if idx2 == -1:
    idx2 = src.find("eventRegistry.filter")
if idx2 == -1:
    idx2 = src.find("eventRegistry.length")
print(f"eventRegistry usage at: {idx2}")
if idx2 != -1:
    print(repr(src[idx2:idx2+200]))

# Check the firebase.js for getEventRegistry
with open('src/firebase.js', 'rb') as f:
    fsrc = f.read().decode('utf-8')
idx3 = fsrc.find("export")
while idx3 != -1:
    line = fsrc[idx3:idx3+80]
    if "EventRegistry" in line or "getEvent" in line:
        print(f"\nFirebase: {repr(line)}")
    idx3 = fsrc.find("export", idx3+1)
