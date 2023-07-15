let logsContent;
let cData;

//Enter the RegEx values in this section||||||||||||||||||||||
const systemName =
  '<PROPERTY name="product-id" type="string">([^<]+)</PROPERTY>';
//Enter the RegEx values in this section||||||||||||||||||||||

function handleFile() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  const reader = new FileReader();

  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");

  reader.onloadstart = function () {
    progressBar.value = 0; // Reset progress bar when loading starts
    progressText.textContent = "0%"; // Reset progress text
  };

  reader.onprogress = function (event) {
    if (event.lengthComputable) {
      const percentLoaded = Math.round((event.loaded / event.total) * 100); // Calculate percentage
      progressBar.value = percentLoaded; // Update progress bar value
      progressText.textContent = percentLoaded + "%"; // Update progress text
    }
  };

  reader.onload = function (event) {
    progressBar.value = 100; // Set progress bar to 100% when loading is complete
    progressText.textContent = "100%"; // Set progress text to 100%
    const contents = event.target.result;
    logsContent = contents;
    startProcess();
  };

  reader.readAsText(file);
}
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
// This function is to clear the mess and eleminat the need to write all the execution inside fileHandle.

function handleXML(xmlData) {
  const xmlString = xmlData;
  const pattern = /<RESPONSE[^>]*>[\s\S]*?<\/RESPONSE>/g;
  const matches = xmlString.match(pattern);
  const data = generateNestedJSON(matches);

  if (matches) {
    console.log(data);
  } else {
    console.log("No matching blocks of data found.");
  }

  const propertyList = $("#propertyList");
  const propertyContent = $("#propertyContent");

  generatePropertyList(data, propertyList);

  function generateNestedJSON(matches) {
    const data = {};

    for (const blockData of matches) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(blockData, "text/xml");
      const responseElement = xmlDoc.getElementsByTagName("RESPONSE")[0];
      const requestValue = responseElement.getAttribute("REQUEST");
      const blockObject = {};

      const objectElements = xmlDoc.getElementsByTagName("OBJECT");

      for (const objectElement of objectElements) {
        const objectName = objectElement.getAttribute("name");
        const objectData = {};

        const propertiesElements =
          objectElement.getElementsByTagName("PROPERTY");

        for (const propertyElement of propertiesElements) {
          const propertyName = propertyElement.getAttribute("name");
          const propertyValue = propertyElement.textContent.trim();

          objectData[propertyName] = propertyValue;
        }

        if (blockObject[objectName]) {
          if (Array.isArray(blockObject[objectName])) {
            blockObject[objectName].push(objectData);
          } else {
            blockObject[objectName] = [blockObject[objectName], objectData];
          }
        } else {
          blockObject[objectName] = objectData;
        }
      }

      data[requestValue] = blockObject;
    }

    return data;
  }

  function generatePropertyList(data, container) {
    for (const requestValue in data) {
      if (data.hasOwnProperty(requestValue)) {
        const blockObject = data[requestValue];
        const dropdownWrapper = $("<div>").addClass("dropdown-wrapper");
        const dropdownButton = $("<button>")
          .addClass("dropdown-button")
          .text(requestValue)
          .on("click", function () {
            dropdownWrapper.toggleClass("active");
          });
        const dropdownList = $("<ul>").addClass("dropdown-list");

        for (const objectName in blockObject) {
          if (blockObject.hasOwnProperty(objectName)) {
            const listItem = $("<li>").text(objectName);
            listItem.on("click", function () {
              showPropertyContent(requestValue, objectName);
            });
            dropdownList.append(listItem);
          }
        }

        dropdownWrapper.append(dropdownButton, dropdownList);
        container.append(dropdownWrapper);
      }
    }
  }

  function showPropertyContent(requestValue, objectName) {
    const content = data[requestValue][objectName];
    if (typeof content === "object") {
      const contentHTML = createNestedHTML(content);
      propertyContent.html(contentHTML);
    } else {
      propertyContent.text(content);
    }
  }

  function createNestedHTML(obj) {
    let html = "";
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (Array.isArray(value)) {
          html += `<p><strong>${key}:</strong></p>`;
          html += "<ul>";
          for (const item of value) {
            html += "<li>";
            html += createNestedHTML(item);
            html += "</li>";
          }
          html += "</ul>";
        } else if (typeof value === "object") {
          html += `<p><strong>${key}:</strong></p>`;
          html += `<div class="nested">${createNestedHTML(value)}</div>`;
        } else {
          html += `<p>${key}: ${value}</p>`;
        }
      }
    }
    return html;
  }
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
  handleXML(xmlData);
  handleCdata(cData);
}
