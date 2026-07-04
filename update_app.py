import sys

file_path = r"C:\Users\Mi5a\.gemini\antigravity\brain\b8c4046a-da14-4247-9c31-a242424769ce\.system_generated\worktrees\subagent-Data-and-UI-Engineer-self-1ce36e52\src\App.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target1 = '''// VBT Phase 3 Operations & Logistics Components
import LogisticsPanel from './components/LogisticsPanel';
import FeedMessage from './components/FeedMessage';'''

repl1 = '''// VBT Phase 3 Operations & Logistics Components
import LogisticsPanel from './components/LogisticsPanel';
import LogisticsTab from './components/LogisticsTab';
import FeedMessage from './components/FeedMessage';'''

target2 = '''        {currentTab === 'logistics' && (
          <LogisticsPanel
            eventCode={currentEventCode}
            currentUser={currentUser}
            eventConfig={eventConfig}
            campData={campData}
          />
        )}'''

repl2 = '''        {currentTab === 'logistics' && (
          <LogisticsPanel
            eventCode={currentEventCode}
            currentUser={currentUser}
            eventConfig={eventConfig}
            campData={campData}
          />
        )}

        {currentTab === 'station_logistics' && (
          <LogisticsTab
            eventCode={currentEventCode}
            currentUser={currentUser}
          />
        )}'''

target3 = '''                  <Settings size={18} color="var(--vbt-sky)" /> Coordinator Controls
                </button>
              )}'''

repl3 = '''                  <Settings size={18} color="var(--vbt-sky)" /> Coordinator Controls
                </button>
              )}

              {/* Admin specific: Station Logistics */}
              {currentUser.role === 'admin' && (
                <button
                  className="more-drawer-item"
                  onClick={() => {
                    setCurrentTab('station_logistics');
                    setShowMoreDrawer(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <Package size={18} color="var(--vbt-sky)" /> Station Logistics
                </button>
              )}'''

content = content.replace(target1, repl1)
content = content.replace(target2, repl2)
content = content.replace(target3, repl3)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
