with open('src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Delete lines 5879 to 5959 (0-indexed 5878 to 5958)
del lines[5878:5959]

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
