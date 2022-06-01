// когда-нибудь я перепишу этот говнокод :(
// если не работает курс валюты, эт проблема не во мне, а в Heroku..

const TelegramApi = require('node-telegram-bot-api')
const { GoogleSpreadsheet } = require('google-spreadsheet')
require('dotenv').config()
const axios = require("axios")
const { filterRate, defaultRates, ratesToString, formatDate, formatToStandartDate } = require('./getrate')
const { defaultOpts, rateOpts, settingsOpts, startOpts, categoryOpts, statisticOpts, deletecategoryOpts, renamecategoryOpts, isEmpty } = require('./options')
const { start, shortStart, settings } = require('./answers')

const token = process.env.API_KEY_BOT_TOKEN
const adminId = process.env.ADMIN_CHAT_ID
const moneyKeepEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const moneyKeepKey = process.env.GOOGLE_PRIVATE_KEY
const sheetId = process.env.GOOGLE_SHEET_ID

const bot = new TelegramApi(token, { polling: true })
const doc = new GoogleSpreadsheet(sheetId)

bot.setMyCommands([
    { command: '/rate', description: 'Курсы валют' },
    { command: '/renamecategory', description: 'Изменить категорию' },
    { command: '/deletecategory', description: 'Удалить категорию' },
    { command: '/settings', description: 'Настройки' },
])

const inst = axios.create({
    baseURL: "https://belarusbank.by/api",
    headers: {
        "Content-Type": "application/json"
    }
})

const getBaseRates = async () => {
    return await inst.get(`/kursExchange?city=%D0%9D%D0%B5%D1%81%D0%B2%D0%B8%D0%B6`).then((response) => response.data)
}

let sheet, amount, categoryText, operationStatus

const date = formatDate(new Date())

