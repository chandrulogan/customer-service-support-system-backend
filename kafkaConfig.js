const { Kafka } = require("kafkajs");
const fs = require("fs");

// Function to read Kafka configurations from a properties file
function readConfig(fileName) {
    const data = fs.readFileSync(fileName, "utf8").toString().split("\n");
    return data.reduce((config, line) => {
        const [key, value] = line.split("=");
        if (key && value) {
            config[key.trim()] = value.trim();
        }
        return config;
    }, {});
}

// Load Kafka configurations from the client.properties file
const config = readConfig("client.properties");

// Initialize Kafka instance with security configurations
const kafka = new Kafka({
    clientId: config["client.id"],
    brokers: [config["bootstrap.servers"]],
    ssl: true,
    sasl: {
        mechanism: "plain", // Mechanism is case-sensitive
        username: config["sasl.username"],
        password: config["sasl.password"],
    },
});

// Create a Kafka producer instance
const producer = kafka.producer();

// Create a Kafka consumer instance with a specific group ID
const consumer = kafka.consumer({ groupId: "nodejs-group-1" });

// Function to establish connections for both producer and consumer
async function connectKafka() {
    await producer.connect();
    await consumer.connect();
    console.log("Kafka producer and consumer connected.");
}

// Export the Kafka instances and connection function
module.exports = { producer, consumer, connectKafka, kafka };