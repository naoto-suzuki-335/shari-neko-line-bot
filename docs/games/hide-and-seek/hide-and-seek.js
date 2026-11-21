(function () {
  "use strict";

  const COLORS = ["#f1d2c0", "#f0e2b4", "#d4e3c8", "#cce0e7", "#ddd1e8", "#edced9", "#d9dfb8", "#e6cfb5"];
  const PUZZLES = {
    practice: { title: "練習問題", size: 5, regions: [3,3,0,0,0, 1,3,3,3,2, 3,3,3,2,2, 3,3,3,3,2, 3,3,3,4,2], solution: [2,0,4,1,3] },
    main: { title: "本番問題", size: 8, regions: [2,0,1,1,1,1,1,1, 2,2,1,1,1,1,1,1, 2,2,1,1,1,1,1,1, 2,2,7,5,1,4,6,3, 2,2,7,5,1,4,6,6, 7,7,7,5,5,5,6,6, 7,7,7,7,7,5,6,6, 7,7,7,7,7,6,6,6], solution: [1,4,0,7,5,3,6,2] }
  };
  const VARIANTS = Object.fromEntries(Object.entries(PUZZLES).map(([key, puzzle]) => [key, createVariants(puzzle)]));
  const selectedVariantIndexes = Object.fromEntries(Object.entries(VARIANTS).map(([key, variants]) => [key, Math.floor(Math.random() * variants.length)]));
  const board = document.querySelector("[data-board]");
  const title = document.querySelector("[data-puzzle-title]");
  const count = document.querySelector("[data-cat-count]");
  const status = document.querySelector("[data-status]");
  const reset = document.querySelector("[data-reset]");
  const alternate = document.querySelector("[data-alternate]");
  const completion = document.querySelector("[data-completion]");
  const completionCount = document.querySelector("[data-completion-count]");
  const modeButtons = Array.from(document.querySelectorAll("[data-puzzle]"));
  let currentKey = "practice";
  let states = [];
  let complete = false;
  let generation = 0;

  function transformCoordinate(row, col, size, shouldMirror, rotations) {
    let nextRow = row;
    let nextCol = shouldMirror ? size - 1 - col : col;
    for (let turn = 0; turn < rotations; turn += 1) {
      const rotatedRow = nextCol;
      const rotatedCol = size - 1 - nextRow;
      nextRow = rotatedRow;
      nextCol = rotatedCol;
    }
    return [nextRow, nextCol];
  }
  function transformPuzzle(puzzle, shouldMirror, rotations) {
    const regions = Array(puzzle.size * puzzle.size);
    const solution = Array(puzzle.size);
    for (let row = 0; row < puzzle.size; row += 1) {
      for (let col = 0; col < puzzle.size; col += 1) {
        const [nextRow, nextCol] = transformCoordinate(row, col, puzzle.size, shouldMirror, rotations);
        regions[nextRow * puzzle.size + nextCol] = puzzle.regions[row * puzzle.size + col];
      }
      const [solutionRow, solutionCol] = transformCoordinate(row, puzzle.solution[row], puzzle.size, shouldMirror, rotations);
      solution[solutionRow] = solutionCol;
    }
    return { title: puzzle.title, size: puzzle.size, regions, solution };
  }
  function createVariants(puzzle) {
    const variants = [];
    const signatures = new Set();
    for (const shouldMirror of [false, true]) {
      for (let rotations = 0; rotations < 4; rotations += 1) {
        const variant = transformPuzzle(puzzle, shouldMirror, rotations);
        const signature = `${variant.regions.join(",")}|${variant.solution.join(",")}`;
        if (!signatures.has(signature)) {
          signatures.add(signature);
          variants.push(variant);
        }
      }
    }
    return variants;
  }
  function getPuzzle(key) { return VARIANTS[key][selectedVariantIndexes[key]]; }
  function clear(element) { while (element.firstChild) element.removeChild(element.firstChild); }
  function catIndexes() { return states.map((state, index) => state === 2 ? index : -1).filter(index => index >= 0); }
  function hasConflict(index, cats, puzzle) {
    const row = Math.floor(index / puzzle.size), col = index % puzzle.size, region = puzzle.regions[index];
    return cats.some(other => other !== index && (Math.floor(other / puzzle.size) === row || other % puzzle.size === col || puzzle.regions[other] === region || (Math.abs(Math.floor(other / puzzle.size) - row) <= 1 && Math.abs(other % puzzle.size - col) <= 1)));
  }
  function isSolved(puzzle, cats) { return cats.length === puzzle.size && puzzle.solution.every((col, row) => states[row * puzzle.size + col] === 2); }
  function applyAreaBoundaries(cell, index, puzzle) {
    const row = Math.floor(index / puzzle.size);
    const col = index % puzzle.size;
    const region = puzzle.regions[index];
    cell.classList.toggle("is-first-row", row === 0);
    cell.classList.toggle("is-first-column", col === 0);
    cell.classList.toggle("has-area-boundary-top", row > 0 && puzzle.regions[index - puzzle.size] !== region);
    cell.classList.toggle("has-area-boundary-left", col > 0 && puzzle.regions[index - 1] !== region);
  }
  function render() {
    const puzzle = getPuzzle(currentKey), cats = catIndexes();
    Array.from(board.children).forEach((cell, index) => {
      clear(cell); cell.classList.toggle("is-conflict", states[index] === 2 && hasConflict(index, cats, puzzle));
      if (states[index] === 1 && !complete) { const mark = document.createElement("span"); mark.className="mark"; mark.textContent="×"; mark.setAttribute("aria-hidden","true"); cell.append(mark); }
      if (states[index] === 2) {
        if (complete) { const image=document.createElement("img"); const faceNumber=Math.floor(index / puzzle.size)+1; image.className="face"; image.src=`./assets/${String(faceNumber).padStart(3,"0")}.png`; image.alt=""; cell.append(image); }
        else { const mark=document.createElement("span"); mark.className="mark cat-mark"; mark.setAttribute("aria-hidden","true"); cell.append(mark); }
      }
      const labels=["空欄","ばつ印","ねこ印"];
      const stateLabel=complete ? (states[index] === 2 ? "しゃりねこ、完成" : "空きマス、完成") : labels[states[index]];
      cell.setAttribute("aria-label", `${Math.floor(index/puzzle.size)+1}行${index%puzzle.size+1}列、${stateLabel}${cell.classList.contains("is-conflict") ? "、ルール上の衝突あり" : ""}`);
    });
    count.textContent=`${cats.length} / ${puzzle.size}匹`;
  }
  function finish(puzzle) {
    complete=true; completionCount.textContent=`${puzzle.size}匹、そろいました。`; completion.hidden=false; status.textContent="完成です。"; render(); scheduleCompletionScroll(generation);
  }
  function handleCell(event) {
    if (complete) return;
    const index=Number(event.currentTarget.dataset.index); if (!Number.isInteger(index) || index < 0 || index >= states.length) return;
    states[index]=(states[index]+1)%3; const puzzle=getPuzzle(currentKey), cats=catIndexes();
    if (isSolved(puzzle,cats)) finish(puzzle); else { status.textContent=cats.some(cat=>hasConflict(cat,cats,puzzle)) ? "ねこ印がルール上、ぶつかっています。" : "考え中です。"; render(); }
  }
  function start(key, statusMessage) {
    const puzzle=getPuzzle(key); if (!puzzle || !board || !title || !count || !status || !reset || !alternate || !completion || !completionCount) return;
    currentKey=key; generation+=1; complete=false; states=Array(puzzle.size*puzzle.size).fill(0); clear(board);
    board.style.gridTemplateColumns=`repeat(${puzzle.size}, minmax(0, 1fr))`; board.setAttribute("aria-label",`${puzzle.title} ${puzzle.size}かける${puzzle.size}`);
    for(let index=0;index<states.length;index+=1){const cell=document.createElement("button");cell.type="button";cell.className="cell";cell.dataset.index=String(index);cell.style.setProperty("--cell-color",COLORS[puzzle.regions[index]]);applyAreaBoundaries(cell,index,puzzle);cell.setAttribute("role","gridcell");cell.addEventListener("click",handleCell);board.append(cell);}
    title.textContent=puzzle.title; completion.hidden=true; status.textContent=statusMessage || "ねこ印を置いてみましょう。"; modeButtons.forEach(button=>button.setAttribute("aria-pressed",button.dataset.puzzle===key?"true":"false")); board.setAttribute("aria-busy","false"); render();
  }
  function showAlternateVariant() {
    const variants = VARIANTS[currentKey];
    const currentIndex = selectedVariantIndexes[currentKey];
    let nextIndex = Math.floor(Math.random() * (variants.length - 1));
    if (nextIndex >= currentIndex) nextIndex += 1;
    selectedVariantIndexes[currentKey] = nextIndex;
    start(currentKey, "別の配置にしました。");
  }
  function scheduleCompletionScroll(scheduledGeneration) { if(typeof window.requestAnimationFrame!=="function")return; window.requestAnimationFrame(()=>{if(scheduledGeneration!==generation||completion.hidden)return; const rect=completion.getBoundingClientRect(),viewport=window.visualViewport; const top=viewport&&Number.isFinite(viewport.offsetTop)?viewport.offsetTop:0; const height=viewport&&Number.isFinite(viewport.height)&&viewport.height>0?Math.min(viewport.height,window.innerHeight||viewport.height):window.innerHeight; if(!Number.isFinite(height)||rect.top>=top&&rect.bottom<=top+height)return; const distance=rect.bottom-(top+height)+12; if(!Number.isFinite(distance)||distance<=0)return; const reduced=typeof window.matchMedia==="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches; try{window.scrollBy({top:distance,left:0,behavior:reduced?"auto":"smooth"});}catch(error){try{window.scrollBy(0,distance);}catch(ignored){/* ゲーム処理は完了済み。 */}} }); }
  if (board && reset && alternate && modeButtons.length===2) { modeButtons.forEach(button=>button.addEventListener("click",()=>start(button.dataset.puzzle))); reset.addEventListener("click",()=>start(currentKey)); alternate.addEventListener("click",showAlternateVariant); start(currentKey); }
}());
