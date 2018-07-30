const {
    findUserBySteamId64,
} = require('./db');

module.exports = {
    findOrCreateCategory: async (guild, categoryName) => ({ id: categoryName, name: categoryName, type: 'category' }),
    findOrCreateChannelInCategory: async (guild, category, channelName) => {
        console.log('STUBBED findOrCreateChannelInCategory');
        return { id: channelName, name: channelName, type: 'text', parentID: category.name }
    },
    findOrCreateRole: async (guild, roleName) => ({ id: roleName, name: roleName }),
    setChannelParent: async () => true,
    setRolePermissions: async () => true,
    setRoleMentionable: async () => true,
    addRoleToUser: guild => roleResolvable => async (userResolvable) => true,
    resolveUser: async (guild, userResolvable) => {
        if (userResolvable !== null && typeof userResolvable === 'object') {
            if ('discord_id' in userResolvable) {
                discord_id = userResolvable.discord_id;
            }
            else if ('steamid_64' in userResolvable) {
                const user = await findUserBySteamId64(guild.id)(userResolvable.steamid_64);
                discord_id = user.discord_id;
            }
        }
        else if (typeof userResolvable === 'string') {
            discord_id = userResolvable;
        }
        else {
            logger.error('Discord id not found.');
            throw new InvalidArgumentException('Discord id not found.');
        }
        return { id: discord_id };
    },
    getUserRoles: async (guild, userResolvable) => [],
}