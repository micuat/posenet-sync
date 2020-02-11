// Camera Properties
let camera_angle = 0;
const camera_range = -7.5;
const camera_speed = (0.05 * Math.PI) / 180;
const camera_target = new THREE.Vector3(0, 0, 0);

const plane_width = 1.6;
const plane_height = (1.6 * 240) / 320;
const plane_position = { x: 0, y: 0, z: 0 };

const numScreens = 8;
let curTexture = 0;

var socket = io();

socket.on("new image debug", function(data) {
  console.log(data);
});

socket.on("new image", function(data) {
  // console.log(data.base);
  let image = new Image();
  image.src = data.base;
  let uploadedTexture = new THREE.Texture();
  uploadedTexture.image = image;
  image.onload = function() {
    uploadedTexture.needsUpdate = true;
    textures[curTexture] = uploadedTexture;
    textures[curTexture].minFilter = THREE.NearestFilter;
    plane_materials[curTexture].map = textures[curTexture];
    curTexture = (curTexture + 1) % numScreens;
    console.log("downloaded");
  };
  //render();
});

// https://codepen.io/joezimjs/pen/yPWQbd
// ************************ Drag and drop ***************** //
let dropArea = document.getElementById("container");

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
    let mimeType = reader.result.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)[0];
    // console.log(mimeType);
    if (mimeType == "image/png" || mimeType == "image/jpeg") {
      socket.emit("upload image", { base: reader.result });
      let image = new Image();
      image.src = reader.result;
      let uploadedTexture = new THREE.Texture();
      uploadedTexture.image = image;
      image.onload = function() {
        uploadedTexture.needsUpdate = true;
        textures[curTexture] = uploadedTexture;
        textures[curTexture].minFilter = THREE.NearestFilter;
        plane_materials[curTexture].map = textures[curTexture];
        curTexture = (curTexture + 1) % numScreens;
        console.log('uploaded');
      };

      // console.log(reader.result);
    }
  };
}

function uploadFile(file, i) {}

const container = document.getElementById("container");

// New renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x247ba0, 1);

// Add the renderer to the DOM
// document.body.appendChild(renderer.domElement);
container.appendChild(renderer.domElement);

stats = new Stats();
// container.appendChild(stats.dom);

// Create the scene
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.05);

let camera;
{
  const camera_focal = 70;
  const camera_near = 0.1;
  const camera_far = 50;
  // Set some camera defaults
  camera = new THREE.PerspectiveCamera(
    camera_focal,
    window.innerWidth / window.innerHeight,
    camera_near,
    camera_far
  );
  camera.position.set(0, camera_range, 0);
  camera.lookAt(camera_target);
}

scene.add(new THREE.AmbientLight(0xffffff));

// Add directional light
const light_spot_positions = [{ x: -2, y: -2, z: 1.5 }, { x: 3, y: 1, z: 1.5 }];
for (let i = 0; i < 2; i++) {
  let spot_light = new THREE.SpotLight(0xdddddd, 0.5);
  spot_light.position.set(
    light_spot_positions[i].x,
    light_spot_positions[i].y,
    light_spot_positions[i].z
  );
  spot_light.target = scene;
  spot_light.castShadow = true;
  spot_light.receiveShadow = true;
  spot_light.shadow.camera.near = 0.5;
  spot_light.shadow.mapSize.width = 1024 * 2; // default is 512
  spot_light.shadow.mapSize.height = 1024 * 2; // default is 512
  scene.add(spot_light);
}

const textureVig = new THREE.TextureLoader().load(
  "https://cdn.glitch.com/a4a75260-df79-4987-b175-2a41fddd2fa2%2Fvig.png?v=1581419125887"
);
const tile_material = new THREE.MeshLambertMaterial({
  color: 0xdddddd,
  map: textureVig
});

