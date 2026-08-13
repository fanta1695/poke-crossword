// ==========================================
// ハイライトとエラー解除
// ==========================================
const clearErrorAt = (x, y) => {
    submitBtn.style.display = "block";

    if (!currentGameData) return;
    currentGameData.placedWords.forEach(w => {
        let isInside = false;
        if (w.dir === 'H' && y === w.y && x >= w.x && x < w.x + w.text.length) isInside = true;
        if (w.dir === 'V' && x === w.x && y >= w.y && y < w.y + w.text.length) isInside = true;

        if (isInside) {
            for (let i = 0; i < w.text.length; i++) {
                let cx = w.x + (w.dir === 'H' ? i : 0);
                let cy = w.y + (w.dir === 'V' ? i : 0);
                const cellEl = document.querySelector(`.cell[data-x="${cx}"][data-y="${cy}"]`);
                if (cellEl) cellEl.classList.remove('error');
            }
            const clueLi = document.getElementById(`clue-${w.dir}-${w.number}`);
            if (clueLi) clueLi.classList.remove('error');
            
            const errBox = document.getElementById(`errbox-${w.dir}-${w.number}`);
            if (errBox) errBox.remove();
        }
    });
};

const updateHighlight = () => {
    document.querySelectorAll('.cell.white').forEach(el => el.classList.remove('active', 'highlight'));
    document.querySelectorAll('.clue-list li').forEach(el => el.classList.remove('active'));
    
    activeClueDisplay.innerHTML = '<div style="width: 100%; text-align: center; color: var(--text-muted);">マスをタップしてカギを表示</div>';

    if (activeX === null || activeY === null || !currentGameData) return;

    const activeCell = document.querySelector(`.cell[data-x="${activeX}"][data-y="${activeY}"]`);
    if (activeCell) activeCell.classList.add('active');

    let currentClueHtml = "";

    currentGameData.placedWords.forEach(w => {
        let isInside = false;
        if (w.dir === 'H' && activeDir === 'H' && activeY === w.y && activeX >= w.x && activeX < w.x + w.text.length) isInside = true;
        if (w.dir === 'V' && activeDir === 'V' && activeX === w.x && activeY >= w.y && activeY < w.y + w.text.length) isInside = true;

        if (isInside) {
            for (let i = 0; i < w.text.length; i++) {
                let cx = w.x + (w.dir === 'H' ? i : 0);
                let cy = w.y + (w.dir === 'V' ? i : 0);
                const cellEl = document.querySelector(`.cell[data-x="${cx}"][data-y="${cy}"]`);
                if (cellEl && (cx !== activeX || cy !== activeY)) cellEl.classList.add('highlight');
            }
            const clueLi = document.getElementById(`clue-${w.dir}-${w.number}`);
            if (clueLi) {
                clueLi.classList.add('active');
                
                const cluesCard = document.querySelector('.clues-card');
                if (cluesCard) {
                    const cardRect = cluesCard.getBoundingClientRect();
                    const clueRect = clueLi.getBoundingClientRect();
                    
                    // カギが上に見切れている場合
                    if (clueRect.top < cardRect.top) {
                        cluesCard.scrollBy({ top: clueRect.top - cardRect.top - 8, behavior: 'smooth' });
                    } 
                    // カギが下に見切れている場合
                    else if (clueRect.bottom > cardRect.bottom) {
                        cluesCard.scrollBy({ top: clueRect.bottom - cardRect.bottom + 8, behavior: 'smooth' });
                    }
                }
                
                const dirLabel = w.dir === 'H' ? 'ヨコ' : 'タテ';
                const hintText = clueConditions[`${w.dir}-${w.number}`].hintText;
                
                currentClueHtml = `
                    <div style="flex-shrink: 0; width: 50px; color: var(--text-muted); font-size: 13px; font-weight: bold; text-align: left;">
                        ${dirLabel}${w.number}
                    </div>
                    <div style="flex-grow: 1; text-align: left; line-height: 1.4;">
                        ${hintText}
                    </div>
                `;
            }
        }
    });

    if (currentClueHtml) {
        activeClueDisplay.innerHTML = currentClueHtml;
    }
};

// ==========================================
// 入力プレビュー機能とバッファ管理
// ==========================================
let previewCells = [];

function resetInput() {
    hiddenInput.value = ' ';
    try {
        hiddenInput.selectionStart = 1;
        hiddenInput.selectionEnd = 1;
    } catch(e) {}
}

