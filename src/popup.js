function getWordList(messageId, fileOuput){
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTab = tabs[0];
    const activeTabId = activeTab.id;
    chrome.tabs.sendMessage(activeTabId, { type: messageId }, (response) => {
      if (chrome.runtime.lastError) {
        alert("Error sending message to content script:" + JSON.stringify(chrome.runtime.lastError));
        return;
      }
      if (response && response.text) {
        const blob = new Blob([response.text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
          url: url,
          filename: fileOuput,
          saveAs: true
        });
      } else {
        alert("No response or text received from content script.");
      }
    });
  });
}

document.getElementById("save_known_btn").addEventListener("click", function () {
  getWordList("require_known_words", "known.txt")
});
document.getElementById("save_learn_btn").addEventListener("click", function () {
  getWordList("require_learn_words", "learn.txt")
});
document.getElementById("save_wanted_btn").addEventListener("click", function () {
  getWordList("require_wanted_words", "wanted.txt")
});

function setWordList(messageId, event){
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    const content = reader.result;  
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      const activeTabId = activeTab.id;
      chrome.tabs.sendMessage(activeTabId, { type: messageId, text : content });
    });
  };
  reader.readAsText(file);
}

document.getElementById('load_known_btn').addEventListener('change', (event) => {
  setWordList("send_known_words", event);
});
document.getElementById('load_learning_btn').addEventListener('change', (event) => {
  setWordList("send_learning_words", event);
});
document.getElementById('load_wanted_btn').addEventListener('change', (event) => {
  setWordList("send_wanted_words", event);
});

const submenus = document.querySelectorAll(".submenu");
const subtools = document.querySelectorAll(".subtool");
document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
  checkbox.addEventListener('change', (event) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      const activeTabId = activeTab.id;
      chrome.tabs.sendMessage(activeTabId, { type: "settings_update", key : event.target.id, value : event.target.checked });
    });
  });
});

function capitalize(str) {
  if (!str) return "";
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}

submenus.forEach(submenu => {
  submenu.addEventListener("click", () => {
    updateTarget(submenu, submenus, "target");
    loadDictionary(`user${capitalize(submenu.id)}Words`)
  });
});

function updateTarget(clickedElement, otherElementList, className) {
  otherElementList.forEach(other => {
    other.classList.toggle(className, other === clickedElement);
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
  if(id_str == "userKnownWords"){
    return "known"
  }
  if(id_str == "userLearningWords"){
    return "learning"
  }
  if(id_str == "userWantedWords"){
    return "wanted"
  }
  if(id_str == "userSkippedWords"){
    return "skipped"
  }
  return "settings"
}

function loadDictionary(id_str){
  const pannel = document.getElementById(localIdToHtmlId(id_str) + "_tools");
  updateTarget(pannel, subtools, "show");
  const dictionary = pannel.getElementsByClassName("dictionary")[0];
  if(dictionary && dictionary.dataset.tag == undefined){
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
  }else if(localIdToHtmlId(id_str) === "settings"){
    chrome.storage.local.get("settings", (result) => {
      const localSettings = result["settings"] || {"known_color" : false, "missing_color" : false, "particles_color" : false, "adverbs_skip" : false};
      for(let key in localSettings){
        document.getElementById(key).checked = localSettings[key];
      }
    });
  }
}

loadDictionary("userKnownWords");