bot.on('message', async (msg) => {

    const { text } = msg
    const { id: chatId } = msg.chat
    const { first_name: firstName } = msg.from
    const { message_id } = msg
    const { username } = msg.from

    const lastRate = (await getBaseRates())[0]
    const defaultRate = ratesToString(defaultRates(filterRate(lastRate)))

    await doc.useServiceAccountAuth({
        client_email: moneyKeepEmail,
        private_key: moneyKeepKey.replace(/\\n/g, '\n'),
    })

    await doc.loadInfo()

    const found = doc.sheetsByIndex.find(element => element['_rawProperties']['title'] == chatId)
    const header = ['Сумма', 'Категория', 'Дата', 'Остальное', 'Статус']

    if (!found) {
        sheet = await doc.addSheet({ title: `${chatId}`, headerValues:  header})
        await sheet.addRow({ 'Сумма': '=СУММ(A3:A1000)', 'Дата': '=SUMIF(A3:A1000,"<0")', 'Категория': '=SUMIF(A3:A1000,">0")', 'Остальное': `=SUMIF(C3:C1000, "<${date}",A3:A1000)`, 'Статус': false })
        bot.sendMessage(adminId, `Кто-то новый :)\n${firstName} - @${username}`)
    } else {
        sheet = doc.sheetsByIndex[found['_rawProperties']['index']]
    }

    const rows = await sheet.getRows()

    const setUserStatus = (status, statistic = 'Не посчитано.') => {
        rows[0]['_rawData'][0] = '=СУММ(A3:A1000)'
        rows[0]['_rawData'][1] = '=SUMIF(A3:A1000,"<0")'
        rows[0]['_rawData'][2] = '=SUMIF(A3:A1000,">0")'
        rows[0]['_rawData'][3] = statistic
        rows[0]['_rawData'][4] = status
    }

    try {

        const listOfCategory = []

        if (text.toLowerCase() === 'отмена') {
            setUserStatus(false)
            await rows[0].save()
            return bot.sendMessage(chatId, 'Отменено.', defaultOpts)
        }

        // ---------------------АДМИНКА-------------------------

        const adminOpts = {
            parse_mode: 'HTML',
            reply_markup: {
                resize_keyboard: true,
                one_time_keyboard: true,
                keyboard: [[`ответ`]]
            }
        }

        if (rows[0]['_rawData'][4] === 'review') {
            bot.sendMessage(adminId, `Оставлен отзыв от ${firstName}(${chatId}) - @${msg.from.username}\n\n${text}`, adminOpts)
            setUserStatus(false)
            await rows[0].save()

            bot.sendMessage(adminId, `<pre>${chatId} - </pre>`, adminOpts)

            return bot.sendMessage(chatId, `Спасибо за отзыв!`)
        }
        if (text === 'ответ' && chatId == adminId) {
            setUserStatus('answer')
            await rows[0].save()
            return
        }
        if (rows[0]['_rawData'][4] === 'answer') {
            const userId = text.substring(0, text.indexOf(' - '))
            const answer = text.substring(text.indexOf(' - ') + 3)
            setUserStatus(false)
            await rows[0].save()
            return bot.sendMessage(userId, `\u2709 Ответ на твой отзыв:\n\n${answer}`, defaultOpts)
        }

        // -----------------------------------------------------

        rows.forEach(element => {
            if (!listOfCategory.includes(element['_rawData'][1])) {
                listOfCategory.push(element['_rawData'][1])
            }
        })

        listOfCategory.shift()

        const userCategoryList = listOfCategory.filter((n) => { return n != 'Без категории' && n != 'undefined'}).map((category) => [category])
        userCategoryList.push(['Без категории'])

        const userName = firstName

        const botAnswer = {
            userName,
            '/start': start(userName),
            '/rate': `Курс на ${formatToStandartDate(date)}\n\n<pre>${defaultRate}</pre>\n\nЕсли с курсом пусто, прошу винить Heroku, не меня 👉👈`,
            '/settings': settings(userName),
        }

        if (text in botAnswer) {
            let param = eval(text.substring(1) + 'Opts')
            return bot.sendMessage(chatId, botAnswer[text], param)
        } else if (text === '/deletecategory' || text === '/renamecategory') {
            let list = userCategoryList
            list.pop()
            list.push(['Отмена'])
            param = renamecategoryOpts(list)
            
            if (text === '/renamecategory') {

                setUserStatus('rename')
                await rows[0].save()

                return bot.sendMessage(chatId, 'Выбери категорию, которую хочешь изменить.', param)
            }
            setUserStatus('delete')
            await rows[0].save()

            return bot.sendMessage(chatId, 'Выбери категорию, которую хочешь удалить.\n \u2757Все операции, связанные с ней, будут удалены безвозвратно.', param)
        } else if (text[0] === '/') {
            return bot.sendMessage(chatId, 'Что-то не припоминаю такой команды.')
        }

        const balance = rows[0]['_rawData'][0]

        if (text === 'баланс' || text === 'Текущий баланс 🤑') {
            const profit = rows[0]['_rawData'][2]
            const spending = rows[0]['_rawData'][1]
            if (balance == 0) {
                bot.sendSticker(chatId, 'https://cdn.tlgrm.app/stickers/2ad/834/2ad8341a-31fd-36c7-9af3-10820cfcbe51/192/8.webp')
            }
            return bot.sendMessage(chatId, `На вашем счету сейчас <b>${balance} руб</b>\n\nОбщий доход: <b>${profit} руб</b>\nВсего потрачено: <b>${spending} руб</b>`, defaultOpts)
        }

        if (rows[0]['_rawData'][4] === 'delete') {
            setUserStatus(false)
            await rows[0].save()

            const flatUserCategoryList = userCategoryList.flat();

            if (flatUserCategoryList.includes(text)) {
                setUserStatus('delete')
                await rows[0].save()
                return bot.sendMessage(chatId, 'Нет такой категории.')
            }

            let remoteBalance = 0

            rows.forEach(element => {
                if (element['_rawData'][1] === text) {
                    remoteBalance += +element['_rawData'][0]
                    element['_rawData'][0] = 'undefined'
                    element['_rawData'][1] = 'undefined'
                    element['_rawData'][2] = 'undefined'
                    element['_rawData'][3] = -1
                    element['_rawData'][4] = -1
                    
                    element.save()
                }
            })

            return bot.sendMessage(chatId, `Удалено. На твоем счету сейчас ${+balance - +remoteBalance} руб\nКатегория <b>${text}</b> была удалена`, defaultOpts)
        }

        if (rows[0]['_rawData'][4] === 'rename') {
            rows[0]['_rawData'][0] = '=СУММ(A3:A1000)'
            setUserStatus('finish-rename', text)
                await rows[0].save()

            const flatUserCategoryList = userCategoryList.flat();

            if (flatUserCategoryList.includes(text)) {
                setUserStatus('rename')
                await rows[0].save()
                bot.sendSticker(chatId, 'https://tlgrm.ru/_/stickers/2c7/850/2c78501f-e097-3ef2-9e3c-eae75db54b58/192/40.webp')
                return bot.sendMessage(chatId, 'Нет такой категории.')
            }

            return bot.sendMessage(chatId, 'На что изменить?')
        }

        if (rows[0]['_rawData'][4] === 'finish-rename') {
            let renamedCategory = rows[0]['_rawData'][3]
            setUserStatus(false)
            await rows[0].save()

            rows.forEach(element => {
                if (element['_rawData'][1] === renamedCategory) {
                    
                    element['_rawData'][1] = text

                    let dateForTable = element['_rawData'][2]
                    let fI = dateForTable.indexOf('/')
                    let lI = dateForTable.lastIndexOf('/')

                    element['_rawData'][3] = `=DATEDIF(DATE(${dateForTable.substr(lI+1)}, ${dateForTable.substr(0, fI)}, ${dateForTable.substr(fI+1, lI-2)}), TODAY(), "D")`
                    element['_rawData'][4] = `=DATEDIF(DATE(${dateForTable.substr(lI+1)}, ${dateForTable.substr(0, fI)}, ${dateForTable.substr(fI+1, lI-2)}), TODAY(), "M")`
                    element.save()
                }
            })

            return bot.sendMessage(chatId, `\u2705 Готово.\nКатегория <b>${renamedCategory}</b> была заменена на <b>${text}</b>`, defaultOpts)
        }

        if (text === 'статистика' || text === 'Статистика 📊') {

            setUserStatus('statistics', 'хз пока')
            await rows[0].save()
            return bot.sendMessage(chatId, 'Период?', statisticOpts)   
        }

        if (rows[0]['_rawData'][4] === 'statistics') {

            const period = {
                'день': { 'formula': 'TODAY()-1', 'distric': 0 },
                'неделя': { 'formula': 'TODAY()-8', 'distric': 8 },
                'месяц': { 'formula': 'EDATE(TODAY(),-1)', 'distric': 0 },
                'год': { 'formula': 'EOMONTH(TODAY(),-1)', 'distric': 12 },
                'всё время': { 'formula': '0', 'distric': Infinity },
            }

            const statAnswObj = {}
            let statAnswer = ``

            if (!period[text.toLowerCase()]) {
                return bot.sendMessage(chatId, 'Попробуй ввести правильно период или просто пришли мне "Отмена"')
            }

            rows.forEach(element => {
                let cell = (text.toLowerCase() === 'день' || text.toLowerCase() === 'неделя') ? 3 : 4

                if (element['_rawData'][cell] <= period[text.toLowerCase()]?.['distric'] && element['_rawData'][cell] != -1) {
                    statAnswer += `<b>${formatToStandartDate(element['_rawData'][2])}: ${element['_rawData'][0]} руб </b>Категория <b>${element['_rawData'][1]}</b>\n`
                    if (!statAnswObj[element['_rawData'][1]]) {
                        statAnswObj[element['_rawData'][1]] = 0
                    }

                    statAnswObj[element['_rawData'][1]] += +element['_rawData'][0]
                }

            })

            statAnswer += '\nИтого:\n\n'

            for (key in statAnswObj) {
                statAnswer += `<b>${key}</b>: <b>${statAnswObj[key]}</b> руб\n`
            }

            setUserStatus(false, `=SUMIF(C3:C1000,">"&${period[text.toLowerCase()]['formula']},A3:A1000)`)

            await rows[0].save()

            if (isEmpty(statAnswObj)) {
                return bot.sendMessage(chatId, 'Не из чего пока статистику делать...', defaultOpts)
            }

            return bot.sendMessage(chatId, `За это время:\n\n${statAnswer}\nВсего: ${rows[0]['_rawData'][3]} руб`, defaultOpts)
        }

        if (text === 'Добавить доход ➕' || text === 'Добавить расход ➖') {

            setUserStatus('addAmount', `Не посчитано ещё`)
            await rows[0].save()

            operationStatus = '-'

            if (text === 'Добавить доход ➕') {
                operationStatus = '+'
            }
            return bot.sendMessage(chatId, `Введи сумму`)
        }

        if (rows[0]['_rawData'][4] === 'addAmount') {

            // и здесь
            setUserStatus('addCategory', `Не посчитано ещё`)

            await rows[0].save()

            let exp = text.replace(/[,]/, '.')
            if (!+exp) {
                setUserStatus('addAmount', `Не посчитано ещё`)

                await rows[0].save()
                return bot.sendMessage(chatId, 'Будь добр, введи число правильно..')
            }
            amount = (+exp).toFixed(2)
            amount = (Math.abs(amount))
            if (operationStatus === '-') {
                amount = (+amount * -1).toFixed(2)
            }

            if (Math.abs(+amount) > 100000000) {
                setUserStatus('addAmount', `Не посчитано ещё`)

                await rows[0].save()
                bot.sendSticker(chatId, 'https://tlgrm.ru/_/stickers/2ad/834/2ad8341a-31fd-36c7-9af3-10820cfcbe51/192/13.webp')
                return bot.sendMessage(chatId, 'Вот это цены в Беларуси конечно..')
            }

            return bot.sendMessage(chatId, `Выбери нужную категорию или введи свою.`, categoryOpts(userCategoryList))
        }
        if (rows[0]['_rawData'][4] === 'addCategory') {
            let categoryText = text
            amount = '' + amount
            await sheet.addRow({ 'Сумма': amount, 'Дата': date, 'Категория': categoryText, 'Остальное': `=DATEDIF(DATE(${new Date().getFullYear()}, ${new Date().getMonth() + 1}, ${new Date().getDate()}), TODAY(), "D")`, 'Статус': `=DATEDIF(DATE(${new Date().getFullYear()}, ${new Date().getMonth() + 1}, ${new Date().getDate()}), TODAY(), "M")` })
            setUserStatus(false, `Не посчитано ещё`)

                await rows[0].save()
            if ((+balance + +amount) < 0) {
                bot.sendSticker(chatId, 'https://tlgrm.ru/_/stickers/2c7/850/2c78501f-e097-3ef2-9e3c-eae75db54b58/192/20.webp')
                bot.sendMessage(chatId, `Кажись ты ушёл в минус..\n`)
            }
            return bot.sendMessage(chatId, `Cохранено \u2705\n\n<b>${amount} руб</b> Категория <b>${categoryText}</b>\n-----------------------------\nНа вашем счету сейчас ${(+balance + +amount).toFixed(2)} руб`, defaultOpts)
        }

        const regexp = /[^ +-//*\d]/g
        const indexOfLetter = regexp.exec(text)?.index

        const expressionString = text.substring(0, indexOfLetter).replace(/[,]/, '.')

        amount = undefined
        categoryText = 'Без категории'

        if (expressionString) {
            amount = eval(expressionString).toFixed(2)
        }

        if (indexOfLetter) {
            categoryText = text.substring(indexOfLetter)
        }

        if (amount) {

            if (+amount === 0) {
                bot.sendSticker(chatId, 'https://tlgrm.eu/_/stickers/ac7/5e3/ac75e3f5-5369-3e8b-bc19-d61a67d43bd8/1.webp')
                return bot.sendMessage(chatId, 'Бесплатный сыр только в мышеловке!')
            }
            if (Math.abs(amount) > 100000000) {
                bot.sendSticker(chatId, 'https://tlgrm.ru/_/stickers/2ad/834/2ad8341a-31fd-36c7-9af3-10820cfcbe51/192/13.webp')
                return bot.sendMessage(chatId, 'Вот это цены в Беларуси конечно..')
            }

            if (amount) {
                await sheet.addRow({ 'Сумма': amount, 'Дата': date, 'Категория': categoryText, 'Остальное': `=DATEDIF(DATE(${new Date().getFullYear()}, ${new Date().getMonth() + 1}, ${new Date().getDate()}), TODAY(), "D")`, 'Статус': `=DATEDIF(DATE(${new Date().getFullYear()}, ${new Date().getMonth() + 1}, ${new Date().getDate()}), TODAY(), "M")` })

                return bot.sendMessage(chatId, `Cохранено \u2705\n\n<b>${amount} руб</b>. Категория <b>${categoryText}</b>\n-----------------------------\nНа вашем счету сейчас ${(+balance + +amount).toFixed(2)} руб`, defaultOpts)
            }
        }
        return bot.sendMessage(chatId, 'Я тебя не понимаю', defaultOpts)
    } catch (err) {
        console.log(err);
        return bot.sendMessage(chatId, 'Произошла какая-то ошибочка..', defaultOpts)
    }
})

bot.on('callback_query', async msg => {
    const { data } = msg
    const { message: { chat: { id: chatId } } } = msg
    const { message: { message_id } } = msg

    const setUserStatus = (status, statistic = 'Не посчитано.') => {
        rows[0]['_rawData'][0] = '=СУММ(A3:A1000)'
        rows[0]['_rawData'][1] = '=SUMIF(A3:A1000,"<0")'
        rows[0]['_rawData'][2] = '=SUMIF(A3:A1000,">0")'
        rows[0]['_rawData'][3] = statistic
        rows[0]['_rawData'][4] = status
    }

    await doc.useServiceAccountAuth({
        client_email: moneyKeepEmail,
        private_key: moneyKeepKey.replace(/\\n/g, '\n'),
    })

    await doc.loadInfo()

    const found = doc.sheetsByIndex.find(element => element['_rawProperties']['title'] == chatId)

    if (!found) {
        sheet = await doc.addSheet({ title: `${chatId}`, headerValues: ['Сумма', 'Категория', 'Дата', 'Остальное', 'Статус'] })
        await sheet.addRow({ 'Сумма': '=СУММ(A3:A1000)', 'Дата': '=SUMIF(A3:A1000,"<0")', 'Категория': '=SUMIF(A3:A1000,">0")', 'Остальное': `=SUMIF(C3:C1000, "<${date}",A3:A1000)`, 'Статус': false })
        bot.sendMessage(adminId, `Кто-то новый :)\n${firstName} - @${username}`)
    } else {
        sheet = doc.sheetsByIndex[found['_rawProperties']['index']]
    }

    const rows = await sheet.getRows()

    if (data === 'start') {
        setUserStatus(false)
        await rows[0].save()
        bot.editMessageText(`👇 Это главное <b>меню</b>`,
            { chat_id: chatId, message_id: msg.message.message_id, parse_mode: 'HTML' })
        return bot.sendMessage(chatId, shortStart(), defaultOpts)
    }

    if (data === 'toMe') {
        setUserStatus('review')
        await rows[0].save()

        bot.editMessageText(`🖋 Напиши свой вопрос, отзыв или предложение`,
            { chat_id: chatId, message_id: msg.message.message_id })
        return bot.sendMessage(chatId, 'Или просто напиши Отмена и я отменю диалог.')
    }
})