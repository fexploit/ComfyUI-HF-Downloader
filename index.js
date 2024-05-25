// web-plugin/index.js

import { app } from "./app.js";
import { api } from "./api.js";
import { ComfyWidgets, LGraphNode } from "./widgets.js";

/** @typedef {import('../../../web/types/comfy.js').ComfyExtension} ComfyExtension*/
/** @type {ComfyExtension} */
const ext = {
  name: "HFDownloader",

  async init() {
    console.log("HF Downloader loaded.");
    addButton();
  },

  async setup() {
    console.log("HF Downloader setup done.");
  },
};

function addButton() {
  const menu = document.querySelector(".comfy-menu");

  const button = document.createElement("button");
  button.id = "hf-downloader-button";
  button.textContent = "HF Downloader";
  button.onclick = showPopup;

  button.style.order = "98";

  menu.append(button);
}

async function showPopup() {
  const content = $el("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" } }, [
    $el("div", { textContent: "Enter the Hugging Face model link:" }),
    $el("input", { type: "text", id: "model-link", style: { width: "100%" } }),
    $el("div", { textContent: "Select the model type:" }),
    $el("select", { id: "model-type", style: { width: "100%" } }, [
      $el("option", { value: "checkpoints", textContent: "Checkpoint" }),
      $el("option", { value: "loras", textContent: "LoRA" }),
      $el("option", { value: "vae", textContent: "VAE" }),
      $el("option", { value: "embeddings", textContent: "Embedding" }),
      $el("option", { value: "controlnet", textContent: "ControlNet" }),
    ]),
    $el("progress", { id: "download-progress", value: 0, max: 100, style: { width: "100%" } }),
    $el("div", { style: { display: "flex", justifyContent: "space-between" } }, [
      $el("button", { textContent: "Download", onclick: async () => {
        const link = content.querySelector("#model-link").value;
        const modelType = content.querySelector("#model-type").value;
        await downloadModel(link, modelType);
      }}),
      $el("button", { textContent: "Close", onclick: () => infoDialog.close() })
    ])
  ]);

  infoDialog.element.innerHTML = "";
  infoDialog.element.appendChild(content);
  infoDialog.element.style.display = "flex";
}

async function downloadModel(link, modelType) {
  loadingDialog.showLoading("Downloading model...");

  try {
    const response = await fetch(link);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = link.split('/').pop();
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    const comfyUIDir = window.location.pathname.split("/").slice(0, -2).join("/");
    const modelFolder = `${comfyUIDir}/models/${modelType}`;
    const filename = a.download;
    const modelPath = `${modelFolder}/${filename}`;

    const fileReader = new FileReader();
    fileReader.onload = () => {
      const arrayBuffer = fileReader.result;
      const uint8Array = new Uint8Array(arrayBuffer);
      api.sdapi.writeFile(modelPath, uint8Array);
      console.log(`Model downloaded successfully to ${modelPath}`);
      infoDialog.show(`Model downloaded successfully to ${modelPath}`);
    };
    fileReader.readAsArrayBuffer(blob);
  } catch (error) {
    console.error("Error downloading model:", error);
    infoDialog.show(`Error downloading model: ${error.message}`);
  } finally {
    loadingDialog.close();
  }
}

app.registerExtension(ext);

import { ComfyDialog, $el } from "../../scripts/ui.js";

export class InfoDialog extends ComfyDialog {
  constructor() {
    super();
    this.element.classList.add("comfy-normal-modal");
  }

  createButtons() {
    return [
      $el("button", {
        type: "button",
        textContent: "Close",
        onclick: () => this.close(),
      }),
    ];
  }

  close() {
    this.element.style.display = "none";
  }

  show(text) {
    this.textElement.style.whiteSpace = "pre-wrap";
    this.textElement.textContent = text;
    this.element.style.display = "flex";
  }
}

export class LoadingDialog extends ComfyDialog {
  constructor() {
    super();
    this.element.classList.add("comfy-normal-modal");
  }

  createButtons() {
    return [];
  }

  close() {
    this.element.style.display = "none";
  }

  showLoading(text) {
    this.textElement.style.whiteSpace = "pre-wrap";
    this.textElement.innerHTML = `${text}<br><progress id="download-progress" value="0" max="100"></progress>`;
    this.element.style.display = "flex";
  }

  setProgress(value) {
    this.element.querySelector("#download-progress").value = value;
  }
}

export const infoDialog = new InfoDialog();
export const loadingDialog = new LoadingDialog();