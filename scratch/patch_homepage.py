import sys
import re

SRC = r"c:\Users\Mi5a\VBTCAMP2026\src\App.jsx"

# Read raw bytes to avoid codec issues
with open(SRC, 'rb') as f:
    raw = f.read()

# Restore from backup if needed
import os
bak = SRC + '.bak'
if os.path.exists(bak):
    with open(bak, 'rb') as f:
        raw = f.read()
    print("Loaded from .bak")
else:
    print("No .bak found, using current file")

lines = raw.decode('utf-8').splitlines(keepends=True)
total = len(lines)
print(f"Total lines: {total}")

# Find boundaries (0-indexed)
START = None  # comment line
END   = None  # closing } of if(!currentEventCode)

for i, l in enumerate(lines):
    if 'EVENT SELECTION / HOMEPAGE SCREEN' in l and START is None:
        START = i
    if '  if (!currentUser) {' in l and START is not None:
        # closing } is 2 lines above (there's a blank line)
        for j in range(i-1, i-5, -1):
            if lines[j].strip() == '}':
                END = j
                break
        break

print(f"START={START+1}, END={END+1}")

# Find service request modal start within the block
service_modal_start = None
for i in range(START, END+1):
    if 'showServiceRequestModal &&' in lines[i] or '{showServiceRequestModal' in lines[i]:
        service_modal_start = i
        break

print(f"Service modal at: {service_modal_start+1 if service_modal_start else 'NOT FOUND'}")

# Find the CLOSING of the block (last few lines: </div>);})
# We know END is the `}` line. Find the closing </div>\n);\n before it.
# Lines END-1 should be `  }` (closing the if block? no, END is that)
# Lines END-4 to END should be:
#     </div>
#   );
# }
print("Lines around END:")
for i in range(END-3, END+2):
    print(f"  {i+1}: {repr(lines[i][:60])}")

# Find where the old outer <div> closes (right before modal or right before service section)
# The service modal is an overlay inside the outer div
# Old structure:
#   <div style={{minHeight:'100vh'...}}>  <- START+2 lines (after if statement)
#     ... hero, portal, create event...
#     {showServiceRequestModal && <overlay>}
#   </div>          <- END-3 or so
#   );              <- END-2
# }                 <- END

