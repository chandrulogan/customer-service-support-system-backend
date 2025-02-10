// const { consumer } = require("../../kafkaConfig");
// const Queue = require("../../schema/queue_Schema");
// const Employee = require("../../schema/employee_Schema");
// const Customer = require("../../schema/customers_Schema");
// const Assignment = require("../../schema/assignment_Schema"); // New schema to track assignments
// const { getSocketInstance } = require("../../socket");

// let io;
// setTimeout(() => {
//     try {
//         io = getSocketInstance();
//     } catch (error) {
//         console.error("Error initializing WebSocket:", error.message);
//     }
// }, 1000);

// // In-memory cache for available agents
// const availableAgentsMap = new Map();

// /**
//  * Assigns a customer to an available agent and updates DB.
//  */
// const assignCustomerToAgent = async (customerId, queryType) => {
//     console.log("availableAgentsMap:", availableAgentsMap);
//     let matchingAgent = availableAgentsMap.get(queryType);

//     if (!matchingAgent) {
//         console.log(`No agent available for query type: ${queryType}, adding to queue.`);
//         await new Queue({ customer: customerId, issue: queryType }).save();
//         return;
//     }

//     const { agentId, name } = matchingAgent;

//     // Update agent in DB: Mark as unavailable
//     await Employee.findOneAndUpdate(
//         { agentId },
//         { isAvailable: false, lastAssigned: new Date() }
//     );

//     // Remove agent from cache
//     availableAgentsMap.delete(queryType);

//     // Update customer with assigned agent
//     await Customer.findOneAndUpdate(
//         { _id: customerId },
//         { assignedAgent: agentId }
//     );

//     // Create an assignment entry (optional, but useful for tracking)
//     await Assignment.create({ customerId, agentId, queryType });

//     console.log(`✅ Matched Customer ${customerId} with Agent ${agentId} for ${queryType}`);

//     // Remove customer from queue if they were waiting
//     await Queue.deleteOne({ customer: customerId });

//     // Send real-time notification
//     io.emit("agent-assigned", {
//         message: "Agent assigned successfully!",
//         customerId,
//         agentId,
//     });
// };

// /**
//  * Kafka Consumer for Customer Requests & Agent Updates
//  */
// const startAgentAssignmentConsumer = async () => {
//     await consumer.subscribe({ topics: ["topic_0", "topic_2"], fromBeginning: false });

//     await consumer.run({
//         eachMessage: async ({ topic, message }) => {
//             try {
//                 const data = JSON.parse(message.value.toString());

//                 if (topic === "topic_0") {
//                     // 🔹 New customer request
//                     console.log("Received customer request:", data);
//                     const { id: customerId, connect_Reason } = data;

//                     // Try assigning an agent immediately
//                     await assignCustomerToAgent(customerId, connect_Reason);
//                 }

//                 else if (topic === "topic_2") {
//                     // 🔹 New agent update (availability change)
//                     console.log("Received agent data:", data);
//                     const { agentId, name, organisation, location, queryTypes, isAvailable } = data?.agent;
                    
//                     // Update agent in DB
//                     await Employee.findOneAndUpdate(
//                         { agentId },
//                         {
//                             $set: {
//                                 name,
//                                 organisation,
//                                 location: location || "Unknown",
//                                 queryTypes: queryTypes || ["General Inquiry"],
//                                 isAvailable: isAvailable ?? true,
//                             },
//                         },
//                         { upsert: true, new: true }
//                     );

//                     console.log(`✅ Employee ${agentId} updated/added successfully.`);

//                     // If agent is available, add to cache
//                     if (isAvailable) {
//                         for (const queryType of queryTypes) {
//                             availableAgentsMap.set(queryType, { agentId, name });
//                         }

//                         // Check if any queued customers match this agent
//                         for (const queryType of queryTypes) {
//                             const queuedCustomer = await Queue.findOne({ issue: queryType });
//                             if (queuedCustomer) {
//                                 console.log(`🔄 Assigning queued customer ${queuedCustomer.customer} to Agent ${agentId}`);
//                                 await assignCustomerToAgent(queuedCustomer.customer, queryType);
//                                 break; // Assign one customer per update
//                             }
//                         }
//                     }
//                 }
//             } catch (error) {
//                 console.error("Error processing Kafka message:", error);
//             }
//         },
//     });
// };

// module.exports = { startAgentAssignmentConsumer };


// only logs
const { consumer } = require("../../kafkaConfig");

const startAgentAssignmentConsumer = async () => {
    await consumer.subscribe({ topics: ["topic_0", "topic_2"], fromBeginning: true }); // Replays all messages

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            try {
                const data = JSON.parse(message.value.toString());
                console.log(`📥 [Partition: ${partition}] Received message from ${topic}:`, data);
            } catch (error) {
                console.error("❌ Error processing Kafka message:", error);
            }
        },
    });
};

module.exports = { startAgentAssignmentConsumer };
