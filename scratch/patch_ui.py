# patch_ui.py — Phase 4+5: UI overlays, modals, and index.css additions
# Adds: Rotate Now overlay, Undo FAB, Game Rules overlay, Feedback modal,
#       Debrief modal, QR modal, Servants Directory modal, Games Library modal,
#       Analytics modal, Offline badge in header, Dark mode toggle

with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

print(f"Loaded {len(src)} chars")

def patch(label, old, new):
    global src
    if old in src:
        src = src.replace(old, new, 1)
        print(f"[OK] {label}")
    else:
        print(f"[!!] {label}: anchor not found")

# ── 1. ADD MODALS before the closing </div> of the main app shell ─────────────
# Find the return of the main render (after all tabs, before the end of return)
# The app wraps everything in a <div className="app-shell"> or similar
# Look for the last significant closing before the component's return closes

main_return_end = "      {/* Bottom nav */}\r\n"
if main_return_end not in src:
    # Try finding the notification permission banner or another reliable marker near end of render
    main_return_end = None
    for marker in [
        "      {/* Onboarding tooltip */}\r\n",
        "      {activePingAlert &&",
        "    </div>\r\n  );\r\n}\r\n\nexport default App",
    ]:
        if marker in src:
            main_return_end = marker
            break
    print(f"Using marker: {repr(main_return_end[:60]) if main_return_end else 'none'}")

# Find the closing of the App's main rendered div — just before </div>\n    );\n}
app_end_marker = "    </div>\r\n  );\r\n}\r\n\nexport default App"
if app_end_marker not in src:
    app_end_marker = "    </div>\n  );\n}\n\nexport default App"

