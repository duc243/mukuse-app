const QRCode = require("qrcode");
const crypto = require("crypto");

async function ensureAuthenticated(req, res, next) {
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

async function generateShortLink(req, res) {
  const shortLinkId = generateRandomString(5);
  const shortLink = `${req.protocol}://${req.get("host")}/${shortLinkId}`;
  return { shortLink, shortLinkId };
}

async function generateQRCode(link) {
  try {
    const qrCode = await QRCode.toDataURL(link);
    return qrCode;
  } catch (err) {
    console.error(err);
  }
}

const createObjet = async (req, res, client) => {
  const { link } = req.body;
  const userId = req.user.id;

  const existingLink = await client.query(
    "SELECT * FROM links WHERE originalLink = $1 AND userId = $2",
    [link, userId]
  );

  if (existingLink.rows.length > 0) {
    return existingLink.rows[0];
  } else {
    const { shortLink, shortLinkId } = await generateShortLink(req, res);
    const qrCode = await generateQRCode(link);

    const newLink = {
      id: crypto.randomUUID(),
      userId,
      originalLink: link,
      shortLink,
      shortId: shortLinkId,
      qrCode,
      publishedAt: new Date(),
      valid: true,
    };

    await client.query(
      "INSERT INTO links (id, userId, originalLink, shortLink, shortId, qrCode, publishedAt, valid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        newLink.id,
        newLink.userId,
        newLink.originalLink,
        newLink.shortLink,
        newLink.shortId,
        newLink.qrCode,
        newLink.publishedAt,
        newLink.valid,
      ]
    );

    return newLink;
  }
};

module.exports = {
  ensureAuthenticated,
  createObjet,
  ensureValidUrl,
};
