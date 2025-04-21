import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/controls/OrbitControls.js";
let scene, camera, renderer, rectangle, raycaster, mouse, border;

let isDragging = false; // Track if the rectangle is being dragged
let dragOffset = new THREE.Vector3(); // Offset between the rectangle and the mouse

let hoverDots = []; // Array to store the hover dots
let offset = 10; // Adjust this value to control how far inside the dots are placed

let perspectiveCamera, orbitControls; // Declare a variable for the PerspectiveCamera
let isUsingOrthographic = true; // Track which camera is currently active

// Initialize the scene
function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  // Add the grid helper to the scene
  addGridHelper();
}

// Add a grid helper to the scene
function addGridHelper() {
  const gridSize = Math.max(window.innerWidth, window.innerHeight); // Ensure the grid covers the entire view
  const divisions = 50; // Number of divisions in the grid
  const gridHelper = new THREE.GridHelper(
    gridSize,
    divisions,
    0xff0000,
    0x444444
  ); // Grid with dynamic size
  gridHelper.position.z = -1; // Place it slightly behind the rectangle
  gridHelper.rotation.x = Math.PI / 2;

  // Set grid opacity
  gridHelper.material.opacity = 0.1; // Set opacity to 50%
  gridHelper.material.transparent = true; // Enable transparency

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

// Add a rectangle to the scene
function addRectangle() {
  const geometry = new THREE.PlaneGeometry(500, 30); // Width: 200, Height: 100
  const material = new THREE.MeshBasicMaterial({ color: 0xb6b6b6 }); // Green color
  rectangle = new THREE.Mesh(geometry, material);
  scene.add(rectangle);
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

// Add event listener for mouse clicks
function addMouseClickListener() {
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  window.addEventListener("click", (event) => {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Check for intersections with the rectangle
    const intersects = raycaster.intersectObject(rectangle);
    if (intersects.length > 0) {
      drawBorder();
    } else {
      removeBorder();
    }
  });
}

// Draw a border around the rectangle
function drawBorder() {
  if (border) {
    scene.remove(border); // Remove existing border if any
  }

  const edges = new THREE.EdgesGeometry(rectangle.geometry); // Create edges from the rectangle geometry
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 }); // Red color for the border
  border = new THREE.LineSegments(edges, lineMaterial);
  border.position.copy(rectangle.position); // Match the rectangle's position
  border.rotation.copy(rectangle.rotation); // Match the rectangle's rotation
  scene.add(border);
}

// Remove the border
function removeBorder() {
  if (border) {
    scene.remove(border);
    border = null;
  }
}

// Animate and render the scene
// Update the animate function to include OrbitControls
function animate() {
  requestAnimationFrame(animate);

  if (orbitControls && orbitControls.enabled) {
    orbitControls.update(); // Update OrbitControls if enabled
  }

  renderer.render(scene, camera);
}

