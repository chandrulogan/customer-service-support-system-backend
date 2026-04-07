const { redis, isRedisConfigured } = require('../redisClient');
const { getSocketInstance } = require("../socket");

const processQueue = async (queueType) => {
    if (!redis || !queueType) {
        return;
    }

    try {
        const agentQueue = `agentQueue:${queueType}`;
        const customerQueue = `customerQueue:${queueType}`;

        while (true) {
            const agentCount = await redis.llen(agentQueue);
            const customerCount = await redis.llen(customerQueue);

            console.log(`${queueType} Queue Status - Agents: ${agentCount}, Customers: ${customerCount}`);

            if (agentCount === 0 || customerCount === 0) {
                console.warn(`${queueType} queue processing stopped - no available agents or customers.`);
                break;
            }

            const agentData = await redis.rpop(agentQueue);
            const customerData = await redis.rpop(customerQueue);

            if (!agentData || !customerData) {
                console.warn(`${queueType} skipped due to missing queue data.`);
                break;
            }

            const agent = JSON.parse(agentData);
            const customer = JSON.parse(customerData);

            console.log(`${queueType} assigned agent ${agent?.name} (${agent?.agentId}) to customer ${customer?.name} (${customer?.id})`);

            const roomId = `${customer.id}`;
            const io = getSocketInstance();

            io.to(agent.agentId).emit("notifyAgent", { roomId, agent, customer });
            io.to(customer.id).emit("notifyCustomer", { roomId, agent, customer });
        }
    } catch (error) {
        console.error('Error processing queue update:', error.message);
    }
};

if (isRedisConfigured() && redis) {
    const subscriber = redis.duplicate();

    subscriber.on("error", (err) => {
        console.error("Redis subscription error:", err.message);
    });

    subscriber.subscribe("queueUpdate", (err, count) => {
        if (err) {
            console.error("Redis subscription error:", err.message);
            return;
        }

        console.log(`Subscribed to ${count} Redis channel(s).`);
    });

    subscriber.on("message", (channel, message) => {
        if (!message) {
            console.error("Received null or empty Redis message.");
            return;
        }

        try {
            const data = JSON.parse(message);
            processQueue(data?.queryType);
        } catch (error) {
            console.error("JSON parsing error:", error.message, "Message received:", message);
        }
    });
} else {
    console.warn("Queue worker started without Redis subscription because Redis is disabled.");
}

module.exports = processQueue;
