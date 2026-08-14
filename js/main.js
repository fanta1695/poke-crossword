// ==========================================
// パズル情報の表示更新
// ==========================================
function updatePuzzleMeta(dfs) {
    const metaEl = document.getElementById('puzzle-meta');
    if (!metaEl || !dfs) return;

    const diffNames = { 'normal': 'ノーマル', 'super': 'スーパー', 'hyper': 'ハイパー', 'master': 'マスター' };
    let diffStr = diffNames[dfs.difficulty] || '不明';

    // 世代番号を地方名に変換するための対応表
    const regionNames = {
        1: 'カントー', 2: 'ジョウト', 3: 'ホウエン',
        4: 'シンオウ', 5: 'イッシュ', 6: 'カロス',
        7: 'アローラ', 8: 'ガラル/ヒスイ', 9: 'パルデア'
    };

    let genStr = "";
    if (dfs.allowedGens && dfs.allowedGens.length === 9) {
        genStr = "すべて";
    } else if (dfs.allowedGens && dfs.allowedGens.length > 0) {
        // 数字の配列を地方名の配列に変換してから「、」で結合する
        genStr = dfs.allowedGens.map(g => regionNames[g] || g).join('、');
    } else {
        genStr = "不明";
    }

    let hintStr = "";
    let hints = [];
    const hm = dfs.hintMode;
    if (hm.type === 'normal') hints = ['図鑑No', 'タイプ', '特性'];
    else if (hm.type === 'super') hints = ['図鑑No', 'タイプ'];
    else if (hm.type === 'select') {
        if (hm.selected.includes('no')) hints.push('図鑑No');
        if (hm.selected.includes('type')) hints.push('タイプ');
        if (hm.selected.includes('ability')) hints.push('特性');
        if (hm.selected.includes('stats')) hints.push('種族値');
    }
    
    if (hints.length === 4) {
        hintStr = "すべて";
    } else if (hints.length > 0) {
        hintStr = hints.join('、');
    } else {
        hintStr = "なし";
    }

    metaEl.innerHTML = `
        <div style="font-size: 15px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed var(--border-color);">
            <strong>難易度: ${diffStr}</strong>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 16px; color: var(--text-muted);">
            <div>地方: ${genStr}</div>
            <div>ヒント: ${hintStr}</div>
        </div>
    `;
    metaEl.style.display = 'block';
}

// ==========================================
// シェア用テキストの共通生成関数
// ==========================================
function generateShareText() {
    let timeStr = "";
    if (useTimer) {
        let currentElapsed = (isCleared || isGivenUp) ? clearTimeMs : (Date.now() - playStartTime);
        const totalSec = Math.floor(currentElapsed / 1000);
        const m = Math.floor(totalSec / 60);
        const s = (totalSec % 60).toString().padStart(2, '0');
        timeStr = `\n⏱ タイム: ${m}分${s}秒`;
    }

    const baseUrl = window.location.href.split('?')[0];
    const shareUrl = `${baseUrl}?id=${currentGameData.problemId}`;
    
    let extraStr = "";
    if (currentModeName.includes("今日の問題")) {
        const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;
        extraStr += `\n🟩1回 🟨2回 🟥3回以上\n\n`;
        
        let gridStr = "";
        for(let y = 0; y < currentGameData.height; y++) {
            for(let x = 0; x < currentGameData.width; x++) {
                if(!currentGameData.grid[y][x].char) {
                    gridStr += "⬛"; 
                } else {
                    const errCount = cellErrorCounts[`${x},${y}`] || 0;
                    if(errCount === 0) gridStr += "🟩";
                    else if(errCount === 1) gridStr += "🟨";
                    else gridStr += "🟥";
                }
            }
            gridStr += "\n";
        }
        extraStr += gridStr;
        return `#ポケモンクロスワード\n📅 ${dateStr} の問題${extraStr}\n${shareUrl}`;
    } else {
        return `#ポケモンクロスワード をクリアしました！🎉\n難易度: ${currentModeName}${timeStr}\n\n${shareUrl}`;
    }
}

// ==========================================
// 途中状態の保存と復元（オートセーブ機能）
// ==========================================
function saveGameState() {
    if (!currentGameData) return;
    
    let userInputs = {};
    for (let y = 0; y < currentGameData.height; y++) {
        for (let x = 0; x < currentGameData.width; x++) {
            const textEl = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"] .cell-text`);
            if (textEl && textEl.textContent) {
                userInputs[`${x},${y}`] = textEl.textContent;
            }
        }
    }

    const state = {
        currentGameData: currentGameData,
        userInputs: userInputs,
        currentModeName: currentModeName,
        useTimer: useTimer,
        playStartTime: playStartTime,
        elapsedMs: (isCleared || isGivenUp) ? clearTimeMs : (Date.now() - playStartTime),
        isCleared: isCleared,
        isGivenUp: isGivenUp,
        cellErrorCounts: cellErrorCounts,
        totalSubmitErrors: totalSubmitErrors,
        activeX: activeX,
        activeY: activeY,
        activeDir: activeDir
    };
    localStorage.setItem('pokemonCrosswordState', JSON.stringify(state));

    if (currentModeName === "今日の問題") {
        const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
        state.savedDate = dateStr; 
        localStorage.setItem('pokemonCrosswordDailyState', JSON.stringify(state));
    }
}

function clearGameState() {
    localStorage.removeItem('pokemonCrosswordState');
}

