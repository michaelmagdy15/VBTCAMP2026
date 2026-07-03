with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

# Find showManualJoin state
idx = src.find("showManualJoin")
print(f"showManualJoin: {idx}")

# Find showCreateEvent state line to anchor nearby
idx2 = src.find("showCreateEvent, setShowCreateEvent] = useState(false)")
print(f"showCreateEvent state at: {idx2}")
print(repr(src[idx2:idx2+80]))
