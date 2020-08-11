
const path = require('path')
const fs = require('fs')
const yaml = require('js-yaml')
const ObjectsToCsv = require('objects-to-csv')
var _ = require('lodash')

const filepath = './data/t20s';

(async () => fs.readdir(filepath, async function (err, files) {
    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err)
    }
    console.log(`Files: ${files.length}`)

    // Create/Reset csv
    await storeCSV([], [], {}, 0)

    const inningName = ['1st innings', '2nd innings']

    // Loop through all files.

    for (let i = 0; i < files.length; i++) {
        // Using setTimeout to avoid exceeding buffer limit
        setTimeout(async () => {
            const file = files[i]
            let fileContents = fs.readFileSync(`${filepath}/${file}`, 'utf8')
            let data = yaml.safeLoad(fileContents)
            const { info, innings } = data

            // Using lodash to avoid looking into undefined objects
            const teams = _.get(info, 'teams', ['NA', 'NA'])
            // Reset Delivery records for the match.
            const deliveryRecords = []
            let date = _.get(info, 'dates', ['NA'])[0]

            // console.log(info.outcome)
            // return

            // Getting superover results in tied matches.
            // const outcome_winner = _.get(info, 'outcome.winner', _.get(info, 'outcome.eliminator', 'NA'))
            // eliminator:

            const matchData = {
                id: i + 1,
                season: new Date(date).toISOString().split('-')[0],
                date: new Date(date).toISOString().split('T')[0],
                winner: _.get(info, 'outcome.winner', _.get(info, 'outcome.eliminator', 'NA')),
                result: _.get(info, 'outcome.result', 'normal'),

                win_by_runs: _.get(info, 'outcome.by.runs', ''),
                win_by_wickets: _.get(info, 'outcome.by.wickets', ''),
                player_of_match: _.get(info, 'player_of_match', ['NA'])[0],

                team1: teams[0],
                team2: teams[1],

                toss_winner: _.get(info, 'toss.winner', ''),
                toss_decision: _.get(info, 'toss.decision', ''),

                umpire1: _.get(info, 'umpires', '')[0],
                umpire2: _.get(info, 'umpires', '')[1],

                city: _.get(info, 'venue', '')

            }

            for (let j = 0; j < innings.length; j++) {
                if (j > 1) {
                    // Skipping super overs for now.
                    continue
                }

                const { team: batting_team, deliveries } = innings[j][inningName[j]]

                let bowling_team = teams.filter(team => team != batting_team)[0]

                for (let k = 0; k < deliveries.length; k++) {
                    const del = deliveries[k]

                    const deliveryDetail = Object.values(del)[0]
                    let [over, ball] = Object.keys(del)[0].split('.')
                    over = parseInt(over) + 1
                    const fielders = _.get(deliveryDetail, 'wicket.fielders', [""])

                    const deliveryData = {
                        match_id: i + 1,
                        inning: j + 1,
                        batting_team,
                        bowling_team,
                        over,
                        ball: parseInt(ball),
                        batsman: _.get(deliveryDetail, 'batsman', ''),
                        non_striker: _.get(deliveryDetail, 'non_striker', ''),
                        bowler: _.get(deliveryDetail, 'bowler', ''),

                        wide_runs: _.get(deliveryDetail, 'extras.wides', 0),
                        bye_runs: _.get(deliveryDetail, 'extras.byes', 0),
                        legbye_runs: _.get(deliveryDetail, 'extras.legbyes', 0),
                        noball_runs: _.get(deliveryDetail, 'extras.noballs', 0),

                        batsman_runs: _.get(deliveryDetail, 'runs.batsman', 0),
                        extra_runs: _.get(deliveryDetail, 'runs.extras', 0),
                        total_runs: _.get(deliveryDetail, 'runs.total', 0),

                        player_dismissed: _.get(deliveryDetail, 'wicket.player_out', ''),
                        dismissal_kind: _.get(deliveryDetail, 'wicket.kind', ''),
                        fielder: fielders[fielders.length - 1]
                    }
                    deliveryRecords.push(deliveryData)
                }
            }

            await storeCSV([matchData], deliveryRecords, { append: true }, i)
        }, 0)
    }
}
))()



const storeCSV = async (matchRecords, deliveryRecords, options, i) => {
    console.log('Saving files: ', i)
    const matches = new ObjectsToCsv(matchRecords)
    await matches.toDisk('test.csv', options)
    const deliveries = new ObjectsToCsv(deliveryRecords)
    await deliveries.toDisk('test2.csv', options)
}
// const resetCSV = async () => {
//     const matches = new ObjectsToCsv([])
//     await matches.toDisk('test.csv')
//     const deliveries = new ObjectsToCsv([])
//     await deliveries.toDisk('test2.csv')
// }



// Change year to season
// Change total to total_runs