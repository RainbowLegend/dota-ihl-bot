const { Command } = require('discord.js-commando');
const {
    ihlManager, isMessageFromAdmin,
} = require('../../lib/ihlManager');
const {
    findLeague, updateLeague,
} = require('../../lib/db');

const settingMap = {
    category: 'category_name',
    channel: 'channel_name',
    adminrole: 'admin_role_name',
    captainrankthreshold: 'captain_rank_threshold',
    captainroleregexp: 'captain_role_regexp',
    readychecktimeout: 'ready_check_timeout',
    initialrating: 'initial_rating',
    defaultgamemode: 'default_game_mode',
};

/**
 * @class LeagueUpdateCommand
 * @extends external:Command
 */
class LeagueUpdateCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'league-update',
            group: 'admin',
            memberName: 'league-update',
            guildOnly: true,
            description: 'Update an inhouse league setting.',
            args: [
                {
                    key: 'setting',
                    prompt: `Provide a league setting. (${Object.keys(settingMap).join(', ')})`,
                    type: 'string',
                    validate: (setting) => {
                        if (LeagueUpdateCommand.isValidSetting(setting)) return true;
                        return `Setting must be one of ${Object.keys(settingMap).join(', ')}`;
                    },
                },
                {
                    key: 'value',
                    prompt: 'Provide a value for the league setting.',
                    type: 'string',
                    validate: value => (value ? true : 'Must provide a setting value.'),
                },
            ],
        });
    }

    static isValidSetting(setting) {
        return Object.keys(settingMap).indexOf(setting) !== -1;
    }

    hasPermission(msg) {
        return isMessageFromAdmin(ihlManager.inhouseStates, msg);
    }

    async run(msg, { setting, value }) {
        const field = settingMap[setting];
        const guild = msg.channel.guild;
        await updateLeague(guild.id)({ [field]: value });
        await msg.say(`League setting updated. ${setting} set to ${value}`);
    }
}

LeagueUpdateCommand.settingMap = settingMap;

module.exports = LeagueUpdateCommand;
