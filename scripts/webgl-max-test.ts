import puppeteer from "puppeteer";

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--use-gl=angle", "--disable-gpu-compositing"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1632, height: 2912 });
  
  const result = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1632;
    canvas.height = 2912;
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return { error: "no webgl" };
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxVP = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    const maxRB = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    const renderer = gl.getParameter(gl.RENDERER);
    return { maxTex, maxVP: [maxVP[0], maxVP[1]], maxRB, renderer, canvasW: canvas.width, canvasH: canvas.height };
  });
  
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}
main();
