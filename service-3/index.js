const express = require("express");
const app = express();
require("dotenv").config({ path: "../.env" });
const ampq = require("amqplib");
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
  } catch (err) {
    console.log(err);
  }
}

app.get("/list-employee", async (req, res) => {
  try {
    let { page, term } = req.query;
    const limit = parseInt(process.env.PAGE_LIMIT);
    if (page < 1) page = 1;
    const offset = (page - 1) * limit;
    const total = await knex
      .count("* as count")
      .where("employee_name", "iLike", term)
      .orWhere("email", "iLike", term)
      .orWhere("company", "iLike", term)
      .from("employees")
      .first();
    const data = await knex
      .select("*")
      .from("employees")
      .where("employee_name", "iLike", term)
      .orWhere("email", "iLike", term)
      .orWhere("company", "iLike", term)
      .offset(offset)
      .limit(limit);
    return res.status(200).json({
      total: total.count,
      data,
    });
  } catch (err) {
    console.log(err);
  }
});

const port = process.env.SERVICE_3_PORT;

app.listen(port, () => {
  console.log(`Service listening on port: ${port}`);
});
