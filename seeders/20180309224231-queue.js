const CONSTANTS = require('../lib/constants');

module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.bulkInsert('Queues', [
        /* {
                league_id: 1,
                user_id: 1,
                ready: false,
                timestamp: new Date(),
                state: CONSTANTS.QUEUE_IN_QUEUE,
                created_at: new Date(),
                updated_at: new Date()
            }, */
        {
            league_id: 1,
            user_id: 2,
            ready: false,
            timestamp: new Date(),
            state: CONSTANTS.QUEUE_IN_QUEUE,
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            league_id: 1,
            user_id: 3,
            ready: false,
            timestamp: new Date(),
            state: CONSTANTS.QUEUE_IN_QUEUE,
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            league_id: 1,
            user_id: 4,
            ready: false,
            timestamp: new Date(),
            state: CONSTANTS.QUEUE_IN_QUEUE,
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            league_id: 1,
            user_id: 5,
            ready: false,
            timestamp: new Date(),
            state: CONSTANTS.QUEUE_IN_QUEUE,
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            league_id: 1,
            user_id: 6,
            ready: false,
            timestamp: new Date(),
            state: CONSTANTS.QUEUE_IN_QUEUE,
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            league_id: 1,
            user_id: 7,
            ready: false,
            timestamp: new Date(),
            state: CONSTANTS.QUEUE_IN_QUEUE,
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            league_id: 1,
            user_id: 8,
            ready: false,
            timestamp: new Date(),
            state: CONSTANTS.QUEUE_IN_QUEUE,
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            league_id: 1,
            user_id: 9,
            ready: false,
            timestamp: new Date(),
            state: CONSTANTS.QUEUE_IN_QUEUE,
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            league_id: 1,
            user_id: 10,
            ready: false,
            timestamp: new Date(),
            state: CONSTANTS.QUEUE_IN_QUEUE,
            created_at: new Date(),
            updated_at: new Date(),
        },
    ], {}),

    down: (queryInterface, Sequelize) => queryInterface.bulkDelete('Queues', null, {}),
};