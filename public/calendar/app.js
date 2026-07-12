const accent = '#e98f95';

let activeDay = 16;
let activeView = 'timeline';
let selectedCalendarDay = 16;
let activeMonth = 9;
let activeYear = 2025;
let pickerYear = activeYear;
let editingId = null;
let remindersEnabled = true;
let plannerMode = 'manual';
let availabilityMode = 'manual';
let voiceListening = false;
let aiPromptExpanded = false;
let inboxLaneOpen = true;
let selectedPacketIndex = 0;
let selectedPacketDetailIndex = null;
let selectedQuickActions = ['practice', 'gamePrep', 'teamFunction'];
let selectedSettingsFeatureId = null;
let selectedPlayerIndex = null;
let calendarRole = 'player';
let calendarPlayers = [];
let selectedCalendarPlayerId = null;
let aiDraft = 'Plan next week: defensive practice Tuesday, film Wednesday, scout Lincoln Prep, game Friday, and confirm player availability.';
let quickActionDraft = null;
let suiteConnectionIds = [
  'practiceBuilder',
  'drillGenerator',
  'developmentPlan',
  'playerMeetings',
  'evaluations',
  'filmVideo',
  'playbook',
  'aiScouting',
  'playEditor',
];

const tabs = [
  { id: 'timeline', label: 'Today', icon: 'timeline' },
  { id: 'inbox', label: 'AI', icon: 'mic' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'focus', label: 'Availability', icon: 'users' },
  { id: 'packets', label: 'Packets', icon: 'print' },
];

// Real events replace this at boot (see bootCalendarData): SuiteCalendarData
// fetches GET /api/suite/calendar/data and fills `tasks` with the team's actual
// schedule. Starts EMPTY so a signed-out / offline load falls back to a real
// empty state — never the old hardcoded fake October-2025 seed.
const tasks = [];

const inbox = [
  { id: crypto.randomUUID(), title: 'Add parent meeting after practice', duration: 20, icon: 'users', capture: 'Team function' },
  { id: crypto.randomUUID(), title: 'Move shell defense install to Tuesday', duration: 10, icon: 'activity', capture: 'Practice adjustment' },
  { id: crypto.randomUUID(), title: 'Remind trainer about ankle status', duration: 10, icon: 'bell', capture: 'Availability' },
  { id: crypto.randomUUID(), title: 'Attach scout notes to Lincoln Prep game', duration: 25, icon: 'file', capture: 'Scouting' },
  { id: crypto.randomUUID(), title: 'Print weekly itinerary for staff', duration: 15, icon: 'print', capture: 'Packet' },
];

const actionOptions = [
  { id: 'practice', title: 'Add Practice', icon: 'activity', time: '15:30', duration: 90, repeat: 'Practice Builder ready', type: 'Practice' },
  { id: 'gamePrep', title: 'Add Game Prep', icon: 'video', time: '17:00', duration: 45, repeat: 'Scout packet ready', type: 'Scouting' },
  { id: 'teamFunction', title: 'Team Function', icon: 'users', time: '18:30', duration: 60, repeat: 'Team calendar', type: 'Team Function' },
  { id: 'availability', title: 'Availability Check', icon: 'bell', time: '14:45', duration: 15, repeat: 'Roster exceptions', type: 'Availability' },
  { id: 'staffCall', title: 'Staff Call', icon: 'phone', time: '19:00', duration: 30, repeat: 'Assistant coaches', type: 'Staff' },
  { id: 'packet', title: 'Print Packet', icon: 'print', time: '20:30', duration: 20, repeat: 'Printable packet ready', type: 'Packet' },
  { id: 'film', title: 'Film Session', icon: 'video', time: '16:15', duration: 45, repeat: 'Film room linked', type: 'Film' },
];

const focusBlocks = [
  { title: 'Marcus Johnson limited', detail: 'Ankle status. Keep him out of live contact until trainer clears him.', enabled: true },
  { title: 'Two players late arrival', detail: 'Academic lab ends at 3:45. Adjust warmup groups automatically.', enabled: true },
  { title: 'Scout team short one guard', detail: 'AI can adjust Friday prep groups if availability stays low.', enabled: false },
];

const availabilityPlayers = [
  { name: 'Marcus Johnson', role: 'Guard', status: 'limited', lastReply: 'Ankle status. Limited contact until trainer clears him.', attendance: 82 },
  { name: 'Elijah Carter', role: 'Forward', status: 'yes', lastReply: 'Confirmed for practice and film.', attendance: 94 },
  { name: 'Noah Williams', role: 'Guard', status: 'late', lastReply: 'Academic lab ends at 3:45. Arriving late.', attendance: 76 },
  { name: 'Jaylen Brooks', role: 'Wing', status: 'pending', lastReply: 'No reply yet. Needs reminder before practice.', attendance: 68 },
  { name: 'Andre Miles', role: 'Center', status: 'out', lastReply: 'Family event. Out for today.', attendance: 71 },
  { name: 'Tyrese Hill', role: 'Guard', status: 'yes', lastReply: 'Confirmed for game prep.', attendance: 88 },
];

const settingsRows = [
  { title: 'Daily coach itinerary', detail: 'Print today with schedule, practice, scouting, availability, staff tasks, and notes.', icon: 'print' },
  { title: 'Weekly team packet', detail: 'Practice schedule, games, film, travel, team functions, and staff responsibilities.', icon: 'calendar' },
  { title: 'Game-day packet', detail: 'Opponent scout, arrival timeline, roster, matchups, special situations, and checklist.', icon: 'file' },
  { title: 'Player handout', detail: 'Player-safe version with arrival times, expectations, location, and what to bring.', icon: 'users' },
];

const settingsSections = [
  {
    title: 'Features',
    items: [
      {
        id: 'suiteConnections',
        title: 'Suite Connections',
        subtitle: 'Choose what Coach AI can schedule',
        icon: 'layers',
        tone: 'blue',
        detail: 'Control which Basketball Coach AI Suite tools can feed the calendar when AI mode is on.',
        bullets: ['Practice, drills, plays, film, scouting, players, and evaluations can create calendar items', 'Coaches can turn any source off', 'AI only schedules from enabled sources'],
      },
      {
        id: 'quickActions',
        title: 'Quick Actions',
        subtitle: 'Choose the three Today buttons',
        icon: 'sparkles',
        tone: 'rose',
        detail: 'Pick the three actions that stay at the top of Today so the coach can add the most common items fast.',
        bullets: ['Exactly three buttons can be active', 'New choices update Today immediately', 'Actions create real calendar timeline events'],
      },
      {
        id: 'replan',
        title: 'Replan',
        subtitle: 'Set Up',
        icon: 'arrow-right',
        tone: 'orange',
        detail: 'Move practices, film, meetings, or team events without rebuilding the whole week.',
        bullets: ['Shift a day forward or backward', 'Keep task order and spacing clean', 'Send staff a change summary'],
      },
      {
        id: 'energy',
        title: 'Energy Monitor',
        subtitle: 'Set Up',
        icon: 'flame',
        tone: 'green',
        detail: 'Track team load so a coach can balance hard practices, recovery days, games, and travel.',
        bullets: ['Flag stacked high-intensity days', 'Suggest recovery or film blocks', 'Connect to player availability'],
      },
      {
        id: 'seasons',
        title: 'Cycle Seasons',
        subtitle: 'Set Up',
        icon: 'cycle',
        tone: 'magenta',
        detail: 'Rotate the calendar by preseason, in-season, tournament weeks, playoffs, and offseason development.',
        bullets: ['Save different season templates', 'Apply practice cadence by phase', 'Keep recurring staff workflows'],
      },
    ],
  },
  {
    title: 'Integrations',
    items: [
      {
        id: 'awake',
        title: 'Awake',
        subtitle: 'Set Up',
        icon: 'alarm',
        tone: 'orange',
        detail: 'Morning coach briefings that surface today’s practices, availability issues, and staff tasks.',
        bullets: ['Daily agenda brief', 'Urgent reminders first', 'Optional staff summary'],
      },
      {
        id: 'calendars',
        title: 'Calendars',
        subtitle: 'Set Up',
        icon: 'calendar',
        tone: 'magenta',
        detail: 'Choose which team calendars receive practices, games, scouting blocks, functions, and reminders.',
        bullets: ['Team schedule calendar', 'Staff-only planning calendar', 'Player-facing calendar'],
      },
      {
        id: 'reminders',
        title: 'Reminders',
        subtitle: 'Set Up',
        icon: 'list',
        tone: 'green',
        detail: 'Control reminders for practices, game prep, film, availability checks, packets, and team functions.',
        bullets: ['Coach reminders', 'Staff reminders', 'Player availability nudges'],
      },
      {
        id: 'oneSec',
        title: 'one sec',
        subtitle: 'Set Up',
        icon: 'timer',
        tone: 'purple',
        detail: 'Pause before schedule changes so the coach can confirm what will move, notify, or print.',
        bullets: ['Confirm before bulk changes', 'Review affected practices', 'Prevent accidental calendar edits'],
      },
      {
        id: 'widgets',
        title: 'Widgets',
        subtitle: 'Set Up',
        icon: 'widgets',
        tone: 'orange',
        detail: 'Fast glance cards for today, next practice, availability exceptions, and print-ready packets.',
        bullets: ['Today card', 'Next practice card', 'Availability alert card'],
      },
      {
        id: 'shortcuts',
        title: 'Siri & Shortcuts',
        subtitle: 'Set Up',
        icon: 'layers',
        tone: 'orange',
        detail: 'Voice shortcuts for common coaching actions, adapted for the web app’s Coach AI commands.',
        bullets: ['Add practice by voice', 'Move timeline events', 'Build and print weekly packets'],
      },
    ],
  },
  {
    title: 'Support',
    items: [
      {
        id: 'help',
        title: 'Help & Feedback',
        subtitle: 'Set Up',
        icon: 'help',
        tone: 'blue',
        detail: 'Coach-friendly help, feedback, and issue reporting for planning, printing, AI, and calendar work.',
        bullets: ['Send feedback', 'Report a broken workflow', 'Request a coaching template'],
      },
      {
        id: 'whatsNew',
        title: "What's New",
        subtitle: 'Release notes',
        icon: 'file',
        tone: 'blue',
        detail: 'Track new coaching features, printable updates, AI planning changes, and calendar improvements.',
        bullets: ['Latest feature updates', 'Print and PDF improvements', 'Calendar workflow changes'],
      },
    ],
  },
];

