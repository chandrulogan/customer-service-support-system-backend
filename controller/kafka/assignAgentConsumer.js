const { consumer } = require("../../kafkaConfig");
const Queue = require("../../schema/queue_Schema");
const Employee = require("../../schema/employee_Schema");
const Customer = require("../../schema/customers_Schema");
const { getSocketInstance } = require("../../socket"); // Fix the import

let io;

// ✅ Delay WebSocket Initialization to Avoid "Not Initialized" Error
setTimeout(() => {
    try {
        io = getSocketInstance();
    } catch (error) {
        console.error("Error initializing WebSocket:", error.message);
    }
}, 1000);

// Function to get an available agent
const getAvailableAgent = async () => {
    return await Employee.findOne({ isAvailable: true }).sort({ lastAssigned: 1 });
};

// Kafka Consumer for agent assignment
const startAgentAssignmentConsumer = async () => {
    await consumer.subscribe({ topic: "topic_0", fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ message }) => {
            try {
                const customerData = JSON.parse(message.value.toString());
                console.log("Received customer request:", customerData);

                const availableAgent = await getAvailableAgent();
                if (!availableAgent) {
                    console.log("No agents available, adding customer to queue.");
                    const queueItem = new Queue({ customer: customerData.id, issue: customerData.connect_Reason });
                    await queueItem.save();
                    return;
                }

                // Assign agent to customer
                availableAgent.isAvailable = false;
                availableAgent.lastAssigned = new Date();
                await availableAgent.save();

                const queueItem = new Queue({
                    customer: customerData.id,
                    assignedAgent: availableAgent._id,
                    issue: customerData.connect_Reason,
                    status: "In Progress"
                });
                await queueItem.save();

                // Send real-time notification
                io.emit("agent-assigned", {
                    message: "Agent assigned successfully!",
                    customerId: customerData.id,
                    agentId: availableAgent._id,
                });

                console.log(`Assigned agent ${availableAgent._id} to customer ${customerData.id}`);
            } catch (error) {
                console.error("Error processing Kafka message:", error);
            }
        },
    });
};

module.exports = { startAgentAssignmentConsumer };