window.resetInputBuffer = () => {
    resetInput();
    clearPreview();
};

function clearPreview() {
    previewCells.forEach(cell => {
        const textEl = cell.el.querySelector('.cell-text');
        if (textEl) {
            textEl.textContent = cell.originalText;
            textEl.style.color = ''; 
        }
    });
    previewCells = [];
}

function showPreview(val) {
    clearPreview(); 
    if (!val || activeX === null) return;
    
    if (/[zZ]/.test(val)) {
        val = val.replace(/z(?!a|i|u|e|o|y)/gi, 'Ｚ').replace(/Z/g, 'Ｚ');
    }
    
    let cx = activeX;
    let cy = activeY;
    
    for (let i = 0; i < val.length; i++) {
        let char = val[i];
        
        char = char.replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60));
        const smallToLarge = {
            'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ',
            'ッ': 'ツ', 'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ', 'ヮ': 'ワ',
            'ヵ': 'カ', 'ヶ': 'ケ'
        };
        char = smallToLarge[char] || char;
        char = char.replace(/[A-Za-z0-9]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xFEE0));
        char = char.toUpperCase();
        if (char === ':') char = '：';
        if (/[-－‐‑‒–—―−]/.test(char)) char = 'ー';

        const cellEl = document.querySelector(`.cell.white[data-x="${cx}"][data-y="${cy}"]`);
        if (!cellEl) break; 
        
        const textEl = cellEl.querySelector('.cell-text');
        if (textEl) {
            previewCells.push({
                el: cellEl,
                originalText: textEl.textContent
            });
            textEl.textContent = char;
            textEl.style.color = 'var(--primary)'; 
        }
        
        cx += (activeDir === 'H' ? 1 : 0);
        cy += (activeDir === 'V' ? 1 : 0);
    }
}

function handleBackspace() {
    const textEl = document.querySelector(`.cell[data-x="${activeX}"][data-y="${activeY}"] .cell-text`);
    if (textEl && textEl.textContent !== '') {
        textEl.textContent = '';
        clearErrorAt(activeX, activeY); 
        playSE(seDelete);
    } else {
        let prevX = activeX - (activeDir === 'H' ? 1 : 0);
        let prevY = activeY - (activeDir === 'V' ? 1 : 0);
        const prevCell = document.querySelector(`.cell.white[data-x="${prevX}"][data-y="${prevY}"]`);
        if (prevCell) {
            activeX = prevX; activeY = prevY;
            updateHighlight();
            const prevTextEl = prevCell.querySelector('.cell-text');
            if (prevTextEl) {
                prevTextEl.textContent = '';
                clearErrorAt(activeX, activeY);
                playSE(seDelete);
            } else {
                playSE(seMove);
            }
        }
    }
    if(typeof saveGameState === 'function') saveGameState(); 
}

// ==========================================
// 盤面とカギの描画
// ==========================================
const renderBoard = (dfs) => {
    boardEl.innerHTML = ""; 
    boardEl.style.gridTemplateColumns = `repeat(${dfs.width}, 40px)`;
    boardEl.style.gridTemplateRows = `repeat(${dfs.height}, 40px)`;

    for (let y = 0; y < dfs.height; y++) {
        for (let x = 0; x < dfs.width; x++) {
            const cellData = dfs.grid[y][x];
            const cellEl = document.createElement('div');
            cellEl.classList.add('cell');
            cellEl.dataset.x = x;
            cellEl.dataset.y = y;

            if (cellData.char) {
                cellEl.classList.add('white');
                
                cellEl.addEventListener('click', () => {
                    if (isCleared || isGivenUp) return;
                    
                    const isSameCell = (activeX === x && activeY === y);
                    
                    let val = hiddenInput.value;
                    let actualVal = val.startsWith(' ') ? val.substring(1) : val;
                    clearPreview(); 
                    
                    if (/[zZ]/.test(actualVal)) {
                        actualVal = actualVal.replace(/z(?!a|i|u|e|o|y)/gi, 'Ｚ').replace(/Z/g, 'Ｚ');
                    }
                    
                    if (actualVal && !/[a-zA-Z]/.test(actualVal)) {
                        processInputText(actualVal);
                    }
                    
                    if (isSameCell) {
                        let nextDir = activeDir === 'H' ? 'V' : 'H';
                        if ((nextDir === 'H' && cellData.countH > 0) || (nextDir === 'V' && cellData.countV > 0)) {
                            activeDir = nextDir;
                        }
                        activeX = x;
                        activeY = y;
                    } else {
                        activeX = x;
                        activeY = y;
                        if (cellData.countH === 0 && cellData.countV > 0) activeDir = 'V';
                        else if (cellData.countV === 0 && cellData.countH > 0) activeDir = 'H';
                    }
                    updateHighlight();
                    resetInput();
                    hiddenInput.focus(); 
                    playSE(seMove);
                    if(typeof saveGameState === 'function') saveGameState(); 
                });

                const textEl = document.createElement('span');
                textEl.classList.add('cell-text');
                cellEl.appendChild(textEl);

                if (cellData.number) {
                    const numEl = document.createElement('span');
                    numEl.classList.add('cell-number');
                    numEl.textContent = cellData.number;
                    cellEl.appendChild(numEl);
                }
            }
            boardEl.appendChild(cellEl);
        }
    }
};

