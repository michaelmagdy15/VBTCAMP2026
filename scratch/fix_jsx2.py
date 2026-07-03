with open('src/App.jsx', 'rb') as f:
    content = f.read()

# Line 4453: b'      </div>\r\n' (closes service modal wrapper / outer div - KEEP)
# Line 4454: b'      </div>\n'  (DUPLICATE - REMOVE)
# Line 4455: b'    );\n'
# Line 4456: b'  }\n'

target = b'      </div>\r\n      </div>\n    );\n  }\n'
replacement = b'      </div>\n    );\n  }\n'

if target in content:
    new = content.replace(target, replacement, 1)
    with open('src/App.jsx', 'wb') as f:
        f.write(new)
    print('Fixed extra </div>!')
else:
    # try other variant
    target2 = b'      </div>\r\n      </div>\r\n    );\r\n  }\r\n'
    if target2 in content:
        repl2 = b'      </div>\r\n    );\r\n  }\r\n'
        new = content.replace(target2, repl2, 1)
        with open('src/App.jsx', 'wb') as f:
            f.write(new)
        print('Fixed with CRLF variant!')
    else:
        # diagnose
        idx = content.find(b'      </div>\r\n      </div>')
        idx2 = content.find(b'      </div>\n      </div>')
        print('CRLF pattern at:', idx)
        print('LF pattern at:', idx2)
        if idx2 != -1:
            print('Context:', repr(content[idx2:idx2+80]))
