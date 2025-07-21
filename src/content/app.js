import { learningWords, knownWords, wantedWords, skippedWords, settings, _tokenizer, showBorder, whatColor, isSkipped, mergeElements } from './tokenizer';
import { spanChildren, tryObserveNetflix, tryObserveYoutube } from './subs_utils';
import { editElementRecursively } from './text_utils';

let child_over = null;
let mergingElement = null;
let keysPressed = new Set();
const netflixFlag = window.location.hostname.includes("netflix."); // true means on netflix, false else
const youtubeFlag = window.location.hostname.includes("youtube."); // true means on youtube, false else

loadFromLocal(knownWords, "userKnownWords");
loadFromLocal(learningWords, "userLearningWords");
loadFromLocal(wantedWords, "userWantedWords");
loadFromLocal(skippedWords,  "userSkippedWords");
loadSettings();

// helper
function capitalize(str) {
  if (!str) return "";
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}

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

  const actions = {
    a: { set: knownWords, label: "known"},
    w: { set: wantedWords, label: "wanted"},
    s: { set: skippedWords, label: "skipped"}
  };

  for (const key in actions) {
    if (keysPressed.has('alt') && keysPressed.has(key)) {
      const { set, label } = actions[key];
      if (child_over && child_over.dataset.tag === "") {
        const word = child_over.dataset.base;
        if(set.has(word)){
          console.log(`Deleting in ${label}`, word);
          set.delete(word);
        }else{
          console.log(`Saving in ${label}`, word);
          set.add(word);
        }
        setToLocal(set, `user${capitalize(label)}Words`);
        reloadColor();
      }
      return;
    }
  }
  if (keysPressed.has('alt') && keysPressed.has('!')) {
    if(child_over != undefined) {
      showBorder(child_over);
    }
    return;
  }
  if (keysPressed.has('alt') && keysPressed.has('m')) {
    if(child_over == undefined) {
      return
    }
    if(mergingElement == undefined){
      mergingElement = child_over;
      return
    }
    if(child_over == mergingElement.nextSibling){
      mergeElements(mergingElement, child_over);
    }else if(child_over == mergingElement.previousSibling){
      mergeElements(child_over, mergingElement);
      mergingElement = child_over;
    }else{
      mergingElement = child_over;
      return;
    }
    child_over = undefined;
    return;
  }
  if (keysPressed.has('alt') && keysPressed.has('?')){
    countLocal();
  }
  if (keysPressed.has('alt') && keysPressed.has('y') && youtubeFlag){
    tryObserveYoutube();
    return
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
  
  const require = {
    require_known_words: knownWords,
    require_learning_words: learningWords,
    require_wanted_words: wantedWords
  };
  for (const key in require) {
    if (message.type === key) {
      const text = Array.from(require[key]).join('\n');
      sendResponse({ text: text });
      return;
    }
  }
  
  const send = {
    send_known_words: {set : knownWords, localId : "userKnownWords"},
    send_learning_words: {set : learningWords, localId : "userLearningWords"},
    send_wanted_words: {set : wantedWords, localId : "userWantedWords"},
    send_skipped_words: {set : skippedWords, localId : "userSkippedWords"},
  };
  for(const key in send){
    if (message.type === key) {
      loadWordText(message.text, send[key].set);
      setToLocal(send[key].set, send[key].localId);
      sendResponse({}); // send empty response to trigger call back
      return;
    }
  }
  
  const reload = {
    reload_known_words: {set : knownWords, localId : "userKnownWords"},
    reload_learning_words: {set : learningWords, localId : "userLearningWords"},
    reload_wanted_words: {set : wantedWords, localId : "userWantedWords"},
    reload_skipped_words: {set : skippedWords, localId : "userSkippedWords"},
  };
  for(const key in reload){
    if (message.type === key) {
      reload[key].set.clear();
      loadFromLocal(reload[key].set, reload[key].localId);
      return;
    }
  }
   
  const _delete = {
    delete_known: {set : knownWords, localId : "userKnownWords"},
    delete_learning: {set : learningWords, localId : "userLearningWords"},
    delete_wanted: {set : wantedWords, localId : "userWantedWords"},
    delete_skipped: {set : skippedWords, localId : "userSkippedWords"},
  };
  for(const key in _delete){
    if (message.type === key) {
      _delete[key].set.clear();
      setToLocal(_delete[key].set, _delete[key].localId);
      sendResponse({}); // send empty response to trigger call back
      return;
    }
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