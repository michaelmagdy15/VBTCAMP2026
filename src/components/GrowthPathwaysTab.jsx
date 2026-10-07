import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Award,
  CheckCircle2,
  BookOpen,
  Shield,
  Star,
  Compass,
  ChevronRight,
  GraduationCap,
  Check,
  X,
  Sparkles,
  Lock,
  Clock,
  UserCheck,
  Play,
  Search,
  FileText,
  HelpCircle,
  Download,
  AlertCircle,
  Share2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '../utils/haptics';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { subscribeToMembers } from '../services/memberService';
import {
  recordModuleCompletion,
  awardCertification,
} from '../services/trainingGrowthService';

// ─────────────────────────────────────────────────────────────
// Pathway Progression Levels Definition
// ─────────────────────────────────────────────────────────────
const PATHWAY_LEVELS = [
  {
    level: 1,
    id: 'volunteer',
    roleKey: 'volunteer',
    title: 'Volunteer',
    badgeLabel: 'Level 1: Community Volunteer',
    tagline: 'Heart of Service & Welcoming',
    color: '#38bdf8',
    icon: Compass,
    requiredModulesCount: 1,
    description:
      'The foundational entry into VBT ministry. Volunteers manage check-in tables, distribute equipment, welcome families, and bring enthusiastic hospitality.',
    responsibilities: [
      'Welcome campers and parents at camp registration tables',
      'Assist court referees with hydration and sports equipment',
      'Support crowd flow, lunch stations, and cheer teams',
      'Complete Child Safety Module 1: Safe Boundaries',
    ],
    perks: [
      'Official VBT Camp T-shirt & Credential',
      'Invitation to Servant Prayer Breakfasts',
      'Access to VBT Learning Academy',
    ],
    nextRank: 'Camp Servant',
  },
  {
    level: 2,
    id: 'servant',
    roleKey: 'servant',
    title: 'Camp Servant',
    badgeLabel: 'Level 2: Camp Servant',
    tagline: 'Group Mentor & Station Guide',
    color: '#06b6d4',
    icon: BookOpen,
    requiredModulesCount: 4,
    description:
      'Active servant guiding camper teams throughout daily sports rotations. Mentors youth in fair play, leads prayer circles, and preserves court safety.',
    responsibilities: [
      'Lead assigned team through sports rotations & huddles',
      'Facilitate daily spiritual check-ins and encouragement',
      'Assist referees with line calling and score keeping',
      'Maintain strict compliance with the Two-Leader Rule',
    ],
    perks: [
      'VBT Servant Badge & Official Lanyard',
      'Eligibility for station leader rotations',
      'Direct mentorship from Ministry Coordinators',
    ],
    nextRank: 'Lead Servant',
  },
  {
    level: 3,
    id: 'lead_servant',
    roleKey: 'team_leader',
    title: 'Lead Servant',
    badgeLabel: 'Level 3: Lead Servant',
    tagline: 'Sports Captain & Crisis Triage',
    color: '#8b5cf6',
    icon: Shield,
    requiredModulesCount: 8,
    description:
      'Seasoned leaders overseeing athletic tournament matches, court dispute de-escalation, rapid first aid response, and onboarding newer servants.',
    responsibilities: [
      'Head referee for official camp tournament matches',
      'First aid triage and athletic injury response (R.I.C.E.)',
      'Shadow and coach newer volunteers and servants',
      'Facilitate evening team debriefs and spiritual reflections',
    ],
    perks: [
      'VBT Referee Whistle & Gold Leadership Pin',
      'Tournament court priority scheduling',
      'Official Endorsement for Diocesan Youth Leadership',
    ],
    nextRank: 'Ministry Coordinator',
  },
  {
    level: 4,
    id: 'coordinator',
    roleKey: 'coordinator',
    title: 'Ministry Coordinator',
    badgeLabel: 'Level 4: Ministry Coordinator',
    tagline: 'Visionary & Community Architect',
    color: '#f59e0b',
    icon: GraduationCap,
    requiredModulesCount: 13,
    description:
      'Executive leadership designing camp tournament schedules, managing servant rosters, upholding pastoral standards, and certifying leaders.',
    responsibilities: [
      'Architect master camp tournament brackets and rosters',
      'Authorize leadership certifications & track qualifications',
      'Oversee camp emergency protocols and pastoral care triage',
      'Direct spiritual curriculum and mentor lead servants',
    ],
    perks: [
      'VBT Executive Council Keycard & Official Seal',
      'Certification authority to award servant credentials',
      'Access to full administrative control dashboard',
    ],
    nextRank: 'Master Overseer',
  },
];

