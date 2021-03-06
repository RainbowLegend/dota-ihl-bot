/**
 * @module db
 */
 
 /**
 * Sequelize Model object
 * @external Model
 * @see {@link http://docs.sequelizejs.com/class/lib/model.js~Model.html}
 */
 
/**
 * @typedef module:db.League
 * @type {external:Model}
 */
 
/**
 * @typedef module:db.User
 * @type {external:Model}
 */
 
/**
 * @typedef module:db.Challenge
 * @type {external:Model}
 */
 
const Sequelize = require('sequelize');
const db = require('../models');
const CONSTANTS = require('./constants');

const Op = Sequelize.Op;

const findAllLeagues = async () => db.League.findAll();

const findAllActiveLobbies = async guild_id => db.Lobby.findAll({ where: { state: { [Op.notIn]: [CONSTANTS.STATE_MATCH_ENDED, CONSTANTS.STATE_KILLED, CONSTANTS.STATE_FAILED] } }, include: [{ model: db.League, where: { guild_id: guild_id } }] });

const findActiveLobbiesForUser = async user => user.getLobbies({ where: { state: { [Op.notIn]: [CONSTANTS.STATE_MATCH_ENDED, CONSTANTS.STATE_KILLED, CONSTANTS.STATE_FAILED] } } });

const findAllInProgressLobbies = async () => db.Lobby.findAll({ where: { state: CONSTANTS.STATE_MATCH_IN_PROGRESS } });

const findAllEnabledQueues = async guild_id => db.Queue.findAll({ where: { enabled: true }, include: [{ model: db.League, where: { guild_id: guild_id } }] });

const findLeague = async guild_id => db.League.findOne({ where: { guild_id } });

const findOrCreateLeague = guild_id => async (queues) => db.sequelize.transaction(async (t) => {
    const [league] = await db.League.findOrCreate({
        where: { guild_id },
        transaction: t,
    });
    const [season] = await db.Season.findOrCreate({
        where: { league_id: league.id, active: true },
        include: [db.League],
        transaction: t,
    });
    await league.update({ current_season_id: season.id }, { transaction: t });
    for (const queue of queues) {
        await db.Queue.findOrCreate({
            where: { league_id: league.id, enabled: true, ...queue },
            include: [db.League],
            transaction: t,
        });
    }
    return league;
});

const createSeason = async guild_id => db.sequelize.transaction(async (t) => {
    const league = await findLeague(guild_id);
    await db.Season.update({ active: false }, { where: { league_id: league.id }, transaction: t });
    const season = await db.Season.create({ league_id: league.id, active: true }, { transaction: t });
    await league.update({ current_season_id: season.id }, { transaction: t });
    return season;
});

const findOrCreateBot = async (league, steamid_64, steam_name, steam_user, steam_pass) => db.Bot.findOrCreate({
    where: {
        league_id: league.id,
        steamid_64,
        steam_name,
        steam_user,
        steam_pass,
    },
}).spread(bot => bot);

const findOrCreateLobby = async (league, queue_type, lobby_name) => db.Lobby.findOrCreate({
    where: { league_id: league.id, season_id: league.current_season_id, lobby_name },
    defaults: { queue_type, state: CONSTANTS.STATE_NEW },
    include: [{
        model: db.League,
        where: {
            id: league.id,
        },
    }],
}).spread(lobby => lobby);

const findOrCreateLobbyForGuild = async (guild_id, queue_type, lobby_name) => findOrCreateLobby(await findLeague(guild_id), queue_type, lobby_name);

const findLobby = async lobby_name => db.Lobby.scope({ method: ['lobby_name', lobby_name] }).find();

const findBot = async id => db.Bot.findOne({ where: { id } });

const findAllUnassignedBot = async () => db.Bot.findAll({
    where: { '$Lobbies.bot_id$': { [Op.eq]: null } },
    include: [db.Lobby]
});

const findUnassignedBot = async () => findAllUnassignedBot().then(bots => bots[0]);
    
const findUserById = async id => db.User.scope({ method: ['id', id] }).find();

const findUserByDiscordId = guild_id => async discord_id => db.User.scope({ method: ['guild', guild_id] }, { method: ['discord_id', discord_id] }).find();

const findUserBySteamId64 = guild_id => async steamid_64 => db.User.scope({ method: ['guild', guild_id] }, { method: ['steamid_64', steamid_64] }).find();

const findUserByNicknameLevenshtein = member => db.sequelize.query('SELECT * FROM "Users" WHERE levenshtein(LOWER(nickname), LOWER(:nickname)) < 2', { replacements: { nickname: member }, model: db.User });

const findOrCreateUser = async (league, steamid_64, discord_id, rank_tier) => db.User.findOrCreate({
    where: {
        league_id: league.id, steamid_64, discord_id, rank_tier,
    },
    include: [{
        model: db.League,
        where: {
            id: league.id,
        },
    }],
}).spread(user => user);

