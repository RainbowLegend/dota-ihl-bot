const chai = require('chai');
const assert = chai.assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');
const sequelizeMockingMocha = require('sequelize-mocking').sequelizeMockingMocha;
const crypto = require('crypto');
const steam = require('steam');
const dota2 = require('dota2');
const EventEmitter = require('events').EventEmitter;
const Long = require("long");
const {
    slotToFaction,
    updatePlayerState,
    isDotaLobbyReady,
    connectToSteam,
    logOnToSteam,
    connectToDota,
    updateServers,
    updateMachineAuth,
    defaultLobbyOptions,
    createSteamClient,
    createSteamUser,
    createSteamFriends,
    createDotaClient,
    createDotaBot,
    diffMembers,
    intersectMembers,
    membersToPlayerState,
    processMembers,
    invitePlayer,
    DotaBot,
} = proxyquire('../lib/dotaBot', {
    'fs': {
        writeFileSync: (path, data) => console.log('stub writeFileSync'),
        readFileSync: (path) => {
            console.log('stub readFileSync')
            return true;
        },
    },
});
const CONSTANTS = require('../lib/constants');
const Queue = require('../lib/util/queue');

const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

describe('Functions', () => {
    let sandbox = null;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox && sandbox.restore();
    });
    
    describe('slotToFaction', () => {
        it('return 1 for radiant', async () => {
            const slot = 0;
            const faction = slotToFaction(slot);
            assert.equal(dota2.schema.lookupEnum('DOTA_GC_TEAM').values.DOTA_GC_TEAM_GOOD_GUYS, slot);
            assert.equal(faction, 1);
        });
        
        it('return 2 for dire', async () => {
            const slot = 1;
            const faction = slotToFaction(slot);
            assert.equal(dota2.schema.lookupEnum('DOTA_GC_TEAM').values.DOTA_GC_TEAM_BAD_GUYS, slot);
            assert.equal(faction, 2);
        });
        
        it('return null when not 0 or 1', async () => {
            assert.isNull(slotToFaction(-1));
            assert.isNull(slotToFaction(2));
        });
    });
    
    describe('updatePlayerState', () => {
        it('return playerState with steamid_64 faction value 1', async () => {
            const steamid_64 = '123';
            const playerState = updatePlayerState(steamid_64, 0, {});
            assert.deepEqual(playerState, { [steamid_64]: 1 });
        });
        
        it('return playerState with steamid_64 faction value 2', async () => {
            const steamid_64 = '123';
            const playerState = updatePlayerState(steamid_64, 1, {});
            assert.deepEqual(playerState, { [steamid_64]: 2 });
        });
        
        it('return updated playerState', async () => {
            const steamid_64 = '123';
            let playerState = updatePlayerState(steamid_64, 0,  { [steamid_64]: 2 });
            assert.deepEqual(playerState, { [steamid_64]: 1 });
            playerState = updatePlayerState(steamid_64, 1,  playerState);
            assert.deepEqual(playerState, { [steamid_64]: 2 });
        });
        
        it('delete player', async () => {
            const playerState = updatePlayerState('1', null,  { '1': 1 });
            assert.deepEqual(playerState, {});
        });
        
        it('delete player when slot not 0 or 1', async () => {
            let playerState = updatePlayerState('1', -1,  { '1': 1 });
            assert.deepEqual(playerState, {});
            playerState = updatePlayerState('1', 2,  { '1': 1 });
            assert.deepEqual(playerState, {});
        });
        
        it('multiple players', async () => {
            let playerState = updatePlayerState('1', 0,  {});
            playerState = updatePlayerState('2', 1,  playerState);
            playerState = updatePlayerState('3', 0,  playerState);
            assert.deepEqual(playerState, { '1': 1, '2': 2, '3': 1 });
        });
        
        it('multiple players with a delete', async () => {
            let playerState = updatePlayerState('1', 0,  {});
            playerState = updatePlayerState('2', 1,  playerState);
            playerState = updatePlayerState('3', 0,  playerState);
            playerState = updatePlayerState('2', 2,  playerState);
            assert.deepEqual(playerState, { '1': 1, '3': 1 });
            playerState = updatePlayerState('1', null,  playerState);
            assert.deepEqual(playerState, { '3': 1 });
        });
    });
    
    describe('isDotaLobbyReady', () => {
        it('return true when fromCache is subset of playerState', async () => {
            const fromCache = {'1': 1, '2': 2, '3': 0, '4': 3};
            const playerState = {'1': 1, '2': 2, '3': 0, '4': 3, '5': 0, '6': 0, '7': 1}
            assert.isTrue(isDotaLobbyReady(fromCache, playerState));
        });
        
        it('return true when null', async () => {
            const fromCache = {'1': null};
            const playerState = {};
            assert.isTrue(isDotaLobbyReady(fromCache, playerState));
        });
        
        it('return false when 0', async () => {
            const fromCache = {'1': 0};
            const playerState = {};
            assert.isFalse(isDotaLobbyReady(fromCache, playerState));
        });
        
        it('return false when fromCache is not subset of playerState', async () => {
            const fromCache = {'1': 1, '2': 2, '3': 0, '4': 3, 'a': 0};
            const playerState = {'1': 1, '2': 2, '3': 0, '4': 3, '5': 0, '6': 0, '7': 1}
            assert.isFalse(isDotaLobbyReady(fromCache, playerState));
        });
    });
    
    describe('connectToSteam', () => {
        it('call connect and resolve on connected event with client', async () => {
            const steamClient = new EventEmitter();
            steamClient.connect = () => steamClient.emit('connected');
            sinon.spy(steamClient, "connect");
            const result = await connectToSteam(steamClient);
            assert.isTrue(steamClient.connect.calledOnce);
            assert.equal(steamClient, result);
        });
    });
    
    describe('logOnToSteam', () => {
        it('call logOn and resolve on logOnResponse event with client', async () => {
            const steamClient = new EventEmitter();
            steamClient.logOn = () => steamClient.emit('logOnResponse', { eresult: steam.EResult.OK });
            sinon.spy(steamClient, "logOn");
            const result = await logOnToSteam({})(steamClient);
            assert.isTrue(steamClient.logOn.calledOnce);
            assert.equal(steamClient, result);
        });
    
        it('call logOn and reject on logOnResponse event with steam.EResult.Fail', async () => {
            const steamClient = new EventEmitter();
            steamClient.logOn = () => steamClient.emit('logOnResponse', { eresult: steam.EResult.Fail });
            sinon.spy(steamClient, "logOn");
            return assert.isRejected(logOnToSteam({})(steamClient));
        });

        it('call logOn and reject on error event', async () => {
            const steamClient = new EventEmitter();
            steamClient.logOn = () => steamClient.emit('error');
            sinon.spy(steamClient, "logOn");
            return assert.isRejected(logOnToSteam({})(steamClient));
        });

        it('call logOn and reject on loggedOff event', async () => {
            const steamClient = new EventEmitter();
            steamClient.logOn = () => steamClient.emit('loggedOff');
            sinon.spy(steamClient, "logOn");
            return assert.isRejected(logOnToSteam({})(steamClient));
        });
        
        it('call logOn and resolve on logOnResponse event with client, ignore subsequent events', async () => {
            const steamClient = new EventEmitter();
            steamClient.logOn = () => {
                steamClient.emit('logOnResponse', { eresult: steam.EResult.OK });
                steamClient.emit('error');
                steamClient.emit('loggedOff');
                steamClient.emit('logOnResponse', { eresult: steam.EResult.OK });
            }
            sinon.spy(steamClient, "logOn");
            const result = await logOnToSteam({})(steamClient);
            assert.isTrue(steamClient.logOn.calledOnce);
            assert.equal(steamClient, result);
        });
    });
    
    describe('connectToDota', () => {
        it('call launch and resolve on ready event with client', async () => {
            const dotaClient = new EventEmitter();
            dotaClient.launch = () => dotaClient.emit('ready');
            sinon.spy(dotaClient, "launch");
            const result = await connectToDota(dotaClient);
            assert.isTrue(dotaClient.launch.calledOnce);
            assert.equal(dotaClient, result);
        });
    });
    
    describe('updateServers', () => {
        it('assign servers to steam object', async () => {
            const steam = {};
            const servers = { '1': 1, '2': 2 };
            updateServers(steam)(servers);
            assert.property(steam, 'servers');
            assert.equal(steam.servers, servers);
        });
    });
    
    describe('updateMachineAuth', () => {
        it('calls callback with sha_file object', async () => {
            const sha_file = crypto.createHash('sha1').update('data').digest();
            const callback = sinon.spy();
            updateMachineAuth('path')({ bytes: 'data' }, callback);
            assert.isTrue(callback.withArgs({ sha_file }).calledOnce);
        });
    });
    
    describe('diffMembers', () => {
        it('return array with 1 member', async () => {
            const id = new Long(0xFFFFFFFF, 0x7FFFFFFF);
            const membersA = [{ id }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF1) }];
            const membersB = [{ id }];
            const result = diffMembers(membersA, membersB);
            assert.lengthOf(result, 1);
            assert.equal(result[0].id.compare(new Long(0xFFFFFFFF, 0x7FFFFFF1)), 0);
        });
        
        it('return empty', async () => {
            const result = diffMembers([], []);
            assert.isEmpty(result);
        });
        
        it('return empty when no differences', async () => {
            const id = new Long(0xFFFFFFFF, 0x7FFFFFFF);
            const membersA = [{ id }];
            const membersB = [{ id }];
            const result = diffMembers(membersA, membersB);
            assert.isEmpty(result);
        });
        
        it('return empty when first array is subset', async () => {
            const id = new Long(0xFFFFFFFF, 0x7FFFFFFF);
            const membersA = [{ id }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF1) }];
            const membersB = [{ id }];
            const result = diffMembers(membersB, membersA);
            assert.isEmpty(result);
        });
    });
    
    describe('intersectMembers', () => {
        it('return array with 1 member', async () => {
            const id = new Long(0xFFFFFFFF, 0x7FFFFFFF);
            const membersA = [{ id }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF1) }];
            const membersB = [{ id }];
            const result = intersectMembers(membersA, membersB);
            assert.lengthOf(result, 1);
            assert.equal(result[0].id.compare(new Long(0xFFFFFFFF, 0x7FFFFFFF)), 0);
        });
        
        it('return empty', async () => {
            const result = intersectMembers([], []);
            assert.isEmpty(result);
        });
        
        it('return empty when none in common', async () => {
            const membersA = [{ id: new Long(0xFFFFFFFF, 0x7FFFFFFF) }];
            const membersB = [{ id: new Long(0xFFFFFFFF, 0x7FFFFFF1) }];
            const result = intersectMembers(membersA, membersB);
            assert.isEmpty(result);
        });
        
        it('return empty when none in common multiple', async () => {
            const membersA = [{ id: new Long(0xFFFFFFFF, 0x7FFFFFF1) }];
            const membersB = [{ id: new Long(0xFFFFFFFF, 0x7FFFFFF2) }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF3) }];
            let result = intersectMembers(membersA, membersB);
            assert.isEmpty(result);
            result = intersectMembers(membersB, membersA);
            assert.isEmpty(result);
        });
    });
    
    describe('membersToPlayerState', () => {
        it('return an object mapping steamids to slots', async () => {
            const members = [{ id: new Long(0xFFFFFFFF, 0x7FFFFFF2), team: 0 }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF3), team: 1 }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF4), team: 2 }];
            const playerState = membersToPlayerState(members);
            assert.deepEqual(playerState, {
                [(new Long(0xFFFFFFFF, 0x7FFFFFF2)).toString()]: 1,
                [(new Long(0xFFFFFFFF, 0x7FFFFFF3)).toString()]: 2,
                [(new Long(0xFFFFFFFF, 0x7FFFFFF4)).toString()]: null,
            });
        });
    });
    
    describe('processMembers', () => {
        it('return object with members who left, joined, or changed slot', async () => {
            const membersA = [{ id: new Long(0xFFFFFFFF, 0x7FFFFFF2), team: 0, slot: 0 }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF3), team: 1, slot: 1 }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF4), team: 2, slot: 0 }];
            const membersB = [{ id: new Long(0xFFFFFFFF, 0x7FFFFFF2), team: 0, slot: 0 }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF3), team: 0, slot: 1 }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF5), team: 2, slot: 0 }];
            const members = processMembers(membersA, membersB);
            assert.hasAllKeys(members, ['joined', 'left', 'changedSlot']);
            assert.lengthOf(members.joined, 1);
            assert.lengthOf(members.left, 1);
            assert.lengthOf(members.changedSlot, 1);
            assert.deepEqual(members.joined[0], { id: new Long(0xFFFFFFFF, 0x7FFFFFF5), team: 2, slot: 0 });
            assert.deepEqual(members.left[0], { id: new Long(0xFFFFFFFF, 0x7FFFFFF4), team: 2, slot: 0 });
            assert.deepEqual(members.changedSlot[0], {
                previous: { id: new Long(0xFFFFFFFF, 0x7FFFFFF3), team: 1, slot: 1 },
                current: { id: new Long(0xFFFFFFFF, 0x7FFFFFF3), team: 0, slot: 1 },
            });
        });
    });
    
    describe('invitePlayer', () => {
        it('invite player', async () => {
            const user = {
                steamid_64: 'test',
            }
            const dotaBot = {
                inviteToLobby: sinon.spy(),
            }
            const result = await invitePlayer(dotaBot)(user);
            assert(dotaBot.inviteToLobby.calledOnce);
        });
    });
});

