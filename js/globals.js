// ==========================================
// ゲーム全体で共有する状態データ
// ==========================================
let currentGameData = null; 
let activeX = null;
let activeY = null;
let activeDir = 'H';
let clueConditions = {};
let isComposing = false;
let ignoreNextInput = false;

// プレイデータとタイマー・エラー管理
let playStartTime = 0;       
let clearTimeMs = 0;         
let isCleared = false;       
let isGivenUp = false;       
let currentModeName = "";    
let timerInterval = null;
let useTimer = false;

let cellErrorCounts = {};    
let totalSubmitErrors = 0;   
let currentGenerationId = 0; 

// ==========================================
// DOM要素の取得
// ==========================================
const titleScreen = document.getElementById('title-screen');
const gameScreen = document.getElementById('game-screen');
const statusEl = document.getElementById('status');
const timerEl = document.getElementById('timer'); 
const boardEl = document.getElementById('board');
const cluesContainer = document.getElementById('clues-container');
const submitBtn = document.getElementById('submit-btn');
const giveupBtn = document.getElementById('giveup-btn'); 
const backBtn = document.getElementById('back-btn');
const shareBtn = document.getElementById('share-btn');
const startDailyBtn = document.getElementById('start-daily-btn');
const startFreeBtn = document.getElementById('start-free-btn');
const startIdBtn = document.getElementById('start-id-btn');
const hiddenInput = document.getElementById('hidden-input');
const specialKeys = document.getElementById('special-keys');

const activeClueDisplay = document.getElementById('active-clue-display');

const timerCheckboxFree = document.getElementById('timer-checkbox-free');
const timerCheckboxId = document.getElementById('timer-checkbox-id');

// シェア用モーダル
const shareModal = document.getElementById('share-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalTabs = document.querySelectorAll('.modal-tab');
const modalSections = document.querySelectorAll('.modal-section');
const tabResult = document.getElementById('tab-result');
const shareIdDisplay = document.getElementById('share-id-display');
const shareResultText = document.getElementById('share-result-text');
const copyIdBtn = document.getElementById('copy-id-btn');
const tweetIdBtn = document.getElementById('tweet-id-btn');
const copySiteBtn = document.getElementById('copy-site-btn');
const tweetSiteBtn = document.getElementById('tweet-site-btn');
const copyResultBtn = document.getElementById('copy-result-btn');
const tweetResultBtn = document.getElementById('tweet-result-btn');

// 汎用メッセージモーダル
const messageModal = document.getElementById('message-modal');
const messageModalTitle = document.getElementById('message-modal-title');
const messageModalText = document.getElementById('message-modal-text');
const messageModalCancel = document.getElementById('message-modal-cancel');
const messageModalOk = document.getElementById('message-modal-ok');
const messageModalTweet = document.getElementById('message-modal-tweet'); 

const today = new Date();

// 設定系の変数
let isSoundEnabled = true;
let currentTheme = 'auto'; // 'auto', 'light', 'dark'

// ==========================================
// 効果音（SE）のハイブリッド対応（BGM停止対策 ＋ ローカル動作）
// ==========================================
const seMove = 'se/move.mp3';   
const seInput = 'se/input.mp3'; 
const seDelete = 'se/delete.mp3'; 
const seClear = 'se/clear.mp3'; 
const seError = 'se/error.mp3'; 
const seButton = 'se/button.mp3'; 

// ① ローカル環境（Cドライブ等）でテストする時のためのバックアップ
const fallbackAudios = {
    [seMove]: new Audio(seMove),
    [seInput]: new Audio(seInput),
    [seDelete]: new Audio(seDelete),
    [seClear]: new Audio(seClear),
    [seError]: new Audio(seError),
    [seButton]: new Audio(seButton),
};
Object.values(fallbackAudios).forEach(a => a.volume = 0.5);

let audioCtx = null;
const audioBuffers = {};

// ② サーバー上でのみ、BGM停止を防ぐための高度な音声データを読み込む
async function preloadAudio(url) {
    try {
        // fileプロトコル（ローカル）の場合はセキュリティエラーになるためスキップ
        if (window.location.protocol === 'file:') return;
        
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffers[url] = { loaded: false, raw: arrayBuffer, buffer: null };
    } catch (e) {
        console.log("Web Audio用ファイルの取得をスキップしました");
    }
}

// 読み込み開始
[seMove, seInput, seDelete, seClear, seError, seButton].forEach(url => preloadAudio(url));

// ③ 再生処理（環境に合わせて自動で切り替え）
async function playSE(audioUrl) {
    if (!isSoundEnabled || !audioUrl) return;

    // もしローカル環境で遊んでいる場合、または高度な音声データが無い場合はバックアップ（従来のAudio）で鳴らす
    if (window.location.protocol === 'file:' || !audioBuffers[audioUrl]) {
        const fallback = fallbackAudios[audioUrl];
        if (fallback) {
            fallback.currentTime = 0;
            fallback.play().catch(e => console.log("SE再生ブロック:", e));
        }
        return;
    }

    // --- 以降はサーバー（スマホやPCのブラウザ）で遊ぶ時のBGM停止対策処理 ---
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        const soundData = audioBuffers[audioUrl];
        if (!soundData.loaded && soundData.raw) {
            soundData.buffer = await audioCtx.decodeAudioData(soundData.raw);
            soundData.loaded = true;
            delete soundData.raw;
        }
        if (!soundData.buffer) return;

        const source = audioCtx.createBufferSource();
        source.buffer = soundData.buffer;
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 0.5;
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        source.start(0);
        
    } catch (e) {
        // 万が一エラーが起きた場合の最終バックアップ
        const fallback = fallbackAudios[audioUrl];
        if (fallback) {
            fallback.currentTime = 0;
            fallback.play().catch(err => console.log(err));
        }
    }
}

