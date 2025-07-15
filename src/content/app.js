import { learning_words, known_words, _tokenizer, navType, showBorder } from './tokenizer';
import { tryObserve } from './subs_utils';
import { editElementRecursively } from './text_utils';

let spanChildren = [];
let child_over = null;
let keysPressed = new Set();

loadWordList("known", '/known.txt');
loadWordList("learning", '/learning.txt');

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
      console.log("Saving", child_over.dataset.base);
      known_words.add(child_over.dataset.base);
      setToLocal();
    }
    return;
  }
  if (keysPressed.has('alt') && keysPressed.has('!')) {
    if(child_over != undefined) {
      showBorder(child_over);
    }
    return;
  }
  if (keysPressed.has('alt') && keysPressed.has('backspace')){
    removeLocal();
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
  console.log("*-* Message received", message.type)
  if (message.type === "require_words") {
    console.log("*-* Require received !", known_words);
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
    for(let word of wordList){
      known_words.add(word);
    }
    console.log(`*-* ${known_words.size} words localy loaded`);
  });
}
function setToLocal(){
  chrome.storage.local.set({ userWords: Array.from(known_words) }, () => {
  });
}
function removeLocal(){
  chrome.storage.local.remove("userWords", () => {
    console.log("*-* Removed local storage for userWords.")
  });
}
function countLocal(){
  chrome.storage.local.get("userWords", (result) => {
    const wordList = result.userWords || [];
    console.log("*-* In local : ", wordList);
    console.log("*-* In client : ", known_words);
  });
}

async function loadWordText(text, type = "known"){
  const words = text.split('\n');
  console.log(`Text with ${words.length} words given !`)
  if(type == "known"){
    for(let word of words){
      known_words.add(word);
    }
  }else{
    for(let word of words){
      learning_words.add(word);
    }
  }
}

async function loadWordList(type, url) {
  const url_ext = chrome.runtime.getURL(url);
  const response = await fetch(url_ext);
  const text = await response.text();
  loadWordText(text, type)
  if(type == "known"){
    console.log(`*-* ${known_words.size} words loaded`);
    loadFromLocal();
  }else{
    console.log(`*-* ${learning_words.size} words loaded`);
  }
}


if (navType) {
  tryObserve();
}