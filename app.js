// Require the Bolt package (github.com/slackapi/bolt)
require('dotenv').config();
const {App} = require("@slack/bolt");
const {WebClient, LogLevel} = require("@slack/web-api");

const dayjs = require('dayjs')
const calendar = require('dayjs/plugin/calendar')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
dayjs.extend(calendar)
dayjs.extend(utc)
dayjs.extend(timezone)

dayjs.tz.setDefault("Africa/Nairobi")

const importedBookings = require('./schedule.json')
const bookings = [...importedBookings]
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

// let currentDate = dayjs('2022-08-31').format("YYYY-MM-DD")
let currentDate = dayjs().format("YYYY-MM-DD")

const currentBookings = (date) => {
    const all = bookings.filter((booking) => {
        return booking.date === date
    })

    let upcoming = []
    let past = []

    all.map((slot) => {
        const currentTime = dayjs()
        const startTime = dayjs(date + " " + slots[slot.booking.start])

        const start = dayjs('1/1/1 ' + slots[slot.booking.start]).format('hh:mm a')
        const end = dayjs('1/1/1 ' + slots[slot.booking.end]).format('hh:mm a')

        if (currentTime.diff(startTime) > 0) {
            past.push([
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `*_${slot.booking.label}_*\n<@${slot.booking.user}>\n>${start} — ${end}`
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
                        "text": `*${slot.booking.label}*\n<@${slot.booking.user}>\n>${start} — ${end}`
                    }
                }, {
                    "type": "divider"
                }])
        }
    })

    if (upcoming.length === 0) {
        upcoming.push([
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "`No upcoming bookings found`"
                }
            }])
    }

    if (past.length === 0) {
        past.push([
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "`No past bookings found`"
                }
            }])
    }

    return {upcoming, past}
}

const homeView = (date) => {
    let upcomingLabel, upcomingEvents, spacers, bookingButton;
    const diff = dayjs().diff(currentDate, 'day')
    if (diff > 0) {
        upcomingLabel = {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": " "
            }
        }
        upcomingEvents = [{
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": " "
            }
        }]
        spacers = [{
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": " "
            }
        }]
        bookingButton = {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": ">Please pick today/or a future date to book a slot."
            }
        }
    } else {
        upcomingLabel = {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "Upcoming events"
                }
            ]
        }
        upcomingEvents = currentBookings(date).upcoming.flat()
        spacers = [
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
            }
        ]
        bookingButton = {
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
        }
    }

    return {
        "type": "home",
        "callback_id": 'home_view',
        "blocks": [
            {
                "type": "actions",
                "block_id": "datePickerBlock",
                "elements": [
                    {
                        "type": "datepicker",
                        "initial_date": date,
                        "placeholder": {
                            "type": "plain_text",
                            "text": "Select a date",
                            "emoji": true
                        },
                        "action_id": "datepicker_select"
                    }
                ]
            },
            bookingButton,
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
            upcomingLabel,
            ...upcomingEvents.flat(),
            ...spacers.flat(),
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "Past events"
                    }
                ]
            },
            ...currentBookings(date).past.flat()
        ]
    }
}

