// ─── SUPABASE CONFIG ─────────────────────────────────────────
const SUPABASE_URL = 'https://rtmflwfxvjcnnfbeosmo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0bWZsd2Z4dmpjbm5mYmVvc21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTYyOTksImV4cCI6MjA5MTg5MjI5OX0.NUvtnf184qJlt8jo8BRfzZkj37Deya2rJTzauH0wtjI';

async function saveResponse(scores, archetype) {
  try {
    const payload = {
      name:          state.respondent.name,
      department:    state.respondent.department,
      email:         state.respondent.email,
      fluency_score: scores.fluency,
      ways_score:    scores.data,
      ai_score:      scores.ai,
      mindset_score: scores.mindset,
      archetype:     archetype,
      scenario_a:    state.scenarioA || '',
      scenario_b:    state.scenarioB || '',
      open_text:     state.openText  || ''
    };
    const response = await fetch(SUPABASE_URL + '/rest/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer':        'return=minimal'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error('Supabase save failed:', response.status, await response.text());
    }
  } catch (err) {
    console.error('Supabase error:', err);
  }
}

// ─── STATE ───────────────────────────────────────────────────
const state = {
  respondent: { name: '', department: '', email: '' },
  tools: { green: [], amber: [], red: [], grey: [] },
  scenarioA: null,
  scenarioB: null,
  ffAnswers: new Array(10).fill(null),
  tradeoffs: new Array(6).fill(null),
  openText: ''
};

let draggedTool = null;

// ─── NAVIGATION ──────────────────────────────────────────────
function goToScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Re-attach drag listeners when module1 becomes visible
  if (id === 'module1') {
    document.querySelectorAll('#toolSource .tool-chip').forEach(chip => {
      // Remove old listeners by cloning
      const fresh = chip.cloneNode(true);
      chip.parentNode.replaceChild(fresh, chip);
      attachDragListeners(fresh);
    });
  }
}

function updateProgress(module) {
  const pct = ((module - 1) / 4) * 100;
  document.getElementById('progressFill').style.width = pct + '%';
}

function startGame() {
  const name = document.getElementById('regName').value.trim();
  const dept = document.getElementById('regDept').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const errorEl = document.getElementById('regError');

  if (!name || !dept || !email || !email.includes('@')) {
    errorEl.style.display = 'block';
    document.getElementById('regName').classList.toggle('error', !name);
    document.getElementById('regDept').classList.toggle('error', !dept);
    document.getElementById('regEmail').classList.toggle('error', !email || !email.includes('@'));
    return;
  }

  errorEl.style.display = 'none';
  document.getElementById('regName').classList.remove('error');
  document.getElementById('regDept').classList.remove('error');
  document.getElementById('regEmail').classList.remove('error');

  state.respondent = { name, department: dept, email };
  goToScreen('module1');
  updateProgress(1);
}

// Attach Let's Begin button listener directly
document.getElementById('btnStart').addEventListener('click', startGame);

// ─── MODULE 1: DRAG & DROP ────────────────────────────────────
function attachDragListeners(chip) {
  chip.addEventListener('dragstart', e => {
    draggedTool = chip;
    setTimeout(() => chip.classList.add('dragging'), 0);
  });
  chip.addEventListener('dragend', () => {
    chip.classList.remove('dragging');
    draggedTool = null;
  });
}

document.querySelectorAll('.tool-chip').forEach(chip => attachDragListeners(chip));

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e, zone) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (!draggedTool) return;
  const toolName = draggedTool.dataset.tool;
  ['green','amber','red','grey'].forEach(z => {
    state.tools[z] = state.tools[z].filter(t => t !== toolName);
    const container = document.getElementById('chips-' + z);
    [...container.querySelectorAll('.tool-chip')].forEach(c => {
      if (c.dataset.tool === toolName) c.remove();
    });
  });
  const src = document.getElementById('toolSource');
  [...src.querySelectorAll('.tool-chip')].forEach(c => {
    if (c.dataset.tool === toolName) c.remove();
  });
  state.tools[zone].push(toolName);
  const container = document.getElementById('chips-' + zone);
  const newChip = document.createElement('div');
  newChip.className = 'tool-chip';
  newChip.dataset.tool = toolName;
  newChip.textContent = draggedTool.textContent;
  newChip.title = 'Click to return to source';
  newChip.addEventListener('click', () => returnToSource(newChip, zone));
  container.appendChild(newChip);
}

