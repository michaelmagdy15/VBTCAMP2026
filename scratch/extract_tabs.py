with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

import re

# Find all tab arrays per role
# Look for the tabs variable assignment blocks
tab_blocks = re.findall(r"if \(is(\w+)\)[^\{]*\{(.*?)return \[([^\]]+)\]", src, re.DOTALL)
for role, _, tabs in tab_blocks[:10]:
    print(f"Role: {role}")
    tab_items = re.findall(r"\{\s*id:\s*'(\w+)',\s*label:\s*'([^']+)'", tabs)
    for t in tab_items:
        print(f"  - {t[0]}: {t[1]}")
    print()

# Find all the big tabs block
idx = src.find("const getTabs = ")
if idx == -1:
    idx = src.find("const tabs = useMemo")
print(f"\nTabs useMemo at: {idx}")
if idx != -1:
    block = src[idx:idx+3000]
    # Find all role-specific returns
    returns = re.findall(r"(isAdmin|isCoordinator|isReferee|isLeader)[^;]*return \[([^\]]+)\]", block, re.DOTALL)
    for role, tabs_str in returns:
        print(f"\n{role}:")
        tab_items = re.findall(r"id:\s*'(\w+)',\s*label:\s*'([^']+)'", tabs_str)
        for t in tab_items:
            print(f"  {t[0]}: {t[1]}")