const suiteConnections = [
  {
    id: 'practiceBuilder',
    title: 'Practice Builder',
    detail: 'Practice plans, bulk packages, and printable practice booklets.',
    calendarTitle: 'Build varsity practice plan',
    repeat: 'Practice Builder linked',
    type: 'Practice',
    icon: 'activity',
    time: '15:30',
    duration: 105,
    dayOffset: 0,
  },
  {
    id: 'drillGenerator',
    title: 'Drill Generator',
    detail: 'Drill sheets, drill stacks, diagrams, video references, and printable drill pages.',
    calendarTitle: 'Add drill stack to practice',
    repeat: 'Drill Generator linked',
    type: 'Drill',
    icon: 'layers',
    time: '16:15',
    duration: 25,
    dayOffset: 0,
  },
  {
    id: 'developmentPlan',
    title: 'Development Plan',
    detail: 'Player growth plans, weekly skill blocks, and individual work.',
    calendarTitle: 'Update player development plan',
    repeat: 'Development Plan linked',
    type: 'Development',
    icon: 'list',
    time: '14:30',
    duration: 30,
    dayOffset: 1,
  },
  {
    id: 'playerMeetings',
    title: 'Player Meetings',
    detail: 'One-on-one meetings, staff notes, parent follow-ups, and player check-ins.',
    calendarTitle: 'Player meeting block',
    repeat: 'Player meeting notes linked',
    type: 'Meeting',
    icon: 'users',
    time: '13:30',
    duration: 30,
    dayOffset: 1,
  },
  {
    id: 'evaluations',
    title: 'Evaluation Generator',
    detail: 'Player evaluations, rubric reviews, printable reports, and staff feedback.',
    calendarTitle: 'Complete player evaluations',
    repeat: 'Evaluation Generator linked',
    type: 'Evaluation',
    icon: 'check-circle',
    time: '18:15',
    duration: 45,
    dayOffset: 2,
  },
  {
    id: 'filmVideo',
    title: 'Video & Film',
    detail: 'Film review, clips, teaching moments, and player video assignments.',
    calendarTitle: 'Team film review',
    repeat: 'Video & Film linked',
    type: 'Film',
    icon: 'video',
    time: '17:00',
    duration: 45,
    dayOffset: 2,
  },
  {
    id: 'playbook',
    title: 'Playbook',
    detail: 'Sets, counters, play installs, options, and printable play sheets.',
    calendarTitle: 'Install playbook package',
    repeat: 'Playbook linked',
    type: 'Playbook',
    icon: 'book',
    time: '16:45',
    duration: 35,
    dayOffset: 3,
  },
  {
    id: 'leaderboard',
    title: 'Leaderboard',
    detail: 'Competition tracking, accountability, and quick team motivation.',
    calendarTitle: 'Update team leaderboard',
    repeat: 'Leaderboard linked',
    type: 'Leaderboard',
    icon: 'sparkles',
    time: '18:30',
    duration: 15,
    dayOffset: 3,
  },
  {
    id: 'aiScouting',
    title: 'AI Scouting',
    detail: 'Opponent scouts, game prep, personnel notes, and game-day packets.',
    calendarTitle: 'Prepare AI scouting packet',
    repeat: 'AI Scouting linked',
    type: 'Scouting',
    icon: 'file',
    time: '12:00',
    duration: 40,
    dayOffset: 4,
  },
  {
    id: 'playEditor',
    title: 'Play Editor',
    detail: 'Play diagrams, phase notes, counters, options, and teaching visuals.',
    calendarTitle: 'Attach play editor diagrams',
    repeat: 'Play Editor linked',
    type: 'Play Editor',
    icon: 'widgets',
    time: '15:00',
    duration: 25,
    dayOffset: 4,
  },
];

const els = {
  headlineDay: document.getElementById('headlineDay'),
  headlineMonth: document.getElementById('headlineMonth'),
  headlineYear: document.getElementById('headlineYear'),
  weekStrip: document.getElementById('weekStrip'),
  timelineView: document.getElementById('timelineView'),
  inboxView: document.getElementById('inboxView'),
  calendarView: document.getElementById('calendarView'),
  focusView: document.getElementById('focusView'),
  packetsView: document.getElementById('packetsView'),
  settingsView: document.getElementById('settingsView'),
  bottomNav: document.getElementById('bottomNav'),
  newTaskButton: document.getElementById('newTaskButton'),
  calendarButton: document.getElementById('calendarButton'),
  settingsButton: document.getElementById('settingsButton'),
  taskDialog: document.getElementById('taskDialog'),
  dialogTitle: document.getElementById('dialogTitle'),
  taskTitleInput: document.getElementById('taskTitleInput'),
  taskTimeInput: document.getElementById('taskTimeInput'),
  taskDurationInput: document.getElementById('taskDurationInput'),
  taskIconInput: document.getElementById('taskIconInput'),
  saveTaskButton: document.getElementById('saveTaskButton'),
  deleteTaskButton: document.getElementById('deleteTaskButton'),
  eventIconPreview: document.getElementById('eventIconPreview'),
  eventTimeSummary: document.getElementById('eventTimeSummary'),
  eventDateLabel: document.getElementById('eventDateLabel'),
  eventTimeLabel: document.getElementById('eventTimeLabel'),
  eventDurationLabel: document.getElementById('eventDurationLabel'),
  eventPlayerRow: document.getElementById('eventPlayerRow'),
  eventPlayerInput: document.getElementById('eventPlayerInput'),
  eventNotesInput: document.getElementById('eventNotesInput'),
  eventSubtaskInput: document.getElementById('eventSubtaskInput'),
  detailDialog: document.getElementById('detailDialog'),
  detailKicker: document.getElementById('detailKicker'),
  detailTitle: document.getElementById('detailTitle'),
  detailBody: document.getElementById('detailBody'),
  quickActionDialog: document.getElementById('quickActionDialog'),
  quickActionIcon: document.getElementById('quickActionIcon'),
  quickActionKicker: document.getElementById('quickActionKicker'),
  quickActionTitle: document.getElementById('quickActionTitle'),
  quickActionDate: document.getElementById('quickActionDate'),
  quickActionTime: document.getElementById('quickActionTime'),
  quickActionDuration: document.getElementById('quickActionDuration'),
  quickActionDetail: document.getElementById('quickActionDetail'),
  quickActionSave: document.getElementById('quickActionSave'),
  monthDialog: document.getElementById('monthDialog'),
  monthPickerTitle: document.getElementById('monthPickerTitle'),
  monthPickerGrid: document.getElementById('monthPickerGrid'),
};

