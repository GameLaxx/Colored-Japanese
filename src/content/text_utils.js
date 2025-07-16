import { editText, _tokenizer } from "./tokenizer";

function containsKanji(text) {
  return /[\u4E00-\u9FFF]/.test(text);
}

export function editElementRecursively(element, baseColor = "black") {
  if (!_tokenizer) return;
  if (element.nodeType === Node.TEXT_NODE) { // pure text
    const text = element.textContent;
    if (!containsKanji(text)){
      return;
    }

    const tokens = _tokenizer.tokenize(text);
    const html = editText(tokens, 0, baseColor);

    const wrapper = document.createElement("span");
    wrapper.innerHTML = html;

    element.replaceWith(...wrapper.childNodes);
    return;
  }
  if (element.nodeType === Node.ELEMENT_NODE) { // html element that contains more than just text
    if(element.dataset.colorProcessed === "true"){
      return;
    }
    const children = Array.from(element.childNodes);
    for (const child of children) {
      editElementRecursively(child, element.style.color);
    }
    element.dataset.colorProcessed = true;
  }
}