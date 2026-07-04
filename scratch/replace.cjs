const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

const target = `{/* ═══ ROTATION TIMER WIDGET (Coordinator only, floats in header) ════ */}
      {rotationTimer?.startedAt && (currentUser?.role === 'admin' || currentUser?.role === 'coordinator') && (
        <div style={{
          position:'fixed',top:\`calc(env(safe-area-inset-top) + 8px)\`,right:'8px',
          zIndex:700,background:'rgba(13,20,38,0.92)',backdropFilter:'blur(10px)',
          border:'1px solid rgba(255,255,255,0.12)',borderRadius:'12px',
          padding:'6px 12px',display:'flex',alignItems:'center',gap:'8px',
        }}>
          <span style={{fontSize:'0.7rem',color:rotationSecondsLeft<=60?'#f87171':'#4ade80',fontFamily:'monospace',fontWeight:'800'}}>
            {rotationSecondsLeft!=null ? (Math.floor(rotationSecondsLeft/60)+':'+(rotationSecondsLeft%60<10?'0':'')+(rotationSecondsLeft%60)) : '--:--'}
          </span>
          {!rotationTimer.isPaused ? (
            <button onClick={handleTimerPause} title='Pause' style={{background:'none',border:'none',cursor:'pointer',color:'#fbbf24',fontSize:'0.9rem',padding:'2px'}}>&#9646;&#9646;</button>
          ) : (
            <button onClick={handleTimerResume} title='Resume' style={{background:'none',border:'none',cursor:'pointer',color:'#4ade80',fontSize:'0.9rem',padding:'2px'}}>&#9654;</button>
          )}
          <button onClick={handleTimerReset} title='Reset' style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:'0.8rem',padding:'2px'}}>&#8635;</button>
        </div>
      )}`;

const replacement = `{/* ═══ ROTATION TIMER WIDGET (Coordinator only, floats in header) ════ */}
      {rotationTimer?.startedAt && (currentUser?.role === 'admin' || currentUser?.role === 'coordinator') && (
        <RotationTimerDisplay 
          rotationTimer={rotationTimer} 
          setShowRotateNow={setShowRotateNow} 
          handleTimerPause={handleTimerPause} 
          handleTimerResume={handleTimerResume} 
          handleTimerReset={handleTimerReset} 
        />
      )}`;

// Since line endings might differ (CRLF vs LF), we can use a regex or string replace that handles it
// But simple replace works if we normalize newlines
const normalize = str => str.replace(/\r\n/g, '\n');
content = normalize(content);
const normalizedTarget = normalize(target);
const normalizedReplacement = normalize(replacement);

if (content.includes(normalizedTarget)) {
    content = content.replace(normalizedTarget, normalizedReplacement);
    fs.writeFileSync('src/App.jsx', content);
    console.log("Replaced successfully.");
} else {
    console.log("Target not found!");
}
