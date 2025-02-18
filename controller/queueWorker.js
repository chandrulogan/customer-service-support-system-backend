const redis = require('../redisClient'); // Import Redis client

// Function to process a specific queue
const processQueue = async (queueType) => {
    try {
        const agentQueue = `agentQueue:${queueType}`;
        const customerQueue = `customerQueue:${queueType}`;

        const agentCount = await redis.llen(agentQueue);
        const customerCount = await redis.llen(customerQueue);

        console.log(`${queueType} Queue Status - Agents: ${agentCount}, Customers: ${customerCount}`);

        while (agentCount > 0 && customerCount > 0) {
            const agentData = await redis.rpop(agentQueue);
            const customerData = await redis.rpop(customerQueue);

            // 🔴 Check for null before parsing
            if (!agentData || !customerData) {
                if (!agentData) return console.error(`⚠️ ${queueType} Agent queue is empty.`);
                return console.error(`⚠️ ${queueType} Customer queue is empty.`)
                // ❌ Do not continue processing if data is missing
            }

            // ✅ Now it's safe to parse
            const agent = JSON.parse(agentData);
            const customer = JSON.parse(customerData);

            console.log(`✅ ${queueType} Assigned Agent ${agent.name} (ID: ${agent.agentId}) to Customer ${customer.name} (ID: ${customer.id})`);

            // Save assignment in MongoDB (if needed)
            // Notify via WebSockets, etc.
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
