import { editText, _tokenizer } from "./tokenizer";

/**
 * Checks if the given string contains kanji.
 *
 * @param {string} str - The string to check.
 * @returns {boolean} True if it contains kanjis else false.
 */
function containsKanji(text) {
  return /[\u4E00-\u9FFF]/.test(text);
}

/**
 * Recursively edit the element, thus changing its child without deleting them.
 *
 * @param {HTMLElement} element - The element to change.
 * @returns {void} Changes the element in place using the {@link editText} function.
 */
export function editElementRecursively(element, baseColor = "black") {
  if (!_tokenizer) return;
  if (element.nodeType === Node.TEXT_NODE) { // pure text
    const text = element.textContent;
    if (!containsKanji(text)){ // no kanjis so no need to parse
      return;
    }

    const tokens = _tokenizer.tokenize(text);
    const html = editText(tokens, 0, baseColor); // get the new html

    const wrapper = document.createElement("span");
    wrapper.innerHTML = html;

    element.replaceWith(...wrapper.childNodes); // replace the current html element with what was made
    return;
  }
  if (element.nodeType === Node.ELEMENT_NODE) { // html element that contains more than just text
    if(element.dataset.colorProcessed === "true"){ // if already processed than skip thus avoiding unneeded parsing
      return;
    }
    const children = Array.from(element.childNodes);
    for (const child of children) {
      editElementRecursively(child, element.style.color);
    }
    element.dataset.colorProcessed = true;
  }
}