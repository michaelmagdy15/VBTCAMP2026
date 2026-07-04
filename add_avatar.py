import os

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

avatar_code = '''
              {/* User Avatar */}
              <button
                onClick={() => setShowMoreDrawer(true)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--vbt-sky) 0%, var(--vbt-blue) 100%)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(41, 182, 246, 0.3)',
                  transition: 'transform 0.2s'
                }}
              >
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </button>
'''

target = '<div className="header-actions" style={{ display: \'flex\', alignItems: \'center\', gap: \'10px\' }}>'
code = code.replace(target, target + '\n' + avatar_code)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Done")