# Build new homepage block
# We use only ASCII + named HTML entities for emoji to avoid encoding issues
NEW_BLOCK_LINES = [
    "  // \u2500\u2500\u2500 EVENT SELECTION / HOMEPAGE SCREEN \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n",
    "  if (!currentEventCode) {\n",
    "    return (\n",
    "      <div style={{\n",
    "        minHeight: '100dvh',\n",
    "        background: 'radial-gradient(circle at center, #0c1530 0%, #05070f 100%)',\n",
    "        display: 'flex', flexDirection: 'column', alignItems: 'center',\n",
    "        position: 'relative', overflow: 'hidden'\n",
    "      }}>\n",
    "        <div className=\"glow-orb glow-orb-1\" />\n",
    "        <div className=\"glow-orb glow-orb-2\" />\n",
    "\n",
    "        {/* Safe area spacer */}\n",
    "        <div style={{ height: 'env(safe-area-inset-top, 0px)', width: '100%', flexShrink: 0 }} />\n",
    "\n",
    "        {/* Header */}\n",
    "        <header style={{ width: '100%', maxWidth: '480px', padding: '10px 16px',\n",
    "          display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50, flexShrink: 0 }}>\n",
    "          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>\n",
    "            <img src=\"/Final VBT Re-Branding 2026-02 (3).png\" alt=\"VBT Logo\"\n",
    "              style={{ width: '36px', height: 'auto', filter: 'drop-shadow(0 0 8px rgba(41,182,246,0.3))' }} />\n",
    "            <div>\n",
    "              <span style={{ fontSize: '1rem', fontWeight: '800', fontFamily: 'var(--font-title)', color: '#ffffff', letterSpacing: '0.05em', display: 'block', lineHeight: 1 }}>VBT SERVICE</span>\n",
    "              <span style={{ fontSize: '0.65rem', color: 'var(--vbt-sky)', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Church Sports Outreach</span>\n",
    "            </div>\n",
    "          </div>\n",
    "          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(41,182,246,0.08)', border: '1px solid rgba(41,182,246,0.18)', padding: '4px 10px', borderRadius: '20px' }}>\n",
    "            <span className=\"live-dot\" style={{ width: '5px', height: '5px' }} />\n",
    "            <span style={{ fontSize: '0.62rem', fontWeight: '700', color: 'var(--vbt-sky)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live</span>\n",
    "          </div>\n",
    "        </header>\n",
    "\n",
    "        {/* Scrollable body */}\n",
    "        <div style={{ flex: 1, width: '100%', maxWidth: '480px', overflowY: 'auto',\n",
    "          WebkitOverflowScrolling: 'touch', padding: '8px 16px 32px 16px',\n",
    "          display: 'flex', flexDirection: 'column', gap: '20px' }}>\n",
    "\n",
    "          {!showCreateEvent ? (\n",
    "            <>\n",
    "              {/* Hero */}\n",
    "              <section style={{ textAlign: 'center', padding: '12px 0 4px 0' }}>\n",
    "                <h1 style={{ fontSize: '2.2rem', fontWeight: '900', color: '#ffffff',\n",
    "                  fontFamily: 'var(--font-title)', lineHeight: '1.1', marginBottom: '10px', letterSpacing: '-0.02em' }}>\n",
    "                  Games That{' '}\n",
    "                  <span style={{ background: 'linear-gradient(135deg, var(--vbt-sky) 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Inspire</span>\n",
    "                </h1>\n",
    "                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', margin: '0 auto', maxWidth: '320px' }}>\n",
    "                  Dynamic sports &amp; Bible reflections for kids &mdash; coordinated in real-time.\n",
    "                </p>\n",
    "              </section>\n",
    "\n",
    "              {/* JOIN CODE CARD */}\n",
    "              <div style={{ background: 'linear-gradient(135deg, rgba(20,65,161,0.3) 0%, rgba(41,182,246,0.1) 100%)',\n",
    "                border: '1px solid rgba(41,182,246,0.25)', borderRadius: '20px', padding: '24px 20px',\n",
    "                boxShadow: '0 8px 32px rgba(20,65,161,0.2)' }}>\n",
    "                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>\n",
    "                  <span style={{ fontSize: '1.4rem' }}>&#128273;</span>\n",
    "                  <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>Join Your Service</h2>\n",
    "                </div>\n",
    "                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: '1.4' }}>\n",
    "                  Enter the code your coordinator shared with you.\n",
    "                </p>\n",
    "                <form onSubmit={handleJoinEvent} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>\n",
    "                  <input type=\"text\" value={eventJoinInput} onChange={(e) => setEventJoinInput(e.target.value)}\n",
    "                    placeholder=\"e.g. july6\" autoCapitalize=\"none\" autoCorrect=\"off\" spellCheck={false}\n",
    "                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px',\n",
    "                      background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(41,182,246,0.2)',\n",
    "                      color: '#ffffff', fontSize: '1rem', outline: 'none',\n",
    "                      fontFamily: 'monospace', letterSpacing: '0.08em', transition: 'border-color 0.2s, box-shadow 0.2s' }}\n",
    "                    onFocus={(e) => { e.target.style.borderColor = 'var(--vbt-sky)'; e.target.style.boxShadow = '0 0 12px rgba(41,182,246,0.25)'; }}\n",
    "                    onBlur={(e)  => { e.target.style.borderColor = 'rgba(41,182,246,0.2)'; e.target.style.boxShadow = 'none'; }}\n",
    "                  />\n",
    "                  {eventJoinError && (\n",
    "                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '10px 14px' }}>\n",
    "                      <p style={{ color: '#f87171', fontSize: '0.82rem', margin: 0 }}>&#9888; {eventJoinError}</p>\n",
    "                      <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: '4px 0 0 0' }}>Ask your coordinator for the correct code.</p>\n",
    "                    </div>\n",
    "                  )}\n",
    "                  <button type=\"submit\" disabled={eventJoinLoading}\n",
    "                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none',\n",
    "                      background: eventJoinLoading ? 'rgba(41,182,246,0.4)' : 'var(--gradient-vbt)',\n",
    "                      color: '#ffffff', fontWeight: '800', fontSize: '1rem',\n",
    "                      cursor: eventJoinLoading ? 'not-allowed' : 'pointer',\n",
    "                      boxShadow: '0 4px 20px rgba(20,65,161,0.4)', letterSpacing: '0.03em' }}>\n",
    "                    {eventJoinLoading ? 'Joining...' : 'Enter Service'}\n",
    "                  </button>\n",
    "                </form>\n",
    "              </div>\n",
    "\n",
    "              {/* Quick stats */}\n",
    "              <div style={{ display: 'flex', gap: '10px' }}>\n",
    "                {[\n",
    "                  { icon: '&#128101;', value: '100+', label: 'Kids' },\n",
    "                  { icon: '&#127918;', value: '6', label: 'Stations' },\n",
    "                  { icon: '&#9889;', value: 'Live', label: 'Sync' }\n",
    "                ].map(s => (\n",
    "                  <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.03)',\n",
    "                    border: '1px solid var(--border-light)', borderRadius: '14px',\n",
    "                    padding: '12px 8px', textAlign: 'center' }}>\n",
    "                    <div style={{ fontSize: '1.2rem', marginBottom: '4px' }} dangerouslySetInnerHTML={{ __html: s.icon }} />\n",
    "                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--vbt-sky)', lineHeight: 1 }}>{s.value}</div>\n",
    "                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>\n",
    "                  </div>\n",
    "                ))}\n",
    "              </div>\n",
    "\n",
    "              {/* Coordinator actions */}\n",
    "              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>\n",
    "                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Coordinator Actions</p>\n",
    "                <button onClick={() => setShowCreateEvent(true)}\n",
    "                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-light)',\n",
    "                    background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}>\n",
    "                  + Create New Service Day\n",
    "                </button>\n",
    "                <button onClick={() => { setShowServiceRequestModal(true); setRequestSuccess(false); setServiceRequestStep(1);\n",
    "                    setServiceRequestForm({ serviceLocation: '', serviceDate: '', serviceStartTime: '', serviceEndTime: '',\n",
    "                      serviceTopic: '', targetGender: 'Mix', targetAgeGrade: '', participantsCount: '',\n",
    "                      alreadySplitTeams: 'no', teamsCount: '', needSpecificServantsCount: 'no',\n",
    "                      servantsCount: '', servantsAvailableHelping: 'yes',\n",
    "                      contactName: '', contactNumber: '', churchName: '' }); }}\n",
    "                  style={{ width: '100%', padding: '12px', borderRadius: '12px',\n",
    "                    border: '1px solid rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.06)', color: '#c4b5fd',\n",
    "                    fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',\n",
    "                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>\n",
    "                  &#9962; Request VBT Service\n",
    "                </button>\n",
    "              </div>\n",
    "\n",
    "              {/* Bottom safe area spacer */}\n",
    "              <div style={{ height: 'env(safe-area-inset-bottom, 16px)', flexShrink: 0 }} />\n",
    "            </>\n",
    "          ) : (\n",
]

