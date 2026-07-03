with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

for m in ["    </>\r\n  );\r\n}\r\n", "    </>\n  );\n}\n", "    </>\r\n  );\r\n}\r\n\n"]:
    idx = src.rfind(m)
    print(f"End marker {repr(m[:15])} at {idx}")

idx2 = src.find("currentTab === 'more'")
print(f"more tab at {idx2}")
if idx2 != -1:
    print(repr(src[idx2:idx2+120]))

idx5 = src.rfind("coordinator')")
print(f"coordinator last at {idx5}")
if idx5 != -1:
    print(repr(src[idx5-80:idx5+60]))

# find Log Out button context
idx6 = src.rfind("Log Out")
print(f"Log Out at {idx6}")
if idx6 != -1:
    print(repr(src[idx6:idx6+100]))

# Find how many closing div/fragment tags come after Log Out
tail = src[idx6:]
print("Tail:", repr(tail[:200]))
