with open('src/firebase.js', 'rb') as f:
    src = f.read().decode('utf-8')

idx = src.find("export async function getEventRegistry")
print("getEventRegistry:")
print(src[idx:idx+400])

idx2 = src.find("export function subscribeToEventRegistry")
print("\nsubscribeToEventRegistry:")
print(src[idx2:idx2+300])