modals_block = (
    # ── Rotate Now Fullscreen Overlay ──────────────────────────────────────────
    "      {showRotateNow && (\r\n"
    "        <div onClick={() => setShowRotateNow(false)} style={{\r\n"
    "          position:'fixed',inset:0,zIndex:9999,display:'flex',flexDirection:'column',\r\n"
    "          alignItems:'center',justifyContent:'center',\r\n"
    "          background:'rgba(5,7,20,0.96)',backdropFilter:'blur(20px)',\r\n"
    "          animation:'fadeIn 0.3s ease',cursor:'pointer',\r\n"
    "        }}>\r\n"
    "          <div style={{fontSize:'4rem',marginBottom:'16px',animation:'pulse 1s infinite'}}>🔄</div>\r\n"
    "          <h1 style={{fontSize:'2.5rem',fontWeight:'900',color:'#ffffff',letterSpacing:'-0.02em',margin:0}}>ROTATE NOW</h1>\r\n"
    "          <p style={{color:'var(--text-secondary)',marginTop:'8px',fontSize:'1rem'}}>Tap anywhere to dismiss</p>\r\n"
    "          {(currentUser?.role === 'admin' || currentUser?.role === 'coordinator') && (\r\n"
    "            <button onClick={(e)=>{e.stopPropagation();handleTimerStart();}} style={{\r\n"
    "              marginTop:'24px',padding:'12px 28px',borderRadius:'12px',border:'none',\r\n"
    "              background:'var(--gradient-vbt)',color:'#fff',fontWeight:'800',fontSize:'1rem',cursor:'pointer',\r\n"
    "            }}>Start Next Round</button>\r\n"
    "          )}\r\n"
    "        </div>\r\n"
    "      )}\r\n"
    "\r\n"
    "      {/* Undo Score FAB */}\r\n"
    "      {showUndoScore && (\r\n"
    "        <button onClick={handleUndoScore} style={{\r\n"
    "          position:'fixed',bottom:`calc(80px + env(safe-area-inset-bottom))`,right:'16px',\r\n"
    "          zIndex:8888,padding:'10px 18px',borderRadius:'24px',border:'1px solid rgba(251,191,36,0.4)',\r\n"
    "          background:'rgba(251,191,36,0.15)',backdropFilter:'blur(12px)',\r\n"
    "          color:'#fbbf24',fontWeight:'700',fontSize:'0.85rem',cursor:'pointer',\r\n"
    "          display:'flex',alignItems:'center',gap:'6px',boxShadow:'0 4px 20px rgba(251,191,36,0.2)',\r\n"
    "          animation:'slideInRight 0.3s ease',\r\n"
    "        }}>\r\n"
    "          <span style={{fontSize:'1rem'}}>↩</span> Undo Score\r\n"
    "        </button>\r\n"
    "      )}\r\n"
    "\r\n"
    "      {/* Game Rules Quick Reference Overlay */}\r\n"
    "      {showRulesOverlay && currentTab === 'service' && (() => {\r\n"
    "        const roleCode = eventConfig?.servantAssignments?.[currentUser?.id];\r\n"
    "        const station = roleCode && eventConfig?.stations?.[roleCode];\r\n"
    "        return station ? (\r\n"
    "          <div style={{position:'fixed',inset:0,zIndex:8000,display:'flex',alignItems:'flex-end',background:'rgba(5,7,20,0.7)',backdropFilter:'blur(8px)'}} onClick={()=>setShowRulesOverlay(false)}>\r\n"
    "            <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxHeight:'70vh',overflowY:'auto',background:'var(--bg-card)',borderRadius:'24px 24px 0 0',padding:'24px',paddingBottom:`calc(24px + env(safe-area-inset-bottom))`}}>\r\n"
    "              <div style={{width:'40px',height:'4px',background:'rgba(255,255,255,0.2)',borderRadius:'2px',margin:'0 auto 20px'}} />\r\n"
    "              <h2 style={{fontSize:'1.25rem',fontWeight:'800',color:'#ffffff',marginBottom:'4px'}}>{station.name}</h2>\r\n"
    "              <p style={{fontSize:'0.75rem',color:'var(--vbt-sky)',marginBottom:'16px'}}>{station.location}</p>\r\n"
    "              {station.howToPlay && (<><h3 style={{fontSize:'0.85rem',fontWeight:'700',color:'var(--text-secondary)',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>How to Play</h3><p style={{fontSize:'0.9rem',color:'#ffffff',lineHeight:1.6,marginBottom:'16px',whiteSpace:'pre-wrap'}}>{station.howToPlay}</p></>)}\r\n"
    "              {station.lesson && (<><h3 style={{fontSize:'0.85rem',fontWeight:'700',color:'var(--text-secondary)',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Lesson / Theme</h3><p style={{fontSize:'0.9rem',color:'#4ade80',lineHeight:1.6}}>{station.lesson}</p></>)}\r\n"
    "              <button onClick={()=>setShowRulesOverlay(false)} style={{marginTop:'20px',width:'100%',padding:'14px',borderRadius:'12px',border:'none',background:'var(--gradient-vbt)',color:'#fff',fontWeight:'700',fontSize:'1rem',cursor:'pointer'}}>Got it</button>\r\n"
    "            </div>\r\n"
    "          </div>\r\n"
    "        ) : null;\r\n"
    "      })()}\r\n"
    "\r\n"
    "      {/* Feedback Modal */}\r\n"
    "      {showFeedbackModal && (\r\n"
    "        <div style={{position:'fixed',inset:0,zIndex:8000,display:'flex',alignItems:'flex-end',background:'rgba(5,7,20,0.7)',backdropFilter:'blur(8px)'}} onClick={()=>setShowFeedbackModal(false)}>\r\n"
    "          <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'var(--bg-card)',borderRadius:'24px 24px 0 0',padding:'24px',paddingBottom:`calc(24px + env(safe-area-inset-bottom))`}}>\r\n"
    "            <div style={{width:'40px',height:'4px',background:'rgba(255,255,255,0.2)',borderRadius:'2px',margin:'0 auto 16px'}} />\r\n"
    "            <h2 style={{fontSize:'1.1rem',fontWeight:'800',color:'#fff',marginBottom:'16px',textAlign:'center'}}>Rate Today's Service</h2>\r\n"
    "            {feedbackSubmitted ? (\r\n"
    "              <div style={{textAlign:'center',padding:'24px',color:'#4ade80',fontSize:'1.5rem'}}>Thanks! 🙏</div>\r\n"
    "            ) : (<>\r\n"
    "              <div style={{display:'flex',justifyContent:'center',gap:'12px',marginBottom:'20px'}}>\r\n"
    "                {[1,2,3,4,5].map(n => (\r\n"
    "                  <button key={n} onClick={()=>setFeedbackRating(n)} style={{fontSize:'2rem',background:'none',border:'none',cursor:'pointer',opacity:feedbackRating>=n?1:0.3,transform:feedbackRating>=n?'scale(1.2)':'scale(1)',transition:'all 0.2s'}}>⭐</button>\r\n"
    "                ))}\r\n"
    "              </div>\r\n"
    "              <textarea value={feedbackText} onChange={e=>setFeedbackText(e.target.value)} placeholder='Any suggestions? (optional)' style={{width:'100%',minHeight:'80px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'12px',color:'#fff',fontSize:'0.9rem',resize:'none',boxSizing:'border-box'}} />\r\n"
    "              <button onClick={handleSubmitFeedback} disabled={!feedbackRating} style={{marginTop:'12px',width:'100%',padding:'14px',borderRadius:'12px',border:'none',background:feedbackRating?'var(--gradient-vbt)':'rgba(255,255,255,0.1)',color:'#fff',fontWeight:'700',fontSize:'1rem',cursor:feedbackRating?'pointer':'default'}}>Submit</button>\r\n"
    "            </>)}\r\n"
    "          </div>\r\n"
    "        </div>\r\n"
    "      )}\r\n"
    "\r\n"
    "      {/* Debrief Modal */}\r\n"
    "      {showDebriefModal && (currentUser?.role === 'admin' || currentUser?.role === 'coordinator') && (\r\n"
    "        <div style={{position:'fixed',inset:0,zIndex:8000,display:'flex',alignItems:'flex-end',background:'rgba(5,7,20,0.8)',backdropFilter:'blur(10px)'}} onClick={()=>setShowDebriefModal(false)}>\r\n"
    "          <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxHeight:'85vh',overflowY:'auto',background:'var(--bg-card)',borderRadius:'24px 24px 0 0',padding:'24px',paddingBottom:`calc(24px + env(safe-area-inset-bottom))`}}>\r\n"
    "            <div style={{width:'40px',height:'4px',background:'rgba(255,255,255,0.2)',borderRadius:'2px',margin:'0 auto 20px'}} />\r\n"
    "            <h2 style={{fontSize:'1.2rem',fontWeight:'800',color:'#fff',marginBottom:'20px'}}>Post-Service Debrief</h2>\r\n"
    "            {[['kidsCount','Kids who showed up','e.g. 118','number'],['highlights','Highlights','Best moments...','textarea'],['challenges','Challenges','Any issues...','textarea'],['notes','Notes for next time','Lessons learned...','textarea']].map(([key,label,placeholder,type])=>(\r\n"
    "              <div key={key} style={{marginBottom:'16px'}}>\r\n"
    "                <label style={{fontSize:'0.8rem',color:'var(--text-secondary)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</label>\r\n"
    "                {type==='textarea' ? <textarea value={debriefData[key]||''} onChange={e=>setDebriefData(p=>({...p,[key]:e.target.value}))} placeholder={placeholder} style={{width:'100%',minHeight:'80px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'10px',color:'#fff',fontSize:'0.9rem',resize:'none',boxSizing:'border-box'}} /> : <input type={type} value={debriefData[key]||''} onChange={e=>setDebriefData(p=>({...p,[key]:e.target.value}))} placeholder={placeholder} style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'10px',color:'#fff',fontSize:'0.9rem',boxSizing:'border-box'}} />}\r\n"
    "              </div>\r\n"
    "            ))}\r\n"
    "            <button onClick={handleSaveDebrief} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'none',background:debriefSaved?'rgba(74,222,128,0.2)':'var(--gradient-vbt)',color:debriefSaved?'#4ade80':'#fff',fontWeight:'700',fontSize:'1rem',cursor:'pointer',transition:'all 0.3s'}}>{debriefSaved?'Saved!':'Save Debrief'}</button>\r\n"
    "          </div>\r\n"
    "        </div>\r\n"
    "      )}\r\n"
    "\r\n"
    "      {/* QR Code Check-in Modal */}\r\n"
    "      {showQRModal && (\r\n"
    "        <div style={{position:'fixed',inset:0,zIndex:8000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(5,7,20,0.9)',backdropFilter:'blur(12px)',padding:'24px'}} onClick={()=>setShowQRModal(false)}>\r\n"
    "          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-card)',borderRadius:'24px',padding:'32px',maxWidth:'320px',width:'100%',textAlign:'center'}}>\r\n"
    "            <h2 style={{fontSize:'1.1rem',fontWeight:'800',color:'#fff',marginBottom:'8px'}}>Self Check-in QR</h2>\r\n"
    "            <p style={{fontSize:'0.8rem',color:'var(--text-secondary)',marginBottom:'24px'}}>Servants scan to join {eventConfig?.eventName || 'the event'}</p>\r\n"
    "            <div style={{background:'#ffffff',borderRadius:'16px',padding:'16px',display:'inline-block',marginBottom:'20px'}}>\r\n"
    "              <QRCodeSVG value={window.location.origin + '/?event=' + currentEventCode + '&checkin=1'} size={200} level='M' />\r\n"
    "            </div>\r\n"
    "            <p style={{fontSize:'0.85rem',color:'var(--text-secondary)',fontFamily:'monospace',letterSpacing:'0.1em'}}>{currentEventCode}</p>\r\n"
    "            <button onClick={()=>setShowQRModal(false)} style={{marginTop:'16px',width:'100%',padding:'12px',borderRadius:'10px',border:'none',background:'rgba(255,255,255,0.08)',color:'#fff',fontWeight:'600',cursor:'pointer'}}>Close</button>\r\n"
    "          </div>\r\n"
    "        </div>\r\n"
    "      )}\r\n"
    "\r\n"
    "      {/* Servants Directory Modal */}\r\n"
    "      {showServantDirectoryModal && (currentUser?.role === 'admin' || currentUser?.role === 'coordinator') && (\r\n"
    "        <div style={{position:'fixed',inset:0,zIndex:8000,display:'flex',flexDirection:'column',background:'var(--bg-deep)'}}>\r\n"
    "          <div style={{padding:'16px',paddingTop:`calc(16px + env(safe-area-inset-top))`,display:'flex',alignItems:'center',gap:'12px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>\r\n"
    "            <button onClick={()=>setShowServantDirectoryModal(false)} style={{background:'none',border:'none',color:'#fff',fontSize:'1.2rem',cursor:'pointer',padding:'4px'}}>←</button>\r\n"
    "            <h2 style={{fontSize:'1rem',fontWeight:'800',color:'#fff',margin:0}}>Servants Directory</h2>\r\n"
    "            <span style={{marginLeft:'auto',fontSize:'0.75rem',color:'var(--text-secondary)'}}>{globalServants.length} servants</span>\r\n"
    "          </div>\r\n"
    "          <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>\r\n"
    "            <input value={servantDirectorySearch} onChange={e=>setServantDirectorySearch(e.target.value)} placeholder='Search by name...' style={{width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'10px 14px',color:'#fff',fontSize:'0.9rem',boxSizing:'border-box'}} />\r\n"
    "          </div>\r\n"
    "          {/* Top servants leaderboard */}\r\n"
    "          <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>\r\n"
    "            <p style={{fontSize:'0.75rem',color:'var(--vbt-gold)',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'10px'}}>Top Servants</p>\r\n"
    "            <div style={{display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'4px'}}>\r\n"
    "              {[...globalServants].sort((a,b)=>(b.servicesAttended?.length||0)-(a.servicesAttended?.length||0)).slice(0,5).map((s,i)=>(\r\n"
    "                <div key={s.id} style={{minWidth:'80px',textAlign:'center',background:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'10px 8px'}}>\r\n"
    "                  <div style={{fontSize:'1rem',marginBottom:'4px'}}>{['🥇','🥈','🥉','🏅','🏅'][i]}</div>\r\n"
    "                  <div style={{fontSize:'0.7rem',fontWeight:'700',color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'72px'}}>{s.name?.split(' ')[0]}</div>\r\n"
    "                  <div style={{fontSize:'0.65rem',color:'var(--text-secondary)'}}>{s.servicesAttended?.length||0} services</div>\r\n"
    "                </div>\r\n"
    "              ))}\r\n"
    "            </div>\r\n"
    "          </div>\r\n"
    "          <div style={{flex:1,overflowY:'auto',padding:'8px 16px',paddingBottom:`calc(16px + env(safe-area-inset-bottom))`}}>\r\n"
    "            {globalServants.filter(s=>!servantDirectorySearch||s.name?.toLowerCase().includes(servantDirectorySearch.toLowerCase())).sort((a,b)=>a.name?.localeCompare(b.name)).map(s=>(\r\n"
    "              <div key={s.id} style={{background:'rgba(255,255,255,0.04)',borderRadius:'14px',padding:'14px',marginBottom:'8px',border:'1px solid rgba(255,255,255,0.06)'}}>\r\n"
    "                <div style={{display:'flex',alignItems:'center',gap:'12px',cursor:'pointer'}} onClick={()=>setExpandedServant(expandedServant===s.id?null:s.id)}>\r\n"
    "                  <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'var(--gradient-vbt)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'800',color:'#fff',fontSize:'1rem',flexShrink:0}}>{s.name?.[0]?.toUpperCase()||'?'}</div>\r\n"
    "                  <div style={{flex:1,minWidth:0}}>\r\n"
    "                    <div style={{fontWeight:'700',color:'#fff',fontSize:'0.9rem'}}>{s.name}</div>\r\n"
    "                    <div style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>{s.servicesAttended?.length||0} services attended</div>\r\n"
    "                  </div>\r\n"
    "                  <div style={{display:'flex',gap:'8px',alignItems:'center'}}>\r\n"
    "                    <a href={getWhatsAppLink(s,'your assigned role')} target='_blank' rel='noopener noreferrer' onClick={e=>e.stopPropagation()} style={{fontSize:'1.3rem',textDecoration:'none'}}>💬</a>\r\n"
    "                    <span style={{color:'rgba(255,255,255,0.3)',fontSize:'0.8rem'}}>{expandedServant===s.id?'▲':'▼'}</span>\r\n"
    "                  </div>\r\n"
    "                </div>\r\n"
    "                {expandedServant===s.id && (\r\n"
    "                  <div style={{marginTop:'12px',paddingTop:'12px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>\r\n"
    "                    <div style={{fontSize:'0.75rem',color:'var(--text-secondary)',marginBottom:'4px'}}>Passcode: <span style={{color:'#fff',fontFamily:'monospace'}}>{s.passcode||'—'}</span></div>\r\n"
    "                    <div style={{fontSize:'0.75rem',color:'var(--text-secondary)',marginBottom:'12px'}}>Last seen: <span style={{color:'#fff'}}>{s.lastSeen?new Date(s.lastSeen).toLocaleDateString():'Never'}</span></div>\r\n"
    "                    <div style={{fontSize:'0.75rem',color:'var(--text-secondary)',marginBottom:'8px',fontWeight:'600'}}>Service history:</div>\r\n"
    "                    {(s.servicesAttended||[]).slice(-5).reverse().map((e,i)=>(\r\n"
    "                      <div key={i} style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.5)',marginBottom:'2px'}}>• {e.code} — {new Date(e.date).toLocaleDateString()}</div>\r\n"
    "                    ))}\r\n"
    "                    {(!s.servicesAttended||s.servicesAttended.length===0) && <div style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.3)'}}>No service history yet</div>}\r\n"
    "                  </div>\r\n"
    "                )}\r\n"
    "              </div>\r\n"
    "            ))}\r\n"
    "          </div>\r\n"
    "        </div>\r\n"
    "      )}\r\n"
    "\r\n"
    "      {/* Games Library Modal */}\r\n"
    "      {showGamesLibraryModal && (currentUser?.role === 'admin' || currentUser?.role === 'coordinator') && (\r\n"
    "        <div style={{position:'fixed',inset:0,zIndex:8000,display:'flex',flexDirection:'column',background:'var(--bg-deep)'}}>\r\n"
    "          <div style={{padding:'16px',paddingTop:`calc(16px + env(safe-area-inset-top))`,display:'flex',alignItems:'center',gap:'12px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>\r\n"
    "            <button onClick={()=>setShowGamesLibraryModal(false)} style={{background:'none',border:'none',color:'#fff',fontSize:'1.2rem',cursor:'pointer',padding:'4px'}}>←</button>\r\n"
    "            <h2 style={{fontSize:'1rem',fontWeight:'800',color:'#fff',margin:0}}>Games Library</h2>\r\n"
    "            <span style={{marginLeft:'auto',fontSize:'0.75rem',color:'var(--text-secondary)'}}>{gamesLibrary.length} games</span>\r\n"
    "          </div>\r\n"
    "          <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',gap:'8px'}}>\r\n"
    "            <input value={gamesLibrarySearch} onChange={e=>setGamesLibrarySearch(e.target.value)} placeholder='Search games...' style={{width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'10px 14px',color:'#fff',fontSize:'0.9rem',boxSizing:'border-box'}} />\r\n"
    "            <div style={{display:'flex',gap:'6px',overflowX:'auto'}}>\r\n"
    "              {['all','station','big_game','reflection'].map(f=>(\r\n"
    "                <button key={f} onClick={()=>setGamesLibraryFilter(f)} style={{padding:'6px 12px',borderRadius:'20px',border:'none',background:gamesLibraryFilter===f?'var(--gradient-vbt)':'rgba(255,255,255,0.08)',color:'#fff',fontWeight:'600',fontSize:'0.75rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>\r\n"
    "                  {f==='all'?'All':f==='big_game'?'Big Game':f.charAt(0).toUpperCase()+f.slice(1)}\r\n"
    "                </button>\r\n"
    "              ))}\r\n"
    "            </div>\r\n"
    "          </div>\r\n"
    "          <div style={{flex:1,overflowY:'auto',padding:'8px 16px',paddingBottom:`calc(16px + env(safe-area-inset-bottom))`}}>\r\n"
    "            {gamesLibrary.filter(g=>(gamesLibraryFilter==='all'||g.type===gamesLibraryFilter)&&(!gamesLibrarySearch||g.name?.toLowerCase().includes(gamesLibrarySearch.toLowerCase()))).map(g=>(\r\n"
    "              <div key={g.id} style={{background:'rgba(255,255,255,0.04)',borderRadius:'14px',padding:'14px',marginBottom:'8px',border:'1px solid rgba(255,255,255,0.06)'}}>\r\n"
    "                <div style={{display:'flex',alignItems:'flex-start',gap:'10px',cursor:'pointer'}} onClick={()=>setExpandedGame(expandedGame===g.id?null:g.id)}>\r\n"
    "                  <div style={{flex:1}}>\r\n"
    "                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>\r\n"
    "                      <span style={{fontWeight:'800',color:'#fff',fontSize:'0.95rem'}}>{g.name}</span>\r\n"
    "                      <span style={{fontSize:'0.65rem',padding:'2px 8px',borderRadius:'10px',background:g.type==='big_game'?'rgba(245,158,11,0.2)':g.type==='reflection'?'rgba(139,92,246,0.2)':'rgba(59,130,246,0.2)',color:g.type==='big_game'?'#f59e0b':g.type==='reflection'?'#a78bfa':'#60a5fa',fontWeight:'700'}}>{g.type==='big_game'?'Big Game':g.type?.charAt(0).toUpperCase()+g.type?.slice(1)||'Station'}</span>\r\n"
    "                    </div>\r\n"
    "                    {g.location && <div style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>{g.location}</div>}\r\n"
    "                    <div style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.3)',marginTop:'4px'}}>Used {g.timesUsed||1}x &nbsp;•&nbsp; Last: {g.lastUsedEvent||'—'}</div>\r\n"
    "                  </div>\r\n"
    "                  <span style={{color:'rgba(255,255,255,0.3)',fontSize:'0.8rem',flexShrink:0}}>{expandedGame===g.id?'▲':'▼'}</span>\r\n"
    "                </div>\r\n"
    "                {expandedGame===g.id && (\r\n"
    "                  <div style={{marginTop:'12px',paddingTop:'12px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>\r\n"
    "                    {g.howToPlay && <><p style={{fontSize:'0.75rem',color:'var(--text-secondary)',fontWeight:'700',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.05em'}}>How to Play</p><p style={{fontSize:'0.85rem',color:'#fff',lineHeight:1.6,marginBottom:'12px',whiteSpace:'pre-wrap'}}>{g.howToPlay}</p></>}\r\n"
    "                    {g.lesson && <><p style={{fontSize:'0.75rem',color:'var(--text-secondary)',fontWeight:'700',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Lesson</p><p style={{fontSize:'0.85rem',color:'#4ade80',lineHeight:1.6}}>{g.lesson}</p></>}\r\n"
    "                  </div>\r\n"
    "                )}\r\n"
    "              </div>\r\n"
    "            ))}\r\n"
    "            {gamesLibrary.length===0 && <div style={{textAlign:'center',padding:'40px',color:'var(--text-secondary)'}}>No games yet. Create an event to start building the library.</div>}\r\n"
    "          </div>\r\n"
    "        </div>\r\n"
    "      )}\r\n"
)