// Attach drag zone listeners directly
['green','amber','red','grey'].forEach(zone => {
  const el = document.getElementById('zone-' + zone);
  el.addEventListener('dragover', handleDragOver);
  el.addEventListener('dragleave', handleDragLeave);
  el.addEventListener('drop', e => handleDrop(e, zone));
});

function returnToSource(chip, zone) {
  const toolName = chip.dataset.tool;
  state.tools[zone] = state.tools[zone].filter(t => t !== toolName);
  chip.remove();
  const src = document.getElementById('toolSource');
  const restored = document.createElement('div');
  restored.className = 'tool-chip';
  restored.draggable = true;
  restored.dataset.tool = toolName;
  restored.textContent = toolName;
  attachDragListeners(restored);
  src.appendChild(restored);
}

// ─── MODULE 2: SCENARIO SELECTION — handled by direct listeners below ────────

// ─── MODULE 3 & 4: handled by direct listeners below ─────────────────────────

// ─── SCORING ──────────────────────────────────────────────────
function computeScores() {
  const totalSorted = state.tools.green.length + state.tools.amber.length + state.tools.red.length + state.tools.grey.length;
  const fluencyRaw = totalSorted === 0 ? 50 :
    Math.round(((state.tools.green.length * 100 + state.tools.amber.length * 60 + state.tools.red.length * 30 + state.tools.grey.length * 5) / (totalSorted * 100)) * 100);

  // Digital-enabled Ways of Working: scored from scenario A and B responses
  // Scenario A: B=most sophisticated (process-first + integration rigour), E=process simplification (legitimate), C=experimentation, D=risk-cautious, A=top-down
  // Scenario B: D=collaborative ownership (highest), B=stakeholder-first, C=methodical, A=proactive-unilateral, E=status-quo
  const scenarioAScores = { A: 45, B: 90, C: 75, D: 55, E: 65 };
  const scenarioBScores = { A: 60, B: 80, C: 70, D: 90, E: 35 };
  const wowA = state.scenarioA ? scenarioAScores[state.scenarioA] : 50;
  const wowB = state.scenarioB ? scenarioBScores[state.scenarioB] : 50;
  const dataRaw = Math.round((wowA + wowB) / 2);

  // Correct answers: 0=F, 1=T, 2=T, 3=F, 4=T, 5=F, 6=F, 7=F, 8=F, 9=T
  const correct = [false, true, true, false, true, false, false, false, false, true];
  let aiScore = 0;
  state.ffAnswers.forEach((ans, i) => {
    if (ans === null) { aiScore += 40; return; }
    const isTrue = correct[i];
    if ((ans === 'true' && isTrue) || (ans === 'false' && !isTrue)) aiScore += 100;
    else if (ans === 'unsure') aiScore += 50;
    else aiScore += 10;
  });
  const aiRaw = Math.round(aiScore / 10);

  // Digital Leadership Mindset: 6 pairs
  // P1 Experimentation Q1: B=transformative, A=stable
  // P2 Role-modelling Q3: B=explicit modelling, A=humble/passive
  // P3 Addressing resistance Q2: B=diagnostic, A=communicative
  // P4 Stakeholder comms Q4: B=balanced, A=benefits-only
  // P5 Digital-ready culture Q5: B=culture-shaper, A=structural/resourcing
  // P6 Creating conditions Q3+Q5: B=active enabler, A=self-directed
  const mindsetMap = [
    { A: 45, B: 85 },
    { A: 50, B: 90 },
    { A: 55, B: 90 },
    { A: 50, B: 85 },
    { A: 45, B: 90 },
    { A: 40, B: 90 }
  ];
  let mindsetScore = 0;
  let mindsetCount = 0;
  state.tradeoffs.forEach((ans, i) => {
    if (ans) { mindsetScore += mindsetMap[i][ans]; mindsetCount++; }
  });
  const mindsetRaw = mindsetCount > 0 ? Math.round(mindsetScore / mindsetCount) : 50;

  return { fluency: fluencyRaw, data: dataRaw, ai: aiRaw, mindset: mindsetRaw };
}

