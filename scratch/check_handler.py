with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

idx = src.find("const handleJoinEvent")
if idx == -1:
    idx = src.find("handleJoinEvent")
print(f"handleJoinEvent at {idx}")
print(src[idx:idx+600])
