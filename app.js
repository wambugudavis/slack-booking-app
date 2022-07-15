// Require the Bolt package (github.com/slackapi/bolt)
require('dotenv').config();
const {App} = require("@slack/bolt");
const {WebClient, LogLevel} = require("@slack/web-api");

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    port: process.env.PORT || 3000
});

const client = new WebClient(process.env.SLACK_BOT_TOKEN, {
    logLevel: LogLevel.DEBUG
});

app.event('app_home_opened', async ({event, say}) => {
    // say(`Hello <@${event.user}>!`);
    try {
        const result = await client.views.publish({
            user_id: event.user,
            view: {
                type: 'home',
                callback_id: 'home_view',

                /* body of the view */
                blocks: [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": "Storm Room Daily Bookings",
                            "emoji": true
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*Today's Quote* :hugging_face:\nWe cannot solve problems with the kind of thinking we employed when we came up with them.\nAuthor: `Albert Einstein`\n"
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*Kindly find the selected slots:*"
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*09:30am - 11:00am*\nPeter Gikera (<@U03HABCM7KM>)"
                        },
                        "accessory": {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "emoji": true,
                                "text": "Message"
                            },
                            "value": "<@U03HABCM7KM>"
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*12:00pm - 2:30pm*\nDavis Wambugu (<@U03HP23F3ND>)"
                        },
                        "accessory": {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "emoji": true,
                                "text": "Message"
                            },
                            "value": "<@U03HP23F3ND>"
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*4:00pm - 6:00pm*\nMark Mburu <@U03HACE0RGT>"
                        },
                        "accessory": {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "emoji": true,
                                "text": "Message"
                            },
                            "value": "<@U03HACE0RGT>"
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*<fakelink.ToMoreTimes.com|Select a Slot>*"
                        }
                    }
                ]
            }
        });
    } catch (error) {
        console.error(error);
    }
});


(async () => {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
})();
