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
  const gridSize = 3000; // Set the grid size to cover more than 1500x1500
  const divisions = 100; 
  const gridHelper = new THREE.GridHelper(
    gridSize,
    divisions,
    0x000000,
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
  const gridSize = 3000; // Match the grid size
  const aspectRatio = window.innerWidth / window.innerHeight;

  // Set the orthographic camera boundaries to cover the entire grid
  const viewSize = gridSize / 2; // Half the grid size for proper centering
  camera = new THREE.OrthographicCamera(
    -viewSize * aspectRatio, // left
    viewSize * aspectRatio, // right
    viewSize, // top
    -viewSize, // bottom
    1,
    5000
  );

  camera.position.set(0, 0, 1000); 
  camera.lookAt(0, 0, 0); 
}

// Initialize the renderer
function initRenderer() {
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
}

function initPerspectiveCamera() {
  const gridSize = 3000; // Match the grid size
  const aspectRatio = window.innerWidth / window.innerHeight;

  // Calculate the field of view (fov) to match the orthographic camera's view size
  const viewSize = gridSize / 2; // Half the grid size
  const fov = 2 * Math.atan(viewSize / 1000) * (180 / Math.PI); // Convert radians to degrees

  perspectiveCamera = new THREE.PerspectiveCamera(
    45, 
    aspectRatio, 
    1, 
    5000
  );

  perspectiveCamera.position.set(0, 0, 2000); 
  perspectiveCamera.lookAt(0, 0, 0);
  perspectiveCamera.up.set(0, 0, 1);
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
export function addRectangle(plannerData = null) {
  if(plannerData) {
    plannerData.Walls.forEach((wall) => {
      const dx = wall.x2 - wall.x1;
      const dy = wall.y2 - wall.y1;
      const length = Math.sqrt(dx * dx + dy * dy); // Calculate the length of the wall
      const angle = Math.atan2(dy, dx); // Calculate the angle of the wall
  
      // Calculate the midpoint of the wall
      const midX = (wall.x1 + wall.x2) / 2;
      const midY = (wall.y1 + wall.y2) / 2;
  
      // Create a new rectangle for the wall
      const newRectangle = new Rectangle(
        length,
        30, // Fixed height for the rectangle
        new THREE.Vector3(midX, midY, 0), // Position at the midpoint
        scene
      );
  
      // Rotate the rectangle to align with the wall
      newRectangle.rectangle.rotation.z = angle;
  
      rectangles.push(newRectangle); // Add the rectangle to the array
    });
  } else {
    const newRectangle = new Rectangle(
      500,
      30,
      new THREE.Vector3(0, 0, 0),
      scene
    );
    rectangles.push(newRectangle);
  }
}

function addHoverAndDragControls() {
  // Show dots
  window.addEventListener("mousemove", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Check for hover over dots
    const dotIntersects = raycaster.intersectObjects(
      rectangles.flatMap((rect) => [rect.leftDot, rect.rightDot])
    );

    if (dotIntersects.length > 0) {
      // Hovering over a dot
      const hoveredDot = dotIntersects[0].object;
      document.body.style.cursor = "pointer"; // Change cursor to pointer
      hoveredDot.scale.set(2, 2, 2); // Make the dot bigger
    } else {
      // Reset all dots to their original size
      rectangles.forEach((rect) => {
        rect.leftDot.scale.set(1, 1, 1);
        rect.rightDot.scale.set(1, 1, 1);
      });
      document.body.style.cursor = "default"; // Reset cursor
    }

    // Check for hover over rectangles
    const rectIntersects = raycaster.intersectObjects(
      rectangles.map((rect) => rect.rectangle)
    );

    rectangles.forEach((rect) => rect.hideDots()); // Hide all dots by default

    if (rectIntersects.length > 0) {
      const hoveredRectangle = rectangles.find(
        (rect) => rect.rectangle === rectIntersects[0].object
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
      // Calculate the offset vector for the left and right dots
      const angle = draggingRectangle.rectangle.rotation.z; // Rectangle's rotation angle
      const offsetX = widthHalf * Math.cos(angle);
      const offsetY = widthHalf * Math.sin(angle);

      // Update the positions of the dots based on the rectangle's rotation
      draggingRectangle.leftDot.position.set(
        draggingRectangle.rectangle.position.x - offsetX,
        draggingRectangle.rectangle.position.y - offsetY,
        0
      );
      draggingRectangle.rightDot.position.set(
        draggingRectangle.rectangle.position.x + offsetX,
        draggingRectangle.rectangle.position.y + offsetY,
        0
      );
      // Update the border's position and rotation
      if (draggingRectangle.border) {
        draggingRectangle.border.position.copy(
          draggingRectangle.rectangle.position
        );
        draggingRectangle.border.rotation.copy(
          draggingRectangle.rectangle.rotation
        );
      }
    }
  });

  window.addEventListener("mouseup", () => {
    draggingDot = null; // Stop dragging dots
    draggingRectangle = null; // Stop dragging rectangles
  });
}

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
    const gridSize = 3000; // Match the grid size
    const aspectRatio = window.innerWidth / window.innerHeight;

    // Set the orthographic camera boundaries to cover the entire grid
    const viewSize = gridSize / 2; // Half the grid size for proper centering
    camera = new THREE.OrthographicCamera(
      -viewSize * aspectRatio, // left
      viewSize * aspectRatio, // right
      viewSize, // top
      -viewSize, // bottom
      1,
      5000 // Far plane to ensure the grid is visible
    );

    camera.position.set(0, 0, 1000); 
    camera.lookAt(0, 0, 0); 
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
    perspectiveCamera.position.set(0, 0, 4000); // Directly above the center
    perspectiveCamera.lookAt(0, 0, 0); // Look at the center of the grid
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
function setupLighting() {
  // Add ambient light for general illumination
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Slightly brighter ambient light
  scene.add(ambientLight);

  // Add a point light to simulate a bulb in the middle of the room
  const pointLight = new THREE.PointLight(0xffffff, 1, 5000); // Increase intensity to 2
  pointLight.position.set(0, 0, 800); // Position the light in the middle of the room
  pointLight.castShadow = true; // Enable shadows
  scene.add(pointLight);
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
  perspectiveCamera.position.set(0, 0, 4000);
  perspectiveCamera.lookAt(0, 0, 0); 

  perspectiveCamera.updateProjectionMatrix(); // Update the projection matrix

  // If OrbitControls is enabled, reset its target
  if (orbitControls) {
      orbitControls.target.set(0, 0, 0); // Default to the origin
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
  // addRectangle();
  setupLighting();
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
  .addEventListener("click", () => addRectangle(null));

// Start the application
init();
