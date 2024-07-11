const QRCode = require("qrcode");
const fs = require("fs");

const links = require("./data/db.json");
const linkPath = "./data/db.json";
let shortLink;
let qrCode;

async function updateDBJSON(path, array) {
  await fs.writeFileSync(path, JSON.stringify(array, null, 2), "utf-8");
}

function generateRandomString(length) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  while (result.length < length) {
    const char = characters.charAt(
      Math.floor(Math.random() * charactersLength)
    );
    if (result.indexOf(char) === -1) {
      result += char;
    }
  }
  return result;
}

function ensureAuthenticated(req, res, next) {
  console.log("connexion", req.isAuthenticated());
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).redirect("/login");
}

function ensureValidUrl(url) {
  if (!url.match(/^https?:\/\//i)) {
    return `http://${url}`;
  }
  return url;
}
async function generateShortLink(req, res) {
  const { link } = req.body;

  const existingLink = links.find(
    (l) => l.originalLink === link && l.slug === req.user
  );

  if (existingLink) {
    return existingLink;
  } else {
    const shortLinkId = generateRandomString(5);
    shortLink = `${req.protocol}://${req.get("host")}/${shortLinkId}`;

    return shortLink;
  }
}

async function generateQRCode(req, res) {
  const { link } = req.body;

  const existingQrCode = links.find(
    (l) => l.originalLink === link && l.slug === req.user
  );

  if (existingQrCode) {
    return existingQrCode;
  } else {
    try {
      qrCode = await QRCode.toDataURL(link);

      return qrCode;
    } catch (err) {
      console.error(err);
    }
  }
}

const createObjet = async (req, res) => {
  const { link } = req.body;
  console.log(req.user);

  const existingLink = links.find((l) => l.originalLink === link);

  if (existingLink) {
    return existingLink;
  } else {
    await generateShortLink(req, res);
    await generateQRCode(req, res);

    const newLink = {
      id: crypto.randomUUID(),
      slug: req.user,
      originalLink: link,
      shortLink,
      qrCode,
      publishedAt: new Date(),
      valid: true,
    };

    links.push(newLink);
    updateDBJSON(linkPath, links);
    return newLink;
  }
};

module.exports = {
  ensureAuthenticated,
  createObjet,
  updateDBJSON,
  ensureValidUrl,
};
