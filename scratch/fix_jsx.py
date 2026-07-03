with open('src/App.jsx', 'rb') as f:
    content = f.read()

# The spurious }) is a standalone line with LF only ending
# between the create-event close and the scrollable body close.
# Pattern: ...)\r\n [blank-LF] )}\n </div>\n
target = b'          )}\r\n\n          )}\n        </div>\n'
replacement = b'          )}\n        </div>\n'

if target in content:
    new = content.replace(target, replacement, 1)
    with open('src/App.jsx', 'wb') as f:
        f.write(new)
    print('Fixed! Removed spurious )}.')
else:
    # Try without the \r
    target2 = b'          )}\n\n          )}\n        </div>\n'
    if target2 in content:
        new = content.replace(target2, replacement, 1)
        with open('src/App.jsx', 'wb') as f:
            f.write(new)
        print('Fixed with alternate pattern!')
    else:
        idx = content.find(b'          )}\r\n')
        idx2 = content.find(b'          )}\n')
        print('CRLF )} at byte:', idx)
        print('LF   )} at byte:', idx2)
        print('Context at CRLF:', repr(content[idx:idx+60]))
        print('Context at LF:  ', repr(content[idx2:idx2+60]))
