"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recalculateActivityDuration = exports.manualDailyUpdate = exports.manualUpdateDailyActivity = exports.manualCalculateScore = exports.calculateInternalTraderScore = exports.internalTransfer = exports.checkOpenTrades = exports.stopPriceFeed = exports.startPriceFeed = exports.copyTrade = exports.getAllTraders = exports.getUserTrades = exports.closeTrade = exports.createTrade = exports.createBot = exports.decrementFollowerCount = exports.incrementFollowerCount = exports.updateTraderStats = exports.createTrader = exports.helloWorld = void 0;
//backend/functions/src/index.ts
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// این تابع خالی هست - ما از Client SDK در frontend استفاده می‌کنیم
exports.helloWorld = functions.https.onRequest((request, response) => {
    response.json({ message: 'Hello from Firebase!' });
});
// 🔽 توابع جدید برای مدیریت معامله‌گران 🔽
// تابع برای ایجاد معامله‌گر جدید
exports.createTrader = functions.https.onCall(async (data, context) => {
    var _a;
    // بررسی احراز هویت
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'لطفاً وارد شوید');
    }
    // بررسی نقش کاربر (فقط ادمین یا خود کاربر می‌تواند معامله‌گر ایجاد کند)
    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userRole = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (userRole !== 'admin' && context.auth.uid !== data.userId) {
        throw new functions.https.HttpsError('permission-denied', 'شما دسترسی لازم را ندارید');
    }
    try {
        const { userId, displayName, email, strategyType, description, monthlyROI = 0, riskScore = 5, isActive = true } = data;
        // ایجاد سند معامله‌گر
        const traderRef = admin.firestore().collection('traders').doc(userId);
        const traderData = {
            displayName,
            email,
            strategyType,
            description,
            monthlyROI,
            riskScore,
            isActive,
            performanceStats: {
                totalTrades: 0,
                winRate: 0,
                totalProfit: 0,
                maxDrawdown: 0,
                avgTradeDuration: 0
            },
            followersCount: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await traderRef.set(traderData);
        return {
            success: true,
            traderId: userId,
            message: 'معامله‌گر با موفقیت ایجاد شد'
        };
    }
    catch (error) {
        console.error('Error creating trader:', error);
        throw new functions.https.HttpsError('internal', 'خطا در ایجاد معامله‌گر');
    }
});
// تابع برای به‌روزرسانی آمار عملکرد معامله‌گر
exports.updateTraderStats = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'لطفاً وارد شوید');
    }
    try {
        const { traderId, performanceStats } = data;
        const traderRef = admin.firestore().collection('traders').doc(traderId);
        await traderRef.update({
            performanceStats,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return {
            success: true,
            message: 'آمار معامله‌گر با موفقیت به‌روزرسانی شد'
        };
    }
    catch (error) {
        console.error('Error updating trader stats:', error);
        throw new functions.https.HttpsError('internal', 'خطا در به‌روزرسانی آمار');
    }
});
// تابع برای افزایش تعداد دنبال‌کنندگان
exports.incrementFollowerCount = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'لطفاً وارد شوید');
    }
    try {
        const { traderId } = data;
        const traderRef = admin.firestore().collection('traders').doc(traderId);
        await traderRef.update({
            followersCount: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return {
            success: true,
            message: 'تعداد دنبال‌کنندگان افزایش یافت'
        };
    }
    catch (error) {
        console.error('Error incrementing follower count:', error);
        throw new functions.https.HttpsError('internal', 'خطا در افزایش دنبال‌کنندگان');
    }
});
// تابع برای کاهش تعداد دنبال‌کنندگان
exports.decrementFollowerCount = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'لطفاً وارد شوید');
    }
    try {
        const { traderId } = data;
        const traderRef = admin.firestore().collection('traders').doc(traderId);
        await traderRef.update({
            followersCount: admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return {
            success: true,
            message: 'تعداد دنبال‌کنندگان کاهش یافت'
        };
    }
    catch (error) {
        console.error('Error decrementing follower count:', error);
        throw new functions.https.HttpsError('internal', 'خطا در کاهش دنبال‌کنندگان');
    }
});
// تابع برای ایجاد ربات جدید
exports.createBot = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'لطفاً وارد شوید');
    }
    try {
        const { name, strategy, linkedTraderId, status = 'ACTIVE' } = data;
        // بررسی وجود معامله‌گر
        const traderDoc = await admin.firestore().collection('traders').doc(linkedTraderId).get();
        if (!traderDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'معامله‌گر یافت نشد');
        }
        // ایجاد سند ربات
        const botRef = admin.firestore().collection('bots').doc();
        const botData = {
            name,
            strategy,
            performance: {
                totalReturn: 0,
                sharpeRatio: 0,
                volatility: 0
            },
            linkedTraderId,
            status,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await botRef.set(botData);
        return {
            success: true,
            botId: botRef.id,
            message: 'ربات با موفقیت ایجاد شد'
        };
    }
    catch (error) {
        console.error('Error creating bot:', error);
        throw new functions.https.HttpsError('internal', 'خطا در ایجاد ربات');
    }
});
// 🔽 توابع جدید برای مدیریت معاملات - این بخش اضافه شد 🔽
// تابع برای ایجاد معامله جدید - نسخه اصلاح شده
exports.createTrade = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'لطفاً وارد شوید');
    }
    try {
        const { symbol, side, // استفاده از side به جای direction
        entryPrice, quantity, stopLoss, takeProfit } = data;
        // ایجاد سند معامله با ساختار جدید
        const tradeRef = admin.firestore().collection('trades').doc();
        const tradeData = {
            id: tradeRef.id,
            traderId: context.auth.uid,
            symbol,
            direction: side,
            entryPrice: parseFloat(entryPrice),
            quantity: parseFloat(quantity),
            exitPrice: 0,
            stopLoss: stopLoss ? parseFloat(stopLoss) : null,
            takeProfit: takeProfit ? parseFloat(takeProfit) : null,
            status: 'open',
            profitLoss: 0,
            pnlPercentage: 0,
            copiedByCount: 0,
            openedAt: admin.firestore.FieldValue.serverTimestamp(),
            closedAt: null
        };
        await tradeRef.set(tradeData);
        return {
            success: true,
            tradeId: tradeRef.id,
            message: 'معامله با موفقیت ایجاد شد'
        };
    }
    catch (error) {
        console.error('Error creating trade:', error);
        throw new functions.https.HttpsError('internal', 'خطا در ایجاد معامله');
    }
});
// تابع برای بستن معامله - نسخه اصلاح شده با به‌روزرسانی موجودی
// تابع برای بستن معامله - نسخه اصلاح شده با به‌روزرسانی موجودی
exports.closeTrade = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'لطفاً وارد شوید');
    }
    try {
        const { tradeId, closePrice, reason } = data;
        // دریافت معامله
        const tradeDoc = await admin.firestore().collection('trades').doc(tradeId).get();
        if (!tradeDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'معامله یافت نشد');
        }
        const trade = tradeDoc.data();
        if (!trade) {
            throw new functions.https.HttpsError('not-found', 'داده‌های معامله یافت نشد');
        }
        if (trade.traderId !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'شما دسترسی به این معامله را ندارید');
        }
        // محاسبه PnL
        const profitLoss = trade.direction === 'BUY'
            ? (parseFloat(closePrice) - trade.entryPrice) * trade.quantity
            : (trade.entryPrice - parseFloat(closePrice)) * trade.quantity;
        const pnlPercentage = trade.direction === 'BUY'
            ? ((parseFloat(closePrice) - trade.entryPrice) / trade.entryPrice) * 100
            : ((trade.entryPrice - parseFloat(closePrice)) / trade.entryPrice) * 100;
        // محاسبه PnL خالص (با کسر کارمزدها)
        const entryFee = trade.entryFee || 0;
        const exitFee = (trade.positionSize * trade.takerFeeRate) || 0;
        const totalFees = entryFee + exitFee;
        const netPnL = profitLoss - totalFees;
        // به‌روزرسانی معامله
        await tradeDoc.ref.update({
            status: 'closed',
            exitPrice: parseFloat(closePrice),
            closedAt: admin.firestore.FieldValue.serverTimestamp(),
            reason,
            profitLoss,
            pnlPercentage,
            netPnl: netPnL,
            exitFee: exitFee,
            feesPaid: totalFees
        });
        // ✅ جدید: به‌روزرسانی موجودی حساب معاملاتی
        const walletRef = admin.firestore().collection('wallets').doc(trade.traderId);
        const walletDoc = await walletRef.get();
        if (walletDoc.exists) {
            const wallet = walletDoc.data();
            const currentTradingBalance = (wallet === null || wallet === void 0 ? void 0 : wallet.tradingBalance) || 0;
            const newTradingBalance = currentTradingBalance + netPnL;
            await walletRef.update({
                tradingBalance: newTradingBalance,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // ایجاد رکورد در تاریخچه تراکنش‌ها
            const transactionData = {
                userId: trade.traderId,
                type: 'internal_transfer',
                amount: Math.abs(netPnL),
                status: 'completed',
                referenceId: `pnl_${tradeId}_${Date.now()}`,
                description: netPnL >= 0
                    ? `سود معامله: ${netPnL.toFixed(2)} USDT`
                    : `ضرر معامله: ${Math.abs(netPnL).toFixed(2)} USDT`,
                internalType: netPnL >= 0 ? 'profit' : 'loss',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            await admin.firestore().collection('transactions').add(transactionData);
            console.log('💰 Trading balance updated in backend:', {
                userId: trade.traderId,
                previousBalance: currentTradingBalance,
                pnl: netPnL,
                newBalance: newTradingBalance
            });
        }
        return {
            success: true,
            message: 'معامله با موفقیت بسته شد',
            pnl: profitLoss,
            netPnl: netPnL,
            pnlPercentage
        };
    }
    catch (error) {
        console.error('Error closing trade:', error);
        throw new functions.https.HttpsError('internal', 'خطا در بستن معامله');
    }
});
// تابع برای دریافت معاملات کاربر - نسخه اصلاح شده
exports.getUserTrades = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'لطفاً وارد شوید');
    }
    try {
        const { status, limit = 100 } = data;
        let query = admin.firestore()
            .collection('trades')
            .where('traderId', '==', context.auth.uid)
            .orderBy('openedAt', 'desc')
            .limit(limit);
        // فیلتر بر اساس وضعیت
        if (status && status !== 'ALL') {
            const firestoreStatus = status === 'OPEN' ? 'open' : 'closed';
            query = query.where('status', '==', firestoreStatus);
        }
        const snapshot = await query.get();
        // تبدیل ساختار Firestore به ساختار Frontend
        const trades = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                traderId: data.traderId,
                symbol: data.symbol,
                side: data.direction,
                entryPrice: data.entryPrice,
                quantity: data.quantity,
                stopLoss: data.stopLoss,
                takeProfit: data.takeProfit,
                status: data.status.toUpperCase(),
                closePrice: data.exitPrice,
                pnl: data.profitLoss,
                pnlPercentage: data.pnlPercentage || 0,
                openedAt: data.openedAt.toDate(),
                closedAt: data.closedAt ? data.closedAt.toDate() : undefined,
                reason: data.reason,
                copiedByCount: data.copiedByCount || 0
            };
        });
        return {
            success: true,
            trades
        };
    }
    catch (error) {
        console.error('Error getting user trades:', error);
        throw new functions.https.HttpsError('internal', 'خطا در دریافت معاملات');
    }
});
// تابع برای دریافت تمام معامله‌گران
exports.getAllTraders = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'لطفاً وارد شوید');
    }
    try {
        const { limit = 50, isActive = true } = data;
        let query = admin.firestore()
            .collection('traders')
            .where('isActive', '==', isActive)
            .orderBy('followersCount', 'desc')
            .limit(limit);
        const snapshot = await query.get();
        const traders = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return {
            success: true,
            traders
        };
    }
    catch (error) {
        console.error('Error getting all traders:', error);
        throw new functions.https.HttpsError('internal', 'خطا در دریافت معامله‌گران');
    }
});
// تابع برای کپی کردن معامله
exports.copyTrade = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'لطفاً وارد شوید');
    }
    try {
        const { tradeId, amount } = data;
        // دریافت معامله اصلی
        const tradeDoc = await admin.firestore().collection('trades').doc(tradeId).get();
        if (!tradeDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'معامله یافت نشد');
        }
        const originalTrade = tradeDoc.data();
        // بررسی وجود originalTrade
        if (!originalTrade) {
            throw new functions.https.HttpsError('not-found', 'داده‌های معامله یافت نشد');
        }
        // ایجاد کپی معامله برای کاربر
        const copyTradeRef = admin.firestore().collection('copyTrades').doc();
        const copyTradeData = {
            id: copyTradeRef.id,
            originalTradeId: tradeId,
            copierId: context.auth.uid,
            traderId: originalTrade.traderId,
            symbol: originalTrade.symbol,
            side: originalTrade.side,
            entryPrice: originalTrade.entryPrice,
            quantity: parseFloat(amount) / originalTrade.entryPrice,
            stopLoss: originalTrade.stopLoss,
            takeProfit: originalTrade.takeProfit,
            leverage: originalTrade.leverage,
            status: 'OPEN',
            pnl: 0,
            pnlPercentage: 0,
            copiedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await copyTradeRef.set(copyTradeData);
        // افزایش تعداد کپی‌کنندگان معامله اصلی
        await tradeDoc.ref.update({
            copiedByCount: admin.firestore.FieldValue.increment(1)
        });
        return {
            success: true,
            copyTradeId: copyTradeRef.id,
            message: 'معامله با موفقیت کپی شد'
        };
    }
    catch (error) {
        console.error('Error copying trade:', error);
        throw new functions.https.HttpsError('internal', 'خطا در کپی کردن معامله');
    }
});
// تابع برای شروع سرویس Price Feed
exports.startPriceFeed = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'لطفاً وارد شوید');
    }
    // فقط ادمین می‌تواند سرویس را شروع کند
    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userRole = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (userRole !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'فقط ادمین می‌تواند سرویس را شروع کند');
    }
    try {
        const { symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'] } = data;
        // ذخیره تنظیمات Price Feed
        const configRef = admin.firestore().collection('systemConfig').doc('priceFeed');
        await configRef.set({
            isActive: true,
            symbols,
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
            startedBy: context.auth.uid
        }, { merge: true });
        return {
            success: true,
            message: 'سرویس Price Feed شروع شد',
            symbols
        };
    }
    catch (error) {
        console.error('Error starting price feed:', error);
        throw new functions.https.HttpsError('internal', 'خطا در شروع سرویس Price Feed');
    }
});
// تابع برای توقف سرویس Price Feed
exports.stopPriceFeed = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'لطفاً وارد شوید');
    }
    // فقط ادمین می‌تواند سرویس را متوقف کند
    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userRole = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (userRole !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'فقط ادمین می‌تواند سرویس را متوقف کند');
    }
    try {
        const configRef = admin.firestore().collection('systemConfig').doc('priceFeed');
        await configRef.update({
            isActive: false,
            stoppedAt: admin.firestore.FieldValue.serverTimestamp(),
            stoppedBy: context.auth.uid
        });
        return {
            success: true,
            message: 'سرویس Price Feed متوقف شد'
        };
    }
    catch (error) {
        console.error('Error stopping price feed:', error);
        throw new functions.https.HttpsError('internal', 'خطا در توقف سرویس Price Feed');
    }
});
// تابع برای بررسی خودکار معاملات باز (Trade Watcher)
exports.checkOpenTrades = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'لطفاً وارد شوید');
    }
    try {
        const { symbol } = data;
        // دریافت آخرین قیمت از Firestore
        const priceDoc = await admin.firestore().collection('prices').doc(symbol).get();
        if (!priceDoc.exists) {
            throw new functions.https.HttpsError('not-found', `قیمتی برای نماد ${symbol} یافت نشد`);
        }
        const currentPrice = (_a = priceDoc.data()) === null || _a === void 0 ? void 0 : _a.price;
        if (!currentPrice) {
            throw new functions.https.HttpsError('not-found', `قیمت معتبر برای نماد ${symbol} یافت نشد`);
        }
        // دریافت معاملات باز برای این نماد
        const openTradesSnapshot = await admin.firestore()
            .collection('trades')
            .where('symbol', '==', symbol)
            .where('status', '==', 'open')
            .get();
        const closedTrades = [];
        // بررسی هر معامله برای شرایط TP/SL
        for (const tradeDoc of openTradesSnapshot.docs) {
            const trade = tradeDoc.data();
            const shouldClose = (trade.side === 'BUY' && trade.stopLoss && currentPrice <= trade.stopLoss) || // SL برای BUY
                (trade.side === 'BUY' && trade.takeProfit && currentPrice >= trade.takeProfit) || // TP برای BUY
                (trade.side === 'SELL' && trade.stopLoss && currentPrice >= trade.stopLoss) || // SL برای SELL
                (trade.side === 'SELL' && trade.takeProfit && currentPrice <= trade.takeProfit); // TP برای SELL
            if (shouldClose) {
                // بستن معامله
                const reason = trade.stopLoss && ((trade.side === 'BUY' && currentPrice <= trade.stopLoss) ||
                    (trade.side === 'SELL' && currentPrice >= trade.stopLoss)) ? 'STOP_LOSS' : 'TAKE_PROFIT';
                await tradeDoc.ref.update({
                    status: 'closed',
                    exitPrice: currentPrice,
                    closedAt: admin.firestore.FieldValue.serverTimestamp(),
                    reason,
                    profitLoss: trade.side === 'BUY'
                        ? (currentPrice - trade.entryPrice) * trade.quantity
                        : (trade.entryPrice - currentPrice) * trade.quantity,
                    pnlPercentage: trade.side === 'BUY'
                        ? ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100
                        : ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100
                });
                closedTrades.push(tradeDoc.id);
                console.log(`🔔 معامله ${tradeDoc.id} بسته شد - دلیل: ${reason}`);
            }
        }
        return {
            success: true,
            message: `بررسی معاملات برای ${symbol} انجام شد`,
            currentPrice,
            symbol,
            totalOpenTrades: openTradesSnapshot.size,
            closedTradesCount: closedTrades.length,
            closedTrades
        };
    }
    catch (error) {
        console.error('Error checking open trades:', error);
        throw new functions.https.HttpsError('internal', 'خطا در بررسی معاملات باز');
    }
});
// 🔽 توابع جدید برای مدیریت انتقال‌های داخلی 🔽
// تابع برای انتقال داخلی بین کیف پول و حساب معاملاتی
exports.internalTransfer = functions.https.onCall(async (request) => {
    const { data, auth } = request;
    if (!auth) {
        throw new functions.https.HttpsError('unauthenticated', 'لطفاً وارد شوید');
    }
    try {
        const { amount, direction } = data;
        if (!amount || amount <= 0) {
            throw new functions.https.HttpsError('invalid-argument', 'مبلغ باید بزرگتر از صفر باشد');
        }
        if (!direction || (direction !== 'to_trading' && direction !== 'to_wallet')) {
            throw new functions.https.HttpsError('invalid-argument', 'جهت انتقال نامعتبر است');
        }
        const userId = auth.uid;
        const walletRef = admin.firestore().collection('wallets').doc(userId);
        await admin.firestore().runTransaction(async (transaction) => {
            const walletDoc = await transaction.get(walletRef);
            if (!walletDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'کیف پول یافت نشد');
            }
            const wallet = walletDoc.data();
            if (!wallet) {
                throw new functions.https.HttpsError('not-found', 'داده‌های کیف پول یافت نشد');
            }
            // مقدار پیش‌فرض برای کیف پول‌های قدیمی
            const currentTradingBalance = wallet.tradingBalance || 0;
            const currentBalance = wallet.balance || 0;
            let newBalance;
            let newTradingBalance;
            if (direction === 'to_trading') {
                // انتقال از کیف پول به حساب معاملاتی
                if (currentBalance < amount) {
                    throw new functions.https.HttpsError('failed-precondition', 'موجودی کیف پول کافی نیست');
                }
                newBalance = currentBalance - amount;
                newTradingBalance = currentTradingBalance + amount;
            }
            else {
                // انتقال از حساب معاملاتی به کیف پول
                if (currentTradingBalance < amount) {
                    throw new functions.https.HttpsError('failed-precondition', 'موجودی حساب معاملاتی کافی نیست');
                }
                newBalance = currentBalance + amount;
                newTradingBalance = currentTradingBalance - amount;
            }
            // به‌روزرسانی موجودی‌ها
            transaction.update(walletRef, {
                balance: newBalance,
                tradingBalance: newTradingBalance,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // ایجاد رکورد در تاریخچه تراکنش‌ها
            const transactionData = {
                userId,
                type: 'internal_transfer',
                amount,
                status: 'completed',
                referenceId: `internal_${Date.now()}`,
                description: direction === 'to_trading'
                    ? `انتقال به حساب معاملاتی: ${amount} USDT`
                    : `انتقال به کیف پول اصلی: ${amount} USDT`,
                internalType: direction === 'to_trading' ? 'transfer_to_trading' : 'transfer_to_wallet',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            const transactionRef = admin.firestore().collection('transactions').doc();
            transaction.set(transactionRef, transactionData);
        });
        return {
            success: true,
            message: direction === 'to_trading'
                ? `مبلغ ${amount} USDT با موفقیت به حساب معاملاتی انتقال یافت`
                : `مبلغ ${amount} USDT با موفقیت به کیف پول اصلی انتقال یافت`
        };
    }
    catch (error) {
        console.error('Error in internal transfer:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'خطا در انتقال داخلی');
    }
});
// تابع کمکی برای محاسبه امتیاز با فرمول v2.2 (اصلاح شده)
function calculateTraderScoreV2(data) {
    console.log('🧮 فرمول v2.2 - داده‌های ورودی:', data);
    try {
        // --- R1: بازدهی کل (Total Return) - با سقف منطقی 500%
        const cappedReturn = Math.min(Math.max(data.totalReturn, -100), 500); // حداقل -100% (ضرر کامل)
        const R1 = Math.max(0, (cappedReturn + 100) / 6); // نرمال‌سازی: (-100 تا 500) -> (0 تا 100)
        // --- R2: بازدهی ماهانه (Monthly Return) - با سقف منطقی 50%
        const cappedMonthlyReturn = Math.min(Math.max(data.monthlyReturn, -50), 50); // حداقل -50% حداکثر +50%
        const R2 = Math.max(0, (cappedMonthlyReturn + 50) / 1); // نرمال‌سازی: (-50 تا 50) -> (0 تا 100)
        // --- R3: ریسک‌پذیری (Risk Discipline) - جریمه متعادل‌تر
        const cappedDrawdown = Math.min(Math.max(data.maxDrawdown, 0), 80); // حداکثر افت 80%
        const R3 = Math.max(0, 100 - cappedDrawdown * 1.25); // جریمه ملایم‌تر
        // --- R4: نرخ برد (Win Rate)
        const R4 = Math.min(100, Math.max(0, data.winRate));
        // --- R5: اعتبار و فعالیت (Reputation & Activity) - وزن منطقی‌تر
        const activityScore = Math.min(50, data.closedTrades * 0.5); // حداکثر 50 امتیاز از فعالیت
        const reputationScore = Math.min(50, data.followersCount * 0.5); // حداکثر 50 امتیاز از اعتبار
        const R5 = activityScore + reputationScore;
        // --- محاسبه امتیاز نهایی با وزن‌های متعادل
        const weightedScore = (R1 * 0.30) + // بازدهی کل 30% (افزایش یافت)
            (R2 * 0.25) + // بازدهی ماهانه 25% (افزایش یافت)
            (R3 * 0.20) + // ریسک‌پذیری 20% 
            (R4 * 0.15) + // نرخ برد 15% (کاهش یافت)
            (R5 * 0.10); // اعتبار و فعالیت 10% (کاهش یافت)
        const finalScore = Math.round(Math.max(0, Math.min(100, weightedScore)));
        // --- تعیین وضعیت کلی (شرایط سختگیرانه‌تر)
        let overallStatus;
        if (finalScore >= 85 && data.maxDrawdown <= 15 && data.winRate >= 70 && data.monthlyReturn >= 5) {
            overallStatus = "عالی";
        }
        else if (finalScore >= 70 && data.maxDrawdown <= 25 && data.winRate >= 60) {
            overallStatus = "خوب";
        }
        else if (finalScore >= 50 && data.maxDrawdown <= 40) {
            overallStatus = "متوسط";
        }
        else if (finalScore >= 30) {
            overallStatus = "ریسکی";
        }
        else {
            overallStatus = "ضعیف";
        }
        console.log('🎯 نتایج فرمول v2.2:', {
            score: finalScore,
            breakdown: { R1, R2, R3, R4, R5 },
            overallStatus,
            weightedScore,
            inputs: data
        });
        return { score: finalScore, overallStatus };
    }
    catch (error) {
        console.error('❌ خطا در محاسبه امتیاز v2.2:', error);
        return { score: 50, overallStatus: 'متوسط' };
    }
}
// Cloud Function برای محاسبه خودکار امتیاز معامله‌گران داخلی (نسخه v2.3 - محاسبه واقعی)
exports.calculateInternalTraderScore = functions.firestore
    .onDocumentUpdated('internalTraders/{traderId}', async (event) => {
    try {
        if (!event.data) {
            console.log('❌ داده‌ای برای پردازش وجود ندارد');
            return;
        }
        const beforeData = event.data.before.data();
        const afterData = event.data.after.data();
        const traderId = event.params.traderId;
        console.log(`🔄 بررسی بروزرسانی امتیاز برای معامله‌گر داخلی: ${traderId}`);
        // فیلدهای مورد نظر برای بررسی تغییر
        const relevantFields = [
            'totalNetPnL', 'totalInvestment', 'closedTrades', 'winningTrades', 'losingTrades',
            'platformNetPnL', 'platformData', 'historicalData', 'durationMonths'
        ];
        // بررسی آیا فیلدهای مرتبط تغییر کرده‌اند
        const hasRelevantChanges = relevantFields.some(field => {
            const beforeValue = beforeData === null || beforeData === void 0 ? void 0 : beforeData[field];
            const afterValue = afterData === null || afterData === void 0 ? void 0 : afterData[field];
            return beforeValue !== afterValue;
        });
        if (!hasRelevantChanges) {
            console.log('✅ هیچ تغییر مرتبطی برای محاسبه امتیاز وجود ندارد');
            return;
        }
        // 🔥 محاسبه REAL ماهانه و drawdown از داده‌های واقعی
        const calculatedData = await calculateRealTraderMetrics(afterData, traderId);
        // آماده‌سازی داده‌ها برای محاسبه با فرمول v2.2
        const scoreData = {
            totalReturn: calculatedData.totalReturn,
            monthlyReturn: calculatedData.monthlyReturn,
            winRate: calculatedData.winRate,
            maxDrawdown: calculatedData.maxDrawdown,
            followersCount: (afterData === null || afterData === void 0 ? void 0 : afterData.followersCount) || (afterData === null || afterData === void 0 ? void 0 : afterData.followers) || 0,
            closedTrades: calculatedData.closedTrades
        };
        // محاسبه امتیاز و وضعیت با فرمول v2.2
        const { score, overallStatus } = calculateTraderScoreV2(scoreData);
        // به‌روزرسانی سند با مقادیر جدید REAL
        await event.data.after.ref.update({
            score,
            overallStatus,
            monthlyReturn: calculatedData.monthlyReturn,
            maxDrawdown: calculatedData.maxDrawdown,
            totalReturn: calculatedData.totalReturn,
            winRate: calculatedData.winRate,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ امتیاز معامله‌گر داخلی بروزرسانی شد (REAL DATA):`, {
            traderId,
            score,
            overallStatus,
            calculatedMetrics: calculatedData
        });
    }
    catch (error) {
        console.error('❌ خطا در محاسبه امتیاز معامله‌گر داخلی:', error);
    }
});
// 🔥 تابع جدید برای محاسبه REAL ماهانه و drawdown
async function calculateRealTraderMetrics(traderData, traderId) {
    console.log('🧮 محاسبه REAL متریک‌ها برای معامله‌گر:', traderId);
    try {
        // محاسبه totalReturn REAL
        const totalInvestment = traderData.totalInvestment || 0;
        const totalNetPnL = traderData.totalNetPnL || 0;
        const totalReturn = totalInvestment > 0 ? (totalNetPnL / totalInvestment) * 100 : 0;
        // محاسبه winRate REAL
        const closedTrades = traderData.closedTrades || 0;
        const winningTrades = traderData.totalWinningTrades || 0;
        const winRate = closedTrades > 0 ? (winningTrades / closedTrades) * 100 : 0;
        // محاسبه monthlyReturn REAL
        const durationMonths = traderData.durationMonths || 1; // جلوگیری از تقسیم بر صفر
        const monthlyReturn = durationMonths > 0 ? totalReturn / durationMonths : totalReturn;
        // محاسبه maxDrawdown REAL (ساده‌شده - در آینده از تاریخچه استفاده کنیم)
        const currentEquity = totalInvestment + totalNetPnL;
        const peakEquity = Math.max(totalInvestment, currentEquity);
        const maxDrawdown = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;
        console.log('📊 نتایج محاسبات REAL:', {
            totalInvestment,
            totalNetPnL,
            totalReturn: `${totalReturn.toFixed(2)}%`,
            monthlyReturn: `${monthlyReturn.toFixed(2)}%`,
            winRate: `${winRate.toFixed(2)}%`,
            maxDrawdown: `${maxDrawdown.toFixed(2)}%`,
            durationMonths,
            closedTrades,
            winningTrades
        });
        return {
            totalReturn: parseFloat(totalReturn.toFixed(2)),
            monthlyReturn: parseFloat(monthlyReturn.toFixed(2)),
            winRate: parseFloat(winRate.toFixed(2)),
            maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
            closedTrades
        };
    }
    catch (error) {
        console.error('❌ خطا در محاسبه REAL متریک‌ها:', error);
        // بازگشت به مقادیر پیش‌فرض در صورت خطا
        return {
            totalReturn: traderData.totalReturn || 0,
            monthlyReturn: traderData.monthlyReturn || 0,
            winRate: traderData.winRate || 0,
            maxDrawdown: traderData.maxDrawdown || traderData.drawdown || 0,
            closedTrades: traderData.closedTrades || 0
        };
    }
}
// تابع کمکی برای محاسبه دستی امتیاز با فرمول v2.0
exports.manualCalculateScore = functions.https.onCall(async (request) => {
    const { data, auth } = request;
    if (!auth) {
        throw new functions.https.HttpsError('unauthenticated', 'لطفاً وارد شوید');
    }
    try {
        const { traderId, isBot = false } = data;
        if (!traderId) {
            throw new functions.https.HttpsError('invalid-argument', 'شناسه معامله‌گر الزامی است');
        }
        const collectionName = isBot ? 'bots' : 'internalTraders';
        const traderDoc = await admin.firestore().collection(collectionName).doc(traderId).get();
        if (!traderDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'معامله‌گر یا ربات یافت نشد');
        }
        const traderData = traderDoc.data();
        if (!traderData) {
            throw new functions.https.HttpsError('not-found', 'داده‌های معامله‌گر یافت نشد');
        }
        // آماده‌سازی داده‌ها برای محاسبه با فرمول v2.0
        const scoreData = {
            totalReturn: traderData.totalReturn || 0,
            monthlyReturn: traderData.monthlyReturn || 0,
            winRate: traderData.winRate || 0,
            maxDrawdown: traderData.maxDrawdown || traderData.drawdown || 0,
            followersCount: traderData.followersCount || traderData.followers || 0,
            closedTrades: traderData.closedTrades || 0
        };
        // محاسبه امتیاز و وضعیت با فرمول v2.0
        const { score, overallStatus } = calculateTraderScoreV2(scoreData);
        // به‌روزرسانی سند
        await traderDoc.ref.update({
            score,
            overallStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return {
            success: true,
            message: 'امتیاز با موفقیت محاسبه شد (فرمول v2.0)',
            score,
            overallStatus,
            calculatedData: scoreData
        };
    }
    catch (error) {
        console.error('Error in manual calculate score:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'خطا در محاسبه دستی امتیاز');
    }
});
// 🔹 HTTP Function برای بروزرسانی روزانه (می‌توانید manually اجرا کنید)
exports.manualUpdateDailyActivity = functions.https.onRequest(async (request, response) => {
    try {
        console.log('🔄 شروع بروزرسانی روزانه daysActive...');
        // بروزرسانی معامله‌گران داخلی
        const internalTraders = await admin.firestore().collection('internalTraders').get();
        for (const doc of internalTraders.docs) {
            await doc.ref.update({
                daysActive: admin.firestore.FieldValue.increment(1),
                lastActivityUpdate: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        // بروزرسانی ربات‌ها
        const bots = await admin.firestore().collection('bots').get();
        for (const doc of bots.docs) {
            await doc.ref.update({
                daysActive: admin.firestore.FieldValue.increment(1),
                lastActivityUpdate: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        console.log('✅ بروزرسانی روزانه تکمیل شد');
        response.json({
            success: true,
            message: 'بروزرسانی روزانه انجام شد',
            updated: {
                internalTraders: internalTraders.size,
                bots: bots.size
            }
        });
    }
    catch (error) {
        console.error('❌ خطا در بروزرسانی روزانه:', error);
        response.status(500).json({
            success: false,
            error: 'خطا در بروزرسانی روزانه'
        });
    }
});
// 🔽 سیستم بروزرسانی خودکار مدت فعالیت 🔽
// تابع اصلی برای بروزرسانی روزانه - نسخه ساده‌تر برای دپلوی
//export const scheduledDailyUpdate = functions.pubsub.schedule('0 0 * * *')
//.timeZone('Asia/Tehran')
//.onRun(async (context) => {
// return updateAllTradersDaily();
//  });
// تابع HTTP برای تست بروزرسانی روزانه
exports.manualDailyUpdate = functions.https.onRequest(async (req, res) => {
    try {
        await updateAllTradersDaily();
        res.json({
            success: true,
            message: 'بروزرسانی روزانه انجام شد'
        });
    }
    catch (error) {
        console.error('Error in manual daily update:', error);
        res.status(500).json({
            success: false,
            error: 'خطا در بروزرسانی روزانه'
        });
    }
});
// تابع اصلی بروزرسانی
async function updateAllTradersDaily() {
    try {
        console.log('🔄 شروع بروزرسانی خودکار روزانه...');
        // بروزرسانی معامله‌گران داخلی
        const internalTraders = await admin.firestore().collection('internalTraders').get();
        const internalUpdates = internalTraders.docs.map(doc => doc.ref.update({
            daysActive: admin.firestore.FieldValue.increment(1),
            lastActivityUpdate: admin.firestore.FieldValue.serverTimestamp()
        }));
        // بروزرسانی ربات‌ها
        const bots = await admin.firestore().collection('bots').get();
        const botUpdates = bots.docs.map(doc => doc.ref.update({
            daysActive: admin.firestore.FieldValue.increment(1),
            lastActivityUpdate: admin.firestore.FieldValue.serverTimestamp()
        }));
        await Promise.all([...internalUpdates, ...botUpdates]);
        console.log(`✅ بروزرسانی روزانه تکمیل شد. ${internalTraders.size + bots.size} مورد بروزرسانی شد.`);
        // بررسی بروزرسانی ماهانه
        await checkMonthlyUpdate();
    }
    catch (error) {
        console.error('❌ خطا در بروزرسانی روزانه:', error);
    }
}
// تابع بروزرسانی ماهانه
async function checkMonthlyUpdate() {
    const today = new Date();
    if (today.getDate() !== 1)
        return; // فقط اول ماه
    console.log('📅 اولین روز ماه - بروزرسانی ماهانه...');
    const internalTraders = await admin.firestore().collection('internalTraders').get();
    const bots = await admin.firestore().collection('bots').get();
    const monthlyUpdates = [
        ...internalTraders.docs.map(doc => doc.ref.update({
            actualMonthsActive: admin.firestore.FieldValue.increment(1),
            durationMonths: admin.firestore.FieldValue.increment(1),
            lastMonthlyUpdate: admin.firestore.FieldValue.serverTimestamp()
        })),
        ...bots.docs.map(doc => doc.ref.update({
            actualMonthsActive: admin.firestore.FieldValue.increment(1),
            durationMonths: admin.firestore.FieldValue.increment(1),
            lastMonthlyUpdate: admin.firestore.FieldValue.serverTimestamp()
        }))
    ];
    await Promise.all(monthlyUpdates);
    console.log(`✅ بروزرسانی ماهانه تکمیل شد. ${monthlyUpdates.length} مورد بروزرسانی شد.`);
}
// تابع برای محاسبه مجدد مدت فعالیت بر اساس تاریخ شروع
exports.recalculateActivityDuration = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'لطفاً وارد شوید');
    }
    try {
        const { traderId, isBot = false } = data;
        const collectionName = isBot ? 'bots' : 'internalTraders';
        const docRef = admin.firestore().collection(collectionName).doc(traderId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'معامله‌گر یا ربات یافت نشد');
        }
        const traderData = docSnap.data();
        if (!traderData) {
            throw new functions.https.HttpsError('not-found', 'داده‌های معامله‌گر یافت نشد');
        }
        const startDate = traderData.startDate || traderData.joinDate;
        if (!startDate) {
            throw new functions.https.HttpsError('invalid-argument', 'تاریخ شروع فعالیت یافت نشد');
        }
        // تبدیل تاریخ شروع
        const startDateObj = startDate.toDate ? startDate.toDate() : new Date(startDate);
        const now = new Date();
        // محاسبه روزهای فعال
        const diffTime = now.getTime() - startDateObj.getTime();
        const daysActive = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        // محاسبه ماه‌های فعال
        const years = now.getFullYear() - startDateObj.getFullYear();
        const months = now.getMonth() - startDateObj.getMonth();
        const actualMonthsActive = Math.max(1, years * 12 + months);
        // بروزرسانی
        await docRef.update({
            daysActive,
            actualMonthsActive,
            durationMonths: actualMonthsActive,
            lastRecalculation: admin.firestore.FieldValue.serverTimestamp()
        });
        return {
            success: true,
            message: 'مدت فعالیت مجدداً محاسبه شد',
            daysActive,
            actualMonthsActive,
            startDate: startDateObj.toISOString()
        };
    }
    catch (error) {
        console.error('Error recalculating activity duration:', error);
        throw new functions.https.HttpsError('internal', 'خطا در محاسبه مجدد مدت فعالیت');
    }
});
//# sourceMappingURL=index.js.map