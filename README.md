# vue-sample

## Project setup

```shell
npm install
```

### Compiles and hot-reloads for development

```shell
npm run serve
```

### Compiles and minifies for production

```shell
npm run build
```

### Lints and fixes files

```shell
npm run lint
```

### Customize configuration

See [Configuration Reference](https://cli.vuejs.org/config/).

## Firebase setup

cf.)

- [Vue.js＋Firebaseで認証付きチャット | 基礎から学ぶ Vue.js](https://cr-vue.mio3io.com/tutorials/firebase.html)
- [Vue.js によるアプリを Firebase で Hosting する最短の道 - Qiita](https://qiita.com/Satachito/items/4a00b402970d657a88f3)

### `src/firebaseConfig.js`

```js:src/firebaseConfig.js
export const firebaseConfig = {
  apiKey: "API_KEY",
  authDomain: "AUTH_DOMAIN",
  databaseURL: "DATABASE_URL",
  projectId: "PROJECT_ID",
  storageBucket: "STORAGE_BUCKET",
  messagingSenderId: "MESSAGING_SENDER_ID",
  appId: "APP_ID",
  measurementId: "MEASUREMENT_ID"
};
```

### Realtime Database

Rules:

```json5
{
  "rules": {
    // As default, deny all access
    ".read": false,
    ".write": false,
    "data": {
      "$roomId": {
        ".read": "auth != null",  // Allow access of authorized users
        ".write": "auth != null"  // Allow access of authorized users
      }
    }
  }
}
```
