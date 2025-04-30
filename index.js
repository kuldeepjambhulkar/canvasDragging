import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/controls/OrbitControls.js";
import { Rectangle } from "./Rectangle.js";

let scene, camera, renderer, raycaster, mouse, perspectiveCamera, orbitControls;
let draggingRectangle = null; // Track the rectangle being dragged
let dragOffset = new THREE.Vector3(); // Offset between mouse and rectangle position
let isUsingOrthographic = true; // Track which camera is currently active
let rectangles = []; // Array to store all rectangle instances
let draggingDot = null;

// Initialize the scene
function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  addGridHelper();
}

// Add a grid helper to the scene
function addGridHelper() {
  const gridSize = Math.max(window.innerWidth, window.innerHeight);
  const divisions = 50;
  const gridHelper = new THREE.GridHelper(
    gridSize,
    divisions,
    0xff0000,
    0x444444
  );
  gridHelper.position.z = -1;
  gridHelper.rotation.x = Math.PI / 2;
  gridHelper.material.opacity = 0.1;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);
}

// Add zoom functionality using the mouse wheel
function addZoomControls() {
  window.addEventListener("wheel", (event) => {
    const zoomFactor = 0.1; // Adjust zoom sensitivity
    if (event.deltaY > 0) {
      // Zoom out
      camera.left *= 1 + zoomFactor;
      camera.right *= 1 + zoomFactor;
      camera.top *= 1 + zoomFactor;
      camera.bottom *= 1 + zoomFactor;
    } else {
      // Zoom in
      camera.left *= 1 - zoomFactor;
      camera.right *= 1 - zoomFactor;
      camera.top *= 1 - zoomFactor;
      camera.bottom *= 1 - zoomFactor;
    }
    camera.updateProjectionMatrix(); // Update the camera projection matrix
  });
}

// Initialize the camera
function initCamera() {
  camera = new THREE.OrthographicCamera(
    window.innerWidth / -2,
    window.innerWidth / 2,
    window.innerHeight / 2,
    window.innerHeight / -2,
    1,
    1000
  );
  camera.position.set(0, 0, 400);
}

// Initialize the renderer
function initRenderer() {
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
}

function initPerspectiveCamera() {
  perspectiveCamera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );
  perspectiveCamera.up.set(0, 0, 1);
  perspectiveCamera.position.set(0, -1200, 500);
}

