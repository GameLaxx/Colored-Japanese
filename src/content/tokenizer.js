import kuromoji from 'kuromoji'

export const navType = window.location.hostname.includes("netflix."); // true means on netflix, false else

export let _tokenizer = null;
export let learning_words = new Set();
export let known_words = new Set();

kuromoji.builder({ dicPath: chrome.runtime.getURL('dict') }).build((err, builtTokenizer) => {
  if (err) throw err;
  _tokenizer = builtTokenizer;
  console.log("*-* Color subs loaded !")
});

function isVerb(token){
  if(token.pos == "動詞" || token.pos == "助動詞"){
    // verb, auxiliary verb
    return 2;
  }else if(token.pos_detail_1 == "サ変接続" || token.basic_form == "て"){
    // irregular conjugation with suru, te is a particul not a verb
    return 1;
  }else{
    return 0;
  }
}

function isAdjective(token){
  if(token.pos == "形容詞"){
    // ajdective
    return 2;
  }else{
    return 0;
  }
}

export function editText(tokens, index, baseColor = "white"){
  let ret = (index == 0) ? "" : "<br>";
  let base = "";
  let tmp = "";
  let is_parenthesis_open = false;
  let is_parenthesis_close = false;
  let is_verb = 0; // 0 is not, 1 is maybe (sahen), 2 is yes
  let is_adjective = 0; // 0 is not, 2 is yes
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
    if(is_verb == 0 && is_adjective == 0 && is_parenthesis_open == false && is_parenthesis_close == false){ // start of a new case
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
        color = baseColor;
      }
    }
    if(tokens[i].pos == "記号" || tokens[i].pos == "感動詞" || tokens[i].pos == "連体詞" || (is_verb + is_adjective == 0 && tokens[i].pos == "助動詞")){
      // symbol, interjection, pre-noun adjectives, bound auxialary when not a verb
      tag = "skip";
    }
    is_parenthesis_open = is_parenthesis_open || (tokens[i].pos_detail_1 == "括弧開" && tokens[i].surface_form != "「"); // opened parenthesis
    is_parenthesis_close = tokens[i].pos_detail_1 == "括弧閉"; // closed parenthesis
    is_verb = isVerb(tokens[i]);
    is_adjective = isAdjective(tokens[i]);
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
      if((tokens[i].conjugated_form == "連用タ接続" || tokens[i].conjugated_form == "連用形") && tokens[i + 1].basic_form == "て"){
        // continuous use, continuous form
        continue;
      }
      if(tokens[i + 1].pos == "助動詞" || (tokens[i + 1].pos == "動詞" && tokens[i + 1].pos_detail_1 == "非自立") || tokens[i + 1].pos_detail_1 == "接尾"){
        // bound auxialary, not indenpendants verbs, suffix
        continue;
      }
      is_verb = 0;
    }
    if(is_adjective != 0 && i != tokens.length - 1){
      if(tokens[i + 1].pos == "助動詞"){
        // bound auxialary
        continue;
      }
      is_adjective = 0;
    }
    if(tag == "skip"){
      color = baseColor;
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

export function editBase(element){
  const tokens = _tokenizer.tokenize(element.textContent);
  element.innerHTML = editText(tokens, index);
  return
}

export function showBorder(element){
  if(element.style.border == ""){
    element.style.border = "1px solid red";
  }else{
    element.style.border = "";
  }
}