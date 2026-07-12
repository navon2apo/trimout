// Generated from KICKO's canonical Scout Mode configuration.
// Keep this English-only snapshot versioned so TrimOut also works offline.
const KICKO_SCOUT_CATALOG = {
  version: 'kicko-scout-2026-07-12',
  actions: [
    {
      id: 'goal',
      label: 'Goal',
      helper: 'Quality finish',
      color: '#ffc81e',
      iqGuidance: {
        hint: 'Keep the movement that creates the finish.',
        detail: 'Start before the final pass or run. Keep the finish and the player’s immediate reaction after it.',
      },
    },
    {
      id: 'assist',
      label: 'Assist',
      helper: 'Creating a chance for a teammate',
      color: '#00dcff',
      iqGuidance: {
        hint: 'Show what the player sees before the final pass.',
        detail: 'Keep the scan, the space being recognized, the pass itself and the next supporting movement.',
      },
    },
    {
      id: 'free_kick',
      label: 'Free kick',
      helper: 'Threat on goal',
      color: '#ffc81e',
      iqGuidance: {
        hint: 'Keep the setup, strike and immediate outcome.',
        detail: 'Begin once the situation is clear. End after the goalkeeper, rebound or transition response can be seen.',
      },
    },
    {
      id: 'header',
      label: 'Header',
      helper: 'Heading finish / aerial duel',
      color: '#ff3c3c',
      iqGuidance: {
        hint: 'Show the positioning before the aerial action.',
        detail: 'Keep the starting position, timing of the movement, aerial action and recovery or second action.',
      },
    },
    {
      id: 'deep_pass',
      label: 'Through ball',
      helper: 'Vision, breaking the line',
      color: '#00dcff',
      iqGuidance: {
        hint: 'Show the scan that happens before the pass.',
        detail: 'Start before the player receives or looks up. Keep the body shape, line-breaking pass and next supporting movement.',
      },
    },
    {
      id: 'reception_pressure',
      label: 'Under pressure',
      helper: 'First touch, composure',
      color: '#aef2ff',
      iqGuidance: {
        hint: 'Keep the scan and body shape before the first touch.',
        detail: 'Start before the ball arrives. Show the pressure, first touch, decision and how the player exits or connects the play.',
      },
    },
    {
      id: 'dribble',
      label: 'Dribble / 1v1',
      helper: 'Beating a defender',
      color: '#00dcff',
      iqGuidance: {
        hint: 'Keep the decision created after beating the defender.',
        detail: 'Show the isolation before the take-on, the 1v1 and the useful pass, cross or shot that follows.',
      },
    },
    {
      id: 'crossing',
      label: 'Cross',
      helper: 'Delivery from the wing',
      color: '#ff6600',
      iqGuidance: {
        hint: 'Show the look into the box before the delivery.',
        detail: 'Keep the approach, the player checking the targets, the cross and the immediate result or transition.',
      },
    },
    {
      id: 'hold_up_play',
      label: 'Hold-up play',
      helper: 'Holding and laying off',
      color: '#ff3c3c',
      iqGuidance: {
        hint: 'Show how the player connects the next attack.',
        detail: 'Start before receiving with the defender behind. Keep the protection, layoff and the movement that follows.',
      },
    },
    {
      id: 'off_ball',
      label: 'Off-ball run',
      helper: 'For reception / in behind',
      color: '#94a3b8',
      iqGuidance: {
        hint: 'Start before the run becomes obvious.',
        detail: 'Keep the player checking the space, timing the movement, affecting the defense and completing the next action.',
      },
    },
    {
      id: 'attacking_join',
      label: 'Late run',
      helper: 'Joining the attack in depth',
      color: '#00dcff',
      iqGuidance: {
        hint: 'Show when the player recognizes the space to join.',
        detail: 'Start before the forward run. Keep the timing, arrival and the decision made after entering the attack.',
      },
    },
    {
      id: 'tackle',
      label: 'Tackle',
      helper: 'Recovering the ball, pressing',
      color: '#ff6600',
      iqGuidance: {
        hint: 'Show the read before the ball is won.',
        detail: 'Keep the defensive position, trigger to engage, the tackle and what the player does with the next ball.',
      },
    },
    {
      id: 'one_on_one_def',
      label: '1v1 defense',
      helper: 'Timing, closing the lane',
      color: '#ff6600',
      iqGuidance: {
        hint: 'Keep the approach and lane control before the duel.',
        detail: 'Show the distance, body angle, timing of the challenge and the recovery or outlet after the duel.',
      },
    },
    {
      id: 'block',
      label: 'Block',
      helper: 'Blocking a shot',
      color: '#ff3c3c',
      iqGuidance: {
        hint: 'Show the positioning that makes the block possible.',
        detail: 'Start before the shot. Keep the adjustment, block and response to the rebound or second phase.',
      },
    },
    {
      id: 'interception',
      label: 'Interception',
      helper: 'Reading the pass',
      color: '#ff6600',
      iqGuidance: {
        hint: 'Show the passing lane before it closes.',
        detail: 'Keep the player scanning, stepping into the lane, winning the ball and choosing the first pass afterward.',
      },
    },
    {
      id: 'cover',
      label: 'Cover',
      helper: 'Preventing the chance, holding line',
      color: '#94a3b8',
      iqGuidance: {
        hint: 'Keep the danger the player recognizes early.',
        detail: 'Show the teammate moving, the space being protected and how the player restores the defensive shape.',
      },
    },
    {
      id: 'recovery_run',
      label: 'Recovery run',
      helper: 'Sprinting back, covering',
      color: '#94a3b8',
      iqGuidance: {
        hint: 'Start at the moment possession changes.',
        detail: 'Keep the reaction, sprint, dangerous space being covered and the final defensive outcome.',
      },
    },
    {
      id: 'long_shot',
      label: 'Long shot',
      helper: 'Long-range shot on goal',
      color: '#ffc81e',
      iqGuidance: {
        hint: 'Show why the shooting window opens.',
        detail: 'Keep the touch or movement that creates space, the strike and the goalkeeper, rebound or transition response.',
      },
    },
    {
      id: 'counter_press',
      label: 'Counter-press',
      helper: 'Fast reaction after losing the ball',
      color: '#ff6600',
      iqGuidance: {
        hint: 'Start just before possession is lost.',
        detail: 'Show the turnover, immediate reaction, angle of pressure and whether the player recovers or delays the attack.',
      },
    },
    {
      id: 'shot_stopping',
      label: 'Save',
      helper: 'Shot stopping',
      color: '#00ff99',
      iqGuidance: {
        hint: 'Keep the goalkeeper’s position before the shot.',
        detail: 'Start before the strike. Show the set position, save and control of the rebound or next action.',
      },
    },
    {
      id: 'keeper_one_on_one',
      label: '1v1 vs striker',
      helper: 'Coming out / blocking the striker',
      color: '#00ff99',
      iqGuidance: {
        hint: 'Show the starting position and decision to close.',
        detail: 'Keep the through ball, goalkeeper’s approach, moment of commitment and control of the second action.',
      },
    },
    {
      id: 'high_ball',
      label: 'High ball',
      helper: 'Coming out / aerial duel',
      color: '#aef2ff',
      iqGuidance: {
        hint: 'Show the early read before the claim.',
        detail: 'Start while the ball is travelling. Keep the positioning, decision, aerial action and team reset.',
      },
    },
    {
      id: 'gk_punch',
      label: 'Punch / palm',
      helper: 'Aerial clearance',
      color: '#aef2ff',
      iqGuidance: {
        hint: 'Keep the traffic and decision before the clearance.',
        detail: 'Show the flight, pressure in the area, committed action and where the goalkeeper recovers afterward.',
      },
    },
    {
      id: 'distribution',
      label: 'Distribution',
      helper: 'Foot play, throw',
      color: '#aef2ff',
      iqGuidance: {
        hint: 'Show the scan before starting the next attack.',
        detail: 'Keep the goalkeeper gaining possession, checking options, distributing and repositioning to support play.',
      },
    },
    {
      id: 'free',
      label: 'Free play',
      helper: "Doesn't fit a category",
      color: '#94a3b8',
      iqGuidance: {
        hint: 'Keep enough context to understand the decision.',
        detail: 'Start before the key information appears. Keep the action and the player’s next movement or transition response.',
      },
    },
  ],
  roles: [
    {
      id: 'gk',
      label: 'Goalkeeper',
      shortLabel: 'GK',
      openingPriority: [
        'shot_stopping',
        'keeper_one_on_one',
        'high_ball',
        'distribution',
      ],
      recommendedActions: [
        'shot_stopping',
        'keeper_one_on_one',
        'high_ball',
        'gk_punch',
        'distribution',
        'free',
      ],
      consistencyTargets: {
        shot_stopping: 3,
        keeper_one_on_one: 1,
        high_ball: 1,
        gk_punch: 1,
        distribution: 1,
      },
      avoidOveruse: [
        'shot_stopping',
      ],
      consistencyTips: [
        '3–4 saves of different kinds',
        '1–2 one-on-ones',
        '1–2 high-ball claims / aerial command',
        '1–2 accurate distributions',
      ],
      iqGuidance: {
        shot_stopping: {
          hint: 'Keep the goalkeeper’s position before the shot.',
          detail: 'Start before the strike so the coach can see the set position, angle, save and control of the rebound or next action.',
        },
        keeper_one_on_one: {
          hint: 'Show the starting position and decision to close.',
          detail: 'Keep the through ball, the goalkeeper reading the distance, the moment of commitment and control of the second action.',
        },
        high_ball: {
          hint: 'Show the early read and command of the area.',
          detail: 'Start while the delivery is developing. Keep the goalkeeper’s position, decision to claim or clear and the team reset.',
        },
        distribution: {
          hint: 'Show the scan before starting the next attack.',
          detail: 'Keep the goalkeeper gaining possession, checking the press and options, choosing the distribution and repositioning to support play.',
        },
      },
    },
    {
      id: 'cb',
      label: 'Center back',
      shortLabel: 'CB',
      openingPriority: [
        'tackle',
        'header',
        'deep_pass',
        'cover',
      ],
      recommendedActions: [
        'one_on_one_def',
        'tackle',
        'header',
        'block',
        'interception',
        'cover',
        'deep_pass',
        'reception_pressure',
        'free',
      ],
      consistencyTargets: {
        one_on_one_def: 2,
        tackle: 2,
        header: 2,
        block: 1,
        interception: 1,
        cover: 1,
        deep_pass: 1,
      },
      avoidOveruse: [
        'tackle',
        'header',
      ],
      consistencyTips: [
        '2–3 1v1 defensive actions',
        '2–3 aerial duels / headers',
        '2–3 clean tackles',
        '1–2 blocks or interceptions',
        '1–2 line-breaking passes',
      ],
      iqGuidance: {
        tackle: {
          hint: 'Show the read and timing before the ball is won.',
          detail: 'Start with the center back’s position relative to the attacker and defensive line. Keep the trigger, clean challenge and first action after regaining possession.',
        },
        header: {
          hint: 'Keep the positioning and aerial duel—not only the contact.',
          detail: 'Show the center back tracking the flight and opponent, attacking the ball and organizing or securing the second phase.',
        },
        deep_pass: {
          hint: 'Show the space the center back recognizes in build-up.',
          detail: 'Start before receiving so the coach can see the scan and composure, then keep the line-breaking pass and movement that reconnects the back line.',
        },
        cover: {
          hint: 'Show the danger prevented by the cover.',
          detail: 'Keep the teammate stepping out, the center back protecting the space behind and the defensive line being restored after the threat.',
        },
      },
    },
    {
      id: 'fb',
      label: 'Full back',
      shortLabel: 'FB',
      openingPriority: [
        'one_on_one_def',
        'recovery_run',
        'crossing',
        'attacking_join',
      ],
      recommendedActions: [
        'one_on_one_def',
        'crossing',
        'recovery_run',
        'attacking_join',
        'cover',
        'deep_pass',
        'off_ball',
        'tackle',
        'free',
      ],
      consistencyTargets: {
        one_on_one_def: 2,
        crossing: 2,
        recovery_run: 1,
        attacking_join: 1,
        cover: 1,
        deep_pass: 1,
      },
      avoidOveruse: [
        'crossing',
      ],
      consistencyTips: [
        '2–3 1v1 defensive actions against a winger',
        '2–3 quality crosses',
        '1–2 overlapping runs into attack',
        '1–2 fast recovery runs',
      ],
      iqGuidance: {
        one_on_one_def: {
          hint: 'Keep the approach that controls the winger.',
          detail: 'Start before the duel to show distance, body angle and the lane being protected. Keep the challenge and what happens to the ball next.',
        },
        recovery_run: {
          hint: 'Start when possession changes—not at the final tackle.',
          detail: 'Show the full back recognizing the transition, recovering the dangerous space and completing the defensive action.',
        },
        crossing: {
          hint: 'Show the overlap and look before the cross.',
          detail: 'Keep how the full back arrives, checks the box, chooses the delivery and reacts when the attacking phase ends.',
        },
        attacking_join: {
          hint: 'Show when the full back chooses to go forward.',
          detail: 'Start with the space opening ahead, keep the timed overlap or underlap and show the final decision without losing the defensive context.',
        },
      },
    },
    {
      id: 'cm6',
      label: 'Defensive midfielder / 6',
      shortLabel: 'CM6',
      openingPriority: [
        'tackle',
        'interception',
        'reception_pressure',
        'deep_pass',
      ],
      recommendedActions: [
        'tackle',
        'cover',
        'reception_pressure',
        'deep_pass',
        'interception',
        'header',
        'off_ball',
        'recovery_run',
        'free',
      ],
      consistencyTargets: {
        tackle: 2,
        cover: 2,
        reception_pressure: 2,
        deep_pass: 2,
        interception: 1,
      },
      avoidOveruse: [],
      consistencyTips: [
        '2–3 tackles followed by a forward pass',
        '2–3 receptions under pressure',
        '1–2 space-covering / shielding actions',
        '1–2 interceptions or progressive passes',
      ],
      iqGuidance: {
        tackle: {
          hint: 'Keep the recovery and forward decision together.',
          detail: 'Start with the number 6 protecting the center. Show the trigger to engage, the clean win and the first pass that follows.',
        },
        interception: {
          hint: 'Show the passing lane before it closes.',
          detail: 'Keep the midfielder scanning the central space, stepping into the lane and using the regained ball without slowing the transition.',
        },
        reception_pressure: {
          hint: 'Show the scan before receiving under pressure.',
          detail: 'Start before the pass arrives. Keep the body profile, first touch away from pressure and the decision that keeps possession or progresses play.',
        },
        deep_pass: {
          hint: 'Show why the number 6 changes the point of attack.',
          detail: 'Keep the scan, the opponent’s shape, the progressive or switching pass and the midfielder’s position after releasing the ball.',
        },
      },
    },
    {
      id: 'cm8',
      label: 'Box-to-box midfielder / 8',
      shortLabel: 'CM8',
      openingPriority: [
        'reception_pressure',
        'deep_pass',
        'attacking_join',
        'off_ball',
      ],
      recommendedActions: [
        'reception_pressure',
        'deep_pass',
        'attacking_join',
        'dribble',
        'tackle',
        'off_ball',
        'counter_press',
        'recovery_run',
        'long_shot',
        'free',
      ],
      consistencyTargets: {
        reception_pressure: 3,
        deep_pass: 2,
        attacking_join: 2,
        dribble: 1,
        tackle: 1,
        off_ball: 1,
      },
      avoidOveruse: [],
      consistencyTips: [
        '3–4 through balls / progressive passes',
        '2–3 receptions under pressure',
        '2–3 tackles / defensive actions',
        '1–2 late runs into the box',
      ],
      iqGuidance: {
        reception_pressure: {
          hint: 'Show the scan, first touch and forward exit.',
          detail: 'Start before the ball arrives so the coach sees pressure and body shape. Keep the first touch and how the number 8 carries or connects forward.',
        },
        deep_pass: {
          hint: 'Show the line the number 8 recognizes and breaks.',
          detail: 'Keep the scan before receiving, the timing of the progressive pass and the movement to support the next attacking phase.',
        },
        attacking_join: {
          hint: 'Start before the late run becomes obvious.',
          detail: 'Show the number 8 reading the space, timing the arrival beyond the ball and making the next decision in or around the box.',
        },
        off_ball: {
          hint: 'Show how the movement creates the passing option.',
          detail: 'Keep the midfielder checking space, moving between lines or away from pressure, receiving or freeing a teammate and continuing the play.',
        },
      },
    },
    {
      id: 'am10',
      label: 'Attacking midfielder / 10',
      shortLabel: 'AM10',
      openingPriority: [
        'deep_pass',
        'reception_pressure',
        'dribble',
        'free_kick',
      ],
      recommendedActions: [
        'deep_pass',
        'reception_pressure',
        'dribble',
        'assist',
        'free_kick',
        'long_shot',
        'off_ball',
        'counter_press',
        'goal',
        'tackle',
        'free',
      ],
      consistencyTargets: {
        deep_pass: 3,
        reception_pressure: 2,
        dribble: 2,
        assist: 1,
        free_kick: 1,
        long_shot: 1,
        counter_press: 1,
      },
      avoidOveruse: [
        'goal',
        'free_kick',
      ],
      consistencyTips: [
        '3–4 through balls / key passes',
        '2–3 receptions under pressure',
        '2–3 dribbles that create an advantage',
        '1–2 free kicks or long shots',
        '1–2 assists / chance creation',
      ],
      iqGuidance: {
        deep_pass: {
          hint: 'Show the scan that finds the final line.',
          detail: 'Start before the number 10 receives or looks up. Keep the body shape, chance-creating pass and movement to support the attack afterward.',
        },
        reception_pressure: {
          hint: 'Show how the number 10 finds and uses space between lines.',
          detail: 'Keep the movement before receiving, pressure arriving, the first touch and the fast decision that creates an advantage.',
        },
        dribble: {
          hint: 'Keep the advantage created after beating the defender.',
          detail: 'Start with the 1v1 being recognized. Show the change of pace and the pass, shot or space created at the end—not an isolated dribble.',
        },
        free_kick: {
          hint: 'Keep the game context, strike and immediate outcome.',
          detail: 'Start once the set-piece situation is clear. Keep the technique and the goalkeeper, rebound or next attacking response.',
        },
      },
    },
    {
      id: 'winger',
      label: 'Winger',
      shortLabel: 'WG',
      openingPriority: [
        'dribble',
        'crossing',
        'off_ball',
        'goal',
      ],
      recommendedActions: [
        'dribble',
        'crossing',
        'off_ball',
        'assist',
        'goal',
        'recovery_run',
        'counter_press',
        'deep_pass',
        'free',
      ],
      consistencyTargets: {
        dribble: 3,
        crossing: 2,
        off_ball: 2,
        assist: 1,
        goal: 1,
      },
      avoidOveruse: [
        'dribble',
      ],
      consistencyTips: [
        '3–4 dribbles / 1v1 wins',
        '2–3 quality crosses',
        '1–2 runs in behind',
        '1–2 goals or assists',
      ],
      iqGuidance: {
        dribble: {
          hint: 'Show the 1v1 and the useful action it creates.',
          detail: 'Start with the winger isolating the defender. Keep the change of pace and the cross, pass or shot that turns the dribble into an advantage.',
        },
        crossing: {
          hint: 'Show the look into the box before the delivery.',
          detail: 'Keep the approach, the winger checking targets, the chosen cross and the immediate attacking or transition outcome.',
        },
        off_ball: {
          hint: 'Start before the run in behind begins.',
          detail: 'Show the winger checking the line and passer, timing the run, receiving in space and making the next decision.',
        },
        goal: {
          hint: 'Keep the movement that puts the winger in scoring position.',
          detail: 'Start before the final pass or inside run. Keep the finish and the immediate reaction when possession changes or the ball stays live.',
        },
      },
    },
    {
      id: 'st',
      label: 'Striker / 9',
      shortLabel: 'ST',
      openingPriority: [
        'goal',
        'off_ball',
        'header',
        'hold_up_play',
      ],
      recommendedActions: [
        'goal',
        'off_ball',
        'hold_up_play',
        'assist',
        'header',
        'dribble',
        'counter_press',
        'long_shot',
        'free',
      ],
      consistencyTargets: {
        goal: 3,
        off_ball: 2,
        hold_up_play: 1,
        assist: 1,
        header: 1,
      },
      avoidOveruse: [],
      consistencyTips: [
        '3–4 goals of different kinds',
        '2–3 runs in behind the defense',
        '1–2 hold-up plays with back to goal',
        '1–2 assists / lay-offs',
      ],
      iqGuidance: {
        goal: {
          hint: 'Show the movement that creates the finish.',
          detail: 'Start before the striker separates from the defender or attacks the space. Keep the finish and the immediate second action.',
        },
        off_ball: {
          hint: 'Start before the run behind the line becomes obvious.',
          detail: 'Show the striker checking the line and passer, timing the movement and how the run creates or receives the chance.',
        },
        header: {
          hint: 'Keep the movement before the headed finish.',
          detail: 'Show the striker’s starting position, separation from the defender, timing of the jump and the outcome or rebound response.',
        },
        hold_up_play: {
          hint: 'Show how the striker connects the next attacker.',
          detail: 'Start before receiving with the defender behind. Keep the protection, layoff or turn and the movement that follows the pass.',
        },
      },
    },
  ],
} as const;

export default KICKO_SCOUT_CATALOG;
