import kuromoji from 'kuromoji'

let tokenizer = null;

kuromoji.builder({ dicPath: chrome.runtime.getURL('dict') }).build((err, builtTokenizer) => {
  if (err) throw err;
  
  tokenizer = builtTokenizer;
  const tokens = tokenizer.tokenize("思い出す機会があって");
  console.log(tokens);
  console.log(tokens[0])
  console.log("*-* Color subs loaded !")
});

function katakanaToHiragana(str) {
  return str.replace(/[\u30A1-\u30F6]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60)
  );
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

function editText(tokens){
  let ret = "";
  let base = "";
  let tmp = "";
  let is_parenthesis_open = false;
  let is_parenthesis_close = false;
  let is_verb = 0; // 0 is not, 1 is maybe (sahen), 2 is yes
  let tag = "";
  for(let i = 0; i < tokens.length; i++){
    if(tokens[i] == undefined){
      continue;
    }
    if(tokens[i].reading == undefined){
      ret += `<ruby data-base="${tokens[i].surface_form}" data-tag="skip" style="border: solid 1px red;">${tokens[i].surface_form}</ruby>`;
      continue;
    }
    tmp += tokens[i].surface_form;
    if(is_verb == 0 && is_parenthesis_open == 0 && is_parenthesis_close == 0){
      base = tokens[i].basic_form;
    }
    if(tokens[i].pos == "記号"){
      tag = "skip";
    }
    is_parenthesis_open = is_parenthesis_open || tokens[i].pos_detail_1 == "括弧開";
    is_parenthesis_close = tokens[i].pos_detail_1 == "括弧閉";
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
      if(tokens[i + 1].pos == "助動詞"){
        continue;
      }
      is_verb = 0;
    }
    ret += `<ruby data-base="${base}" data-tag="${tag}" style="border: solid 1px red;">${tmp}</ruby>`;
    tmp = "";
    base = "";
    tag = ""
  }
  return ret;
}

function editBase(element){
    const tokens = tokenizer.tokenize(element.textContent);
    element.innerHTML = editText(tokens);
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
  let current_content = "";

  if (target) {
    console.log("*-* Found the subs !")
    observeNetflixElement(selector, (mutation) => {
      const subdiv = mutation.target.querySelector(".player-timedtext-text-container");
      if(!subdiv){
        console.log("No div subs..");
        return;
      }
      const span_parent = subdiv.querySelector("span");
      if(!span_parent){
        console.log("No parent span..");
        return;
      }
      span_parent.addEventListener('click', (event) => {
        event.stopPropagation();
        console.log("Clic détecté sur :", event.target); // le plus profond
      });
      const spanChildren = span_parent.querySelectorAll("span");
      if(spanChildren.length == 0){
        console.log("No span subs..");
        return
      }
      for(let span of spanChildren){
        if(span.lang != "ja"){
          continue;
        }
        editBase(span);
        console.log("Changement détecté :", span.textContent);
      }
    });
  } else {
    setTimeout(tryObserve, 1000);
  }
};

tryObserve();
