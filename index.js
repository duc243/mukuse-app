require("dotenv").config();
const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const passport = require("passport");
const GitHubStrategy = require("passport-github").Strategy;

const app = express();

const links = require("./data/db.json");
const userPath = "./data/users.json";
const linkPath = "./data/db.json";
let users = [];
let user;
const {
  ensureAuthenticated,
  createObjet,
  updateDBJSON,
  ensureValidUrl,
} = require("./link");

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.use(express.static(__dirname + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    },
    store: new SQLiteStore({ db: "sessions.db", dir: "./data" }),
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function (id, cb) {
  cb(null, id);
});

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/github/callback",
    },
    function (accessToken, refreshToken, profile, cb) {
      user = profile._json;
      users.push(user);
      updateDBJSON(userPath, users);
      cb(null, profile);
    }
  )
);

app.get("/auth/github", passport.authenticate("github"));

app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/");
  }
);

app.get("/login", (req, res) => {
  res.render("login", { user });
});

app.get("/logout", (req, res) => {
  req.logOut((err) => {
    if (err) {
      console.error("Erreur lors de la déconnexion :", err);
      return next(err);
    }
    user = null;
    res.redirect("/"); // Redirige vers la page d'accueil après la déconnexion
  });
});

app.get("/", (req, res) => {
  res.render("index", { user });
});

app.post("/links", ensureAuthenticated, async (req, res) => {
  try {
    const shortLink = await createObjet(req, res);
    console.log(shortLink);
    res.redirect("/links");
  } catch (err) {
    res.sendStatus(500);
  }
});

app.delete("/delete-link", ensureAuthenticated, async (req, res) => {
  const { id } = req.body;
  const linkIndex = links.findIndex((l) => l.id === id);

  if (linkIndex !== -1) {
    links[linkIndex].valid = false;
    updateDBJSON(linkPath, links);
    res.render("links");
  } else {
    res.status(404).redirect("404");
  }
});

app.get("/links", ensureAuthenticated, (req, res) => {
  res.render("links", { user, links });
});

app.get("/:shortLinkId", (req, res) => {
  const { shortLinkId } = req.params;
  const link = links.find((l) => l.id === shortLinkId);

  if (link && link.valid) {
    res.redirect(link.originalLink);
  } else {
    res.status(404).render("404", { user });
  }
});

app.get("/*", (req, res, next) => {
  res.render("404", { user });
});

const port = 3000;
app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
