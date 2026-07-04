const fs = require('fs');

const files = [
  'src/App.jsx',
  'src/components/DumbDashboard.jsx',
  'src/components/ScoreboardTab.jsx',
  'src/components/ScheduleTab.jsx',
  'src/components/TimelineFeedTab.jsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  
  const regex = /display:\s*['"]flex['"]([^}]*)}/g;
  let match;
  let replaced = code;
  
  while ((match = regex.exec(code)) !== null) {
    const inner = match[1];
    if (!inner.includes('alignItems') && !inner.includes('flexDirection') && !inner.includes('flex-direction') && !inner.includes('column')) {
      const newStr = match[0].replace(/display:\s*'flex'/, "display: 'flex', alignItems: 'center'");
      replaced = replaced.replace(match[0], newStr);
    }
  }
  
  fs.writeFileSync(file, replaced);
  console.log(`Processed ${file}`);
});
