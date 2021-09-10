const express = require("express");
const app = express();
require("dotenv").config({ path: "../.env" });
const ampq = require("amqplib");
const multer = require("multer");
const fs = require("fs");
const { join } = require("path");
var channel, connection;
connect();

async function connect() {
  try {
    const amqpServer = `amqp://${process.env.RABBIT_HOST}:${process.env.RABBIT_PORT}`;
    console.log(amqpServer);
    connection = await ampq.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue("rabbit");
  } catch (err) {
    console.log(err);
  }
}

app.use(express.json());

app.post(
  "/csv-upload",
  multer({ dest: "uploads/" }).single("file"),
  async (req, res) => {
    try {
      const path = join(__dirname, req.file.path);
      const jsonString = fs.readFileSync(path, "utf-8");
      await channel.sendToQueue("rabbit", Buffer.from(jsonString));
      return res.send("file upload done");
    } catch (err) {
      console.log(err);
    }
  }
);

const port = process.env.SERVICE_1_PORT;

app.listen(port, () => {
  console.log(`Service listening on port: ${port}`);
});
