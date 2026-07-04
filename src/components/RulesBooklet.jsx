import React, { useState, useMemo } from 'react';
import { BookOpen, Search, HelpCircle, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

const DEFAULT_GAME_RULES = {
  'football': {
    name: '⚽ Soccer / Football',
    duration: '12 Minutes per round',
    points: '10 pts per goal, 5 pts per penalty shot, +5 spirit points for clean teamwork.',
    rules: [
      'Sliding tackles are strictly forbidden to prevent injuries on grass/court.',
      'A referee whistle stops the play immediately.',
      'Kick-ins replace throw-ins to keep the game fast and accessible.',
      'Goalies must distribute the ball by hand/throwing only.'
    ],
    tips: 'Referees should keep the whistle handy and call fouls early to prevent rough play.'
  },
  'soccer': {
    name: '⚽ Soccer / Football',
    duration: '12 Minutes per round',
    points: '10 pts per goal, 5 pts per penalty shot, +5 spirit points for clean teamwork.',
    rules: [
      'Sliding tackles are strictly forbidden to prevent injuries on grass/court.',
      'A referee whistle stops the play immediately.',
      'Kick-ins replace throw-ins to keep the game fast and accessible.',
      'Goalies must distribute the ball by hand/throwing only.'
    ],
    tips: 'Referees should keep the whistle handy and call fouls early to prevent rough play.'
  },
  'basketball': {
    name: '🏀 Basketball Shootout',
    duration: '10 Minutes per round',
    points: '2 pts per standard basket, 3 pts for long range, +10 pts for winning the match.',
    rules: [
      'No physical contact or blocking from behind.',
      'Double dribble and travelling result in turnover of possession.',
      'Substitutions can be made on any dead ball.',
      'Clean hand-checks only.'
    ],
    tips: 'Referees should call double dribbles consistently so youth learn proper technique.'
  },
  'dodgeball': {
    name: '☄️ Dodgeball Arena',
    duration: '8 Minutes (or until all eliminated)',
    points: '5 pts per player eliminated, +20 pts for surviving team.',
    rules: [
      'Headshots do not count and result in ball possession warning.',
      'Catching a live ball revives one eliminated teammate.',
      'If you step out of boundaries to dodge, you are out.',
      'Holding a ball for more than 10 seconds is a delay violation.'
    ],
    tips: 'Ensure eliminated players sit down in order of elimination to keep track of revival order.'
  },
  'relay': {
    name: '🏃 Relay Obstacle Course',
    duration: 'Timed blocks',
    points: '1st place: 50 pts | 2nd place: 30 pts | 3rd place: 20 pts | 4th place: 10 pts.',
    rules: [
      'All team members must complete their leg of the obstacle course.',
      'Hand-offs of the baton must occur within the marked exchange zone.',
      'Dropping the baton is a 3-second penalty, but the player must pick it up themselves.',
      'Lateness to the starting line is a 5-point team deduction.'
    ],
    tips: 'Use the stopwatch in the app! Record exact millisecond times for tiebreakers.'
  },
  'tug': {
    name: '💪 Tug of War',
    duration: 'Best 2 out of 3 pulls',
    points: '30 pts to the winning side, +10 spirit points for high energy cheer.',
    rules: [
      'No wrapping the rope around hands or body (extreme safety hazard).',
      'The pull starts ONLY on the referee\'s long whistle blast.',
      'If any player falls or sits intentionally, stop pull and restart.',
      'Cleats are not allowed; flat sneakers only.'
    ],
    tips: 'Enforce distance and make sure players pull only on the grass/mats to avoid slips.'
  }
};

export default function RulesBooklet({ campData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGame, setExpandedGame] = useState(null);

  // Extract games list
  const activeGames = useMemo(() => {
    const list = [];
    if (campData?.games) {
      campData.games.forEach(g => {
        const name = typeof g === 'object' ? g.name : g;
        if (name) list.push(name);
      });
    }
    if (campData?.matchups) {
      campData.matchups.forEach(m => {
        if (m.game && !list.includes(m.game)) list.push(m.game);
      });
    }
    return list.length > 0 ? list : ['Football', 'Basketball', 'Dodgeball', 'Relay Obstacle', 'Tug of War'];
  }, [campData]);

  // Find matches
  const gameDetailList = useMemo(() => {
    return activeGames.map(gameName => {
      const lower = gameName.toLowerCase();
      let matchKey = Object.keys(DEFAULT_GAME_RULES).find(k => lower.includes(k));
      const details = DEFAULT_GAME_RULES[matchKey] || {
        name: `🎯 ${gameName}`,
        duration: '10 Minutes',
        points: 'Standard match points + Spirit/behavior points (up to +15 pts).',
        rules: [
          'Follow the standard VBT safety rules.',
          'Play starts and stops on the referee\'s whistle.',
          'Great sportsmanship is mandatory.'
        ],
        tips: 'Keep play active, encourage clean pass play, and record scores immediately.'
      };
      return { id: gameName, ...details };
    });
  }, [activeGames]);

  const filteredGames = useMemo(() => {
    if (!searchTerm.trim()) return gameDetailList;
    const term = searchTerm.toLowerCase();
    return gameDetailList.filter(g => g.name.toLowerCase().includes(term) || g.tips.toLowerCase().includes(term));
  }, [gameDetailList, searchTerm]);

  return (
    <div style={S.container}>
      <div style={S.header}>
        <BookOpen size={20} style={{ color: '#29b6f6' }} />
        <h3 style={S.title}>VBT Game Rules Booklet</h3>
      </div>

      <p style={S.desc}>
        Reference guidelines, points distribution, and safety instructions for current event stations.
      </p>

      {/* Search Input */}
      <div style={S.searchWrapper}>
        <Search size={16} style={S.searchIcon} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search game or rule details..."
          style={S.searchInput}
        />
      </div>

      {/* Rules list */}
      <div style={S.list}>
        {filteredGames.length > 0 ? (
          filteredGames.map((game) => {
            const isExpanded = expandedGame === game.id;
            return (
              <div key={game.id} style={S.gameCard(isExpanded)}>
                <button
                  type="button"
                  onClick={() => setExpandedGame(isExpanded ? null : game.id)}
                  style={S.cardHeader}
                >
                  <span style={S.gameName}>{game.name}</span>
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {isExpanded && (
                  <div style={S.cardBody}>
                    <div style={S.infoGrid}>
                      <div>
                        <span style={S.infoLabel}>⏱️ DURATION</span>
                        <p style={S.infoText}>{game.duration}</p>
                      </div>
                      <div>
                        <span style={S.infoLabel}>🏆 POINTS SYSTEM</span>
                        <p style={S.infoText}>{game.points}</p>
                      </div>
                    </div>

                    <div style={S.section}>
                      <span style={S.infoLabel}>🛑 STATION RULES</span>
                      <ul style={S.bulletList}>
                        {game.rules.map((rule, idx) => (
                          <li key={idx} style={S.bulletItem}>
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div style={S.tipsBox}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <AlertCircle size={15} style={{ color: '#29b6f6', marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <span style={S.tipsTitle}>REFEREE STATION TIPS</span>
                          <p style={S.tipsText}>{game.tips}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div style={S.emptyState}>
            <HelpCircle size={24} style={{ color: 'rgba(255,255,255,0.2)' }} />
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>No games match your search</span>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  container: {
    background: 'rgba(13, 20, 38, 0.45)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(41, 182, 246, 0.15)',
    borderRadius: '16px',
    padding: '20px',
    boxSizing: 'border-box'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: "'Outfit', sans-serif"
  },
  desc: {
    margin: '0 0 14px 0',
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 1.4
  },
  searchWrapper: {
    position: 'relative',
    marginBottom: '16px'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(255,255,255,0.4)'
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 36px',
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  gameCard: (expanded) => ({
    background: expanded ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'all 0.2s ease'
  }),
  cardHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: 'none',
    border: 'none',
    color: '#ffffff',
    textAlign: 'left',
    cursor: 'pointer',
    outline: 'none'
  },
  gameName: {
    fontSize: '14px',
    fontWeight: '700',
    fontFamily: "'Outfit', sans-serif"
  },
  cardBody: {
    padding: '0 16px 16px 16px',
    borderTop: '1px solid rgba(255,255,255,0.04)'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    padding: '12px 0'
  },
  infoLabel: {
    fontSize: '9px',
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '0.05em'
  },
  infoText: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#ffffff',
    lineHeight: 1.3
  },
  section: {
    padding: '12px 0',
    borderTop: '1px solid rgba(255,255,255,0.04)'
  },
  bulletList: {
    margin: '6px 0 0 0',
    paddingLeft: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  bulletItem: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 1.4
  },
  tipsBox: {
    marginTop: '6px',
    padding: '12px',
    background: 'rgba(41, 182, 246, 0.08)',
    border: '1px solid rgba(41, 182, 246, 0.15)',
    borderRadius: '10px'
  },
  tipsTitle: {
    fontSize: '9px',
    fontWeight: '800',
    color: '#29b6f6',
    letterSpacing: '0.05em',
    display: 'block'
  },
  tipsText: {
    margin: '4px 0 0 0',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 1.4
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px 20px',
    textAlign: 'center'
  }
};