// Add event listeners for dragging
function addDragControls() {
  let draggedDot = null; // Track which dot is being dragged

  window.addEventListener("mousedown", (event) => {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Check for intersections with the hover dots
    const intersectsDots = raycaster.intersectObjects(hoverDots);
    if (intersectsDots.length > 0) {
      draggedDot = intersectsDots[0].object; // Start dragging the dot
      isDragging = true;
    } else {
      // Check for intersections with the rectangle
      const intersects = raycaster.intersectObject(rectangle);
      if (intersects.length > 0) {
        isDragging = true;

        // Calculate the offset between the rectangle and the mouse
        dragOffset.copy(intersects[0].point).sub(rectangle.position);
      }
    }
  });

  window.addEventListener("mousemove", (event) => {
    if (isDragging) {
      // Calculate mouse position in normalized device coordinates
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Update the raycaster with the camera and mouse position
      raycaster.setFromCamera(mouse, camera);

      // Handle dragging the hover dots
      if (draggedDot) {
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Plane parallel to the screen
        const intersection = new THREE.Vector3();

        // Find the intersection point of the ray with the plane
        raycaster.ray.intersectPlane(plane, intersection);

        // Determine which dot is being dragged and adjust the rectangle
        const isLeftDot = draggedDot === hoverDots[0];
        const fixedX = isLeftDot
          ? rectangle.position.x + rectangle.geometry.parameters.width / 2
          : rectangle.position.x - rectangle.geometry.parameters.width / 2;

        const newWidth = Math.abs(fixedX - intersection.x); // Calculate the new width
        if (newWidth > 0) {
          // Ensure width is positive
          rectangle.geometry.dispose(); // Dispose of the old geometry
          rectangle.geometry = new THREE.PlaneGeometry(
            newWidth,
            rectangle.geometry.parameters.height
          );

          // Update the rectangle's position to keep the fixed end in place
          rectangle.position.x = isLeftDot
            ? fixedX - newWidth / 2
            : fixedX + newWidth / 2;

          // Update the positions of the hover dots
          if (hoverDots.length === 2) {
            hoverDots[0].position.set(
              rectangle.position.x -
                rectangle.geometry.parameters.width / 2 +
                offset,
              rectangle.position.y,
              rectangle.position.z
            );
            hoverDots[1].position.set(
              rectangle.position.x +
                rectangle.geometry.parameters.width / 2 -
                offset,
              rectangle.position.y,
              rectangle.position.z
            );
          }

          // Update the border's position and rotation to match the rectangle
          if (border) {
            border.geometry.dispose();
            const edges = new THREE.EdgesGeometry(rectangle.geometry);
            border.geometry = edges;
            border.position.copy(rectangle.position);
            border.rotation.copy(rectangle.rotation);
          }
        }
      } else {
        // Handle dragging the rectangle
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Plane parallel to the screen
        const intersection = new THREE.Vector3();

        // Find the intersection point of the ray with the plane
        raycaster.ray.intersectPlane(plane, intersection);

        // Update the rectangle's position based on the mouse movement
        rectangle.position.copy(intersection.sub(dragOffset));

        // Update the border's position and rotation to match the rectangle
        if (border) {
          border.position.copy(rectangle.position);
          border.rotation.copy(rectangle.rotation);
        }

        // Update the positions of the hover dots to match the rectangle's new position
        if (hoverDots.length === 2) {
          hoverDots[0].position.set(
            rectangle.position.x -
              rectangle.geometry.parameters.width / 2 +
              offset,
            rectangle.position.y,
            rectangle.position.z
          );
          hoverDots[1].position.set(
            rectangle.position.x +
              rectangle.geometry.parameters.width / 2 -
              offset,
            rectangle.position.y,
            rectangle.position.z
          );
        }
      }
    }
  });

  window.addEventListener("mouseup", () => {
    isDragging = false; // Stop dragging
    draggedDot = null; // Reset the dragged dot
  });
}

// Add event listener for mouse hover
function addHoverEffect() {
  window.addEventListener("mousemove", (event) => {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Check for intersections with the rectangle
    const intersects = raycaster.intersectObject(rectangle);
    if (intersects.length > 0) {
      showHoverDots(); // Show the dots when hovering over the rectangle
    } else {
      removeHoverDots(); // Remove the dots when not hovering
    }

    // Check for intersections with the hover dots
    const intersectsDots = raycaster.intersectObjects(hoverDots);
    if (intersectsDots.length > 0) {
      // Scale up the hovered dot
      intersectsDots[0].object.scale.set(1.5, 1.5); // Increase size
      document.body.style.cursor = "pointer"; // Change cursor to pointer
    } else {
      // Reset the scale of all dots
      hoverDots.forEach((dot) => dot.scale.set(1, 1, 1)); // Reset size
      document.body.style.cursor = "default"; // Reset cursor to default
    }
  });
}

