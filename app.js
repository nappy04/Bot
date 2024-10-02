// npm install discord.js @google/generative-ai fs
// API KEY ไปที่เว็บ https://ai.google.dev/ แล้วสมัครเอาเอง

const { Client, GatewayIntentBits, ActivityType, EmbedBuilder, REST, Routes } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const MODEL = "gemini-pro";
const API_KEY = "AIzaSyDNZtYV6-LgGJD7rVqdy4gUeEIRUA3njJY";
const BOT_TOKEN = "MTI5MTA3MzkxMzUxMzcwOTU5MQ.G3_8NM.-nJEDkJwRd452X_VwBnJ4ShvwiABgRw_p-prUI";
const CHANNELS_FILE = './channels.json';

const ai = new GoogleGenerativeAI(API_KEY);
const model = ai.getGenerativeModel({ model: MODEL });

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

let serverChannels = {};

// Load server channels from JSON file
function loadChannels() {
    if (fs.existsSync(CHANNELS_FILE)) {
        const data = fs.readFileSync(CHANNELS_FILE, 'utf-8');
        serverChannels = JSON.parse(data);
    }
}

// Save server channels to JSON file
function saveChannels() {
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify(serverChannels, null, 2));
}

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);

    client.user.setPresence({
        activities: [{
            name: 'บอท Ai ที่จะช่วยคุณให้คุณสบาย',
            type: ActivityType.Streaming,
        }],
        status: 'Gemini Ai'
    });

    loadChannels(); // Load channels when the bot is ready

    const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
    (async () => {
        try {
            console.log('Starting application command refresh (/)');

            await rest.put(
                Routes.applicationCommands(client.user.id),
                {
                    body: [
                        {
                            name: 'setchannel',
                            description: 'Set the channel for AI responses. & กำหนดช่องทางการตอบสนองของ AI',
                            options: [
                                {
                                    name: 'channel',
                                    type: 7,
                                    description: 'The channel to set. & ช่องที่จะตั้งค่า',
                                    required: true
                                }
                            ],
                            default_member_permissions: 32
                        },
                        {
                            name: 'removechannel',
                            description: 'Remove the channel setting for this server. & ลบการตั้งค่าช่องสัญญาณสำหรับเซิร์ฟเวอร์',
                            default_member_permissions: 32
                        },
                        {
                            name: 'servers',
                            description: 'List the servers where the bot is located. & รายชื่อเซิร์ฟเวอร์ที่บอทตั้งอยู่',
                            default_member_permissions: 32
                        },
                        {
                            name: 'help',
                            description: 'Show information about the bot and available commands. & แสดงข้อมูลเกี่ยวกับบอทและคำสั่งที่ใช้ได้',
                            default_member_permissions: 32
                        }
                    ]
                }
            );

            console.log('The application command (/) has been successfully reloaded.');
        } catch (error) {
            console.error(error);
        }
    })();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;
    const serverId = interaction.guild.id;

    if (commandName === 'setchannel') {
        const channel = options.getChannel('channel');
        if (channel) {
            serverChannels[serverId] = channel.id;
            saveChannels();
            await interaction.reply({ content:`Channel has been set to & ตั้งค่าช่องเป็น <#${channel.id}>`, ephemeral: true });
        } else {
            await interaction.reply({ content:"Invalid channel ID. & รหัสช่องไม่ถูกต้อง", ephemeral: true });
        }
    }

    if (commandName === 'removechannel') {
        if (serverChannels[serverId]) {
            delete serverChannels[serverId];
            saveChannels();
            await interaction.reply({ content:"Channel setting has been removed. & การตั้งค่าช่องถูกลบออกแล้ว", ephemeral: true });
        } else {
            await interaction.reply({ content:"No channel setting found for this server. & ไม่พบการตั้งค่าช่องสำหรับเซิร์ฟเวอร์นี้", ephemeral: true });
        }
    }

    if (commandName === 'servers') {
        const serverList = client.guilds.cache.map(guild => guild.name).join('\n');
        console.log("Servers the bot is in:\n", serverList);
        await interaction.reply({ content: "Check the console for the list of servers. & ตรวจสอบคอนโซลเพื่อดูรายการเซิร์ฟเวอร์", ephemeral: true });
    }

    if (commandName === 'help') {
        await interaction.reply({ content:'นี่คือบอทที่รวม Google Generative AI เข้ากับ Discord! นี่คือคำสั่งที่ใช้ได้:\n' +
            '`/setchannel:` Set the channel for AI responses.\n`/setchannel:` กำหนดช่องทางการตอบสนองของ AI\n' +
            '`/removechannel:` Remove the channel setting for this server.\n`/removechannel:` ลบการตั้งค่าช่องสัญญาณสำหรับเซิร์ฟเวอร์นี้\n' +
            '`/servers:` List the servers where the bot is located.\n`/servers:` รายชื่อเซิร์ฟเวอร์ที่บอทตั้งอยู่\n' +
            'You can use these commands by typing `/` and selecting the desired action.\nคุณสามารถใช้คำสั่งเหล่านี้ได้โดยพิมพ์ `/` และเลือกการกระทำที่ต้องการ\n \n`The server command may not work.`\n`คำสั่ง server อาจจะใช้ไม่ได้`\n \n' +
            '`developers : Zixread`',ephemeral: true });

        // หรือสามารถแสดงข้อมูลเพิ่มเติมในรูปแบบ embed ได้
        // await interaction.reply({ embeds: [helpEmbed] });
    }
});

client.on("messageCreate", async (message) => {
    try {
        if (message.author.bot) return;

        const serverId = message.guild.id;
        const channelId = serverChannels[serverId];
        if (!channelId || channelId !== message.channel.id) return;

        const waitMessage = await message.reply("Please wait...");

        const { response } = await model.generateContent(message.cleanContent);
        const generatedText = response.candidates[0]?.content.parts.map(part => part.text).join('');

        if (generatedText) {
            console.log("Reply Content:", generatedText);

            const chunks = splitTextIntoChunks(generatedText);

            for (const chunk of chunks) {
                const embed = new EmbedBuilder()
                    .setTitle("**__Reply__** :")
                    .setDescription(`\`\`\`${chunk}\`\`\``)
                    .setColor("#f6f5f6")
                    .setFooter({ text: `Powered by Gemini Ai ❤️` });

                await message.reply({ embeds: [embed] });
            }
        } else {
            console.log("No generated text found.");
        }

        await waitMessage.delete();
    } catch (e) {
        handleError(e, message);
    }
});

function handleError(error, message = null) {
    console.error("Error:", error);

    if (message) {
        const embed = new EmbedBuilder()
            .setTitle("Error")
            .setDescription("An error occurred while processing your request. Please try again later.")
            .setColor("#ff0000");

        message.reply({ embeds: [embed] }).catch(console.error);
    }
}

function splitTextIntoChunks(text, chunkSize = 2000) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
}

client.login(BOT_TOKEN);