function restoreStateObj(state) {
    currentGameData = state.currentGameData;
    
    if (!currentGameData.difficulty) currentGameData.difficulty = 'normal';
    if (!currentGameData.allowedGens) currentGameData.allowedGens = [1,2,3,4,5,6,7,8,9];
    if (!currentGameData.hintMode) currentGameData.hintMode = { type: 'normal' };

    currentModeName = state.currentModeName;
    useTimer = state.useTimer;
    
    isCleared = state.isCleared;
    isGivenUp = state.isGivenUp;
    cellErrorCounts = state.cellErrorCounts || {};
    totalSubmitErrors = state.totalSubmitErrors || 0;
    activeX = state.activeX;
    activeY = state.activeY;
    activeDir = state.activeDir || 'H';
    
    if (useTimer) {
        if (isCleared || isGivenUp) {
            clearTimeMs = state.elapsedMs;
        } else {
            playStartTime = Date.now() - state.elapsedMs;
        }
    }

    titleScreen.style.display = 'none';
    const trc = document.getElementById('title-rule-container');
    if (trc) trc.style.display = 'none';
    gameScreen.style.display = 'flex';
    statusEl.style.display = 'none';

    updatePuzzleMeta(currentGameData);
    renderBoard(currentGameData);
    renderClues(currentGameData);

    for (const key in state.userInputs) {
        const [x, y] = key.split(',');
        const textEl = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"] .cell-text`);
        if (textEl) textEl.textContent = state.userInputs[key];
    }

    if (isCleared || isGivenUp) {
        submitBtn.style.display = "none";
        giveupBtn.style.display = "none";
        activeClueDisplay.style.display = "flex";
        if (isCleared) {
            activeClueDisplay.innerHTML = '<div style="width: 100%; text-align: center; color: var(--text-muted);">クリアおめでとうございます！</div>';
        } else {
            activeClueDisplay.innerHTML = '<div style="width: 100%; text-align: center; color: var(--text-muted);">ギブアップしました</div>';
        }
        activeX = null; activeY = null;
    } else {
        submitBtn.style.display = "block";
        giveupBtn.style.display = "block";
        activeClueDisplay.style.display = "flex";
        updateHighlight();
        if (useTimer) startTimer();
    }
}

function restoreGameState() {
    const savedState = localStorage.getItem('pokemonCrosswordState');
    if (!savedState) return;

    try {
        const state = JSON.parse(savedState);
        restoreStateObj(state); // 共通関数を呼び出す
    } catch(e) {
        console.error("セーブデータの復元に失敗しました", e);
        clearGameState();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    restoreGameState();
    renderHistory();
});

