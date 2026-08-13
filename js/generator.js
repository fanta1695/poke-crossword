class CrosswordDFS {
    constructor(size, minWords, dictionary, allowedWords = null, timeLimit = 1000) {
        this.size = size;
        this.minWords = minWords; 
        
        this.grid = Array.from({ length: size }, () => 
            Array.from({ length: size }, () => ({ char: null, countH: 0, countV: 0, number: null }))
        );
        this.placedWords = [];
        this.usedWords = new Set();
        this.index = dictionary;

        this.allowedWords = allowedWords;
        
        this.bestState = [];
        this.bestScore = -999999; 
        this.startTime = 0;
        this.timeLimit = timeLimit;
        
        this.width = size;
        this.height = size;
        
        this.totalCrosses = 0; 
    }

    canPlace(text, startX, startY, dir) {
        if (dir === 'H' && startX + text.length > this.size) return false;
        if (dir === 'V' && startY + text.length > this.size) return false;
        if (startX < 0 || startY < 0) return false;

        let headX = startX - (dir === 'H' ? 1 : 0);
        let headY = startY - (dir === 'V' ? 1 : 0);
        if (!this.isEmptyOrOOB(headX, headY)) return false;

        let tailX = startX + (dir === 'H' ? text.length : 0);
        let tailY = startY + (dir === 'V' ? text.length : 0);
        if (!this.isEmptyOrOOB(tailX, tailY)) return false;

        let crosses = 0;
        for (let i = 0; i < text.length; i++) {
            let x = startX + (dir === 'H' ? i : 0);
            let y = startY + (dir === 'V' ? i : 0);
            let cell = this.grid[y][x];

            if (dir === 'H' && cell.countH > 0) return false;
            if (dir === 'V' && cell.countV > 0) return false;

            if (cell.char) {
                if (cell.char !== text[i]) return false;
                crosses++;
            } else {
                if (dir === 'H') {
                    if (!this.isEmptyOrOOB(x, y - 1)) return false;
                    if (!this.isEmptyOrOOB(x, y + 1)) return false;
                } else {
                    if (!this.isEmptyOrOOB(x - 1, y)) return false;
                    if (!this.isEmptyOrOOB(x + 1, y)) return false;
                }
            }
        }
        if (this.placedWords.length > 0 && crosses === 0) return false;
        return true;
    }

    isEmptyOrOOB(x, y) {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) return true;
        return this.grid[y][x].char === null;
    }

    place(wordObj) {
        for (let i = 0; i < wordObj.text.length; i++) {
            let x = wordObj.x + (wordObj.dir === 'H' ? i : 0);
            let y = wordObj.y + (wordObj.dir === 'V' ? i : 0);
            
            if (this.grid[y][x].char !== null) {
                this.totalCrosses++;
            }

            this.grid[y][x].char = wordObj.text[i];
            
            if (wordObj.dir === 'H') this.grid[y][x].countH++;
            if (wordObj.dir === 'V') this.grid[y][x].countV++; 
        }
        this.placedWords.push(wordObj);
    }

    remove(wordObj) {
        for (let i = 0; i < wordObj.text.length; i++) {
            let x = wordObj.x + (wordObj.dir === 'H' ? i : 0);
            let y = wordObj.y + (wordObj.dir === 'V' ? i : 0);
            
            if (wordObj.dir === 'H') this.grid[y][x].countH--;
            if (wordObj.dir === 'V') this.grid[y][x].countV--;
            
            if (this.grid[y][x].countH === 0 && this.grid[y][x].countV === 0) {
                this.grid[y][x].char = null;
            } else {
                this.totalCrosses--;
            }
        }
        this.placedWords.pop();
    }

    getCrossCount(wordObj) {
        let crosses = 0;
        for (let i = 0; i < wordObj.text.length; i++) {
            let x = wordObj.x + (wordObj.dir === 'H' ? i : 0);
            let y = wordObj.y + (wordObj.dir === 'V' ? i : 0);
            
            if (this.grid[y][x].countH > 0 && this.grid[y][x].countV > 0) {
                crosses++;
            }
        }
        return crosses;
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    solve(depth = 0) {
        if (Date.now() - this.startTime > this.timeLimit) return false; 

        let allSatisfied = this.placedWords.length > 0 && this.placedWords.every(w => this.getCrossCount(w) >= 2);
        
        if (allSatisfied && this.placedWords.length >= this.minWords) {
            let minX = this.size, maxX = 0, minY = this.size, maxY = 0;
            let maxGap = 0;

            for (let w of this.placedWords) {
                minX = Math.min(minX, w.x);
                maxX = Math.max(maxX, w.x + (w.dir === 'H' ? w.text.length - 1 : 0));
                minY = Math.min(minY, w.y);
                maxY = Math.max(maxY, w.y + (w.dir === 'V' ? w.text.length - 1 : 0));

                let lastCrossIndex = -1;
                for (let i = 0; i < w.text.length; i++) {
                    let x = w.x + (w.dir === 'H' ? i : 0);
                    let y = w.y + (w.dir === 'V' ? i : 0);
                    if (this.grid[y][x].countH > 0 && this.grid[y][x].countV > 0) {
                        let gap = lastCrossIndex === -1 ? i : i - lastCrossIndex - 1;
                        if (gap > maxGap) maxGap = gap;
                        lastCrossIndex = i;
                    }
                }
                let endGap = w.text.length - 1 - lastCrossIndex;
                if (endGap > maxGap) maxGap = endGap;
            }

            let area = (maxX - minX + 1) * (maxY - minY + 1);

            let N = this.placedWords.length;
            let adj = Array.from({length: N}, () => []);
            let edges = [];

            for (let i = 0; i < N; i++) {
                for (let j = i + 1; j < N; j++) {
                    let w1 = this.placedWords[i];
                    let w2 = this.placedWords[j];
                    if (w1.dir !== w2.dir) {
                        let hWord = w1.dir === 'H' ? w1 : w2;
                        let vWord = w1.dir === 'V' ? w1 : w2;
                        if (vWord.x >= hWord.x && vWord.x < hWord.x + hWord.text.length &&
                            hWord.y >= vWord.y && hWord.y < vWord.y + vWord.text.length) {
                            adj[i].push(j);
                            adj[j].push(i);
                            edges.push([i, j]);
                        }
                    }
                }
            }

            let bridgeCount = 0;
            let visited = new Uint8Array(N);
            let queue = new Int32Array(N);

            for (let i = 0; i < edges.length; i++) {
                let u = edges[i][0];
                let v = edges[i][1];
                
                visited.fill(0);
                let qHead = 0, qTail = 0;
                
                queue[qTail++] = u;
                visited[u] = 1;
                
                let isBridge = true;
                
                while (qHead < qTail) {
                    let curr = queue[qHead++];
                    if (curr === v) {
                        isBridge = false; 
                        break;
                    }
                    let neighbors = adj[curr];
                    for (let j = 0; j < neighbors.length; j++) {
                        let nxt = neighbors[j];
                        if ((curr === u && nxt === v) || (curr === v && nxt === u)) continue; 
                        if (visited[nxt] === 0) {
                            visited[nxt] = 1;
                            queue[qTail++] = nxt;
                        }
                    }
                }
                if (isBridge) bridgeCount++;
            }

            let score = (this.totalCrosses * 100) 
                      + (this.placedWords.length * 10) 
                      - (bridgeCount * 5000) 
                      - (maxGap * 50) 
                      - (area * 2);

            if (score > this.bestScore) {
                this.bestScore = score;
                this.bestState = this.placedWords.map(w => ({ text: w.text, x: w.x, y: w.y, dir: w.dir }));
            }
        }

        let deficientWords = this.placedWords.filter(w => this.getCrossCount(w) < 2);
        let targets = deficientWords.length > 0 ? [deficientWords[0]] : [...this.placedWords];
        this.shuffle(targets);

        for (let target of targets) {
            let dirNeeded = target.dir === 'H' ? 'V' : 'H';
            let indices = Array.from({ length: target.text.length }, (_, k) => k);
            this.shuffle(indices);

            for (let i of indices) {
                let char = target.text[i];
                let hookX = target.x + (target.dir === 'H' ? i : 0);
                let hookY = target.y + (target.dir === 'V' ? i : 0);

                let lengths = Object.keys(this.index).filter(len => parseInt(len) >= 3);
                this.shuffle(lengths);

                for (let length of lengths) {
                    let matchIndices = Array.from({ length: parseInt(length) }, (_, k) => k);
                    this.shuffle(matchIndices);

                    for (let matchIndex of matchIndices) {
                        if (this.index[length] && this.index[length][matchIndex] && this.index[length][matchIndex][char]) {
                            
                            let candidates = [...this.index[length][matchIndex][char]];
                            this.shuffle(candidates);

                            for (let name of candidates) {
                                if (this.usedWords.has(name)) continue;

                                if (this.allowedWords && !this.allowedWords.has(name)) continue;

                                let startX = hookX - (dirNeeded === 'H' ? matchIndex : 0);
                                let startY = hookY - (dirNeeded === 'V' ? matchIndex : 0);

                                if (this.canPlace(name, startX, startY, dirNeeded)) {
                                    let wordObj = { text: name, x: startX, y: startY, dir: dirNeeded };
                                    this.place(wordObj);
                                    this.usedWords.add(name);

                                    this.solve(depth + 1);

                                    this.remove(wordObj);
                                    this.usedWords.delete(name);

                                    if (Date.now() - this.startTime > this.timeLimit) return false;
                                }
                            }
                        }
                    }
                }
            }
            if (deficientWords.length > 0) return false;
        }
        return false;
    }

    restoreBest() {
        this.grid = Array.from({ length: this.size }, () => 
            Array.from({ length: this.size }, () => ({ char: null, countH: 0, countV: 0, number: null }))
        );
        this.placedWords = [];
        this.usedWords = new Set();
        this.totalCrosses = 0; 
        
        for (let w of this.bestState) {
            this.place(w);
            this.usedWords.add(w.text);
        }
    }

    trim() {
        if (this.placedWords.length === 0) return;

        let minX = this.size, maxX = 0, minY = this.size, maxY = 0;
        for (let w of this.placedWords) {
            minX = Math.min(minX, w.x);
            maxX = Math.max(maxX, w.x + (w.dir === 'H' ? w.text.length - 1 : 0));
            minY = Math.min(minY, w.y);
            maxY = Math.max(maxY, w.y + (w.dir === 'V' ? w.text.length - 1 : 0));
        }

        this.width = maxX - minX + 1;
        this.height = maxY - minY + 1;

        let newGrid = Array.from({ length: this.height }, () => 
            Array.from({ length: this.width }, () => ({ char: null, countH: 0, countV: 0, number: null }))
        );

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                let oldCell = this.grid[y][x];
                newGrid[y - minY][x - minX] = { char: oldCell.char, countH: oldCell.countH, countV: oldCell.countV, number: oldCell.number };
            }
        }

        for (let w of this.placedWords) {
            w.x -= minX;
            w.y -= minY;
        }

        this.grid = newGrid;
    }

    assignNumbers() {
        let heads = [];
        for (let w of this.placedWords) {
            heads.push({ x: w.x, y: w.y });
        }

        heads.sort((a, b) => {
            if (a.y !== b.y) return a.y - b.y;
            return a.x - b.x;
        });

        let uniqueHeads = [];
        for (let h of heads) {
            if (uniqueHeads.length === 0) {
                uniqueHeads.push(h);
            } else {
                let last = uniqueHeads[uniqueHeads.length - 1];
                if (last.x !== h.x || last.y !== h.y) {
                    uniqueHeads.push(h);
                }
            }
        }

        let currentNumber = 1;
        for (let h of uniqueHeads) {
            this.grid[h.y][h.x].number = currentNumber;

            for (let w of this.placedWords) {
                if (w.x === h.x && w.y === h.y) {
                    w.number = currentNumber;
                }
            }
            currentNumber++;
        }
        
        this.placedWords.sort((a, b) => a.number - b.number);
    }
}