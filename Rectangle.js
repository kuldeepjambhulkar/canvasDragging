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

  // Resize the rectangle
  resize(newWidth) {
    this.rectangle.geometry.dispose();
    this.rectangle.geometry = new THREE.PlaneGeometry(newWidth, this.height);
    this.width = newWidth;

    // Redraw the border if it exists
    if (this.border) {
      this.drawBorder();
    }
  }

  // Drag the rectangle
  drag(intersection, offset) {
    this.rectangle.position.copy(intersection.sub(offset));
    if (this.border) {
      this.border.position.copy(this.rectangle.position);
    }
  }
}
