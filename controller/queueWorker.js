const redis = require('../redisClient'); // Import Redis client
const { getSocketInstance } = require("../socket"); // Import socket instance

const processQueue = async (queueType) => {
    try {
        const agentQueue = `agentQueue:${queueType}`;
        const customerQueue = `customerQueue:${queueType}`;

        while (true) {
            // Recalculate the queue size inside the loop
            const agentCount = await redis.llen(agentQueue);
            const customerCount = await redis.llen(customerQueue);

            console.log(`${queueType} Queue Status - Agents: ${agentCount}, Customers: ${customerCount}`);

            // Stop if either queue is empty
            if (agentCount === 0 || customerCount === 0) {
                console.warn(`⚠️ ${queueType} Queue processing stopped - No available agents or customers.`);
                break;
            }

            const agentData = await redis.rpop(agentQueue);
            const customerData = await redis.rpop(customerQueue);

            if (!agentData || !customerData) {
                console.warn(`⚠️ ${queueType} Skipping due to missing data (agent or customer queue is empty).`);
                break;
            }

            const agent = JSON.parse(agentData);
            const customer = JSON.parse(customerData);

            console.log(`✅ ${queueType} Assigned Agent ${agent?.name} (ID: ${agent?.agentId}) to Customer ${customer?.name} (ID: ${customer?.id})`);

            // 🔹 Create a unique room ID
            const roomId = `${customer.id}`;

            // 🔹 Emit WebSocket event to both agent and customer
            const io = getSocketInstance();
            io.to(agent.agentId).emit("notifyAgent", { roomId, agent, customer });
            io.to(customer.id).emit("notifyCustomer", { roomId, agent, customer });

            console.log(`📢 Notified agent ${agent.agentId} and customer ${customer.id} to join room ${roomId}`);
        }
    } catch (error) {
        console.error(`❌ Error processing queue update:`, error);
    }
};

// Subscribe to Redis Pub/Sub for real-time queue updates
const subscriber = redis.duplicate(); // Create a separate Redis connection for subscription

subscriber.subscribe("queueUpdate", (err, count) => {
    if (err) {
        console.error("❌ Redis subscription error:", err);
    } else {
        console.log(`✅ Subscribed to ${count} channels.`);
    }
});

subscriber.on("message", (channel, message) => {
    console.log(`📢 Queue update received on "${channel}":`, message);

    if (!message) {
        console.error("❌ Received null or empty message!");
        return;
    }

    try {
        const data = JSON.parse(message);
        console.log("🔄 Processing queue item:", data);
        processQueue(data?.queryType)
    } catch (error) {
        console.error("❌ JSON Parsing Error:", error.message, "Message received:", message);
    }
});

console.log("🔄 Queue Worker is listening for queue updates...");

module.exports = processQueue;