// ==========================================
// マスサイズの自動計算（PC・スマホハイブリッド）
// ==========================================
let currentCellSize = 40; // 現在のマスの基本サイズ

function updateCellSize(boardWidth, boardHeight) {
    if (!boardWidth || !boardHeight) return;
    
    if (window.innerWidth <= 600) {
        // スマホ画面幅（600px以下）なら、タップしやすさ優先で従来通り40px固定
        currentCellSize = 40;
    } else {
        // PC・タブレットなら、画面に収まるように計算
        const availableWidth = window.innerWidth * 0.9; 
        const availableHeight = window.innerHeight - 180; 
        
        const sizeByWidth = Math.floor(availableWidth / boardWidth);
        const sizeByHeight = Math.floor(availableHeight / boardHeight);
        
        let calculatedSize = Math.min(sizeByWidth, sizeByHeight);
        currentCellSize = Math.max(26, Math.min(40, calculatedSize));
    }

    // CSSへ変数を渡す
    document.documentElement.style.setProperty('--cell-size', `${currentCellSize}px`);
    document.documentElement.style.setProperty('--cell-font-size', `${Math.floor(currentCellSize * 0.5)}px`);
    document.documentElement.style.setProperty('--cell-num-size', `${Math.floor(currentCellSize * 0.28)}px`);
}

// 画面サイズ変更時の再計算
window.addEventListener('resize', () => {
    if (currentGameData && gameScreen.style.display === 'flex') {
        updateCellSize(currentGameData.width, currentGameData.height);
        
        if (typeof boardEl !== 'undefined' && boardEl) {
            boardEl.style.gridTemplateColumns = `repeat(${currentGameData.width}, ${currentCellSize}px)`;
            boardEl.style.gridTemplateRows = `repeat(${currentGameData.height}, ${currentCellSize}px)`;
        }
        
        document.querySelectorAll('.word-error-box').forEach(el => el.remove());
        document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    }
});