// ==========================================
// 履歴の管理
// ==========================================
function addHistory(problemId, modeName, sizeStr) {
    let history = JSON.parse(localStorage.getItem('pokemonCrosswordHistory') || '[]');
    
    // すでに同じIDの履歴があるか探す
    const existingRecord = history.find(h => h.id === problemId);
    // すでにある場合は、引数の modeName ではなく、過去の modeName を優先する
    const finalModeName = existingRecord ? existingRecord.modeName : modeName;

    // 古い重複データを削除
    history = history.filter(h => h.id !== problemId);
    
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    history.unshift({
        id: problemId,
        modeName: finalModeName, // 維持した名前を使う
        size: sizeStr,
        dateStr: `${yyyy}/${mm}/${dd} ${hh}:${min}`,
        timestamp: now.getTime()
    });

    if (history.length > 100) {
        history = history.slice(0, 100);
    }
    localStorage.setItem('pokemonCrosswordHistory', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const listEl = document.getElementById('history-list');
    if (!listEl) return;
    
    let history = JSON.parse(localStorage.getItem('pokemonCrosswordHistory') || '[]');
    
    if (history.length === 0) {
        listEl.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 10px 0;">履歴はありません</div>';
        return;
    }
    
    listEl.innerHTML = '';
    history.forEach(h => {
        const item = document.createElement('div');
        item.style.padding = '10px 12px';
        item.style.backgroundColor = 'var(--surface-hover)';
        item.style.border = '2px solid var(--border-color)';
        item.style.borderRadius = '8px';
        item.style.cursor = 'pointer';
        item.style.display = 'flex';
        item.style.flexDirection = 'column';
        item.style.gap = '4px';
        item.style.transition = '0.2s';
        
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600; font-size: 14px; color: var(--text-main);">${h.modeName} <span style="font-size: 12px; font-weight: normal; color: var(--text-muted);">(${h.size})</span></span>
                <span style="font-size: 12px; color: var(--text-muted);">${h.dateStr}</span>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">ID: ${h.id}</div>
        `;
        
        item.addEventListener('click', () => {
            document.querySelectorAll('.history-item').forEach(el => {
                el.style.borderColor = 'var(--border-color)';
                el.style.backgroundColor = 'var(--surface-hover)';
            });
            item.style.borderColor = 'var(--border-primary)';
            item.style.backgroundColor = 'var(--clue-active-bg)';
            
            const inputEl = document.getElementById('problem-id-input');
            inputEl.value = h.id;
            inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        
        item.classList.add('history-item');
        listEl.appendChild(item);
    });
}

// ==========================================
// 戦績（きろく）の管理
// ==========================================
function loadStats() {
    const defaultStats = {
        daily: { clearCount: 0, currentStreak: 0, maxStreak: 0, lastClearDate: "" },
        free: {
            "ノーマル": { clearCount: 0, bestTime: null },
            "スーパー": { clearCount: 0, bestTime: null },
            "ハイパー": { clearCount: 0, bestTime: null },
            "マスター": { clearCount: 0, bestTime: null }
        }
    };
    const saved = localStorage.getItem('pokemonCrosswordStats');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return {
                daily: { ...defaultStats.daily, ...(parsed.daily || {}) },
                free: {
                    "ノーマル": { ...defaultStats.free["ノーマル"], ...(parsed.free?.["ノーマル"] || {}) },
                    "スーパー": { ...defaultStats.free["スーパー"], ...(parsed.free?.["スーパー"] || {}) },
                    "ハイパー": { ...defaultStats.free["ハイパー"], ...(parsed.free?.["ハイパー"] || {}) },
                    "マスター": { ...defaultStats.free["マスター"], ...(parsed.free?.["マスター"] || {}) }
                }
            };
        } catch(e) {
            return defaultStats;
        }
    }
    return defaultStats;
}

function saveStats(statsObj) {
    localStorage.setItem('pokemonCrosswordStats', JSON.stringify(statsObj));
}

function updateStatsOnClear() {
    let stats = loadStats();
    
    if (currentModeName === "今日の問題") {
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        
        if (stats.daily.lastClearDate !== todayStr) {
            stats.daily.clearCount++;
            
            if (stats.daily.lastClearDate) {
                const lastDate = new Date(stats.daily.lastClearDate);
                const currDate = new Date(todayStr);
                const diffTime = Math.abs(currDate - lastDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    stats.daily.currentStreak++;
                } else {
                    stats.daily.currentStreak = 1;
                }
            } else {
                stats.daily.currentStreak = 1;
            }
            
            stats.daily.maxStreak = Math.max(stats.daily.maxStreak, stats.daily.currentStreak);
            stats.daily.lastClearDate = todayStr;
        }
    } else {
        if (stats.free[currentModeName]) {
            stats.free[currentModeName].clearCount++;
            
            if (useTimer) {
                const currentBest = stats.free[currentModeName].bestTime;
                if (currentBest === null || clearTimeMs < currentBest) {
                    stats.free[currentModeName].bestTime = clearTimeMs;
                }
            }
        }
    }
    
    saveStats(stats);
}

function formatTimeMs(ms) {
    if (ms === null) return "-";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

const statsBtnTitle = document.getElementById('stats-btn-title');
const statsModal = document.getElementById('stats-modal');
const closeStatsBtn = document.getElementById('close-stats-btn');

function showStatsModal() {
    const stats = loadStats();
    
    document.getElementById('stats-daily-count').textContent = `${stats.daily.clearCount}`;
    document.getElementById('stats-daily-streak').textContent = `${stats.daily.currentStreak}`;
    document.getElementById('stats-daily-max-streak').textContent = `${stats.daily.maxStreak}`;
    
    document.getElementById('stats-free-count-normal').textContent = `${stats.free["ノーマル"].clearCount}`;
    document.getElementById('stats-free-count-super').textContent = `${stats.free["スーパー"].clearCount}`;
    document.getElementById('stats-free-count-hyper').textContent = `${stats.free["ハイパー"].clearCount}`;
    document.getElementById('stats-free-count-master').textContent = `${stats.free["マスター"].clearCount}`;
    
    document.getElementById('stats-time-normal').textContent = formatTimeMs(stats.free["ノーマル"].bestTime);
    document.getElementById('stats-time-super').textContent = formatTimeMs(stats.free["スーパー"].bestTime);
    document.getElementById('stats-time-hyper').textContent = formatTimeMs(stats.free["ハイパー"].bestTime);
    document.getElementById('stats-time-master').textContent = formatTimeMs(stats.free["マスター"].bestTime);
    
    statsModal.style.display = 'flex';
}

function hideStatsModal() {
    statsModal.style.display = 'none';
}

if (statsBtnTitle) statsBtnTitle.addEventListener('click', showStatsModal);
if (closeStatsBtn) closeStatsBtn.addEventListener('click', hideStatsModal);

// ==========================================
// カスタムモーダルの制御
// ==========================================
let modalConfirmCallback = null;

function showMessageModal(title, message, isConfirm, confirmCallback, showTweetBtn = false, okText = "OK") {
    messageModalTitle.textContent = title;
    messageModalText.innerHTML = message;
    
    messageModalCancel.style.display = isConfirm ? 'block' : 'none';
    messageModalTweet.style.display = showTweetBtn ? 'block' : 'none';
    
    messageModalOk.textContent = okText ? okText : (isConfirm ? "OK" : "とじる");
    
    modalConfirmCallback = confirmCallback;
    messageModal.style.display = 'flex';
}

messageModalOk.addEventListener('click', () => {
    messageModal.style.display = 'none';
    if (modalConfirmCallback) modalConfirmCallback(true);
});

messageModalCancel.addEventListener('click', () => {
    messageModal.style.display = 'none';
    if (modalConfirmCallback) modalConfirmCallback(false);
});

messageModalTweet.addEventListener('click', () => {
    const text = generateShareText();
    openTweet(text);
});

// ==========================================
// ルール（遊び方）モーダルの制御
// ==========================================
const ruleBtnTitle = document.getElementById('rule-btn-title');
const ruleBtnGame = document.getElementById('rule-btn-game');
const ruleModal = document.getElementById('rule-modal');
const closeRuleBtn = document.getElementById('close-rule-btn');

// ルール用の独立したクラス（.rule-tab）を使用する
const ruleTabs = document.querySelectorAll('#rule-tabs .rule-tab');

function showRuleModal() {
    ruleModal.style.display = 'flex';
}

function hideRuleModal() {
    ruleModal.style.display = 'none';
}

if (ruleBtnTitle) ruleBtnTitle.addEventListener('click', showRuleModal);
if (ruleBtnGame) ruleBtnGame.addEventListener('click', showRuleModal);
if (closeRuleBtn) closeRuleBtn.addEventListener('click', hideRuleModal);

ruleTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        ruleTabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#rule-modal .rule-section').forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`rule-sec-${tab.dataset.tab}`).classList.add('active');
    });
});

// ==========================================
// 「このサイトについて」モーダルの制御
// ==========================================
const aboutBtnTitle = document.getElementById('about-btn-title');
const aboutModal = document.getElementById('about-modal');
const closeAboutBtn = document.getElementById('close-about-btn');

if (aboutBtnTitle) {
    aboutBtnTitle.addEventListener('click', () => {
        aboutModal.style.display = 'flex';
    });
}

if (closeAboutBtn) {
    closeAboutBtn.addEventListener('click', () => {
        aboutModal.style.display = 'none';
    });
}

// ==========================================
// タイトル画面とUIの初期化
// ==========================================
document.getElementById('daily-title').textContent = `${today.getMonth() + 1}月${today.getDate()}日の問題`;

const diffDescriptions = {
    'normal': 'サクサク遊べる標準型！<br>好きな地方を選んで、図鑑No・タイプ・特性から推理しよう。',
    'super': '手軽さとやりごたえのバランス型！<br>好きな地方を選んで、図鑑No・タイプ・特性から推理しよう。',
    'hyper': 'じっくり考えたい上級者向け！<br>全地方を対象に、図鑑Noとタイプのみから推理しよう。',
    'master': 'ポケモンマスター向けの最高難度！<br>全地方を対象に、選んだ出題ヒントから「1つのみ」を頼りに推理！'
};

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});

document.querySelectorAll('input[name="difficulty"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const hintContainer = document.getElementById('hint-options-container');
        const genContainer = document.getElementById('gen-options-container');
        const descEl = document.getElementById('diff-description');
        
        descEl.innerHTML = diffDescriptions[e.target.value];
        
        if (e.target.value === 'master') {
            hintContainer.style.display = 'block';
            genContainer.style.display = 'none';
        } else if (e.target.value === 'hyper') {
            hintContainer.style.display = 'none';
            genContainer.style.display = 'none';
        } else {
            hintContainer.style.display = 'none';
            genContainer.style.display = 'block';
        }
    });
});

// ==========================================
// タイマーとローディング画面の制御
// ==========================================
function startTimer() {
    clearInterval(timerInterval);
    
    if (!useTimer) {
        timerEl.style.display = 'none';
        return;
    }
    
    timerEl.style.display = 'block';
    
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - playStartTime) / 1000);
        const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const s = (elapsed % 60).toString().padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

let loadingInterval = null;

function startLoadingAnimation(targetSize) {
    statusEl.style.display = 'none'; 
    
    boardEl.innerHTML = "";
    boardEl.style.gridTemplateColumns = "1fr";
    boardEl.style.gridTemplateRows = "1fr";
    
    let tempSize = 40;
    if (window.innerWidth <= 600) {
        // スマホ時：余白100を引いて計算
        tempSize = Math.max(24, Math.min(40, Math.floor((window.innerHeight - 100) / targetSize)));
    } else {
        // PC・タブレット時の計算
        const sizeByWidth = Math.floor((window.innerWidth * 0.9) / targetSize);
        const sizeByHeight = Math.floor((window.innerHeight - 180) / targetSize);
        tempSize = Math.max(26, Math.min(40, Math.min(sizeByWidth, sizeByHeight)));
    }
    const sizePx = Math.max(targetSize * tempSize, 200);
    
    boardEl.innerHTML = `
        <div class="loading-board" style="width: ${sizePx}px; height: ${sizePx}px;">
            <div class="pulse-content">
                <div class="loading-spinner"></div>
                <div id="loading-text" style="font-size: 14px; text-align: center; line-height: 1.6;">自動生成を開始しています...</div>
            </div>
        </div>
    `;

    const loadingStartTime = Date.now();
    clearInterval(loadingInterval);
    
    loadingInterval = setInterval(() => {
        const loadingTextEl = document.getElementById('loading-text');
        if (!loadingTextEl) return;

        const elapsedSec = ((Date.now() - loadingStartTime) / 1000).toFixed(1);
        
        let phaseText = "自動生成を開始しています...";
        if (elapsedSec >= 70.0) {
            phaseText = "カビゴンが処理の道をふさいでいます...<br>もう少しお待ちください！";
        } else if (elapsedSec >= 60.0) {
            phaseText = "ヤドンがのんびりヒントを考えています...";
        } else if (elapsedSec >= 50.0) {
            phaseText = "アンノーンが文字を並び替えています...";
        } else if (elapsedSec >= 40.0) {
            phaseText = "フーディンがIQ5000の頭脳で計算中...";
        } else if (elapsedSec >= 30.0) {
            phaseText = "メタグロスが４つの脳で並列処理中...";
        } else if (elapsedSec >= 20.0) {
            phaseText = "ポリゴンがデータ空間を探索中...";
        } else if (elapsedSec >= 10.0) {
            phaseText = "最高の問題を厳選中...";
        } else if (elapsedSec >= 5.0) {
            phaseText = "文字の交差を最適化中...";
        } else if (elapsedSec >= 0.5) {
            phaseText = "単語の配置を計算中...";
        }

        loadingTextEl.innerHTML = `
            ${phaseText}<br>
            <span style="font-size: 12px; color: #a1a1aa; font-weight: normal; margin-top: 4px; display: inline-block;">
                経過時間: ${elapsedSec}s
            </span>
        `;
    }, 100);
}

function stopLoadingAnimation() {
    clearInterval(loadingInterval);
}

// ==========================================
// ギブアップ処理
// ==========================================
giveupBtn.addEventListener('click', () => {
    showMessageModal("確認", "本当にギブアップして答えを見ますか？<br>（クリア扱いにはなりません）", true, (res) => {
        if (res) {
            isGivenUp = true;
            stopTimer();
            clearTimeMs = Date.now() - playStartTime;
            
            for (let y = 0; y < currentGameData.height; y++) {
                for (let x = 0; x < currentGameData.width; x++) {
                    const cellData = currentGameData.grid[y][x];
                    if (cellData.char) {
                        const textEl = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"] .cell-text`);
                        if (textEl) {
                            textEl.textContent = cellData.char;
                        }
                        const cellEl = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
                        if (cellEl) {
                            cellEl.classList.remove('error', 'active', 'highlight');
                        }
                    }
                }
            }
            
            document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
            document.querySelectorAll('.word-error-box').forEach(el => el.remove());
            document.querySelectorAll('.clue-list li').forEach(el => el.classList.remove('active'));
            
            activeX = null;
            activeY = null;
            activeClueDisplay.innerHTML = '<div style="width: 100%; text-align: center; color: var(--text-muted);">ギブアップしました</div>';
            
            submitBtn.style.display = "none"; 
            giveupBtn.style.display = "none"; 
            
            showMessageModal("ギブアップ", "答えを表示しました。<br>リベンジをお待ちしています！", false);
            
            saveGameState();
        }
    });
});