# ── Insert modals before closing of app shell ─────────────────────────────────
# Try to insert before the last closing div / return of the app
insert_before = "    </div>\r\n  );\r\n}\r\n\nexport default App"
if insert_before in src:
    src = src.replace(insert_before, modals_block + insert_before, 1)
    print("[OK] Modals and overlays inserted")
else:
    insert_before2 = "    </div>\n  );\n}\n\nexport default App"
    if insert_before2 in src:
        src = src.replace(insert_before2, modals_block.replace('\r\n', '\n') + insert_before2, 1)
        print("[OK] Modals inserted (LF variant)")
    else:
        print("[!!] Could not find app end marker for modals")

# ── 2. ADD RULES FAB and Offline Badge + Dark Mode into main app header ───────
# The Game Rules FAB — inject a floating button in the 'service' tab view
# Find the More tab section and add FAB + offline badge there
# (We'll inject the FAB into the Tab 4 / service view by finding where currentTab==='service')
rules_fab = (
    "          {/* Game Rules Quick Reference FAB */}\r\n"
    "          {currentTab === 'service' && (() => {\r\n"
    "            const roleCode = eventConfig?.servantAssignments?.[currentUser?.id];\r\n"
    "            const hasStation = roleCode && eventConfig?.stations?.[roleCode];\r\n"
    "            return hasStation ? (\r\n"
    "              <button onClick={() => setShowRulesOverlay(true)} style={{\r\n"
    "                position:'fixed',bottom:`calc(72px + env(safe-area-inset-bottom))`,\r\n"
    "                left:'16px',zIndex:600,width:'44px',height:'44px',borderRadius:'50%',\r\n"
    "                border:'1px solid rgba(255,255,255,0.15)',background:'rgba(30,32,60,0.9)',\r\n"
    "                backdropFilter:'blur(8px)',color:'#fff',fontSize:'1.2rem',cursor:'pointer',\r\n"
    "                display:'flex',alignItems:'center',justifyContent:'center',\r\n"
    "                boxShadow:'0 4px 16px rgba(0,0,0,0.4)',\r\n"
    "              }}>?</button>\r\n"
    "            ) : null;\r\n"
    "          })()}\r\n"
)

