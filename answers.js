const start = (userName) => {
    return (`👋 Привет, ${userName}!

Моя задача - вести учет твоих финансов.

Я буду особенно полезен в любых ситуациях, где ты тратишь или зарабатываешь деньги. Ведь порой так трудно всё удержать в голове 😵‍💫

Так давай сделаем так, чтобы деньги всегда были "на крючке"?)`)
}

const settings = (userName) => {
    return `⚙️ ${userName}\n\nЕсть вопросы и предложения?\nКликай <b>Обратная связь</b>`
}

// formatDate(new Date())

const shortStart = () => {
    return(`С его помощью ты легко можешь:

\u2795 Добавить доход
\u2796 Добавить расход
\u2696 Посмотреть текущий баланс
📊 Просматривать статистику твоих действий

📘 Подробную инструкцию найдешь в настройках
Для этого достаточно вызвать команду /settings

Действуй!`)
}

module.exports = {
    start,
    shortStart,
    settings,
}