const renderClues = (dfs) => {
    const ulAcross = document.querySelector('#clues-across ul');
    const ulDown = document.querySelector('#clues-down ul');
    ulAcross.innerHTML = ""; ulDown.innerHTML = "";
    clueConditions = {}; 
    
    activeClueDisplay.innerHTML = '<div style="width: 100%; text-align: center; color: var(--text-muted);">マスをタップしてカギを表示</div>';

    const seed = hashString(dfs.problemId || "dummy");
    const rng = new Random(seed);

    // マスター用のヒント山札を作成する
    let hintDeck = [];
    const refillDeck = () => {
        if (dfs.hintMode && dfs.hintMode.type === 'select') {
            hintDeck = [...dfs.hintMode.selected];
            // シャッフル
            for (let i = hintDeck.length - 1; i > 0; i--) {
                const j = rng.nextInt(i + 1);
                [hintDeck[i], hintDeck[j]] = [hintDeck[j], hintDeck[i]];
            }
        }
    };
    refillDeck();

    dfs.placedWords.forEach(w => {
        const li = document.createElement('li');
        li.id = `clue-${w.dir}-${w.number}`;
        
        const details = pokemonDetails[w.text];
        let clueText = "";
        let generatedCondition = {}; 
        
        if(details) {
            let hintParts = [];
            const mode = dfs.hintMode;
            
            if (mode.type === 'normal') {
                if (details.no) { hintParts.push(`No. ${parseInt(details.no, 10)}`); generatedCondition['no'] = details.no; }
                if (details.type) { hintParts.push(`タイプ: ${details.type.join('・')}`); generatedCondition['type'] = details.type; }
                if (details.ability) { hintParts.push(`特性: ${details.ability.join(' / ')}`); generatedCondition['ability'] = details.ability; }
            } else if (mode.type === 'super') {
                if (details.no) { hintParts.push(`No. ${parseInt(details.no, 10)}`); generatedCondition['no'] = details.no; }
                if (details.type) { hintParts.push(`タイプ: ${details.type.join('・')}`); generatedCondition['type'] = details.type; }
            } else if (mode.type === 'select') {
                const validKeys = mode.selected.filter(k => details[k]);
                if (validKeys.length > 0) {
                    
                    // 山札からヒントの種類を引くロジック
                    let chosenKey = null;
                    let attempts = 0;
                    while(!chosenKey && attempts < 10) {
                        if (hintDeck.length === 0) refillDeck();
                        let candidate = hintDeck.shift();
                        if (validKeys.includes(candidate)) {
                            chosenKey = candidate;
                        }
                        attempts++;
                    }
                    if (!chosenKey) {
                        chosenKey = validKeys[rng.nextInt(validKeys.length)];
                    }
                    
                    if (chosenKey === 'no') { hintParts.push(`No. ${parseInt(details.no, 10)}`); generatedCondition['no'] = details.no; }
                    else if (chosenKey === 'type') { hintParts.push(`タイプ: ${details.type.join('・')}`); generatedCondition['type'] = details.type; }
                    else if (chosenKey === 'ability') { hintParts.push(`特性: ${details.ability.join(' / ')}`); generatedCondition['ability'] = details.ability; }
                    else if (chosenKey === 'stats') { hintParts.push(`種族値: ${details.stats}`); generatedCondition['stats'] = details.stats; }
                }
            }
            clueText = hintParts.join('、');
        } else {
            clueText = "謎のポケモン";
        }

        clueConditions[`${w.dir}-${w.number}`] = {
            length: w.text.length,
            condition: generatedCondition,
            x: w.x,
            y: w.y,
            dir: w.dir,
            hintText: clueText 
        };

        li.innerHTML = `<span class="num">${w.number}</span> ${clueText}`;
        
        li.addEventListener('click', () => {
            if (isCleared || isGivenUp) return; 
            
            let val = hiddenInput.value;
            let actualVal = val.startsWith(' ') ? val.substring(1) : val;
            clearPreview(); 
            
            if (/[zZ]/.test(actualVal)) {
                actualVal = actualVal.replace(/z(?!a|i|u|e|o|y)/gi, 'Ｚ').replace(/Z/g, 'Ｚ');
            }
            
            if (actualVal && !/[a-zA-Z]/.test(actualVal)) {
                processInputText(actualVal);
            }

            activeX = w.x; activeY = w.y; activeDir = w.dir;
            updateHighlight();
            resetInput();
            hiddenInput.focus();
            if(typeof saveGameState === 'function') saveGameState(); 
        });

        if (w.dir === 'H') ulAcross.appendChild(li);
        else ulDown.appendChild(li);
    });
    cluesContainer.style.display = "flex";
    document.getElementById('special-keys').style.display = "flex"; 
};

