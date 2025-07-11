import kuromoji from 'kuromoji'

let tokenizer = null;
let known_words = null;
let learning_words = null;
let spanChildren = [];
let child_over = null;
let keysPressed = new Set();

kuromoji.builder({ dicPath: chrome.runtime.getURL('dict') }).build((err, builtTokenizer) => {
  if (err) throw err;
  
  tokenizer = builtTokenizer;
  loadWordList("known", '/known.txt');
  loadWordList("learning", '/learning.txt');
  console.log("*-* Color subs loaded !")
});

document.addEventListener('mousemove', (event) => {
  child_over = undefined;
  const x = event.clientX;
  const y = event.clientY;
  const elementsUnderMouse = document.elementsFromPoint(x, y);
  for(let span of spanChildren){
    const matchedChild = Array.from(span.children).find(child =>
      elementsUnderMouse.includes(child)
    );
    if (matchedChild) {
      child_over = matchedChild;
      return;
    }
  }
});

document.addEventListener('keydown', (e) => {
  keysPressed.add(e.key.toLowerCase());

  if (keysPressed.has('shift') && keysPressed.has('a')) {
    console.log("In a  + shift")
    if(child_over != undefined && child_over.dataset.tag == "") {
      console.log("Saving", child_over.dataset.base);
      known_words.add(child_over.dataset.base);
      setToLocal();
    }
  }
});

document.addEventListener('keyup', (e) => {
  keysPressed.delete(e.key.toLowerCase());
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("*-* Message received", message.type)
  if (message.type === "require_words") {
    console.log("*-* Require received !");
    const text = Array.from(known_words).join('\n');
    sendResponse({text: text });
  }
  if (message.type === "send_words") {
    loadWordText(message.text);
    setToLocal();
  }
  return true;
});

function loadFromLocal(){
  chrome.storage.local.get("userWords", (result) => {
    const wordList = result.userWords || [];
    const loadedSet = new Set(wordList);
    known_words = new Set([...known_words, ...loadedSet]);
  });
}

function setToLocal(){
  chrome.storage.local.set({ userWords: Array.from(known_words) }, () => {
  });
}

async function loadWordText(text){
  const words = text.split('\n');
  console.log(`Text with ${words.length} words given !`)
  let i = 0;
  for(let word of words){
    i += 1;
    known_words.add(word);
  }
  console.log(`*-* ${i} words loaded !`)
}

async function loadWordList(type, url) {
  const url_ext = chrome.runtime.getURL(url);
  const response = await fetch(url_ext);
  const text = await response.text();
  const words = text.split('\n');
  if(type == "known"){
    known_words = new Set(words);
    console.log(`*-* ${known_words.size} words loaded`);
    loadFromLocal();
  }else{
    learning_words = new Set(words);
    console.log(`*-* ${learning_words.size} words loaded`);
  }
}

function isVerb(token){
  if(token.pos == "動詞" || token.pos == "助動詞"){
    return 2;
  }else if(token.pos_detail_1 == "サ変接続"){
    return 1;
  }else{
    return 0;
  }
}

function editText(tokens, index){
  let ret = (index == 0) ? "" : "<br>";
  let base = "";
  let tmp = "";
  let is_parenthesis_open = false;
  let is_parenthesis_close = false;
  let is_verb = 0; // 0 is not, 1 is maybe (sahen), 2 is yes
  let tag = "";
  let color = "";
  for(let i = 0; i < tokens.length; i++){
    if(tokens[i] == undefined){
      continue;
    }
    if(tokens[i].reading == undefined){
      ret += `<ruby data-base="${tokens[i].surface_form}" data-tag="skip">${tokens[i].surface_form}</ruby>`;
      continue;
    }
    tmp += tokens[i].surface_form;
    if(is_verb == 0 && is_parenthesis_open == false && is_parenthesis_close == false){
      base = tokens[i].basic_form;
      if(tokens[i].pos == "助詞"){ // particle
        color = "#42c8f5";
      }else if(tokens[i].pos == "副詞"){ // adverbs
        color = "#ff816e";
      }else if(learning_words.has(base)){
        color = "#faed75";
      }else if(known_words.has(base)){
        color = "#02d802";
      }else{
        color = "white";
      }
    }
    if(tokens[i].pos == "記号" || tokens[i].pos == "感動詞" || tokens[i].pos == "連体詞" || (is_verb == 0 && tokens[i].pos == "助動詞")){
      // symbol, interjection, pre-noun adjectives, bound auxialary when not a verb
      tag = "skip";
    }
    is_parenthesis_open = is_parenthesis_open || tokens[i].pos_detail_1 == "括弧開"; // opened parenthesis
    is_parenthesis_close = tokens[i].pos_detail_1 == "括弧閉"; // closed parenthesis
    is_verb = isVerb(tokens[i]);
    if(is_parenthesis_close){
      is_parenthesis_open = false;
    }
    if(is_parenthesis_open){
      tag = "skip";
      continue;
    }
    if(is_verb != 0 && i != tokens.length - 1){
      if(is_verb == 1 && tokens[i + 1].basic_form == "する"){
        is_verb = 2;
        continue;
      }
      if(tokens[i].conjugated_form == "連用タ接続" && tokens[i + 1].basic_form == "て"){
        continue;
      }
      if(tokens[i + 1].pos == "助動詞" || tokens[i + 1].pos_detail_1 == "非自立" || tokens[i + 1].pos_detail_1 == "接尾"){
        // bound auxialary, dependant verbs, suffix
        continue;
      }
      is_verb = 0;
    }
    if(tag == "skip"){
      color = "white";
    }
    ret += `<ruby data-base="${base}" data-tag="${tag}" style="color : ${color}">${tmp}</ruby>`;
    tmp = "";
    base = "";
    tag = "";
    is_verb = 0;
    is_parenthesis_close = false;
    is_parenthesis_open = false;
  }
  return ret;
}

function editBase(element, index){
    const tokens = tokenizer.tokenize(element.textContent);
    element.innerHTML = editText(tokens, index);
    return
}

function observeNetflixElement(selector, callback) {
  const targetNode = document.querySelector(selector);

  if (!targetNode) {
    console.log("Élément non trouvé :", selector);
    return;
  }

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList" || mutation.type === "characterData") {
        callback(mutation);
      }
    }
  });

  observer.observe(targetNode, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  console.log("Observation lancée sur :", selector);
}

const tryObserve = () => {
  const selector = ".player-timedtext";
  const target = document.querySelector(selector);
  if (target) {
    console.log("*-* Found the subs !")
    observeNetflixElement(selector, (mutation) => {
      const subdiv = mutation.target.querySelector(".player-timedtext-text-container");
      if(!subdiv){
        return;
      }
      const span_parent = subdiv.querySelector("span");
      if(!span_parent){
        return;
      }
      spanChildren = span_parent.querySelectorAll("span");
      if(spanChildren.length == 0){
        return
      }
      for(let i = 0; i < spanChildren.length; i++){
        if(spanChildren[i].lang != "ja"){
          continue;
        }
        editBase(spanChildren[i], i);
        console.log("Changement détecté :", spanChildren[i].textContent);
      }
    });
  } else {
    setTimeout(tryObserve, 1000);
  }
};

tryObserve();