const findOrCreateQueue = async (league, enabled, queue_type, queue_name) => db.Queue.findOrCreate({
    where: { league_id: league.id, enabled, queue_type, queue_name },
    include: [{
        model: db.League,
        where: {
            id: league.id,
        },
    }],
}).spread(queue => queue);

const findLobbyByMatchId = async match_id => db.Lobby.findOne({ where: { match_id } });

const queryUserLeaderboardRank = league_id => season_id => async user_id => db.sequelize.query('SELECT rank FROM (SELECT *, rank() OVER (ORDER BY rating DESC) FROM "Leaderboards" WHERE league_id = :league_id AND season_id = :season_id) AS ranking WHERE user_id = :user_id LIMIT 1',
    { replacements: { league_id, season_id, user_id }, type: db.sequelize.QueryTypes.SELECT }).then(([rank]) => (rank ? rank.rank : null));

const queryLeaderboardRank = league_id => season_id => async limit => db.sequelize.query('SELECT * FROM (SELECT *, rank() OVER (ORDER BY rating DESC) FROM "Leaderboards" WHERE league_id = :league_id AND season_id = :season_id LIMIT :limit) AS ranking INNER JOIN "Users" as users ON ranking.user_id = users.id',
    { replacements: { league_id, season_id, limit }, type: db.sequelize.QueryTypes.SELECT });


const updateLeague = guild_id => async values => db.League.update(values, { where: { guild_id } });

const updateLobbyName = old_name => async new_name => db.Lobby.update({ lobby_name: new_name }, { where: { lobby_name: old_name } });

const updateLobbyState = async lobbyOrState => db.Lobby.update(lobbyOrState, { where: { lobby_name: lobbyOrState.lobby_name } });

const updateBotStatusBySteamId = status => async steamid_64 => db.Bot.update({ status }, { where: { steamid_64 } });

const updateBotStatus = status => async id => db.Bot.update({ status }, { where: { id } });

const updateQueuesForUser = active => async user => {
    const queues = await user.getQueues();
    for (queue of queues) {
        queue.LobbyQueuer.active = active;
        await queue.LobbyQueuer.save();
    }
    return user;
}

const destroyQueueByName = league => async queue_name => db.Queue.destroy({ where: { queue_name, league_id: league.id } });

const findOrCreateReputation = league => giver => async receiver => db.Reputation.findOrCreate({
    where: { league_id: league.id, recipient_user_id: receiver.id, giver_user_id: giver.id },
    include: [{
        model: db.League,
        where: {
            id: league.id,
        },
    }],
}).spread(rep => rep);

const destroyReputation = league => giver => async receiver => db.Reputation.destroy({ where: { recipient_user_id: receiver.id, giver_user_id: giver.id, league_id: league.id } });

const getChallengeBetweenUsers = giver => receiver => giver.getChallengesGiven({ where: { recipient_user_id: receiver.id } }).then(challenges => challenges[0]);

const createChallenge = giver => receiver => db.Challenge.create({ accepted: false, giver_user_id: giver.id, recipient_user_id: receiver.id });

const destroyChallengeBetweenUsers = giver => async (receiver) => db.Challenge.destroy({ where: { giver_user_id: giver.id, recipient_user_id: receiver.id } });

const destroyAllAcceptedChallengeForUser = async (user) => {
    await db.Challenge.destroy({ where: { giver_user_id: user.id, accepted: true } });
    await db.Challenge.destroy({ where: { recipient_user_id: user.id, accepted: true } });
}

const setChallengeAccepted = challenge => challenge.update({ accepted: true });

module.exports = {
    findAllLeagues,
    findAllActiveLobbies,
    findActiveLobbiesForUser,
    findAllInProgressLobbies,
    findAllEnabledQueues,
    findLeague,
    findOrCreateLeague,
    createSeason,
    findOrCreateBot,
    findOrCreateLobby,
    findOrCreateLobbyForGuild,
    findLobby,
    findBot,
    findAllUnassignedBot,
    findUnassignedBot,
    findOrCreateUser,
    findOrCreateQueue,
    findLobbyByMatchId,
    findUserById,
    findUserByDiscordId,
    findUserBySteamId64,
    findUserByNicknameLevenshtein,
    queryUserLeaderboardRank,
    queryLeaderboardRank,
    updateLeague,
    updateLobbyName,
    updateLobbyState,
    updateBotStatusBySteamId,
    updateBotStatus,
    updateQueuesForUser,
    destroyQueueByName,
    findOrCreateReputation,
    destroyReputation,
    getChallengeBetweenUsers,
    createChallenge,
    setChallengeAccepted,
    destroyChallengeBetweenUsers,
    destroyAllAcceptedChallengeForUser,
};
