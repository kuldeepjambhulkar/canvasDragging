import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js";

// Rectangle class to encapsulate all rectangle-related functionality
export class Rectangle {
  constructor(width, height, position, scene) {
    this.width = width;
    this.height = height;
    this.position = position;
    this.scene = scene;

    // Create the rectangle
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({ color: 0xb6b6b6 });
    this.rectangle = new THREE.Mesh(geometry, material);
    this.rectangle.position.copy(position);

    // Initialize properties
    this.hoverDots = [];
    this.border = null;

    // Add the rectangle to the scene
    this.scene.add(this.rectangle);
  }

  // Draw a border around the rectangle
  drawBorder() {
    if (this.border) {
      this.scene.remove(this.border);
    }
    const edges = new THREE.EdgesGeometry(this.rectangle.geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    this.border = new THREE.LineSegments(edges, lineMaterial);
    this.border.position.copy(this.rectangle.position);
    this.border.rotation.copy(this.rectangle.rotation);
    this.scene.add(this.border);
  }

  // Remove the border
  removeBorder() {
    if (this.border) {
      this.scene.remove(this.border);
      this.border = null;
    }
  }

  // Show hover dots
  showHoverDots() {
    if (this.hoverDots.length > 0) return;

    const dotGeometry = new THREE.CircleGeometry(8, 32);
    const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xffa500 });

    const offset = 10;
    const leftDot = new THREE.Mesh(dotGeometry, dotMaterial);
    const rightDot = new THREE.Mesh(dotGeometry, dotMaterial);

    leftDot.position.set(
      this.rectangle.position.x -
        this.rectangle.geometry.parameters.width / 2 +
        offset,
      this.rectangle.position.y,
      this.rectangle.position.z
    );
    rightDot.position.set(
      this.rectangle.position.x +
        this.rectangle.geometry.parameters.width / 2 -
        offset,
      this.rectangle.position.y,
      this.rectangle.position.z
    );

    this.scene.add(leftDot);
    this.scene.add(rightDot);
    this.hoverDots.push(leftDot, rightDot);
  }

  // Remove hover dots
  removeHoverDots() {
    this.hoverDots.forEach((dot) => this.scene.remove(dot));
    this.hoverDots = [];
  }

  // Update hover dots' position
  updateHoverDots() {
    if (this.hoverDots.length === 0) return;

    const offset = 10;
    this.hoverDots[0].position.set(
      this.rectangle.position.x -
        this.rectangle.geometry.parameters.width / 2 +
        offset,
      this.rectangle.position.y,
      this.rectangle.position.z
    );
    this.hoverDots[1].position.set(
      this.rectangle.position.x +
        this.rectangle.geometry.parameters.width / 2 -
        offset,
      this.rectangle.position.y,
      this.rectangle.position.z
    );
  }

  // Resize the rectangle
  resize(newWidth) {
    this.rectangle.geometry.dispose();
    this.rectangle.geometry = new THREE.PlaneGeometry(newWidth, this.height);
    this.width = newWidth;

    // Update hover dots' positions
    this.updateHoverDots();

    // Redraw the border if it exists
    if (this.border) {
      this.drawBorder();
    }
  }

  // Drag the rectangle
  drag(intersection, offset) {
    this.rectangle.position.copy(intersection.sub(offset));
    this.updateHoverDots();
    if (this.border) {
      this.border.position.copy(this.rectangle.position);
    }
  }
}
