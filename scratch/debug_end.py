with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

print(f"Loaded {len(src)} chars, {src.count(chr(10))} lines")

# The problem: modals inserted before the wrong marker
# We need to find "      )}\r\n    </>\r\n  );\r\n}\r\n" which is the TRUE end
# But actually the file ends with: "      )}\r\n      )}\r\n    </>\r\n  );\r\n}\r\n"
# Let's just find the actual closing sequence

# Check what the last 200 chars look like
print("Last 300 chars:", repr(src[-300:]))
