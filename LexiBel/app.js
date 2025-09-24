(function(){
    const LS_KEY = 'eng-trainer-data-v1';

    // default data
    const defaultData = {
        words: [
            {id: id(), word: "apple", meaning:"a round fruit", level:"Beginner", addedAt:Date.now()},
            {id: id(), word: "brief", meaning:"short in time", level:"Beginner", addedAt:Date.now()},
            {id: id(), word: "curious", meaning:"eager to learn or know", level:"Intermediate", addedAt:Date.now()},
            {id: id(), word: "meticulous", meaning:"showing great attention to detail", level:"Advanced", addedAt:Date.now()}
        ],
        stats:{points:0, plays:0, correct:0},
        settings:{email:'', lastReminder:0},
    };

    // state
    let data = load();
    let currentTab = 'learn';
    const app = document.getElementById('app');
    const content = document.getElementById('content');

    // initial render
    renderNav();
    renderSidebar();
    showTab('learn');

    // navigation
    function renderNav(){
        document.querySelectorAll('#nav .tab').forEach(btn=>{
            btn.onclick = ()=> {
                document.querySelectorAll('#nav .tab').forEach(b=>b.classList.add('inactive'));
                btn.classList.remove('inactive');
                showTab(btn.dataset.tab);
            };
        });
    }

    function showTab(name){
        currentTab = name;
        if(name === 'learn') renderLearn();
        if(name === 'games') renderGames();
        if(name === 'progress') renderProgress();
        if(name === 'reminder') renderReminder();
        renderSidebar();
    }

    // helpers
    function id(){ return 'w_'+Math.random().toString(36).slice(2,9); }
    function save(){ localStorage.setItem(LS_KEY, JSON.stringify(data)); }
    function load(){ try{ const raw=localStorage.getItem(LS_KEY); return raw?JSON.parse(raw): structuredClone(defaultData); }catch(e){ return structuredClone(defaultData); } }

    function addWord(word, meaning, level){
        if(!word || !meaning) return false;
        data.words.unshift({id:id(), word:word.trim(), meaning:meaning.trim(), level:level||'Beginner', addedAt:Date.now()});
        save(); renderSidebar(); return true;
    }

    // Sidebar render
    function renderSidebar(){
        document.getElementById('wordCount').textContent = data.words.length;
        document.getElementById('pointsDisplay').textContent = data.stats.points + ' pts';
        const lvl = currentLevel();
        document.getElementById('levelBadge').textContent = lvl;
        const recentList = document.getElementById('recentList');
        recentList.innerHTML = '';
        data.words.slice(0,6).forEach(w=>{
            const li = document.createElement('li'); li.className='word-item';
            li.innerHTML = `
                <div>
                    <div class="word-text">${escapeHtml(w.word)}</div>
                    <div class="meta">${escapeHtml(w.meaning)}</div>
                </div>
                <div class="small-muted right-meta">
                    <div>${w.level}</div>
                    <div class="timestamp">${timeSince(w.addedAt)}</div>
                </div>
            `;
        });
    }

    // UI: Learn tab - list and detailed add
    function renderLearn(){
        content.innerHTML = '';
        const container = document.createElement('div');
        container.innerHTML = `
            <div class="flex-row spaced">
                <div>
                    <h2>Your vocabulary</h2>
                    <div class="small-muted">Manage your words</div>
                </div>
                <div class="controls">
                    <button class="tab inactive" id="showAdd">Add new</button>
                    <button class="tab ghost" id="exportBtn">Export JSON</button>
                    <button class="tab ghost" id="clearBtn">Clear all</button>
                </div>
            </div>

            <div class="grid-2">
                <div class="card" id="wordListPanel">
                    <div class="small-muted">Filter & Search</div>
                    <div class="form-row" style="margin-top:8px">
                        <input type="text" id="searchInput" placeholder="Search words or meanings">
                        <select id="filterLevel">
                            <option value="All">All levels</option>
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                        </select>
                    </div>
                    <ul class="list" id="wordsList" style="margin-top:12px"></ul>
                </div>

                <div class="card" id="addPanel">
                    <div class="flex-row spaced">
                        <div>
                            <div class="small-muted">Add a new word</div>
                            <div style="font-weight:700">New Entry</div>
                        </div>
                        <div class="muted-note">Tag difficulty</div>
                    </div>

                    <div class="form-column">
                        <label>Word<input id="addWord" type="text" placeholder="e.g., diligent"></label>
                        <label>Meaning<textarea id="addMeaning" rows="3" placeholder="Short definition"></textarea></label>
                        <label>Level
                            <select id="addLevel">
                                <option>Beginner</option>
                                <option>Intermediate</option>
                                <option>Advanced</option>
                            </select>
                        </label>
                        <div class="form-row">
                            <button class="btn" id="addBtn">Add Word</button>
                            <button class="btn ghost" id="shuffleSample">Pick random</button>
                        </div>
                        <div class="small-muted">Tip: add a short clear meaning to use it in games.</div>
                    </div>
                </div>
            </div>
        `;

        content.appendChild(container);

        // bind
        document.getElementById('showAdd').onclick = ()=> {
            document.getElementById('addWord').focus();
        };
        document.getElementById('addBtn').onclick = () => {
            const w = document.getElementById('addWord').value.trim();
            const m = document.getElementById('addMeaning').value.trim();
            const l = document.getElementById('addLevel').value;
            if(!w||!m){ alert('Please fill both word and meaning.'); return; }
            addWord(w,m,l);
            document.getElementById('addWord').value=''; document.getElementById('addMeaning').value='';
            renderWordList();
        };
        document.getElementById('shuffleSample').onclick = () => {
            const sample = pickRandomSample();
            document.getElementById('addWord').value = sample.word;
            document.getElementById('addMeaning').value = sample.meaning;
            document.getElementById('addLevel').value = sample.level;
        };
        document.getElementById('exportBtn').onclick = () => {
            const blob = new Blob([JSON.stringify(data.words, null, 2)], {type:'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href=url; a.download='vocabulary.json'; a.click(); URL.revokeObjectURL(url);
        };
        document.getElementById('clearBtn').onclick = ()=> {
            if(confirm('Clear all words and progress? This is local only.')){ data = structuredClone(defaultData); data.words=[]; data.stats={points:0,plays:0,correct:0}; save(); renderWordList(); renderSidebar(); }
        };

        // search & filter
        document.getElementById('searchInput').oninput = renderWordList;
        document.getElementById('filterLevel').onchange = renderWordList;

        renderWordList();
    }

    function renderWordList(){
        const q = document.getElementById('searchInput')?.value?.toLowerCase() || '';
        const level = document.getElementById('filterLevel')?.value || 'All';
        const list = document.getElementById('wordsList');
        list.innerHTML = '';
        const filtered = data.words.filter(w=>{
            if(level!=='All' && w.level !== level) return false;
            if(!q) return true;
            return w.word.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q);
        });
        if(filtered.length===0){
            list.innerHTML = '<li class="small-muted">No words found. Add a few to start practicing.</li>';
            return;
        }
        filtered.forEach(w=>{
            const li = document.createElement('li'); li.className='word-item';
            li.innerHTML = `
                <div class="word-info">
                    <div class="word-text">${escapeHtml(w.word)}</div>
                    <div class="meta">${escapeHtml(w.meaning)}</div>
                </div>
                <div class="word-actions">
                    <div class="small-muted">${w.level}</div>
                    <div class="action-buttons">
                        <button class="tab ghost" data-id="${w.id}" data-action="edit">Edit</button>
                        <button class="tab" data-id="${w.id}" data-action="del">Delete</button>
                    </div>
                </div>
            `;

            list.appendChild(li);
        });

        list.querySelectorAll('button[data-action]').forEach(b=>{
            b.onclick = (e)=> {
                const id = b.dataset.id;
                if(b.dataset.action==='del'){
                    if(confirm('Delete this word?')){ data.words = data.words.filter(x=>x.id!==id); save(); renderWordList(); renderSidebar(); }
                } else if(b.dataset.action==='edit'){
                    const w = data.words.find(x=>x.id===id);
                    const newWord = prompt('Edit word', w.word);
                    if(newWord===null) return;
                    const newMeaning = prompt('Edit meaning', w.meaning);
                    if(newMeaning===null) return;
                    const newLevel = prompt('Level (Beginner, Intermediate, Advanced)', w.level) || w.level;
                    w.word = newWord.trim(); w.meaning = newMeaning.trim(); w.level = newLevel;
                    save(); renderWordList(); renderSidebar();
                }
            };
        });
    }

    // Games tab
    function renderGames(){
        content.innerHTML = '';
        const c = document.createElement('div');
        c.innerHTML = `
            <div class="flex-row spaced">
                <div>
                    <h2>Games</h2>
                    <div class="small-muted">Practice with your words</div>
                </div>
                <div class="controls">
                    <button class="tab" id="startTrivia">Trivia</button>
                    <button class="tab inactive" id="startFill">Fill</button>
                    <button class="tab inactive" id="startMatch">Match</button>
                    <button class="tab inactive" id="startSpeed">Speed</button>
                    <button class="tab inactive" id="startFlash">Flashcards</button>
                </div>
            </div>

            <div class="card game-area" id="gameArea">
                <div class="center small-muted">Choose a game to begin. Games use words at or below your current level.</div>
            </div>
        `;

        content.appendChild(c);

        document.getElementById('startTrivia').onclick = ()=> runTrivia();
        document.getElementById('startFill').onclick = ()=> runFill();
        document.getElementById('startMatch').onclick = ()=> runMatch();
        document.getElementById('startSpeed').onclick = ()=> runSpeed();
        document.getElementById('startFlash').onclick = ()=> runFlashcards();
    }

    // Utilities for selecting words respecting level
    function currentLevel(){
        const p = data.stats.points || 0;
        if(p >= 150) return 'Advanced';
        if(p >= 50) return 'Intermediate';
        return 'Beginner';
    }
    function allowedWords(){
        const lvl = currentLevel();
        const order = {Beginner:0, Intermediate:1, Advanced:2};
        return data.words.filter(w=> order[w.level] <= order[lvl]);
    }

    // Simple scoring
    function award(points){
        data.stats.points = (data.stats.points||0) + points;
        if(points>0) data.stats.correct = (data.stats.correct||0)+1;
        data.stats.plays = (data.stats.plays||0)+1;
        save(); renderSidebar();
    }

    // Trivia (multiple choice)
    function runTrivia(){
        const pool = allowedWords();
        const area = document.getElementById('gameArea'); area.innerHTML='';
        if(pool.length < 2){ area.innerHTML='<div class="center small-muted">Add more words to play (need at least 2).</div>'; return; }
        let q = pickRandom(pool);
        function renderQuestion(){
            q = pickRandom(pool);
            const choices = generateChoices(q, pool, 4);
            area.innerHTML = `
                <div class="trivia-header flex-row spaced">
                    <div><strong>What is the meaning of:</strong></div>
                    <div class="small-muted">Level: ${q.level}</div>
                </div>

                <div class="trivia-word">${escapeHtml(q.word)}</div>

                <div class="options" id="options"></div>

                <div class="trivia-footer row spaced">
                    <div class="small-muted" id="hint">Select the correct meaning.</div>
                    <div><button class="tab ghost" id="skip">Skip</button></div>
                </div>
            `;

            const opts = document.getElementById('options');
            choices.forEach(c=> {
                const d = document.createElement('div'); d.className='option'; d.textContent = c.text;
                d.onclick = ()=> {
                    if(c.correct){
                        d.classList.add('correct'); award(10); setTimeout(()=>renderQuestion(),600);
                    } else {
                        d.classList.add('wrong'); award(0); setTimeout(()=>renderQuestion(),900);
                    }
                };
                opts.appendChild(d);
            });
            document.getElementById('skip').onclick = ()=> renderQuestion();
        }
        renderQuestion();
    }

    // Fill-in-the-blank (type the word from meaning)
    function runFill(){
        const pool = allowedWords();
        const area = document.getElementById('gameArea'); area.innerHTML='';
        if(pool.length < 1){ area.innerHTML='<div class="center small-muted">Add words to play.</div>'; return; }
        let q = pickRandom(pool);
        function newRound(){
            q = pickRandom(pool);
            area.innerHTML = `
                <div class="fill-header small-muted">Type the word that matches this meaning</div>
                <div class="fill-meaning">${escapeHtml(q.meaning)}</div>
                <input type="text" id="answerInput" placeholder="Type answer here" class="fill-input">
                <div class="form-row">
                    <button class="btn" id="submitAns">Submit</button>
                    <button class="btn ghost" id="reveal">Reveal</button>
                </div>

                <div class="small-muted" style="margin-top:8px">Level: ${q.level}</div>
            `;

            document.getElementById('submitAns').onclick = check;
            document.getElementById('reveal').onclick = ()=> { alert('Answer: '+q.word); newRound(); };
            document.getElementById('answerInput').onkeydown = (e)=> { if(e.key==='Enter') check(); };
        }
        function check(){
            const val = document.getElementById('answerInput').value.trim().toLowerCase();
            if(!val){ alert('Type something'); return; }
            if(val === q.word.toLowerCase()){
                award(12); alert('Correct! +' + 12 + ' pts');
            } else {
                alert('Wrong. Answer: ' + q.word);
            }
            newRound();
        }
        newRound();
    }

    // Matching game (click to pair)
    function runMatch() {
        const pool = allowedWords();
        const area = document.getElementById('gameArea');
        area.innerHTML = '';
        if (pool.length < 3) {
            area.innerHTML = '<div class="center small-muted">Need at least 3 words to play matching.</div>';
            return;
        }

        const picks = shuffle(pool.slice()).slice(0, 6);
        const left = shuffle(picks.map(p => ({ id: p.id, text: p.word })));
        const right = shuffle(picks.map(p => ({ id: p.id, text: p.meaning })));

        const matchColors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];
        const colorMap = {};
        picks.forEach((item, index) => {
            colorMap[item.id] = matchColors[index % matchColors.length];
        });

        let selLeft = null;
        let score = 0;

        function render() {
            area.innerHTML = `
                <div class="match-grid">
                    <div>
                        <div class="small-muted">Words</div>
                        <div class="list-col" id="leftCol"></div>
                    </div>
                    <div>
                        <div class="small-muted">Meanings</div>
                        <div class="list-col" id="rightCol"></div>
                    </div>
                </div>
                <div class="match-status small-muted">Matches: ${score} / ${picks.length}</div>
            `;

            const leftCol = document.getElementById('leftCol');
            const rightCol = document.getElementById('rightCol');
            leftCol.innerHTML = '';
            rightCol.innerHTML = '';

            left.forEach(item => {
                const el = document.createElement('div');
                el.className = 'pair';
                el.textContent = item.text;
                el.style.borderColor = colorMap[item.id];

                el.onclick = () => {
                    selLeft = item;
                    highlight();
                    [...leftCol.children].forEach(e => {
                        e.classList.remove('selected');
                        e.style.backgroundColor = '';
                        e.style.color = '';
                    });
                    el.classList.add('selected');
                    el.style.backgroundColor = colorMap[item.id];
                    el.style.color = 'white';
                };

                leftCol.appendChild(el);
            });

            right.forEach(item => {
                const el = document.createElement('div');
                el.className = 'pair';
                el.textContent = item.text;

                el.onclick = () => {
                    if (!selLeft) return;

                    const color = colorMap[item.id];
                    const leftEl = [...leftCol.children].find(e => e.textContent === selLeft.text);

                    if (item.id === selLeft.id) {
                        el.classList.add('selected');
                        el.style.backgroundColor = color;
                        el.style.color = 'white';

                        if (leftEl) {
                            leftEl.classList.add('correct');
                            el.classList.add('correct');
                        }

                        setTimeout(() => {
                            left.splice(left.findIndex(x => x.id === selLeft.id), 1);
                            right.splice(right.findIndex(x => x.id === item.id), 1);
                            score++;
                            award(8);
                            selLeft = null;
                            if (left.length === 0) {
                                alert('All matched! +' + (8 * picks.length) + ' pts');
                                renderGames();
                                return;
                            }
                            render();
                        }, 600);
                    } else {
                        if (leftEl) leftEl.classList.add('wrong');
                        el.classList.add('wrong');

                        setTimeout(() => {
                            if (leftEl) {
                                leftEl.classList.remove('wrong', 'selected');
                                leftEl.style.backgroundColor = '';
                                leftEl.style.color = '';
                            }
                            el.classList.remove('wrong');
                            selLeft = null;
                        }, 400);

                        award(0);
                    }
                };

                rightCol.appendChild(el);
            });
        }

        function highlight() {}
        render();
    }


    // Speed game - timed rapid quiz
    function runSpeed() {
    const pool = allowedWords();
    const area = document.getElementById('gameArea');
    area.innerHTML = '';
    if (pool.length < 3) {
        area.innerHTML = '<div class="center small-muted">Add more words for speed games.</div>';
        return;
    }

    const lvl = currentLevel();
    let timePer = lvl === 'Advanced' ? 6 : (lvl === 'Intermediate' ? 8 : 10);
    let rounds = 10;
    let current = 0, localScore = 0;
    const picks = shuffle(pool.slice()).slice(0, rounds);

    area.innerHTML = `
        <div class="speed-header flex-row spaced">
            <div>
                <strong>Speed quiz</strong>
                <div class="small-muted">Answer quickly: ${timePer}s per question</div>
            </div>
            <div class="score">
                <div id="timer" class="timer">${timePer}</div>
            </div>
        </div>
        <div id="speedQ" class="speed-question"></div>
        <div class="options" id="speedOptions"></div>
        <div class="small-muted" id="speedStatus"></div>
    `;

    let timer = null, remaining = timePer;
    next();

    function next() {
        if (timer) clearInterval(timer);
        if (current >= rounds) {
            award(localScore * 5);
            alert('Speed run done. Score: ' + localScore);
            renderGames();
            return;
        }

        const q = picks[current];
        const choices = generateChoices(q, pool, 4);
        document.getElementById('speedQ').textContent = q.word;

        const opts = document.getElementById('speedOptions');
        opts.innerHTML = '';

        choices.forEach(c => {
            const d = document.createElement('div');
            d.className = 'option';
            d.textContent = c.text;

            d.onmouseenter = () => d.classList.add('hovered');
            d.onmouseleave = () => d.classList.remove('hovered');

            d.onclick = () => {
                if (c.correct) {
                    d.classList.add('correct');
                    localScore++;
                    award(15);
                } else {
                    d.classList.add('wrong');
                }

                setTimeout(() => {
                    current++;
                    next();
                }, 500);
            };

            opts.appendChild(d);
        });

        remaining = timePer;
        document.getElementById('timer').textContent = remaining;
        timer = setInterval(() => {
            remaining--;
            document.getElementById('timer').textContent = remaining;
            if (remaining <= 0) {
                clearInterval(timer);
                current++;
                next();
            }
        }, 1000);
    }
}


    // Flashcards (simple)
    function runFlashcards() {
        const pool = allowedWords();
        const area = document.getElementById('gameArea');
        area.innerHTML = '';
        if (pool.length < 1) {
            area.innerHTML = '<div class="center small-muted">Add words to study flashcards.</div>';
            return;
        }

        let idx = 0, flip = false;
        const picks = shuffle(pool.slice()).slice(0, 20);

        function render() {
            const w = picks[idx % picks.length];
            area.innerHTML = `
                <div class="flashcard-container">
  <div class="small-muted">${w.level}</div>
  <div class="flashcard ${flip ? 'flipped' : ''}" id="card">
    <div class="flashcard-inner">
      <div class="card-face front">${escapeHtml(w.word)}</div>
      <div class="card-face back">${escapeHtml(w.meaning)}</div>
    </div>
  </div>
  <div class="flashcard-controls">
    <button class="btn" id="flipBtn">${flip ? 'Show Word' : 'Show Meaning'}</button>
    <button class="btn ghost" id="nextBtn">Next</button>
  </div>
</div>
                

            `;

            document.getElementById('flipBtn').onclick = () => {
                flip = !flip;
                render();
            };

            document.getElementById('nextBtn').onclick = () => {
                idx++;
                flip = false;
                render();
            };

            document.getElementById('card').onclick = () => {
                flip = !flip;
                render();
            };
        }

        render();
    }

    // Matching helper: generate choices
    function generateChoices(correct, pool, n){
        const others = shuffle(pool.filter(p=>p.id !== correct.id)).slice(0, Math.max(0,n-1));
        const choices = others.map(o=>({text:o.meaning, correct:false}));
        choices.push({text:correct.meaning, correct:true});
        return shuffle(choices);
    }

    // Progress tab
    function renderProgress(){
        content.innerHTML = '';
        const plays = data.stats.plays || 0;
        const correct = data.stats.correct || 0;
        const points = data.stats.points || 0;
        const accuracy = plays ? Math.round(100 * correct / (plays*1)) + '%' : '—';
        const lvl = currentLevel();
        content.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <div><h2 style="margin:0">Progress</h2><div class="small-muted">Your learning stats</div></div>
                <div style="text-align:right">
                    <div class="small-muted">Current level</div>
                    <div style="font-weight:800">${lvl}</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="card">
                    <div class="small-muted">Points</div>
                    <div style="font-size:1.4rem;font-weight:800">${points}</div>
                    <div style="margin-top:10px">
                        <div class="small-muted">Progress to next level</div>
                        <div class="progress" style="margin-top:6px"><i style="width:${progressPercent()}%"></i></div>
                        <div class="muted-note" style="margin-top:6px">${progressPercent()}% to next</div>
                    </div>
                </div>
                <div class="card">
                    <div class="small-muted">Activity</div>
                    <div style="display:flex;gap:12px;margin-top:8px">
                        <div><div style="font-weight:800">${plays}</div><div class="small-muted">sessions</div></div>
                        <div><div style="font-weight:800">${correct}</div><div class="small-muted">correct answers</div></div>
                        <div><div style="font-weight:800">${accuracy}</div><div class="small-muted">accuracy</div></div>
                    </div>
                </div>
            </div>
            <div style="margin-top:12px" class="card">
                <div class="small-muted">Word breakdown by level</div>
                <div style="display:flex;gap:8px;margin-top:8px">
                    <div style="flex:1;text-align:center"><div style="font-weight:800">${countLevel('Beginner')}</div><div class="small-muted">Beginner</div></div>
                    <div style="flex:1;text-align:center"><div style="font-weight:800">${countLevel('Intermediate')}</div><div class="small-muted">Intermediate</div></div>
                    <div style="flex:1;text-align:center"><div style="font-weight:800">${countLevel('Advanced')}</div><div class="small-muted">Advanced</div></div>
                </div>
            </div>
        `;
    }
    function countLevel(level){ return data.words.filter(w=>w.level===level).length; }
    function progressPercent(){
        const p = data.stats.points||0;
        if(p >= 150) return 100;
        if(p >= 50) return Math.min(100, Math.round(100*(p-50)/100));
        return Math.min(100, Math.round(100*p/50));
    }

    // Reminder tab (simulate email)
    function renderReminder(){
        content.innerHTML = '';
        content.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <div><h2 style="margin:0">Daily reminder (simulation)</h2><div class="small-muted">We will simulate sending a summary and a short quiz.</div></div>
                <div class="small-muted">Local only</div>
            </div>
            <div class="card">
                <div class="small-muted">Email</div>
                <input type="text" id="remEmail" placeholder="you@example.com" style="margin-top:8px">
                <div style="display:flex;gap:8px;margin-top:10px">
                    <button class="btn" id="saveEmail">Save</button>
                    <button class="btn ghost" id="sendNow">Simulate send now</button>
                    <button class="tab inactive" id="viewPrev">Preview last</button>
                </div>
                <div class="small-muted" style="margin-top:12px">New words added since last simulated reminder:</div>
                <ul id="newWordsList" class="list" style="margin-top:8px"></ul>
            </div>
        `;
        document.getElementById('remEmail').value = data.settings.email || '';
        renderNewWordsList();
        document.getElementById('saveEmail').onclick = ()=> {
            data.settings.email = document.getElementById('remEmail').value.trim();
            save(); alert('Email saved locally.');
        };
        document.getElementById('sendNow').onclick = ()=> {
            simulateSend();
        };
        document.getElementById('viewPrev').onclick = ()=> {
            alert('Last simulated reminder was at: ' + (data.settings.lastReminder ? new Date(data.settings.lastReminder).toLocaleString() : 'Never'));
        };
    }

    function renderNewWordsList(){
        const since = data.settings.lastReminder || 0;
        const newWords = data.words.filter(w=> w.addedAt > since);
        const list = document.getElementById('newWordsList');
        list.innerHTML = '';
        if(newWords.length===0){ list.innerHTML = '<li class="small-muted">No new words since last reminder.</li>'; return; }
        newWords.forEach(w=>{
            const li = document.createElement('li'); li.className='word-item';
            li.innerHTML = `<div><div style="font-weight:700">${escapeHtml(w.word)}</div><div class="meta">${escapeHtml(w.meaning)}</div></div><div class="small-muted">${w.level}</div>`;
            list.appendChild(li);
        });
    }

    function simulateSend(){
        const since = data.settings.lastReminder || 0;
        const newWords = data.words.filter(w=> w.addedAt > since);
        const email = data.settings.email || '(no email saved)';
        const quiz = generateSimulatedQuiz(3);
        const preview = `
Simulated email to: ${email}
Subject: Your vocabulary summary

New words (${newWords.length}):
${newWords.map(w=> '- '+w.word+': '+w.meaning).join('\n')}

Mini quiz:
${quiz.map((q,i)=> (i+1)+'. ' + q.question + '\n   ' + q.options.map((o,ix)=> String.fromCharCode(97+ix)+') '+o).join('\n')).join('\n\n')}

(Answers hidden in simulation)
`;
        alert(preview);
        data.settings.lastReminder = Date.now();
        save();
        renderReminder();
    }

    function generateSimulatedQuiz(n){
        const pool = allowedWords();
        const picks = shuffle(pool.slice()).slice(0,n);
        return picks.map(p=> {
            const choices = generateChoices(p, pool, 4).map(c=>c.text);
            return {question: 'Meaning of "'+p.word+'"?', options: choices, answer: p.meaning};
        });
    }

    // Small utilities
    function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
    function shuffle(a){ return a.slice().sort(()=>Math.random()-0.5); }
    function timeSince(ts){
        const sec = Math.floor((Date.now()-ts)/1000);
        if(sec < 60) return sec+'s';
        const m = Math.floor(sec/60);
        if(m < 60) return m+'m';
        const h = Math.floor(m/60);
        if(h < 24) return h+'h';
        const d = Math.floor(h/24);
        return d+'d';
    }
    function escapeHtml(s){ return (''+s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
    function pickRandomSample(){
        const samples = [
            {word:'eager', meaning:'wanting very much', level:'Beginner'},
            {word:'opaque', meaning:'not transparent; hard to understand', level:'Intermediate'},
            {word:'ephemeral', meaning:'lasting a very short time', level:'Advanced'},
        ];
        return samples[Math.floor(Math.random()*samples.length)];
    }

    // Quick add bindings
    document.getElementById('quickAddBtn').onclick = ()=>{
        const w = document.getElementById('quickWord').value.trim();
        const m = document.getElementById('quickMeaning').value.trim();
        const l = document.getElementById('quickLevel').value;
        if(!w||!m){ alert('Fill both fields'); return; }
        addWord(w,m,l);
        document.getElementById('quickWord').value=''; document.getElementById('quickMeaning').value='';
        if(currentTab==='learn') renderWordList();
        else renderSidebar();
    };
    document.getElementById('importSample').onclick = ()=> {
        defaultData.words.forEach(w=> addWord(w.word,w.meaning,w.level));
        alert('Sample words added');
        if(currentTab==='learn') renderWordList(); else renderSidebar();
    };

    // helpers: random seed for UI
    // Prevent accidental global leaks

})();

// Theme toggle
const themes = ['light', 'dark', 'pastel', 'neon', 'sunrise', 'cosmic', 'pixel', 'forest', 'ocean', 'candy', 'mono'];

let currentTheme = localStorage.getItem('theme') || 'light';
document.body.classList.add(currentTheme);

document.getElementById('toggleTheme').onclick = () => {
  const i = themes.indexOf(currentTheme);
  const next = themes[(i + 1) % themes.length];
  document.body.classList.remove(currentTheme);
  document.body.classList.add(next);
  currentTheme = next;
  localStorage.setItem('theme', next);
};


//     const themes = ['light', 'dark', 'pastel', 'neon', 'sunrise', 'cosmic'];
//  const icons = {
//    light: 'fa-sun',
//    dark: 'fa-moon',
//    pastel: 'fa-heart',
//    neon: 'fa-bolt',
//    sunrise: 'fa-cloud-sun',
//    cosmic: 'fa-star'
//  }
//  let currentTheme = localStorage.getItem('theme') || 'light';
//  document.body.classList.add(currentTheme);
//  updateThemeIcon(currentTheme);

//  document.getElementById('toggleTheme').onclick = () => {
//    const i = themes.indexOf(currentTheme);
//    const next = themes[(i + 1) % themes.length];
//    document.body.classList.remove(currentTheme);
//    document.body.classList.add(next);
//    currentTheme = next;
//    localStorage.setItem('theme', next);
//    updateThemeIcon(next);
//  }
//  function updateThemeIcon(theme) {
//    const icon = document.getElementById('themeIcon');
//    icon.className = 'fa-solid ' + (icons[theme] || 'fa-circle');
//  }





// (function(){
//   // ... tu código existente ...

//   // Tema: aplicar preferencia guardada
//    if(localStorage.getItem('theme') === 'dark'){
//      document.body.classList.add('dark');
//    }

//    document.getElementById('toggleTheme').onclick = () => {
//      document.body.classList.toggle('dark');
//     const isDark = document.body.classList.contains('dark');
//      localStorage.setItem('theme', isDark ? 'dark' : 'light');
//    };

// // })();

