/**
 * Scripts injected into artifact iframes to enable screenshot capture.
 * Inspired by open-artifacts HTMLArtifact capture pattern.
 */

const PACKAGES_TO_INJECT = `
<script src="https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
`;

const CAPTURE_HANDLER = `
<script>
  async function handleCaptureSelection(selection) {
    try {
      const [selectionCanvas, artifactCanvas] = await Promise.all([
        html2canvas(document.body, {
          x: selection.x,
          y: selection.y,
          width: selection.width,
          height: selection.height,
          logging: false,
          useCORS: true,
        }),
        html2canvas(document.body, { logging: false, useCORS: true }),
      ]);
      window.parent.postMessage({
        type: "SELECTION_DATA",
        data: {
          selectionImg: selectionCanvas.toDataURL("image/png"),
          artifactImg:  artifactCanvas.toDataURL("image/png"),
        },
      }, "*");
    } catch (err) {
      window.parent.postMessage({ type: "CAPTURE_ERROR", error: String(err) }, "*");
    }
  }

  window.addEventListener("message", (event) => {
    if (event.data?.type === "CAPTURE_SELECTION") {
      handleCaptureSelection(event.data.selection);
    }
  });
</script>
`;

/**
 * Injects html2canvas + capture handler into an HTML string.
 * Appends packages right after <head> and handler right before </body>.
 */
export function injectCaptureScripts(html: string): string {
  let result = html;

  const headTag = "<head>";
  const headIdx = result.indexOf(headTag);
  if (headIdx !== -1) {
    result =
      result.slice(0, headIdx + headTag.length) +
      PACKAGES_TO_INJECT +
      result.slice(headIdx + headTag.length);
  }

  const bodyClose = "</body>";
  const bodyIdx = result.lastIndexOf(bodyClose);
  if (bodyIdx !== -1) {
    result = result.slice(0, bodyIdx) + CAPTURE_HANDLER + result.slice(bodyIdx);
  }

  return result;
}
