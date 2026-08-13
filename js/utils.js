// ==========================================
// 乱数生成器（シード値完全再現用）
// ==========================================
class Random {
    constructor(seed) {
        this.x = 123456789;
        this.y = 362436069;
        this.z = 521288629;
        this.w = seed || 88675123;
    }
    next() {
        let t = this.x ^ (this.x << 11);
        this.x = this.y; this.y = this.z; this.z = this.w;
        this.w = (this.w ^ (this.w >>> 19)) ^ (t ^ (t >>> 8));
        return Math.abs(this.w);
    }
    nextInt(max) {
        return this.next() % max;
    }
}

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; 
    }
    return Math.abs(hash) || 1;
}

// IDから「名前」を逆引きするための辞書
const noToName = {};
for (let name in pokemonDetails) {
    noToName[parseInt(pokemonDetails[name].no, 10)] = name;
}

// ==========================================
// 問題IDの生成と復元（Base64ビットパッキング）
// ==========================================
const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function generateProblemId(data) {
    if (!data || !data.placedWords.length) return "";
    let id = "";
    let bits = 0;
    let bitCount = 0;

    function pushBits(val, numBits) {
        bits = (bits << numBits) | val;
        bitCount += numBits;
        while (bitCount >= 6) {
            bitCount -= 6;
            id += B64_CHARS[(bits >>> bitCount) & 0x3F];
        }
        bits &= (1 << bitCount) - 1; 
    }

    // 1. 難易度を2ビットで保存 (0:normal, 1:super, 2:hyper, 3:master)
    const diffMap = { 'normal': 0, 'super': 1, 'hyper': 2, 'master': 3 };
    pushBits(diffMap[data.difficulty] || 0, 2);

    // 2. 選択世代を9ビットで保存
    let genVal = 0;
    (data.allowedGens || []).forEach(g => {
        genVal |= (1 << (g - 1));
    });
    pushBits(genVal, 9);

    // 3. 選択ヒントを4ビットで保存
    // bit0: no, bit1: type, bit2: ability, bit3: stats
    let hintVal = 0;
    if (data.hintMode.type === 'normal') hintVal = 7; // 1+2+4
    else if (data.hintMode.type === 'super') hintVal = 3; // 1+2
    else if (data.hintMode.type === 'select') {
        if (data.hintMode.selected.includes('no')) hintVal |= 1;
        if (data.hintMode.selected.includes('type')) hintVal |= 2;
        if (data.hintMode.selected.includes('ability')) hintVal |= 4;
        if (data.hintMode.selected.includes('stats')) hintVal |= 8;
    }
    pushBits(hintVal, 4);

    // 単語データの保存
    data.placedWords.forEach(w => {
        const no = parseInt(pokemonDetails[w.text].no, 10) || 1;
        pushBits(no, 11);                  
        pushBits(w.x, 5);                  
        pushBits(w.y, 5);                  
        pushBits(w.dir === 'H' ? 0 : 1, 1);
    });

    if (bitCount > 0) {
        id += B64_CHARS[(bits << (6 - bitCount)) & 0x3F];
    }
    return id;
}

function loadFromProblemId(id) {
    if (!id) return null;
    let bits = 0;
    let bitCount = 0;
    let ptr = 0;

    function readBits(numBits) {
        while (bitCount < numBits) {
            if (ptr >= id.length) return null;
            let charIdx = B64_CHARS.indexOf(id[ptr++]);
            if (charIdx === -1) return null; 
            bits = (bits << 6) | charIdx;
            bitCount += 6;
        }
        bitCount -= numBits;
        let res = (bits >>> bitCount) & ((1 << numBits) - 1);
        bits &= (1 << bitCount) - 1;
        return res;
    }

    function hasBitsLeft(numBits) {
        let remainingChars = id.length - ptr;
        return (bitCount + remainingChars * 6) >= numBits;
    }

    // 新しい15ビットヘッダーの読み込み
    let diffVal = readBits(2);
    let genVal = readBits(9);
    let hintVal = readBits(4);

    if (diffVal === null || genVal === null || hintVal === null) return null;

    const diffRev = { 0: 'normal', 1: 'super', 2: 'hyper', 3: 'master' };
    let difficulty = diffRev[diffVal] || 'normal';

    let allowedGens = [];
    for (let i = 0; i < 9; i++) {
        if ((genVal & (1 << i)) !== 0) allowedGens.push(i + 1);
    }
    if (allowedGens.length === 0) allowedGens = [1,2,3,4,5,6,7,8,9];

    let hintSel = [];
    if (hintVal & 1) hintSel.push('no');
    if (hintVal & 2) hintSel.push('type');
    if (hintVal & 4) hintSel.push('ability');
    if (hintVal & 8) hintSel.push('stats');
    
    let hintMode = { type: 'select', selected: hintSel };
    if (hintVal === 7 && (difficulty === 'normal' || difficulty === 'super')) {
        hintMode = { type: 'normal' };
    } else if (hintVal === 3 && (difficulty === 'super' || difficulty === 'hyper')) {
        hintMode = { type: 'super' };
    }

    const dfs = new CrosswordDFS(30, 0, pokemonIndex);
    dfs.difficulty = difficulty;
    dfs.allowedGens = allowedGens;
    dfs.hintMode = hintMode;

    while (hasBitsLeft(22)) {
        let no = readBits(11);
        let x = readBits(5);
        let y = readBits(5);
        let dirVal = readBits(1);
        
        if (no === null || x === null || y === null || dirVal === null) return null;

        let dir = dirVal === 0 ? 'H' : 'V';
        let text = noToName[no];

        if (!text) return null; 

        dfs.place({ text, x, y, dir });
    }

    if (dfs.placedWords.length === 0) return null;

    dfs.trim();
    dfs.assignNumbers();
    dfs.problemId = id; 
    return dfs;
}