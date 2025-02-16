const redis = require('../redisClient');

const VALID_QUERY_TYPES = ["Billing", "Technical Support", "General Inquiry"]; // Allowed query types

const assignAgentToCustomer = async () => {
    return
    try {
        for (const queryType of VALID_QUERY_TYPES) {
            const agentData = await redis.rpop(`agentQueue:${queryType}`); // Get the oldest agent
            const customerData = await redis.rpop(`customerQueue:${queryType}`); // Get the oldest customer

            if (!agentData && customerData) {
                // No agent, but a customer exists → Push customer back to the queue
                await redis.lpush(`customerQueue:${queryType}`, customerData);
                console.log(`[${queryType}] No agents available. Customer pushed back to queue.`);
                continue;
            }

            if (agentData && !customerData) {
                // No customer, but an agent exists → Push agent back to the queue
                await redis.lpush(`agentQueue:${queryType}`, agentData);
                console.log(`[${queryType}] No customers available. Agent pushed back to queue.`);
                continue;
            }

            if (!agentData && !customerData) {
                console.log(`[${queryType}] No available agents or customers. Skipping...`);
                continue;
            }

            // Parse agent & customer data
            const agent = JSON.parse(agentData);
            const customer = JSON.parse(customerData);

            console.log(`✅ Assigned Agent ${agent.name} (ID: ${agent.agentId}) to Customer ${customer.name} (ID: ${customer.id}) (queryType: ${queryType})`);

            // Save assignment in MongoDB (Queue Schema) if required

            // Optionally: Notify agent & customer via WebSockets (future enhancement)
        }
    } catch (error) {
        console.error('❌ Error in worker function:', error);
    }
};

// Run worker every 5 seconds
setInterval(assignAgentToCustomer, 5000);

module.exports = assignAgentToCustomer;
