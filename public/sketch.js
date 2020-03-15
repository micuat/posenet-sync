var socket = io();

function createElementUnder(tag, parent) {
  const pr = document.getElementById(parent);
  pr.append(document.createElement(tag));
  return pr.getElementsByTagName(tag)[pr.getElementsByTagName(tag).length - 1];
}

AFRAME.registerComponent("do-something-once-loaded", {
  init: function() {
    const s = p => {
      p.setup = () => {
        p.noCanvas();
        console.log("p5");
        socket.emit("get visitor count", {});
        createScene();
      };
      const createScene = () => {
        socket.on("visitor count", function(data) {
          console.log(data);
          const visitorCount = String(data.num);
          let lastVisitorCount = String(data.num - 1);

          for (let i = 0; i < visitorCount.length; i++) {
            const textEntity = createElementUnder("a-entity", "scene");
            textEntity.setAttribute(
              "text",
              `width: 18; anchor: left; color: #dfbe99; value: ${visitorCount[i]}`
            );
            const x = i * 1 - visitorCount.length / 2 + 0.5;
            textEntity.setAttribute("rotation", `0 0 0`);
            textEntity.setAttribute("position", `${x - 0.3} 1 -2.5`);
            const boxEntity = createElementUnder("a-box", "scene");
            boxEntity.setAttribute("color", "#db5375");
            if()
            boxEntity.setAttribute("rotation", `0 0 0`);
            boxEntity.setAttribute("position", `${x} 1 -3`);
            boxEntity.setAttribute("width", 0.9);
          }
        });

        document
          .getElementById("scene")
          .append(document.createElement("a-entity"));
        const trees = p
          .select("a-entity")
          .id("trees")
          .attribute("position", "0 -0.5 0");
        for (let i = 0; i < 20; i++) {
          const theta = Math.random() * Math.PI * 2;
          const r = p.lerp(7.5, 10, Math.random());
          const x = r * Math.cos(theta);
          const z = r * Math.sin(theta);
          document
            .getElementById("trees")
            .append(document.createElement("a-gltf-model"));
          p.selectAll("a-gltf-model")
            [p.selectAll("a-gltf-model").length - 1].attribute("src", "#tree")
            .attribute("scale", "0.3 0.3 0.3")
            .attribute("position", `${x} 0.5 ${z}`)
            .attribute("rotation", `0 ${Math.random() * 360} 0`)
            .attribute("shadow");
        }
        document
          .getElementById("scene")
          .append(document.createElement("a-entity"));
        const bubbles = p
          .selectAll("a-entity")
          [p.selectAll("a-entity").length - 1].id("bubbles")
          .attribute("position", "0 5 0");
        for (let i = 0; i < 50; i++) {
          const x = 15;
          const y = 4;
          document
            .getElementById("bubbles")
            .append(document.createElement("a-sphere"));
          p.selectAll("a-sphere")
            [p.selectAll("a-sphere").length - 1].parent(bubbles)
            .attribute(
              "position",
              `${Math.random() * x - x / 2} ${Math.random() * y -
                y / 2} ${Math.random() * x - x / 2}`
            )
            .attribute("radius", Math.random() * 1 + 0.1)
            .attribute("color", "#dfbe99")
            .attribute("opacity", 0.75);
        }
      };
    };
    let myp5 = new p5(s);
  },
  tick: function(time, timeDelta) {
    const t = time * 0.001;
    // lastT = t;
  }
});
