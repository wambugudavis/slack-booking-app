// Require the Bolt package (github.com/slackapi/bolt)
require('dotenv').config();
const {App} = require("@slack/bolt");
const {WebClient, LogLevel} = require("@slack/web-api");

const dayjs = require('dayjs')
const calendar = require('dayjs/plugin/calendar')
dayjs.extend(calendar)

const bookings = require('./schedule.json')
const slots = require('./slots.json')

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

let currentDate = "2022-08-30"

app.event('app_home_opened', async ({event, say, logger}) => {
    // say(`Hello <@${event.user}>!`);
    const currentBookings = bookings.filter((booking) => {
        return booking.date === currentDate
    })
    let upcoming = []
    let past = []
    currentBookings.map((slot) => {
        const currentTime = dayjs()
        const startTime = dayjs(currentDate + " " + slots[slot.booking.start])

        const start = dayjs('1/1/1 ' + slots[slot.booking.start]).format('hh:mm a')
        const end = dayjs('1/1/1 ' + slots[slot.booking.end]).format('hh:mm a')

        if (currentTime.diff(startTime) > 0) {
            past.push([
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `*_${slot.booking.label}_*\n${slot.booking.user}\n>${start} — ${end}`
                    },
                    // "accessory": {
                    //     "type": "button",
                    //     "text": {
                    //         "type": "plain_text",
                    //         "text": "Edit",
                    //         "emoji": true
                    //     },
                    //     "value": "book",
                    //     "style": "danger"
                    // }
                }, {
                    "type": "divider"
                }])
        } else {
            upcoming.push([
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `*${slot.booking.label}*\n${slot.booking.user}\n>${start} — ${end}`
                    }
                }, {
                    "type": "divider"
                }])
        }

        if(upcoming.length === 0) {
            upcoming.push([
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "`No upcoming bookings found`"
                    }
                }])
        }

        if(past.length === 0) {
            past.push([
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "`No past bookings found`"
                    }
                }])
        }
    })

    try {
        const result = await client.views.publish(
            {
                user_id: event.user,
                view: {
                    "type": "home",
                    "blocks": [
                        {
                            "type": "actions",
                            "elements": [
                                {
                                    "type": "datepicker",
                                    "initial_date": dayjs(currentDate).format("YYYY-MM-DD"),
                                    "placeholder": {
                                        "type": "plain_text",
                                        "text": "Select a date",
                                        "emoji": true
                                    }
                                }
                            ]
                        },
                        {
                            "type": "actions",
                            "elements": [
                                {
                                    "type": "button",
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Book Slot",
                                        "emoji": true
                                    },
                                    "value": "click_me_123",
                                    "action_id": "book_slot_button",
                                    "style": "primary"
                                }
                            ]
                        },
                        {
                            "type": "context",
                            "elements": [
                                {
                                    "type": "image",
                                    "image_url": "https://api.slack.com/img/blocks/bkb_template_images/placeholder.png",
                                    "alt_text": "placeholder"
                                }
                            ]
                        },
                        {
                            "type": "context",
                            "elements": [
                                {
                                    "type": "mrkdwn",
                                    "text": "Upcoming events"
                                }
                            ]
                        },
                        ...upcoming.flat(),
                        {
                            "type": "context",
                            "elements": [
                                {
                                    "type": "image",
                                    "image_url": "https://api.slack.com/img/blocks/bkb_template_images/placeholder.png",
                                    "alt_text": "placeholder"
                                }
                            ]
                        },
                        {
                            "type": "context",
                            "elements": [
                                {
                                    "type": "image",
                                    "image_url": "https://api.slack.com/img/blocks/bkb_template_images/placeholder.png",
                                    "alt_text": "placeholder"
                                }
                            ]
                        },
                        {
                            "type": "context",
                            "elements": [
                                {
                                    "type": "mrkdwn",
                                    "text": "Past events"
                                }
                            ]
                        },
                        ...past.flat()
                    ]
                }
            }
        );
        logger.info(result);
    } catch (error) {
        logger.error(error)
    }
});

app.action('book_slot_button', async ({ ack, logger, body }) => {
    await ack();
    try {
        const result = await client.views.open(
            {
                trigger_id: body.trigger_id,
                view: {
                    "type": "modal",
                    "submit": {
                        "type": "plain_text",
                        "text": "Submit",
                        "emoji": true
                    },
                    "close": {
                        "type": "plain_text",
                        "text": "Cancel",
                        "emoji": true
                    },
                    "title": {
                        "type": "plain_text",
                        "text": "Pick a Time",
                        "emoji": true
                    },
                    "blocks": [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": `*Hi <@${body.user.id}>!* Book a slot below:`
                            }
                        },
                        {
                            "type": "divider"
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": "*Start*"
                            },
                            "accessory": {
                                "type": "static_select",
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Choose list",
                                    "emoji": true
                                },
                                "options": [
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "My events",
                                            "emoji": true
                                        },
                                        "value": "value-0"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "All events",
                                            "emoji": true
                                        },
                                        "value": "value-1"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Event invites",
                                            "emoji": true
                                        },
                                        "value": "value-1"
                                    }
                                ]
                            }
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": "*End*"
                            },
                            "accessory": {
                                "type": "static_select",
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Choose list",
                                    "emoji": true
                                },
                                "options": [
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "My events",
                                            "emoji": true
                                        },
                                        "value": "value-0"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "All events",
                                            "emoji": true
                                        },
                                        "value": "value-1"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Event invites",
                                            "emoji": true
                                        },
                                        "value": "value-1"
                                    }
                                ]
                            }
                        },
                        {
                            "type": "input",
                            "element": {
                                "type": "plain_text_input",
                                "action_id": "plain_text_input-action"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Event description",
                                "emoji": true
                            }
                        }
                    ]
                }
            }
        );
        logger.info(result);
    } catch (error) {
        logger.error(error)
    }
});

(async () => {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
})();