// ==========================================
// 答え合わせ処理
// ==========================================
submitBtn.addEventListener('click', () => {
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.word-error-box').forEach(el => el.remove());
    
    let hasError = false;
    let isFullyFilled = true;
    
    let correctCells = new Set();
    let errorCells = new Set();
    let errorKeyIds = [];

    for (const [keyId, meta] of Object.entries(clueConditions)) {
        let userInput = "";
        for(let i=0; i < meta.length; i++){
             let cx = meta.x + (meta.dir === 'H' ? i : 0);
             let cy = meta.y + (meta.dir === 'V' ? i : 0);
             const textEl = document.querySelector(`.cell[data-x="${cx}"][data-y="${cy}"] .cell-text`);
             if(textEl && textEl.textContent) {
                 userInput += textEl.textContent;
             } else {
                 userInput += " "; 
             }
        }
        
        if(userInput.includes(" ")) {
            isFullyFilled = false;
            continue; 
        }

        const pokeData = pokemonDetails[userInput];
        let isContradicted = false;

        if (!pokeData) {
            isContradicted = true; 
        } else {
            const cond = meta.condition;
            if (cond.no && pokeData.no !== cond.no) isContradicted = true;
            if (cond.stats && pokeData.stats !== cond.stats) isContradicted = true;
            if (cond.type) {
                for(let t of cond.type) {
                    if (!pokeData.type.includes(t)) { isContradicted = true; break; }
                }
            }
            if (cond.ability) {
                if (cond.ability.length !== pokeData.ability.length) {
                    isContradicted = true;
                } else {
                    for(let a of cond.ability) {
                        if (!pokeData.ability.includes(a)) { isContradicted = true; break; }
                    }
                }
            }
        }

        if (isContradicted) {
            hasError = true;
            errorKeyIds.push(keyId);
            for(let i=0; i < meta.length; i++){
                let cx = meta.x + (meta.dir === 'H' ? i : 0);
                let cy = meta.y + (meta.dir === 'V' ? i : 0);
                errorCells.add(`${cx},${cy}`);
            }
        } else {
            for(let i=0; i < meta.length; i++){
                let cx = meta.x + (meta.dir === 'H' ? i : 0);
                let cy = meta.y + (meta.dir === 'V' ? i : 0);
                correctCells.add(`${cx},${cy}`);
            }
        }
    }

    let actualErrorCells = new Set();
    for (let ec of errorCells) {
        if (!correctCells.has(ec)) {
            actualErrorCells.add(ec);
        }
    }

    if (!isFullyFilled) {
        playSE(seError);
        showMessageModal("判定結果", "まだ埋まっていないマスがあります。", false);
        return;
    }

    if (hasError) {
        playSE(seError);
        showMessageModal("判定結果", "<span style='color: var(--danger); font-weight: bold;'>条件に合わない単語（カギ）があります！</span><br>赤く光っている箇所を確認してください。", false);
        
        errorKeyIds.forEach(kid => {
            const li = document.getElementById(`clue-${kid}`);
            if (li) li.classList.add('error');
            
            const meta = clueConditions[kid];
            const errBox = document.createElement('div');
            errBox.id = `errbox-${kid}`;
            errBox.classList.add('word-error-box');
            
            errBox.style.left = (meta.x * currentCellSize) + 'px';
            errBox.style.top = (meta.y * currentCellSize) + 'px';
            errBox.style.width = (meta.dir === 'H' ? meta.length * currentCellSize : currentCellSize) + 'px';
            errBox.style.height = (meta.dir === 'V' ? meta.length * currentCellSize : currentCellSize) + 'px';
            
            boardEl.appendChild(errBox);
        });

        totalSubmitErrors++;
        actualErrorCells.forEach(coord => {
            cellErrorCounts[coord] = (cellErrorCounts[coord] || 0) + 1;
        });
        saveGameState();
        
    } else {
        playSE(seClear);
        isCleared = true;
        
        activeX = null;
        activeY = null;
        document.querySelectorAll('.cell.white').forEach(el => el.classList.remove('active', 'highlight'));
        document.querySelectorAll('.clue-list li').forEach(el => el.classList.remove('active'));
        activeClueDisplay.innerHTML = '<div style="width: 100%; text-align: center; color: var(--text-muted);">クリアおめでとうございます！</div>';
        giveupBtn.style.display = "none";
        submitBtn.style.display = "none"; 
        
        if (useTimer) {
            clearTimeMs = Date.now() - playStartTime;
            stopTimer();
        }
        
        updateStatsOnClear();
        
        showMessageModal("クリア！", "<span style='color: var(--success); font-weight: bold; font-size: 18px;'>大正解！完全クリアです！🎉</span><br><br>下のボタンから結果を自慢しよう！", false, null, true);
        
        saveGameState();
    }
});