function getArchetype(scores) {
  const avg = (scores.fluency + scores.data + scores.ai + scores.mindset) / 4;
  if (avg >= 72) return 'digital-transformation';
  if (avg >= 45) return 'digitally-enabled';
  return 'digitally-aware';
}

function animateBar(barId, scoreId, value) {
  const bar = document.getElementById(barId);
  const scoreEl = document.getElementById(scoreId);
  bar.style.width = value + '%';
  let current = 0;
  const step = value / (1200 / 16);
  const interval = setInterval(() => {
    current = Math.min(current + step, value);
    scoreEl.textContent = Math.round(current) + '%';
    if (current >= value) clearInterval(interval);
  }, 16);
}

// ─── PROFILE GENERATION ──────────────────────────────────────
function generateProfile() {
  state.openText = document.getElementById('openText').value;
  const scores = computeScores();
  const archetype = getArchetype(scores);

  // Save response to Supabase
  saveResponse(scores, archetype);

  goToScreen('profile');
  document.getElementById('progressFill').style.width = '100%';
  // Personalise header with respondent name
  document.getElementById('profileEyebrow').textContent =
    state.respondent.name
      ? `${state.respondent.name} · Your Digital Leadership Compass Profile`
      : 'Your Digital Leadership Compass Profile';

  const archetypes = {
    'digitally-aware': {
      label: 'Digitally-Aware Leader',
      tagline: '"I understand digital, data and AI well enough to lead responsibly."',
      narrative: `Your profile reflects a <strong>genuine and honest starting point</strong> — you have a foundational awareness of the digital landscape and an instinct for the governance principles that responsible digital leadership requires. This matters more than it might seem: leaders who know what they don't yet know are significantly better positioned to grow than those who overestimate their readiness. The most common pattern at this stage is not a lack of capability, but a <strong>lack of structured opportunity to build confidence through practice</strong>. The distance between where you are now and the next level of digital leadership is shorter than it looks — and the most effective way to close it is through deliberate, low-risk experimentation in your own team's work, rather than through formal training alone.`,
      steps: [
        { icon: '🎯', title: 'Pick one tool, apply it to one real task', text: 'Choose a single recurring task your team handles and explore whether one of the tools in this exercise could reduce the effort involved. A small, concrete win with a real work task builds more confidence than any training programme — and gives you something specific to share with your team.' },
        { icon: '🤝', title: 'Find a peer who is one step ahead', text: 'Identify a colleague in another team who has embedded digital tools more actively into their work. Ask them for 30 minutes to walk you through what they actually do — not the theory, but the practice. Peer learning at this level is faster and stickier than structured courses.' },
        { icon: '🛡️', title: 'Get clear on the guardrails', text: 'One of the most common blockers at this stage is uncertainty about what is and isn\'t permitted when using digital and AI tools at work. Spend time clarifying your organisation\'s guidance on responsible AI use and data handling — not to find reasons to hold back, but so you can move forward with confidence.' }
      ]
    },
    'digitally-enabled': {
      label: 'Digitally-Enabled Leader',
      tagline: '"I actively use digital, data and AI to improve team outcomes."',
      narrative: `Your profile reflects a leader who is <strong>genuinely engaged with digital tools and thinking carefully</strong> about how they apply to your work. You demonstrate real capability across the four dimensions — and the pattern that typically emerges at this stage is an interesting one: the tools are working well for you personally, but that capability may not yet be fully visible or systematically embedded in how your team operates day to day. The most valuable shift from here is not about learning more tools — it is about making a <strong>deliberate move from digital user to digital culture-setter</strong>. Being explicit about how and why you use digital tools, creating structured space for your team to experiment, and actively shaping the conditions for your team's capability to grow alongside yours. You are closer to the next level than you might think — the shift is primarily one of <strong>leadership behaviour, not technical knowledge</strong>.`,
      steps: [
        { icon: '🔁', title: 'Make your practice visible to your team', text: 'You are likely already using digital tools effectively — but does your team know that? Be deliberate about naming which tools you use, why you chose them, and what they have changed in your work. Visible role-modelling is the most powerful adoption signal a leader can send, and it costs nothing.' },
        { icon: '⚙️', title: 'Redesign one workflow with your team, not for them', text: 'Identify the process in your team with the most manual effort and map it for digital optimisation — but involve your team in the redesign rather than presenting a solution. Co-designing a workflow change builds your team\'s digital instincts and their ownership of the outcome simultaneously.' },
        { icon: '🌐', title: 'Create one cross-team learning moment', text: 'At your stage, some of the highest-value development comes from exposure to how peers in other teams are working digitally. Organise or join a brief cross-team conversation about what is working — a 45-minute shared reflection across two or three teams often surfaces more practical insight than a formal course.' }
      ]
    },
    'digital-transformation': {
      label: 'Digital Transformation Leader',
      tagline: '"I shape culture, capacity and outcomes through digital leadership."',
      narrative: `Your profile reflects <strong>strong and consistent digital leadership capability</strong> across all four dimensions — fluency with tools, thoughtful ways of working, responsible governance awareness, and a genuinely transformative leadership mindset. Leaders at this stage have typically moved beyond the personal adoption challenge and are grappling with a more interesting and more difficult one: <strong>how to make their own capability contagious</strong>. The gap that matters most at this level is not between you and the next tool or framework — it is between your individual practice and the team and department culture around you. Your greatest opportunity is to become a <strong>deliberate multiplier</strong>: identifying who in your team is ready to grow, creating the conditions that make digital experimentation feel safe and worthwhile, and using your credibility to shift the system — not just your own corner of it. That is where your impact compounds.`,
      steps: [
        { icon: '🌱', title: 'Invest deliberately in one person\'s growth', text: 'Identify one team member who has the potential to develop into a digital champion but hasn\'t yet had the structured opportunity to do so. Invest specifically in their development — a stretch assignment, a tool trial with your backing, or regular reflection conversations about what they are learning. Developing others is where your leadership impact multiplies fastest.' },
        { icon: '📣', title: 'Advocate for the conditions, not just the tools', text: 'At this stage, your most valuable contribution to your department is not using digital tools well yourself — it is advocating for the conditions that allow others to do the same. That means making the case for time, psychological safety, governance clarity, and recognition of effort. You are well placed to translate what your team experiences on the ground into language that resonates at the leadership level.' },
        { icon: '🔗', title: 'Build or join a cross-team peer network', text: 'Leaders at your level often find that the most generative learning comes from peers facing similar challenges in other teams or departments. Seek out or create a small, informal peer group focused on digital leadership practice — not a formal committee, but a regular conversation. The cross-pollination of what is working across different contexts is one of the fastest ways to accelerate capability at scale.' }
      ]
    }
  };

  const profile = archetypes[archetype];
  document.getElementById('archetypeLabel').textContent = profile.label;
  document.getElementById('archetypeTagline').textContent = profile.tagline;
  document.getElementById('profileNarrative').innerHTML = profile.narrative;

  const stepsContainer = document.getElementById('nextSteps');
  stepsContainer.innerHTML = '';
  profile.steps.forEach(step => {
    stepsContainer.innerHTML += `
      <div class="next-step-card">
        <div class="step-icon">${step.icon}</div>
        <div class="step-text"><strong>${step.title}</strong>${step.text}</div>
      </div>`;
  });

  setTimeout(() => {
    animateBar('bar-fluency', 'score-fluency', scores.fluency);
    animateBar('bar-data', 'score-data', scores.data);
    animateBar('bar-ai', 'score-ai', scores.ai);
    animateBar('bar-mindset', 'score-mindset', scores.mindset);

    // ─── SPIKE DETECTION ─────────────────────────────────────
    const SPIKE_THRESHOLD = 25;
    const dimensionScores = {
      fluency:  { score: scores.fluency,  label: 'Digital Fluency' },
      data:     { score: scores.data,     label: 'Digital Ways of Working' },
      ai:       { score: scores.ai,       label: 'AI & Governance' },
      mindset:  { score: scores.mindset,  label: 'Leadership Mindset' }
    };
    const highest = Math.max(...Object.values(dimensionScores).map(d => d.score));
    const gaps = Object.entries(dimensionScores)
      .map(([key, d]) => ({ key, label: d.label, gap: highest - d.score }))
      .filter(d => d.gap >= SPIKE_THRESHOLD)
      .sort((a, b) => b.gap - a.gap);

    const spikeCallouts = {
      fluency: {
        title: 'A gap worth closing: tool familiarity',
        text: 'Low tool familiarity relative to your other strengths can quietly limit the impact of your leadership — especially when your team looks to you to model what good looks like. One practical starting point: pick one tool from this exercise and commit to using it on a real task this week.'
      },
      data: {
        title: 'A gap worth closing: ways of working',
        text: 'Strong awareness and mindset without embedded digital workflows means the potential isn\'t yet translating into day-to-day practice. Consider mapping one recurring team process and identifying where a digital tool could reduce friction — even a small change, consistently applied, shifts the culture.'
      },
      ai: {
        title: 'A gap worth closing: AI and governance',
        text: 'A governance gap alongside strong capability in other areas is one of the most important patterns to address — not because it limits what you can do, but because it affects how safely and confidently you can lead others in using AI tools. Spend time reviewing your organisation\'s guidance on responsible AI use and data handling. Understanding the boundaries is what makes confident action possible.'
      },
      mindset: {
        title: 'A gap worth closing: leadership mindset',
        text: 'High fluency and technical capability without the accompanying leadership behaviours — role-modelling, creating space for experimentation, developing others — means the impact stays at the individual level. The most useful shift here is a deliberate one: choose one leadership behaviour from this exercise and apply it consistently with your team over the next month.'
      }
    };

    const calloutEl = document.getElementById('spikeCallout');
    if (gaps.length > 0) {
      const top = gaps[0];
      const content = spikeCallouts[top.key];
      calloutEl.innerHTML = `
        <div class="spike-callout">
          <div class="spike-callout-eyebrow">⚠ One dimension to watch</div>
          <div class="spike-callout-title">${content.title}</div>
          <div class="spike-callout-text">${content.text}</div>
        </div>`;
    } else {
      calloutEl.innerHTML = '';
    }
    // ─────────────────────────────────────────────────────────

  }, 200);
}

