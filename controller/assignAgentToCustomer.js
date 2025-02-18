const redis = require('../redisClient');

// Function to process a specific queue
const processQueue = async (queueType) => {
    try {
        while (true) {
            const agentQueue = `agentQueue:${queueType}`;
            const customerQueue = `customerQueue:${queueType}`;

            const agentCount = await redis.llen(agentQueue);
            const customerCount = await redis.llen(customerQueue);

            console.log(`[${queueType}] Queue Status - Agents: ${agentCount}, Customers: ${customerCount}`);

            if (agentCount > 0 && customerCount > 0) {
                const agentData = await redis.rpop(agentQueue);
                const customerData = await redis.rpop(customerQueue);

                if (agentData && customerData) {
                    const agent = JSON.parse(agentData);
                    const customer = JSON.parse(customerData);

                    console.log(`✅ [${queueType}] Assigned Agent ${agent.name} (ID: ${agent.agentId}) to Customer ${customer.name} (ID: ${customer.id})`);

                    // Save assignment in MongoDB (Queue Schema) if required
                    // Optionally: Notify agent & customer via WebSockets
                }
            } else {
                console.log(`⏳ [${queueType}] Waiting for agents and customers...`);
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait before checking again
            }
        }
    } catch (error) {
        console.error(`❌ Error in ${queueType} worker:`, error);
    }
};

// Function to discover and process multiple queues dynamically
const startDynamicWorker = async () => {
    try {
        while (true) {
            // Fetch all keys that match agentQueue:* pattern (Dynamic discovery)
            const agentQueues = await redis.keys('agentQueue:*');

            if (agentQueues.length > 0) {
                const queueTypes = agentQueues.map(q => q.split(':')[1]); // Extract dynamic queue types
                console.log("Discovered Queues:", queueTypes);

                queueTypes.forEach(queueType => {
                    processQueue(queueType); // Start a worker for each queue type
                });

                break; // Exit loop after starting all workers
            } else {
                console.log("⏳ No active queues found. Retrying in 10 seconds...");
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait before retrying
            }
        }
    } catch (error) {
        console.error("❌ Error in queue discovery:", error);
    }
};

// Start the dynamic queue worker
module.exports = startDynamicWorker;