// ==========================================
// 画面遷移とパズル生成
// ==========================================
backBtn.addEventListener('click', () => {
    let msg = "ゲームをやめてタイトルに戻りますか？<br>入力した内容はすべて失われます。";
    if (currentModeName === "今日の問題") {
        msg = "ゲームをやめてタイトルに戻りますか？<br><span style='color: var(--primary); font-size: 13px;'>※今日の問題の進行状況は、日付が変わるまで自動で保存されます。</span>";
    }

    showMessageModal("確認", msg, true, (res) => {
        if (res) {
            currentGenerationId++; 
            startDailyBtn.disabled = false;
            startFreeBtn.disabled = false;

            stopTimer(); 
            stopLoadingAnimation(); 
            timerEl.style.display = 'none';
            gameScreen.style.display = 'none';
            titleScreen.style.display = 'flex';
            const trc = document.getElementById('title-rule-container');
            if (trc) trc.style.display = 'flex';
            
            clearGameState();
        }
    });
});

const tryGenerate = (targetSize, targetMinWords, hintMode, allowedGens, difficulty, attempt, maxAttempts, dailySeedStr = null, genId = 0) => {
    titleScreen.style.display = 'none';
    const trc = document.getElementById('title-rule-container');
    if (trc) trc.style.display = 'none';
    gameScreen.style.display = 'flex';
    
    timerEl.style.display = 'none'; 
    statusEl.style.display = 'none'; 
    
    cluesContainer.style.display = "none";
    submitBtn.style.display = "none";
    giveupBtn.style.display = "none"; 
    document.getElementById('special-keys').style.display = "none";
    activeClueDisplay.style.display = "none"; 
    document.getElementById('puzzle-meta').style.display = "none";
    activeX = null; activeY = null; 
    
    cellErrorCounts = {};
    totalSubmitErrors = 0;
    isGivenUp = false; 

    if (attempt === 1) {
        startLoadingAnimation(targetSize);
    }

    setTimeout(() => {
        if (currentGenerationId !== genId) return;

        let rng;
        if (dailySeedStr) {
            const seed = hashString(dailySeedStr + "_attempt_" + attempt);
            rng = new Random(seed);
        } else {
            rng = new Random(Math.floor(Math.random() * 2147483647));
        }
        
        let allPokemons = [];
        for (let len in pokemonIndex) {
            if (parseInt(len) < 3) continue; 
            for (let idx in pokemonIndex[len]) {
                for (let char in pokemonIndex[len][idx]) {
                    allPokemons.push(...pokemonIndex[len][idx][char]);
                }
            }
        }
        
        allPokemons = [...new Set(allPokemons)].filter(p => pokemonDetails[p]);
        
        let allowedWords = new Set();
        const genRanges = {
            1: [1, 151], 2: [152, 251], 3: [252, 386],
            4: [387, 493], 5: [494, 649], 6: [650, 721],
            7: [722, 809], 8: [810, 905], 9: [906, 1025]
        };
        for (let p of allPokemons) {
            let no = parseInt(pokemonDetails[p].no, 10);
            for (let g of allowedGens) {
                if (no >= genRanges[g][0] && no <= genRanges[g][1]) {
                    allowedWords.add(p);
                    break;
                }
            }
        }
        if (allowedWords.size === 0) allowedWords = new Set(allPokemons);

        let timeLimitMs = 1000;
        if (targetSize === 8) timeLimitMs = 1500;
        else if (targetSize === 11) timeLimitMs = 2500;
        else if (targetSize >= 15) timeLimitMs = 4000;

        const dfs = new CrosswordDFS(targetSize, targetMinWords, pokemonIndex, allowedWords, timeLimitMs);
        dfs.difficulty = difficulty;
        dfs.allowedGens = allowedGens;
        dfs.hintMode = hintMode;
        
        dfs.shuffle = function(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = rng.nextInt(i + 1);
                [array[i], array[j]] = [array[j], array[i]];
            }
        };

        let allowedArray = Array.from(allowedWords);
        
        let validFirstWords = allowedArray.filter(w => w.length <= targetSize);
        let firstWord = "";
        if (validFirstWords.length > 0) {
            firstWord = validFirstWords[rng.nextInt(validFirstWords.length)];
        } else {
            firstWord = "ピカチユウ";
        }

        dfs.place({ text: firstWord, x: Math.floor(targetSize / 2) - Math.floor(firstWord.length / 2), y: Math.floor(targetSize / 2), dir: 'H' });
        dfs.usedWords.add(firstWord);

        dfs.startTime = Date.now();
        dfs.solve(); 
        dfs.restoreBest();
        dfs.trim();

        let allSatisfied = dfs.placedWords.length > 0 && dfs.placedWords.every(w => dfs.getCrossCount(w) >= 2);
        
        let isIdeal = dfs.bestScore > 0;
        
        let isFullSize = (targetSize === 5) ? (dfs.width === 5 && dfs.height === 5) : true;

        if (currentGenerationId !== genId) return;

        if (dfs.placedWords.length >= targetMinWords && allSatisfied && isIdeal && isFullSize) {
            dfs.assignNumbers();
            dfs.problemId = generateProblemId(dfs);
            currentGameData = dfs; 

            // 「今日の問題」なら「〇年〇月〇日の問題」に変換して履歴に保存する
            let modeNameForHistory = currentModeName;
            if (currentModeName === "今日の問題") {
                const yyyy = today.getFullYear();
                const mm = today.getMonth() + 1;
                const dd = today.getDate();
                modeNameForHistory = `${yyyy}年${mm}月${dd}日の問題`;
            }
            
            // modeNameForHistory を渡す
            addHistory(dfs.problemId, modeNameForHistory, `${dfs.width}×${dfs.height}`);

            stopLoadingAnimation();
            statusEl.style.display = 'none'; 
            
            updatePuzzleMeta(dfs);
            renderBoard(dfs);
            renderClues(dfs);
            
            submitBtn.style.display = "block"; 
            giveupBtn.style.display = "block"; 
            activeClueDisplay.style.display = "flex"; 

            if (dfs.placedWords.length > 0) {
                activeX = dfs.placedWords[0].x;
                activeY = dfs.placedWords[0].y;
                activeDir = 'H';
                updateHighlight();
                hiddenInput.focus(); 
            }
            startDailyBtn.disabled = false;
            startFreeBtn.disabled = false;
            
            isCleared = false;
            playStartTime = Date.now();
            startTimer();
            
            saveGameState(); 
        } else {
            if (attempt < maxAttempts) {
                tryGenerate(targetSize, targetMinWords, hintMode, allowedGens, difficulty, attempt + 1, maxAttempts, dailySeedStr, genId); 
            } else {
                stopLoadingAnimation();
                let tempSize = 40;
                if (window.innerWidth <= 600) {
                    // スマホ時：余白100を引いて計算
                    tempSize = Math.max(24, Math.min(40, Math.floor((window.innerHeight - 100) / targetSize)));
                } else {
                    // PC・タブレット時の計算
                    const sizeByWidth = Math.floor((window.innerWidth * 0.9) / targetSize);
                    const sizeByHeight = Math.floor((window.innerHeight - 180) / targetSize);
                    tempSize = Math.max(26, Math.min(40, Math.min(sizeByWidth, sizeByHeight)));
                }
                const sizePx = Math.max(targetSize * tempSize, 200);
                
                let errorBoardText = "";
                let errorModalText = "";
                
                if (targetSize < 11) {
                    errorBoardText = "自動生成に失敗しました。<br>地方を増やすかやり直してください";
                    errorModalText = "パズルの自動生成に失敗しました。<br>「出題地方」を増やすか、もう一度お試しください。";
                } else {
                    errorBoardText = "自動生成に失敗しました。<br>もう一度やり直してください";
                    errorModalText = "パズルの自動生成に失敗しました。<br>もう一度お試しください。";
                }
                
                boardEl.innerHTML = `
                    <div class="loading-board" style="width: ${sizePx}px; height: ${sizePx}px;">
                        <div style="color: var(--danger); font-size: 40px; margin-bottom: 10px;">⚠️</div>
                        <div style="color: var(--danger); text-align: center; line-height: 1.5; padding: 0 10px;">${errorBoardText}</div>
                    </div>
                `;
                
                showMessageModal("自動生成エラー", errorModalText, false, () => {
                    currentGenerationId++; 
                    startDailyBtn.disabled = false;
                    startFreeBtn.disabled = false;

                    stopTimer(); 
                    stopLoadingAnimation(); 
                    timerEl.style.display = 'none';
                    gameScreen.style.display = 'none';
                    titleScreen.style.display = 'flex';
                    const trc = document.getElementById('title-rule-container');
                    if (trc) trc.style.display = 'flex';
                    
                    clearGameState();
                }, false, "タイトルにもどる");
            }
        }
    }, 50);
};

