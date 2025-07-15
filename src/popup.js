document.getElementById("save_known_btn").addEventListener("click", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTab = tabs[0];
    const activeTabId = activeTab.id;
    chrome.tabs.sendMessage(activeTabId, { type: "require_words" }, (response) => {

      if (chrome.runtime.lastError) {
        console.error("Error sending message to content script:", chrome.runtime.lastError);
        return;
      }

      if (response && response.text) {
        const blob = new Blob([response.text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
          url: url,
          filename: "known.txt",
          saveAs: true
        });
      } else {
        console.error("No response or text received from content script.");
      }

    });
  });
});

document.getElementById('load_known_btn').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function () {
    const content = reader.result;  
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      const activeTabId = activeTab.id;
      chrome.tabs.sendMessage(activeTabId, { type: "send_words", text : content });
    });
  };

  reader.readAsText(file);
});

const submenus = document.querySelectorAll(".submenu");
const subtools = document.querySelectorAll(".subtool");

submenus.forEach(submenu => {
  submenu.addEventListener("click", () => {
    updateTarget(submenu);
  });
});

function updateTarget(clickedElement) {
  submenus.forEach(submenu => {
    submenu.classList.toggle("target", submenu === clickedElement);
  });
}

function updateLocalStorage(event){
  if (!event.target.classList.contains("delete_word")) {
    return
  }
  const wordDiv = event.target.closest(".word");
  const wordText = wordDiv.querySelector(".word_string").textContent.trim();
  const tag = wordDiv.closest(".dictionary").dataset.tag;
  if (!tag) {
    return;
  }
  chrome.storage.local.get(tag, (result) => {
    let words = result[tag] || [];
    const newWords = words.filter(w => w !== wordText);
    chrome.storage.local.set({ [tag]: newWords }, () => {
      wordDiv.remove();
    });
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      const activeTabId = activeTab.id;
      chrome.tabs.sendMessage(activeTabId, { type: "reload_words" }, (res) => {
        true;
      });
    });
  });
}

function localIdToHtmlId(id_str){
  if(id_str == "userWords"){
    return "known_tools"
  }
  return "known_tools"
}

function loadDictionary(id_str){
  const pannel = document.getElementById(localIdToHtmlId(id_str));
  const dictionary = pannel.getElementsByClassName("dictionary")[0];
  dictionary.dataset.tag = id_str;
  chrome.storage.local.get(id_str, (result) => {
    const wordList = result[id_str] || [];
    for(let word of wordList){
      const newWord = document.createElement("div");
      newWord.classList.toggle("word");
      const newText = document.createElement("p");
      newText.classList.toggle("word_string");
      const newBtn = document.createElement("div");
      newBtn.classList.toggle("delete_word");
      newBtn.addEventListener("click", (event) => updateLocalStorage(event));
      newText.textContent = word;
      newWord.append(newText);
      newWord.append(newBtn);
      dictionary.append(newWord);
    }
  }); 
}

loadDictionary("userKnownWords");