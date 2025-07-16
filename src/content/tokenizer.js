import kuromoji from 'kuromoji'

export let _tokenizer = null;
export let learning_words = new Set();
export let known_words = new Set();
export let wanted_words = new Set();
export let skipped_words = new Set();
export let settings = {
  "known_color" : false, "learning_color" : true, "wanted_color" : true, "missing_color" : true, "particles_color" : false, 
  "adverbs_skip" : false, "interjections_skip" : true, "symbols_skip" : true, "numbers_skip" : false, "katakanas_skip" : false
};

kuromoji.builder({ dicPath: chrome.runtime.getURL('dict') }).build((err, builtTokenizer) => {
  if (err) throw err;
  _tokenizer = builtTokenizer;
  console.log("*-* Color subs loaded !")
});

function isKatakana(str) {
  return /^[\u30A0-\u30FF]+$/.test(str);
}

function isVerb(token){
  if(token.pos == "動詞" || token.pos == "助動詞"){
    // verb, bound auxiliary verb
    return 2;
  }else if(token.pos_detail_1 == "サ変接続" || token.basic_form == "て"){
    // irregular conjugation with suru, te is a particul not a verb but can be a suffix for a verb
    return 1;
  }else{
    return 0;
  }
}

function isAdjective(token){
  if(token.pos == "形容詞"){
    // adjective
    return 2;
  }else{
    return 0;
  }
}

export function isSkipped(pos, base){
  if(skipped_words.has(base)){
    return "skip";
  }
  if(base == "*"){
    return "skip" // not japanese caracter
  }
  if((settings["symbols_skip"] && pos == "記号") || (settings["interjections_skip"] && pos == "感動詞") 
    || (settings["adverbs_skip"] && pos == "副詞") || (settings["numbers_skip"] && pos == "数")
    || (settings["katakanas_skip"] && isKatakana(base))){
    // symbol, interjection, adverbs
    return "skip";
  }
  return "";
}

export function whatColor(pos, base, baseColor){
  if(pos == "助詞"){ // particle
    return (settings["particles_color"]) ? "#42c8f5" : baseColor;
  }else if(known_words.has(base)){
    return (settings["known_color"]) ? "#02d802" : baseColor;
  }else if(learning_words.has(base)){
    return (settings["learning_color"]) ? "#faed75" : baseColor;
  }else if(wanted_words.has(base)){
    return (settings["wanted_color"]) ? "#f442b8ff" : baseColor;
  }
  return (settings["missing_color"]) ? "#ff0000ff" : baseColor;
}

export function editText(tokens, index, baseColor = "white"){
  let ret = (index == 0) ? "" : "<br>";
  let base = "";
  let tmp = "";
  let is_parenthesis_open = false;
  let is_parenthesis_close = false;
  let is_verb = 0; // 0 is not, 1 is maybe (sahen or tari form), 2 is yes
  let is_adjective = 0; // 0 is not, 2 is yes
  let tag = "";
  let color = "";
  let pos = "";
  for(let i = 0; i < tokens.length; i++){
    if(tokens[i] == undefined){
      continue;
    }
    tmp += tokens[i].surface_form;
    if(tokens[i].pos == "接頭詞"){
      // prefix
      continue;
    }
    if(is_verb == 0 && is_adjective == 0 && is_parenthesis_open == false && is_parenthesis_close == false){ // start of a new case
      base = tokens[i].basic_form;
      pos = (tokens[i].pos_detail_1 == "数") ? tokens[i].pos_detail_1 : tokens[i].pos;
      color = whatColor(pos, base, baseColor);
      tag = isSkipped(pos, base);
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
    if(is_verb == 1  && i != tokens.length - 1){
      if(tokens[i + 1].basic_form == "する"){
        // temporary verb and next token is suru
        is_verb = 2;
        continue;
      }
    }
    if(is_verb == 2 && i != tokens.length - 1){
      if((tokens[i].conjugated_form == "連用タ接続" || tokens[i].conjugated_form == "連用形") && tokens[i + 1].basic_form == "て"){
        // continuous use, continuous form
        continue;
      }
      if((tokens[i + 1].pos == "助動詞" && tokens[i + 1].basic_form != "です") || (tokens[i + 1].pos == "動詞" && tokens[i + 1].pos_detail_1 == "非自立") || tokens[i + 1].pos_detail_1 == "接尾"){
        // bound auxialary, not indenpendants verbs, suffix
        continue;
      }
      if(tokens[i + 1].pos_detail_1 == "並立助詞"){
        is_verb = 1;
        continue;
      }
      is_verb = 0;
    }
    if(is_adjective != 0 && i != tokens.length - 1){
      if(tokens[i + 1].pos == "助動詞" && tokens[i + 1].basic_form != "です"){
        // bound auxialary other than desu
        continue;
      }
      is_adjective = 0;
    }
    if(tag == "skip"){
      color = baseColor;
    }
    ret += `<ruby data-base="${base}" data-pos="${pos}" data-tag="${tag}" data-bc="${baseColor}" style="color : ${color}">${tmp}</ruby>`;
    tmp = "";
    base = "";
    tag = "";
    pos = "";
    is_verb = 0;
    is_adjective = 0;
    is_parenthesis_close = false;
    is_parenthesis_open = false;
  }
  return ret;
}

export function editBase(element, index){
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