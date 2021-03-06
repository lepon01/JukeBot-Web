const config      = require('./config');
const audioPlayer = require('./audioPlayer');
const { Client }  = require('eris');
const search      = require('tubesearch');
const express     = require('express');
const handlebars  = require('express-handlebars');
const bodyParser  = require('body-parser');

const client    = new Client(config.token);
const players   = new Map();
const webServer = express();

webServer.engine('.hbs', handlebars({
  extname: '.hbs',
  helpers: {
    'json': (ctx) => JSON.stringify(ctx)
  }
}));
webServer.set('view engine', '.hbs');
webServer.use(express.static('views'));
webServer.use(bodyParser.json());
webServer.use(bodyParser.urlencoded({ extended: true }));

webServer.get('/guild/:id', (req, res) => {
  const guildId = req.params.id;

  if (!guildId || !client.guilds.has(guildId)) {
    return res.status(404).send('No guilds found matching that ID.');
  }

  const player = getPlayer(guildId);

  res.render('guild', {
    name: client.guilds.get(guildId).name,
    queue: player.queue,
    current: player.current
  });
});

webServer.get('/search', async (req, res) => {
  if (!req.query.identifier) {
    return res.status(400).json({ error: 'No identifier provided.' });
  }

  const results = await search(req.query.identifier, 5);
  res.render('results', { results });
});

webServer.put('/guild/:id/queue', (req, res) => {
  const track = req.body;

  const player = getPlayer(req.params.id);
  player.add(track);

  res.status(204).send();
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.channel.guild || !msg.content.startsWith(config.prefix)) {
    return;
  }

  const [command, ...args] = msg.content.slice(config.prefix.length).split(' ');

  if ('join' === command) {
    await client.joinVoiceChannel(msg.member.voiceState.channelID);

    const player = getPlayer(msg.channel.guild.id);
    player.setAnnounce(msg.channel.id);
  }
});

function getPlayer (guildId) {
  if (!players.has(guildId)) {
    players.set(guildId, new audioPlayer(client, guildId));
  }

  return players.get(guildId)
}

webServer.listen(config.webPort);
client.connect();
