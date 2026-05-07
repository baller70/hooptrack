import { spawn } from 'child_process'

const CLAUDE_PATH = process.env.CLAUDE_CLI_PATH || '/usr/bin/claude'

async function claudeChat(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(CLAUDE_PATH, ['-p', '--output-format', 'text'], {
      timeout: 120000,
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString() })
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString() })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim())
      } else {
        reject(new Error(stderr || `Claude CLI exited with code ${code}`))
      }
    })

    proc.on('error', reject)

    proc.stdin.write(prompt)
    proc.stdin.end()
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function claudeJSON(prompt: string): Promise<any> {
  const raw = await claudeChat(prompt + '\n\nYou MUST respond with ONLY valid JSON. No markdown, no code fences, no backticks, no explanation. Output starts with { and ends with }. Use straight double quotes only, no smart quotes. Keep string values short (under 200 chars each).')
  // Strip markdown fences, leading/trailing text
  let cleaned = raw.replace(/^```(?:json)?\s*/gm, '').replace(/\s*```$/gm, '').trim()
  // Find the first { and last } to extract JSON
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1)
  }
  // Fix smart quotes and other common issues
  cleaned = cleaned
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/\t/g, ' ')

  try {
    return JSON.parse(cleaned)
  } catch (e) {
    // Try to fix trailing commas
    const fixed = cleaned.replace(/,\s*([\]}])/g, '$1')
    return JSON.parse(fixed)
  }
}

export async function generateWorkout(params: {
  playerName: string
  skillLevel: 'beginner' | 'intermediate' | 'advanced'
  focusAreas: string[]
  duration: number
}) {
  return claudeJSON(
    `You are an elite basketball trainer. Create a ${params.duration}-minute basketball workout for ${params.playerName} (${params.skillLevel} level). Focus areas: ${params.focusAreas.join(', ')}.

Return JSON: { "title": string, "description": string, "category": string, "drills": [{ "name": string, "description": string, "category": string, "duration_seconds": number }] }`
  )
}

export async function generateCoachFeedback(params: {
  playerName: string
  drillName: string
  drillCategory: string
  duration: number
  targetDuration: number
  previousAttempts?: number
}) {
  return claudeChat(
    `You are an encouraging but honest basketball coach. Give specific, actionable feedback. Keep it to 2-3 sentences. Be motivating.

Player: ${params.playerName}
Drill: ${params.drillName} (${params.drillCategory})
Time spent: ${params.duration}s (target was ${params.targetDuration}s)
${params.previousAttempts ? `Previous attempts: ${params.previousAttempts}` : 'First attempt'}

Give coaching feedback.`
  )
}

const POSITION_LENS: Record<string, string> = {
  point_guard: "a Point Guard. Use scenarios specific to the role: pick-and-roll reads, shot-clock pressure, ball-handling vs. tight defense, transition decision-making, and orchestrating offense.",
  shooting_guard: "a Shooting Guard. Use scenarios specific to the role: coming off down screens, catch-and-shoot reads, closeouts, off-ball cuts, and secondary ball-handling.",
  small_forward: "a Small Forward. Use scenarios specific to the role: mid-range pull-ups, transition wings, switching defenses, slashing to the rim, and wing isolation reads.",
  power_forward: "a Power Forward. Use scenarios specific to the role: ball-screen actions, short-roll passing, mid-post entries, rebounding angles, and weak-side help defense.",
  center: "a Center. Use scenarios specific to the role: rim protection, post-ups, drop coverage vs. switching, screen-and-roll finishing, and defensive rotations.",
}

const SITUATION_LENS: Record<string, string> = {
  late_game: "Every question is set in late-game situations (final 2 minutes, score within 5 points).",
  transition: "Every question takes place in transition (after a defensive rebound, steal, or made basket).",
  half_court_offense: "Every question is in a half-court offensive set (after the defense is set).",
  sideline_oob: "Every question is a sideline out-of-bounds situation.",
  press_break: "Every question involves breaking a full-court press.",
  zone_offense: "Every question is against a zone defense (2-3, 3-2, or 1-3-1).",
}

export async function generateQuiz(params: {
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  questionCount: number
  position?: string
  gameSituation?: string
}) {
  const positionLine = params.position && params.position !== 'any' && POSITION_LENS[params.position]
    ? `\n\nFrame all scenarios from the perspective of ${POSITION_LENS[params.position]}`
    : ''
  const situationLine = params.gameSituation && params.gameSituation !== 'any' && SITUATION_LENS[params.gameSituation]
    ? `\n\n${SITUATION_LENS[params.gameSituation]}`
    : ''

  return claudeJSON(
    `You are a basketball IQ coach. Generate a ${params.difficulty} difficulty basketball quiz about "${params.topic}" with ${params.questionCount} questions.

Return JSON: { "title": string, "questions": [{ "question_text": string, "options": [string, string, string, string], "correct_answer": string }] }

Make questions scenario-based (e.g. "You're bringing the ball up court and the shot clock shows 8 seconds. The defender is playing tight. What do you do?")${positionLine}${situationLine}`
  )
}