// Show orange dots on the ends of the rectangle
function showHoverDots() {
  if (hoverDots.length > 0) return; // Avoid creating dots multiple times

  const dotGeometry = new THREE.CircleGeometry(8, 32); // Increase segments for smoother spheres
  const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xffa500 }); // Orange color

  // Create two dots at the ends of the rectangle
  const leftDot = new THREE.Mesh(dotGeometry, dotMaterial);
  const rightDot = new THREE.Mesh(dotGeometry, dotMaterial);

  // Position the dots slightly inside the ends of the rectangle
  const offset = 10; // Adjust this value to control how far inside the dots are placed
  leftDot.position.set(
    rectangle.position.x - rectangle.geometry.parameters.width / 2 + offset,
    rectangle.position.y,
    rectangle.position.z
  );
  rightDot.position.set(
    rectangle.position.x + rectangle.geometry.parameters.width / 2 - offset,
    rectangle.position.y,
    rectangle.position.z
  );
  // Add the dots to the scene and store them in the hoverDots array
  scene.add(leftDot);
  scene.add(rightDot);
  hoverDots.push(leftDot, rightDot);
}

// Remove the hover dots
function removeHoverDots() {
  hoverDots.forEach((dot) => scene.remove(dot)); // Remove each dot from the scene
  hoverDots = []; // Clear the hoverDots array
}

// Initialize the PerspectiveCamera
function initPerspectiveCamera() {
  perspectiveCamera = new THREE.PerspectiveCamera(
    75, // Field of view
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near clipping plane
    5000 // Far clipping plane
  );
  perspectiveCamera.up.set(0, 0, 1);
  perspectiveCamera.position.set(0, -1200, 500); // Set the camera position
}

// Initialize OrbitControls
function initOrbitControls() {
  orbitControls = new OrbitControls(perspectiveCamera, renderer.domElement);
  orbitControls.enableDamping = true; // Enable damping for smoother controls
  orbitControls.dampingFactor = 0.05; // Adjust damping factor
  orbitControls.enableZoom = true; // Allow zooming
  orbitControls.enabled = false; // Disable by default
}

// Toggle between OrthographicCamera and PerspectiveCamera
function toggleCamera() {
  isUsingOrthographic = !isUsingOrthographic; // Switch the camera mode

  if (isUsingOrthographic) {
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

    // Change rectangle back to 2D (PlaneGeometry)
    const geometry = new THREE.PlaneGeometry(
      rectangle.geometry.parameters.width,
      30
    );
    rectangle.geometry.dispose(); // Dispose of the old geometry
    rectangle.geometry = geometry;

    // Reset the rectangle's Z-position for OrthographicCamera
    rectangle.position.z = 0.1; // Slightly above the grid

    // Update the button text to "3D"
    document.getElementById("toggle-camera").innerText = "3D";
    document.getElementById("reset-camera").classList.add("disabled");
  } else {
    camera = perspectiveCamera; // Switch to PerspectiveCamera
    camera.position.set(0, -1200, 500); // Position the camera to look across the horizon
    camera.lookAt(rectangle.position); // Make the camera look at the rectangle
    orbitControls.enabled = true; // Enable OrbitControls

    // Change rectangle to 3D (BoxGeometry)
    const geometry = new THREE.BoxGeometry(
      rectangle.geometry.parameters.width,
      10,
      500
    ); // Add depth
    rectangle.geometry.dispose(); // Dispose of the old geometry
    rectangle.geometry = geometry;

    // Ensure the rectangle stays above the grid
    rectangle.position.z = 250; // Half the height above the grid

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
  camera.lookAt(rectangle.position); // Make the camera look at the rectangle
  perspectiveCamera.updateProjectionMatrix(); // Update the projection matrix

  // If OrbitControls is enabled, reset its target
  if (orbitControls) {
    orbitControls.target.set(0, 0, 0); // Reset the target to the origin
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
  addDragControls();
  addHoverEffect();
  addZoomControls();
  //   addAxisHelper();
  animate();
  window.addEventListener("resize", onWindowResize);
}

// Add event listener to the "toggle-camera" button
document
  .getElementById("toggle-camera")
  .addEventListener("click", toggleCamera);

// Add event listener to the "reset-camera" button
document
  .getElementById("reset-camera")
  .addEventListener("click", resetPerspectiveCamera);

// Start the application
init();
