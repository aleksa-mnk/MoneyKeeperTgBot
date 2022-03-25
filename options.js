const isEmpty = (obj) => {
    for (let key in obj) {
        return false
    }
    return true
}

const defaultOpts = {
    parse_mode: 'HTML',
    reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [[`Добавить доход \u2795`, "Добавить расход \u2796"], ["Текущий баланс \u{1F911}", "Статистика \u{1F4CA}"]]
    }
}
const rateOpts = {
    parse_mode: 'HTML',
    reply_markup: {
        // inline_keyboard: [[{ text: "Посмотреть остальное \u{1F9D0}", callback_data: "all_currency" }]],
        keyboard: [[`Добавить доход \u2795`, "Добавить расход \u2796"], ["Текущий баланс \u{1F911}", "Статистика \u{1F4CA}"]]
    }
}

const settingsOpts = {
    parse_mode: 'HTML',
    reply_markup: {
        inline_keyboard: [[{ text: "Подробнее 👀", url: "https://telegra.ph/MoneyKeeper---Instrukciya-01-08" }],
        [{ text: "Обратная связь ✍️", callback_data: "toMe" }]
        ]
    }
}

const startOpts = {
    parse_mode: 'HTML',
    reply_markup: {
        inline_keyboard: [
            [{ text: "Хочу узнать, как пользоваться", url: "https://telegra.ph/MoneyKeeper---Instrukciya-01-08" }],
            [{ text: "🚀 Давай!", callback_data: "start" }]
        ]
    }
}

const categoryOpts = (userCategoryList) => {
    return ({
        parse_mode: 'HTML',
        reply_markup: {
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: userCategoryList
        }
    })
}

const deletecategoryOpts = (userCategoryList) => {
    return ({
        parse_mode: 'HTML',
        reply_markup: {
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: userCategoryList
        }
    })
}

const renamecategoryOpts = (userCategoryList) => {
    return ({
        parse_mode: 'HTML',
        reply_markup: {
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: userCategoryList
        }
    })
}

const statisticOpts = {
    parse_mode: 'HTML',
    reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [["День", "Неделя"], ["Месяц", "Год"], ["Всё время"], ["Отмена"]]
    }
}

module.exports = {
    defaultOpts,
    rateOpts,
    settingsOpts,
    startOpts,
    categoryOpts,
    statisticOpts,
    deletecategoryOpts,
    renamecategoryOpts,
    isEmpty,
}