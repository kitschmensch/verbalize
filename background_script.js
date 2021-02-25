"use strict";
async function getCredentials() {
  //Retrieve needed data from storage, or redirect user to options page
  let credentials = await browser.storage.local.get([
    "url",
    "access_token",
    "expiration",
    "apikey",
    "voice",
  ]);
  if (!credentials.url) {
    gotoOptions();
  }
  //Reauthenticate if access token has expired or is missing
  let iamUrl =
    "https://iam.cloud.ibm.com/identity/token?grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=";
  if (
    !"access_token" in credentials ||
    Date.now() / 1000 > credentials.expiration
  ) {
    let response = await fetch(iamUrl + credentials.apikey, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    let data = await response.json();
    credentials = { ...credentials, access_token: data.access_token };
    browser.storage.local.set({
      access_token: data.access_token,
      expiration: data.expiration,
    });
  }
  return credentials;
}

async function speechToText(input) {
  //Loading cursor style. Get token from storage
  browser.tabs.executeScript({
    code: `window.document.body.style.cursor='progress';`
  });
  let credentials = await getCredentials();
  //POST input text to syntesize endpoint; recieve raw audio
  let headers = {
    Authorization: "Bearer " + credentials.access_token,
    Accept: "audio/mp3",
    "Content-Type": "application/json",
  };
  let params = {
    voice: credentials.voice || "en-US_EmilyV3Voice",
  };
  let body = {
    text: input,
  };
  let rawAudio = await fetch(
    credentials.url + "/v1/synthesize?" + new URLSearchParams(params),
    {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    }
  );
  //Create consumable blob url to use with .play() method
  let blob = await rawAudio.blob();
  let objectUrl = URL.createObjectURL(blob);
  let audio = new Audio(objectUrl);
  audio.play();
  //and finally remove loading style
  browser.tabs.executeScript({
    code: `window.document.body.style.cursor='default';`,
  });
}

function gotoOptions() {
  browser.runtime.openOptionsPage();
}

browser.menus.create({
  id: "verbalize-selection",
  title: "Verbalize '%s'",
  contexts: ["selection"],
});

browser.menus.onClicked.addListener(function (info, tab) {
  speechToText(info.selectionText);
});

browser.browserAction.onClicked.addListener(gotoOptions);