function initOrbitControls() {
  orbitControls = new OrbitControls(perspectiveCamera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;
  orbitControls.enableZoom = true;
  orbitControls.enabled = false;
}

// Handle window resize
function onWindowResize() {
  camera.left = window.innerWidth / -2;
  camera.right = window.innerWidth / 2;
  camera.top = window.innerHeight / 2;
  camera.bottom = window.innerHeight / -2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Add a new rectangle to the scene
function addRectangle() {
  const newRectangle = new Rectangle(
    500,
    30,
    new THREE.Vector3(0, 0, 0),
    scene
  );
  rectangles.push(newRectangle);
}

function addHoverAndDragControls() {
  // Show dots
  window.addEventListener("mousemove", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Check for hover over rectangles
    const intersects = raycaster.intersectObjects(
      rectangles.map((rect) => rect.rectangle)
    );

    rectangles.forEach((rect) => rect.hideDots()); // Hide all dots by default

    if (intersects.length > 0) {
      const hoveredRectangle = rectangles.find(
        (rect) => rect.rectangle === intersects[0].object
      );
      if (hoveredRectangle) {
        hoveredRectangle.showDots(); // Show dots for the hovered rectangle
      }
    }
  });

  window.addEventListener("mousedown", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Check for click on dots
    const dotIntersects = raycaster.intersectObjects(
      rectangles.flatMap((rect) => [rect.leftDot, rect.rightDot])
    );

    if (dotIntersects.length > 0) {
      draggingDot = dotIntersects[0].object; // Start dragging the clicked dot
      return;
    }

    // Check for click on rectangles
    const rectIntersects = raycaster.intersectObjects(
      rectangles.map((rect) => rect.rectangle)
    );

    if (rectIntersects.length > 0) {
      draggingRectangle = rectangles.find(
        (rect) => rect.rectangle === rectIntersects[0].object
      );

      if (draggingRectangle) {
        const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(planeZ, intersectPoint);

        dragOffset
          .copy(intersectPoint)
          .sub(draggingRectangle.rectangle.position);
      }
    }
  });

  window.addEventListener("mousemove", (event) => {
    if (draggingDot) {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(planeZ, intersectPoint);

      // Update the dragged dot's position
      draggingDot.position.copy(intersectPoint);

      // Update the rectangle's geometry
      const rectangle = rectangles.find(
        (rect) => rect.leftDot === draggingDot || rect.rightDot === draggingDot
      );
      if (rectangle) {
        rectangle.removeBorder(); // Remove the border before updating
        const left = rectangle.leftDot.position;
        const right = rectangle.rightDot.position;

        const dx = right.x - left.x;
        const dy = right.y - left.y;
        const newWidth = Math.sqrt(dx * dx + dy * dy);

        rectangle.rectangle.geometry.dispose();
        rectangle.rectangle.geometry = new THREE.PlaneGeometry(
          newWidth,
          rectangle.height
        );
        rectangle.width = newWidth;

        // Position the rectangle at the midpoint between the two dots
        rectangle.rectangle.position.set(
          (left.x + right.x) / 2,
          (left.y + right.y) / 2,
          0
        );

        // Rotate the rectangle to align with the line between the dots
        const angle = Math.atan2(dy, dx);
        rectangle.rectangle.rotation.z = angle;
        rectangle.drawBorder(); // Redraw the border
      }
    } else if (draggingRectangle) {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(planeZ, intersectPoint);

      // Update the rectangle's position
      draggingRectangle.rectangle.position.copy(intersectPoint.sub(dragOffset));

      // Update the positions of the dots
      const widthHalf = draggingRectangle.width / 2;
      draggingRectangle.leftDot.position.set(
        draggingRectangle.rectangle.position.x - widthHalf,
        draggingRectangle.rectangle.position.y,
        0
      );
      draggingRectangle.rightDot.position.set(
        draggingRectangle.rectangle.position.x + widthHalf,
        draggingRectangle.rectangle.position.y,
        0
      );
    }
  });

  window.addEventListener("mouseup", () => {
    draggingDot = null; // Stop dragging dots
    draggingRectangle = null; // Stop dragging rectangles
  });
}

// =====================================
function addMouseClickListener() {
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  window.addEventListener("click", (event) => {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Check for intersections with all rectangles
    const intersects = raycaster.intersectObjects(
      rectangles.map((rect) => rect.rectangle)
    );

    // Remove borders from all rectangles
    rectangles.forEach((rect) => rect.removeBorder());

    if (intersects.length > 0) {
      // Find the clicked rectangle
      const clickedRectangle = rectangles.find(
        (rect) => rect.rectangle === intersects[0].object
      );

      // Draw a border around the clicked rectangle
      if (clickedRectangle) {
        clickedRectangle.drawBorder();
      }
    }
  });
}