// ─── DOWNLOAD PROFILE ────────────────────────────────────────
function downloadProfile() {
  window.print();
}

// ─── RESTART ─────────────────────────────────────────────────
function restartGame() {
  state.respondent = { name: '', department: '', email: '' };
  state.tools = { green: [], amber: [], red: [], grey: [] };
  state.scenarioA = null;
  state.scenarioB = null;
  state.ffAnswers = new Array(10).fill(null);
  state.tradeoffs = new Array(6).fill(null);
  state.openText = '';

  ['green','amber','red','grey'].forEach(z => {
    document.getElementById('chips-' + z).innerHTML = '';
  });

  const src = document.getElementById('toolSource');
  src.innerHTML = '';
  const tools = [
    ['Pair','Pair'],['AIBots','AIBots'],['Transcribe','Transcribe'],
    ['AORA','AORA'],['Navi','Navi'],['Copilot','Copilot'],
    ['MS Teams','MS Teams'],['Power Platform','Power Platform'],
    ['Power Apps','Power Apps'],['Power Automate','Power Automate'],
    ['Power BI','Power BI'],
  ];
  tools.forEach(([dataName, label]) => {
    const chip = document.createElement('div');
    chip.className = 'tool-chip';
    chip.draggable = true;
    chip.dataset.tool = dataName;
    chip.textContent = label;
    attachDragListeners(chip);
    src.appendChild(chip);
  });

  document.querySelectorAll('#module2choicesA .choice-card, #module2choicesB .choice-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.ff-btn').forEach(b => b.classList.remove('selected-true','selected-false','selected-unsure'));
  document.querySelectorAll('.ff-statement').forEach(s => s.classList.remove('answered'));
  document.getElementById('ffCount').textContent = '0';
  document.querySelectorAll('.tradeoff-option').forEach(o => o.classList.remove('selected'));
  document.getElementById('openText').value = '';
  document.getElementById('regName').value = '';
  document.getElementById('regDept').value = '';
  document.getElementById('regEmail').value = '';
  document.getElementById('regError').style.display = 'none';
  document.getElementById('regName').classList.remove('error');
  document.getElementById('regDept').classList.remove('error');
  document.getElementById('regEmail').classList.remove('error');
  document.getElementById('spikeCallout').innerHTML = '';
  document.getElementById('progressFill').style.width = '0%';
  goToScreen('welcome');
}

