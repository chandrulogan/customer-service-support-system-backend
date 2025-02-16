const redis = require('../redisClient');

const assignAgentToCustomer = async () => {
    try {
        const agentData = await redis.rpop('agentQueue'); // Get the oldest agent
        const customerData = await redis.rpop('customerQueue'); // Get the oldest customer

        if (!agentData) {
            if (customerData) await redis.lpush('customerQueue', customerData); // Push customer back to queue
            return;
        }

        if (!customerData) {
            await redis.lpush('agentQueue', agentData); // Push agent back to queue
            return;
        }

        // Parse agent & customer data
        const agent = JSON.parse(agentData);
        const customer = JSON.parse(customerData);

        console.log(`✅ Assigned Agent ${agent.name} (ID: ${agent.agentId}) to Customer ${customer.name} (ID: ${customer.id})`);

        // Save assignment in MongoDB (Queue Schema) if required

        // Optionally: Notify agent & customer via WebSockets (future enhancement)
    } catch (error) {
        console.error('❌ Error in worker function:', error);
    }
};

// Run worker every 5 seconds
setInterval(assignAgentToCustomer, 5000);

module.exports = assignAgentToCustomer;