// Toggle between OrthographicCamera and PerspectiveCamera
function toggleCamera() {
  isUsingOrthographic = !isUsingOrthographic; // Switch the camera mode

  if (isUsingOrthographic) {
    // Switch to OrthographicCamera
    camera = new THREE.OrthographicCamera(
      window.innerWidth / -2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      window.innerHeight / -2,
      1,
      1000
    );
    camera.position.set(0, 0, 400); // Reset OrthographicCamera position
    orbitControls.enabled = false; // Disable OrbitControls

    // Update all rectangles to 2D (PlaneGeometry)
    rectangles.forEach((rect) => {
      const geometry = new THREE.PlaneGeometry(rect.width, rect.height);
      rect.rectangle.geometry.dispose(); // Dispose of the old geometry
      rect.rectangle.geometry = geometry;

      // Reset the rectangle's Z-position for OrthographicCamera
      rect.rectangle.position.z = 0.1; // Slightly above the grid
    });

    // Update the button text to "3D"
    document.getElementById("toggle-camera").innerText = "3D";
    document.getElementById("reset-camera").classList.add("disabled");
  } else {
    // Switch to PerspectiveCamera
    camera = perspectiveCamera;
    camera.position.set(0, -1200, 500); // Position the camera to look across the horizon
    camera.lookAt(new THREE.Vector3(0, 0, 0)); // Make the camera look at the center
    orbitControls.enabled = true; // Enable OrbitControls

    // Update all rectangles to 3D (BoxGeometry)
    rectangles.forEach((rect) => {
      const geometry = new THREE.BoxGeometry(rect.width, rect.height, 500); // Add depth
      rect.rectangle.geometry.dispose(); // Dispose of the old geometry
      rect.rectangle.geometry = geometry;

      // Ensure the rectangle stays above the grid
      rect.rectangle.position.z = 250; // Half the height above the grid
    });

    // Update the button text to "2D"
    document.getElementById("toggle-camera").innerText = "2D";
    document.getElementById("reset-camera").classList.remove("disabled");
  }

  camera.updateProjectionMatrix(); // Update the projection matrix
}

// Add an axis helper to the scene
function addAxisHelper() {
  const axesHelper = new THREE.AxesHelper(200); // Size of the axes helper
  scene.add(axesHelper);

  // Create a canvas for text labels
  function createTextLabel(text, color) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = "24px Arial";
    context.fillStyle = color;
    context.fillText(text, 0, 24);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(50, 25, 1); // Adjust size of the label
    return sprite;
  }

  // Add X-axis label
  const xLabel = createTextLabel("X", "red");
  xLabel.position.set(220, 0, 0); // Position at the end of the X-axis
  scene.add(xLabel);

  // Add Y-axis label
  const yLabel = createTextLabel("Y", "green");
  yLabel.position.set(0, 220, 0); // Position at the end of the Y-axis
  scene.add(yLabel);

  // Add Z-axis label
  const zLabel = createTextLabel("Z", "blue");
  zLabel.position.set(0, 0, 220); // Position at the end of the Z-axis
  scene.add(zLabel);
}

function resetPerspectiveCamera() {
  // Reset the perspective camera to its original settings
  camera.position.set(0, -1200, 500); // Position the camera to look across the horizon

  if (rectangles.length > 0) {
    const center = new THREE.Vector3();
    rectangles.forEach((rect) => center.add(rect.rectangle.position));
    center.divideScalar(rectangles.length); // Calculate the average position
    camera.lookAt(center); // Look at the center of all rectangles
  } else {
    camera.lookAt(new THREE.Vector3(0, 0, 0)); // Default to the origin if no rectangles exist
  }

  perspectiveCamera.updateProjectionMatrix(); // Update the projection matrix

  // If OrbitControls is enabled, reset its target
  if (orbitControls) {
    if (rectangles.length > 0) {
      const center = new THREE.Vector3();
      rectangles.forEach((rect) => center.add(rect.rectangle.position));
      center.divideScalar(rectangles.length); // Calculate the average position
      orbitControls.target.copy(center); // Set OrbitControls target to the center
    } else {
      orbitControls.target.set(0, 0, 0); // Default to the origin
    }
    orbitControls.update(); // Update the controls
  }
}

// Initialize everything
function init() {
  initScene();
  initCamera();
  initPerspectiveCamera();
  initRenderer();
  initOrbitControls();
  addRectangle();
  addMouseClickListener();
  addHoverAndDragControls();
  addZoomControls();
  //addAxisHelper();
  animate();
  window.addEventListener("resize", onWindowResize);
}

function animate() {
  requestAnimationFrame(animate);

  if (orbitControls && orbitControls.enabled) {
    orbitControls.update(); // Update OrbitControls if enabled
  }

  renderer.render(scene, camera);
}

document
  .getElementById("toggle-camera")
  .addEventListener("click", toggleCamera);

document
  .getElementById("reset-camera")
  .addEventListener("click", resetPerspectiveCamera);

document
  .getElementById("add-rectangle")
  .addEventListener("click", addRectangle);

// Start the application
init();