const INSPIRATION_THEMES = [
  // Hard work / grind
  'putting in extra hours when nobody is watching',
  'doing the reps other players skip',
  'how small daily effort compounds into a big edge over time',
  'the gap between players who grind and players who coast',
  'showing up on the days you do not feel like it',
  'being head and shoulders better through volume of practice',
  'skill comes from boring repetition, not flash',
  'every shot, every dribble, every rep matters',
  'patience and consistency over months and years',
  'choosing the harder right over the easier wrong',
  'nobody is born great — they earn it in private',
  'the scoreboard rewards what you did in the off-season',
  // Self-belief / inner confidence / faith
  'believing in yourself with all your might',
  'do not let anyone deter you from your dreams or who you can become',
  'the inner voice that says "I belong on this floor"',
  'silencing the doubters — including the one inside your own head',
  'faith that the work will pay off, even when the result is not visible yet',
  'seeing yourself as the player you want to become before anyone else does',
  'the calm, unshakeable confidence of someone who knows what they put in',
  'protecting your dream from people who do not see what you see',
  'walking onto the court like the gym belongs to you',
  'self-trust — the bedrock of every clutch shot',
  'when fear and doubt show up, choose belief instead',
  'your dreams are worth more than other people\'s opinions',
]

const INSPIRATION_ANGLES = [
  'reference a specific basketball legend (Kobe, Jordan, Curry, LeBron, Maravich, Iverson, Dirk, Larry Bird) and one specific habit they had',
  'use a hours / time math angle — concrete numbers that show how investment compounds',
  'contrast the player with peers who are taking shortcuts or skipping the work',
  'frame it as a long-term identity choice — the kind of player they are choosing to become',
  'use a sharp, no-nonsense drill-sergeant voice',
  'use a calm, mentor voice that reminds them why they started',
  'frame around outworking talent — the harder worker beats the more talented player',
  'speak to them right before practice when their motivation is low',
  'speak to them when self-doubt is loud — affirm their belief in themselves',
  'use a quiet, confident faith voice — the kind a parent or coach uses to say "I see you"',
  'frame around the inner game — confidence as a skill they train, just like a jump shot',
  'frame around the people who do not believe in them — and why that does not matter',
]

export async function generateInspirationalMessage(playerName: string) {
  const theme = INSPIRATION_THEMES[Math.floor(Math.random() * INSPIRATION_THEMES.length)]
  const angle = INSPIRATION_ANGLES[Math.floor(Math.random() * INSPIRATION_ANGLES.length)]
  const salt = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  return claudeChat(
    `You are a motivational basketball coach writing for a youth player. Write ONE fresh, original message for ${playerName} that they have NEVER heard before — no clichés like "the only way to do great work is to love what you do".

Theme to riff on: ${theme}
Voice / angle: ${angle}

Hard rules:
- 1 to 2 sentences only.
- Address ${playerName} by first name once.
- No emojis. No hashtags.
- Make it about putting in the work, the hours, doing what others won't, and the payoff that comes from that.
- Be specific. Use concrete imagery (early gym, empty court, late nights, the drill nobody else does, etc.) — not vague slogans.
- Do not repeat phrasing from the most overused basketball quotes. Surprise them.
- Do not start with "Remember", "Champions", "Hard work", or "The only way".

Output only the message text. Nothing else. No quotes around it.

(seed: ${salt})`
  )
}

export async function generateMoveRecommendations(params: {
  playerName: string
  skillLevel: string
  recentDrills: string[]
  weakAreas: string[]
}) {
  return claudeJSON(
    `You are a basketball skills development coach. Recommend specific moves for a player to study.

Player: ${params.playerName} (${params.skillLevel})
Recent drills: ${params.recentDrills.length > 0 ? params.recentDrills.join(', ') : 'None yet'}
Areas to improve: ${params.weakAreas.length > 0 ? params.weakAreas.join(', ') : 'All areas - new player'}

Recommend 3-5 moves they should study. For each, provide a YouTube search query that would find good tutorial videos.

Return JSON: { "recommendations": [{ "title": string, "category": string, "description": string, "youtube_search": string, "why": string }] }`
  )
}

export async function analyzePlayerProgress(params: {
  playerName: string
  totalRecordings: number
  categoryCounts: Record<string, number>
  streakDays: number
  quizAverage: number
  totalHours?: number
  hoursPerSubject?: Record<string, number>
  gradesBySubject?: Record<string, string>
  weakestSubjects?: string[]
  strongestSubjects?: string[]
}) {
  const gradeLine = params.gradesBySubject
    ? `\nLetter grades by subject: ${JSON.stringify(params.gradesBySubject)}`
    : ''
  const hoursLine = params.totalHours != null
    ? `\nTotal hours practiced: ${params.totalHours}`
    : ''
  const subjectHoursLine = params.hoursPerSubject
    ? `\nHours per subject: ${JSON.stringify(params.hoursPerSubject)}`
    : ''
  const focusLine = params.weakestSubjects?.length
    ? `\nWeakest subjects (need encouragement + specific advice): ${params.weakestSubjects.join(', ')}`
    : ''
  const strongLine = params.strongestSubjects?.length
    ? `\nStrongest subjects (celebrate): ${params.strongestSubjects.join(', ')}`
    : ''

  return claudeJSON(
    `You are a basketball development coach writing a school-style progress report for a youth basketball player. The audience is a kid in 3rd through 12th grade. Be encouraging, specific, and use plain language. No emojis. Talk to them in HOURS — concrete time investments.

Player: ${params.playerName}
Total recordings: ${params.totalRecordings}
Current streak: ${params.streakDays} days
Quiz average score: ${params.quizAverage}%
Drill breakdown by category: ${JSON.stringify(params.categoryCounts)}${gradeLine}${hoursLine}${subjectHoursLine}${strongLine}${focusLine}

Return JSON:
{
  "summary": string (2-3 sentences, warm but real, name-checks the player by first name),
  "strengths": [string] (2-4 short bullet observations on what they're crushing),
  "areas_to_improve": [string] (2-4 short bullets, framed constructively, name the subject),
  "next_steps": [string] (2-4 concrete, hours-based actions like "Add 30 minutes a day on shooting for 2 weeks"),
  "motivation_level": "high"|"medium"|"low"
}`
  )
}
