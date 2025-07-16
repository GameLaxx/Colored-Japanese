import { editBase } from "./tokenizer";

export let spanChildren = [];

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

export const tryObserve = () => {
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
        // console.log("Changement détecté :", spanChildren[i].textContent);
      }
    });
  } else {
    setTimeout(tryObserve, 1000);
  }
};