const express = require("express");
const app = express();
require("dotenv").config({ path: "../.env" });
const ampq = require("amqplib");
const csv = require("csvtojson");
var channel, connection;
connect();
const knex = require("knex")({
  client: "pg",
  connection: process.env.PG_CONNECTION_STRING,
  searchPath: ["knex", "public"],
});

async function connect() {
  try {
    const amqpServer = `amqp://${process.env.RABBIT_HOST}:${process.env.RABBIT_PORT}`;
    connection = await ampq.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue("rabbit");

    channel.consume("rabbit", (data) => {
      channel.ack(data);
      const content = Buffer.from(data.content).toString("utf-8");
      csv({
        noheader: false,
        output: "json",
      })
        .fromString(content)
        .then(async (csvRow) => {
          knex.schema
            .createTableIfNotExists("employees", (table) => {
              table.increments();
              table.string("employee_name");
              table.string("phone_number");
              table.string("email");
              table.string("company");
            })
            .then(async () => {
              await knex("employees").insert(csvRow);
            });
        })
        .catch((err) => {
          console.log(err);
        });
    });
  } catch (err) {
    console.log(err);
  }
}

const port = process.env.SERVICE_2_PORT;

app.listen(port, () => {
  console.log(`Service listening on port: ${port}`);
});