print(f"NEW_BLOCK_LINES count: {len(NEW_BLOCK_LINES)}")

# Now find where the create event form (the old else branch) starts in the original
# That's from "/* Create New Event Form */" through end of create event section
create_form_start = None
for i in range(START, END+1):
    if '/* Create New Event Form */' in lines[i]:
        create_form_start = i
        break

print(f"Create form start: {create_form_start+1 if create_form_start else 'NOT FOUND'}")

# Find where the create form ends (before the service modal)
# The service modal start was found earlier
if create_form_start and service_modal_start:
    # The create form ends before the service modal
    # Between them, look for the closing of the create event grid/section
    create_form_end = None
    for i in range(service_modal_start-1, create_form_start, -1):
        s = lines[i].strip()
        if s in (')}', ');}', ')}',):
            create_form_end = i
            break
    if create_form_end is None:
        # look for blank line before modal
        create_form_end = service_modal_start - 2
    print(f"Create form end: {create_form_end+1}")

    # The create form body (to reuse)
    create_form_lines = lines[create_form_start:create_form_end+1]

    # Add the create form lines to the new block
    NEW_BLOCK_LINES.extend(create_form_lines)
    NEW_BLOCK_LINES.append("\n")
    NEW_BLOCK_LINES.append("          )}\n")  # closes !showCreateEvent ternary
    NEW_BLOCK_LINES.append("        </div>\n")  # closes scrollable body
    NEW_BLOCK_LINES.append("\n")

    # Add service request modal
    modal_lines = lines[service_modal_start:END-1]
    NEW_BLOCK_LINES.extend(modal_lines)
    NEW_BLOCK_LINES.append("      </div>\n")
    NEW_BLOCK_LINES.append("    );\n")
    NEW_BLOCK_LINES.append("  }\n")

elif service_modal_start:
    # No create overlay found, just keep service modal
    NEW_BLOCK_LINES.extend([
        "          <div>Create Event Placeholder</div>\n",
        "          )}\n",
        "        </div>\n",
    ])
    modal_lines = lines[service_modal_start:END-1]
    NEW_BLOCK_LINES.extend(modal_lines)
    NEW_BLOCK_LINES.extend(["      </div>\n", "    );\n", "  }\n"])
else:
    NEW_BLOCK_LINES.extend(["        </div>\n", "      </div>\n", "    );\n", "  }\n"])

# Build final file
final_lines = lines[:START] + NEW_BLOCK_LINES + lines[END+1:]
print(f"New total lines: {len(final_lines)}")

# Write as UTF-8 bytes
out = ''.join(final_lines).encode('utf-8')
with open(SRC, 'wb') as f:
    f.write(out)

print("DONE - wrote as UTF-8")
