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

