"use strict";
let urlField = document.getElementById("url");
let apiField = document.getElementById("apikey");
let successAlert = document.getElementById("success");
let failureAlert = document.getElementById("failure");
let voiceField = document.getElementById("voice");
let saveButton = document.getElementById("save");
let defaultVoice = "en-US_EmilyV3Voice";

async function save(e) {
  saveButton.value = "Loading...";
  e.preventDefault();
  //Authenticate against IBM
  let iamUrl = "https://iam.cloud.ibm.com/identity/token"
  let params = {
    grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
    apikey: apiField.value
  }
  let headers = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded"
  }
  let response = await fetch(iamUrl, {
    method: "POST",
    headers: headers,
    body: new URLSearchParams(params)
  });
  let data = await response.json();
  //Store data to browser storage
  browser.storage.local.set({
    url: urlField.value,
    apikey: apiField.value,
    access_token: data.access_token,
    expiration: data.expiration,
    voice: voiceField.value,
  });
  if (response.ok && !voiceField.hasChildNodes()) {
    generateVoiceOptions();
    voiceField.disabled = false;
  }
  alertUser(response.ok);
  saveButton.value = "Save";
}

async function getVoiceList() {
  //Get list of available voices and their properties.
  let credentials = await browser.storage.local.get(["url", "access_token"]);
  let response = await fetch(credentials.url + "/v1/voices", {
    headers: { Authorization: "Bearer " + (await credentials.access_token) },
  });
  let data = await response.json();
  //Filter for v3, english voices, and then sort alphabetically.
  let voices = data.voices;
  voices = voices
    .filter((item) => item.language.startsWith("en-"))
    .filter((item) => item.name.includes("V3"))
    .sort((a, b) => {
      a = a.description;
      b = b.description;
      if (a > b) return 1;
      else if (a < b) return -1;
      else return 0;
    });
  return voices;
}

async function generateVoiceOptions() {
  let voices = await getVoiceList();
  let stored = await browser.storage.local.get(["voice"]);
  let selectedVoice = stored.voice;
  voices.forEach((voice) => {
    let option = document.createElement("option");
    option.label = voice.description.split(":")[0]; //"Kate: British English female" => "Kate"
    option.value = voice.name;
    if (
      option.value == selectedVoice ||
      (!selectedVoice && option.value == defaultVoice)
    ) {
      option.selected = true;
    }
    voiceField.appendChild(option);
  });
}

function alertUser(bool) {
  let alert = bool ? successAlert : failureAlert;
  alert.style.opacity = 1;
  setTimeout(function () {
    alert.style.opacity = 0;
  }, 2345);
}

function reset() {
  browser.storage.local.clear();
  voiceField.innerHTML = "";
  voiceField.disabled = true;
}

function retrieve() {
  let storage = browser.storage.local.get(["url", "apikey", "voice"]);
  generateVoiceOptions();
  storage.then((res) => {
    urlField.value = res.url || null;
    apiField.value = res.apikey || null;
    if (res.voice) {
      voiceField.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", retrieve);
document.querySelector("form").addEventListener("submit", save);
document.querySelector("form").addEventListener("reset", reset);