// ==========================================
// キーボード入力制御（スペースパディング方式）
// ==========================================
document.querySelectorAll('.sp-key').forEach(keyBtn => {
    keyBtn.addEventListener('mousedown', (e) => e.preventDefault());
    keyBtn.addEventListener('click', (e) => {
        if (isCleared || isGivenUp) return;
        
        let val = hiddenInput.value;
        let actualVal = val.startsWith(' ') ? val.substring(1) : val;
        clearPreview(); 
        
        if (/[zZ]/.test(actualVal)) {
            actualVal = actualVal.replace(/z(?!a|i|u|e|o|y)/gi, 'Ｚ').replace(/Z/g, 'Ｚ');
        }
        
        if (actualVal && !/[a-zA-Z]/.test(actualVal)) {
            processInputText(actualVal);
        }

        processInputText(e.target.textContent); 
        resetInput();
        hiddenInput.focus();
    });
});

hiddenInput.addEventListener('compositionstart', () => { 
    isComposing = true; 
});

hiddenInput.addEventListener('compositionend', () => {
    isComposing = false;
    handleInput();
});

hiddenInput.addEventListener('input', () => {
    let val = hiddenInput.value;
    
    if (val === '') {
        clearPreview();
        handleBackspace();
        resetInput();
        return;
    }
    handleInput();
});

function handleInput() {
    let val = hiddenInput.value;
    let actualVal = val.startsWith(' ') ? val.substring(1) : val;

    if (!actualVal) {
        clearPreview();
        return;
    }

    // Zの特例変換
    if (/[zZ]/.test(actualVal)) {
        actualVal = actualVal.replace(/z(?!a|i|u|e|o|y)/gi, 'Ｚ').replace(/Z/g, 'Ｚ');
    }

    if (/[a-zA-Z]/.test(actualVal) || isComposing) {
        showPreview(actualVal);
        return; 
    }
    
    clearPreview();
    processInputText(actualVal);
    resetInput();
}

function processInputText(rawText) {
    if (!rawText || activeX === null || isCleared || isGivenUp) return;
    
    if (/[zZ]/.test(rawText)) {
        rawText = rawText.replace(/z(?!a|i|u|e|o|y)/gi, 'Ｚ').replace(/Z/g, 'Ｚ');
    }
    
    if (/[a-zA-Z]/.test(rawText)) return;
    
    for (let i = 0; i < rawText.length; i++) {
        let char = rawText[i]; 
        
        char = char.replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60));
        const smallToLarge = {
            'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ',
            'ッ': 'ツ', 'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ', 'ヮ': 'ワ',
            'ヵ': 'カ', 'ヶ': 'ケ'
        };
        char = smallToLarge[char] || char;
        char = char.replace(/[A-Za-z0-9]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xFEE0));
        char = char.toUpperCase();
        if (char === ':') char = '：';
        if (/[-－‐‑‒–—―−]/.test(char)) char = 'ー';

        const textEl = document.querySelector(`.cell[data-x="${activeX}"][data-y="${activeY}"] .cell-text`);
        if (textEl) {
            textEl.textContent = char;
            clearErrorAt(activeX, activeY);
            playSE(seInput);
        }

        let nextX = activeX + (activeDir === 'H' ? 1 : 0);
        let nextY = activeY + (activeDir === 'V' ? 1 : 0);
        const nextCell = document.querySelector(`.cell.white[data-x="${nextX}"][data-y="${nextY}"]`);
        
        if (nextCell) {
            activeX = nextX; 
            activeY = nextY;
            updateHighlight();
        } else {
            break; 
        }
    }
    
    if(typeof saveGameState === 'function') saveGameState(); 
}