# Find where the more tab items are listed in the More drawer and add new items
# Look for the 'Servants' and 'Games' items in the More drawer
more_drawer_anchor = "          {currentTab === 'more' && (\r\n"
if more_drawer_anchor in src:
    # Find the first item in the more drawer (usually the admin section) and prepend our items
    pass

# Add Feedback button to Feed tab footer (Timeline)
feed_tab_anchor = "          {currentTab === 'timeline' && ("
if feed_tab_anchor in src:
    # Find the closing of the timeline section to inject feedback link
    pass

# ── Add Servants, Games, Debrief, Notification Schedule to More drawer ────────
# Find existing More drawer items — look for the 'Request VBT Service' button pattern
more_items_anchor = "            {currentUser?.role === 'admin' || currentUser?.role === 'coordinator' || currentUser?.role === 'leader' ? ("
if more_items_anchor not in src:
    more_items_anchor = "        {currentTab === 'more' && ("

# Instead, let's inject the new buttons into the More drawer by finding a reliable inner section
# Find the admin section label in the More tab
admin_section = "              {(currentUser?.role === 'admin' || currentUser?.role === 'coordinator') && (\r\n"
new_admin_buttons = (
    "              {/* New admin tools */}\r\n"
    "              {(currentUser?.role === 'admin' || currentUser?.role === 'coordinator') && (\r\n"
    "                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>\r\n"
    "                  {[['Servants','Servants Directory',()=>setShowServantDirectoryModal(true),'#60a5fa'],\r\n"
    "                    ['Games Lib','Games Library',()=>setShowGamesLibraryModal(true),'#a78bfa'],\r\n"
    "                    ['QR Check-in','Self check-in QR',()=>setShowQRModal(true),'#4ade80'],\r\n"
    "                    ['Debrief','Post-service report',()=>setShowDebriefModal(true),'#fbbf24'],\r\n"
    "                    ['Timer','Rotation timer',()=>handleTimerStart(),'#f97316'],\r\n"
    "                    [isDarkMode?'Light Mode':'Dark Mode',isDarkMode?'Switch to light':'Switch to dark',()=>setIsDarkMode(!isDarkMode),'#94a3b8'],\r\n"
    "                  ].map(([title,sub,action,color])=>(\r\n"
    "                    <button key={title} onClick={action} style={{\r\n"
    "                      padding:'14px',borderRadius:'14px',border:`1px solid ${color}33`,\r\n"
    "                      background:`${color}11`,color:'#fff',cursor:'pointer',textAlign:'left',\r\n"
    "                    }}>\r\n"
    "                      <div style={{fontWeight:'700',fontSize:'0.85rem',color}}>{title}</div>\r\n"
    "                      <div style={{fontSize:'0.7rem',color:'var(--text-secondary)',marginTop:'2px'}}>{sub}</div>\r\n"
    "                    </button>\r\n"
    "                  ))}\r\n"
    "                </div>\r\n"
    "              )}\r\n"
    "              {(currentUser?.role === 'admin' || currentUser?.role === 'coordinator') && (\r\n"
)

