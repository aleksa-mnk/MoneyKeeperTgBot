const baseCurrencyArr = ['USD', 'EUR', 'RUB']

const filterRate = (obj) => {
    const ratesObj = {}
    let currencyTransaction = ''
    
    for(key in obj){
        let currency = key.substr(0, 3)
        
        if(obj[key] != 0 && key.length < 8 && (key.includes('_in') || key.includes('_out'))){
            if(!ratesObj?.[currency]){
                ratesObj[currency] = {}
            }

            currencyTransaction = (key.includes('_in')) ? 'Покупка' : 'Продажа'
            ratesObj[currency][currencyTransaction] = obj[key]
        }
    }
    
    return ratesObj
}

const defaultRates = (obj) => {
    const baseRateObj = {}
    baseCurrencyArr.forEach(element => {
        baseRateObj[element] = obj[element]
    })
    
    return baseRateObj
}

const ratesToString = (obj) => {
    let text = ''
    for(key in obj){
        text += key + '\n'
        for(k in obj[key]){
            text += k + ': ' + obj[key][k] + '\n'
        }
    }
    return text
}

const formatDate = (date) => {
    const dateObj = {
        dd: date.getDate(),
        mm: date.getMonth()+1,
        yy: date.getFullYear(),
    }
    // for (let key in dateObj) {
    //     if (dateObj[key] < 10) dateObj[key] = '0' + dateObj[key]
    // }

    3/21/2022

    return dateObj.mm + '/' + dateObj.dd + '/' + dateObj.yy
}

const formatToStandartDate = (textDate) => {
    let firstSlash = textDate.indexOf('/')
    let secondSlash = textDate.lastIndexOf('/')
    const dateObj = {
        dd: textDate.substr(firstSlash + 1, secondSlash - 2),
        mm: textDate.substr(0, firstSlash),
        yy: textDate.substr(secondSlash + 1),
    }

    for (let key in dateObj) {
        if (dateObj[key] < 10) dateObj[key] = '0' + dateObj[key]
    }

    return dateObj.dd + '.' + dateObj.mm + '.' + dateObj.yy
}

module.exports = {
    filterRate,
    defaultRates,
    ratesToString,
    formatDate,
    formatToStandartDate,
}