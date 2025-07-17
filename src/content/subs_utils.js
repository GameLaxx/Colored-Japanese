import { editBase } from "./tokenizer";

export let spanChildren = [];

function observeElement(selector, callback) {
  const targetNode = document.querySelector(selector);
  if (!targetNode) {
    console.log("*-* Element not found..", selector);
    return;
  }
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList" || mutation.type === "characterData") {
        callback(mutation);
      }else{
        console.log(mutation);
      }
    }
  });
  observer.observe(targetNode, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  console.log("*-* Watching mutation for :", targetNode);
}

export const tryObserveNetflix = () => {
  const selector = ".player-timedtext";
  const target = document.querySelector(selector);
  if (target) {
    console.log("*-* Found the netflix subs !")
    observeElement(selector, (mutation) => {
      // the netflix subtitles are constantly destroyed then added again
      // the closest parent that does not is a div with the class player-timedtext
      // from this parent, we should get a first div than a span that contains all the subs currently shown
      // each sub is in its own span
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
      }
    });
  } else {
    setTimeout(tryObserveNetflix, 1000); // as long as the parent div is not found, keep trying to find it later
  }
};

export const tryObserveYoutube = () => {
  const selector = ".ytp-caption-window-container";
  const target = document.querySelector(selector);
  if (target) {
    console.log("*-* Found the youtube subs !")
    observeElement(selector, (mutation) => {
      spanChildren = mutation.target.querySelectorAll(".ytp-caption-segment");
      if(spanChildren.length == 0){
        return
      }
      for(let i = 0; i < spanChildren.length; i++){
        editBase(spanChildren[i], i);
      }
    });
  } else {
    setTimeout(tryObserveYoutube, 1000); // as long as the parent div is not found, keep trying to find it later
  }
};