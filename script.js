//Enter the RegEx values in this section||||||||||||||||||||||
const systemName =
  '<PROPERTY name="product-id" type="string">([^<]+)</PROPERTY>';
//Enter the RegEx values in this section||||||||||||||||||||||
const newAnalysis = document.getElementById("newAnalysis");

newAnalysis.addEventListener("click", () => {
  location.reload(true); // hard reload the page
});

function showLoadingScreen() {
  document.getElementById("loading-screen").style.display = "flex";
}

function hideLoadingScreen() {
  document.getElementById("loading-screen").style.display = "none";
}
function hideWelcomeScreen() {
  document.getElementById("welcomeScreen").style.display = "none";
}
function showContainers() {
  document.getElementById("container").style.display = "flex";
  document.getElementById("navbar").style.display = "flex";
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
        hideWelcomeScreen();
        showContainers();
      });
    };

    reader.readAsArrayBuffer(file);
  }
}

function processTheLogFile(dataArray) {
  // Process the log file data
  const arrayLength = dataArray.length;
  console.log("Array length: " + arrayLength);

  if (arrayLength > 1) {
    // Prepare the options for the user to select
    const options = dataArray.map((item, index) => {
      const { fileName } = item;
      return `${index + 1}. ${fileName}`;
    });

    let selectedIndex;
    while (true) {
      // Ask the user to select an option
      const promptMessage = `There are multiple .logs files. Please select the file you want to analyze:\n${options.join(
        "\n"
      )}`;
      const userInput = prompt(promptMessage);
      selectedIndex = parseInt(userInput, 10);

      // Validate the selected index
      if (
        !isNaN(selectedIndex) &&
        selectedIndex >= 1 &&
        selectedIndex <= arrayLength
      ) {
        break; // Valid option selected, exit the loop
      }

      console.log("Invalid option selected. Please try again.");
    }

    // Get the selected item based on the index
    const selectedItem = dataArray[selectedIndex - 1];
    const { fileName, content } = selectedItem;
    startProcess(fileName, content);
  } else if (arrayLength === 1) {
    // Process the single item in dataArray
    const { fileName, content } = dataArray[0];
    startProcess(fileName, content);
  } else {
    console.log("No items in dataArray.");
  }
}

// ****************************************
// OLD JS code
function extractData(string, logsContent) {
  const regex = new RegExp(string);
  const match = logsContent.match(regex);

  if (match) {
    const textContent = match[1];
    return textContent;
  }

  console.log("No matching data found.");
  return null;
}

function startProcess(fileName, logsContent) {
  const nameOfSystem = extractData(systemName, logsContent);
  console.log(nameOfSystem);
  const { xmlData, cData } = splitFileIntoSections(logsContent);
  //Download button for the fixed .log file
  addDownloadButton(
    fixOriginalLogFile(logsContent),
    nameOfSystem,
    "logs",
    "logs-button"
  );
  //Download button for the CData section.
  // addDownloadButton(cData, `${nameOfSystem}-Data`, "txt", "txt-button");
  handleCdata(cData);
}
//This function will return the data based on the regex provided
// EG:  '<PROPERTY name="product-id" type="string">([^<]+)</PROPERTY>';
//The function below helps us the split the log data into 2 sections, XML and cData.
function splitFileIntoSections(fileContents) {
  const splitIndex = fileContents.indexOf("<LOG_CONTENT>");

  if (splitIndex !== -1) {
    const xmlData = fileContents.substring(0, splitIndex);
    const cData = fileContents.substring(splitIndex);
    return { xmlData, cData }; // Return the sections if needed for further use/ XML data wont be used for now
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

  // 6666666666666666

  //     <button class="navbar-button" id="button2">
  //       <span class="material-symbols-outlined"> code_off </span>.Logs
  //     </button>
  // 6666666666666666
  const downloadButton = document.createElement("button");
  const spanElement = document.createElement("span");
  spanElement.className = "material-symbols-outlined";
  spanElement.textContent = "code_off";
  downloadButton.textContent = `.${extention}`;
  downloadButton.prepend(spanElement);

  downloadButton.classList.add("navbar-button");
  downloadButton.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  });

  const container = document.getElementById("navbar");
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

  try {
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
  } catch (error) {
    console.error("An error occurred while processing the data:", error);
  }
}