const modalView = (user, date, selectedStart) => {
    const current = bookings.filter((booking) => {
        return booking.date === date
    })

    const availableSlots = [...slots]
    let count = 0
    current.forEach((x) => {
        const start = x.booking.start - count
        const length = x.booking.end - x.booking.start
        availableSlots.splice(start, length)
        count = count + (x.booking.end - x.booking.start)
    })
    availableSlots.pop() // remove last slot as a start time

    const startTimes = availableSlots
        .filter((slot) => {
            return dayjs(date + ' ' + slot).isAfter(dayjs())    // future slots only
        })
        .map((slot) => {
            const time = dayjs('1/1/1 ' + slot).format('hh:mm a')
            return {
                "text": {
                    "type": "plain_text",
                    "text": time,
                    "emoji": true
                },
                "value": slot
            }
        })

    let endTimesPicker;
    if (selectedStart !== undefined) {
        // const start = slots.indexOf("09:00")
        const availableEndTimes = availableSlots
            .filter((slot) => {
                return slot.replace(":", "") >= selectedStart.replace(":", "")
            })
        // .slice(start, startTimes.length)

        let endTimes = []
        for (let i = 0; i < availableEndTimes.length - 1; i++) {
            const x = dayjs('1/1/1 ' + availableEndTimes[i])
            const y = dayjs('1/1/1 ' + availableEndTimes[i + 1])
            // console.log(x.format('HHmm'),y.format('HHmm'),y.diff(x, 'minute'))
            if (y.diff(x, 'minute') === 15) {
                endTimes.push(availableEndTimes[i + 1])
            } else {
                break;
            }
        }

        if (endTimes.length === 0) {
            const last = dayjs('1/1/1 ' + selectedStart).add(15, 'm')
            endTimes.push(dayjs(last).format('HH:mm'))
        } else {
            const last = dayjs('1/1/1 ' + endTimes[endTimes.length - 1]).add(15, 'm')
            endTimes.push(dayjs(last).format('HH:mm'))
        }

        endTimes = endTimes.map((slot) => {
            const time = dayjs('1/1/1 ' + slot).format('hh:mm a')
            return {
                "text": {
                    "type": "plain_text",
                    "text": time,
                    "emoji": true
                },
                "value": slot
            }
        })

        endTimesPicker = {
            "block_id": "endTimeBlock",
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
                "options": endTimes,
                "action_id": "pick_end_time"
            }
        }
    } else {
        endTimesPicker = {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": " "
            }
        }
    }

    return {
        "type": "modal",
        callback_id: 'pick_time_modal',
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
                    "text": `Hi <@${user.id}>, book a slot for *${dayjs(date).calendar(undefined, {
                        sameDay: '[today]',
                        lastDay: '[yesterday]',
                        nextDay: '[tomorrow]',
                        nextWeek: 'dddd',
                        lastWeek: '[last] dddd',
                        sameElse: 'DD/MM/YYYY'
                    })}* below:`
                }
            },
            {
                "type": "divider"
            },
            {
                "block_id": "startTimeBlock",
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*Start*"
                },
                "accessory": {
                    "type": "static_select",
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Start Time",
                        "emoji": true
                    },
                    "options": startTimes,
                    "action_id": "pick_start_time"
                }
            },
            endTimesPicker,
            {
                "block_id": "slotDescription",
                "type": "input",
                "element": {
                    "type": "plain_text_input",
                    "action_id": "slot_description"
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

app.event('app_home_opened', async ({event, logger}) => {
    // say(`Hello <@${event.user}>!`);
    try {
        const result = await client.views.publish(
            {
                user_id: event.user,
                view: homeView(currentDate)
            }
        );
        // logger.info(result);
    } catch (error) {
        // logger.error(error)
    }
});

app.view('pick_time_modal', async ({ack, body, view, client, logger}) => {
    await ack();
    const start = view.state.values.startTimeBlock.pick_start_time.selected_option.value;
    const end = view.state.values.endTimeBlock.pick_end_time.selected_option.value;
    const label = view.state.values.slotDescription.slot_description.value;
    const user = body.user.id

    const startIndex = slots.findIndex((slot) => slot === start)
    const endIndex = slots.findIndex((slot) => slot === end)
    const booking = {
        date: currentDate,
        booking: {start: startIndex, end: endIndex, label, user}
    }
    bookings.push(booking)
    try {
        const result = await client.views.publish(
            {
                user_id: user,
                view: homeView(currentDate)
            }
        );

        const result2 = await client.chat.postMessage({
            channel: 'C03PNBZP5BM',
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `New booking. Storm Room reserved *${dayjs(currentDate).calendar(undefined, {
                            sameDay: '[today]',
                            nextDay: '[tomorrow]',
                            nextWeek: '[on] dddd',
                            sameElse: '[on] DD/MM/YYYY'
                        })}*:`
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `*${label}*\n<@${user}>\n>${dayjs('1/1/1 ' + start).format('hh:mm a')} — ${dayjs('1/1/1 ' + end).format('hh:mm a')}`
                    }
                },
                {
                    "type": "divider"
                }
            ]
        });
        // logger.info(result);
    } catch (error) {
        // logger.error(error)
    }
});

app.action('book_slot_button', async ({ack, logger, body}) => {
    await ack();
    try {
        const result = await client.views.open(
            {
                trigger_id: body.trigger_id,
                view: modalView(body.user, currentDate)
            }
        );
        // logger.info(result);
    } catch (error) {
        // logger.error(error)
    }
});

app.action('datepicker_select', async ({ack, logger, body}) => {
    await ack();
    currentDate = body.view.state.values.datePickerBlock.datepicker_select.selected_date
    const user = body.user.id
    try {
        const result = await client.views.publish(
            {
                user_id: user,
                view: homeView(currentDate)
            }
        );
        // logger.info(result);
    } catch (error) {
        // logger.error(error)
    }
});

app.action('pick_start_time', async ({ack, logger, body}) => {
    await ack();
    const slot = body.view.state.values.startTimeBlock.pick_start_time.selected_option.value
    try {
        const result = await client.views.update(
            {
                view: modalView(body.user, currentDate, slot),
                view_id: body.view.id
            }
        );
        // logger.info(result);
    } catch (error) {
        // logger.error(error)
    }
});

(async () => {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
})();
