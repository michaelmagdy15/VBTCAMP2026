with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

import re

# Find tabs computation
idx = src.find("const visibleTabs")
if idx == -1:
    idx = src.find("const tabs =")
if idx == -1:
    idx = src.find("tabItems")
print(f"tabs var at: {idx}")

# Search for getBottomTabs or similar
for marker in ["BottomTabs", "getTabs", "tabConfig", "navTabs", "bottomNav", "bottomTabs", "const tabs"]:
    i = src.find(marker)
    if i != -1:
        print(f"Found '{marker}' at {i}")
        print(repr(src[i:i+200]))
        print()
        break

# Find the section where the bottom nav renders
idx2 = src.find("{ id: 'scoreboard'")
print(f"\nscoreboard tab def at: {idx2}")
if idx2 != -1:
    block = src[max(0,idx2-200):idx2+2000]
    # Find the enclosing useMemo or const
    role_sections = re.findall(r"(if \(is\w+\)|isAdmin|isCoordinator)[^\[]*\[([^\]]+)\]", block, re.DOTALL)
    for rs in role_sections:
        print(f"\nSection: {rs[0][:50]}")
        tabs = re.findall(r"id:\s*'(\w+)',\s*label:\s*'([^']+)'", rs[1])
        for t in tabs:
            print(f"  {t[0]}: {t[1]}")
