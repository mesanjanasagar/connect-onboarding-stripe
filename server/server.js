require("dotenv").config();
const express = require("express");
const { resolve } = require("path");
const session = require("express-session");

const app = express();
const port = process.env.PORT || 4242;

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(express.static(process.env.STATIC_DIR));
app.use(
  session({
    secret: "random_string",
    resave: false,
    saveUninitialized: true,
  })
);

app.get("/", (req, res) => {
  const path = resolve(process.env.STATIC_DIR + "/index.html");
  res.sendFile(path);
});

app.post("/onboard-user", async (req, res) => {
  try {
    const account = await stripe.accounts.create({
      type: 'standard',
    });

    // Store the ID of the new Standard connected account.
    req.session.accountID = account.id;

    const origin = `${req.headers.origin}`;
    const accountLink = await stripe.accountLinks.create({
      type: "account_onboarding",
      account: account.id,
      refresh_url: `${origin}/onboard-user/refresh`,
      return_url: `${origin}/success.html`,
    });

    res.redirect(303, accountLink.url);
  } catch (err) {
    res.status(500).send({
      error: err.message,
    });
  }
});

app.get("/onboard-user/refresh", async (req, res) => {
  if (!req.session.accountID) {
    res.redirect("/");
    return;
  }

  try {
    const { accountID } = req.session;
    const origin = `${req.secure ? "https://" : "http://"}${req.headers.host}`;

    const accountLink = await stripe.accountLinks.create({
      type: "account_onboarding",
      account: accountID,
      refresh_url: `${origin}/onboard-user/refresh`,
      return_url: `${origin}/success.html`,
    });

    res.redirect(303, accountLink.url);
  } catch (err) {
    res.status(500).send({
      error: err.message,
    });
  }
});

app.listen(port, () => console.log(`Node server listening at http://localhost:${port}!`));
