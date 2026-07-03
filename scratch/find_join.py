with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

# Find the event join UI section
for marker in [
    "Join Your Service",
    "Enter the code",
    "eventJoinInput",
    "Enter Service",
    "e.g. july6",
    "COORDINATOR ACTIONS",
    "Request VBT Service",
]:
    idx = src.find(marker)
    print(f"'{marker}' at {idx}")
    if idx != -1:
        print(repr(src[idx:idx+120]))
        print()