startDailyBtn.addEventListener('click', () => {
    startDailyBtn.disabled = true;
    useTimer = false;
    
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dailySeedStr = `${yyyy}${mm}${dd}`;

    const todayStrForCheck = `${yyyy}-${today.getMonth() + 1}-${today.getDate()}`;
    
    const dailySaved = localStorage.getItem('pokemonCrosswordDailyState');
    if (dailySaved) {
        try {
            const state = JSON.parse(dailySaved);
            if (state.savedDate === todayStrForCheck) {
                // セーブデータが今日の分であれば、自動生成せずに復元する
                restoreStateObj(state);
                saveGameState(); // 現在の進行中ゲームとしても登録
                startDailyBtn.disabled = false;
                return; // ここで処理を終了し、生成処理には進まない
            }
        } catch(e) {
            console.error("今日の問題セーブデータ復元エラー", e);
        }
    }

    currentModeName = "今日の問題";
    currentGenerationId++;
    
    tryGenerate(5, 4, { type: 'normal' }, [1, 2, 3, 4, 5], 'normal', 1, 20, dailySeedStr, currentGenerationId); 
});

startFreeBtn.addEventListener('click', () => {
    useTimer = timerCheckboxFree.checked; 
    
    const selectedDiff = document.querySelector('input[name="difficulty"]:checked').value;
    const diffNames = { normal: "ノーマル", super: "スーパー", hyper: "ハイパー", master: "マスター" };
    currentModeName = diffNames[selectedDiff];
    
    let size = 11, minWords = 8, hintMode = { type: 'normal' };
    let allowedGens = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    if (selectedDiff === 'normal' || selectedDiff === 'super') { 
        size = (selectedDiff === 'normal') ? 5 : 8;
        minWords = (selectedDiff === 'normal') ? 4 : 8;
        hintMode = { type: 'normal' }; 
        
        allowedGens = [];
        document.querySelectorAll('input[name="gen-type"]:checked').forEach(cb => allowedGens.push(parseInt(cb.value, 10)));
        if (allowedGens.length === 0) allowedGens = [1, 2, 3, 4, 5, 6, 7, 8, 9]; 
    } else if (selectedDiff === 'hyper') {
        size = 11;
        minWords = 18;
        hintMode = { type: 'super' }; 
        allowedGens = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    } else if (selectedDiff === 'master') { 
        size = 15; 
        minWords = 30; 
        
        let selectedHints = [];
        document.querySelectorAll('input[name="hint-type"]:checked').forEach(cb => selectedHints.push(cb.value));
        if (selectedHints.length === 0) selectedHints = ['type']; 
        hintMode = { type: 'select', selected: selectedHints };
        allowedGens = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    }
    
    startFreeBtn.disabled = true;
    currentGenerationId++;
    
    tryGenerate(size, minWords, hintMode, allowedGens, selectedDiff, 1, 30, null, currentGenerationId);
});

