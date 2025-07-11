# HTCanvas

HTCanvas is a lightweight, zero-dependency drawing tool built with the HTML5 Canvas
API and vanilla JavaScript.  
It runs entirely in the browser—desktop **and** mobile—so you can sketch ideas,
annotate screenshots, or create simple artwork without installing any software.

➡ **Live demo:** <https://hayapurchase.github.io/htcanvas/>

---

## ✨ Features

* Free-hand drawing with smooth strokes  
* Adjustable stroke **colour** and **width**  
* Press **E** to toggle an **eraser** mode  
* **Clear** button to wipe the canvas  
* **Save** button to download your drawing as a PNG image  
* Responsive, full-window canvas that resizes with the browser  
* Touch-friendly (mobile / tablet support)  
* Built-in Photoshop-style **filters** (grayscale, sepia, blur, brightness, contrast, etc.)
* Export your drawing as a **scalable SVG** vector file  
* Illustrator-style tools:  
  * **Fill bucket** for one-click area colouring  
  * **Shape tools** – draw rectangles, circles and straight lines  
  * **Text tool** – place editable text anywhere on the canvas  
  * **Lasso selection & move** – free-form select any region and drag to reposition  
  * **Move tool** – reposition an existing selection at any time  
  * **Layers panel** to organise and reorder your artwork  
* Subtle paper-like **textured background** for a more natural drawing surface  
* Clean **icon-based buttons** (Google Material Icons) for a modern, compact UI  
* Built-in **theme switcher** – cycle between Light, Dark, and Colourful themes with the   
  <kbd>half-moon</kbd> icon in the top toolbar  
* Brand-new **vector-graphics workspace**  
  * **Pen / Bézier tools** to draw precise paths  
  * **Path-edit & shape-builder** modes for node/segment manipulation  
  * Separate **vector properties panel** (stroke, fill, opacity, rotation)  
  * Vector shapes are kept editable and are preserved in **SVG export**

---

## 🚀 Getting Started

### 1. Clone / Download

```bash
git clone https://github.com/Hayapurchase/htcanvas.git
cd htcanvas
```
or simply download the ZIP from GitHub.

### 2. Run Locally

Open **`index.html`** in any modern browser—no build step required.

> **Windows HTA support**  
> If you prefer the original Windows HTML Application experience, double-click
> `index.hta`.

### Optional: Serve over HTTP

```bash
npm install -g http-server   # one-time
http-server .               # then browse to http://localhost:8080
```

---

## 🖱️ Usage

1. Choose a stroke colour and width from the toolbar.  
2. Click / tap and drag on the canvas to draw.  
3. Press **E** at any time to switch to the eraser (press again to return).  
4. Pick a **Filter** from the dropdown (e.g. *Grayscale*, *Sepia*, *Blur*) to instantly style the whole canvas, or hit **Reset** to remove it.  
5. Hit **Clear** to start over or **Save** to download your artwork as
   `htcanvas.png`.
6. Use **Export SVG** to download a resolution-independent vector version of your artwork that can be edited in tools like Adobe Illustrator or Inkscape.
7. Select tools (Brush, Fill, Shape, Text) from the **Tools** panel in the sidebar, and manage your drawing order in the **Layers** panel.
8. Click the **theme toggle** button (half-moon icon) in the top toolbar to cycle between  
   Light, Dark, and Colourful themes at any time.
9. For vector work, switch to the **Vector Tools** panel (Pen, Bézier, Edit, Shape-builder) and adjust styling in **Vector Properties**.

### Keyboard Shortcuts

| Key | Action            |
|-----|-------------------|
| **E** | Toggle eraser |

---

## 📸 Screenshots

> _Add your screenshots in `docs/` and update the paths below._

![HTCanvas UI](docs/screenshot.png)

---

## License

This project is released under the MIT License. See [`LICENSE`](LICENSE) for details.

