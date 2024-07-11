const downloadBtns = document.querySelectorAll("#downloadBtn");

async function downloadImage(url, filename) {
  try {
    const image = await (await fetch(url)).blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(image);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.log(error);
  }
}

downloadBtns.forEach((btn) => {
  btn.addEventListener("click", (event) => {
    const imageUrl = event.target.getAttribute("data-url");
    const imageName = "qrcode.jpg";
    downloadImage(imageUrl, imageName);
  });
});