startIdBtn.addEventListener('click', () => {
    const idInput = document.getElementById('problem-id-input').value.trim();
    if (!idInput) return;
    
    const dfs = loadFromProblemId(idInput);
    if (!dfs) {
        showMessageModal("エラー", "無効な問題IDです。<br>正しく入力されているか確認してください。", false);
        return;
    }
    
    useTimer = timerCheckboxId.checked; 
    
    // 履歴に存在するかチェックして currentModeName を決定する
    let history = JSON.parse(localStorage.getItem('pokemonCrosswordHistory') || '[]');
    let existingRecord = history.find(h => h.id === idInput);
    
    if (existingRecord) {
        currentModeName = existingRecord.modeName; // 履歴にあれば元の名前（例: 今日の問題）
    } else {
        currentModeName = "シェアされた問題";      // なければ新規として扱う
    }
    
    addHistory(idInput, currentModeName, `${dfs.width}×${dfs.height}`);

    titleScreen.style.display = 'none';
    const trc = document.getElementById('title-rule-container');
    if (trc) trc.style.display = 'none';
    gameScreen.style.display = 'flex';
    statusEl.style.display = 'none'; 
    
    boardEl.innerHTML = "";
    submitBtn.style.display = "block";
    giveupBtn.style.display = "block"; 
    
    cellErrorCounts = {};
    totalSubmitErrors = 0;
    currentGameData = dfs;
    isGivenUp = false; 
    
    updatePuzzleMeta(dfs);
    renderBoard(dfs);
    renderClues(dfs); 
    
    if (dfs.placedWords.length > 0) {
        activeX = dfs.placedWords[0].x;
        activeY = dfs.placedWords[0].y;
        activeDir = 'H';
        updateHighlight();
        hiddenInput.focus();
    }
    
    isCleared = false;
    playStartTime = Date.now();
    startTimer();
    
    activeClueDisplay.style.display = "flex";
    
    saveGameState(); 
});

// ==========================================
// 共有モーダルの制御
// ==========================================
modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        modalTabs.forEach(t => t.classList.remove('active'));
        modalSections.forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`share-sec-${tab.dataset.tab}`).classList.add('active');
    });
});

shareBtn.addEventListener('click', () => {
    if (currentGameData && currentGameData.problemId) {
        shareIdDisplay.value = currentGameData.problemId;
    }
    
    if (isCleared) {
        tabResult.style.display = 'block';
        shareResultText.value = generateShareText();
        
        modalTabs.forEach(t => t.classList.remove('active'));
        modalSections.forEach(s => s.classList.remove('active'));
        tabResult.classList.add('active');
        document.getElementById('share-sec-result').classList.add('active');
    } else {
        tabResult.style.display = 'none';
        modalTabs.forEach(t => t.classList.remove('active'));
        modalSections.forEach(s => s.classList.remove('active'));
        document.querySelector('.modal-tab[data-tab="problem"]').classList.add('active');
        document.getElementById('share-sec-problem').classList.add('active');
    }
    
    shareModal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', () => {
    shareModal.style.display = 'none';
});

