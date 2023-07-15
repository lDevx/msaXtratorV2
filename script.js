function showLoadingScreen() {
  document.getElementById("loading-screen").style.display = "flex";
}

function hideLoadingScreen() {
  document.getElementById("loading-screen").style.display = "none";
}
function hideForum() {
  document.getElementById("zipFileForum").style.display = "none";
}

async function extractZipFile(event) {
  showLoadingScreen();
  var file = event.target.files[0];
  if (file) {
    var reader = new FileReader();

    reader.onload = async function (event) {
      var zipData = event.target.result;

      var zip = await JSZip.loadAsync(zipData);
      let filePromises = [];

      zip.forEach(function (fileName, zipEntry) {
        if (/\.logs$/i.test(fileName)) {
          filePromises.push(
            zipEntry.async("text").then(function (fileContent) {
              return { fileName, content: fileContent };
            })
          );
        }
      });

      Promise.all(filePromises).then(function (dataArray) {
        processTheLogFile(dataArray);
        hideLoadingScreen();
        hideForum();
      });
    };

    reader.readAsArrayBuffer(file);
  }
}

function processTheLogFile(dataArray) {
  // Process the log file data
  console.log(dataArray);
  startProcess();
}

function startProcess() {
  const nameOfSystem = extractData(systemName);
  console.log(systemName);
  const { xmlData, cData } = splitFileIntoSections(logsContent);
  console.log("XML Data:", xmlData);
  console.log("C Data:", cData);
  addDownloadButton(
    fixOriginalLogFile(logsContent),
    nameOfSystem,
    "logs",
    "logs-button"
  );
  addDownloadButton(cData, `${nameOfSystem}-Data`, "txt", "txt-button");

  handleCdata(cData);
}
// ****************************************
// OLD JS code
let logsContent;
let cData;

//Enter the RegEx values in this section||||||||||||||||||||||
const systemName =
  '<PROPERTY name="product-id" type="string">([^<]+)</PROPERTY>';
//Enter the RegEx values in this section||||||||||||||||||||||

//This function will return the data based on the regex provided
// EG:  '<PROPERTY name="product-id" type="string">([^<]+)</PROPERTY>';
function extractData(string) {
  const regex = new RegExp(string);
  const match = logsContent.match(regex);

  if (match) {
    const textContent = match[1];
    return textContent;
  }

  console.log("No matching data found.");
  return null;
}
//The function below helps us the split the log data into 2 sections, XML and cData.
function splitFileIntoSections(fileContents) {
  const splitIndex = fileContents.indexOf("<LOG_CONTENT>");

  if (splitIndex !== -1) {
    const xmlData = fileContents.substring(0, splitIndex);
    const cData = fileContents.substring(splitIndex);
    // Continue with further processing or actions for each section

    return { xmlData, cData }; // Return the sections if needed for further use
  } else {
    console.log("Split point not found in the file.");
    const xmlData = fileContents;
    const cData = null; // Set cData to null since the split point is not found

    return { xmlData, cData };
  }
}

// To add the </LOG_DATA> to the .logs file based on the generation
function fixOriginalLogFile(data) {
  if (data) {
    if (data.includes("</wbi>")) {
      console.log("System appears to be 206X");
      const modifiedText = data.replace("</wbi>", "</wbi>\n</LOG_DATA>");
      return modifiedText;
    } else if (data.includes("</CONFIG_XML>")) {
      const modifiedText = data.replace(
        "</CONFIG_XML>",
        "</CONFIG_XML>\n</LOG_DATA>"
      );
      console.log("not MSA 2060 - </wbi> not found");
      return modifiedText;
    } else {
      return;
    }
  } else {
    return;
  }
}

// Users can download the amended .logs file
function addDownloadButton(data, label, extention, className) {
  const filename = `${label}.${extention}`;
  const blob = new Blob([data], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const downloadButton = document.createElement("button");
  const spanElement = document.createElement("span");
  spanElement.className = "material-symbols-outlined";
  spanElement.textContent = "download";
  downloadButton.textContent = `.${extention}`;
  downloadButton.prepend(spanElement);

  downloadButton.classList.add(className);
  downloadButton.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  });

  const container = document.getElementById("downloadContainer");
  container.appendChild(downloadButton);
}
function handleCdata(data) {
  function splitTextIntoBlocks(text) {
    const blocks = [];
    const lines = text.split("\n");
    let currentBlock = "";

    for (const line of lines) {
      if (line.startsWith("# show")) {
        if (currentBlock !== "") {
          blocks.push(currentBlock);
        }
        currentBlock = line;
      } else {
        currentBlock += "\n" + line;
      }
    }

    if (currentBlock !== "") {
      blocks.push(currentBlock);
    }

    return blocks;
  }

  function showDataBlock(block) {
    const dataBlocks = document.getElementById("dataBlocks");
    dataBlocks.innerHTML = "";
    const pre = document.createElement("pre");
    pre.textContent = block;
    dataBlocks.appendChild(pre);
  }

  const delimiterList = document.getElementById("delimiterList");
  const dataBlocks = document.getElementById("dataBlocks");

  const blocks = splitTextIntoBlocks(data);

  // Display delimiters on the left side
  for (const block of blocks) {
    const delimiter = block.split("\n")[0];
    const listItem = document.createElement("li");
    listItem.textContent = delimiter;
    listItem.onclick = function () {
      showDataBlock(block);
    };
    delimiterList.appendChild(listItem);
  }

  // Show the first data block by default
  if (blocks.length > 0) {
    showDataBlock(blocks[0]);
  }
}
