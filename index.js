require("dotenv").config();
const serverless = require("serverless-http");
const port = process.env.PORT || 3000;
const express = require("express");
const session = require("express-session");
const PostgreSQLStore = require("connect-pg-simple")(session);
const passport = require("passport");
const GitHubStrategy = require("passport-github").Strategy;
const { Client } = require("pg");

const app = express();

const { ensureAuthenticated, createObjet, ensureValidUrl } = require("./link");

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.use(express.static(__dirname + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pgPool = new Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
});

pgPool.connect();

app.use(
  session({
    store: new PostgreSQLStore({
      pool: pgPool,
      tableName: "sessions",
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function (id, cb) {
  pgPool.query("SELECT * FROM users WHERE id = $1", [id], (err, result) => {
    if (err) {
      return cb(err);
    }
    cb(null, result.rows[0]);
  });
});

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.Call_Back_URL,
    },
    function (accessToken, refreshToken, profile, cb) {
      const user = profile._json;
      const query = {
        text: "INSERT INTO users (id, login, avatar_url, html_url, name, email, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET login = EXCLUDED.login, avatar_url = EXCLUDED.avatar_url, html_url = EXCLUDED.html_url, name = EXCLUDED.name, email = EXCLUDED.email, updated_at = EXCLUDED.updated_at",
        values: [
          user.id,
          user.login,
          user.avatar_url,
          user.html_url,
          user.name,
          user.email,
          new Date(),
          new Date(),
        ],
      };
      pgPool.query(query, (err) => {
        if (err) {
          return cb(err);
        }
        cb(null, profile);
      });
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
  res.render("login", { user: req.user });
});

app.get("/logout", (req, res) => {
  req.logOut((err) => {
    if (err) {
      console.error("Erreur lors de la déconnexion :", err);
      return next(err);
    }
    res.redirect("/"); // Redirige vers la page d'accueil après la déconnexion
  });
});

app.get("/", (req, res) => {
  res.render("index", { user: req.user });
});

app.post("/links", ensureAuthenticated, async (req, res) => {
  try {
    const shortLink = await createObjet(req, res, pgPool);
    res.redirect("/links");
  } catch (err) {
    res.sendStatus(500);
  }
});

app.delete("/delete-link", ensureAuthenticated, async (req, res) => {
  const { id } = req.body;
  pgPool.query(
    "UPDATE links SET valid = false WHERE id = $1",
    [id],
    (err, result) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.redirect("/links");
      }
    }
  );
});

app.get("/links", ensureAuthenticated, (req, res) => {
  pgPool.query(
    "SELECT * FROM links WHERE userId = $1 AND valid = true",
    [req.user.id],
    (err, result) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.render("links", { user: req.user, links: result.rows });
      }
    }
  );
});

app.get("/:shortLinkId", (req, res) => {
  const { shortLinkId } = req.params;
  pgPool.query(
    "SELECT * FROM links WHERE shortid = $1 AND valid = true",
    [shortLinkId],
    (err, result) => {
      if (err || result.rows.length === 0) {
        res.status(404).render("404", { user: req.user });
      } else {
        res.redirect(result.rows[0].originallink);
      }
    }
  );
});

app.get("/*", (req, res) => {
  res.render("404", { user: req.user });
});

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});

module.exports.handler = serverless(app);