function copyToClipboard(text, btnEl) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btnEl.textContent;
        btnEl.textContent = "コピーしました！";
        setTimeout(() => { btnEl.textContent = originalText; }, 2000);
    }).catch(() => {
        alert("コピーに失敗しました。");
    });
}

function openTweet(text) {
    // X（Twitter）はテキスト内のURLを自動でリンクにするため、&url= パラメータは外す
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(tweetUrl, '_blank');
}

copyIdBtn.addEventListener('click', () => copyToClipboard(shareIdDisplay.value, copyIdBtn));
tweetIdBtn.addEventListener('click', () => {
    // ID共有時もURLをテキストに含める
    const baseUrl = window.location.href.split('?')[0];
    const shareUrl = `${baseUrl}?id=${shareIdDisplay.value}`;
    openTweet(`#ポケモンクロスワード のこの問題に挑戦してみて！\n\n${shareUrl}`);
});

copySiteBtn.addEventListener('click', () => {
    const siteUrl = window.location.href.split('?')[0];
    copyToClipboard(siteUrl, copySiteBtn);
});
tweetSiteBtn.addEventListener('click', () => {
    const siteUrl = window.location.href.split('?')[0];
    openTweet(`#ポケモンクロスワード\nタイプや特性からポケモンを推理するクロスワードパズル！\n\n${siteUrl}`);
});

copyResultBtn.addEventListener('click', () => copyToClipboard(shareResultText.value, copyResultBtn));
tweetResultBtn.addEventListener('click', () => {
    openTweet(shareResultText.value);
});

// ==========================================
// 設定（オプション）モーダルの制御と保存
// ==========================================
const settingsBtnTitle = document.getElementById('settings-btn-title');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const soundCheckbox = document.getElementById('sound-checkbox');
const themeRadios = document.querySelectorAll('input[name="theme-setting"]');
const defaultTimerCheckbox = document.getElementById('default-timer-checkbox'); // 追加

let isDefaultTimerEnabled = false; // 追加

function loadSettings() {
    const saved = localStorage.getItem('pokemonCrosswordSettings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            isSoundEnabled = parsed.sound !== undefined ? parsed.sound : true;
            currentTheme = parsed.theme || 'auto';
            isDefaultTimerEnabled = parsed.defaultTimer || false; // 追加
        } catch(e) {}
    }
    
    soundCheckbox.checked = isSoundEnabled;
    document.querySelector(`input[name="theme-setting"][value="${currentTheme}"]`).checked = true;
    if (defaultTimerCheckbox) defaultTimerCheckbox.checked = isDefaultTimerEnabled; // 追加

    applyTheme(currentTheme);

    // 読み込み時にフリープレイとID入力画面のチェックボックスにも反映させる
    const timerCheckboxFree = document.getElementById('timer-checkbox-free');
    const timerCheckboxId = document.getElementById('timer-checkbox-id');
    if (timerCheckboxFree) timerCheckboxFree.checked = isDefaultTimerEnabled;
    if (timerCheckboxId) timerCheckboxId.checked = isDefaultTimerEnabled;
}

function saveSettings() {
    const settings = {
        sound: isSoundEnabled,
        theme: currentTheme,
        defaultTimer: isDefaultTimerEnabled // 追加
    };
    localStorage.setItem('pokemonCrosswordSettings', JSON.stringify(settings));
}

function applyTheme(theme) {
    document.body.classList.remove('theme-light', 'theme-dark');
    if (theme === 'light') {
        document.body.classList.add('theme-light');
    } else if (theme === 'dark') {
        document.body.classList.add('theme-dark');
    }
    // auto の場合はクラスを外す（OS設定＝メディアクエリが効くようになる）
}

if (settingsBtnTitle) {
    settingsBtnTitle.addEventListener('click', () => {
        loadSettings(); // 開くたびに最新状態をUIに反映
        settingsModal.style.display = 'flex';
    });
}

if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
        isSoundEnabled = soundCheckbox.checked;
        currentTheme = document.querySelector('input[name="theme-setting"]:checked').value;
        isDefaultTimerEnabled = defaultTimerCheckbox ? defaultTimerCheckbox.checked : false; // 追加

        applyTheme(currentTheme);
        saveSettings();

        // 閉じた時にもフリープレイとID入力画面のチェックボックスに反映させる
        const timerCheckboxFree = document.getElementById('timer-checkbox-free');
        const timerCheckboxId = document.getElementById('timer-checkbox-id');
        if (timerCheckboxFree) timerCheckboxFree.checked = isDefaultTimerEnabled;
        if (timerCheckboxId) timerCheckboxId.checked = isDefaultTimerEnabled;

        settingsModal.style.display = 'none';
    });
}

// 起動時に設定を読み込む ＋ URLからのID起動処理
window.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    renderHistory();

    // 1. URLパラメータ（?id=○○）をチェック
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = urlParams.get('id');

    if (sharedId) {
        // IDが含まれている場合、入力欄にIDをセット
        const inputEl = document.getElementById('problem-id-input');
        if (inputEl) inputEl.value = sharedId;
        
        // ブラウザのアドレスバーから "?id=○○" を消す（再読み込み時の意図せぬ再スタートを防ぐため）
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // 「IDを入力してスタート」ボタンをプログラム側から強制クリックして自動スタートさせる
        if (startIdBtn) {
            startIdBtn.click();
        }
        return; // URLからスタートした場合は、中断セーブデータの復元はスキップする
    }

    // 2. URLにIDが無い（通常アクセス）場合は、いつも通り中断データを復元
    restoreGameState();
});

// ==========================================
// UIボタンの効果音（一括登録）
// ==========================================
document.querySelectorAll('.btn, .tab-btn, .modal-tab, .rule-tab').forEach(el => {
    el.addEventListener('click', () => {
        // 判定ボタンはマス入力チェック後にエラー/クリア音が鳴るため除外
        if (el.id === 'submit-btn') return;
        
        // OK、キャンセル、ギブアップなど、すべてのボタンで共通の音を鳴らす
        if (typeof playSE === 'function' && typeof seButton !== 'undefined') {
            playSE(seButton);
        }
    });
});