for (let i = -5; i <= 5; i++) {
  for (let j = -5; j <= 5; j++) {
    {
      const plane_geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
      const plane_mesh = new THREE.Mesh(plane_geometry, tile_material);
      plane_mesh.position.set(j * 2, i * 2, -1);
      plane_mesh.receiveShadow = true;
      scene.add(plane_mesh);
    }
  }
}
for (let i = -2.5; i <= 2.5; i++) {
  for (let j = -2.5; j <= 2.5; j++) {
    if (Math.random() > 0.75) {
      const box_geometry = new THREE.BoxGeometry(0.25, 0.25, 3);
      const box_mesh = new THREE.Mesh(box_geometry, tile_material);
      box_mesh.castShadow = true;
      box_mesh.receiveShadow = true;
      box_mesh.position.set(j * 2, i * 2, 0.5);
      scene.add(box_mesh);
    }
  }
}

const plane_geometry = new THREE.PlaneGeometry(
  plane_width,
  plane_height,
  128,
  128
);
const plane_materials = [];

for (let i = 0; i < numScreens; i++) {
  plane_materials[i] = new THREE.MeshStandardMaterial({
    color: 0xffffff
    // displacementBias: 0.0,
    // displacementScale: -0.0
  });
}

const default_material = new THREE.MeshLambertMaterial({ color: 0xffff00ff });

const makeWall = ({ j, i }) => {
  const box_geometry =
    Math.random() > 0.9
      ? new THREE.BoxGeometry(2, 0.125, 3)
      : new THREE.BoxGeometry(0.125, 0.125, 3);
  const box_mesh = new THREE.Mesh(box_geometry, tile_material);
  box_mesh.castShadow = true;
  box_mesh.receiveShadow = true;
  box_mesh.position.set(j * 2, i * 2, 0.5);
  return box_mesh;
};

const meshes = [];
let texIndex = 0;
const installPiece = ({ yRot }) => {
  let index = texIndex; //Math.floor(Math.random() * numScreens);
  texIndex = (texIndex + 1) % numScreens;
  const plane_mesh = new THREE.Mesh(plane_geometry, plane_materials[index]);
  plane_mesh.position.set(0, 0.15, 0);
  plane_mesh.rotation.x = Math.PI / 2;
  plane_mesh.rotation.y = yRot;
  plane_mesh.receiveShadow = true;
  return plane_mesh;
};

for (let i = -2.5; i <= 2.5; i++) {
  for (let j = -2; j <= 2; j++) {
    if (Math.random() > 0.75) {
      const box_mesh = makeWall({ j, i });
      scene.add(box_mesh);
      box_mesh.add(installPiece({ yRot: 0 }));
      box_mesh.add(installPiece({ yRot: -Math.PI }));
    }
  }
}

for (let i = -2; i <= 2; i++) {
  for (let j = -2.5; j <= 2.5; j++) {
    if (Math.random() > 0.75) {
      const box_mesh = makeWall({ j, i });
      box_mesh.rotation.z = -Math.PI / 2;
      scene.add(box_mesh);
      box_mesh.add(installPiece({ yRot: 0 }));
      box_mesh.add(installPiece({ yRot: -Math.PI }));
    }
  }
}

{
  const box_geometry = new THREE.BoxGeometry(11.5, 11.5, 0.125);
  const box_mesh = new THREE.Mesh(box_geometry, tile_material);
  box_mesh.castShadow = true;
  box_mesh.receiveShadow = true;
  box_mesh.position.set(0, 0, 2);
  scene.add(box_mesh);
}

// Render loop
const textures = [];
for (let i = 0; i < numScreens; i++) {
  textures[i] = new THREE.TextureLoader().load(
    "https://cdn.glitch.com/a4a75260-df79-4987-b175-2a41fddd2fa2%2Fvig.png?v=1581419125887"
  );
  textures[i].minFilter = THREE.NearestFilter;
  plane_materials[i].map = textures[i];
}
let t = 0;
const render = () => {
  for (tex of textures) tex.needsUpdate = true;

  camera_angle += camera_speed;
  camera.position.x = Math.cos(camera_angle) * camera_range;
  camera.position.y = Math.sin(camera_angle) * camera_range;
  camera.up.set(0, 0, 1);
  camera.lookAt(camera_target);

  t = t + 0.01;
  // for(m of meshes)
  //     m.morphTargetInfluences = [EasingFunctions.easeInOutCubic(Math.sin(t) * 0.5 + 0.5)];

  requestAnimationFrame(render);

  renderer.render(scene, camera);

  stats.update();
};
render();

window.onresize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};
