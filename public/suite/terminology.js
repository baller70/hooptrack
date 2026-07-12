/*
 * Suite terminology dictionary — the single source of truth for coach ↔ trainer
 * wording (GLOBAL_SETTINGS_SPEC §5/§6). Plain UMD so it works three ways with
 * NO bundler:
 *   - static apps: <script src="/suite/terminology.js"></script> → window.SuiteTerminology
 *   - Next.js:     import SuiteTerminology from '@/public/suite/terminology'
 *   - Node/jest:   require('.../terminology')
 *
 * Features look up KEYS, never hardcode a word that differs by mode:
 *   var terms = SuiteTerminology.create(session.roleMode, session.terminologyOverrides);
 *   terms.t('practicePlan');            // "Practice Plan" | "Session Plan"
 *   terms.apply(document);              // fills [data-term] / [data-term-attr]
 *
 * Resolution order: per-team override → mode dictionary → coach dictionary →
 * caller fallback → the key itself (never blank).
 */
(function (root, factory) {
  var api = factory()
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  // Guard the browser-global assignment: during Next SSR / Node import there is no
  // `self`/`window`, and module top-level `this` is undefined — `root` would be
  // undefined and this line threw ('Cannot set properties of undefined'). The
  // CommonJS `module.exports` above is what the Next/Node side actually imports.
  if (root) root.SuiteTerminology = api
})(typeof self !== 'undefined' ? self : typeof globalThis !== 'undefined' ? globalThis : null, function () {
  'use strict'

  // §6 seed table. Every key MUST exist in both dictionaries (jest parity test).
  var DICT = {
    coach: {
      org: 'Team',
      team: 'Team',
      player: 'Player',
      players: 'Players',
      roster: 'Roster',
      practice: 'Practice',
      practices: 'Practices',
      practicePlan: 'Practice Plan',
      practiceNumber: 'Practice number',
      coach: 'Coach',
      coaches: 'Coaches',
      staff: 'Staff',
      coachNotes: 'Coach notes',
      coachingPoints: 'Coaching points',
      addToPractice: 'Add to Practice Plan',
      group: 'Group',
      groupDefault: 'Varsity',
      focusDefault: 'Team Execution',
      playGenerator: 'Play Generator',
      createPlay: 'Create a Play',
      describePlay: 'Describe your play…',
      generatePlay: 'Generate play',
      playbook: 'Playbook',
      evaluation: 'Evaluation',
      developmentPlan: 'Development Plan',
      parent: 'Parent',
      opponent: 'Opponent',
      game: 'Game',
      scouting: 'Scouting',
      recruiting: 'Recruiting',
      leaderboard: 'Leaderboards',
      film: 'Film & Video',
      watchList: 'Coach Watch List',
      calendarTitle: 'Coach Planner',
      huddle: 'Huddle and standard review',
    },
    trainer: {
      org: 'Training business',
      team: 'Training group',
      player: 'Athlete',
      players: 'Athletes',
      roster: 'Client list',
      practice: 'Session',
      practices: 'Sessions',
      practicePlan: 'Session Plan',
      practiceNumber: 'Session number',
      coach: 'Trainer',
      coaches: 'Trainers',
      staff: 'Trainers',
      coachNotes: 'Trainer notes',
      coachingPoints: 'Training cues',
      addToPractice: 'Add to session',
      group: 'Session group',
      groupDefault: 'Small group',
      focusDefault: 'Skill Development',
      playGenerator: 'Drill Generator',
      createPlay: 'Design a Drill',
      describePlay: 'Describe your drill…',
      generatePlay: 'Generate drill',
      playbook: 'Drill library',
      evaluation: 'Assessment',
      developmentPlan: 'Training Plan',
      parent: 'Client contact',
      opponent: 'Opponent',
      game: 'Live session',
      scouting: 'Prospect research',
      recruiting: 'Client acquisition',
      leaderboard: 'Progress boards',
      film: 'Session video',
      watchList: 'Trainer Watch List',
      calendarTitle: 'Session Planner',
      huddle: 'Debrief and review',
    },
  }

  function normalizeMode(mode) {
    return String(mode).toLowerCase() === 'trainer' ? 'trainer' : 'coach'
  }

  /**
   * Build a terminology resolver bound to a mode + per-team overrides.
   * @param {string} mode  'coach' | 'trainer' (case-insensitive; anything else → coach)
   * @param {Object} [overrides]  { termKey: 'Custom label' }
   */
  function create(mode, overrides) {
    var resolved = normalizeMode(mode)
    var base = DICT[resolved]
    var o = overrides && typeof overrides === 'object' ? overrides : {}

    /**
     * Resolve a term. `fallback` (optional) sits between the coach dictionary and
     * the raw key, so a caller can supply its own default while still never
     * returning blank.
     */
    function t(key, fallback) {
      if (o[key] != null) return o[key]
      if (base[key] != null) return base[key]
      if (DICT.coach[key] != null) return DICT.coach[key]
      if (fallback != null) return fallback
      return key
    }

    /**
     * Declarative binding for static HTML.
     *   <span data-term="practicePlan"></span>              → textContent
     *   <input data-term-attr="placeholder:describePlay">   → attribute(s), comma-separated
     */
    function apply(rootEl) {
      var el = rootEl || (typeof document !== 'undefined' ? document : null)
      if (!el || typeof el.querySelectorAll !== 'function') return
      var i, nodes

      nodes = el.querySelectorAll('[data-term]')
      for (i = 0; i < nodes.length; i++) {
        nodes[i].textContent = t(nodes[i].getAttribute('data-term'))
      }

      nodes = el.querySelectorAll('[data-term-attr]')
      for (i = 0; i < nodes.length; i++) {
        var spec = nodes[i].getAttribute('data-term-attr') || ''
        var pairs = spec.split(',')
        for (var j = 0; j < pairs.length; j++) {
          var parts = pairs[j].split(':')
          if (parts.length === 2) {
            var attr = parts[0].trim()
            var key = parts[1].trim()
            if (attr && key) nodes[i].setAttribute(attr, t(key))
          }
        }
      }
    }

    return { t: t, apply: apply, mode: resolved }
  }

  // Default active instance for the top-level convenience `t` (overwritten by install()).
  var active = create('coach')

  return {
    DICT: DICT,
    KEYS: Object.keys(DICT.coach),
    create: create,
    /**
     * Convenience: `SuiteTerminology.t('practicePlan', 'Practice Plan')` resolves
     * against the last-installed instance (defaults to coach). Static apps that
     * only need one global set of terms can install once at boot and call this.
     */
    t: function (key, fallback) {
      return active.t(key, fallback)
    },
    /** Set the instance used by the top-level `t`; returns it. */
    install: function (mode, overrides) {
      active = create(mode, overrides)
      return active
    },
  }
})
