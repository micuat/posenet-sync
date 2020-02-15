var socket = io();

socket.on("new image debug", function(data) {
  console.log(data);
});

socket.on("new user", function(data) {
  console.log("someone joined!");
});

socket.on("new image", function(data) {
  if (imageWall != undefined) {
    imageWall.attribute("src", data.base);
  }
  console.log("downloaded");
});

// https://codepen.io/joezimjs/pen/yPWQbd
setTimeout(() => {
  // ************************ Drag and drop ***************** //
  let dropArea = document.getElementById("scene");

  // Prevent default drag behaviors
  ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  // Highlight drop area when item is dragged over it
  ["dragenter", "dragover"].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
  });
  ["dragleave", "drop"].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });

  // Handle dropped files
  dropArea.addEventListener("drop", handleDrop, false);

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function highlight(e) {
    dropArea.classList.add("highlight");
  }

  function unhighlight(e) {
    dropArea.classList.remove("active");
  }

  function handleDrop(e) {
    var dt = e.dataTransfer;
    var files = dt.files;

    handleFiles(files);
  }

  // let uploadProgress = []
  // let progressBar = document.getElementById('progress-bar')

  function initializeProgress(numFiles) {
    console.log("init upload");
    //   progressBar.value = 0
    //   uploadProgress = []

    //   for(let i = numFiles; i > 0; i--) {
    //     uploadProgress.push(0)
    //   }
  }

  function updateProgress(fileNumber, percent) {
    // uploadProgress[fileNumber] = percent
    // let total = uploadProgress.reduce((tot, curr) => tot + curr, 0) / uploadProgress.length
    // console.debug('update', fileNumber, percent, total)
    // progressBar.value = total
  }

  function handleFiles(files) {
    files = [...files];
    initializeProgress(files.length);
    files.forEach(uploadFile);
    files.forEach(previewFile);
  }

  function previewFile(file) {
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = function() {
      if (reader.result.length > 4000000) {
        console.log("file too big! (max ~ 3MB)", reader.result.length);
        $("#filetoobig")
          .fadeIn(100)
          .fadeOut(5000);
        return;
      }
      // console.log(reader.result)
      let mimeType = reader.result.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)[0];
      // console.log(mimeType);
      if (
        mimeType == "image/png" ||
        mimeType == "image/jpeg" ||
        mimeType == "image/bmp"
      ) {
        socket.emit("upload image", { base: reader.result });
        if (imageWall != undefined) {
          imageWall.attribute("src", reader.result);
        }
        console.log("uploaded");

        // console.log(reader.result);
      } else {
        console.log("file type not supported! (only png or jpg)");
        $("#filenotsupported")
          .fadeIn(100)
          .fadeOut(5000);
      }
    };
  }

  function uploadFile(file, i) {}
}, 500);

$("#notice")
  .delay(3000)
  .fadeOut(500, function() {
    // Animation complete
  });

$("#filetoobig").fadeOut(1);

$("#filenotsupported").fadeOut(1);

let imageWall;

const s = p => {
  p.setup = () => {
    p.noCanvas();
    console.log("p5");
    let interval = setInterval(()=>{
      if($('scene') != undefined) {
        clearInterval(interval);
        createScene();
      }
    }, 500);
  }
  const createScene = () => {
    
    return;
    imageWall = p
      .createElement("a-image")
      .attribute("position", "0 4 -10")
      .attribute("width", "8")
      .attribute("height", "8")
      // .elt.parent('#scene');
    return;
    const trees = p
      .createElement("a-entity")
      .parent("scene")
      .attribute("position", "0 -0.5 0");
    for (let i = 0; i < 20; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = p.lerp(7.5, 10, Math.random());
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      p.createElement("a-gltf-model")
        .parent(trees)
        .attribute("src", "#tree")
        .attribute("scale", "0.3 0.3 0.3")
        .attribute("position", `${x} 0.5 ${z}`)
        .attribute("rotation", `0 ${Math.random() * 360} 0`)
        .attribute("shadow");
    }

    const bubbles = p
      .createElement("a-entity")
      .parent("scene")
      .attribute("position", "0 5 0");
    for (let i = 0; i < 50; i++) {
      const x = 15;
      const y = 4;
      p.createElement("a-sphere")
        .parent(bubbles)
        .attribute(
          "position",
          `${Math.random() * x - x / 2} ${Math.random() * y -
            y / 2} ${Math.random() * x - x / 2}`
        )
        .attribute("radius", Math.random() * 1 + 0.1)
        .attribute("color", "#dfbe99")
        .attribute("opacity", 0.5);
    }

    const houses = p
      .createElement("a-entity")
      .parent("scene")
      .attribute("position", "0 0 0");
    for (let i = 0; i < 6; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = p.lerp(5, 7.5, Math.random());
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);

      const house = p
        .createElement("a-entity")
        .parent(houses)
        .attribute("position", `${x} 0 ${z}`);

      p.createElement("a-cylinder")
        .parent(house)
        .attribute("radius", 0.5)
        .attribute("height", 0.25)
        .attribute("color", "#db5375")
        .attribute("shadow");
      p.createElement("a-cylinder")
        .parent(house)
        .attribute("radius", 0.25)
        .attribute("height", 0.5)
        .attribute("color", "#db5375")
        .attribute("shadow");
      p.createElement("a-cylinder")
        .parent(house)
        .attribute("position", "0 .625 0")
        .attribute("radius", 0.05)
        .attribute("height", 1.25)
        .attribute("color", "#729ea1")
        .attribute("shadow");
      p.createElement("a-cone")
        .parent(house)
        .attribute("position", "0 1.25 0")
        .attribute("radius-bottom", 0.85)
        .attribute("radius-top", 0.1)
        .attribute("height", 0.25)
        .attribute("color", "#db5375")
        .attribute("shadow");
    }
  };
};
let myp5 = new p5(s);
