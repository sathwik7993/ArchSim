# ArchSim Infinite Canvas Specification

This document details the architecture and performance requirements for the Visual Canvas, which serves as the primary workspace for designing distributed systems.

---

## 1. Technical Architecture & Rendering Strategy
To support complex simulations with up to 100,000+ interactive nodes, the Canvas Engine utilizes a hybrid rendering approach:

```
+-------------------------------------------------------------+
| Canvas Viewport Container                                   |
|  +-------------------------------------------------------+  |
|  | WebGL/WebGPU Layer (Background Grid, Link Connectors, |  |
|  | Packet Flow Particles, Node Shadows)                  |  |
|  +-------------------------------------------------------+  |
|  +-------------------------------------------------------+  |
|  | DOM Layer (React Nodes, Forms, Text Inputs, Gauges,   |  |
|  | High-density Charts)                                  |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

### 1.1. Rendering Layers
1. **HTML5 DOM Layer**: Renders individual Node contents (forms, buttons, charts) to leverage native browser text rendering, focus state handling, and layout engines.
2. **WebGL / WebGPU Canvas Layer**: Renders connection paths, animated flow particles, and the background grids. WebGL is used for its hardware acceleration capabilities, handling thousands of moving particles (packets) at 60 FPS without DOM-write bottlenecks.
3. **Canvas Viewport Transform**: Controlled by a single 2D matrix transformation:
   $$\begin{bmatrix} x' \\ y' \\ 1 \end{bmatrix} = \begin{bmatrix} s & 0 & t_x \\ 0 & s & t_y \\ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix}$$
   Where $s$ is the zoom scale factor, and $t_x, t_y$ are translation coordinates.

---

## 2. Navigation & Viewport Controls

### 2.1. Panning and Zooming
* **Zoom Limits**: $0.05\times$ (macro layout view) to $4.0\times$ (detailed node configurations).
* **Zoom Step**: Dynamic Zoom based on mouse wheel speed (exponential scaling).
* **Double-Click Fit**: Computes the bounding box of all nodes on the canvas and triggers a smooth transition matrix animation to focus the viewport on those elements:
  $$\text{Target Zoom} = \min\left(\frac{W_{\text{viewport}}}{W_{\text{bounds}}}, \frac{H_{\text{viewport}}}{H_{\text{bounds}}}\right) \times 0.9$$

### 2.2. Interactive Minimap
* Renders in the bottom-right corner as a simplified representation of the bounding canvas.
* Shows a translucent viewing rectangle overlay representing the current viewport bounds. Panning the minimap updates the parent canvas position coordinates.

---

## 3. Node Interaction & Alignment

### 3.1. Snap-to-Grid System
* Standard alignment grid is set to $10\text{px}$ or $20\text{px}$ intervals.
* Node drag handler calculates snap targets during movements:
  $$X_{\text{snap}} = \text{round}\left(\frac{X_{\text{drag}}}{\text{Grid Size}}\right) \times \text{Grid Size}$$

### 3.2. Smart Connection Alignment
* **Smart Guides**: When dragging a node within $5\text{px}$ of another node's vertical or horizontal axis, a dashed guides line appears to help align alignment.
* **Auto-Layout Router**: Links are calculated using orthogonal routing algorithms (A* pathfinding on grid lines) to prevent connections from crossing underneath component bodies.

---

## 4. Performance Requirements
To ensure professional-grade performance:
* **Framerate**: Maintain a minimum of $60\text{fps}$ during viewport pan, zoom, and selection interactions with up to $2,000$ active nodes on screen.
* **Level-of-Detail (LOD) Rendering**: When zoom scale factor is $<0.25\times$, the DOM layer hides sub-gauges, charts, and metrics, rendering nodes as colored boxes to save CPU paint cycles.
