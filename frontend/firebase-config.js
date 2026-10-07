// Zimi TV Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAppNCKOa8etecb8OaLPkkbgGgO-1ntNWY",
    authDomain: "zimitv-62421.firebaseapp.com",
    databaseURL: "https://zimitv-62421-default-rtdb.firebaseio.com",
    projectId: "zimitv-62421",
    storageBucket: "zimitv-62421.firebasestorage.app",
    messagingSenderId: "1014899153633",
    appId: "1:1014899153633:web:c6120981057e17cc86f5a0"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    console.log('[Firebase] Initialized Zimi TV realtime database successfully');
}