function icon(name) {
  const paths = {
    alarm: '<circle cx="12" cy="13" r="7"/><path d="M12 10v4l3 2"/><path d="M5 3 2 6"/><path d="m19 3 3 3"/><path d="M9 21h6"/>',
    activity: '<path d="M4 13h4l2-7 4 12 2-5h4"/>',
    shower: '<path d="M4 20h16"/><path d="M7 20V9a5 5 0 0 1 10 0"/><path d="M14 9h6"/><path d="M15 13h.01"/><path d="M18 13h.01"/><path d="M15 16h.01"/><path d="M18 16h.01"/>',
    coffee: '<path d="M5 8h12v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z"/><path d="M17 9h1a3 3 0 0 1 0 6h-1"/><path d="M8 3v2"/><path d="M12 3v2"/><path d="M16 3v2"/>',
    bike: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h2"/><path d="m6 17 5-7 3 7"/><path d="M11 10h4l-4 7H6"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.63 2.61a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6.27 6.27l1.29-1.29a2 2 0 0 1 2.11-.45c.84.3 1.71.51 2.61.63A2 2 0 0 1 22 16.92Z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z"/>',
    list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v14"/><path d="M19 12v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8"/><path d="M7.5 8A2.5 2.5 0 1 1 12 6a2.5 2.5 0 1 1 4.5 2"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15"/><path d="M15 6v15"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/><path d="M8 22h8"/>',
    camera: '<path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3Z"/><circle cx="12" cy="13" r="4"/>',
    sparkles: '<path d="m12 3 1.4 4.2L17.5 9l-4.1 1.8L12 15l-1.4-4.2L6.5 9l4.1-1.8Z"/><path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8Z"/><path d="m19 13 .8 2.2 2.2.8-2.2.8L19 20l-.8-2.2-2.2-.8 2.2-.8Z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    video: '<path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6Z"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="m5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>',
    timeline: '<path d="M8 6h12"/><path d="M8 12h12"/><path d="M8 18h12"/><circle cx="4" cy="6" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="18" r="1.5"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/>',
    settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.08V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.08-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.08V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.21.38.57.66 1 .78.18.05.36.07.54.07H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0"/>',
    palette: '<path d="M12 22a10 10 0 1 1 10-10c0 2-1.5 3-3 3h-2a2 2 0 0 0-2 2v1c0 2-1 4-3 4Z"/><path d="M7.5 10h.01"/><path d="M10 6.5h.01"/><path d="M14 6.5h.01"/><path d="M16.5 10h.01"/>',
    badge: '<path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5Z"/><path d="m9 12 2 2 4-5"/>',
    type: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    flame: '<path d="M8.5 14.5A4 4 0 0 0 12 21a6 6 0 0 0 6-6c0-4-3-6-3-10 0 0-3 1.5-3 5 0 0-2-2-2-5-3 2-5 5-5 8a7 7 0 0 0 3.5 6.1"/><path d="M12 21a3 3 0 0 0 3-3c0-2-1.5-3-1.5-5 0 0-1.5.8-1.5 2.5 0 0-1-1-1-2.5-1.5 1.2-2.5 2.8-2.5 4.5A3.5 3.5 0 0 0 12 21Z"/>',
    cycle: '<path d="M4 12a8 8 0 0 1 13.6-5.7"/><path d="M18 2v5h-5"/><path d="M20 12a8 8 0 0 1-13.6 5.7"/><path d="M6 22v-5h5"/><path d="M12 7v5l3 2"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l-2 2"/><path d="M9 2h6"/><path d="M12 2v3"/>',
    widgets: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="13" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><path d="M15 20h4"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>',
    help: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M10 9a2 2 0 1 1 3.3 1.5c-.8.6-1.3 1.1-1.3 2"/><path d="M12 16h.01"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  };
  return `<svg class="svg-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.list}</svg>`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function minutes(time) {
  const [hour, minute] = time.split(':').map(Number);
  return (hour * 60) + minute;
}

function toTime(total) {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function monthName(month = activeMonth) {
  return new Date(activeYear, month, 1).toLocaleDateString('en-US', { month: 'long' });
}

function daysInMonth(month = activeMonth, year = activeYear) {
  return new Date(year, month + 1, 0).getDate();
}

function taskMonth(task) {
  return Number(task.month ?? 9);
}

function taskYear(task) {
  return Number(task.year ?? 2025);
}

function displayTime(time) {
  const [hour, minute] = time.split(':').map(Number);
  return `${hour}:${pad(minute)}`;
}

function displayClock(time) {
  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const standardHour = hour % 12 || 12;
  return `${standardHour}:${pad(minute)} ${period}`;
}

function displayRange(start, end) {
  const startText = displayClock(start);
  const endText = displayClock(end);
  const startPeriod = startText.split(' ').at(-1);
  const endPeriod = endText.split(' ').at(-1);
  if (startPeriod === endPeriod) {
    return `${startText.replace(` ${startPeriod}`, '')}-${endText}`;
  }
  return `${startText}-${endText}`;
}

function durationText(duration) {
  const value = Number(duration);
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return mins ? `${hours} hr, ${mins} min` : `${hours} hr`;
}

function dayLabel(day) {
  const date = new Date(activeYear, activeMonth, Number(day || activeDay));
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function taskDay(task) {
  return Number(task.day || activeDay || selectedCalendarDay || 16);
}

function isTaskInActiveMonth(task) {
  return taskMonth(task) === activeMonth && taskYear(task) === activeYear;
}

function currentMinutes() {
  const now = new Date();
  return (now.getHours() * 60) + now.getMinutes();
}

function refreshTimelineStatus() {
  const now = currentMinutes();
  tasks.forEach((task) => {
    if (taskDay(task) !== activeDay || !isTaskInActiveMonth(task)) {
      task.active = false;
      return;
    }
    const start = minutes(task.time);
    const end = start + Number(task.duration);
    if (!task.manualStatus) task.complete = end <= now;
    task.active = start <= now && now < end;
  });
}

function showDetail(kicker, title, body) {
  els.detailKicker.textContent = kicker;
  els.detailTitle.textContent = title;
  els.detailBody.textContent = body;
  els.detailDialog.showModal();
}

function updateEventEditorSummary() {
  const start = els.taskTimeInput.value || '15:30';
  const duration = Number(els.taskDurationInput.value || 30);
  const end = toTime(minutes(start) + duration);
  const title = els.taskTitleInput.value.trim() || 'New coach event';
  const summary = displayRange(start, end);
  els.eventTimeSummary.textContent = `${summary} (${durationText(duration)})`;
  els.eventTimeLabel.textContent = summary;
  els.eventDurationLabel.textContent = durationText(duration);
  els.eventDateLabel.textContent = dayLabel(activeDay);
  els.dialogTitle && (els.dialogTitle.textContent = title);
  els.eventIconPreview.innerHTML = icon(els.taskIconInput.value || 'activity');
}

function makeTask(payload) {
  return {
    id: crypto.randomUUID(),
    day: selectedCalendarDay,
    month: activeMonth,
    year: activeYear,
    complete: false,
    active: false,
    ...payload,
  };
}

function playerOptionLabel(player) {
  if (!player) return 'Player';
  return player.email ? `${player.name} (${player.email})` : player.name;
}

function renderCalendarPlayerPicker() {
  if (!els.eventPlayerRow || !els.eventPlayerInput) return;
  const isTrainer = calendarRole === 'trainer';
  els.eventPlayerRow.hidden = !isTrainer;
  if (!isTrainer) return;

  els.eventPlayerInput.innerHTML = calendarPlayers.length
    ? calendarPlayers.map((player) => `<option value="${player.id}">${playerOptionLabel(player)}</option>`).join('')
    : '<option value="">No players found</option>';

  if (!selectedCalendarPlayerId && calendarPlayers[0]) {
    selectedCalendarPlayerId = String(calendarPlayers[0].id);
  }
  if (selectedCalendarPlayerId) els.eventPlayerInput.value = String(selectedCalendarPlayerId);
  els.eventPlayerInput.disabled = calendarPlayers.length === 0;
}

function selectedPlayerPayload() {
  if (calendarRole !== 'trainer') return {};
  const value = els.eventPlayerInput?.value || selectedCalendarPlayerId;
  if (!value) return {};
  return { playerId: String(value) };
}

/* ==== LINK #5 — mirror new local events to the server ======================
   POST /api/suite/calendar/create persists a locally-added event as a REAL
   CalendarEvent row (contract R1). The LOCAL save stays primary (offline-first,
   R9): the task is already in `tasks` before the network is touched, and the
   POST is fire-and-forget — a network/5xx failure queues ONE retry entry that
   a timer flushes later; a 4xx (signed out / no permission / rejected input)
   gives up silently so the queue can't loop on a request that will never heal.

   No double-create: tasks that came FROM the server (bootCalendarData loads
   them via SuiteCalendarData, which tags each with `source` and whose `id` IS
   the server id) — or that already got a `serverId` from a previous POST —
   are skipped by postTaskToServer. */
const CREATE_EVENT_URL = '/api/suite/calendar/create';
const pendingServerCreates = [];

function serverEventType(task) {
  const label = String(task.type || '').toLowerCase();
  if (label.includes('practice')) return 'PRACTICE';
  if (label.includes('game')) return 'GAME';
  if (label.includes('film')) return 'FILM';
  return 'OTHER';
}

/* 'YYYY-MM-DDTHH:mm' — the datetime-local shape the route's zod schema pins to
   UTC, exactly like the Next /calendar form. */
function localStamp(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function taskToServerEvent(task) {
  const [hour, minute] = String(task.time || '00:00').split(':').map(Number);
  const start = new Date(taskYear(task), taskMonth(task), taskDay(task), hour || 0, minute || 0);
  const end = new Date(start.getTime() + (Number(task.duration) || 60) * 60000);
  const payload = {
    title: task.title || 'New coach event',
    type: serverEventType(task),
    startsAt: localStamp(start),
    endsAt: localStamp(end),
  };
  if (task.location) payload.location = task.location;
  if (task.opponent) payload.opponent = task.opponent;
  if (task.notes) payload.notes = task.notes;
  if (task.playerId) payload.player_id = Number(task.playerId);
  return payload;
}

function postTaskToServer(task) {
  if (!task || task.serverId || task.source) return; // already lives on the server
  if (typeof fetch !== 'function') return;
  fetch(CREATE_EVENT_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(taskToServerEvent(task)),
  })
    .then((res) => {
      if (res.ok) return res.json();
      if (res.status >= 400 && res.status < 500) return null; // permanent — keep the local copy, stop retrying
      throw new Error(`HTTP ${res.status}`);
    })
    .then((json) => {
      if (json && json.id) task.serverId = json.id;
    })
    .catch(() => {
      if (!pendingServerCreates.includes(task)) pendingServerCreates.push(task);
    });
}

function flushPendingServerCreates() {
  if (!pendingServerCreates.length) return;
  pendingServerCreates.splice(0, pendingServerCreates.length).forEach(postTaskToServer);
}

setInterval(flushPendingServerCreates, 60000);

function scheduleTask(payload, { goToCalendar = true } = {}) {
  if (calendarRole === 'trainer' && !selectedCalendarPlayerId) {
    showDetail('PLAYER NEEDED', 'Choose a player', 'Pick the player who should receive this calendar item.');
    return null;
  }
  const task = makeTask({ ...selectedPlayerPayload(), ...payload });
  tasks.push(task);
  postTaskToServer(task); // LINK #5: fire-and-forget server mirror; local save stays primary
  selectedCalendarDay = taskDay(task);
  activeDay = selectedCalendarDay;
  if (goToCalendar) setView('calendar');
  else renderActiveView();
  return task;
}

function suiteTargetDay(connection) {
  return Math.min(daysInMonth(), selectedCalendarDay + connection.dayOffset);
}

function enabledSuiteConnections() {
  return suiteConnections.filter((connection) => suiteConnectionIds.includes(connection.id));
}

function applySuiteAutomation({ goToCalendar = false } = {}) {
  enabledSuiteConnections().forEach((connection) => {
    const day = suiteTargetDay(connection);
    const exists = tasks.some((task) => (
      task.sourceId === connection.id
      && taskDay(task) === day
      && taskMonth(task) === activeMonth
      && taskYear(task) === activeYear
    ));
    if (!exists) {
      tasks.push(makeTask({
        title: connection.calendarTitle,
        day,
        time: connection.time,
        duration: connection.duration,
        icon: connection.icon,
        repeat: connection.repeat,
        type: connection.type,
        sourceId: connection.id,
      }));
    }
  });
  if (goToCalendar) setView('calendar');
  else renderActiveView();
}

function endTime(task) {
  return toTime(minutes(task.time) + Number(task.duration));
}

function coachModePanel(context = 'today') {
  const helper = context === 'ai'
    ? 'Talk or type what you want. Coach AI turns it into practices, games, scouting, availability checks, team functions, and printable packets.'
    : 'Manual is for exact edits. AI is for letting Coach AI build the schedule from your practice, game, scouting, and team needs.';
  return `
    <section class="coach-ai-panel ${plannerMode === 'ai' ? 'is-ai' : ''}">
      <div class="mode-row">
        <div class="mode-toggle suite-tabs" role="group" aria-label="Planner mode">
          <button class="suite-tab ${plannerMode === 'manual' ? 'is-active' : ''}" data-mode="manual">Manual</button>
          <button class="suite-tab ${plannerMode === 'ai' ? 'is-active' : ''}" data-mode="ai">AI</button>
        </div>
        <button class="voice-button ${voiceListening ? 'is-listening' : ''}" data-voice>${icon('mic')} ${voiceListening ? 'Listening' : 'Talk plan'}</button>
      </div>
      <div class="ai-command">
        <p>${helper}</p>
        <textarea id="aiDraftInput" class="suite-input" rows="3">${aiDraft}</textarea>
        <div class="ai-actions">
          <button class="secondary compact-action suite-btn-secondary" data-ai-sample>Use game-week sample</button>
          <button class="primary compact-action suite-btn" data-ai-build>${icon('calendar')} Build schedule</button>
        </div>
      </div>
    </section>
  `;
}

function renderWeek() {
  const totalDays = daysInMonth();
  const start = Math.min(Math.max(activeDay - 3, 1), Math.max(totalDays - 6, 1));
  const days = Array.from({ length: Math.min(7, totalDays) }, (_, index) => {
    const day = start + index;
    const label = new Date(activeYear, activeMonth, day).toLocaleDateString('en-US', { weekday: 'short' });
    return [label, day];
  });
  els.headlineDay.textContent = `${activeDay}.`;
  els.headlineMonth.textContent = monthName();
  els.headlineYear.textContent = activeYear;
  els.weekStrip.innerHTML = days.map(([label, day]) => {
    const dots = Array.from({ length: day === activeDay ? 7 : 5 }, (_, index) => (
      `<span class="dot" style="--dot:${accent};--dot-opacity:${0.28 + (index * 0.08)}"></span>`
    )).join('');
    return `
      <button class="day-pill ${day === activeDay ? 'is-active' : ''}" data-day="${day}">
        <span>${label}</span>
        <strong>${day}</strong>
        <div class="dot-row">${dots}</div>
      </button>
    `;
  }).join('');
}

function renderNav() {
  els.bottomNav.innerHTML = tabs.map((tab) => `
    <button class="nav-tab ${tab.id === activeView ? 'is-active' : ''}" data-view="${tab.id}">
      ${icon(tab.icon)}
      <span>${tab.label}</span>
    </button>
  `).join('');
}

function renderTimeline() {
  refreshTimelineStatus();
  const quick = selectedQuickActions
    .map((id) => actionOptions.find((item) => item.id === id))
    .filter(Boolean);
  const sortedTasks = tasks
    .filter((task) => taskDay(task) === activeDay && isTaskInActiveMonth(task))
    .sort((a, b) => minutes(a.time) - minutes(b.time));
  els.timelineView.innerHTML = `
    <section class="planner-grid today-workspace ${inboxLaneOpen ? 'has-inbox-open' : 'is-inbox-collapsed'}">
      <aside class="inbox-pane compact-pane" aria-label="Inbox preview">
        <div class="pane-head">
          <button class="inbox-heading-button" data-inbox-toggle aria-label="Hide inbox">Inbox</button>
          <button class="tiny-add" data-add-inbox aria-label="Add inbox task">${icon('plus')}</button>
        </div>
        <div class="inbox-list">
          ${inbox.slice(0, 5).map(renderInboxCard).join('')}
        </div>
      </aside>
      <section class="timeline-pane">
        <div class="quick-row">
          ${quick.map((item) => `
            <button class="quick-card" data-quick="${item.id}">
              <span class="quick-icon">${icon(item.icon)}</span>
              <strong>${item.title}</strong>
            </button>
          `).join('')}
        </div>
        <div class="timeline-list">
          ${sortedTasks.length ? sortedTasks.map(renderTimelineRow).join('') : '<div class="empty-state"><strong>No events on this day yet</strong><span>Use one of your action buttons or the plus button to add one.</span></div>'}
        </div>
      </section>
    </section>
  `;
}

function renderTimelineRow(task) {
  const height = Math.max(98, task.duration * 2.25);
  const nodeHeight = Math.max(86, task.duration * 1.8);
  return `
    <article class="task-row ${task.complete ? 'is-complete' : ''} ${task.active ? 'is-current' : ''}" style="--row-height:${height}px;--row-height-mobile:${Math.max(102, height)}px;--node-height:${nodeHeight}px" data-task="${task.id}">
      <div class="time-stack">
        <span>${displayTime(task.time)}</span>
        <span>${displayTime(endTime(task))}</span>
      </div>
      <button class="rail-node ${task.active ? 'is-active' : ''}" data-edit="${task.id}" aria-label="Edit ${task.title}">${icon(task.icon)}</button>
      <div class="task-copy" data-detail="TIMELINE BLOCK" data-detail-title="${task.title}" data-detail-body="${displayTime(task.time)} to ${displayTime(endTime(task))}. ${task.duration} minutes. Repeats: ${task.repeat}.">
        ${task.active ? '<div class="remaining">19m remaining</div>' : ''}
        <div class="task-time">${displayTime(task.time)} - ${displayTime(endTime(task))} (${task.duration} min)</div>
        <div class="task-title">${task.title}</div>
        <div class="task-repeat">${task.repeat}</div>
      </div>
      <button class="complete-ring ${task.complete ? 'is-complete' : ''}" aria-label="${task.complete ? 'Reactivate task' : 'Complete task'}" data-complete="${task.id}">${task.complete ? icon('check-circle') : ''}</button>
    </article>
  `;
}

function renderInboxCard(task) {
  return `
    <article class="inbox-task" data-detail="INBOX ITEM" data-detail-title="${task.title}" data-detail-body="${task.capture}. Estimated ${task.duration} minutes. Use the plus button to schedule it into the timeline.">
      <span class="inbox-icon">${icon(task.icon)}</span>
      <div>
        <div class="inbox-title">${task.title}</div>
        <div class="inbox-meta">${task.capture} - ${task.duration} min</div>
      </div>
      <button class="inbox-plus" data-inbox="${task.id}" aria-label="Schedule ${task.title}">${icon('plus')}</button>
    </article>
  `;
}

function renderInbox() {
  const promptText = 'Can you move plans today to be an hour later.';
  els.inboxView.innerHTML = `
    <section class="coach-ai-shot-page">
      <div class="coach-ai-shot-hero">
        <div>
          <p>Hi there!</p>
          <h2>What tasks are on your agenda?</h2>
        </div>
        <button class="coach-ai-shot-help" data-detail="AI HELP" data-detail-title="Coach AI planner" data-detail-body="Tell Coach AI what you want to plan. It can move practices, add scouting work, set availability checks, create team functions, and build printable packets.">?</button>
      </div>

      ${aiPromptExpanded ? `
        <div class="coach-ai-shot-generate">
          <p>${promptText}</p>
          <div class="coach-ai-shot-divider"></div>
          <div class="coach-ai-shot-tools">
            <button class="coach-ai-shot-round ${voiceListening ? 'is-listening' : ''}" data-voice aria-label="Talk to Coach AI">${icon('mic')}</button>
            <button class="coach-ai-shot-round" data-ai-add-detail aria-label="Add more detail">${icon('plus')}</button>
          </div>
          <button class="coach-ai-shot-generate-button" data-ai-build>${icon('sparkles')} <span>Generate</span></button>
        </div>
      ` : `
        <button class="coach-ai-shot-suggestion" data-ai-sample>
          <span>${icon('activity')}</span>
          <div>
            <strong>Move task by 1h</strong>
            <small>Can you move plans today to start one hour later?</small>
          </div>
        </button>

        <div class="coach-ai-shot-command">
          <textarea id="aiShotInput" rows="1" aria-label="Tell Coach AI what to plan" placeholder="Tell me yo..." autocomplete="off" spellcheck="false"></textarea>
          <button class="coach-ai-shot-icon ${voiceListening ? 'is-listening' : ''}" data-voice aria-label="Talk to Coach AI">${icon('mic')}</button>
          <button class="coach-ai-shot-icon" data-ai-build aria-label="Build schedule">${icon('camera')}</button>
        </div>
      `}
    </section>
  `;
}

function renderCalendar() {
  const monthDays = Array.from({ length: daysInMonth() }, (_, index) => index + 1);
  const tasksByDay = tasks.reduce((days, task) => {
    if (!isTaskInActiveMonth(task)) return days;
    const day = taskDay(task);
    days[day] = days[day] || [];
    days[day].push(task);
    return days;
  }, {});
  const selectedTasks = [...(tasksByDay[selectedCalendarDay] || [])].sort((a, b) => minutes(a.time) - minutes(b.time));
  els.calendarView.innerHTML = `
    <section class="feature-page">
      <div class="feature-head">
        <div>
          <p>CALENDAR</p>
          <h2>${monthName()} ${activeYear}</h2>
        </div>
        <button class="pill-button suite-btn-secondary" data-view="timeline">${icon('timeline')} Day view</button>
      </div>
      <div class="calendar-layout">
        <div class="calendar-grid">
          ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => `<span class="calendar-label">${day}</span>`).join('')}
          ${monthDays.map((day) => `
            <button class="calendar-cell ${day === selectedCalendarDay ? 'is-selected' : ''}" data-calendar-day="${day}">
              <strong>${day}</strong>
              <span>${tasksByDay[day]?.length ? `${tasksByDay[day].length} scheduled` : ''}</span>
            </button>
          `).join('')}
        </div>
        <aside class="calendar-agenda">
          <p>SELECTED DAY</p>
          <h3>${selectedCalendarDay}. ${monthName()}</h3>
          ${selectedTasks.length ? selectedTasks.map((task) => `
            <button class="agenda-card" data-agenda="${task.id}">
              <span>${icon(task.icon)}</span>
              <div>
                <strong>${task.title}</strong>
                <small>${displayTime(task.time)} - ${displayTime(endTime(task))}</small>
              </div>
            </button>
          `).join('') : '<div class="empty-state"><strong>No scheduled items yet</strong><span>Use a plus button or Coach AI to put something on this day.</span></div>'}
        </aside>
      </div>
    </section>
  `;
}

function playerAvailabilityStats(player) {
  const total = 32;
  const made = Math.round((player.attendance / 100) * total);
  const missed = total - made;
  const statusLabels = {
    yes: 'Confirmed',
    late: 'Late',
    limited: 'Limited',
    pending: 'Pending',
    out: 'Out',
  };
  return {
    total,
    made,
    missed,
    participation: player.attendance,
    status: statusLabels[player.status],
  };
}

function renderFocus() {
  const availableCount = availabilityPlayers.filter((player) => ['yes', 'late', 'limited'].includes(player.status)).length;
  const pendingCount = availabilityPlayers.filter((player) => player.status === 'pending').length;
  const averageAttendance = Math.round(availabilityPlayers.reduce((sum, player) => sum + player.attendance, 0) / availabilityPlayers.length);
  if (selectedPlayerIndex !== null) {
    const player = availabilityPlayers[selectedPlayerIndex];
    const stats = playerAvailabilityStats(player);
    els.focusView.innerHTML = `
      <section class="feature-page availability-page player-detail-page">
        <div class="player-detail-top">
          <button class="text-button" data-player-back>${icon('chevron')} Back to roster</button>
          <div class="mode-toggle availability-toggle suite-tabs" role="group" aria-label="Availability mode">
            <button class="suite-tab ${availabilityMode === 'manual' ? 'is-active' : ''}" data-availability-mode="manual">Manual</button>
            <button class="suite-tab ${availabilityMode === 'ai' ? 'is-active' : ''}" data-availability-mode="ai">AI</button>
          </div>
        </div>

        <div class="player-readout-head">
          <p>PLAYER AVAILABILITY</p>
          <h2>${player.name}</h2>
          <span>${player.role} · ${stats.status}</span>
        </div>

        <div class="player-readout-lines">
          <div>
            <span>Made</span>
            <strong>${stats.made}</strong>
            <small>team events attended</small>
          </div>
          <div>
            <span>Missed</span>
            <strong>${stats.missed}</strong>
            <small>team events missed</small>
          </div>
          <div>
            <span>Participation</span>
            <strong>${stats.participation}%</strong>
            <small>30-day attendance</small>
          </div>
        </div>

        <div class="player-readout-note">
          <span>Latest coach note</span>
          <p>${player.lastReply}</p>
        </div>

        <button class="player-status-button" data-player-status="${selectedPlayerIndex}">
          Change availability status
        </button>
      </section>
    `;
    return;
  }

  els.focusView.innerHTML = `
    <section class="feature-page availability-page">
      <div class="feature-head">
        <div>
          <p>ROSTER</p>
          <h2>Availability</h2>
        </div>
      </div>

      <div class="availability-control-bar">
        <div class="mode-toggle availability-toggle suite-tabs" role="group" aria-label="Availability mode">
          <button class="suite-tab ${availabilityMode === 'manual' ? 'is-active' : ''}" data-availability-mode="manual">Manual</button>
          <button class="suite-tab ${availabilityMode === 'ai' ? 'is-active' : ''}" data-availability-mode="ai">AI</button>
        </div>
      </div>

      <div class="availability-readline">
        <span>${availableCount}/${availabilityPlayers.length} available</span>
        <span>${pendingCount} pending</span>
        <span>${averageAttendance}% participation</span>
      </div>

      <div class="availability-roster">
        ${availabilityPlayers.map((player, index) => `
          <button class="availability-player status-${player.status}" data-player-detail="${index}">
            <span class="availability-number">${pad(index + 1)}</span>
            <div>
              <h3>${player.name}</h3>
              <p>${player.role} · ${player.lastReply}</p>
            </div>
            <strong>${playerAvailabilityStats(player).status}</strong>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function packetDateLabel() {
  return `${monthName()} ${activeDay}, ${activeYear}`;
}

function packetTimeLabel(task) {
  return `${displayClock(task.time)} - ${displayClock(endTime(task))}`;
}

function getDailyTasks() {
  return [...tasks]
    .filter((task) => taskDay(task) === activeDay && isTaskInActiveMonth(task))
    .sort((a, b) => minutes(a.time) - minutes(b.time));
}

function packetModel(index = selectedPacketIndex) {
  const packet = settingsRows[index] || settingsRows[0];
  const dailyTasks = getDailyTasks();
  const available = availabilityPlayers.filter((player) => ['yes', 'late', 'limited'].includes(player.status));
  const exceptions = availabilityPlayers.filter((player) => ['late', 'limited', 'pending', 'out'].includes(player.status));
  const confirmed = availabilityPlayers.filter((player) => player.status === 'yes');
  const limited = availabilityPlayers.filter((player) => ['limited', 'late'].includes(player.status));
  const packetNumber = String(index + 1).padStart(2, '0');
  const base = {
    ...packet,
    index,
    kind: ['daily', 'weekly', 'game', 'player'][index] || 'daily',
    packetNumber,
    date: packetDateLabel(),
    team: 'RISE AS ONE BASKETBALL',
    group: 'Varsity',
    focus: 'Practice, scouting, availability, and staff communication',
    generated: new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date()),
  };

  if (index === 1) {
    return {
      ...base,
      title: 'Weekly team packet',
      label: 'WEEKLY STAFF PACKET',
      summary: 'A coach-facing week plan with practices, game prep, film, travel, staff responsibilities, and team functions.',
      stats: [
        ['Practices', '3'],
        ['Game prep', '2 blocks'],
        ['Staff items', '6'],
        ['Availability', `${available.length}/${availabilityPlayers.length}`],
      ],
      sections: [
        {
          title: 'Week Schedule',
          rows: [
            ['Mon', 'Skill cleanup, player availability confirmation, and staff checklist'],
            ['Tue', 'Defensive practice: shell coverage, closeouts, transition spacing'],
            ['Wed', 'Film session, scouting packet review, and player clips'],
            ['Thu', 'Special situations, walk-through, staff call, and trainer update'],
            ['Fri', 'Game-day itinerary, matchups, printed handout, and travel timing'],
          ],
        },
        {
          title: 'Practice Package',
          note: 'Use Practice Builder packets for the full drill blocks. This sheet tells staff what matters for the week.',
          rows: [
            ['Practice 1', 'Defensive detail: shell defense, closeout angles, early talk'],
            ['Practice 2', 'Offensive spacing: advantage reads, paint touches, shot quality'],
            ['Practice 3', 'Game simulation: special situations, press break, late-clock offense'],
          ],
        },
        {
          title: 'Scouting + Film',
          rows: [
            ['Opponent scout', 'Lincoln Prep: keep ball out of the middle third and finish possessions'],
            ['Film focus', 'First two defensive possessions, transition misses, baseline out calls'],
            ['Player clips', 'Send guard and wing clips before Thursday walk-through'],
          ],
        },
        {
          title: 'Staff Responsibilities',
          rows: [
            ['Head coach', 'Practice install, game plan approval, final scout notes'],
            ['Assistant 1', 'Availability follow-up and position group notes'],
            ['Assistant 2', 'Film clips, player matchups, and warmup timing'],
            ['Trainer', 'Treatment report and limited-player updates before practice'],
          ],
        },
        {
          title: 'Print Checklist',
          bullets: ['Practice plan packet', 'Game-day player handout', 'Opponent scout', 'Availability exceptions', 'Staff call notes', 'Weekly team packet shared with staff'],
        },
      ],
    };
  }

  if (index === 2) {
    return {
      ...base,
      title: 'Game-day packet',
      label: 'GAME-DAY PACKET',
      summary: 'Opponent scout, arrival timeline, roster notes, matchups, special situations, and day-of-game checklist.',
      stats: [
        ['Opponent', 'Lincoln Prep'],
        ['Arrival', '3:30 PM'],
        ['Matchups', '5'],
        ['Roster', `${confirmed.length} confirmed`],
      ],
      sections: [
        {
          title: 'Arrival Timeline',
          rows: [
            ['3:30 PM', 'Players arrive, treatment, ankle checks, and gear check'],
            ['4:00 PM', 'Walk-through: baseline out, sideline out, late-clock defense'],
            ['4:30 PM', 'Film reminder and matchup card review'],
            ['5:15 PM', 'Final staff notes and player handout distribution'],
          ],
        },
        {
          title: 'Opponent Scout',
          bullets: ['Keep the ball out of the middle third', 'Sprint back and load to the ball', 'Make first pass hard on after-timeout actions', 'Win special situations and dead-ball communication'],
        },
        {
          title: 'Matchup Board',
          rows: [
            ['Primary ball handler', 'Pick up above the slot, force weak hand, make catches hard'],
            ['Best shooter', 'Top lock on stagger actions, no clean trail threes'],
            ['Rim threat', 'Early body on rolls, hit first, rebound second'],
            ['Bench scorer', 'Do not lose on weak-side exchanges'],
          ],
        },
        {
          title: 'Roster + Availability Notes',
          rows: exceptions.length
            ? exceptions.map((player) => [player.name, `${playerAvailabilityStats(player).status}: ${player.lastReply}`])
            : [['All players', 'No exceptions listed for this game-day packet']],
        },
        {
          title: 'Game Checklist',
          bullets: ['Roster confirmed', 'Matchup cards printed', 'Film clips loaded', 'Trainer update reviewed', 'Game packet shared with staff'],
        },
      ],
    };
  }

  if (index === 3) {
    return {
      ...base,
      title: 'Player handout',
      label: 'PLAYER HANDOUT',
      summary: 'Player-safe version with arrival times, expectations, location, what to bring, and simple day-of instructions.',
      stats: [
        ['Audience', 'Players'],
        ['Location', 'Main Gym'],
        ['Arrival', '20 min early'],
        ['Tone', 'Simple'],
      ],
      sections: [
        {
          title: 'Player Schedule',
          rows: [
            ['Arrival', 'Be dressed and ready 20 minutes before floor time'],
            ['Practice focus', 'Shell defense, closeouts, transition spacing'],
            ['Film', 'Review first two clips before warmup'],
            ['Dismissal', 'Players check out with position coach'],
          ],
        },
        {
          title: 'Expectations',
          bullets: ['Communicate early and loud', 'Sprint between every segment', 'Bring water, shoes, notebook, and practice gear', 'Tell staff immediately if availability changes'],
        },
        {
          title: 'What To Bring',
          rows: [
            ['Required', 'Practice gear, basketball shoes, water, notebook'],
            ['Recommended', 'Extra shirt, recovery band, personal towel'],
            ['Do not forget', 'Tell a coach if your status changes before arrival'],
          ],
        },
        {
          title: 'Player Availability Notes',
          rows: exceptions.map((player) => [player.name, player.lastReply]),
        },
        {
          title: 'Player Reminders',
          bullets: ['Be on time', 'Know the focus before you arrive', 'Ask questions early', 'Leave the gym better than you found it'],
        },
      ],
    };
  }

  return {
    ...base,
    title: 'Daily coach itinerary',
    label: 'DAILY COACH ITINERARY',
    summary: 'Today’s schedule, practice, scouting, availability, staff tasks, and notes in one print-ready coach packet.',
    stats: [
      ['Scheduled', `${dailyTasks.length}`],
      ['Available', `${available.length}/${availabilityPlayers.length}`],
      ['Exceptions', `${exceptions.length}`],
      ['Packet', packetNumber],
    ],
    sections: [
      {
        title: 'Today Timeline',
        rows: dailyTasks.length
          ? dailyTasks.map((task) => [packetTimeLabel(task), `${task.title} · ${task.repeat}`])
          : [['No scheduled items', 'Use quick actions or Coach AI to add the day’s work.']],
      },
      {
        title: 'Availability Snapshot',
        rows: [
          ['Available', `${available.length}/${availabilityPlayers.length} players ready, late, or limited`],
          ['Follow-up', `${exceptions.length} players need coach awareness`],
          ['Limited/Late', limited.length ? limited.map((player) => player.name).join(', ') : 'No limited or late players listed'],
        ],
      },
      {
        title: 'Practice Builder Link',
        rows: [
          ['Practice plan', 'Defensive detail day: shell defense, closeouts, transition spacing'],
          ['Purpose', 'Win each possession with communication, pace, and discipline'],
          ['Print asset', 'Practice Builder packet and player-safe handout are ready to print'],
        ],
      },
      {
        title: 'Scouting + Film',
        rows: [
          ['Scout', 'Lincoln Prep first action package and after-timeout calls'],
          ['Film', 'Show two clips before walk-through and one correction clip after practice'],
        ],
      },
      {
        title: 'Coach Priorities',
        bullets: ['Confirm practice floor timing', 'Review staff responsibilities', 'Print player-safe handout if needed', 'Close the day with availability updates'],
      },
    ],
  };
}

function renderPacketRows(rows = []) {
  if (!rows.length) {
    return `
      <div class="packet-table">
        <div>
          <strong>No items</strong>
          <span>This section is ready for the coach to add details.</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="packet-table">
      ${rows.map(([label, detail]) => `
        <div>
          <strong>${label}</strong>
          <span>${detail}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderPacketSheet(model) {
  return `
    <article class="coach-packet-sheet packet-${model.kind}">
      <header class="packet-sheet-header">
        <div class="packet-team-band">${model.team}</div>
        <div class="packet-hero-row">
          <div class="packet-logo-mark">RA1</div>
          <div>
            <p>Basketball Coach AI Suite</p>
            <h2>${model.title}</h2>
            <span>${model.summary}</span>
          </div>
          <dl>
            <div><dt>Date</dt><dd>${model.date}</dd></div>
            <div><dt>Group</dt><dd>${model.group}</dd></div>
            <div><dt>Type</dt><dd>${model.label}</dd></div>
            <div><dt>Generated</dt><dd>${model.generated}</dd></div>
          </dl>
        </div>
      </header>

      <section class="packet-purpose-row">
        <span>Purpose</span>
        <strong>${model.focus}</strong>
      </section>

      <section class="packet-stat-row">
        ${model.stats.map(([label, value]) => `
          <div>
            <span>${label}</span>
            <strong>${value}</strong>
          </div>
        `).join('')}
      </section>

      <div class="packet-section-stack">
        ${model.sections.map((section) => `
          <section class="packet-section">
            <h3>${section.title}</h3>
            ${section.note ? `<p class="packet-section-note">${section.note}</p>` : ''}
            ${section.rows ? renderPacketRows(section.rows) : ''}
            ${section.bullets ? `
              <ul>
                ${section.bullets.map((item) => `<li>${item}</li>`).join('')}
              </ul>
            ` : ''}
          </section>
        `).join('')}
      </div>
      <footer class="packet-sheet-footer">
        <span>${model.label}</span>
        <strong>Prepared for ${model.team}</strong>
        <span>Packet ${model.packetNumber}</span>
      </footer>
    </article>
  `;
}

function renderPackets() {
  if (selectedPacketDetailIndex !== null) {
    const model = packetModel(selectedPacketDetailIndex);
    els.packetsView.innerHTML = `
      <section class="feature-page packet-detail-page">
        <div class="packet-detail-toolbar no-packet-print">
          <button class="text-button" data-packet-back>${icon('chevron')} Back to packets</button>
          <div>
            <button class="pill-button suite-btn-secondary" data-build-packet>${icon('calendar')} Add to calendar</button>
            <button class="pill-button primary suite-btn" data-packet-print>${icon('print')} Print PDF</button>
          </div>
        </div>
        ${renderPacketSheet(model)}
      </section>
    `;
    return;
  }

  els.packetsView.innerHTML = `
    <section class="feature-page">
      <div class="feature-head">
        <div>
          <p>PACKETS</p>
          <h2>Coach Packets</h2>
        </div>
        <button class="pill-button suite-btn-secondary" data-build-packet>${icon('calendar')} Add packet to calendar</button>
      </div>
      <div class="settings-card-list">
        ${settingsRows.map((row, index) => `
          <button class="settings-feature compact ${index === selectedPacketIndex ? 'is-selected' : ''}" data-packet-option="${index}">
            <span class="settings-feature-icon tone-blue">${icon(row.icon)}</span>
            <span class="settings-feature-copy">
              <strong>${row.title}</strong>
              <small>${row.detail}</small>
            </span>
            <span class="settings-feature-arrow">${icon('chevron')}</span>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function renderSettings() {
  const allSettingsItems = settingsSections.flatMap((section) => section.items);
  const selectedFeature = allSettingsItems.find((item) => item.id === selectedSettingsFeatureId);
  const selectedPacketMatch = selectedSettingsFeatureId?.match(/^packet:(\d+)$/);
  if (selectedFeature) {
    els.settingsView.innerHTML = renderSettingsFeaturePage(selectedFeature);
    return;
  }
  if (selectedPacketMatch) {
    selectedPacketIndex = Number(selectedPacketMatch[1]);
    els.settingsView.innerHTML = renderSettingsPacketPage(settingsRows[selectedPacketIndex] || settingsRows[0]);
    return;
  }
  els.settingsView.innerHTML = `
    <section class="settings-page">
      <div class="settings-titlebar">
        <h2>Settings</h2>
      </div>
      <div class="settings-layout">
        <div class="settings-directory">
          ${settingsSections.map((section) => `
            <section class="settings-section-block">
              <h3>${section.title}</h3>
              <div class="settings-card-list">
                ${section.items.map((item) => `
                  <button class="settings-feature" data-settings-feature="${item.id}">
                    <span class="settings-feature-icon tone-${item.tone}">${icon(item.icon)}</span>
                    <span class="settings-feature-copy">
                      <strong>${item.title}</strong>
                      <small>${item.subtitle}</small>
                    </span>
                    <span class="settings-feature-arrow">${icon('chevron')}</span>
                  </button>
                `).join('')}
              </div>
            </section>
          `).join('')}
          <section class="settings-section-block">
            <h3>Coach Packets</h3>
            <div class="settings-card-list">
              ${settingsRows.map((row, index) => `
                <button class="settings-feature compact" data-settings="${index}">
                  <span class="settings-feature-icon tone-blue">${icon(row.icon)}</span>
                  <span class="settings-feature-copy">
                    <strong>${row.title}</strong>
                    <small>${row.detail}</small>
                  </span>
                  <span class="settings-feature-arrow">${icon('chevron')}</span>
                </button>
              `).join('')}
            </div>
          </section>
        </div>
      </div>
    </section>
  `;
}

function renderSettingsFeaturePage(feature) {
  return `
    <section class="settings-page settings-detail-page">
      <div class="settings-titlebar with-back">
        <button class="settings-back" data-settings-back>${icon('chevron')} Back</button>
        <h2>${feature.title}</h2>
      </div>
      <section class="settings-detail-content">
        <span class="settings-feature-icon tone-${feature.tone}">${icon(feature.icon)}</span>
        <p>SETTINGS</p>
        <h3>${feature.title}</h3>
        <span>${feature.detail}</span>
        ${feature.id === 'quickActions' ? `
          <section class="action-settings-panel in-settings">
            <p>CHOOSE 3 TODAY BUTTONS</p>
            <div class="action-option-grid">
              ${actionOptions.map((item) => `
                <button class="action-option ${selectedQuickActions.includes(item.id) ? 'is-selected' : ''}" data-action-option="${item.id}">
                  <span>${icon(item.icon)}</span>
                  <strong>${item.title}</strong>
                </button>
              `).join('')}
            </div>
          </section>
        ` : feature.id === 'suiteConnections' ? `
          <section class="suite-connection-panel">
            <p>AI CALENDAR SOURCES</p>
            <div class="suite-connection-list">
              ${suiteConnections.map((connection) => `
                <button class="suite-connection ${suiteConnectionIds.includes(connection.id) ? 'is-enabled' : ''}" data-suite-toggle="${connection.id}">
                  <span class="suite-connection-icon">${icon(connection.icon)}</span>
                  <span>
                    <strong>${connection.title}</strong>
                    <small>${connection.detail}</small>
                  </span>
                  <span class="suite-switch" aria-hidden="true"></span>
                </button>
              `).join('')}
            </div>
            <button class="pill-button settings-save suite-btn" data-ai-suite-build>${icon('sparkles')} Build calendar from enabled tools</button>
          </section>
        ` : `
          <ul class="settings-bullets">
            ${feature.bullets.map((bullet) => `<li>${bullet}</li>`).join('')}
          </ul>
          <button class="pill-button settings-save suite-btn">${icon('check-circle')} Save ${feature.title}</button>
        `}
      </section>
    </section>
  `;
}

function renderSettingsPacketPage(packet) {
  return `
    <section class="settings-page settings-detail-page">
      <div class="settings-titlebar with-back">
        <button class="settings-back" data-settings-back>${icon('chevron')} Back</button>
        <h2>${packet.title}</h2>
      </div>
      <section class="settings-detail-content">
        <span class="settings-feature-icon tone-blue">${icon(packet.icon)}</span>
        <p>COACH PACKET</p>
        <h3>${packet.title}</h3>
        <span>${packet.detail}</span>
        <ul class="settings-bullets">
          <li>Prepare a print-ready version for staff</li>
          <li>Add the packet task to the selected calendar day</li>
          <li>Keep schedule, notes, and responsibilities attached</li>
        </ul>
        <button class="pill-button suite-btn-secondary" data-build-packet>${icon('calendar')} Add packet to calendar</button>
      </section>
    </section>
  `;
}

function setView(view) {
  activeView = view;
  document.body.dataset.view = view;
  document.querySelectorAll('.view-pane').forEach((pane) => pane.classList.remove('is-active'));
  document.getElementById(`${view}View`).classList.add('is-active');
  renderNav();
  renderActiveView();
  if (view === 'inbox') window.scrollTo({ top: 0, left: 0 });
}

function changeMonth(direction) {
  activeMonth += direction;
  if (activeMonth > 11) {
    activeMonth = 0;
    activeYear += 1;
  }
  if (activeMonth < 0) {
    activeMonth = 11;
    activeYear -= 1;
  }
  const totalDays = daysInMonth();
  activeDay = Math.min(activeDay, totalDays);
  selectedCalendarDay = Math.min(selectedCalendarDay, totalDays);
  renderWeek();
  renderActiveView();
}

function goToMonth(month, year, day = activeDay) {
  activeMonth = month;
  activeYear = year;
  const totalDays = daysInMonth();
  activeDay = Math.min(Math.max(Number(day) || 1, 1), totalDays);
  selectedCalendarDay = activeDay;
  renderWeek();
  renderActiveView();
}

function renderMonthPicker() {
  els.monthPickerTitle.textContent = pickerYear;
  els.monthPickerGrid.innerHTML = Array.from({ length: 12 }, (_, month) => {
    const isCurrent = month === activeMonth && pickerYear === activeYear;
    const monthTasks = tasks.filter((task) => taskMonth(task) === month && taskYear(task) === pickerYear).length;
    return `
      <button type="button" class="month-picker-cell ${isCurrent ? 'is-selected' : ''}" data-picker-month="${month}">
        <strong>${new Date(pickerYear, month, 1).toLocaleDateString('en-US', { month: 'short' })}</strong>
        <span>${monthTasks ? `${monthTasks} scheduled` : 'Open'}</span>
      </button>
    `;
  }).join('');
}

function openMonthPicker() {
  pickerYear = activeYear;
  renderMonthPicker();
  els.monthDialog.showModal();
}

function renderActiveView() {
  if (activeView === 'timeline') renderTimeline();
  if (activeView === 'inbox') renderInbox();
  if (activeView === 'calendar') renderCalendar();
  if (activeView === 'focus') renderFocus();
  if (activeView === 'packets') renderPackets();
  if (activeView === 'settings') renderSettings();
}

function render() {
  els.calendarButton.innerHTML = icon('calendar');
  els.settingsButton.innerHTML = icon('settings');
  els.newTaskButton.innerHTML = icon('plus');
  document.querySelectorAll('.close-button').forEach((button) => { button.innerHTML = icon('x'); });
  document.querySelectorAll('.event-more').forEach((button) => { button.innerHTML = icon('more'); });
  document.querySelectorAll('.event-row-arrow').forEach((span) => { span.innerHTML = icon('chevron'); });
  document.querySelectorAll('.calendar-tone').forEach((span) => { span.innerHTML = icon('calendar'); });
  document.querySelectorAll('.time-tone').forEach((span) => { span.innerHTML = icon('timer'); });
  document.querySelectorAll('.alert-tone').forEach((span) => { span.innerHTML = icon('bell'); });
  document.querySelectorAll('.player-tone').forEach((span) => { span.innerHTML = icon('user'); });
  document.querySelectorAll('.map-tone').forEach((span) => { span.innerHTML = icon('map'); });
  document.querySelectorAll('.check-tone').forEach((span) => { span.innerHTML = icon('check-circle'); });
  document.querySelectorAll('.inbox-tone').forEach((span) => { span.innerHTML = icon('inbox'); });
  document.querySelectorAll('.event-repeat span').forEach((span) => { span.innerHTML = icon('cycle'); });
  document.querySelectorAll('.event-mini-more').forEach((button) => { button.innerHTML = icon('more'); });
  renderWeek();
  renderNav();
  renderTimeline();
  renderInbox();
  renderCalendar();
  renderFocus();
  renderSettings();
  renderCalendarPlayerPicker();
  setView(activeView);
}

function openEditor(id, preset = null) {
  editingId = id || null;
  const task = tasks.find((item) => item.id === id) || preset || {
    title: '',
    day: activeDay,
    time: '15:30',
    duration: 30,
    icon: 'activity',
    notes: '',
    subtask: false,
  };
  activeDay = taskDay(task);
  selectedCalendarDay = activeDay;
  if (els.dialogTitle) els.dialogTitle.textContent = id ? 'Edit event' : 'New event';
  els.taskTitleInput.value = task.title;
  els.taskTimeInput.value = task.time;
  els.taskDurationInput.value = task.duration;
  els.taskIconInput.value = task.icon;
  els.eventNotesInput.value = task.notes || '';
  els.eventSubtaskInput.checked = !!task.subtask;
  if (els.eventPlayerInput && task.playerId) {
    selectedCalendarPlayerId = String(task.playerId);
    els.eventPlayerInput.value = selectedCalendarPlayerId;
  }
  renderCalendarPlayerPicker();
  els.taskDialog.querySelector('.event-editor')?.classList.remove('is-menu-open');
  els.deleteTaskButton.style.visibility = id ? 'visible' : 'hidden';
  updateEventEditorSummary();
  els.taskDialog.showModal();
}

function openQuickEditor(actionId) {
  const item = actionOptions.find((entry) => entry.id === actionId);
  if (!item) return;

  const quickTitles = {
    practice: 'Varsity defensive practice',
    gamePrep: 'Lincoln Prep scout prep',
    teamFunction: 'Team function reminder',
    availability: 'Player availability check',
    staffCall: 'Staff game-plan call',
    packet: 'Print daily coach packet',
    film: 'Team film session',
  };
  quickActionDraft = {
    title: quickTitles[item.id] || item.title,
    day: activeDay,
    time: item.time,
    duration: item.duration,
    icon: item.icon,
    repeat: item.repeat,
    type: item.type,
  };

  const end = toTime(minutes(item.time) + item.duration);
  els.quickActionIcon.innerHTML = icon(item.icon);
  els.quickActionKicker.textContent = item.type.toUpperCase();
  els.quickActionTitle.textContent = quickActionDraft.title;
  els.quickActionDate.textContent = dayLabel(activeDay);
  els.quickActionTime.textContent = displayRange(item.time, end);
  els.quickActionDuration.textContent = durationText(item.duration);
  els.quickActionDetail.textContent = item.repeat;
  els.quickActionSave.textContent = item.title.startsWith('Add') ? item.title : `Add ${item.title}`;
  els.quickActionDialog.showModal();
}

function saveQuickAction() {
  if (!quickActionDraft) return;
  if (!scheduleTask(quickActionDraft, { goToCalendar: false })) return;
  quickActionDraft = null;
  els.quickActionDialog.close();
  renderActiveView();
}

function saveTask() {
  const payload = {
    title: els.taskTitleInput.value.trim() || 'New coach event',
    day: activeDay,
    time: els.taskTimeInput.value || '15:30',
    duration: Number(els.taskDurationInput.value),
    icon: els.taskIconInput.value,
    repeat: 'Manual',
    type: 'Manual',
    notes: els.eventNotesInput.value.trim(),
    subtask: els.eventSubtaskInput.checked,
    ...selectedPlayerPayload(),
  };
  if (editingId) {
    Object.assign(tasks.find((item) => item.id === editingId), payload);
    selectedCalendarDay = activeDay;
    els.taskDialog.close();
    renderActiveView();
    return;
  } else {
    if (!scheduleTask(payload, { goToCalendar: false })) return;
  }
  els.taskDialog.close();
  selectedCalendarDay = activeDay;
  renderActiveView();
}

function deleteTask() {
  if (!editingId) return;
  const index = tasks.findIndex((task) => task.id === editingId);
  if (index >= 0) tasks.splice(index, 1);
  els.taskDialog.close();
  renderActiveView();
}

function duplicateEventFromEditor() {
  const payload = {
    title: `${els.taskTitleInput.value.trim() || 'New coach event'} copy`,
    day: activeDay,
    time: els.taskTimeInput.value || '15:30',
    duration: Number(els.taskDurationInput.value),
    icon: els.taskIconInput.value,
    repeat: 'Duplicated from event menu',
    type: 'Manual',
    notes: els.eventNotesInput.value.trim(),
    subtask: els.eventSubtaskInput.checked,
  };
  scheduleTask(payload, { goToCalendar: false });
  els.taskDialog.close();
}

function moveEventToInbox() {
  inbox.unshift({
    id: crypto.randomUUID(),
    title: els.taskTitleInput.value.trim() || 'New coach event',
    duration: Number(els.taskDurationInput.value || 30),
    icon: els.taskIconInput.value || 'activity',
    capture: els.eventNotesInput.value.trim() || 'Moved from calendar event.',
  });
  if (editingId) {
    const index = tasks.findIndex((task) => task.id === editingId);
    if (index >= 0) tasks.splice(index, 1);
  }
  els.taskDialog.close();
  setView('inbox');
}

function syncAiDraft() {
  const input = document.getElementById('aiShotInput') || document.getElementById('aiDraftInput');
  if (input) aiDraft = input.value.trim() || aiDraft;
}

function buildCoachScheduleFromAi() {
  syncAiDraft();
  aiPromptExpanded = false;
  plannerMode = 'ai';
  if (/move|hour later|1h/i.test(aiDraft)) {
    tasks
      .filter((task) => taskDay(task) === selectedCalendarDay)
      .forEach((task) => {
        task.time = toTime(minutes(task.time) + 60);
        task.repeat = 'Moved one hour later by Coach AI';
      });
  } else {
    applySuiteAutomation({ goToCalendar: false });
  }
  setView('calendar');
}

function scheduleInbox(id) {
  const index = inbox.findIndex((task) => task.id === id);
  if (index < 0) return;
  const task = inbox.splice(index, 1)[0];
  const last = [...tasks].sort((a, b) => minutes(a.time) - minutes(b.time)).at(-1);
  const nextStart = last ? toTime(minutes(last.time) + Number(last.duration)) : '11:00';
  scheduleTask({
    title: task.title,
    day: selectedCalendarDay,
    time: nextStart,
    duration: task.duration,
    icon: task.icon,
    repeat: 'Scheduled from Inbox',
  });
}

function addInboxTask() {
  inbox.unshift({ id: crypto.randomUUID(), title: 'New coach note', duration: 20, icon: 'list', capture: 'Unscheduled' });
  renderActiveView();
}

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-event-menu]')) {
    event.preventDefault();
    els.taskDialog.querySelector('.event-editor')?.classList.toggle('is-menu-open');
    return;
  }

  if (event.target.closest('[data-event-duplicate]')) {
    event.preventDefault();
    duplicateEventFromEditor();
    return;
  }

  if (event.target.closest('[data-event-inbox]')) {
    event.preventDefault();
    moveEventToInbox();
    return;
  }

  if (event.target.closest('[data-complete-current]')) {
    event.preventDefault();
    if (editingId) {
      const task = tasks.find((item) => item.id === editingId);
      if (task) task.complete = !task.complete;
      event.target.closest('[data-complete-current]')?.classList.toggle('is-complete', !!task?.complete);
      renderActiveView();
    } else {
      event.target.closest('[data-complete-current]')?.classList.toggle('is-complete');
    }
    return;
  }

  const timeOption = event.target.closest('[data-time-option]');
  if (timeOption) {
    event.preventDefault();
    els.taskTimeInput.value = timeOption.dataset.timeOption;
    document.querySelectorAll('[data-time-option]').forEach((button) => button.classList.toggle('is-selected', button === timeOption));
    updateEventEditorSummary();
    return;
  }

  const durationOption = event.target.closest('[data-duration-option]');
  if (durationOption) {
    event.preventDefault();
    els.taskDurationInput.value = durationOption.dataset.durationOption;
    document.querySelectorAll('[data-duration-option]').forEach((button) => button.classList.toggle('is-selected', button === durationOption));
    updateEventEditorSummary();
    return;
  }

  if (event.target.closest('[data-all-day-toggle]')) {
    event.preventDefault();
    els.taskTimeInput.value = '08:00';
    els.taskDurationInput.value = '480';
    updateEventEditorSummary();
    return;
  }

  const day = event.target.closest('[data-day]');
  if (day) {
    activeDay = Number(day.dataset.day);
    selectedCalendarDay = activeDay;
    renderWeek();
    renderActiveView();
  }

  const monthNav = event.target.closest('[data-month-nav]');
  if (monthNav) {
    changeMonth(Number(monthNav.dataset.monthNav));
  }

  const yearNav = event.target.closest('[data-year-nav]');
  if (yearNav) {
    pickerYear += Number(yearNav.dataset.yearNav);
    renderMonthPicker();
  }

  const pickerMonth = event.target.closest('[data-picker-month]');
  if (pickerMonth) {
    goToMonth(Number(pickerMonth.dataset.pickerMonth), pickerYear, selectedCalendarDay);
    els.monthDialog.close();
    setView('calendar');
    return;
  }

  if (event.target.closest('[data-picker-today]')) {
    const today = new Date();
    goToMonth(today.getMonth(), today.getFullYear(), today.getDate());
    els.monthDialog.close();
    setView('calendar');
    return;
  }

  const viewButton = event.target.closest('[data-view]');
  if (viewButton) {
    if (viewButton.dataset.view === 'settings') selectedSettingsFeatureId = null;
    setView(viewButton.dataset.view);
  }

  const modeButton = event.target.closest('[data-mode]');
  if (modeButton) {
    syncAiDraft();
    plannerMode = modeButton.dataset.mode;
    if (plannerMode === 'ai') {
      applySuiteAutomation({ goToCalendar: false });
      return;
    }
    renderActiveView();
  }

  if (event.target.closest('[data-voice]')) {
    syncAiDraft();
    plannerMode = 'ai';
    voiceListening = !voiceListening;
    renderActiveView();
  }

  if (event.target.closest('[data-ai-sample]')) {
    plannerMode = 'ai';
    aiPromptExpanded = true;
    aiDraft = 'Can you move plans today to be an hour later.';
    renderActiveView();
  }

  if (event.target.closest('[data-ai-add-detail]')) {
    aiPromptExpanded = true;
    aiDraft = 'Can you move plans today to be an hour later. Keep the same order and notify staff.';
    renderActiveView();
  }

  if (event.target.closest('[data-ai-build]')) buildCoachScheduleFromAi();

  const complete = event.target.closest('[data-complete]');
  if (complete) {
    const task = tasks.find((item) => item.id === complete.dataset.complete);
    task.complete = !task.complete;
    task.manualStatus = true;
    renderActiveView();
  }

  const edit = event.target.closest('[data-edit]');
  if (edit) openEditor(edit.dataset.edit);

  const taskCopy = event.target.closest('.task-copy');
  if (taskCopy) {
    const row = taskCopy.closest('[data-task]');
    if (row) openEditor(row.dataset.task);
  }

  const inboxButton = event.target.closest('[data-inbox]');
  if (inboxButton) scheduleInbox(inboxButton.dataset.inbox);

  if (event.target.closest('[data-inbox-toggle]')) {
    inboxLaneOpen = !inboxLaneOpen;
    if (activeView === 'timeline') renderTimeline();
    if (activeView === 'inbox') renderInbox();
  }

  if (event.target.closest('[data-add-inbox]')) addInboxTask();

  const calendarDay = event.target.closest('[data-calendar-day]');
  if (calendarDay) {
    selectedCalendarDay = Number(calendarDay.dataset.calendarDay);
    activeDay = selectedCalendarDay;
    renderWeek();
    renderCalendar();
  }

  const agenda = event.target.closest('[data-agenda]');
  if (agenda) {
    const task = tasks.find((item) => item.id === agenda.dataset.agenda);
    if (task) {
      activeDay = taskDay(task);
      selectedCalendarDay = activeDay;
      openEditor(task.id);
    }
  }

  const focusButton = event.target.closest('[data-focus]');
  if (focusButton) {
    const block = focusBlocks[Number(focusButton.dataset.focus)];
    block.enabled = !block.enabled;
    renderFocus();
  }

  const focusDetail = event.target.closest('[data-focus-detail]');
  if (focusDetail && !event.target.closest('[data-focus]')) {
    const block = focusBlocks[Number(focusDetail.dataset.focusDetail)];
    block.enabled = !block.enabled;
    renderFocus();
  }

  const availabilityModeButton = event.target.closest('[data-availability-mode]');
  if (availabilityModeButton) {
    availabilityMode = availabilityModeButton.dataset.availabilityMode;
    renderFocus();
  }

  if (event.target.closest('[data-player-back]')) {
    selectedPlayerIndex = null;
    renderFocus();
  }

  const playerDetail = event.target.closest('[data-player-detail]');
  if (playerDetail) {
    selectedPlayerIndex = Number(playerDetail.dataset.playerDetail);
    renderFocus();
  }

  const playerStatus = event.target.closest('[data-player-status]');
  if (playerStatus) {
    const player = availabilityPlayers[Number(playerStatus.dataset.playerStatus)];
    const flow = ['pending', 'yes', 'late', 'limited', 'out'];
    const next = flow[(flow.indexOf(player.status) + 1) % flow.length];
    player.status = next;
    const statusText = {
      yes: 'Confirmed for the next team event.',
      late: 'Arriving late. Coach should adjust groups.',
      limited: 'Limited availability. Keep contact controlled.',
      pending: 'No reply yet. Needs another reminder.',
      out: 'Unavailable for the next team event.',
    };
    player.lastReply = statusText[next];
    renderFocus();
  }

  if (event.target.closest('[data-send-availability]')) {
    scheduleTask({
      title: availabilityMode === 'ai' ? 'AI availability check sent' : 'Manual availability check sent',
      day: selectedCalendarDay,
      time: '14:45',
      duration: 15,
      icon: 'users',
      repeat: availabilityMode === 'ai' ? 'Calendar-driven player notifications' : 'Coach sent roster check',
      type: 'Availability',
    });
    showDetail(
      'AVAILABILITY',
      availabilityMode === 'ai' ? 'AI checks scheduled' : 'Roster check sent',
      availabilityMode === 'ai'
        ? 'Coach AI will send player availability checks for practices, games, and team events from the calendar.'
        : 'The roster check was added to the calendar timeline. Players marked pending still need a follow-up.'
    );
  }

  if (event.target.closest('[data-ai-availability]')) {
    availabilityMode = 'ai';
    scheduleTask({
      title: 'Player availability deadline',
      day: selectedCalendarDay,
      time: '14:45',
      duration: 15,
      icon: 'bell',
      repeat: 'AI follows calendar events',
      type: 'Availability',
    });
    renderFocus();
  }

  if (event.target.closest('[data-reminders]')) {
    remindersEnabled = !remindersEnabled;
    renderFocus();
  }

  const setting = event.target.closest('[data-settings]');
  if (setting) {
    selectedPacketIndex = Number(setting.dataset.settings);
    selectedSettingsFeatureId = `packet:${selectedPacketIndex}`;
    renderSettings();
  }

  const packetOption = event.target.closest('[data-packet-option]');
  if (packetOption) {
    selectedPacketIndex = Number(packetOption.dataset.packetOption);
    selectedPacketDetailIndex = selectedPacketIndex;
    renderPackets();
  }

  if (event.target.closest('[data-packet-back]')) {
    selectedPacketDetailIndex = null;
    renderPackets();
    return;
  }

  if (event.target.closest('[data-settings-back]')) {
    selectedSettingsFeatureId = null;
    renderSettings();
    return;
  }

  const settingsFeature = event.target.closest('[data-settings-feature]');
  if (settingsFeature) {
    selectedSettingsFeatureId = settingsFeature.dataset.settingsFeature;
    renderSettings();
    return;
  }

  if (event.target.closest('[data-build-packet]')) {
    const packet = settingsRows[selectedPacketIndex] || settingsRows[0];
    scheduleTask({
      title: packet.title,
      day: selectedCalendarDay,
      time: '08:30',
      duration: 20,
      icon: packet.icon,
      repeat: 'Printable packet ready',
      type: 'Packet',
    });
    showDetail('PACKET READY', packet.title, 'The packet was added to the selected calendar day as a printable coach packet.');
  }

  if (event.target.closest('[data-packet-print]')) {
    document.body.classList.add('packet-print-mode');
    window.print();
  }

  const quickButton = event.target.closest('[data-quick]');
  if (quickButton) {
    openQuickEditor(quickButton.dataset.quick);
  }

  const actionOption = event.target.closest('[data-action-option]');
  if (actionOption) {
    const id = actionOption.dataset.actionOption;
    if (selectedQuickActions.includes(id)) {
      if (selectedQuickActions.length > 1) {
        selectedQuickActions = selectedQuickActions.filter((item) => item !== id);
      }
    } else {
      selectedQuickActions = [...selectedQuickActions, id].slice(-3);
    }
    renderSettings();
    return;
  }

  const suiteToggle = event.target.closest('[data-suite-toggle]');
  if (suiteToggle) {
    const id = suiteToggle.dataset.suiteToggle;
    selectedSettingsFeatureId = 'suiteConnections';
    if (suiteConnectionIds.includes(id)) {
      suiteConnectionIds = suiteConnectionIds.filter((item) => item !== id);
    } else {
      suiteConnectionIds = [...suiteConnectionIds, id];
    }
    renderSettings();
    return;
  }

  if (event.target.closest('[data-ai-suite-build]')) {
    plannerMode = 'ai';
    applySuiteAutomation({ goToCalendar: true });
    return;
  }
});

els.newTaskButton.addEventListener('click', () => openEditor());
els.calendarButton.addEventListener('click', openMonthPicker);
els.settingsButton.addEventListener('click', () => {
  selectedSettingsFeatureId = null;
  setView('settings');
});
els.saveTaskButton.addEventListener('click', saveTask);
els.deleteTaskButton.addEventListener('click', deleteTask);
els.taskTitleInput.addEventListener('input', updateEventEditorSummary);
els.taskTimeInput.addEventListener('input', updateEventEditorSummary);
els.taskDurationInput.addEventListener('change', updateEventEditorSummary);
els.taskIconInput.addEventListener('change', updateEventEditorSummary);
els.eventPlayerInput?.addEventListener('change', () => {
  selectedCalendarPlayerId = els.eventPlayerInput.value || null;
});
els.quickActionSave.addEventListener('click', saveQuickAction);
window.addEventListener('afterprint', () => {
  document.body.classList.remove('packet-print-mode');
});

render();

/* Swap the empty first paint for the team's REAL schedule. On a 401 / offline
   load, SuiteCalendarData.load() resolves { ok:false, tasks:[] }, so we simply
   keep the empty state — we never re-seed fake data. */
function bootCalendarData() {
  if (!window.SuiteCalendarData || typeof window.SuiteCalendarData.load !== 'function') return;
  window.SuiteCalendarData.load().then((result) => {
    const loaded = (result && Array.isArray(result.tasks)) ? result.tasks : [];
    tasks.length = 0;
    loaded.forEach((task) => tasks.push(task));
    // Focus the calendar on the first real event so the month grid isn't blank.
    // loaded is already chronological (calendar-data.js sorts it).
    if (loaded.length) {
      const first = loaded[0];
      activeYear = Number(first.year);
      activeMonth = Number(first.month);
      activeDay = Number(first.day);
      selectedCalendarDay = activeDay;
      pickerYear = activeYear;
    }
    render();
  });
}

function bootCalendarContext() {
  if (typeof fetch !== 'function') return Promise.resolve();
  return fetch('/api/auth/me', { credentials: 'include', headers: { Accept: 'application/json' } })
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => {
      const user = json && json.user ? json.user : null;
      calendarRole = user && user.role === 'trainer' ? 'trainer' : 'player';
      if (calendarRole !== 'trainer') {
        calendarPlayers = [];
        selectedCalendarPlayerId = null;
        renderCalendarPlayerPicker();
        return null;
      }
      return fetch('/api/users/all-players', { credentials: 'include', headers: { Accept: 'application/json' } })
        .then((res) => (res.ok ? res.json() : null))
        .then((playersJson) => {
          calendarPlayers = playersJson && Array.isArray(playersJson.players) ? playersJson.players : [];
          if (!selectedCalendarPlayerId && calendarPlayers[0]) selectedCalendarPlayerId = String(calendarPlayers[0].id);
          renderCalendarPlayerPicker();
        });
    })
    .catch(() => {
      calendarRole = 'player';
      calendarPlayers = [];
      selectedCalendarPlayerId = null;
      renderCalendarPlayerPicker();
    });
}

bootCalendarContext().then(render);
bootCalendarData();

setInterval(() => {
  if (activeView === 'timeline') renderTimeline();
}, 60000);