// 物理キーボード・特殊操作対応
document.addEventListener('keydown', (e) => {
    if (gameScreen.style.display !== 'flex' || shareModal.style.display === 'flex' || messageModal.style.display === 'flex') return;
    if (isCleared || isGivenUp) return;

    if (e.key === 'Backspace' && activeX !== null) {
        let val = hiddenInput.value;
        let actualVal = val.startsWith(' ') ? val.substring(1) : val;
        
        if (actualVal !== '' || isComposing) {
            return; 
        }

        e.preventDefault();
        clearPreview(); 
        handleBackspace();
        resetInput();
    } 
    else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && activeX !== null) {
        
        let val = hiddenInput.value;
        let actualVal = val.startsWith(' ') ? val.substring(1) : val;

        clearPreview();
        
        if (/[zZ]/.test(actualVal)) {
            actualVal = actualVal.replace(/z(?!a|i|u|e|o|y)/gi, 'Ｚ').replace(/Z/g, 'Ｚ');
        }
        
        if (actualVal && !/[a-zA-Z]/.test(actualVal)) {
            processInputText(actualVal);
        }
        
        e.preventDefault(); 

        let nextX = activeX; let nextY = activeY; let newDir = activeDir;

        if (e.key === 'ArrowRight') { nextX++; newDir = 'H'; }
        else if (e.key === 'ArrowLeft') { nextX--; newDir = 'H'; }
        else if (e.key === 'ArrowDown') { nextY++; newDir = 'V'; }
        else if (e.key === 'ArrowUp') { nextY--; newDir = 'V'; }

        const nextCell = document.querySelector(`.cell.white[data-x="${nextX}"][data-y="${nextY}"]`);
        if (nextCell) {
            activeX = nextX; activeY = nextY; activeDir = newDir;
            updateHighlight();
            playSE(seMove);
        } else if (activeDir !== newDir) {
            const currentCellData = currentGameData.grid[activeY][activeX];
            if ((newDir === 'H' && currentCellData.countH > 0) || (newDir === 'V' && currentCellData.countV > 0)) {
                activeDir = newDir;
                updateHighlight();
                playSE(seMove);
            }
        }
        resetInput(); 
        if(typeof saveGameState === 'function') saveGameState(); 
    }
    // エンターキーで縦・横を切り替える処理
    else if (e.key === 'Enter' && activeX !== null) {
        e.preventDefault(); // スマホのキーボードで改行や送信が暴発するのを防ぐ

        // 現在選択しているマスのデータを取得
        const currentCellData = currentGameData.grid[activeY][activeX];
        
        // 縦と横、両方に単語が通っている（交差している）マスの場合のみ反転させる
        if (currentCellData.countH > 0 && currentCellData.countV > 0) {
            activeDir = activeDir === 'H' ? 'V' : 'H';
            updateHighlight();
            resetInput();
            hiddenInput.focus();
            playSE(seMove);
        }
    }
    else if (activeX !== null && document.activeElement !== hiddenInput) {
        if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
            hiddenInput.focus();
        }
    }
});

// ==========================================
// フォーカス復帰処理
// ==========================================
window.addEventListener('focus', () => {
    if (gameScreen.style.display === 'flex' && activeX !== null && shareModal.style.display !== 'flex' && messageModal.style.display !== 'flex') {
        hiddenInput.focus();
    }
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && gameScreen.style.display === 'flex' && activeX !== null && shareModal.style.display !== 'flex' && messageModal.style.display !== 'flex') {
        hiddenInput.focus();
    }
});

gameScreen.addEventListener('click', (e) => {
    if (activeX !== null && e.target.tagName !== 'BUTTON' && shareModal.style.display !== 'flex' && messageModal.style.display !== 'flex') {
        hiddenInput.focus();
    }
});