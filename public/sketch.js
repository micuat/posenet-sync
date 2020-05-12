var socket = io();

let video;
let poseNet;
let poses = [];
let friendPoses = {};
let videoToggle;
let col = Math.floor(Math.random() * 255);

socket.on("friendPoses", function (data) {
  for (const pose of data.poses) {
    friendPoses[pose.col] = pose;
  }
});

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO);

  // Create a new poseNet method with a single detection
  poseNet = ml5.poseNet(video, modelReady);
  // This sets up an event that fills the global variable "poses"
  // with an array every time new poses are detected
  poseNet.on("pose", function (results) {
    poses = results.slice(0, 1);
    if (poses.length > 0) {
      poses[0].col = col;
    }
    socket.emit("poses", { poses });

  });
  // Hide the video element, and just show the canvas
  video.hide();

  videoToggle = createCheckbox("show video", true);

  colorMode(HSB, 255, 255, 255);
}

function modelReady() {
  select("#status").html("Model Loaded");
}

function draw() {
  background(255);
  if (videoToggle.checked()) {
    image(video, 0, 0, width, height);
  }
  for (const pose of poses) {
    drawKeypoints(pose);
    drawSkeleton(pose);
  }
  for (const key of Object.keys(friendPoses)) {
    const pose = friendPoses[key];
    drawKeypoints(pose);
    drawSkeleton(pose);
  }
}

// A function to draw ellipses over the detected keypoints
function drawKeypoints(poseObject) {
  let pose = poseObject.pose;
  for (let j = 0; j < pose.keypoints.length; j++) {
    // A keypoint is an object describing a body part (like rightArm or leftShoulder)
    let keypoint = pose.keypoints[j];
    // Only draw an ellipse is the pose probability is bigger than 0.2
    if (keypoint.score > 0.2) {
      fill(poseObject.col, 255, 255);
      noStroke();
      ellipse(keypoint.position.x, keypoint.position.y, 10, 10);
    }
  }
}

// A function to draw the skeletons
function drawSkeleton(poseObject) {
  let skeleton = poseObject.skeleton;
  // For every skeleton, loop through all body connections
  for (let j = 0; j < skeleton.length; j++) {
    let partA = skeleton[j][0];
    let partB = skeleton[j][1];
    stroke(poseObject.col, 255, 255);
    line(
      partA.position.x,
      partA.position.y,
      partB.position.x,
      partB.position.y
    );
  }
}
