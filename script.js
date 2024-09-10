let GoogleAuth;

function handleClientLoad() {
  gapi.load("client:auth2", initClient);
}

function initClient() {
  gapi.client
    .init({
      apiKey: "AIzaSyC05bceYtmOOwZ_m67nQ5Oy9uuS6dFl_Hw",
      clientId:
        "604837842807-kb4lq6vatt045d4463vok790bs76ks4k.apps.googleusercontent.com",
      discoveryDocs: [
        "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
      ],
      scope: "https://www.googleapis.com/auth/drive.file",
    })
    .then(function () {
      GoogleAuth = gapi.auth2.getAuthInstance();
      GoogleAuth.isSignedIn.listen(updateSigninStatus);
      updateSigninStatus(GoogleAuth.isSignedIn.get());
    });
}

function handleSignInClick() {
  GoogleAuth.signIn();
}

function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    document.getElementById("status").textContent = "Logged in";
  } else {
    document.getElementById("status").textContent = "Not logged in";
  }
}

async function startDownload() {
  const client = new WebTorrent();
  const fileInput = document.getElementById("torrentFile");
  const magnetLink = document.getElementById("magnetLink").value;
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");

  let torrent;

  if (fileInput.files.length > 0) {
    // Handle torrent file upload
    const file = fileInput.files[0];
    torrent = client.add(file);
  } else if (magnetLink) {
    // Handle magnet link
    torrent = client.add(magnetLink);
  } else {
    alert("Please upload a torrent file or enter a magnet link.");
    return;
  }

  torrent.on("download", (bytes) => {
    const progress = (torrent.progress * 100).toFixed(2);
    progressBar.value = progress;
    progressText.textContent = `Progress: ${progress}%`;
  });

  torrent.on("done", async () => {
    progressText.textContent =
      "Download complete! Uploading to Google Drive...";

    const blob = new Blob([torrent.files[0].getBuffer()], {
      type: torrent.files[0].type,
    });
    await uploadToGoogleDrive(blob, torrent.files[0].name);
  });
}

async function uploadToGoogleDrive(fileBlob, fileName) {
  const boundary = "-------314159265358979323846";
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const reader = new FileReader();
  reader.readAsBinaryString(fileBlob);
  reader.onload = function (e) {
    const contentType = fileBlob.type || "application/octet-stream";
    const metadata = {
      name: fileName,
      mimeType: contentType,
    };

    const base64Data = btoa(reader.result);
    const multipartRequestBody =
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: " +
      contentType +
      "\r\n" +
      "Content-Transfer-Encoding: base64\r\n" +
      "\r\n" +
      base64Data +
      close_delim;

    const request = gapi.client.request({
      path: "/upload/drive/v3/files",
      method: "POST",
      params: { uploadType: "multipart" },
      headers: {
        "Content-Type": 'multipart/related; boundary="' + boundary + '"',
      },
      body: multipartRequestBody,
    });
    request.execute((file) => {
      document.getElementById("progressText").textContent = "Upload complete!";
    });
  };
}