describe('DotaBot', () => {
    let sandbox = null;
    let steamClient, steamUser, steamFriends, dotaClient;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        steamClient = new EventEmitter();
        steamUser = new EventEmitter();
        steamFriends = { setPersonaState: () => true, setPersonaName: () => true };
        dotaClient = new EventEmitter();
    });

    afterEach(() => {
        sandbox && sandbox.restore();
    });
    
    describe('constructor', () => {
        it('return DotaBot object with blocking queue', async () => {
            const dotaBot = new DotaBot(steamClient, steamUser, {}, dotaClient, {}, true, true);
            assert.equal(dotaBot.state, Queue.State.BLOCKED);
        });
    });
    
    describe('logOnToSteam', () => {
        it('log in to steam and set name and online state', async () => {
            steamClient.logOn = () => steamClient.emit('logOnResponse', { eresult: steam.EResult.OK });
            sinon.spy(steamClient, "logOn");
            const steamFriends = { setPersonaState: () => true, setPersonaName: () => true };
            const dotaBot = new DotaBot(steamClient, steamUser, steamFriends, dotaClient, {}, true, true);
            await dotaBot.logOnToSteam();
            assert.isTrue(steamClient.logOn.calledOnce);
        });
    });
    
    describe('connectToDota', () => {
        it('connect to dota and release queue', async () => {
            dotaClient.launch = () => dotaClient.emit('ready');
            sinon.spy(dotaClient, "launch");
            const dotaBot = new DotaBot(steamClient, steamUser, steamFriends, dotaClient, {}, true, true);
            await dotaBot.connectToDota();
            assert.isTrue(dotaClient.launch.calledOnce);
            assert.equal(dotaBot.state, Queue.State.IDLE);
        });
    });
    
    describe('connect', () => {
        it('connect to steam and dota', async () => {
            steamClient.connect = () => steamClient.emit('connected');
            sinon.spy(steamClient, "connect");
            steamClient.logOn = () => steamClient.emit('logOnResponse', { eresult: steam.EResult.OK });
            sinon.spy(steamClient, "logOn");
            dotaClient.launch = () => dotaClient.emit('ready');
            sinon.spy(dotaClient, "launch");
            const dotaBot = new DotaBot(steamClient, steamUser, steamFriends, dotaClient, {}, true, true);
            await dotaBot.connect();
            assert.isTrue(steamClient.connect.calledOnce);
            assert.isTrue(steamClient.logOn.calledOnce);
            assert.isTrue(dotaClient.launch.calledOnce);
        });
    });
    
    describe('disconnect', () => {
        it('disconnect from steam and dota and clear queue', async () => {
            steamClient.disconnect = () => true;
            sinon.spy(steamClient, "disconnect");
            dotaClient.exit = () => true;
            sinon.spy(dotaClient, "exit");
            const dotaBot = new DotaBot(steamClient, steamUser, steamFriends, dotaClient, {}, true, true);
            await dotaBot.disconnect();
            assert.isTrue(steamClient.disconnect.calledOnce);
            assert.isTrue(dotaClient.exit.calledOnce);
            assert.equal(dotaBot.state, Queue.State.IDLE);
        });
    });
    
    describe('processLobbyUpdate', () => {
        let dotaBot, memberLeftSpy, memberJoinedSpy, memberChangedSlotSpy, readySpy;
        
        beforeEach(() => {
            dotaBot = new DotaBot(steamClient, steamUser, steamFriends, dotaClient, {}, true, true);
            memberLeftSpy = sinon.spy();
            memberJoinedSpy = sinon.spy();
            memberChangedSlotSpy = sinon.spy();
            readySpy = sinon.spy();
            dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_LEFT, memberLeftSpy);
            dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_JOINED, memberJoinedSpy);
            dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_CHANGED_SLOT, memberChangedSlotSpy);
            dotaBot.on(CONSTANTS.EVENT_LOBBY_READY, readySpy);
        });
    
        it('emit left, joined, changed slot, and lobby ready', async () => {
            const oldLobby = {
                members: [{ id: new Long(0xFFFFFFFF, 0x7FFFFFF2), team: 0, slot: 0 }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF3), team: 1, slot: 1 }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF4), team: 2, slot: 0 }],
            }
            const newLobby = {
                members: [{ id: new Long(0xFFFFFFFF, 0x7FFFFFF2), team: 0, slot: 0 }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF3), team: 0, slot: 1 }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF5), team: 2, slot: 0 }],
            }
            dotaBot.factionCache = {
                [(new Long(0xFFFFFFFF, 0x7FFFFFF2)).toString()]: 1,
                [(new Long(0xFFFFFFFF, 0x7FFFFFF3)).toString()]: 1,
                [(new Long(0xFFFFFFFF, 0x7FFFFFF5)).toString()]: null,
            }
            dotaBot.processLobbyUpdate(oldLobby, newLobby);
            assert.isTrue(memberLeftSpy.calledOnce);
            assert.isTrue(memberJoinedSpy.calledOnce);
            assert.isTrue(memberChangedSlotSpy.calledOnce);
            assert.isTrue(readySpy.calledOnce);
        });
    
        it('emit left, joined, and changed slot', async () => {
            const oldLobby = {
                members: [{ id: new Long(0xFFFFFFFF, 0x7FFFFFF2), team: 0, slot: 0 }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF3), team: 1, slot: 1 }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF4), team: 2, slot: 0 }],
            }
            const newLobby = {
                members: [{ id: new Long(0xFFFFFFFF, 0x7FFFFFF2), team: 0, slot: 0 }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF3), team: 0, slot: 1 }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF5), team: 2, slot: 0 }],
            }
            dotaBot.factionCache = {
                [(new Long(0xFFFFFFFF, 0x7FFFFFF2)).toString()]: 1,
                [(new Long(0xFFFFFFFF, 0x7FFFFFF3)).toString()]: 1,
                [(new Long(0xFFFFFFFF, 0x7FFFFFF5)).toString()]: 1,
            }
            dotaBot.processLobbyUpdate(oldLobby, newLobby);
            assert.isTrue(memberLeftSpy.calledOnce);
            assert.isTrue(memberJoinedSpy.calledOnce);
            assert.isTrue(memberChangedSlotSpy.calledOnce);
            assert.isFalse(readySpy.called);
        });
    
        it('emit joined, and lobby ready', async () => {
            const oldLobby = {
                members: [],
            }
            const newLobby = {
                members: [{ id: new Long(0xFFFFFFFF, 0x7FFFFFF2), team: 0, slot: 0 }, { id: new Long(0xFFFFFFFF, 0x7FFFFFF3), team: 1, slot: 1 }],
            }
            dotaBot.factionCache = {
                [(new Long(0xFFFFFFFF, 0x7FFFFFF2)).toString()]: 1,
                [(new Long(0xFFFFFFFF, 0x7FFFFFF3)).toString()]: 2,
            }
            dotaBot.processLobbyUpdate(oldLobby, newLobby);
            assert.isFalse(memberLeftSpy.called);
            assert.isTrue(memberJoinedSpy.calledTwice);
            assert.isFalse(memberChangedSlotSpy.called);
            assert.isTrue(readySpy.called);
        });
    });
});