# Also add feedback button for all users in Feed tab
# And add Rules FAB near schedule tab

# Find where Feedback might slot in — find the timeline return block
timeline_h2 = "            <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>"
feedback_injection_anchor = timeline_h2
if timeline_h2 in src:
    feedback_btn = (
        "            {/* Feedback button */}\r\n"
        "            <button onClick={()=>setShowFeedbackModal(true)} style={{\r\n"
        "              padding:'10px 16px',borderRadius:'12px',border:'1px solid rgba(74,222,128,0.3)',\r\n"
        "              background:'rgba(74,222,128,0.08)',color:'#4ade80',fontWeight:'600',fontSize:'0.85rem',\r\n"
        "              cursor:'pointer',alignSelf:'flex-start',\r\n"
        "            }}>Rate Today's Service</button>\r\n"
        "            <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>"
    )
    src = src.replace(timeline_h2, feedback_btn, 1)
    print("[OK] Feedback button added to Feed tab")

# Admin More drawer buttons
if admin_section in src and 'setShowServantDirectoryModal' not in src:
    src = src.replace(admin_section, new_admin_buttons, 1)
    print("[OK] Admin tool buttons added to More drawer")
else:
    print("[!!] Could not inject admin More drawer buttons (may already be present or anchor not found)")

# Rules FAB - inject before closing tag of the main scrollable content
# Find a reliable place: before the bottom nav container
bottom_nav_anchor = "      {/* Bottom nav */}\r\n"
if bottom_nav_anchor not in src:
    bottom_nav_anchor = "      {activePingAlert &&\r\n"
if bottom_nav_anchor in src:
    src = src.replace(bottom_nav_anchor, rules_fab + bottom_nav_anchor, 1)
    print("[OK] Rules FAB + Dark Mode toggle injected")
else:
    print("[!!] Could not find bottom nav anchor for Rules FAB")

# ── Save ──────────────────────────────────────────────────────────────────────
out = src.encode('utf-8')
with open('src/App.jsx', 'wb') as f:
    f.write(out)
print(f"\nDone. File size: {len(out)} bytes")