// ─────────────────────────────────────────────────────────────
// Training Course Catalog & Structured Lessons
// ─────────────────────────────────────────────────────────────
const TRAINING_COURSES = [
  {
    id: 'child-safety',
    title: 'Child Safety Essentials',
    category: 'Safety & Protection',
    badgeName: 'Certified Child Safety Guardian',
    estimatedMinutes: 20,
    icon: Shield,
    accentColor: '#3b82f6',
    summary:
      'Fundamental youth protection guidelines, boundary awareness, the two-leader rule, and pastoral escalation protocols.',
    modules: [
      {
        id: 'cs-101',
        title: 'Two-Leader Rule & Safe Boundaries',
        duration: '6 min read',
        overview:
          'Protecting campers and servants through absolute transparency, clear sightlines, and never remaining one-on-one with a minor in an unobserved space.',
        contentSections: [
          {
            heading: '1. The Two-Leader Rule',
            body: 'At no point should an adult servant or volunteer be alone with a minor child in any enclosed room, vehicle, hallway, or counseling area. A minimum of two verified leaders must always be present. If an emergency requires one-on-one attention, keep doors wide open and remain in clear view of other leaders.',
          },
          {
            heading: '2. Restroom Escort Protocol',
            body: 'For campers under 12 years old, two servants must escort the group to the restroom. Before entry, one servant verifies the facility is empty and safe. Servants remain outside the entrance doors while campers use the facilities, maintaining visual sight of the exit at all times.',
          },
          {
            heading: '3. Physical Affection & Boundaries',
            body: 'Encourage campers through high-fives, fist bumps, and side hugs. Never carry campers on shoulders or engage in rough horseplay. Treat every camper with deep dignity and respect.',
          },
        ],
        scenario:
          'An 8-year-old camper approaches you during outdoor soccer practice and urgently asks to be escorted to the restroom across the campus.',
        quiz: {
          question:
            'What is the correct protocol when taking a young camper to the restroom?',
          options: [
            {
              text: 'Walk the child alone into the restroom and wait inside with them.',
              isCorrect: false,
              explanation:
                'Never be alone inside an enclosed restroom with a camper.',
            },
            {
              text: 'Ask another servant to join you, verify the facility is clear, and both wait outside the main door.',
              isCorrect: true,
              explanation:
                'Spot on! The Two-Leader Rule ensures full transparency and camper protection.',
            },
            {
              text: 'Tell the camper to run alone across the campus to save time.',
              isCorrect: false,
              explanation:
                'Young campers must always be supervised across campus grounds.',
            },
          ],
        },
      },
      {
        id: 'cs-102',
        title: 'Recognizing Signs of Distress & Emotional Care',
        duration: '7 min read',
        overview:
          'Active observation of camper behavior, addressing bullying, identifying subtle signs of emotional distress, and responding with gentle Christlike empathy.',
        contentSections: [
          {
            heading: '1. Active Behavioral Observation',
            body: 'Notice sudden shifts in temperament: withdrawal from team games, sudden aggression, unusual fear of physical contact, or deep reluctance to go home at pickup time. Never ignore a child who suddenly isolates themselves.',
          },
          {
            heading: '2. Empathetic Listening Without Promises of Secrecy',
            body: 'If a camper confides a distressing situation at home or school, listen with calmness and warmth. Never promise absolute secrecy ("I will never tell anyone"). Instead say: "I love you and care about your safety. I will only share this with Father or our Camp Director so we can keep you safe."',
          },
          {
            heading: '3. De-escalating Anxiety',
            body: 'Use simple calming techniques: offer cool water, step into shade, practice slow box breathing (inhale 4s, hold 4s, exhale 4s), and remind the camper that VBT is a safe, loving family.',
          },
        ],
        scenario:
          'During lunchtime, a 10-year-old camper is sitting alone weeping, saying: "Please do not tell anyone, but kids in my team were teasing me about my shoes."',
        quiz: {
          question:
            'How should a servant handle a camper confiding emotional distress?',
          options: [
            {
              text: 'Promise 100% secrecy to make sure the camper does not get upset.',
              isCorrect: false,
              explanation:
                'Promises of secrecy hinder proper pastoral protection and escalation.',
            },
            {
              text: 'Tell the child to toughen up because sports camps require thick skin.',
              isCorrect: false,
              explanation:
                'Dismissive responses damage trust and emotional safety.',
            },
            {
              text: 'Listen with gentle empathy, validate their feelings, and coordinate discreetly with the lead servant to address team culture.',
              isCorrect: true,
              explanation:
                'Exactly right! Empathy and supportive team intervention restore trust.',
            },
          ],
        },
      },
      {
        id: 'cs-103',
        title: 'Incident Reporting & Pastoral Escalation Protocol',
        duration: '7 min read',
        overview:
          'The 15-minute incident notification standard, factual documentation guidelines, and coordinating parental communication with church leadership.',
        contentSections: [
          {
            heading: '1. The 15-Minute Rule',
            body: 'Any notable injury, safety disclosure, or behavioral confrontation must be reported to the Camp Director or Pastoral Coordinator within 15 minutes of occurrence.',
          },
          {
            heading: '2. Factual Documentation Standard',
            body: 'Document strictly objective observations: Who was involved, What happened, When, Where, and Who witnessed it. Avoid subjective assumptions, emotional phrasing, or medical diagnoses unless certified.',
          },
          {
            heading: '3. Parental Communication Line',
            body: 'Servants should not contact parents directly regarding sensitive safety incidents without coordinator clearance. Official communications are handled by designated Pastoral Leads to ensure clear, caring, and unified messaging.',
          },
        ],
        scenario:
          'Two campers bump heads contesting a high volleyball. One has a small bump above the eyebrow and feels slightly dizzy.',
        quiz: {
          question:
            'What is the immediate reporting protocol following this physical collision?',
          options: [
            {
              text: 'Give them ice, let them keep playing immediately, and say nothing if they feel fine.',
              isCorrect: false,
              explanation:
                'Potential head collisions must always be evaluated and documented.',
            },
            {
              text: 'Escort them to First Aid, notify Camp Coordinator within 15 minutes, and document facts in the log.',
              isCorrect: true,
              explanation:
                'Correct! Safety, medical review, and timely documentation are mandatory.',
            },
            {
              text: 'Call the camper’s parents immediately without informing the camp coordinators.',
              isCorrect: false,
              explanation:
                'Camp coordinators must oversee the evaluation and handle unified parental calls.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'sports-referee',
    title: 'Sports Referee Rules & Court Ethics',
    category: 'Athletics & Gameplay',
    badgeName: 'VBT Certified Sports Referee',
    estimatedMinutes: 25,
    icon: Award,
    accentColor: '#10b981',
    summary:
      'Tournament regulations for football, basketball, padel, and volleyball. Whistle mechanics, line calls, and bench conflict resolution.',
    modules: [
      {
        id: 'sr-101',
        title: 'The VBT Sportsmanship Code & Fair Play',
        duration: '6 min read',
        overview:
          'Sports in VBT are an instrument for spiritual formation. Teaching youth how to win with grace, lose with dignity, and honor each opponent.',
        contentSections: [
          {
            heading: '1. The Purpose of Competition',
            body: 'Trophies tarnish, but godly character lasts forever. As a referee, your primary responsibility is cultivating an environment where athletes push their limits with total respect for the opposing team and the rules.',
          },
          {
            heading: '2. Zero Tolerance for Toxicity',
            body: 'Taunting, profanity, arguing calls, or mocking opposing mistakes warrants an immediate whistle. Explain the infraction calmly and issue a brief 2-minute character timeout if needed.',
          },
          {
            heading: '3. Mandatory Pre/Post Match Handshakes',
            body: 'Both teams line up at center court for a prayer led by servants before kickoff and conclude every match with high-fives and mutual congratulations.',
          },
        ],
        scenario:
          'A player scores a game-winning basketball shot and immediately runs up to the opposing defender’s face, screaming taunts.',
        quiz: {
          question: 'How should the referee handle this taunting infraction?',
          options: [
            {
              text: 'Ignore it because emotional celebration is natural after a big play.',
              isCorrect: false,
              explanation:
                'Unchecked taunting escalates tempers and violates the VBT code.',
            },
            {
              text: 'Blow whistle, assess an unsportsmanlike technical, and remind both teams of the VBT sportsmanship commitment.',
              isCorrect: true,
              explanation:
                'Decisive and educational refereeing maintains fair play and camp values.',
            },
            {
              text: 'Disqualify the entire winning team from the tournament permanently.',
              isCorrect: false,
              explanation:
                'Excessive punishment without corrective instruction is counter-productive.',
            },
          ],
        },
      },
      {
        id: 'sr-102',
        title: 'Court Regulations: Football & Basketball',
        duration: '7 min read',
        overview:
          'Official 5v5 turf soccer rules, sliding tackle bans, running clocks, basketball foul limits, and decisive whistle techniques.',
        contentSections: [
          {
            heading: '1. Football: Strict Sliding Tackle Prohibition',
            body: 'To prevent severe knee and ankle injuries on artificial turf, all sliding tackles are strictly banned in VBT soccer. Even if contact with the ball was made, sliding into another player is an automatic indirect free kick.',
          },
          {
            heading: '2. Basketball: Running Clocks & Foul Counts',
            body: '12-minute halves with a running clock (stops only for timeouts and injuries). Each team is permitted 5 fouls per half before opposing teams enter bonus free throws.',
          },
          {
            heading: '3. Decisive Whistle & Signal Mechanics',
            body: 'Blow the whistle with confidence and volume. Hold up your hand immediately with clear hand signals so players on both sides understand the call without confusion.',
          },
        ],
        scenario:
          'A defender slides from behind to knock the ball away cleanly during a fast break in the football final. The attacker stumbles but is unhurt.',
        quiz: {
          question:
            'What is the ruling on this sliding tackle on the turf court?',
          options: [
            {
              text: 'Play on! Clean tackle because the defender touched the ball first.',
              isCorrect: false,
              explanation:
                'Sliding tackles are banned regardless of ball contact on turf.',
            },
            {
              text: 'Blow the whistle, award a free kick for dangerous play, and remind the player sliding tackles are prohibited.',
              isCorrect: true,
              explanation:
                'Safety first! Player protection is non-negotiable on artificial turf.',
            },
            {
              text: 'Award a penalty shot immediately even though the tackle was outside the box.',
              isCorrect: false,
              explanation: 'Free kicks must be taken from the spot of the foul.',
            },
          ],
        },
      },
      {
        id: 'sr-103',
        title: 'Padel & Volleyball Officiating',
        duration: '6 min read',
        overview:
          'Officiating court rotations, the 3-touch rule in volleyball, net touch violations, padel glass bounce rules, and line calls.',
        contentSections: [
          {
            heading: '1. Volleyball: Net Violations & Service Rotations',
            body: 'Any player contact with the volleyball net during an active rally is an immediate fault. The ball may touch the net on a serve provided it crosses into the opposing court.',
          },
          {
            heading: '2. Padel: Serve & Glass Rules',
            body: 'Padel serves must be struck underhand at or below waist level after one bounce behind the service line. In play, the ball must hit the court turf before striking the glass wall or metal fence.',
          },
          {
            heading: '3. The "Ball on the Line" Rule',
            body: 'In both volleyball and padel, any ball that touches any part of the boundary line is considered IN. The referee’s decision is definitive.',
          },
        ],
        scenario:
          'During a volleyball rally, a spiker smashes the ball onto the back line, but their hand brushes the top of the net during the follow-through.',
        quiz: {
          question: 'What is the correct referee call on this play?',
          options: [
            {
              text: 'Net touch fault! Point and serve awarded to the opposing team.',
              isCorrect: true,
              explanation:
                'Net contact during active attack cancels the spike and awards the fault.',
            },
            {
              text: 'The ball hit the line first, so count the spike as a point.',
              isCorrect: false,
              explanation:
                'Touching the net during an attack sequence is an immediate infraction.',
            },
            {
              text: 'Replay the point because it was too close to call.',
              isCorrect: false,
              explanation: 'Net violations must be enforced definitively.',
            },
          ],
        },
      },
      {
        id: 'sr-104',
        title: 'Conflict De-escalation & Bench Management',
        duration: '6 min read',
        overview:
          'Calming heated player interactions, the Two-Captain Conference, managing noisy servant benches, and keeping spirits joyful.',
        contentSections: [
          {
            heading: '1. The Two-Captain Conference',
            body: 'When friction begins between opposing teams, blow the whistle and call only the two team captains to center court. Explain what behaviors need to stop and ask them to lead their teammates.',
          },
          {
            heading: '2. The 3-Minute Cool-Down Sub',
            body: 'If a player is frustrated or overly physical, recommend their servant substitute them out for 3 minutes to drink water, breathe, and reset their mindset.',
          },
          {
            heading: '3. Managing Servant Bench Energy',
            body: 'Servants should be the most joyful and supportive people on the sidelines. Gently remind servants that complaining to the referee sets a poor example for youth campers.',
          },
        ],
        scenario:
          'Two opposing players get entangled under the basket, shoving each other before their teammates step in.',
        quiz: {
          question:
            'What is the best immediate response from the referee team?',
          options: [
            {
              text: 'Shout at both players from across the court and tell them they are benched forever.',
              isCorrect: false,
              explanation:
                'Escalating agitation does not bring peace to the court.',
            },
            {
              text: 'Blow whistle firmly, separate players with open palms, call captains, and mandate a 3-minute water cool-down for both.',
              isCorrect: true,
              explanation:
                'Calm, firm de-escalation protects the athletes and restores order.',
            },
            {
              text: 'Let them wrestle it out to see who is tougher.',
              isCorrect: false,
              explanation: 'Never allow physical aggression.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'first-aid',
    title: 'First Aid & Camp Safety',
    category: 'Emergency Care',
    badgeName: 'Camp First Responder',
    estimatedMinutes: 20,
    icon: CheckCircle2,
    accentColor: '#ef4444',
    summary:
      'Heat exhaustion mitigation, hydration protocols, sprain and fracture management via R.I.C.E., and emergency SOS triage.',
    modules: [
      {
        id: 'fa-101',
        title: 'Heat Exhaustion & Hydration Protocols',
        duration: '6 min read',
        overview:
          'Recognizing early dehydration and heat stress signs during hot summer camps. Implementing compulsory shaded water rotations.',
        contentSections: [
          {
            heading: '1. Recognizing Heat Exhaustion',
            body: 'Symptoms include pale clammy skin, heavy sweating, sudden dizziness, headache, nausea, and a rapid weak pulse. Heat stroke is more severe (hot, dry skin, confusion, fainting) and requires emergency 123 calls.',
          },
          {
            heading: '2. Immediate Triage Steps',
            body: 'Move camper to an air-conditioned room or deep shaded area. Loosen tight athletic gear. Elevate feet 6-8 inches. Provide cool water or electrolyte drinks in small, regular sips. Apply cool damp towels to forehead and neck.',
          },
          {
            heading: '3. Mandatory Water Breaks',
            body: 'In temperatures exceeding 30°C, games must pause every 15-20 minutes for a compulsory 3-minute shaded hydration break for all players and servants.',
          },
        ],
        scenario:
          'During 1:00 PM afternoon soccer, an 11-year-old goalkeeper sits on the grass, complaining of dizziness and a pounding headache with pale skin.',
        quiz: {
          question: 'What is the immediate priority for this dizzy camper?',
          options: [
            {
              text: 'Give them a sugar candy and tell them to finish the last 5 minutes of the match.',
              isCorrect: false,
              explanation:
                'Continuing play with heat exhaustion can trigger life-threatening heat stroke.',
            },
            {
              text: 'Move them to air conditioning/shade, elevate legs, apply cool wet cloth, and give small sips of cool water.',
              isCorrect: true,
              explanation:
                'Proper immediate cooling and hydration rapidly stabilize heat exhaustion.',
            },
            {
              text: 'Pour a bucket of freezing ice water directly over their chest.',
              isCorrect: false,
              explanation:
                'Sudden thermal shock can cause severe vasoconstriction and cardiac stress.',
            },
          ],
        },
      },
      {
        id: 'fa-102',
        title: 'Sprains, Fractures & the R.I.C.E. Protocol',
        duration: '7 min read',
        overview:
          'Athletic joint injury assessment, cold therapy application, compression wrapping, elevation, and distinguishing sprains from fractures.',
        contentSections: [
          {
            heading: '1. The R.I.C.E. Principle',
            body: 'REST: Stop activity immediately. ICE: Apply ice wrapped in cloth for 15-20 minutes (never raw ice directly on bare skin). COMPRESSION: Wrap lightly with an elastic bandage from toes upwards. ELEVATION: Raise the limb above heart level to limit swelling.',
          },
          {
            heading: '2. Spotting Possible Fractures',
            body: 'Inability to bear any weight, visible bone deformity, severe localized tenderness, or hearing a distinct "crack" indicates a suspected fracture. Immobilize the limb with a splint; do NOT attempt to straighten or manipulate it.',
          },
          {
            heading: '3. When to Transport',
            body: 'If severe deformity, numbness in toes/fingers, or unmanageable pain is observed, alert the camp medical lead for immediate hospital evaluation.',
          },
        ],
        scenario:
          'A camper lands awkwardly on another player’s foot coming down from a basketball rebound, rolling their ankle and grimacing in pain.',
        quiz: {
          question:
            'What does the "I" in the R.I.C.E. protocol stand for when treating an ankle sprain?',
          options: [
            {
              text: 'Immediate running test to see if ligaments are intact.',
              isCorrect: false,
              explanation: 'Never force weight bearing on an acute joint injury.',
            },
            {
              text: 'Ice wrapped in a towel applied for 15-20 minutes to reduce inflammation.',
              isCorrect: true,
              explanation:
                'Correct! Ice application slows blood flow and reduces painful swelling.',
            },
            {
              text: 'Intense deep massage of the swollen ligaments.',
              isCorrect: false,
              explanation:
                'Massaging an acute sprain exacerbates internal bleeding and swelling.',
            },
          ],
        },
      },
      {
        id: 'fa-103',
        title: 'Emergency SOS & Medical Kit Deployment',
        duration: '7 min read',
        overview:
          'Fast access to the central camp medical station, AED defibrillator awareness, head injury observation, and activating the VBT SOS system.',
        contentSections: [
          {
            heading: '1. Medical Kit Station Locations',
            body: 'First Aid bags are positioned at: 1) Central Command Tent, 2) Indoor Basketball Gym entrance, and 3) Swimming / Turf field station. Each contains ice packs, sterile pads, antiseptic, SAM splints, and CPR masks.',
          },
          {
            heading: '2. The VBT Emergency SOS Trigger',
            body: 'In situations involving loss of consciousness, severe allergic reaction (anaphylaxis), heavy bleeding, or neck trauma, tap the Emergency SOS button in the app or radio the coordinator immediately.',
          },
          {
            heading: '3. Spinal Precautions',
            body: 'Never move a fallen camper with suspected spinal or head trauma unless they are in immediate external danger (e.g. fire, flooding). Keep them calm, still, and wait for emergency EMT personnel.',
          },
        ],
        scenario:
          'A player collides with a fence post, falls backward, and lies motionless on the ground without speaking.',
        quiz: {
          question:
            'What must you NOT do when approaching a fallen camper with suspected head/neck injury?',
          options: [
            {
              text: 'Check if they are breathing and responding to your voice.',
              isCorrect: false,
              explanation: 'Checking breathing and responsiveness is vital.',
            },
            {
              text: 'Try to pull them up to their feet or twist their neck to check for injuries.',
              isCorrect: true,
              explanation:
                'Moving a suspected spinal injury can cause permanent neurological damage.',
            },
            {
              text: 'Activate the Camp Emergency SOS and keep others from crowding.',
              isCorrect: false,
              explanation:
                'Activating help and keeping the area clear is the gold standard.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'spiritual-mission',
    title: 'VBT Spiritual Mission & Servant Leadership',
    category: 'Faith & Leadership',
    badgeName: 'VBT Servant Leader Foundation',
    estimatedMinutes: 20,
    icon: Star,
    accentColor: '#a855f7',
    summary:
      'Christlike humility in sports, the ministry of encouragement, leading daily camp devotionals, and fostering genuine fellowship.',
    modules: [
      {
        id: 'sm-101',
        title: 'Christlike Servant Leadership & Humility',
        duration: '6 min read',
        overview:
          'The posture of Christ washing His disciples’ feet applied to camp fields. Leading not by authority, but through sacrificial joy.',
        contentSections: [
          {
            heading: '1. The Heart of Service',
            body: '"Whoever desires to become great among you shall be your servant." In VBT, the greatest servant is the one carrying water jugs, picking up trash after lunch, and sitting beside the camper who feels forgotten.',
          },
          {
            heading: '2. Leading Under Pressure',
            body: 'Youth watch servants most closely when things go wrong—when games are delayed, meals run short, or an unfair call happens. Your gentle smile and calm demeanor are living sermons.',
          },
          {
            heading: '3. Punctuality & Faithfulness',
            body: 'Arriving 15 minutes before your campers arrive and staying until every youth is safely in their parents’ vehicle shows that ministry is an offering to the Lord.',
          },
        ],
        scenario:
          'After an intense 3-hour sports day, the cafeteria has water bottles and wrappers left behind by tired campers.',
        quiz: {
          question:
            'What action best reflects the VBT Servant Leader mindset?',
          options: [
            {
              text: 'Leave it for the janitorial staff because your shift is technically over.',
              isCorrect: false,
              explanation:
                'Servant leadership is joyful, proactive stewardship.',
            },
            {
              text: 'Cheerfully grab a trash bag, invite a few lingering campers to help make it fun, and leave the space cleaner than you found it.',
              isCorrect: true,
              explanation:
                'Leading by humble example transforms routine chores into discipleship.',
            },
            {
              text: 'Complain publicly in the group chat about disorganized campers.',
              isCorrect: false,
              explanation:
                'Complaining tears down morale; humble action builds fellowship.',
            },
          ],
        },
      },
      {
        id: 'sm-102',
        title: 'The Ministry of Encouragement',
        duration: '7 min read',
        overview:
          'Using the power of words to uplift youth facing self-doubt. Cheering the struggling athlete and cultivating an inclusive environment.',
        contentSections: [
          {
            heading: '1. Words That Give Life',
            body: 'Campers hear criticism and comparison all year at school and online. VBT must be an oasis of authentic affirmation where every young person discovers they are valued and loved by God.',
          },
          {
            heading: '2. Celebrating the Unseen Hero',
            body: 'Anyone can celebrate the top goal scorer. The godly servant celebrates the child who hustled for defense, cheered their teammates from the bench, or shared their water bottle.',
          },
          {
            heading: '3. Welcoming the Hesitant Camper',
            body: 'Identify youth standing on the court perimeter during games. Partner them with a supportive peer, invite them into a fun sub role, and celebrate their courage.',
          },
        ],
        scenario:
          'A quiet 9-year-old misses an easy penalty kick in the shootout, hanging their head in tears as other campers sigh.',
        quiz: {
          question:
            'How should a VBT Servant immediately comfort and mentor this camper?',
          options: [
            {
              text: 'Tell them they will be replaced for the next round so the team can win.',
              isCorrect: false,
              explanation:
                'Shaming or excluding youth destroys self-worth and ministry purpose.',
            },
            {
              text: 'Put your arm around their shoulder, give them a high-five, celebrate their bravery in taking the kick, and lead the team in cheering them.',
              isCorrect: true,
              explanation:
                'Grace in failure teaches youth that God’s love is unconditional.',
            },
            {
              text: 'Ignore the camper so you do not draw attention to their miss.',
              isCorrect: false,
              explanation:
                'Leaving a weeping child without comfort produces isolation.',
            },
          ],
        },
      },
      {
        id: 'sm-103',
        title: 'Daily Devotionals & Camp Prayer Circles',
        duration: '7 min read',
        overview:
          'Structuring short, engaging 3-minute sports devotionals, linking athletic virtues to Scripture, and facilitating heartfelt team prayer.',
        contentSections: [
          {
            heading: '1. The 3-Minute Sports Devotional Format',
            body: 'HOOK: Mention a recognizable sports moment (e.g. running a marathon, passing under pressure). BOOK: Read one crisp Bible verse (e.g. 1 Cor 9:24, Phil 4:13). LOOK: Ask one quick question that gets youth talking. TOOK: Set one actionable virtue for today’s tournament.',
          },
          {
            heading: '2. The Pre-Game Prayer Circle',
            body: 'Gather the team into a tight huddle. Have players place their hands in the center. Pray not for victory over the opponent, but for safety, joy, fair play, and mutual blessing.',
          },
          {
            heading: '3. Connecting with Pastoral Fathers',
            body: 'When campers ask deeper spiritual questions during huddles, encourage them and invite church priests / youth fathers to join the conversation.',
          },
        ],
        scenario:
          'Your team is about to play the championship football game, and the youth are excessively nervous and tense.',
        quiz: {
          question: 'What is the most uplifting devotional strategy before this high-stakes game?',
          options: [
            {
              text: 'Give a 45-minute lecture on Church history that delays the referee’s schedule.',
              isCorrect: false,
              explanation:
                'Pre-game devotionals must be concise, punchy, and on schedule.',
            },
            {
              text: 'Lead a 3-minute huddle on playing for God’s glory, lock arms in prayer for fun and safety, and take the court with joy.',
              isCorrect: true,
              explanation:
                'Brings focus, calms performance anxiety, and centers the game in Christ.',
            },
            {
              text: 'Promise cash prizes to whoever scores the winning goal.',
              isCorrect: false,
              explanation: 'Material rewards distort Christian sportsmanship.',
            },
          ],
        },
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function GrowthPathwaysTab({
  currentUser = null,
  currentUserProfile = null,
  isAdmin = false,
  isLeader: _isLeader = false,
  communityId = DEFAULT_COMMUNITY_ID,
}) {
  // Member identity
  const memberId =
    currentUserProfile?.id || currentUser?.uid || 'guest-servant';
  const memberName =
    currentUserProfile?.displayName ||
    currentUser?.displayName ||
    (currentUserProfile?.firstName
      ? `${currentUserProfile.firstName} ${currentUserProfile.lastName || ''}`.trim()
      : 'VBT Servant');

  // Local storage cache keys
  const storageModulesKey = `vbt_growth_modules_${communityId}_${memberId}`;
  const storageCertsKey = `vbt_growth_certs_${communityId}_${memberId}`;

  // Local additions to completed modules (array of module ID strings)
  const [localCompletedModules, setLocalCompletedModules] = useState(() => {
    try {
      const cached = localStorage.getItem(storageModulesKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return ['cs-101', 'sr-101'];
  });

  // Local additions to earned certifications (array of certification objects)
  const [localCertifications, setLocalCertifications] = useState(() => {
    try {
      const cached = localStorage.getItem(storageCertsKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return [
      {
        id: 'cert-init-1',
        courseId: 'child-safety',
        title: 'Certified Child Safety Guardian',
        issueDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        credentialId: 'VBT-CSG-2026-0941',
        certifiedBy: 'VBT Pastoral & Safety Council',
      },
    ];
  });

  // Derived completed modules combining profile & local state
  const completedModules = useMemo(() => {
    const fromProfile = currentUserProfile?.completedModules || [];
    const combined = new Set([...fromProfile, ...localCompletedModules]);
    return Array.from(combined);
  }, [currentUserProfile?.completedModules, localCompletedModules]);

  // Derived certifications combining profile & local state
  const certifications = useMemo(() => {
    const fromProfile = currentUserProfile?.certifications || [];
    const seen = new Set(
      fromProfile.map((c) => c.credentialId || c.id || c.title)
    );
    const extra = localCertifications.filter(
      (c) => !seen.has(c.credentialId || c.id || c.title)
    );
    return [...fromProfile, ...extra];
  }, [currentUserProfile?.certifications, localCertifications]);

  // Active filter tab for courses
  const [courseFilter, setCourseFilter] = useState('all');
  const [courseSearch, setCourseSearch] = useState('');

  // Selected level for roadmap detail modal or expanded view
  const [selectedPathwayLevel, setSelectedPathwayLevel] = useState(
    PATHWAY_LEVELS[1] // default focus on Servant
  );

  // Lesson reader modal state
  const [activeLesson, setActiveLesson] = useState(null); // { course, module, index }
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizError, setQuizError] = useState(false);

  // Certificate Viewer modal state
  const [viewingCertificate, setViewingCertificate] = useState(null);

  // Admin Award Tool modal state
  const [showAdminAwardModal, setShowAdminAwardModal] = useState(false);
  const [communityMembers, setCommunityMembers] = useState([]);
  const [selectedTargetMemberId, setSelectedTargetMemberId] = useState('');
  const [selectedCertType, setSelectedCertType] = useState(
    'Certified Child Safety Guardian'
  );
  const [customCertNotes, setCustomCertNotes] = useState('');
  const [adminAwardLoading, setAdminAwardLoading] = useState(false);
  const [adminAwardSuccess, setAdminAwardSuccess] = useState('');

  // Total modules count across all courses
  const totalModulesCount = useMemo(() => {
    return TRAINING_COURSES.reduce(
      (acc, course) => acc + course.modules.length,
      0
    );
  }, []);

  // Subscribe to community members for Admin Tool
  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = subscribeToMembers(communityId, (list) => {
      setCommunityMembers(list);
      if (list.length > 0 && !selectedTargetMemberId) {
        setSelectedTargetMemberId(list[0].id);
      }
    });
    return () => unsubscribe();
  }, [isAdmin, communityId, selectedTargetMemberId]);

  // Save changes to Firestore and localStorage
  const saveProgress = useCallback(
    async (newCompleted, newCerts) => {
      try {
        localStorage.setItem(storageModulesKey, JSON.stringify(newCompleted));
        localStorage.setItem(storageCertsKey, JSON.stringify(newCerts));
      } catch {
        // ignore
      }

      if (memberId && memberId !== 'guest-servant') {
        try {
          const memberRef = doc(
            db,
            `vbt_communities/${communityId}/members/${memberId}`
          );
          await setDoc(
            memberRef,
            {
              completedModules: newCompleted,
              certifications: newCerts,
              lastLearningActiveAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (err) {
          console.warn('[GrowthPathways] Firestore progress save warning:', err);
        }
      }
    },
    [communityId, memberId, storageCertsKey, storageModulesKey]
  );

  // Determine current user rank based on profile role or modules completed
  const currentRank = useMemo(() => {
    const role = currentUserProfile?.role || 'volunteer';
    if (role === 'admin' || role === 'coordinator') {
      return PATHWAY_LEVELS[3]; // Coordinator
    }
    if (
      role === 'team_leader' ||
      role === 'game_leader' ||
      role === 'service_leader' ||
      completedModules.length >= 8
    ) {
      return PATHWAY_LEVELS[2]; // Lead Servant
    }
    if (role === 'servant' || completedModules.length >= 4) {
      return PATHWAY_LEVELS[1]; // Servant
    }
    return PATHWAY_LEVELS[0]; // Volunteer
  }, [currentUserProfile?.role, completedModules.length]);

  // Overall modules completion percentage
  const progressPercent = useMemo(() => {
    if (totalModulesCount === 0) return 0;
    return Math.min(
      100,
      Math.round((completedModules.length / totalModulesCount) * 100)
    );
  }, [completedModules.length, totalModulesCount]);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    let result = TRAINING_COURSES;
    if (courseFilter !== 'all') {
      result = result.filter((c) =>
        c.category.toLowerCase().includes(courseFilter.toLowerCase())
      );
    }
    if (courseSearch.trim()) {
      const q = courseSearch.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          c.badgeName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [courseFilter, courseSearch]);

  // Open Lesson Reader
  const handleOpenLesson = (course, module, index) => {
    triggerHaptic('light');
    setActiveLesson({ course, module, index });
    setSelectedQuizAnswer(null);
    setQuizSubmitted(false);
    setQuizError(false);
  };

  // Close Lesson Reader
  const handleCloseLesson = () => {
    setActiveLesson(null);
    setSelectedQuizAnswer(null);
    setQuizSubmitted(false);
    setQuizError(false);
  };

  // Check quiz option
  const handleSelectQuizOption = (optionIndex) => {
    if (quizSubmitted) return;
    setSelectedQuizAnswer(optionIndex);
    setQuizError(false);
  };

  // Submit Quiz Checkpoint
  const handleSubmitQuiz = () => {
    if (selectedQuizAnswer === null || !activeLesson) return;
    const isCorrect =
      activeLesson.module.quiz.options[selectedQuizAnswer]?.isCorrect;

    if (isCorrect) {
      triggerHaptic('success');
      setQuizSubmitted(true);
      setQuizError(false);
    } else {
      triggerHaptic('error');
      setQuizError(true);
    }
  };

  // Mark Module as Completed
  const handleMarkModuleCompleted = async () => {
    if (!activeLesson) return;
    const moduleId = activeLesson.module.id;
    const course = activeLesson.course;

    triggerHaptic('success');

    let updatedModules = completedModules;
    if (!completedModules.includes(moduleId)) {
      updatedModules = [...completedModules, moduleId];
      setLocalCompletedModules(updatedModules);
    }

    // Check if entire course is now completed
    const courseModuleIds = course.modules.map((m) => m.id);
    const allCourseDone = courseModuleIds.every((id) =>
      updatedModules.includes(id)
    );

    let updatedCerts = [...certifications];
    const alreadyCertified = updatedCerts.some(
      (c) => c.courseId === course.id
    );

    if (allCourseDone && !alreadyCertified) {
      // Award certificate!
      const newCert = {
        id: `cert-${Date.now()}`,
        courseId: course.id,
        title: course.badgeName,
        issueDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        credentialId: `VBT-${course.id.toUpperCase()}-${Math.floor(
          1000 + Math.random() * 9000
        )}`,
        certifiedBy: 'VBT Pastoral & Sports Council',
      };
      updatedCerts = [newCert, ...updatedCerts];
      setLocalCertifications(updatedCerts);

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#fbbf24', '#34d399', '#a855f7'],
      });

      awardCertification(communityId, memberId, course.badgeName, 'VBT Academy').catch(() => {});
    }

    recordModuleCompletion(communityId, memberId, moduleId, 100, 'self').catch(() => {});
    await saveProgress(updatedModules, updatedCerts);

    // If there is a next module in this course, advance to it
    const nextIdx = activeLesson.index + 1;
    if (nextIdx < course.modules.length) {
      setActiveLesson({
        course,
        module: course.modules[nextIdx],
        index: nextIdx,
      });
      setSelectedQuizAnswer(null);
      setQuizSubmitted(false);
      setQuizError(false);
    } else {
      // All done in this course
      handleCloseLesson();
    }
  };

  // Admin Tool: Award Certification
  const handleAdminGrantCertificate = async (e) => {
    e.preventDefault();
    if (!selectedTargetMemberId) return;

    setAdminAwardLoading(true);
    setAdminAwardSuccess('');

    try {
      const targetMember = communityMembers.find(
        (m) => m.id === selectedTargetMemberId
      );
      const targetName =
        targetMember?.displayName ||
        targetMember?.firstName ||
        'Certified Servant';

      const newCert = {
        id: `cert-admin-${Date.now()}`,
        courseId: 'leadership-honor',
        title: selectedCertType,
        issueDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        credentialId: `VBT-HONOR-${Math.floor(1000 + Math.random() * 9000)}`,
        certifiedBy: `Certified by ${memberName} (Admin)`,
        notes: customCertNotes.trim() || 'Awarded for exemplary service.',
      };

      // If target is current user, update local state
      if (selectedTargetMemberId === memberId) {
        const nextCerts = [newCert, ...certifications];
        setLocalCertifications(nextCerts);
        await saveProgress(completedModules, nextCerts);
      } else {
        // Fetch and append to target member's doc
        const targetDocRef = doc(
          db,
          `vbt_communities/${communityId}/members/${selectedTargetMemberId}`
        );
        const snap = await getDoc(targetDocRef);
        const existingCerts = snap.exists()
          ? snap.data().certifications || []
          : [];
        await setDoc(
          targetDocRef,
          {
            certifications: [newCert, ...existingCerts],
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      awardCertification(
        communityId,
        selectedTargetMemberId,
        selectedCertType,
        memberName
      ).catch(() => {});

      triggerHaptic('success');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#f59e0b', '#fbbf24', '#ffffff'],
      });

      setAdminAwardSuccess(`Successfully awarded to ${targetName}!`);
      setCustomCertNotes('');
      setTimeout(() => {
        setAdminAwardSuccess('');
        setShowAdminAwardModal(false);
      }, 2000);
    } catch (err) {
      console.error('[GrowthPathways] Error awarding cert:', err);
    } finally {
      setAdminAwardLoading(false);
    }
  };

  // Circular progress ring calculation
  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference - (progressPercent / 100) * ringCircumference;

  return (
    <div
      style={{
        minHeight: '100%',
        paddingBottom: '5rem',
        color: '#f8fafc',
        fontFamily: 'var(--font-body, "Inter", sans-serif)',
      }}
    >
      {/* ───────────────────────────────────────────────────────── */}
      {/* Header Banner */}
      {/* ───────────────────────────────────────────────────────── */}
      <div
        style={{
          background:
            'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 58, 138, 0.45) 50%, rgba(15, 23, 42, 0.95) 100%)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
          padding: '24px 20px',
          marginBottom: '24px',
          borderRadius: '0 0 24px 24px',
          boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                color: '#38bdf8',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              <Sparkles size={14} />
              VBT Servant Leadership Academy
            </div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                margin: 0,
                fontFamily: 'var(--font-title, "Outfit", sans-serif)',
                background: 'linear-gradient(to right, #ffffff, #93c5fd)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Growth & Training Pathways
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: 'rgba(226, 232, 240, 0.75)',
                margin: '6px 0 0 0',
                maxWidth: '650px',
              }}
            >
              Equipping faithful hearts, sharpening court referees, and
              empowering next-generation shepherds for VBT camp ministry.
            </p>
          </div>

          {/* Quick Action Badges */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {isAdmin && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setShowAdminAwardModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  background:
                    'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.35) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
                  color: '#fbbf24',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)',
                }}
              >
                <Award size={16} />
                Award Certification
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 16px' }}>
        {/* ───────────────────────────────────────────────────────── */}
        {/* Section 1: Member Rank & Progress Card */}
        {/* ───────────────────────────────────────────────────────── */}
        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
            backdropFilter: 'blur(16px)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px',
            marginBottom: '32px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Ambient Glow */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${currentRank.color}33 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '24px',
            }}
          >
            {/* User Profile & Rank Info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
                flex: '1 1 300px',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, ${currentRank.color}22 0%, ${currentRank.color}44 100%)`,
                  border: `2px solid ${currentRank.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: currentRank.color,
                  boxShadow: `0 0 20px ${currentRank.color}40`,
                }}
              >
                <currentRank.icon size={32} />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-6px',
                    right: '-6px',
                    background: '#0f172a',
                    borderRadius: '9999px',
                    padding: '2px',
                    border: `1px solid ${currentRank.color}`,
                  }}
                >
                  <Star size={14} fill={currentRank.color} color={currentRank.color} />
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#ffffff',
                    }}
                  >
                    {memberName}
                  </h2>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: `${currentRank.color}20`,
                      color: currentRank.color,
                      border: `1px solid ${currentRank.color}40`,
                      textTransform: 'uppercase',
                    }}
                  >
                    {currentRank.badgeLabel}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'rgba(226, 232, 240, 0.7)',
                  }}
                >
                  {currentRank.tagline} • Next Target:{' '}
                  <strong style={{ color: '#ffffff' }}>
                    {currentRank.nextRank}
                  </strong>
                </p>
              </div>
            </div>

            {/* Circular Progress Meter */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '94px',
                  height: '94px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="94" height="94" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="47"
                    cy="47"
                    r={ringRadius}
                    fill="transparent"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="47"
                    cy="47"
                    r={ringRadius}
                    fill="transparent"
                    stroke="url(#progressGradient)"
                    strokeWidth="8"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    style={{
                      transition: 'stroke-dashoffset 0.8s ease-in-out',
                    }}
                  />
                  <defs>
                    <linearGradient
                      id="progressGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: '#ffffff',
                      lineHeight: 1,
                    }}
                  >
                    {progressPercent}%
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: 'rgba(226, 232, 240, 0.6)',
                      marginTop: '2px',
                    }}
                  >
                    Mastery
                  </div>
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'rgba(226, 232, 240, 0.8)',
                    marginBottom: '4px',
                  }}
                >
                  <strong>{completedModules.length}</strong> of{' '}
                  <strong>{totalModulesCount}</strong> Modules Completed
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={14} />
                  {certifications.length} Credentials Earned
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────── */}
        {/* Section 2: Servant Pathway Progression Roadmap */}
        {/* ───────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '40px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Compass size={22} color="#38bdf8" />
              <h2
                style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-title, "Outfit", sans-serif)',
                }}
              >
                Servant Leadership Progression Roadmap
              </h2>
            </div>
            <span
              style={{
                fontSize: '12px',
                color: 'rgba(226, 232, 240, 0.6)',
              }}
            >
              Step-by-step spiritual & operational ladder
            </span>
          </div>

          {/* 4-Step Interactive Nodes */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              position: 'relative',
            }}
          >
            {PATHWAY_LEVELS.map((step) => {
              const isCurrent = currentRank.level === step.level;
              const isUnlocked = currentRank.level >= step.level;
              const isSelected = selectedPathwayLevel.level === step.level;
              const StepIcon = step.icon;

              return (
                <div
                  key={step.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedPathwayLevel(step);
                  }}
                  style={{
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)'
                      : 'rgba(30, 41, 59, 0.5)',
                    backdropFilter: 'blur(12px)',
                    border: isSelected
                      ? `2px solid ${step.color}`
                      : isCurrent
                      ? `2px solid ${step.color}88`
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    position: 'relative',
                    boxShadow: isSelected
                      ? `0 10px 25px -5px ${step.color}40`
                      : 'none',
                  }}
                >
                  {/* Status Indicator */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: `${step.color}20`,
                        border: `1px solid ${step.color}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: step.color,
                      }}
                    >
                      <StepIcon size={18} />
                    </div>

                    {isCurrent ? (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          background: `${step.color}30`,
                          color: step.color,
                          border: `1px solid ${step.color}60`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Sparkles size={11} /> Current
                      </span>
                    ) : isUnlocked ? (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          background: 'rgba(52, 211, 153, 0.15)',
                          color: '#34d399',
                          border: '1px solid rgba(52, 211, 153, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Check size={12} /> Achieved
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'rgba(226, 232, 240, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Lock size={12} /> Level {step.level}
                      </span>
                    )}
                  </div>

                  <h3
                    style={{
                      margin: '0 0 4px 0',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: isUnlocked ? '#ffffff' : 'rgba(226, 232, 240, 0.8)',
                    }}
                  >
                    {step.title}
                  </h3>
                  <div
                    style={{
                      fontSize: '12px',
                      color: step.color,
                      fontWeight: 600,
                      marginBottom: '10px',
                    }}
                  >
                    {step.tagline}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      color: 'rgba(226, 232, 240, 0.65)',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Focused Pathway Level Detail Panel */}
          {selectedPathwayLevel && (
            <div
              style={{
                marginTop: '16px',
                background:
                  'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                border: `1px solid ${selectedPathwayLevel.color}40`,
                padding: '24px',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      padding: '10px',
                      borderRadius: '12px',
                      background: `${selectedPathwayLevel.color}20`,
                      color: selectedPathwayLevel.color,
                      border: `1px solid ${selectedPathwayLevel.color}50`,
                    }}
                  >
                    <selectedPathwayLevel.icon size={24} />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: 700,
                        color: '#ffffff',
                      }}
                    >
                      {selectedPathwayLevel.badgeLabel}
                    </h3>
                    <div
                      style={{
                        fontSize: '13px',
                        color: selectedPathwayLevel.color,
                        fontWeight: 600,
                      }}
                    >
                      {selectedPathwayLevel.tagline}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '12px',
                    color: 'rgba(226, 232, 240, 0.8)',
                  }}
                >
                  Requires:{' '}
                  <strong style={{ color: selectedPathwayLevel.color }}>
                    {selectedPathwayLevel.requiredModulesCount} Completed Modules
                  </strong>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '20px',
                }}
              >
                {/* Core Responsibilities */}
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <h4
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#93c5fd',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle2 size={14} /> Ministry Responsibilities
                  </h4>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '18px',
                      fontSize: '13px',
                      color: 'rgba(226, 232, 240, 0.85)',
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedPathwayLevel.responsibilities.map((r, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Level Perks & Recognition */}
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <h4
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#fbbf24',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Award size={14} /> Leadership Credentials & Perks
                  </h4>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '18px',
                      fontSize: '13px',
                      color: 'rgba(226, 232, 240, 0.85)',
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedPathwayLevel.perks.map((p, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ───────────────────────────────────────────────────────── */}
        {/* Section 3: Earned Certifications Shelf */}
        {/* ───────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '40px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Award size={22} color="#fbbf24" />
              <h2
                style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-title, "Outfit", sans-serif)',
                }}
              >
                Earned Credentials & Certifications
              </h2>
            </div>
            <span
              style={{
                fontSize: '12px',
                color: 'rgba(226, 232, 240, 0.6)',
              }}
            >
              Verified credentials official verification
            </span>
          </div>

          {certifications.length === 0 ? (
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.4)',
                borderRadius: '16px',
                padding: '32px',
                textAlign: 'center',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
              }}
            >
              <Award size={40} color="rgba(226, 232, 240, 0.3)" />
              <p
                style={{
                  margin: '12px 0 6px 0',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#ffffff',
                }}
              >
                No certifications earned yet
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: 'rgba(226, 232, 240, 0.6)',
                }}
              >
                Complete all modules in Child Safety Essentials or Sports Referee Rules
                to unlock your first verified VBT certificate!
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px',
              }}
            >
              {certifications.map((cert) => (
                <div
                  key={cert.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setViewingCertificate(cert);
                  }}
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
                    borderRadius: '16px',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Gold Sheen Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background:
                          'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.35) 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fbbf24',
                      }}
                    >
                      <Award size={22} />
                    </div>
                    <div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '15px',
                          fontWeight: 700,
                          color: '#ffffff',
                        }}
                      >
                        {cert.title}
                      </h4>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#fbbf24',
                          fontWeight: 600,
                        }}
                      >
                        {cert.credentialId}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: '12px',
                      color: 'rgba(226, 232, 240, 0.7)',
                      marginBottom: '14px',
                    }}
                  >
                    Issued on {cert.issueDate} by{' '}
                    <strong>{cert.certifiedBy || 'VBT Council'}</strong>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      paddingTop: '12px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#34d399',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={13} /> Official Credential
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#38bdf8',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      View Certificate <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ───────────────────────────────────────────────────────── */}
        {/* Section 4: Interactive Training Course Catalog */}
        {/* ───────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '40px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={22} color="#38bdf8" />
              <h2
                style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-title, "Outfit", sans-serif)',
                }}
              >
                VBT Training Courses
              </h2>
            </div>

            {/* Search Input */}
            <div
              style={{
                position: 'relative',
                minWidth: '220px',
              }}
            >
              <Search
                size={16}
                color="rgba(226, 232, 240, 0.5)"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
              <input
                type="text"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                placeholder="Search courses..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '10px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '12px',
              marginBottom: '16px',
            }}
          >
            {[
              { id: 'all', label: 'All Courses' },
              { id: 'safety', label: 'Safety & Protection' },
              { id: 'gameplay', label: 'Sports & Officiating' },
              { id: 'emergency', label: 'Emergency Care' },
              { id: 'faith', label: 'Faith & Leadership' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  triggerHaptic('light');
                  setCourseFilter(f.id);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background:
                    courseFilter === f.id
                      ? 'rgba(56, 189, 248, 0.2)'
                      : 'rgba(30, 41, 59, 0.5)',
                  border:
                    courseFilter === f.id
                      ? '1px solid rgba(56, 189, 248, 0.5)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                  color: courseFilter === f.id ? '#38bdf8' : 'rgba(226, 232, 240, 0.75)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Courses Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {filteredCourses.map((course) => {
              const CourseIcon = course.icon;
              const courseModulesCompleted = course.modules.filter((m) =>
                completedModules.includes(m.id)
              ).length;
              const isCourseFinished =
                courseModulesCompleted === course.modules.length;
              const isCourseInProgress =
                courseModulesCompleted > 0 && !isCourseFinished;

              return (
                <div
                  key={course.id}
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '18px',
                    border: isCourseFinished
                      ? '1px solid rgba(52, 211, 153, 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '24px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* Top Row: Category & Duration */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '14px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '6px',
                          background: `${course.accentColor}18`,
                          color: course.accentColor,
                          border: `1px solid ${course.accentColor}35`,
                        }}
                      >
                        {course.category}
                      </span>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          color: 'rgba(226, 232, 240, 0.6)',
                        }}
                      >
                        <Clock size={13} />
                        {course.estimatedMinutes} mins
                      </div>
                    </div>

                    {/* Course Title & Icon */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        marginBottom: '10px',
                      }}
                    >
                      <div
                        style={{
                          padding: '10px',
                          borderRadius: '12px',
                          background: `${course.accentColor}20`,
                          color: course.accentColor,
                          border: `1px solid ${course.accentColor}40`,
                        }}
                      >
                        <CourseIcon size={22} />
                      </div>
                      <div>
                        <h3
                          style={{
                            margin: '0 0 4px 0',
                            fontSize: '17px',
                            fontWeight: 700,
                            color: '#ffffff',
                          }}
                        >
                          {course.title}
                        </h3>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '13px',
                            color: 'rgba(226, 232, 240, 0.7)',
                            lineHeight: 1.4,
                          }}
                        >
                          {course.summary}
                        </p>
                      </div>
                    </div>

                    {/* Certificate reward note */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: '#fbbf24',
                        background: 'rgba(245, 158, 11, 0.1)',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        marginTop: '12px',
                        marginBottom: '16px',
                      }}
                    >
                      <Award size={14} />
                      Unlocks: <strong>{course.badgeName}</strong>
                    </div>

                    {/* Module Progress Bar */}
                    <div style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          color: 'rgba(226, 232, 240, 0.6)',
                          marginBottom: '6px',
                        }}
                      >
                        <span>Course Progress</span>
                        <span>
                          {courseModulesCompleted} of {course.modules.length} Modules
                        </span>
                      </div>
                      <div
                        style={{
                          height: '6px',
                          borderRadius: '9999px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${
                              (courseModulesCompleted / course.modules.length) * 100
                            }%`,
                            background: isCourseFinished
                              ? '#34d399'
                              : course.accentColor,
                            borderRadius: '9999px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>

                    {/* Modules Checklist Accordion / Items */}
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {course.modules.map((mod, modIdx) => {
                        const isModDone = completedModules.includes(mod.id);
                        return (
                          <div
                            key={mod.id}
                            onClick={() => handleOpenLesson(course, mod, modIdx)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: isModDone
                                ? 'rgba(52, 211, 153, 0.08)'
                                : 'rgba(255, 255, 255, 0.03)',
                              border: isModDone
                                ? '1px solid rgba(52, 211, 153, 0.2)'
                                : '1px solid rgba(255, 255, 255, 0.05)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              {isModDone ? (
                                <CheckCircle2 size={16} color="#34d399" />
                              ) : (
                                <div
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    border: '1.5px solid rgba(226, 232, 240, 0.3)',
                                  }}
                                />
                              )}
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: isModDone ? 600 : 500,
                                  color: isModDone
                                    ? '#ffffff'
                                    : 'rgba(226, 232, 240, 0.8)',
                                }}
                              >
                                {mod.title}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: '11px',
                                color: 'rgba(226, 232, 240, 0.5)',
                              }}
                            >
                              {mod.duration}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div style={{ marginTop: '20px' }}>
                    <button
                      onClick={() => {
                        // find first uncompleted module or open module 0
                        const firstUncompleted = course.modules.findIndex(
                          (m) => !completedModules.includes(m.id)
                        );
                        const targetIdx =
                          firstUncompleted >= 0 ? firstUncompleted : 0;
                        handleOpenLesson(
                          course,
                          course.modules[targetIdx],
                          targetIdx
                        );
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        background: isCourseFinished
                          ? 'rgba(52, 211, 153, 0.15)'
                          : `linear-gradient(135deg, ${course.accentColor}cc 0%, ${course.accentColor} 100%)`,
                        border: isCourseFinished
                          ? '1px solid rgba(52, 211, 153, 0.4)'
                          : 'none',
                        color: isCourseFinished ? '#34d399' : '#ffffff',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isCourseFinished ? (
                        <>
                          <CheckCircle2 size={16} /> Review Course Material
                        </>
                      ) : isCourseInProgress ? (
                        <>
                          <Play size={16} /> Continue Learning
                        </>
                      ) : (
                        <>
                          <Play size={16} /> Start Course
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* Modal 1: Lesson Reader & Knowledge Checkpoint */}
      {/* ───────────────────────────────────────────────────────── */}
      {activeLesson && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '90vh',
              background: '#0f172a',
              borderRadius: '20px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(30, 41, 59, 0.5)',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: activeLesson.course.accentColor,
                    letterSpacing: '0.05em',
                    marginBottom: '4px',
                  }}
                >
                  {activeLesson.course.title} • Module {activeLesson.index + 1} of{' '}
                  {activeLesson.course.modules.length}
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#ffffff',
                  }}
                >
                  {activeLesson.module.title}
                </h3>
              </div>

              <button
                onClick={handleCloseLesson}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px',
                  color: 'rgba(226, 232, 240, 0.7)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Scrollable Content */}
            <div
              style={{
                padding: '24px',
                overflowY: 'auto',
                flex: 1,
              }}
            >
              {/* Overview Box */}
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  padding: '16px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <FileText size={20} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '13px', color: '#e0f2fe', lineHeight: 1.5 }}>
                  {activeLesson.module.overview}
                </div>
              </div>

              {/* Core Content Sections */}
              {activeLesson.module.contentSections.map((sec, idx) => (
                <div key={idx} style={{ marginBottom: '20px' }}>
                  <h4
                    style={{
                      margin: '0 0 8px 0',
                      fontSize: '15px',
                      fontWeight: 700,
                      color: '#ffffff',
                    }}
                  >
                    {sec.heading}
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      color: 'rgba(226, 232, 240, 0.85)',
                      lineHeight: 1.6,
                    }}
                  >
                    {sec.body}
                  </p>
                </div>
              ))}

              {/* Real Camp Scenario */}
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  borderRadius: '12px',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  padding: '16px',
                  marginBottom: '28px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#fbbf24',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}
                >
                  <AlertCircle size={14} /> Real Camp Scenario
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: '#fef3c7',
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                  }}
                >
                  &ldquo;{activeLesson.module.scenario}&rdquo;
                </div>
              </div>

              {/* Knowledge Checkpoint Question */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.7)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#93c5fd',
                    textTransform: 'uppercase',
                    marginBottom: '10px',
                  }}
                >
                  <HelpCircle size={15} /> Knowledge Checkpoint
                </div>

                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#ffffff',
                    marginBottom: '14px',
                  }}
                >
                  {activeLesson.module.quiz.question}
                </div>

                <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
                  {activeLesson.module.quiz.options.map((opt, optIdx) => {
                    const isSelected = selectedQuizAnswer === optIdx;
                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleSelectQuizOption(optIdx)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: isSelected
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(15, 23, 42, 0.6)',
                          border: isSelected
                            ? '1px solid #3b82f6'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          cursor: quizSubmitted ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          fontSize: '13px',
                          color: isSelected ? '#ffffff' : 'rgba(226, 232, 240, 0.85)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: isSelected
                              ? '5px solid #3b82f6'
                              : '1.5px solid rgba(226, 232, 240, 0.3)',
                            background: '#0f172a',
                            flexShrink: 0,
                          }}
                        />
                        <span>{opt.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Feedback message */}
                {quizError && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#fca5a5',
                      fontSize: '12px',
                      marginBottom: '12px',
                    }}
                  >
                    Not quite. Review the principles above and choose the safest,
                    most Christlike option!
                  </div>
                )}

                {quizSubmitted && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(52, 211, 153, 0.15)',
                      border: '1px solid rgba(52, 211, 153, 0.3)',
                      color: '#6ee7b7',
                      fontSize: '12px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <CheckCircle2 size={16} />
                    {
                      activeLesson.module.quiz.options[selectedQuizAnswer]
                        ?.explanation
                    }
                  </div>
                )}

                {!quizSubmitted && (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={selectedQuizAnswer === null}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      background:
                        selectedQuizAnswer !== null
                          ? '#3b82f6'
                          : 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor:
                        selectedQuizAnswer !== null ? 'pointer' : 'not-allowed',
                      opacity: selectedQuizAnswer !== null ? 1 : 0.5,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Verify Answer
                  </button>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(30, 41, 59, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(226, 232, 240, 0.6)',
                }}
              >
                Module status:{' '}
                {completedModules.includes(activeLesson.module.id) ? (
                  <strong style={{ color: '#34d399' }}>Completed</strong>
                ) : (
                  <strong style={{ color: '#38bdf8' }}>In Progress</strong>
                )}
              </div>

              <button
                onClick={handleMarkModuleCompleted}
                disabled={!quizSubmitted && !completedModules.includes(activeLesson.module.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  background:
                    quizSubmitted || completedModules.includes(activeLesson.module.id)
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor:
                    quizSubmitted || completedModules.includes(activeLesson.module.id)
                      ? 'pointer'
                      : 'not-allowed',
                  opacity:
                    quizSubmitted || completedModules.includes(activeLesson.module.id)
                      ? 1
                      : 0.5,
                  boxShadow:
                    quizSubmitted || completedModules.includes(activeLesson.module.id)
                      ? '0 4px 14px rgba(16, 185, 129, 0.3)'
                      : 'none',
                }}
              >
                <CheckCircle2 size={16} />
                {activeLesson.index + 1 === activeLesson.course.modules.length
                  ? 'Complete Module & Finish Course'
                  : 'Complete & Next Module'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* Modal 2: Official Certificate of Achievement Viewer */}
      {/* ───────────────────────────────────────────────────────── */}
      {viewingCertificate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '640px',
              background:
                'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e1b4b 100%)',
              borderRadius: '24px',
              border: '2px solid rgba(245, 158, 11, 0.5)',
              boxShadow: '0 0 50px rgba(245, 158, 11, 0.25)',
              padding: '36px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setViewingCertificate(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>

            {/* Emblem */}
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, rgba(217, 119, 6, 0.1) 70%)',
                border: '2px solid #fbbf24',
                margin: '0 auto 16px auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
                boxShadow: '0 0 24px rgba(245, 158, 11, 0.4)',
              }}
            >
              <Award size={36} />
            </div>

            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#fbbf24',
                marginBottom: '8px',
              }}
            >
              VBT Sports Camp • Ministry Leadership Council
            </div>

            <h2
              style={{
                margin: '0 0 12px 0',
                fontSize: '26px',
                fontWeight: 800,
                color: '#ffffff',
                fontFamily: 'var(--font-title, "Outfit", sans-serif)',
              }}
            >
              Certificate of Accomplishment
            </h2>

            <div
              style={{
                fontSize: '13px',
                color: 'rgba(226, 232, 240, 0.7)',
                marginBottom: '16px',
              }}
            >
              This official credential certifies that
            </div>

            <div
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#60a5fa',
                marginBottom: '16px',
                fontFamily: 'var(--font-title, "Outfit", sans-serif)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '12px',
                maxWidth: '400px',
                margin: '0 auto 16px auto',
              }}
            >
              {memberName}
            </div>

            <div
              style={{
                fontSize: '13px',
                color: 'rgba(226, 232, 240, 0.8)',
                marginBottom: '8px',
              }}
            >
              has successfully completed all required training modules and demonstrated
              excellence in:
            </div>

            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#fbbf24',
                marginBottom: '24px',
              }}
            >
              {viewingCertificate.title}
            </div>

            {/* Credential Details Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                textAlign: 'left',
                fontSize: '12px',
                marginBottom: '24px',
              }}
            >
              <div>
                <span style={{ color: 'rgba(226, 232, 240, 0.5)' }}>
                  Credential ID:
                </span>
                <div style={{ color: '#ffffff', fontWeight: 600 }}>
                  {viewingCertificate.credentialId}
                </div>
              </div>
              <div>
                <span style={{ color: 'rgba(226, 232, 240, 0.5)' }}>
                  Issue Date:
                </span>
                <div style={{ color: '#ffffff', fontWeight: 600 }}>
                  {viewingCertificate.issueDate}
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'rgba(226, 232, 240, 0.5)' }}>
                  Authority:
                </span>
                <div style={{ color: '#34d399', fontWeight: 600 }}>
                  {viewingCertificate.certifiedBy || 'VBT Council'}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              <button
                onClick={() => {
                  triggerHaptic('light');
                  window.print();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Download size={15} /> Save / Print
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  if (navigator.share) {
                    navigator
                      .share({
                        title: viewingCertificate.title,
                        text: `I just earned my ${viewingCertificate.title} certificate with VBT Sports Camp!`,
                        url: window.location.href,
                      })
                      .catch(() => {});
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: '#3b82f6',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Share2 size={15} /> Share Credential
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* Modal 3: Admin "Award Certification" Quick Tool */}
      {/* ───────────────────────────────────────────────────────── */}
      {showAdminAwardModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#0f172a',
              borderRadius: '20px',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
              padding: '28px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '10px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#fbbf24',
                  }}
                >
                  <Award size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>
                    Award Servant Certification
                  </h3>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'rgba(226, 232, 240, 0.6)',
                    }}
                  >
                    Admin Leadership Accreditation Tool
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowAdminAwardModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  color: 'rgba(226, 232, 240, 0.7)',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {adminAwardSuccess && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(52, 211, 153, 0.15)',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  color: '#6ee7b7',
                  fontSize: '13px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={16} />
                {adminAwardSuccess}
              </div>
            )}

            <form onSubmit={handleAdminGrantCertificate}>
              {/* Select Community Member */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'rgba(226, 232, 240, 0.8)',
                    marginBottom: '6px',
                  }}
                >
                  Select Community Servant / Member
                </label>
                <select
                  value={selectedTargetMemberId}
                  onChange={(e) => setSelectedTargetMemberId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  {communityMembers.map((m) => (
                    <option key={m.id} value={m.id} style={{ background: '#0f172a' }}>
                      {m.displayName || `${m.firstName} ${m.lastName || ''}`.trim()}{' '}
                      ({m.role || 'member'})
                    </option>
                  ))}
                  {communityMembers.length === 0 && (
                    <option value={memberId} style={{ background: '#0f172a' }}>
                      {memberName} (Self)
                    </option>
                  )}
                </select>
              </div>

              {/* Select Certification Title */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'rgba(226, 232, 240, 0.8)',
                    marginBottom: '6px',
                  }}
                >
                  Certification / Award Title
                </label>
                <select
                  value={selectedCertType}
                  onChange={(e) => setSelectedCertType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  <option value="Certified Child Safety Guardian" style={{ background: '#0f172a' }}>
                    Certified Child Safety Guardian
                  </option>
                  <option value="VBT Certified Sports Referee" style={{ background: '#0f172a' }}>
                    VBT Certified Sports Referee
                  </option>
                  <option value="Camp First Responder" style={{ background: '#0f172a' }}>
                    Camp First Responder
                  </option>
                  <option value="VBT Servant Leader Foundation" style={{ background: '#0f172a' }}>
                    VBT Servant Leader Foundation
                  </option>
                  <option value="Distinguished Servant of the Year" style={{ background: '#0f172a' }}>
                    Distinguished Servant of the Year
                  </option>
                  <option value="Master Tournament Referee" style={{ background: '#0f172a' }}>
                    Master Tournament Referee
                  </option>
                  <option value="Camp Logistics Commander" style={{ background: '#0f172a' }}>
                    Camp Logistics Commander
                  </option>
                </select>
              </div>

              {/* Commendation / Notes */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'rgba(226, 232, 240, 0.8)',
                    marginBottom: '6px',
                  }}
                >
                  Commendation Notes (Optional)
                </label>
                <textarea
                  value={customCertNotes}
                  onChange={(e) => setCustomCertNotes(e.target.value)}
                  placeholder="e.g. Awarded for exceptional composure during the tournament finals..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              {/* Submit Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAdminAwardModal(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    color: 'rgba(226, 232, 240, 0.8)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminAwardLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    background:
                      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: adminAwardLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
                  }}
                >
                  <UserCheck size={16} />
                  {adminAwardLoading ? 'Awarding...' : 'Grant Certification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
