import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Nao foi possivel processar a imagem selecionada."));
        return;
      }

      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Falha ao ler a imagem selecionada."));
    reader.readAsDataURL(file);
  });
}

function pickImageFromBrowser() {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Selecao de imagem indisponivel neste ambiente."));
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";

    input.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        const base64 = await fileToBase64(file);
        resolve({
          base64,
          previewUrl: URL.createObjectURL(file),
          sourceLabel: "Arquivo selecionado",
        });
      } catch (error) {
        reject(error);
      }
    });

    input.click();
  });
}

function base64ToDataUrl(base64) {
  return `data:image/jpeg;base64,${base64}`;
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Nao foi possivel preparar a imagem."));
    image.src = dataUrl;
  });
}

async function compressImage(base64, maxSize = 256, quality = 0.72) {
  if (typeof document === "undefined") {
    return {
      base64,
      previewUrl: base64ToDataUrl(base64),
    };
  }

  const image = await loadImage(base64ToDataUrl(base64));
  const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Nao foi possivel processar a foto.");
  }

  context.drawImage(image, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const [, compressedBase64 = ""] = dataUrl.split(",");

  return {
    base64: compressedBase64,
    previewUrl: dataUrl,
  };
}

export async function captureServiceImage() {
  try {
    const photo = await Camera.getPhoto({
      quality: 75,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      promptLabelHeader: "Enviar comprovacao",
      promptLabelPhoto: "Galeria",
      promptLabelPicture: "Camera",
      promptLabelCancel: "Cancelar",
    });

    if (!photo.base64String) {
      throw new Error("A imagem capturada nao retornou conteudo valido.");
    }

    return {
      base64: photo.base64String,
      previewUrl: photo.webPath || null,
      sourceLabel: photo.webPath ? "Imagem capturada" : "Imagem selecionada",
    };
  } catch (error) {
    if (error?.message?.toLowerCase().includes("user cancelled")) {
      return null;
    }

    return pickImageFromBrowser();
  }
}

export async function captureProfileImage() {
  const payload = await captureServiceImage();
  if (!payload?.base64) {
    return null;
  }

  const compressed = await compressImage(payload.base64);
  return {
    base64: compressed.base64,
    previewUrl: compressed.previewUrl,
    sourceLabel: payload.sourceLabel,
  };
}

export async function captureDocumentImage() {
  const payload = await captureServiceImage();
  if (!payload?.base64) {
    return null;
  }

  const compressed = await compressImage(payload.base64, 1280, 0.78);
  return {
    base64: compressed.base64,
    previewUrl: compressed.previewUrl,
    sourceLabel: payload.sourceLabel,
  };
}
