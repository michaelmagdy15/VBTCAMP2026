import os

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Extract Event Mode
start = code.find('{/* Event Mode Badge/Toggle Switch */}')
end = code.find('})()}', start) + 5
event_mode_code = code[start:end]
code = code[:start] + code[end:]

# 2. Extract Simple UI
start = code.find('{/* Simple Mode Toggle */}')
end = code.find('</button>', start) + 9
simple_ui_code = code[start:end]
code = code[:start] + code[end:]

# 3. Extract Dark Mode
start = code.find('{/* Dark mode toggle */}')
end = code.find('</button>', start) + 9
dark_mode_code = code[start:end]
code = code[:start] + code[end:]

# 4. Extract and remove User Info + Logout
start = code.find('<div className="header-user-info"')
end = code.find('</button>', code.find('onClick={handleLogout}', start)) + 9
user_info_code = code[start:end]
code = code[:start] + code[end:]

# 5. Inject into MoreDrawer
target = "<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>"

injection = f'''              {{/* Quick Settings */}}
              <div style={{{{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}}}>
                {event_mode_code.replace("alignSelf: 'center'", "")}
                {simple_ui_code}
                {dark_mode_code}
              </div>'''

code = code.replace(target, target + '\n' + injection)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done")
