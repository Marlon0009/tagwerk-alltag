import { entry } from "./core.mjs";
let library, closeActive;
function decoder() {
  return (library ||= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "./vendor/zxing-browser.min.js";
    script.onload = () =>
      resolve(new window.ZXingBrowser.BrowserMultiFormatReader());
    script.onerror = () => {
      library = null;
      reject(Error("Barcodeleser konnte nicht geladen werden."));
    };
    document.head.append(script);
  }));
}
export function openCamera({ dlg, modal, btn, edit, state, field, val }) {
  closeActive?.();
  let stream,
    timer,
    ended = false,
    mode = "Barcode",
    torch = false,
    reader;
  function stop() {
    ended = true;
    clearInterval(timer);
    stream?.getTracks().forEach((t) => t.stop());
    document.removeEventListener("visibilitychange", hide);
    dlg.removeEventListener("close", stop);
    closeActive = null;
  }
  function hide() {
    if (document.hidden) {
      stop();
      if (dlg.open) dlg.close();
    }
  }
  closeActive = stop;
  document.addEventListener("visibilitychange", hide);
  dlg.addEventListener("close", stop, { once: true });
  function result(code, photo) {
    stop();
    let previous =
      code &&
      state()
        .entries.slice()
        .reverse()
        .find((e) => e.barcode === code);
    edit(
      entry("Mahlzeit", previous?.title || "", {
        area: "Ernährung",
        journal: true,
        barcode: code || "",
        photo: photo || undefined,
        note: code ? "Barcode " + code : "",
        value: null,
      }),
    );
  }
  function manual() {
    stop();
    modal(
      "Barcode eingeben",
      field("Nummer unter dem Strichcode", "code") +
        btn("Übernehmen", () => {
          const code = val("code").trim();
          if (!/^\d{6,18}$/.test(code))
            throw Error("Bitte die Nummer unter dem Strichcode eingeben.");
          result(code);
        }),
    );
  }
  function snapshot() {
    const v = dlg.querySelector("video");
    if (!v?.videoWidth) return null;
    const c = document.createElement("canvas");
    c.width = Math.min(1000, v.videoWidth);
    c.height = Math.round((v.videoHeight * c.width) / v.videoWidth);
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    return c;
  }
  function detect() {
    if (ended || mode !== "Barcode" || !reader) return;
    const c = snapshot();
    if (!c) return;
    try {
      const decoded = reader.decodeFromCanvas(c);
      if (decoded) result(decoded.getText());
    } catch {
      /* No barcode in this frame. */
    }
  }
  function modeChange(m) {
    mode = m;
    dlg
      .querySelectorAll(".scanmodes button")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.textContent === mode)),
      );
    dlg.querySelector(".capture").textContent =
      m === "Barcode" ? "Barcode scannen" : m + " aufnehmen";
  }
  function capture() {
    if (mode === "Barcode") {
      manual();
      return;
    }
    const c = snapshot();
    if (c) result(null, c.toDataURL("image/jpeg", 0.8));
    else dlg.querySelector("[type=file]").click();
  }
  modal(
    "Scanner",
    '<video autoplay playsinline muted></video><div class="scancontrols">' +
      btn("×", () => dlg.close(), 'camcircle" aria-label="Scanner schließen') +
      btn(
        "ϟ",
        async () => {
          const t = stream?.getVideoTracks()[0];
          if (t?.getCapabilities?.().torch) {
            await t.applyConstraints({ advanced: [{ torch: !torch }] });
            torch = !torch;
          }
        },
        'camcircle flash" aria-label="Kameralicht',
      ) +
      '</div><div class="finder"></div><div class="scanfoot"><div class="scanmodes">' +
      ["Barcode", "Etikett", "Foto"]
        .map((m) => btn(m, () => modeChange(m)))
        .join("") +
      "</div>" +
      btn("Barcode scannen", capture, "capture") +
      '<input type="file" accept="image/*" hidden><p class="camstatus" role="status"></p></div>',
  );
  dlg.className = "camera";
  modeChange(mode);
  const flash = dlg.querySelector(".flash");
  flash.disabled = true;
  dlg.querySelector("[type=file]").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const bitmap = await createImageBitmap(f);
    const c = document.createElement("canvas");
    c.width = Math.min(bitmap.width, 1000);
    c.height = Math.round((bitmap.height * c.width) / bitmap.width);
    c.getContext("2d").drawImage(bitmap, 0, 0, c.width, c.height);
    bitmap.close();
    result(null, c.toDataURL("image/jpeg", 0.8));
  };
  (async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (ended) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      dlg.querySelector("video").srcObject = stream;
      flash.disabled = !stream.getVideoTracks()[0]?.getCapabilities?.().torch;
      reader = await decoder();
      if (!ended) timer = setInterval(detect, 450);
    } catch {
      if (!ended)
        dlg.querySelector(".camstatus").textContent =
          "Kamera nicht verfügbar. Barcode eingeben oder unter Foto ein Bild auswählen.";
    }
  })();
}
