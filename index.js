const http = require("http");
const { MongoMemoryServer } = require("mongodb-memory-server");
const ParseDashboard = require("parse-dashboard");
const express = require("express");
const app = require("./app");
const { default: ParseServer, ParseGraphQLServer } = require("parse-server");
const path = require("path");
const { exec } = require("child_process");
const mongoose = require("mongoose");
const normalizePort = (val) => {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }
  if (port >= 0) {
    return port;
  }
  return false;
};
const port = normalizePort(process.env.PORT || "1337");

async function startServer() {
  // Créer une nouvelle instance de MongoMemoryServer
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27018, // specify your desired port here
    },
  });

  // Démarrer l'instance de MongoDB en mémoire et obtenir l'URI de connexion
  const mongoUri = mongod.getUri();
  // const mongoUri = "mongodb://localhost:27017/parse";
  mongoose.connect(mongoUri);
  const db = mongoose.connection;
  db.on("error", (err) => console.error(err.message));
  db.once("open", () => {
    console.log("Connection établie avec la base de données :)\n");
  });

  console.log(`MongoDB en mémoire démarré à l'adresse: ${mongoUri}`);

  const api = (req, res, next) => {
    new ParseServer({
      appId: "C7AL00DNH8VH",
      masterKey: "LX8ETD851GEN",
      appName: "calculatrice-topo",
      cloud: "./cloud/main.js",
      databaseURI: mongoUri + "testDB",
      serverURL: `http://localhost:${port}/parse`, // Don't forget to change to https if needed
    });
    next();
  };

  // Serve the Parse API on the /parse URL prefix
  app.use("/parse", api);

  const dashboard = new ParseDashboard(
    {
      apps: [
        {
          appId: "C7AL00DNH8VH",
          masterKey: "LX8ETD851GEN",
          appName: "calculatrice-topo",
          serverURL: `http://localhost:${port}/parse`, // Don't forget to change to https if needed
        },
      ],
      users: [
        {
          user: "admin",
          pass: "admin",
        },
      ],
    },
    { allowInsecureHTTP: true }
  );

  // Serve static files from the Vue.js frontend
  app.use(express.static(path.join(__dirname, "./dist")));

  // Serve the Vue.js frontend for any other routes
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "./dist", "index.html"));
  });

  // Serve the Parse Dashboard on the /dashboard URL prefix
  app.use("/dashboard", dashboard);

  const errorHandler = (error) => {
    if (error.syscall !== "listen") {
      throw error;
    }
    const address = server.address();
    const bind =
      typeof address === "string" ? "pipe " + address : "port: " + port;
    switch (error.code) {
      case "EACCES":
        console.error(bind + " requires elevated privileges.");
        process.exit(1);
        break;
      case "EADDRINUSE":
        console.error(bind + " is already in use.");
        process.exit(1);
        break;
      default:
        throw error;
    }
  };

  app.set("port", port);
  const server = http.createServer(app);

  server.on("error", errorHandler);
  server.on("listening", () => {
    const address = server.address();
    const bind =
      typeof address === "string" ? "pipe " + address : "port " + port;
    console.log("Listening on " + bind);
  });

  server.listen(port, () => {
    const address = server.address();
    console.log("Parse Server en cours d'exécution sur le port " + port + ".");

    const os = require("os");

    const networkInterfaces = os.networkInterfaces();

    console.log("Le serveur est joignable sur les adresses suivantes :");

    console.log("Selon les interfaces de réseau :");
    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      for (const iface of interfaces) {
        if (iface.family === "IPv4" && !iface.internal) {
          console.log(` - ${name}: http://${iface.address}:${address.port}`);
        }
      }
    }
    console.log("======================================\n");
    exec(`start http://localhost:${port}`);
  });
}

startServer().catch((err) => console.error(err));
