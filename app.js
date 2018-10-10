console.log("starting...");

// const url = "https://wotd.transparent.com/rss/10-05-2018-polish-widget.xml";
const url = "https://wotd.transparent.com/rss/polish-widget.xml";

const getNewData = async () => {
  return fetch(url)
    .then(response => response.text())
    .then(str => new window.DOMParser().parseFromString(str, "text/xml"));
};

const _first = (xmlDoc, tagname) => {
  return xmlDoc.getElementsByTagName(tagname)[0].innerHTML;
};

const formatResult = xmlDoc => {
  var word = _first(xmlDoc, "word");
  var translation = _first(xmlDoc, "translation");
  var fnphrase = _first(xmlDoc, "fnphrase");
  var enphrase = _first(xmlDoc, "enphrase");
  return `
    <strong>${word}</strong>
    <br/>
    <i>${translation}</i>
    <br/><br/>
    <strong>${fnphrase}</strong>
    <br/>
    <i>${enphrase}</i>
    
  `;
};

(async () => {
  var newWord = await getNewData();
  var out = formatResult(newWord);
  document.getElementById("output").innerHTML = out;
})();
