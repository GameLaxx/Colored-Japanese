import { learning_words, known_words, wanted_words, settings, _tokenizer, showBorder } from './tokenizer';
import { spanChildren, tryObserve } from './subs_utils';
import { editElementRecursively } from './text_utils';

let child_over = null;
let keysPressed = new Set();
const navType = window.location.hostname.includes("netflix."); // true means on netflix, false else

loadWordList(known_words, '/known.txt', "userKnownWords");
loadWordList(learning_words, '/learning.txt', "userLearningWords");
loadWordList(wanted_words, '', "userWantedWords");
loadSettings();

function mouseMoveNetflix(elementsUnderMouse){
  for(let span of spanChildren){
    const matchedChild = Array.from(span.children).find(child =>
      elementsUnderMouse.includes(child)
    );
    if (matchedChild) {
      child_over = matchedChild;
      return;
    }
  }
}
function mouseMoveDefault(elementsUnderMouse){
  child_over = elementsUnderMouse[0];
}
document.addEventListener('mousemove', (event) => {
  child_over = undefined;
  const x = event.clientX;
  const y = event.clientY;
  const elementsUnderMouse = document.elementsFromPoint(x, y);
  if(elementsUnderMouse.length === 0){
    return;
  }
  if(navType){
    mouseMoveNetflix(elementsUnderMouse);
  }else{
    mouseMoveDefault(elementsUnderMouse);
  }
});

document.addEventListener('click', (e) => {
  if(!keysPressed.has('alt')){
    return;
  }
  const clickedElement = e.target;
  editElementRecursively(clickedElement);
}, true);

document.addEventListener('keydown', (e) => {
  keysPressed.add(e.key.toLowerCase());

  if (keysPressed.has('alt') && keysPressed.has('a')) {
    if(child_over != undefined && child_over.dataset.tag == "") {
      console.log("Saving in known", child_over.dataset.base);
      known_words.add(child_over.dataset.base);
      setToLocal(known_words, "userKnownWords");
    }
    return;
  }
  if (keysPressed.has('alt') && keysPressed.has('w')) {
    if(child_over != undefined && child_over.dataset.tag == "") {
      console.log("Saving in wanted", child_over.dataset.base);
      wanted_words.add(child_over.dataset.base);
      setToLocal(wanted_words, "userWantedWords");
    }
    return;
  }
  if (keysPressed.has('alt') && keysPressed.has('!')) {
    if(child_over != undefined) {
      showBorder(child_over);
    }
    return;
  }
  if (keysPressed.has('alt') && keysPressed.has('?')){
    countLocal();
  }
});

document.addEventListener('keyup', (e) => {
  keysPressed.delete(e.key.toLowerCase());
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("*-* Message received !", message.type);
  if (message.type === "require_known_words") {
    const text = Array.from(known_words).join('\n');
    sendResponse({ text: text });
    return;
  }
  if (message.type === "require_learning_words") {
    const text = Array.from(learning_words).join('\n');
    sendResponse({ text: text });
    return;
  }
  if (message.type === "require_wanted_words") {
    const text = Array.from(wanted_words).join('\n');
    sendResponse({ text: text });
    return;
  }
  if (message.type === "send_known_words") {
    loadWordText(message.text, known_words);
    setToLocal(known_words, "userKnownWords");
    return;
  }
  if (message.type === "send_learning_words") {
    loadWordText(message.text, learning_words);
    setToLocal(learning_words, "userLearningWords");
    return;
  }
  if (message.type === "send_wanted_words") {
    loadWordText(message.text, wanted_words);
    setToLocal(wanted_words, "userWantedWords");
    return;
  }
  if (message.type === "reload_words") {
    known_words.clear();
    loadFromLocal(known_words, "userKnownWords");
    return;
  }
  if (message.type === "settings_update") {
    settings[message.key] = message.value;
    setSettings();
    return;
  }
  return true;
});

function loadFromLocal(targetSet, localId){
  chrome.storage.local.get(localId, (result) => {
    const wordList = result[localId] || [];
    for(let word of wordList){
      targetSet.add(word);
    }
    console.log(`*-* ${targetSet.size} words localy loaded`);
  });
}
function setToLocal(targetSet, localId){
  // thanks to json in js, { localId : ... } <=> {"localId" : ...} ==> [localId] is needed
  chrome.storage.local.set({ [localId] : Array.from(targetSet) }, () => {
  });
}
function countLocal(){
  chrome.storage.local.get("userKnownWords", (result) => {
    const wordList = result["userKnownWords"] || [];
    console.log("*-* In local storage known : ", wordList.length);
    console.log("*-* In client PC : ", known_words.size);
  });
  chrome.storage.local.get("userLearningWords", (result) => {
    const wordList = result["userLearningWords"] || [];
    console.log("*-* In local storage learning : ", wordList.length);
    console.log("*-* In client PC : ", learning_words.size);
  });
  chrome.storage.local.get("userWantedWords", (result) => {
    const wordList = result["userWantedWords"] || [];
    console.log("*-* In local storage wanted : ", wordList.length);
    console.log("*-* In client PC : ", wanted_words.size);
  });
}
function loadSettings(){
  chrome.storage.local.get("settings", (result) => {
    const localSettings = result["settings"] || {"known_color" : false, "missing_color" : false, "particles_color" : false, "adverbs_skip" : false};
    for(let key in localSettings){
      settings[key] = localSettings[key];
    }
    console.log(`*-* Settings localy loaded`);
  });
}
function setSettings(){
  chrome.storage.local.set({ "settings" : settings }, () => {
  });
}

async function loadWordText(text, targetSet){
  const words = text.split('\n');
  for(let word of words){
    targetSet.add(word);
  }
}

async function loadWordList(targetSet, urlFile, localId) {
  if(urlFile.length != 0){
    const url_ext = chrome.runtime.getURL(urlFile);
    const response = await fetch(url_ext);
    const text = await response.text();
    loadWordText(text, targetSet)
    console.log(`*-* ${targetSet.size} words loaded`);
  }
  loadFromLocal(targetSet, localId);
}


if (navType) {
  tryObserve();
}