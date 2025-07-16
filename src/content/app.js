import { learningWords, knownWords, wantedWords, skippedWords, settings, _tokenizer, showBorder, whatColor, isSkipped } from './tokenizer';
import { spanChildren, tryObserveNetflix, tryObserveYoutube } from './subs_utils';
import { editElementRecursively } from './text_utils';

let child_over = null;
let keysPressed = new Set();
const netflixFlag = window.location.hostname.includes("netflix."); // true means on netflix, false else
const youtubeFlag = window.location.hostname.includes("youtube."); // true means on youtube, false else

loadFromLocal(knownWords, "userKnownWords");
loadFromLocal(learningWords, "userLearningWords");
loadFromLocal(wantedWords, "userWantedWords");
loadFromLocal(skippedWords,  "userSkippedWords");
loadSettings();

/* 
********************************************************************
* Mouse move event
******************************************************************** 
*/ 
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
  if(netflixFlag){
    mouseMoveNetflix(elementsUnderMouse);
  }else{
    mouseMoveDefault(elementsUnderMouse);
  }
});

/* 
********************************************************************
* Click event
******************************************************************** 
*/ 
document.addEventListener('click', (e) => {
  if(!keysPressed.has('alt')){
    return;
  }
  const clickedElement = e.target;
  editElementRecursively(clickedElement);
}, true);

/* 
********************************************************************
* Key press events
******************************************************************** 
*/ 
document.addEventListener('keydown', (e) => {
  keysPressed.add(e.key.toLowerCase());

  if (keysPressed.has('alt') && keysPressed.has('a')) {
    if(child_over != undefined && child_over.dataset.tag == "") {
      console.log("Saving in known", child_over.dataset.base);
      knownWords.add(child_over.dataset.base);
      setToLocal(knownWords, "userKnownWords");
      reloadColor();
    }
    return;
  }
  if (keysPressed.has('alt') && keysPressed.has('w')) {
    if(child_over != undefined && child_over.dataset.tag == "") {
      console.log("Saving in wanted", child_over.dataset.base);
      wantedWords.add(child_over.dataset.base);
      setToLocal(wantedWords, "userWantedWords");
      reloadColor();
    }
    return;
  }
  if (keysPressed.has('alt') && keysPressed.has('s')) {
    if(child_over != undefined && child_over.dataset.tag == "") {
      console.log("Saving in skipped", child_over.dataset.base);
      skippedWords.add(child_over.dataset.base);
      setToLocal(skippedWords, "userSkippedWords");
      reloadColor();
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

/* 
********************************************************************
* Message listener
******************************************************************** 
*/ 
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("*-* Message received !", message.type);
  if (message.type === "require_known_words") {
    const text = Array.from(knownWords).join('\n');
    sendResponse({ text: text });
    return;
  }
  if (message.type === "require_learning_words") {
    const text = Array.from(learningWords).join('\n');
    sendResponse({ text: text });
    return;
  }
  if (message.type === "require_wanted_words") {
    const text = Array.from(wantedWords).join('\n');
    sendResponse({ text: text });
    return;
  }
  if (message.type === "send_known_words") {
    loadWordText(message.text, knownWords);
    setToLocal(knownWords, "userKnownWords");
    return;
  }
  if (message.type === "send_learning_words") {
    loadWordText(message.text, learningWords);
    setToLocal(learningWords, "userLearningWords");
    return;
  }
  if (message.type === "send_wanted_words") {
    loadWordText(message.text, wantedWords);
    setToLocal(wantedWords, "userWantedWords");
    return;
  }
  if (message.type === "reload_known_words") {
    knownWords.clear();
    loadFromLocal(knownWords, "userKnownWords");
    return;
  }
  if (message.type === "reload_learning_words") {
    learningWords.clear();
    loadFromLocal(learningWords, "userLearningWords");
    return;
  }
  if (message.type === "reload_wanted_words") {
    wantedWords.clear();
    loadFromLocal(wantedWords, "userWantedWords");
    return;
  }
  if (message.type === "reload_skipped_words") {
    skippedWords.clear();
    loadFromLocal(skippedWords, "userSkippedWords");
    return;
  }
  if (message.type === "settings_update") {
    settings[message.key] = message.value;
    setSettings();
    reloadColor();
    return;
  }
  return true;
});

/* 
********************************************************************
* Local words storage handling
******************************************************************** 
*/ 
function loadFromLocal(targetSet, localId){
  chrome.storage.local.get(localId, (result) => {
    const wordList = result[localId] || [];
    for(let word of wordList){
      targetSet.add(word);
    }
    reloadColor();
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
    console.log("*-* In client PC : ", knownWords.size);
  });
  chrome.storage.local.get("userLearningWords", (result) => {
    const wordList = result["userLearningWords"] || [];
    console.log("*-* In local storage learning : ", wordList.length);
    console.log("*-* In client PC : ", learningWords.size);
  });
  chrome.storage.local.get("userWantedWords", (result) => {
    const wordList = result["userWantedWords"] || [];
    console.log("*-* In local storage wanted : ", wordList.length);
    console.log("*-* In client PC : ", wantedWords.size);
  });
  chrome.storage.local.get("userSkippedWords", (result) => {
    const wordList = result["userSkippedWords"] || [];
    console.log("*-* In local storage skipped : ", wordList.length);
    console.log("*-* In client PC : ", skippedWords.size);
  });
}

/* 
********************************************************************
* Local settings storage handling
******************************************************************** 
*/ 
function loadSettings(){
  chrome.storage.local.get("settings", (result) => {
    const localSettings = result["settings"] || {};
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

/* 
********************************************************************
* Loading word from a given text
******************************************************************** 
*/ 
function loadWordText(text, targetSet){
  const words = text.split('\n');
  for(let word of words){
    targetSet.add(word);
  }
  reloadColor();
}

/* 
********************************************************************
* Update colored ruby tags
******************************************************************** 
*/ 
function reloadColor(){
  if(netflixFlag){ // netflix automaticaly update the subs
    return;
  }
  const elementsWithEmptyTag = Array.from(document.querySelectorAll('ruby[data-tag]'));
  for(let element of elementsWithEmptyTag){
    const pos = element.dataset.pos;
    const base = element.dataset.base;
    const baseColor = element.dataset.bc;
    const skip = isSkipped(pos, base);
    element.setAttribute("tag", skip);
    if(skip == ""){
      element.setAttribute("style", `color : ${whatColor(pos, base, baseColor)}`);
    }else{
      element.setAttribute("style", `color : ${baseColor}`);
    }

  }
}

// launch the MutationObserver if on netflix
if (netflixFlag) {
  tryObserveNetflix();
}else if(youtubeFlag){
  tryObserveYoutube();
}