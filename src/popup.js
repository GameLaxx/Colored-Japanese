let localWords = {
  "known" : [],
  "learning" : [],
  "wanted" : [],
  "skipped" : []
};

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
document.getElementById("save_learning_btn").addEventListener("click", function () {
  getWordList("require_learning_words", "learning.txt")
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
      chrome.tabs.sendMessage(activeTabId, { type: messageId, text : content }, (response) => {
        loadDictionary(`user${capitalize(messageId.split("_")[1])}Words`, true);
      });
    });
  };
  reader.readAsText(file); // will call reader.onload
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
document.getElementById('load_skipped_btn').addEventListener('change', (event) => {
  setWordList("send_skipped_words", event);
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

function deleteAllWords(event) {
  if(!confirm("Do you want to delete every word from this list ?")){
    return;
  }
  const htmlId = event.target.id.split("_")[2];    
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTab = tabs[0];
    const activeTabId = activeTab.id;
    chrome.tabs.sendMessage(activeTabId, { type: "delete_" + htmlId}, (response) => {
      loadDictionary(`user${capitalize(htmlId)}Words`, true);
    });
  });
}

function updateLocalStorage(event){
  if (!event.target.classList.contains("delete_btn")) {
    return
  }
  const wordDiv = event.target.closest(".word");
  const wordText = wordDiv.querySelector(".word_string").textContent.trim();
  const tag = wordDiv.closest(".dictionary").dataset.tag;
  const titleH2 = wordDiv.closest(".subtool").querySelector(".title h2");
  if (!tag) {
    return;
  }
  chrome.storage.local.get(tag, (result) => {
    let words = result[tag] || [];
    const newWords = words.filter(w => w !== wordText);
    localWords[localIdToHtmlId(tag)] = newWords;
    titleH2.innerText = titleH2.innerText.split("(")[0] + `(${newWords.length})`;
    chrome.storage.local.set({ [tag]: newWords }, () => {
      wordDiv.remove();
    });
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      const activeTabId = activeTab.id;
      chrome.tabs.sendMessage(activeTabId, { type: `reload_${localIdToHtmlId(tag)}_words` }, (res) => {
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

function updateFindBox(event){
  const htmlId = event.target.id.split("_")[1];
  event.target.nextElementSibling.classList.toggle("false", !localWords[htmlId].includes(event.target.value));
}

function loadDictionary(id_str, reload = false){
  const htmlId = localIdToHtmlId(id_str);
  const pannel = document.getElementById(htmlId + "_tools");
  updateTarget(pannel, subtools, "show");
  const dictionary = pannel.getElementsByClassName("dictionary")[0];
  if(dictionary && (dictionary.dataset.tag == undefined || reload)){
    if(reload){
      dictionary.innerHTML = "Your current known words"; // delete all childs
    }else{
      dictionary.dataset.tag = id_str;
    }
    chrome.storage.local.get(id_str, (result) => {
      const wordList = result[id_str] || [];
      localWords[htmlId] = wordList;
      const title = pannel.querySelector(".title h2");
      if(reload){
        title.innerText = title.innerText.split("(")[0] + `(${wordList.length})`;
      }else{
        title.innerText = title.innerText + ` (${wordList.length})`;
        const allDeleteBtn = pannel.querySelector("#delete_all_" + htmlId);
        allDeleteBtn.addEventListener("click", (event) => deleteAllWords(event)); 
        const findInput = document.getElementById("find_" + htmlId);
        findInput.addEventListener("input", (event) => updateFindBox(event));
      }
      for(let word of wordList){
        const newWord = document.createElement("div");
        newWord.classList.toggle("word");
        const newText = document.createElement("p");
        newText.classList.toggle("word_string");
        const newBtn = document.createElement("div");
        newBtn.classList.toggle("delete_btn");
        newBtn.addEventListener("click", (event) => updateLocalStorage(event));
        newText.textContent = word;
        newWord.append(newText);
        newWord.append(newBtn);
        dictionary.append(newWord);
      }
    }); 
  }else if(htmlId === "settings"){
    chrome.storage.local.get("settings", (result) => {
      const localSettings = result["settings"] || {};
      for(let key in localSettings){
        document.getElementById(key).checked = localSettings[key];
      }
    });
  }
}

loadDictionary("userKnownWords");