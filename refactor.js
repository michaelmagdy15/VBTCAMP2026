const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Extract and remove Event Mode Badge
const eventModeStart = code.indexOf('{/* Event Mode Badge/Toggle Switch */}');
const eventModeEnd = code.indexOf('})()}', eventModeStart) + 5;
const eventModeCode = code.substring(eventModeStart, eventModeEnd);
code = code.substring(0, eventModeStart) + code.substring(eventModeEnd);

// 2. Extract and remove Simple Mode Toggle
const simpleModeStart = code.indexOf('{/* Simple Mode Toggle */}');
const simpleModeEnd = code.indexOf('</button>', simpleModeStart) + 9;
const simpleModeCode = code.substring(simpleModeStart, simpleModeEnd);
code = code.substring(0, simpleModeStart) + code.substring(simpleModeEnd);

// 3. Extract and remove Dark mode toggle
const darkModeStart = code.indexOf('{/* Dark mode toggle */}');
const darkModeEnd = code.indexOf('</button>', darkModeStart) + 9;
const darkModeCode = code.substring(darkModeStart, darkModeEnd);
code = code.substring(0, darkModeStart) + code.substring(darkModeEnd);

// 4. Remove User Info and Logout button from header
const userInfoStart = code.indexOf('<div className="header-user-info"');
const userInfoEnd = code.indexOf('</button>', code.indexOf('onClick={handleLogout}', userInfoStart)) + 9;
code = code.substring(0, userInfoStart) + code.substring(userInfoEnd);

// 5. Inject them into MoreDrawer
const moreDrawerTarget = "<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>";
const injection = \
              {/* Quick Settings */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                \
                \
                \
              </div>
\;
code = code.replace(moreDrawerTarget, moreDrawerTarget + '\\n' + injection);

fs.writeFileSync('src/App.jsx', code);
