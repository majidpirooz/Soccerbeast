// stringsData.js -- mock-mode UI strings, kept in sync with
// soccer-beast-backend/scripts/seed-strings.js's key list (same keys, same
// translations) so mock mode and a real backend behave identically for
// translation purposes. Exported as a flat list; api/strings.js reshapes it
// into the {key: {en,fa}} dictionary shape, and mock/adminData.js's
// uiStrings reshapes it into the array-of-rows shape the String Editor
// admin panel expects -- one source, two shapes, not two diverging lists.

export const STRING_ENTRIES = [
  ['nav.home', 'Home', 'خانه'],
  ['nav.leagues', 'Leagues', 'لیگ‌ها'],
  ['nav.live', 'Live', 'زنده'],
  ['nav.prediction', 'Prediction', 'پیش‌بینی'],
  ['nav.profile', 'Profile', 'پروفایل'],
  ['nav.signIn', 'Sign In', 'ورود'],
  ['nav.join', 'Join', 'عضویت'],
  ['nav.signOut', 'Sign Out', 'خروج از حساب'],

  ['common.save', 'Save', 'ذخیره'],
  ['common.cancel', 'Cancel', 'لغو'],
  ['common.loading', 'Loading…', 'در حال بارگذاری…'],
  ['common.seeAll', 'See all', 'مشاهده همه'],
  ['common.search', 'Search…', 'جستجو…'],
  ['common.open', 'Open', 'باز'],
  ['common.locked', 'Locked', 'قفل‌شده'],
  ['common.live', 'Live', 'زنده'],
  ['common.finished', 'FT', 'پایان'],
  ['common.back', 'Back', 'بازگشت'],
  ['common.vs', 'VS', 'مقابل'],

  ['home.nextMatch', 'Next Match', 'بازی بعدی'],
  ['home.latestMatches', 'Latest Matches', 'آخرین بازی‌ها'],
  ['home.openForPrediction', 'Open for prediction', 'باز برای پیش‌بینی'],
  ['home.watchLive', 'Watch Live', 'پخش زنده'],
  ['home.matchPage', 'Match Page', 'صفحه بازی'],
  ['home.noMatchesYet', "No matches yet — check back once the season's fixtures are added.", 'هنوز بازی‌ای ثبت نشده است — پس از افزودن برنامه فصل دوباره سر بزنید.'],
  ['home.noUpcomingMatch', 'No upcoming match yet.', 'بازی پیش‌رویی وجود ندارد.'],

  ['live.title', 'Live Scores', 'نتایج زنده'],
  ['live.subtitle', 'Every match, every league — updated automatically.', 'همه بازی‌ها، همه لیگ‌ها — به‌روزرسانی خودکار.'],
  ['live.lastUpdate', 'Last update', 'آخرین به‌روزرسانی'],
  ['live.liveScoresToggle', 'Live Scores', 'نتایج زنده'],
  ['live.matchEvents', 'Match Events', 'رویدادهای بازی'],

  ['leagues.title', 'Standings', 'جدول رده‌بندی'],
  ['leagues.fixtures', 'Fixtures', 'برنامه بازی‌ها'],
  ['leagues.club', 'Club', 'تیم'],
  ['leagues.previousMatches', 'Previous Matches', 'بازی‌های اخیر'],

  ['match.events', 'Events', 'رویدادها'],
  ['match.lineups', 'Lineups', 'ترکیب تیم‌ها'],
  ['match.stats', 'Stats', 'آمار'],
  ['match.fullTime', 'Full Time', 'پایان بازی'],

  ['prediction.title', 'Prediction League', 'لیگ پیش‌بینی'],
  ['prediction.subtitle', 'Pick the score, climb the table, earn the trophies.', 'نتیجه را حدس بزن، صعود کن، جام بگیر.'],
  ['prediction.predict', 'Predict', 'پیش‌بینی'],
  ['prediction.locksIn', 'Locks in', 'قفل تا'],
  ['prediction.savePrediction', 'Save Prediction', 'ذخیره پیش‌بینی'],
  ['prediction.saveBothPredictions', 'Save Both Predictions', 'ذخیره هر دو پیش‌بینی'],
  ['prediction.combinedMode', 'Combined Mode — best of 2 picks counts', 'حالت ترکیبی — بهترین حدس از ۲ انتخاب محاسبه می‌شود'],
  ['prediction.enteredByAdmin', 'This pick was entered by admin on your behalf', 'این پیش‌بینی توسط مدیر به‌جای شما ثبت شده است'],
  ['prediction.goldenTrophy', 'Golden Trophy — weekly top scorer', 'جام طلایی — برترین امتیاز هفته'],
  ['prediction.diamondTrophy', 'Diamond Trophy — ≥50% exact this week', 'جام الماس — حداقل ۵۰٪ حدس دقیق در این هفته'],
  ['prediction.rank', '#', 'رتبه'],
  ['prediction.user', 'User', 'کاربر'],
  ['prediction.trophies', 'Trophies', 'جام‌ها'],
  ['prediction.exact', 'Exact', 'دقیق'],
  ['prediction.pts', 'Pts', 'امتیاز'],

  ['profile.title', 'Profile', 'پروفایل'],
  ['profile.account', 'Account', 'حساب کاربری'],
  ['profile.progress', 'Progress', 'پیشرفت'],
  ['profile.compare', 'Compare', 'مقایسه'],
  ['profile.preferences', 'Preferences', 'تنظیمات'],
  ['profile.myLeagues', 'My Leagues', 'لیگ‌های من'],
  ['profile.thisWeek', 'This Week', 'این هفته'],
  ['profile.overall', 'Overall', 'مجموع'],
  ['profile.createLeague', 'Create My League', 'ساخت لیگ من'],
  ['profile.previousLeagues', 'Previous Leagues', 'لیگ‌های پیشین'],
  ['profile.predictionMode', 'Prediction Mode', 'حالت پیش‌بینی'],
  ['profile.language', 'Language', 'زبان'],
  ['profile.normal', 'Normal', 'عادی'],
  ['profile.combined', 'Combined', 'ترکیبی'],
  ['profile.username', 'Username', 'نام کاربری'],
  ['profile.newPassword', 'New password', 'رمز عبور جدید'],
  ['profile.saveChanges', 'Save Changes', 'ذخیره تغییرات'],

  ['auth.signInTitle', 'Sign In', 'ورود'],
  ['auth.joinTitle', 'Join Soccer Beast', 'عضویت در Soccer Beast'],
  ['auth.recoveryTitle', 'Password Recovery', 'بازیابی رمز عبور'],
  ['auth.username', 'Username', 'نام کاربری'],
  ['auth.password', 'Password', 'رمز عبور'],
  ['auth.forgotPassword', 'Forgot my password', 'رمز عبورم را فراموش کرده‌ام'],
  ['auth.newHere', 'New here?', 'تازه‌واردید؟'],
  ['auth.alreadyHaveAccount', 'Already have an account?', 'قبلاً حساب کاربری دارید؟'],
  ['auth.invitationCode', 'Invitation Code', 'کد دعوت'],
  ['auth.telegramId', 'Telegram ID', 'آیدی تلگرام'],
  ['auth.email', 'Email', 'ایمیل'],
  ['auth.recoverButton', 'Recover My Password', 'بازیابی رمز عبور من'],
  ['auth.backToSignIn', 'Back to Sign In', 'بازگشت به ورود'],

  ['footer.messageAdmin', 'Message To Administrator', 'پیام به مدیر'],
  ['profile.exactHistory', 'Exact Prediction History', 'تاریخچه پیش‌بینی‌های دقیق'],
  ['profile.viewLeaderboard', 'View Leaderboard', 'مشاهده جدول امتیازات'],
  ['profile.noArchivedLeagues', 'No archived leagues yet.', 'هنوز لیگ آرشیوشده‌ای وجود ندارد.'],
  ['profile.modeChangeNote', 'Mode changes apply starting from your next unlocked match — nothing already locked or finished is rescored.', 'تغییر حالت از اولین بازی قفل‌نشده بعدی اعمال می‌شود — بازی‌های قفل‌شده یا پایان‌یافته دوباره امتیازدهی نمی‌شوند.'],
  ['profile.runYourOwnLeague', 'Run your own league', 'لیگ خودت را اداره کن'],
  ['profile.createLeagueDescription', "Pick a name, choose whether to reuse Main League's matches or curate your own, and invite friends with a code.", 'یک نام انتخاب کن، تصمیم بگیر از بازی‌های لیگ اصلی استفاده کنی یا بازی‌های خودت را بچینی، و دوستانت را با یک کد دعوت کن.'],
  ['profile.previousLeaguesDescription', 'Archived leaderboards from leagues that have since finished.', 'جدول امتیازات آرشیوشده از لیگ‌هایی که به پایان رسیده‌اند.'],
  ['profile.predictionAndLanguage', 'Prediction & Language', 'پیش‌بینی و زبان'],
  ['auth.recoverySubtitle', "A new password will be generated and sent to the site administrator, who'll relay it to you.", 'رمز عبور جدیدی ساخته شده و برای مدیر سایت ارسال می‌شود تا آن را به شما برساند.'],
  ['auth.recoverySent', "Request sent — the admin will be in touch with your new password shortly.", 'درخواست ارسال شد — مدیر به‌زودی رمز عبور جدید شما را در اختیارتان می‌گذارد.'],
  ['auth.recoveryInvalidUsername', "We couldn't find an account with that username.", 'حسابی با این نام کاربری پیدا نشد.'],
  ['auth.invitationCodeHint', 'Optional — joins that league instead of Main League.', 'اختیاری — به‌جای لیگ اصلی، به آن لیگ می‌پیوندید.'],
  ['auth.optional', 'Optional.', 'اختیاری.'],
];

/** As the {key: {en,fa}} dictionary api/strings.js's mock branch needs. */
export function stringEntriesAsDictionary() {
  const dict = {};
  for (const [key, en, fa] of STRING_ENTRIES) dict[key] = { en, fa };
  return dict;
}
