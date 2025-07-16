import kuromoji from 'kuromoji'

export let _tokenizer = null;
export let knownWords = new Set();
export let learningWords = new Set();
export let wantedWords = new Set();
export let skippedWords = new Set();
export let settings = {
  "known_color" : false, "learning_color" : true, "wanted_color" : true, "missing_color" : true, "particles_color" : false, 
  "adverbs_skip" : false, "interjections_skip" : true, "symbols_skip" : true, "numbers_skip" : false, "katakanas_skip" : false
};

/**
 * @typedef {Object} KuromojiToken
 * @property {number} word_id
 * @property {string} word_type
 * @property {number} word_position
 * @property {string} surface_form
 * @property {string} pos
 * @property {string} pos_detail_1
 * @property {string} pos_detail_2
 * @property {string} pos_detail_3
 * @property {string} conjugated_type
 * @property {string} conjugated_form
 * @property {string} basic_form
 * @property {string} reading
 * @property {string} pronunciation
 */
kuromoji.builder({ dicPath: chrome.runtime.getURL('dict') }).build((err, builtTokenizer) => {
  if (err) throw err;
  _tokenizer = builtTokenizer;
  console.log("*-* Color subs loaded !")
});

/**
 * Checks if the given string is only made of katakanas.
 *
 * @param {string} str - The string to check.
 * @returns {boolean} True if contains only katakanas else false.
 */
function isKatakana(str) {
  return /^[\u30A0-\u30FF]+$/.test(str);
}

/**
 * Checks a token can be seen as a verb. 
 *
 * @param {KuromojiToken} token - The token to check.
 * @returns {number} Returns 0 if it is not a verb, 2 if it is a verb or an auxiliary verb, 1 is there is a doubt or a need to stop the verb strike after this token.
 */
function isVerb(token){
  if(token.pos == "動詞" || token.pos == "助動詞"){
    // (IN ORDER) verb, bound auxiliary verb
    return 2;
  }else if(token.pos_detail_1 == "サ変接続" || token.basic_form == "て"){
    // (IN ORDER) irregular conjugation with suru, te is a particul not a verb but can be a suffix for a verb
    return 1;
  }else{
    return 0;
  }
}

/**
 * Checks a token can be seen as an adjective. 
 *
 * @param {KuromojiToken} token - The token to check.
 * @returns {number} Returns 0 if it is not a verb, 2 if it is an adjective. (2 is here to keep coherence with isVerb function results)
 */
function isAdjective(token){
  if(token.pos == "形容詞"){
    // adjective
    return 2;
  }else{
    return 0;
  }
}

/**
 * Uses word attributes to check if it should be skipped.
 *
 * @param {string} pos - The pos parameter of a KuromojiToken. (For number it is pos_detail_1 but it is not very important)
 * @param {string} base - The basic_form parameter of a KuromojiToken.
 * @returns {string} Returns "skip" if it should be skipped, else "".
 */
export function isSkipped(pos, base){
  if(skippedWords.has(base)){ // base in skip set
    return "skip";
  }
  if(base == "*"){ // non-japanese caracters
    return "skip";
  }
  if((settings["symbols_skip"] && pos == "記号") || (settings["interjections_skip"] && pos == "感動詞") 
    || (settings["adverbs_skip"] && pos == "副詞") || (settings["numbers_skip"] && pos == "数")
    || (settings["katakanas_skip"] && isKatakana(base))){
    // (IN ORDER) symbol, interjection, adverbs, numbers or katakana as well as their settings on true
    return "skip";
  }
  return "";
}

/**
 * Computes the color for the given word attributes.
 *
 * @param {string} pos - The pos parameter of a KuromojiToken. (For number it is pos_detail_1 but it is not very important)
 * @param {string} base - The basic_form parameter of a KuromojiToken.
 * @param {string} baseColor - The default color to use.
 * @returns {string} Returns the color if it fits in a certain category and its settings is on true else the base color.
 */
export function whatColor(pos, base, baseColor){
  if(pos == "助詞"){ // particle
    return (settings["particles_color"]) ? "#42c8f5" : baseColor;
  }else if(knownWords.has(base)){
    return (settings["known_color"]) ? "#02d802" : baseColor;
  }else if(learningWords.has(base)){
    return (settings["learning_color"]) ? "#faed75" : baseColor;
  }else if(wantedWords.has(base)){
    return (settings["wanted_color"]) ? "#f442b8ff" : baseColor;
  }
  return (settings["missing_color"]) ? "#ff0000ff" : baseColor;
}

/**
 * Complexe function that use both tokenization from Kuromoji and reassociation based on arbitrary rules to segment and color a sentence.
 *
 * @param {KuromojiToken[]} tokens - The sentence divided into tokens using Kuromoji.
 * @param {number} index - Only used for netflix (might be deleted later) to add <br> at the start of the result.
 * @param {string} baseColor - The default color to use.
 * @returns {string} Returns the sentence segmented using <ruby> tag with different attributes such as style (color), data-tag, data-base, ...
 */
