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

// 効果音（SE）用のAudioオブジェクト
// ※ 実際の音声ファイル（.mp3 や .wav）を用意し、assets/se/ フォルダ等に配置してください。
const seMove = new Audio('se/move.mp3');   // マス移動音
const seInput = new Audio('se/input.mp3'); // 文字入力音
const seDelete = new Audio('se/delete.mp3'); // 削除音
const seClear = new Audio('se/clear.mp3'); // 正解音
const seError = new Audio('se/error.mp3'); // 不正解（エラー）音
const seButton = new Audio('se/button.mp3'); // ボタン

// 音量調整
seMove.volume = 0.5;
seInput.volume = 0.5;
seDelete.volume = 0.5;
seClear.volume = 0.5;
seError.volume = 0.5;
seButton.volume = 0.5;

// SE再生用の共通関数（設定がONの時のみ鳴らす）
function playSE(audioObj) {
    if (isSoundEnabled && audioObj) {
        audioObj.currentTime = 0; // 連続再生できるように巻き戻す
        audioObj.play().catch(e => console.log("SE再生ブロック:", e));
    }
}