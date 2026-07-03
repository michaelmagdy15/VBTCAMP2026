with open('src/firebase.js', 'rb') as f:
    src = f.read().decode('utf-8')

# Find createEvent to see what's stored in registry
idx = src.find("export async function createEvent")
print("createEvent body:")
print(src[idx:idx+1500])