export function editText(tokens, index, baseColor = "white"){
  let ret = (index == 0) ? "" : "<br>";
  let tmp = ""; // used for the current tokens streak
  let isParenthesisOpen = false;
  let isParenthesisClose = false;
  let is_verb = 0; // 0 is not, 1 is maybe (sahen or tari form), 2 is yes
  let is_adjective = 0; // 0 is not, 2 is yes
  // different attributes that will be set for the ruby tag
  let base = "";
  let tag = "";
  let color = "";
  let pos = "";
  for(let i = 0; i < tokens.length; i++){
    if(tokens[i] == undefined){ // problem during tokenization
      continue;
    }
    tmp += tokens[i].surface_form;
    if(tokens[i].pos == "接頭詞"){ // prefix
      continue;
    }
    // start of a new case
    if(is_verb == 0 && is_adjective == 0 && isParenthesisOpen == false && isParenthesisClose == false){ 
      base = tokens[i].basic_form;
      pos = (tokens[i].pos_detail_1 == "数") ? tokens[i].pos_detail_1 : tokens[i].pos;
      color = whatColor(pos, base, baseColor);
      tag = isSkipped(pos, base);
    }
    // different flags
    isParenthesisOpen = isParenthesisOpen || (tokens[i].pos_detail_1 == "括弧開" && tokens[i].surface_form != "「"); // opened parenthesis
    isParenthesisClose = tokens[i].pos_detail_1 == "括弧閉"; // closed parenthesis
    is_verb = isVerb(tokens[i]);
    is_adjective = isAdjective(tokens[i]);
    if(isParenthesisClose){
      isParenthesisOpen = false;
    }
    if(isParenthesisOpen){
      tag = "skip";
      continue;
    }
    // verb tokenization can be very complex (ex : nondeiru [I am drinking] is divided into non - de - iru so we need to maintain a streak of verbs to get nondeiru as only on token)
    if(is_verb == 1  && i != tokens.length - 1){ // either end of a streak or uncertain if it is a verb or not
      if(tokens[i + 1].basic_form == "する"){
        // temporary verb and next token is suru
        is_verb = 2;
        continue;
      }
    }
    if(is_verb == 2 && i != tokens.length - 1){ // verb for sure
      if((tokens[i].conjugated_form == "連用タ接続" || tokens[i].conjugated_form == "連用形") && tokens[i + 1].basic_form == "て"){
        // (IN ORDER) continuous use, continuous form
        continue;
      }
      if((tokens[i + 1].pos == "助動詞" && tokens[i + 1].basic_form != "です") || (tokens[i + 1].pos == "動詞" && tokens[i + 1].pos_detail_1 == "非自立") || tokens[i + 1].pos_detail_1 == "接尾"){
        // (IN ORDER) bound auxialary, not indenpendants verbs, suffix
        continue;
      }
      if(tokens[i + 1].pos_detail_1 == "並立助詞"){
        // parrel verbs (itari form) => end of the verb streak
        is_verb = 1;
        continue;
      }
    }
    // same thing for adjectives
    if(is_adjective == 2 && i != tokens.length - 1){
      if(tokens[i + 1].pos == "助動詞" && tokens[i + 1].basic_form != "です"){
        // bound auxialary other than desu
        continue;
      }
    }
    if(tag == "skip"){
      color = baseColor;
    }
    ret += `<ruby data-base="${base}" data-pos="${pos}" data-tag="${tag}" data-bc="${baseColor}" style="color : ${color}">${tmp}</ruby>`;
    // reset of all the flags
    tmp = "";
    base = "";
    tag = "";
    pos = "";
    is_verb = 0;
    is_adjective = 0;
    isParenthesisClose = false;
    isParenthesisOpen = false;
  }
  return ret;
}

/**
 * Basic function that changes the innerHtml of an element without watching for child
 *
 * @param {HTMLElement} element - The HTML element.
 * @param {number} index - Only used for netflix (might be deleted later) to add <br> at the start of the result.
 * @returns {string} Returns the sentence segmented using <ruby> tag with different attributes such as style (color), data-tag, data-base, ...
 */
export function editBase(element, index){
  const tokens = _tokenizer.tokenize(element.textContent);
  element.innerHTML = editText(tokens, index);
  return
}

/**
 * Toggles a border around a given element. (Helps to see the tokenization)
 *
 * @param {HTMLElement} element - The HTML element.
 * @returns {undefined} Applies or removes the border of the element.
 */
export function showBorder(element){
  if(element.style.border == ""){
    element.style.border = "1px solid red";
  }else{
    element.style.border = "";
  }
}