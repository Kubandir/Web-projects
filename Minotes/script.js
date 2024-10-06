document.getElementById("mode").addEventListener("change", toggleMode);
document.getElementById("generateButton").addEventListener("click", generateCommand);
document.getElementById("copyButton").addEventListener("click", copyToClipboard);
document.getElementById("generateFromFileButton").addEventListener("click", generateFromFile);

const GITHUB_REPO_URL = "https://api.github.com/repos/Limit-sest/1.K-Notes/contents/";

async function toggleMode() {
    const mode = document.getElementById("mode").value;
    document.getElementById("textInput").style.display = mode === "text" ? "block" : "none";
    document.getElementById("fileSelector").style.display = mode === "github" ? "block" : "none";

    if (mode === "github") {
        await loadFolders();
    }
}

async function loadFolders() {
    const response = await fetch(GITHUB_REPO_URL);
    const folders = await response.json();

    const folderSelect = document.getElementById("folder");
    folderSelect.innerHTML = "";

    folders.forEach(folder => {
        if (folder.type === "dir") {
            const option = document.createElement("option");
            option.value = folder.path;
            option.text = folder.name;
            folderSelect.appendChild(option);
        }
    });

    folderSelect.addEventListener("change", loadFiles);
}

async function loadFiles() {
    const folderPath = document.getElementById("folder").value;
    const response = await fetch(GITHUB_REPO_URL + folderPath);
    const files = await response.json();

    const fileSelect = document.getElementById("file");
    fileSelect.innerHTML = "";

    files.forEach(file => {
        if (file.name.endsWith(".md")) {
            const option = document.createElement("option");
            option.value = file.download_url;
            option.text = file.name;
            fileSelect.appendChild(option);
        }
    });
}

async function generateFromFile() {
    const fileUrl = document.getElementById("file").value;
    const response = await fetch(fileUrl);
    const fileContent = await response.text();
    
    const author = "Limitsex";
    const title = "Kniha vědomostí";

    const pages = splitIntoPages(fileContent);
    const formattedPages = pages.map(page => `{"text":"${page}"}`).join("','");

    const command = `/give @p written_book[written_book_content={title:"${title}",author:"${author}",pages:['${formattedPages}']}] 1`;

    document.getElementById("output").innerText = command;
    document.getElementById("copyButton").style.display = "inline-block";
}

function generateCommand() {
    const author = document.getElementById("author").value;
    const title = document.getElementById("title").value;
    let bookContent = document.getElementById("bookContent").value;

    const pages = splitIntoPages(bookContent);
    const formattedPages = pages.map(page => `{"text":"${page}"}`).join("','");

    const command = `/give @p written_book[written_book_content={title:"${title}",author:"${author}",pages:['${formattedPages}']}] 1`;

    document.getElementById("output").innerText = command;
    document.getElementById("copyButton").style.display = "inline-block";
}

function splitIntoPages(text, pageLimit = 256) {
    const lines = text.split('\n');
    const pages = [];
    let currentPage = "";

    lines.forEach(line => {
        if (line.startsWith('#')) {
            if (currentPage) {
                pages.push(currentPage.trim());
                currentPage = "";
            }
            currentPage += line.trim() + " ";
        } else {
            currentPage += line.trim() + ". ";
        }
    });

    if (currentPage) {
        pages.push(currentPage.trim());
    }

    return pages;
}

function copyToClipboard() {
    const output = document.getElementById("output").innerText;
    navigator.clipboard.writeText(output).then(() => {
        alert("Command copied to clipboard!");
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}