// ─── DIRECT EVENT LISTENERS (most reliable across all environments) ──────────

// Navigation buttons
document.querySelectorAll('[data-goto]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.goto;
    const progress = btn.dataset.progress;
    goToScreen(target);
    if (progress) updateProgress(parseInt(progress));
  });
});

// Module 2 scenario choices
document.querySelectorAll('#module2choicesA .choice-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('#module2choicesA .choice-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.scenarioA = card.dataset.choice;
  });
});
document.querySelectorAll('#module2choicesB .choice-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('#module2choicesB .choice-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.scenarioB = card.dataset.choice;
  });
});

// Module 3 fact/fiction buttons
document.querySelectorAll('.ff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const index = parseInt(btn.dataset.index);
    const value = btn.dataset.value;
    const statement = btn.closest('.ff-statement');
    statement.querySelectorAll('.ff-btn').forEach(b => b.classList.remove('selected-true','selected-false','selected-unsure'));
    btn.classList.add('selected-' + value);
    const wasNull = state.ffAnswers[index] === null;
    state.ffAnswers[index] = value;
    statement.classList.add('answered');
    if (wasNull) {
      document.getElementById('ffCount').textContent = state.ffAnswers.filter(a => a !== null).length;
    }
  });
});

// Module 4 trade-off options
document.querySelectorAll('.tradeoff-option').forEach(option => {
  option.addEventListener('click', () => {
    const card = option.closest('.tradeoff-card');
    const pair = parseInt(card.dataset.pair);
    const value = option.dataset.value;
    card.querySelectorAll('.tradeoff-option').forEach(o => o.classList.remove('selected'));
    option.classList.add('selected');
    state.tradeoffs[pair] = value;
  });
});

// Generate profile button
document.getElementById('btnGenerateProfile').addEventListener('click', generateProfile);

// Download and restart buttons
document.getElementById('btnDownload').addEventListener('click', downloadProfile);
document.getElementById('btnRestart').addEventListener('click', restartGame);
